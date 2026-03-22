/**
 * setup-academia-worker.mjs
 *
 * Sets up the faster-whisper Python worker for S+Academia.
 * Works on: standard Linux/macOS (python3 in PATH), Windows, and nix-based
 * cloud dev environments (Firebase Studio) where Python lives in the nix store.
 *
 * What it does:
 *  1. Finds a working Python 3 interpreter
 *  2. Creates / recreates .venv and installs requirements
 *  3. Pins the .venv symlinks to the absolute nix-store path so they survive
 *     future `nix-profile` updates (nix store paths are content-addressed and
 *     never change)
 *  4. Verifies that `faster_whisper` imports correctly; if it fails because of
 *     missing shared libs (libz, libstdc++ on nix), auto-detects the right
 *     LD_LIBRARY_PATH from the nix store and writes STOCKPILOT_PYTHON_LIBRARY_PATH
 *     into backend/.env so the backend picks it up automatically
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, symlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const venvDir = path.join(backendRoot, ".venv");
const requirementsPath = path.join(backendRoot, "python", "requirements.txt");
const dotEnvPath = path.join(backendRoot, ".env");
const NIX_STORE = "/nix/store";
const isWin = process.platform === "win32";
const isLinux = process.platform === "linux";

// ── Helpers ─────────────────────────────────────────────────────────────────

function canRun(command, extraEnv = {}) {
    if (!command) return false;
    if (path.isAbsolute(command) && !existsSync(command)) return false;
    const args = command === "py" ? ["-V"] : ["--version"];
    const result = spawnSync(command, args, {
        stdio: "ignore",
        shell: false,
        env: { ...process.env, ...extraEnv },
    });
    return !result.error && result.status === 0;
}

function run(command, args, extraEnv = {}) {
    const result = spawnSync(command, args, {
        cwd: backendRoot,
        stdio: "inherit",
        shell: false,
        env: { ...process.env, ...extraEnv },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} exited with code ${result.status}.`);
    }
}

function nixStoreEntries() {
    if (!existsSync(NIX_STORE)) return [];
    const ls = spawnSync("ls", [NIX_STORE], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return ls.error || ls.status !== 0 ? [] : ls.stdout.split("\n").filter(Boolean);
}

// ── 1. Find bootstrap Python ─────────────────────────────────────────────────

function resolveBootstrapPython() {
    const homeDir = process.env.HOME?.trim() ?? "";

    const candidates = [
        process.env.STOCKPILOT_PYTHON_BOOTSTRAP_BIN?.trim(),
        isWin ? "py" : null,
        "python3",
        "python3.11",
        "python",
        // nix-profile: present when user has run `nix-env -iA nixpkgs.python311`
        homeDir ? path.join(homeDir, ".nix-profile", "bin", "python3") : null,
        // nix store fallback — enumerate store for python3-3.1x dirs
        ...(!isWin ? nixStoreEntries()
            .filter((e) => /^[a-z0-9]+-python3-3\.(1[1-9]|[2-9]\d)\.\d+$/.test(e))
            .sort((a, b) => b.localeCompare(a))               // newest first
            .flatMap((e) => [
                path.join(NIX_STORE, e, "bin", "python3.11"),
                path.join(NIX_STORE, e, "bin", "python3"),
            ]) : []),
    ].filter(Boolean);

    for (const c of candidates) {
        if (canRun(c)) {
            console.log(`Bootstrap Python: ${c}`);
            return c;
        }
    }

    throw new Error(
        [
            "Python 3 not found. Try one of:",
            "  • nix-env -iA nixpkgs.python311   (Firebase Studio / nix)",
            "  • brew install python@3.11          (macOS)",
            "  • winget install Python.Python.3.11 (Windows)",
            "  • Set STOCKPILOT_PYTHON_BOOTSTRAP_BIN=/path/to/python3 in backend/.env",
        ].join("\n")
    );
}

// ── 2. Pin .venv symlinks to absolute nix-store path ────────────────────────

/**
 * pyvenv.cfg records the `executable` path — the exact nix-store binary that
 * created the venv. Unlike ~/.nix-profile symlinks, nix-store paths are
 * content-addressed and permanent. Rewriting .venv/bin/python3 to this path
 * makes the venv resilient to `nix-profile` updates.
 */
