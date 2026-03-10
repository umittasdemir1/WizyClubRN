const fs = require("fs");
const path = require("path");

function parseEnvFile(content) {
    const result = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        const separatorIndex = line.indexOf("=");

        if (separatorIndex < 0) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if (
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        result[key] = value;
    }

    return result;
}

function loadEnv(repoRoot, runtimeEnv = process.env) {
    const envPath = path.join(repoRoot, ".env");
    const fileEnv = fs.existsSync(envPath)
        ? parseEnvFile(fs.readFileSync(envPath, "utf8"))
        : {};

    return {
        ...fileEnv,
        ...runtimeEnv
    };
}

function requireEnv(env, key) {
    const value = env[key];

    if (!value || !String(value).trim()) {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return String(value).trim();
}

function normalizeString(value) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}

function normalizeLimit(value, fallback = 10, max = 50) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(Math.floor(parsed), max);
}

function normalizeRowId(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function buildRpcRequest(supabaseUrl, serviceRoleKey, rpcName, body) {
    return {
        url: `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${rpcName}`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": serviceRoleKey,
                "Authorization": `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify(body)
        }
    };
}

async function callRpc(fetchImpl, supabaseUrl, serviceRoleKey, rpcName, body) {
    const request = buildRpcRequest(supabaseUrl, serviceRoleKey, rpcName, body);
    const response = await fetchImpl(request.url, request.options);
    const rawBody = await response.text();
    const parsedBody = rawBody ? JSON.parse(rawBody) : null;

    if (!response.ok) {
        throw new Error(`Supabase RPC failed (${response.status}): ${rawBody}`);
    }

    return parsedBody;
}

module.exports = {
    buildRpcRequest,
    callRpc,
    loadEnv,
    normalizeLimit,
    normalizeRowId,
    normalizeString,
    parseEnvFile,
    requireEnv
};
