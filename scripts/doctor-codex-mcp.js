#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
    BEGIN_MARKER,
    buildServers,
    getManagedBlockHealth,
    loadManifest,
    normalizePath,
    parseDotEnv,
    readRootEnv,
    resolveConfigPath
} = require("./lib/codex-mcp");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function main() {
    const repoRoot = path.resolve(__dirname, "..");
    const env = readRootEnv(repoRoot);
    const manifest = loadManifest(repoRoot);
    const workspacePath = normalizePath(repoRoot);
    const configPath = resolveConfigPath();
    const r2EnvPath = path.join(repoRoot, "r2-mcp", ".env");
    const r2ServerPath = path.join(repoRoot, "r2-mcp", "custom-r2-server.js");

    const { configured, skipped } = buildServers(manifest, env, workspacePath);

    assert(fs.existsSync(configPath), `Codex config not found: ${configPath}`);
    const configContent = fs.readFileSync(configPath, "utf8");
    assert(configContent.includes(BEGIN_MARKER), "Managed MCP block is missing from Codex config.");
    const managedBlockHealth = getManagedBlockHealth(configContent);
    assert(
        managedBlockHealth.isBalanced,
        `Managed MCP block is malformed in Codex config (begin=${managedBlockHealth.beginCount}, end=${managedBlockHealth.endCount}).`
    );

    configured.forEach((server) => {
        assert(
            configContent.includes(`[mcp_servers.${server.name}]`),
            `Configured MCP server missing from config: ${server.name}`
        );

        if (server.env) {
            Object.keys(server.env).forEach((key) => {
                assert(
                    configContent.includes(`${key} = `),
                    `Configured MCP server is missing env forwarding for ${server.name}: ${key}`
                );
            });
        }
    });

    assert(fs.existsSync(r2EnvPath), `r2-mcp/.env not found: ${r2EnvPath}`);
    const r2Env = parseDotEnv(r2EnvPath);
    ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"].forEach((key) => {
        assert(r2Env[key], `Missing ${key} in ${r2EnvPath}`);
    });

    assert(fs.existsSync(r2ServerPath), `R2 MCP server file not found: ${r2ServerPath}`);

    console.log(`Codex config: OK (${configPath})`);
    console.log(`R2 env: OK (${r2EnvPath})`);
    console.log("Managed MCP servers:");
    configured.forEach((server) => console.log(`- ${server.name}`));

    if (skipped.length > 0) {
        console.log("Skipped optional MCP servers:");
        skipped.forEach((server) => console.log(`- ${server.name} (${server.reason})`));
    }
}

try {
    main();
} catch (error) {
    console.error(`doctor-codex-mcp failed: ${error.message}`);
    process.exit(1);
}
