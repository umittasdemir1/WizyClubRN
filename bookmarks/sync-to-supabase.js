const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const envFile = path.join(repoRoot, ".env");
const sourceFile = path.join(repoRoot, "x-bookmarks-local", "data", "bookmarks.json");

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

function loadEnv() {
    const fileEnv = parseEnvFile(fs.readFileSync(envFile, "utf8"));

    return {
        ...fileEnv,
        ...process.env
    };
}

async function main() {
    const env = loadEnv();
    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.");
    }

    const source = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
    const bookmarks = Array.isArray(source.bookmarks) ? source.bookmarks : [];
    const syncedAt = new Date().toISOString();
    const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/bookmarks_upsert_x_bookmarks`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": serviceRoleKey,
                "Authorization": `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
                payload: bookmarks,
                context: {
                    workflow: "bookmarks",
                    source_file: path.relative(repoRoot, sourceFile),
                    source_updated_at: source.updatedAt || null,
                    synced_at: syncedAt
                }
            }),
            signal: controller.signal
        });

        const rawBody = await response.text();
        const body = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
            throw new Error(`Supabase sync failed (${response.status}): ${rawBody}`);
        }

        console.log(JSON.stringify({
            endpoint,
            bookmarkCount: bookmarks.length,
            result: body
        }, null, 2));
    } finally {
        clearTimeout(timeoutId);
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
