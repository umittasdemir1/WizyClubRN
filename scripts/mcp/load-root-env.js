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

function loadRootEnv(repoRoot) {
    const envPath = path.join(repoRoot, ".env");
    const fileEnv = fs.existsSync(envPath)
        ? parseEnvFile(fs.readFileSync(envPath, "utf8"))
        : {};

    return {
        ...fileEnv,
        ...process.env
    };
}

function requireEnv(env, key) {
    const value = env[key];

    if (!value || !String(value).trim()) {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return String(value).trim();
}

module.exports = {
    loadRootEnv,
    parseEnvFile,
    requireEnv
};
