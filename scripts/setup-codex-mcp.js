#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
    buildServers,
    ensureFile,
    loadManifest,
    normalizePath,
    readRootEnv,
    renderManagedBlock,
    resolveConfigPath,
    stripServerSections,
    syncR2Env,
    upsertManagedBlock
} = require("./lib/codex-mcp");

function main() {
    const repoRoot = path.resolve(__dirname, "..");
    const env = readRootEnv(repoRoot);
    const workspacePath = normalizePath(repoRoot);
    const manifest = loadManifest(repoRoot);
    const configPath = resolveConfigPath();

    const r2EnvPath = syncR2Env(repoRoot, env);
    const { configured, skipped } = buildServers(manifest, env, workspacePath);
    const managedBlock = renderManagedBlock(configured);
    const currentConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    const cleanupTargets = configured.map((server) => server.name).concat(["cloudflare"]);
    const sanitizedConfig = stripServerSections(currentConfig, cleanupTargets);
    const nextConfig = upsertManagedBlock(sanitizedConfig, managedBlock);

    ensureFile(configPath, nextConfig);

    console.log(`Codex MCP config updated: ${configPath}`);
    console.log(`R2 MCP env synced: ${r2EnvPath}`);
    console.log("Configured MCP servers:");
    configured.forEach((server) => console.log(`- ${server.name}`));

    if (skipped.length > 0) {
        console.log("Skipped optional MCP servers:");
        skipped.forEach((server) => console.log(`- ${server.name} (${server.reason})`));
    }
}

try {
    main();
} catch (error) {
    console.error(`setup-codex-mcp failed: ${error.message}`);
    process.exit(1);
}
