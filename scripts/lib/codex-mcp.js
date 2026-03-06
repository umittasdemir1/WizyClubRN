const fs = require("fs");
const os = require("os");
const path = require("path");

const BEGIN_MARKER = "# BEGIN WIZYCLUB MANAGED MCP";
const END_MARKER = "# END WIZYCLUB MANAGED MCP";

function normalizePath(value) {
    return value.replace(/\\/g, "/");
}

function parseDotEnv(filePath) {
    const out = {};
    if (!fs.existsSync(filePath)) {
        return out;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const idx = trimmed.indexOf("=");
        if (idx <= 0) {
            continue;
        }

        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }

    return out;
}

function readRootEnv(repoRoot) {
    const rootEnvPath = path.join(repoRoot, ".env");
    if (!fs.existsSync(rootEnvPath)) {
        throw new Error(`Root .env not found: ${rootEnvPath}`);
    }
    return parseDotEnv(rootEnvPath);
}

function getMissingEnv(env, keys) {
    return keys.filter((key) => !env[key] || !String(env[key]).trim());
}

function syncR2Env(repoRoot, env) {
    const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
    const missing = getMissingEnv(env, required);
    if (missing.length > 0) {
        throw new Error(`Missing required R2 env keys in root .env: ${missing.join(", ")}`);
    }

    const targetPath = path.join(repoRoot, "r2-mcp", ".env");
    const lines = [
        "# Auto-generated from ../.env by scripts/setup-codex-mcp.js",
        `R2_ACCOUNT_ID=${env.R2_ACCOUNT_ID}`,
        `R2_ACCESS_KEY_ID=${env.R2_ACCESS_KEY_ID}`,
        `R2_SECRET_ACCESS_KEY=${env.R2_SECRET_ACCESS_KEY}`
    ];

    if (env.R2_BUCKET_NAME) {
        lines.push(`R2_BUCKET_NAME=${env.R2_BUCKET_NAME}`);
    }
    if (env.R2_PUBLIC_URL) {
        lines.push(`R2_PUBLIC_URL=${env.R2_PUBLIC_URL}`);
    }

    fs.writeFileSync(targetPath, `${lines.join("\n")}\n`, "utf8");
    return targetPath;
}

function resolveConfigPath() {
    if (process.env.CODEX_CONFIG_PATH) {
        return path.resolve(process.env.CODEX_CONFIG_PATH);
    }

    const codexHome = process.env.CODEX_HOME
        ? path.resolve(process.env.CODEX_HOME)
        : path.join(os.homedir(), ".codex");
    return path.join(codexHome, "config.toml");
}

