#!/usr/bin/env node
const path = require("path");

const { loadRootEnv, requireEnv } = require("./load-root-env");
const { spawnNpx } = require("./spawn-npx");

const repoRoot = path.resolve(__dirname, "..", "..");
const env = loadRootEnv(repoRoot);
const token = requireEnv(env, "GITHUB_PERSONAL_ACCESS_TOKEN");

const child = spawnNpx([
    "-y",
    "@modelcontextprotocol/server-github"
], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
        ...process.env,
        GITHUB_PERSONAL_ACCESS_TOKEN: token
    }
});

child.on("error", (error) => {
    console.error(`[github-wrapper] failed to start child process: ${error.message}`);
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