function pinVenvSymlinks() {
    const cfgPath = path.join(venvDir, "pyvenv.cfg");
    if (!existsSync(cfgPath)) return;

    const cfg = readFileSync(cfgPath, "utf8");
    const match = cfg.match(/^executable\s*=\s*(.+)$/m);
    const target = match?.[1]?.trim();
    if (!target || !existsSync(target)) return;

    const readlink = (p) => {
        const r = spawnSync("readlink", [p], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        return r.stdout?.trim() ?? "";
    };

    const binDir = path.join(venvDir, "bin");
    for (const name of ["python3", "python3.11"]) {
        const linkPath = path.join(binDir, name);
        if (!existsSync(linkPath)) continue;
        try {
            const current = readlink(linkPath);
            // Only rewrite if it goes through nix-profile (fragile) or is relative
            if (current.includes(".nix-profile") || !path.isAbsolute(current)) {
                unlinkSync(linkPath);
                symlinkSync(target, linkPath);
                console.log(`  pinned .venv/bin/${name} → ${target}`);
            }
        } catch {
            // Non-fatal
        }
    }
}

// ── 3. Resolve venv Python ───────────────────────────────────────────────────

function resolveVenvPython() {
    const candidates = isWin
        ? [path.join(venvDir, "Scripts", "python.exe")]
        : [path.join(venvDir, "bin", "python3"), path.join(venvDir, "bin", "python")];

    const resolved = candidates.find((c) => existsSync(c) && canRun(c));
    if (!resolved) throw new Error(`Venv Python not found under ${venvDir}.`);
    return resolved;
}

// ── 4. Auto-detect LD_LIBRARY_PATH for nix av/faster-whisper ────────────────

/**
 * The PyAV wheel (used by faster-whisper) bundles ffmpeg but not libstdc++ or
 * libz. On nix systems, these live in the nix store, not /lib. We try nix-store
 * combinations until `import faster_whisper` succeeds, then persist the winner.
 */
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
    // Already works? (standard Linux / macOS / Windows)
    if (testImport(venvPython, undefined)) return null;

    if (!existsSync(NIX_STORE)) return null;

    console.log("  faster_whisper import failed — searching nix store for required libs…");

    const entries = nixStoreEntries();

    // Collect candidate lib dirs for each missing lib type
    const zlibDirs = entries
        .filter((e) => /^[a-z0-9]+-zlib-/.test(e))
        .map((e) => path.join(NIX_STORE, e, "lib"))
        .filter(existsSync);

    const gccLibDirs = entries
        .filter((e) => /^[a-z0-9]+-gcc-\d.*-lib$/.test(e))
        .map((e) => path.join(NIX_STORE, e, "lib"))
        .filter(existsSync);

    // Try gcc-lib alone (includes libstdc++ and libgcc_s)
    for (const g of gccLibDirs) {
        if (testImport(venvPython, g)) return g;
    }

    // Try gcc-lib + zlib combination
    for (const g of gccLibDirs) {
        for (const z of zlibDirs) {
            const combined = `${g}:${z}`;
            if (testImport(venvPython, combined)) return combined;
        }
    }

    return null;
}

/**
 * Write STOCKPILOT_PYTHON_LIBRARY_PATH into backend/.env.
 * Creates the file if missing. Updates the line if it already exists.
 */
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
    console.log(`  wrote ${key}=${libPath} → backend/.env`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const bootstrapPython = resolveBootstrapPython();

run(bootstrapPython, ["-m", "venv", venvDir]);

if (!isWin) pinVenvSymlinks();

const venvPython = resolveVenvPython();
run(venvPython, ["-m", "pip", "install", "--upgrade", "pip", "--quiet"]);
run(venvPython, ["-m", "pip", "install", "-r", requirementsPath, "--quiet"]);

if (isLinux) {
    const libPath = detectNixLibPath(venvPython);
    if (libPath) {
        persistLibraryPath(libPath);
    } else if (testImport(venvPython, undefined)) {
        console.log("  faster_whisper imports OK — no extra library path needed.");
    } else {
        console.warn(
            "  WARNING: faster_whisper import still fails. " +
            "Set STOCKPILOT_PYTHON_LIBRARY_PATH manually in backend/.env."
        );
    }
}

console.log(`\nS+Academia faster-whisper worker ready → ${venvPython}`);
