#!/usr/bin/env node
const path = require("path");
const { spawnNpx } = require("./spawn-npx");

const repoRoot = path.resolve(__dirname, "..", "..");

const child = spawnNpx([
    "-y",
    "@modelcontextprotocol/server-filesystem",
    repoRoot
], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
});

child.on("error", (error) => {
    console.error(`[filesystem-wrapper] failed to start child process: ${error.message}`);
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
