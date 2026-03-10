#!/usr/bin/env node
const path = require("path");
const { spawn } = require("child_process");

const { loadRootEnv, requireEnv } = require("./load-root-env");

const repoRoot = path.resolve(__dirname, "..", "..");
const env = loadRootEnv(repoRoot);
const token = requireEnv(env, "DOPPLER_TOKEN");

const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", [
    "-y",
    "@dopplerhq/mcp-server"
], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
        ...process.env,
        DOPPLER_TOKEN: token
    }
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