function loadManifest(repoRoot) {
    const manifestPath = path.join(repoRoot, ".codex", "mcp-servers.json");
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function pickCommand(commandSpec) {
    if (typeof commandSpec === "string") {
        return commandSpec;
    }

    return commandSpec[process.platform] || commandSpec.default;
}

function resolveToken(value, env, workspacePath) {
    const envMatch = value.match(/^\{env:([A-Z0-9_]+)\}$/);
    if (envMatch) {
        return env[envMatch[1]] || "";
    }

    return value.replace(/\{workspace\}/g, workspacePath);
}

function resolveEnvMap(envMap, env, workspacePath) {
    const resolved = {};
    Object.entries(envMap || {}).forEach(([key, value]) => {
        resolved[key] = resolveToken(value, env, workspacePath);
    });
    return resolved;
}

function buildServers(manifest, env, workspacePath) {
    const configured = [];
    const skipped = [];

    for (const server of manifest.servers) {
        const required = server.requiresEnv || [];
        const missing = getMissingEnv(env, required);

        if (missing.length > 0) {
            if (server.optional) {
                skipped.push({
                    name: server.name,
                    reason: `missing env: ${missing.join(", ")}`
                });
                continue;
            }
            throw new Error(`Cannot configure ${server.name}: missing env ${missing.join(", ")}`);
        }

        if (server.type === "url") {
            configured.push({
                name: server.name,
                type: "url",
                url: server.url,
                description: server.description || ""
            });
            continue;
        }

        const command = pickCommand(server.command);
        const args = (server.args || []).map((arg) => resolveToken(arg, env, workspacePath));
        const serverEnv = resolveEnvMap(server.env, env, workspacePath);

        configured.push({
            name: server.name,
            type: "command",
            command,
            args,
            env: serverEnv,
            description: server.description || ""
        });
    }

    return { configured, skipped };
}

function tomlString(value) {
    return JSON.stringify(value);
}

function tomlInlineTable(map) {
    const entries = Object.entries(map || {});
    if (entries.length === 0) {
        return "{}";
    }

    return `{ ${entries.map(([key, value]) => `${key} = ${tomlString(value)}`).join(", ")} }`;
}

function renderManagedBlock(servers) {
    const lines = [
        BEGIN_MARKER,
        "# Auto-generated by scripts/setup-codex-mcp.js.",
        "# Do not hand-edit this block; re-run the setup script instead.",
        ""
    ];

    servers.forEach((server, index) => {
        if (server.description) {
            lines.push(`# ${server.description}`);
        }
        lines.push(`[mcp_servers.${server.name}]`);

        if (server.type === "url") {
            lines.push(`url = ${tomlString(server.url)}`);
        } else {
            lines.push(`command = ${tomlString(server.command)}`);
            lines.push(`args = [${server.args.map((arg) => tomlString(arg)).join(", ")}]`);
            if (server.env && Object.keys(server.env).length > 0) {
                lines.push(`env = ${tomlInlineTable(server.env)}`);
            }
        }

        if (index !== servers.length - 1) {
            lines.push("");
        }
    });

    lines.push(END_MARKER);
    return `${lines.join("\n")}\n`;
}

function countOccurrences(content, marker) {
    const matches = content.match(new RegExp(escapeRegExp(marker), "g"));
    return matches ? matches.length : 0;
}

function getManagedBlockHealth(content) {
    const beginCount = countOccurrences(content, BEGIN_MARKER);
    const endCount = countOccurrences(content, END_MARKER);
    const firstBegin = content.indexOf(BEGIN_MARKER);
    const lastEnd = content.lastIndexOf(END_MARKER);
    const isBalanced = beginCount === 1 && endCount === 1 && firstBegin >= 0 && lastEnd > firstBegin;

    return {
        beginCount,
        endCount,
        isBalanced
    };
}

function stripManagedBlock(existingContent) {
    const lines = existingContent.split(/\r?\n/);
    const kept = [];
    let skipping = false;

    for (const line of lines) {
        if (line.includes(BEGIN_MARKER)) {
            skipping = true;
            continue;
        }

        if (line.includes(END_MARKER)) {
            skipping = false;
            continue;
        }

        if (!skipping) {
            kept.push(line);
        }
    }

    return kept.join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function upsertManagedBlock(existingContent, block) {
    const trimmed = stripManagedBlock(existingContent);
    if (!trimmed) {
        return block;
    }

    return `${trimmed}\n\n${block}`;
}

function stripServerSections(existingContent, serverNames) {
    const targets = new Set(serverNames);
    const lines = existingContent.split(/\r?\n/);
    const kept = [];
    let skipping = false;

    for (const line of lines) {
        const sectionMatch = line.match(/^\[mcp_servers\.([^\]]+)\]$/);
        const anySectionMatch = line.match(/^\[[^\]]+\]$/);

        if (sectionMatch) {
            skipping = targets.has(sectionMatch[1]);
            if (skipping) {
                continue;
            }
        } else if (anySectionMatch) {
            skipping = false;
        }

        if (!skipping) {
            kept.push(line);
        }
    }

    return kept.join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+/, "");
}

function ensureFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
    BEGIN_MARKER,
    END_MARKER,
    buildServers,
    ensureFile,
    loadManifest,
    normalizePath,
    parseDotEnv,
    readRootEnv,
    renderManagedBlock,
    resolveConfigPath,
    getManagedBlockHealth,
    stripManagedBlock,
    stripServerSections,
    syncR2Env,
    upsertManagedBlock
};
