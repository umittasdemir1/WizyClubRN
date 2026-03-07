#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const path = require("path");
const repoRoot = path.resolve(__dirname, "..");
const rootEnvPath = path.join(repoRoot, ".env");
const backendEnvPath = path.join(repoRoot, "backend", ".env");
const mobileEnvPath = path.join(repoRoot, "mobile", ".env");
const r2EnvPath = path.join(repoRoot, "r2-mcp", ".env");

function printHelp() {
    console.log(`Usage:
  node scripts/update-env-from-doppler.js --project <project> --config <config> [--token <token>] [--no-sync]

Options:
  --project <name>   Doppler project slug.
  --config <name>    Doppler config name (for example dev/staging/prod).
  --token <token>    Optional Doppler token override. If omitted, uses DOPPLER_TOKEN from env or root .env.
  --no-sync          Only refresh root .env; skip scripts/sync-env.sh all.
  --help             Show this help.

Environment fallbacks:
  DOPPLER_PROJECT
  DOPPLER_CONFIG
  DOPPLER_TOKEN
`);
}

function parseArgs(argv) {
    const options = {
        project: "",
        config: "",
        token: "",
        noSync: false,
        help: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--help" || token === "-h") {
            options.help = true;
            continue;
        }
        if (token === "--no-sync") {
            options.noSync = true;
            continue;
        }
        if (token === "--project") {
            options.project = argv[index + 1] || "";
            index += 1;
            continue;
        }
        if (token === "--config") {
            options.config = argv[index + 1] || "";
            index += 1;
            continue;
        }
        if (token === "--token") {
            options.token = argv[index + 1] || "";
            index += 1;
            continue;
        }

        throw new Error(`Unknown argument: ${token}`);
    }

    return options;
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

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }

    return out;
}

function downloadEnvFromDoppler(project, config, token) {
    const query = new URLSearchParams({
        project,
        config,
        format: "env",
    });
    const requestUrl = `https://api.doppler.com/v3/configs/config/secrets/download?${query.toString()}`;

    return new Promise((resolve, reject) => {
        const request = https.request(
            requestUrl,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "text/plain, application/json",
                    "User-Agent": "WizyClub-doppler-env-sync/1.0",
                },
            },
            (response) => {
                const chunks = [];
                response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                response.on("end", () => {
                    const statusCode = response.statusCode || 0;
                    const body = Buffer.concat(chunks).toString("utf8");

                    if (statusCode < 200 || statusCode >= 300) {
                        let message = body.trim();
                        try {
                            const parsed = JSON.parse(body);
                            if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
                                message = parsed.messages.join(" | ");
                            } else if (parsed.message) {
                                message = String(parsed.message);
                            }
                        } catch (error) {
                            // Keep raw response when payload is not JSON.
                        }
                        reject(new Error(`Doppler API returned HTTP ${statusCode}: ${message || "unknown error"}`));
                        return;
                    }

                    resolve(body);
                });
            }
        );

        request.on("error", reject);
        request.end();
    });
}

function validateEnvContent(raw) {
    const normalized = String(raw).replace(/\r\n/g, "\n").trim();
    if (!normalized) {
        throw new Error("Doppler returned empty env output.");
    }

    const nonCommentLines = normalized
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (nonCommentLines.length === 0) {
        throw new Error("Doppler output did not include any env assignments.");
    }

    const invalidLine = nonCommentLines.find((line) => !line.includes("="));
    if (invalidLine) {
        throw new Error(`Unexpected line in Doppler output: '${invalidLine}'`);
    }

    return `${normalized}\n`;
}

function requireKeys(envMap, keys, scope) {
    const missing = keys.filter((key) => !envMap[key] || !String(envMap[key]).trim());
    if (missing.length > 0) {
        throw new Error(`Missing required ${scope} key(s) in root .env: ${missing.join(", ")}`);
    }
}

function addIfValue(lines, key, value) {
    if (value && String(value).trim()) {
        lines.push(`${key}=${value}`);
    }
}

