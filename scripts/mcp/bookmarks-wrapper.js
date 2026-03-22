#!/usr/bin/env node
const path = require("path");
const { spawn } = require("child_process");

const { loadRootEnv, requireEnv } = require("./load-root-env");

const repoRoot = path.resolve(__dirname, "..", "..");
const env = loadRootEnv(repoRoot);
const supabaseUrl = requireEnv(env, "SUPABASE_URL");
const supabaseKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

const child = spawn("node", [
    path.join(repoRoot, "bookmarks-mcp", "server.js")
], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
        ...process.env,
        SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: supabaseKey
    }
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
