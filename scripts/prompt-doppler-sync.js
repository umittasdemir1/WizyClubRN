#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const rootEnvPath = path.join(repoRoot, ".env");
const dopplerBootstrapKeys = ["DOPPLER_TOKEN", "DOPPLER_PROJECT", "DOPPLER_CONFIG"];

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

function isExplicitFalse(value) {
    return ["0", "false", "no", "off"].includes(String(value || "").trim().toLowerCase());
}

function hasDopplerBootstrap(env) {
    return dopplerBootstrapKeys.every((key) => env[key] && String(env[key]).trim());
}

function shouldPrompt(env) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        return false;
    }

    if (isExplicitFalse(env.CODEX_DOPPLER_SYNC_PROMPT)) {
        return false;
    }

    return hasDopplerBootstrap(env);
}

function askQuestion(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(String(answer || "").trim());
        });
    });
}

function isYes(answer) {
    const normalized = String(answer || "").trim().toLowerCase();
    return ["e", "evet", "y", "yes"].includes(normalized);
}

function runDopplerSync() {
    const result = spawnSync("node", ["scripts/update-env-from-doppler.js"], {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

async function main() {
    const env = {
        ...parseDotEnv(rootEnvPath),
        ...process.env
    };

    if (!shouldPrompt(env)) {
        return;
    }

    const answer = await askQuestion("Doppler'a yeni key/token/api girdin mi? Sync calistirayim mi? [e/H]: ");
    if (!isYes(answer)) {
        return;
    }

    runDopplerSync();
}

main().catch((error) => {
    console.error(`[codex-startup] Doppler sync prompt failed: ${error.message}`);
    process.exit(1);
});