function writeEnvFile(filePath, lines) {
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function buildRootEnvContent(downloadedRaw, preserved) {
    const map = parseDotEnvFromString(downloadedRaw);
    Object.entries(preserved).forEach(([key, value]) => {
        if (value && String(value).trim()) {
            map[key] = value;
        }
    });

    return `${Object.entries(map)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")}\n`;
}

function parseDotEnvFromString(raw) {
    const out = {};
    for (const line of String(raw).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

function syncPackageEnvFiles(rootEnv) {
    requireKeys(
        rootEnv,
        ["SUPABASE_URL", "SUPABASE_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"],
        "backend"
    );

    const backendLines = [
        "# Auto-generated from ../.env by scripts/update-env-from-doppler.js",
        `PORT=${rootEnv.PORT || "3000"}`,
        `SUPABASE_URL=${rootEnv.SUPABASE_URL}`,
        `SUPABASE_KEY=${rootEnv.SUPABASE_KEY}`,
    ];
    addIfValue(backendLines, "SUPABASE_SERVICE_ROLE_KEY", rootEnv.SUPABASE_SERVICE_ROLE_KEY);
    backendLines.push(`R2_ACCOUNT_ID=${rootEnv.R2_ACCOUNT_ID}`);
    backendLines.push(`R2_ACCESS_KEY_ID=${rootEnv.R2_ACCESS_KEY_ID}`);
    backendLines.push(`R2_SECRET_ACCESS_KEY=${rootEnv.R2_SECRET_ACCESS_KEY}`);
    backendLines.push(`R2_BUCKET_NAME=${rootEnv.R2_BUCKET_NAME}`);
    backendLines.push(`R2_PUBLIC_URL=${rootEnv.R2_PUBLIC_URL}`);
    addIfValue(backendLines, "GOOGLE_APPLICATION_CREDENTIALS", rootEnv.GOOGLE_APPLICATION_CREDENTIALS);
    addIfValue(backendLines, "GOOGLE_CLOUD_PROJECT_ID", rootEnv.GOOGLE_CLOUD_PROJECT_ID);
    addIfValue(backendLines, "GOOGLE_PLACES_API_KEY", rootEnv.GOOGLE_PLACES_API_KEY);
    addIfValue(backendLines, "GOOGLE_MAPS_API_KEY", rootEnv.GOOGLE_MAPS_API_KEY);
    writeEnvFile(backendEnvPath, backendLines);

    const mobileApiUrl = rootEnv.EXPO_PUBLIC_API_URL || rootEnv.WIZY_MOBILE_API_URL || "";
    const mobileSupabaseUrl = rootEnv.EXPO_PUBLIC_SUPABASE_URL || rootEnv.SUPABASE_URL || "";
    const mobileSupabaseKey = rootEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY || rootEnv.SUPABASE_KEY || "";
    if (!mobileApiUrl || !mobileSupabaseUrl || !mobileSupabaseKey) {
        throw new Error("Missing required mobile key(s): EXPO_PUBLIC_API_URL (or WIZY_MOBILE_API_URL), SUPABASE_URL, SUPABASE_KEY");
    }

    const mobileLines = [
        "# Auto-generated from ../.env by scripts/update-env-from-doppler.js",
        `EXPO_PUBLIC_API_URL=${mobileApiUrl}`,
        `EXPO_PUBLIC_SUPABASE_URL=${mobileSupabaseUrl}`,
        `EXPO_PUBLIC_SUPABASE_ANON_KEY=${mobileSupabaseKey}`,
    ];
    addIfValue(mobileLines, "GOOGLE_MAPS_API_KEY", rootEnv.GOOGLE_MAPS_API_KEY);
    addIfValue(mobileLines, "GOOGLE_MAPS_ANDROID_API_KEY", rootEnv.GOOGLE_MAPS_ANDROID_API_KEY);
    addIfValue(mobileLines, "GOOGLE_MAPS_IOS_API_KEY", rootEnv.GOOGLE_MAPS_IOS_API_KEY);
    addIfValue(mobileLines, "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY", rootEnv.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY);
    addIfValue(mobileLines, "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY", rootEnv.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY);
    writeEnvFile(mobileEnvPath, mobileLines);

    requireKeys(rootEnv, ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"], "r2-mcp");
    const r2Lines = [
        "# Auto-generated from ../.env by scripts/update-env-from-doppler.js",
        `R2_ACCOUNT_ID=${rootEnv.R2_ACCOUNT_ID}`,
        `R2_ACCESS_KEY_ID=${rootEnv.R2_ACCESS_KEY_ID}`,
        `R2_SECRET_ACCESS_KEY=${rootEnv.R2_SECRET_ACCESS_KEY}`,
    ];
    addIfValue(r2Lines, "R2_BUCKET_NAME", rootEnv.R2_BUCKET_NAME);
    addIfValue(r2Lines, "R2_PUBLIC_URL", rootEnv.R2_PUBLIC_URL);
    writeEnvFile(r2EnvPath, r2Lines);
}

function timestamp() {
    return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

async function run() {
    try {
        const options = parseArgs(process.argv.slice(2));
        if (options.help) {
            printHelp();
            return;
        }

        const dotEnv = parseDotEnv(rootEnvPath);
        const project = options.project || process.env.DOPPLER_PROJECT || dotEnv.DOPPLER_PROJECT || "";
        const config = options.config || process.env.DOPPLER_CONFIG || dotEnv.DOPPLER_CONFIG || "";
        const token = options.token || process.env.DOPPLER_TOKEN || dotEnv.DOPPLER_TOKEN || "";

        if (!project) {
            throw new Error("Missing Doppler project. Pass --project or set DOPPLER_PROJECT.");
        }
        if (!config) {
            throw new Error("Missing Doppler config. Pass --config or set DOPPLER_CONFIG.");
        }
        if (!token) {
            throw new Error("Missing Doppler token. Pass --token or set DOPPLER_TOKEN.");
        }

        console.log(`[doppler-env-sync] downloading env from Doppler project='${project}' config='${config}'`);
        const rawEnv = await downloadEnvFromDoppler(project, config, token);
        const normalizedEnv = validateEnvContent(rawEnv);
        const nextEnv = buildRootEnvContent(normalizedEnv, {
            DOPPLER_TOKEN: token,
            DOPPLER_PROJECT: project,
            DOPPLER_CONFIG: config,
        });

        let backupPath = "";
        if (fs.existsSync(rootEnvPath)) {
            backupPath = `${rootEnvPath}.bak.${timestamp()}`;
            fs.copyFileSync(rootEnvPath, backupPath);
        }

        fs.writeFileSync(rootEnvPath, nextEnv, "utf8");
        console.log(`[doppler-env-sync] root .env updated: ${rootEnvPath}`);
        if (backupPath) {
            console.log(`[doppler-env-sync] backup created: ${backupPath}`);
        }

        if (!options.noSync) {
            console.log("[doppler-env-sync] syncing root env into backend/mobile/r2-mcp");
            syncPackageEnvFiles(parseDotEnv(rootEnvPath));
        }

        console.log("[doppler-env-sync] done");
    } catch (error) {
        console.error(`[doppler-env-sync] failed: ${error.message}`);
        process.exit(1);
    }
}

run();
