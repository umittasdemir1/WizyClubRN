/**
 * setup-academia-worker.mjs
 *
 * Sets up the faster-whisper and translation Python workers for S+Academia.
 * Works on standard Linux/macOS, Windows, and nix-based cloud dev environments.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const venvDir = path.join(backendRoot, ".venv");
const requirementsPath = path.join(backendRoot, "python", "requirements.txt");
const dotEnvPath = path.join(backendRoot, ".env");
const NIX_STORE = "/nix/store";
const isWin = process.platform === "win32";
const isLinux = process.platform === "linux";
const SUPPORTED_PYTHON_MINORS = new Set([11, 12, 13]);

loadDotEnv();

function stripWrappingQuotes(value) {
    if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }

    return value;
}

function loadDotEnv() {
    if (!existsSync(dotEnvPath)) {
        return;
    }

    const content = readFileSync(dotEnvPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }

        const separatorIndex = line.indexOf("=");
        if (separatorIndex <= 0) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        if (!key || process.env[key] !== undefined) {
            continue;
        }

        process.env[key] = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());
    }
}

function commandSpec(command, args = []) {
    return { command, args };
}

function formatCommand(spec) {
    return [spec.command, ...spec.args].join(" ");
}

function canRun(spec, extraEnv = {}) {
    if (!spec?.command) return false;
    if (path.isAbsolute(spec.command) && !existsSync(spec.command)) return false;

    const probeArgs = [...spec.args, spec.command === "py" ? "-V" : "--version"];
    const result = spawnSync(spec.command, probeArgs, {
        stdio: "ignore",
        shell: false,
        env: { ...process.env, ...extraEnv },
    });
    return !result.error && result.status === 0;
}

function run(spec, args, extraEnv = {}) {
    const result = spawnSync(spec.command, [...spec.args, ...args], {
        cwd: backendRoot,
        stdio: "inherit",
        shell: false,
        env: { ...process.env, ...extraEnv },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${formatCommand(spec)} ${args.join(" ")} exited with code ${result.status}.`);
    }
}

function readPythonVersion(spec) {
    const result = spawnSync(
        spec.command,
        [...spec.args, "-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"],
        {
            cwd: backendRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            shell: false,
            env: process.env,
        }
    );

    if (result.error || result.status !== 0) {
        return null;
    }

    return result.stdout.trim() || null;
}

function isSupportedPythonVersion(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) {
        return false;
    }

    const major = Number(match[1]);
    const minor = Number(match[2]);
    return major === 3 && SUPPORTED_PYTHON_MINORS.has(minor);
}

function nixStoreEntries() {
    if (!existsSync(NIX_STORE)) return [];
    const ls = spawnSync("ls", [NIX_STORE], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
    });
    return ls.error || ls.status !== 0 ? [] : ls.stdout.split("\n").filter(Boolean);
}

function resolveBootstrapPython() {
    const homeDir = process.env.HOME?.trim() ?? "";
    const localAppData = process.env.LOCALAPPDATA?.trim() ?? "";
    const preferredWindowsVersions = ["3.11", "3.12", "3.13"];
    const candidates = [];

    if (process.env.STOCKPILOT_PYTHON_BOOTSTRAP_BIN?.trim()) {
        candidates.push(commandSpec(process.env.STOCKPILOT_PYTHON_BOOTSTRAP_BIN.trim()));
    }

    if (isWin) {
        for (const version of preferredWindowsVersions) {
            candidates.push(commandSpec("py", [`-${version}`]));
        }

        const windowsInstallRoots = [
            localAppData ? path.join(localAppData, "Programs", "Python") : null,
            "C:\\",
        ].filter(Boolean);

        for (const version of preferredWindowsVersions) {
            const compactVersion = version.replace(".", "");
            for (const root of windowsInstallRoots) {
                const candidatePath = root === "C:\\"
                    ? path.join(root, `Python${compactVersion}`, "python.exe")
                    : path.join(root, `Python${compactVersion}`, "python.exe");
                candidates.push(commandSpec(candidatePath));
            }
        }
    }

    candidates.push(
        ...[
            "python3.11",
            "python3.12",
            "python3.13",
            "python3",
            "python",
        ].map((command) => commandSpec(command)),
        ...(homeDir ? [commandSpec(path.join(homeDir, ".nix-profile", "bin", "python3"))] : []),
        ...(!isWin
            ? nixStoreEntries()
                .filter((entry) => /^[a-z0-9]+-python3-3\.(1[1-9]|[2-9]\d)\.\d+$/.test(entry))
                .sort((a, b) => b.localeCompare(a))
                .flatMap((entry) => [
                    commandSpec(path.join(NIX_STORE, entry, "bin", "python3.11")),
                    commandSpec(path.join(NIX_STORE, entry, "bin", "python3")),
                ])
            : [])
    );

    for (const candidate of candidates) {
        if (!canRun(candidate)) {
            continue;
        }

        const version = readPythonVersion(candidate);
        if (!version || !isSupportedPythonVersion(version)) {
            continue;
        }

        console.log(`Bootstrap Python: ${formatCommand(candidate)} (${version})`);
        return candidate;
    }

    throw new Error(
        [
            "Supported Python runtime not found. Use Python 3.11, 3.12, or 3.13. Try one of:",
            "  - nix-env -iA nixpkgs.python311   (Firebase Studio / nix)",
            "  - brew install python@3.11        (macOS)",
            "  - Install Python 3.11 locally     (Windows)",
            "  - Set STOCKPILOT_PYTHON_BOOTSTRAP_BIN=/path/to/python3 in backend/.env",
        ].join("\n")
    );
}

function pinVenvSymlinks() {
    const cfgPath = path.join(venvDir, "pyvenv.cfg");
    if (!existsSync(cfgPath)) return;

    const cfg = readFileSync(cfgPath, "utf8");
    const match = cfg.match(/^executable\s*=\s*(.+)$/m);
    const target = match?.[1]?.trim();
    if (!target || !existsSync(target)) return;

    const readlink = (filePath) => {
        const result = spawnSync("readlink", [filePath], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });
        return result.stdout?.trim() ?? "";
    };

    const binDir = path.join(venvDir, "bin");
    for (const name of ["python3", "python3.11"]) {
        const linkPath = path.join(binDir, name);
        if (!existsSync(linkPath)) continue;

        try {
            const current = readlink(linkPath);
            if (current.includes(".nix-profile") || !path.isAbsolute(current)) {
                unlinkSync(linkPath);
                symlinkSync(target, linkPath);
                console.log(`  pinned .venv/bin/${name} -> ${target}`);
            }
        } catch {
            // Non-fatal on systems without a symlink-based venv.
        }
    }
}

function resolveVenvPython() {
    const candidates = isWin
        ? [path.join(venvDir, "Scripts", "python.exe")]
        : [path.join(venvDir, "bin", "python3"), path.join(venvDir, "bin", "python")];

    const resolved = candidates.find((candidate) => existsSync(candidate) && canRun(commandSpec(candidate)));
    if (!resolved) {
        throw new Error(`Venv Python not found under ${venvDir}.`);
    }

    return resolved;
}

function testImport(venvPython, ldPath) {
    const env = { ...process.env };
    if (ldPath) env.LD_LIBRARY_PATH = ldPath;

    const result = spawnSync(venvPython, ["-c", "import faster_whisper"], {
        cwd: backendRoot,
        env,
        stdio: "ignore",
        shell: false,
    });
    return result.status === 0 && !result.error;
}

function detectNixLibPath(venvPython) {
    if (testImport(venvPython, undefined)) {
        return null;
    }

    if (!existsSync(NIX_STORE)) {
        return null;
    }

    console.log("  faster_whisper import failed; searching nix store for required libs...");

    const entries = nixStoreEntries();
    const zlibDirs = entries
        .filter((entry) => /^[a-z0-9]+-zlib-/.test(entry))
        .map((entry) => path.join(NIX_STORE, entry, "lib"))
        .filter(existsSync);
    const gccLibDirs = entries
        .filter((entry) => /^[a-z0-9]+-gcc-\d.*-lib$/.test(entry))
        .map((entry) => path.join(NIX_STORE, entry, "lib"))
        .filter(existsSync);

    for (const gccLibDir of gccLibDirs) {
        if (testImport(venvPython, gccLibDir)) {
            return gccLibDir;
        }
    }

    for (const gccLibDir of gccLibDirs) {
        for (const zlibDir of zlibDirs) {
            const combined = `${gccLibDir}:${zlibDir}`;
            if (testImport(venvPython, combined)) {
                return combined;
            }
        }
    }

    return null;
}

function persistLibraryPath(libPath) {
    const key = "STOCKPILOT_PYTHON_LIBRARY_PATH";
    let content = "";
    if (existsSync(dotEnvPath)) {
        content = readFileSync(dotEnvPath, "utf8");
    }

    const line = `${key}=${libPath}`;
    if (content.includes(`${key}=`)) {
        content = content.replace(new RegExp(`^${key}=.*$`, "m"), line);
    } else {
        content = content.trimEnd() + (content ? "\n" : "") + line + "\n";
    }

    writeFileSync(dotEnvPath, content, "utf8");
    console.log(`  wrote ${key}=${libPath} -> backend/.env`);
}

const bootstrapPython = resolveBootstrapPython();
run(bootstrapPython, ["-m", "venv", "--clear", venvDir]);

if (!isWin) {
    pinVenvSymlinks();
}

const venvPython = resolveVenvPython();
run(commandSpec(venvPython), [
    "-m",
    "pip",
    "install",
    "--upgrade",
    "pip",
    "--retries",
    "6",
    "--timeout",
    "120",
    "--quiet",
]);
run(commandSpec(venvPython), [
    "-m",
    "pip",
    "install",
    "-r",
    requirementsPath,
    "--retries",
    "6",
    "--timeout",
    "120",
    "--quiet",
]);

if (isLinux) {
    const libPath = detectNixLibPath(venvPython);
    if (libPath) {
        persistLibraryPath(libPath);
    } else if (testImport(venvPython, undefined)) {
        console.log("  faster_whisper imports OK; no extra library path needed.");
    } else {
        console.warn(
            "  WARNING: faster_whisper import still fails. " +
            "Set STOCKPILOT_PYTHON_LIBRARY_PATH manually in backend/.env."
        );
    }
}

console.log(`\nS+Academia worker environment ready -> ${venvPython}`);
