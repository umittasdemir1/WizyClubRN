/**
 * ensure-academia-worker.mjs
 *
 * Lightweight predev check: verifies the academia Python worker is ready.
 * If the venv is missing or faster_whisper can't be imported, runs the full setup.
 * Runs in ~1 second when the environment is already healthy.
 */

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const venvDir = path.join(backendRoot, ".venv");

function resolvePythonFromVenv() {
    const candidates = isWin
        ? [path.join(venvDir, "Scripts", "python.exe")]
        : [path.join(venvDir, "bin", "python3"), path.join(venvDir, "bin", "python")];
    return candidates.find((p) => existsSync(p)) ?? null;
}

function isVenvBroken() {
    try {
        const stat = lstatSync(venvDir);
        if (stat.isSymbolicLink() && !existsSync(venvDir)) return true;
    } catch {
        return true; // doesn't exist
    }
    return resolvePythonFromVenv() === null;
}

function arePackagesInstalled() {
    // Check key package marker files instead of spawning Python — much faster.
    const sitePackages = isWin
        ? path.join(venvDir, "Lib", "site-packages")
        : (() => {
            // e.g. .venv/lib/python3.11/site-packages
            const libDir = path.join(venvDir, "lib");
            if (!existsSync(libDir)) return null;
            const pyDir = spawnSync("ls", [libDir], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
                .stdout.split("\n")
                .find((d) => d.startsWith("python3"));
            return pyDir ? path.join(libDir, pyDir, "site-packages") : null;
        })();
    if (!sitePackages) return false;
    return (
        existsSync(path.join(sitePackages, "faster_whisper")) &&
        existsSync(path.join(sitePackages, "transformers"))
    );
}

function runSetup() {
    const result = spawnSync(
        process.execPath,
        [path.join(backendRoot, "scripts", "setup-academia-worker.mjs")],
        { stdio: "inherit", shell: false }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status);
}

if (isVenvBroken()) {
    console.log("[academia] venv missing — running setup...");
    runSetup();
} else if (!arePackagesInstalled()) {
    console.log("[academia] packages missing — running setup...");
    runSetup();
} else {
    console.log("[academia] worker ready.");
}
