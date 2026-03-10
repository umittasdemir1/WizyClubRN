#!/usr/bin/env node
const path = require("path");
const { spawn } = require("child_process");

const { loadRootEnv, requireEnv } = require("./load-root-env");

const repoRoot = path.resolve(__dirname, "..", "..");
const env = loadRootEnv(repoRoot);
const accessToken = requireEnv(env, "SUPABASE_MCP_ACCESS_TOKEN");

const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--access-token",
    accessToken
], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
