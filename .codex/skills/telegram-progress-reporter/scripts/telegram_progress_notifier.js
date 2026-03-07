#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const RUNTIME_DIR = path.join(REPO_ROOT, ".codex", "runtime", "telegram-progress-reporter");

function main() {
    const options = parseArgs(process.argv.slice(2));
    const command = options._[0];

    if (!command || command === "help" || command === "--help") {
        printHelp();
        return;
    }

    const config = loadConfig();

    run(command, options, config).catch((error) => {
        console.error(`[telegram-progress] ${error.message}`);
        process.exit(1);
    });
}

async function run(command, options, config) {
    switch (command) {
        case "start":
            await runStart(options, config);
            return;
        case "watch":
            await runWatch(options, config);
            return;
        case "checkpoint":
            await runCheckpoint(options, config);
            return;
        case "finish":
            await runFinish(options, config);
            return;
        default:
            throw new Error(`Unknown command: ${command}`);
    }
}

function printHelp() {
    console.log(`Usage:
  node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js start [--summary "..."] [--print-session-id]
  node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js watch --session-id <id>
  node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js checkpoint --summary "..." [--scope repo] [--status ok] [--command "..."] [--file path]
  node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js finish [--session-id <id>] [--status ok]

Environment:
  CODEX_TELEGRAM_ENABLED=1
  CODEX_TELEGRAM_BOT_TOKEN=...
  CODEX_TELEGRAM_CHAT_ID=...
  CODEX_TELEGRAM_PROJECT_NAME=WizyClubRN
  CODEX_TELEGRAM_MAX_FILES=6
  CODEX_TELEGRAM_POLL_SECONDS=180`);
}

function parseArgs(argv) {
    const out = { _: [] };
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith("--")) {
            out._.push(token);
            continue;
        }

        const key = token.slice(2);
        const next = argv[index + 1];
        if (!next || next.startsWith("--")) {
            out[key] = true;
            continue;
        }

        if (out[key] === undefined) {
            out[key] = next;
        } else if (Array.isArray(out[key])) {
            out[key].push(next);
        } else {
            out[key] = [out[key], next];
        }
        index += 1;
    }
    return out;
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

function loadConfig() {
    const env = {
        ...parseDotEnv(path.join(REPO_ROOT, ".env")),
        ...process.env
    };

    return {
        enabled: isTruthy(env.CODEX_TELEGRAM_ENABLED),
        botToken: env.CODEX_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || "",
        chatId: env.CODEX_TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID || "",
        projectName: env.CODEX_TELEGRAM_PROJECT_NAME || path.basename(REPO_ROOT),
        maxFiles: toPositiveInteger(env.CODEX_TELEGRAM_MAX_FILES, 6),
        pollSeconds: toPositiveInteger(env.CODEX_TELEGRAM_POLL_SECONDS, 180)
    };
}

function isTruthy(value) {
    return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function toPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(String(value || ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSessionId(options) {
    const explicit = firstOption(options["session-id"]);
    if (explicit) {
        return explicit;
    }
    if (process.env.CODEX_TELEGRAM_SESSION_ID) {
        return process.env.CODEX_TELEGRAM_SESSION_ID;
    }
    return generateSessionId();
}

function generateSessionId() {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const suffix = crypto.randomBytes(3).toString("hex");
    return `${stamp}-${suffix}`;
}

function firstOption(value, fallback = "") {
    if (Array.isArray(value)) {
        return value[0] || fallback;
    }
    return value || fallback;
}

function listOption(value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function sanitizeText(value) {
    const compact = String(value || "").replace(/\s+/g, " ").trim();
    return compact.replace(/\b([A-Z0-9_]*(TOKEN|SECRET|PASSWORD|KEY)[A-Z0-9_]*)=([^\s]+)/gi, "$1=***");
}

function ensureRuntimeDir() {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function getSessionPaths(sessionId) {
    return {
        statePath: path.join(RUNTIME_DIR, `${sessionId}.state.json`),
        logPath: path.join(RUNTIME_DIR, `${sessionId}.events.jsonl`)
    };
}

function createInitialState(sessionId, config) {
    return {
        sessionId,
        projectName: config.projectName,
        startedAt: new Date().toISOString(),
        baselineFiles: {},
        touchedFiles: [],
        notificationsSent: 0,
        lastAutoSentAt: "",
        lastSentFingerprint: ""
    };
}

function loadState(sessionId, config) {
    ensureRuntimeDir();
    const { statePath } = getSessionPaths(sessionId);
    if (!fs.existsSync(statePath)) {
        return createInitialState(sessionId, config);
    }

    return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function saveState(sessionId, state) {
    ensureRuntimeDir();
    const { statePath } = getSessionPaths(sessionId);
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function appendEvent(sessionId, event) {
    ensureRuntimeDir();
    const { logPath } = getSessionPaths(sessionId);
    fs.appendFileSync(logPath, `${JSON.stringify(event)}\n`, "utf8");
}

function mergeTouchedFiles(state, files) {
    const merged = new Set(state.touchedFiles || []);
    files.filter(Boolean).forEach((filePath) => merged.add(filePath));
    state.touchedFiles = Array.from(merged).sort();
}

function snapshotToFileMap(snapshot) {
    const map = {};
    snapshot.files.forEach((file) => {
        map[file.path] = {
            added: file.added,
            removed: file.removed,
            untracked: file.untracked,
            statuses: file.statuses.slice().sort()
        };
    });
    return map;
}

function filesChangedSinceBaseline(snapshot, baselineFiles) {
    const changed = [];
    snapshot.files.forEach((file) => {
        const baseline = baselineFiles[file.path];
        if (!baseline) {
            changed.push(file.path);
            return;
        }

        const sameCounts = baseline.added === file.added && baseline.removed === file.removed;
        const sameUntracked = baseline.untracked === file.untracked;
        const sameStatuses = JSON.stringify(baseline.statuses || []) === JSON.stringify(file.statuses.slice().sort());
        if (!sameCounts || !sameUntracked || !sameStatuses) {
            changed.push(file.path);
        }
    });
    return changed.sort();
}

function gitExec(args) {
    try {
        return execFileSync("git", args, {
            cwd: REPO_ROOT,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"]
        }).trimEnd();
    } catch (error) {
        return "";
    }
}

function readSnapshot() {
    const files = new Map();

    parseStatus(gitExec(["status", "--porcelain=v1", "--untracked-files=all"]), files);
    parseNumstat(gitExec(["diff", "--numstat", "--no-renames"]), files);
    parseNumstat(gitExec(["diff", "--cached", "--numstat", "--no-renames"]), files);

    const list = Array.from(files.values()).sort((left, right) => {
        const leftWeight = left.added + left.removed + (left.untracked ? 1 : 0);
        const rightWeight = right.added + right.removed + (right.untracked ? 1 : 0);
        return rightWeight - leftWeight || left.path.localeCompare(right.path);
    });

    const totalAdded = list.reduce((sum, file) => sum + file.added, 0);
    const totalRemoved = list.reduce((sum, file) => sum + file.removed, 0);
    const fingerprint = hashValue(JSON.stringify(list.map((file) => [file.path, file.added, file.removed, file.statuses, file.untracked])));

    return {
        files: list,
        totalAdded,
        totalRemoved,
        fingerprint
    };
}

function parseStatus(output, files) {
    if (!output) {
        return;
    }

    for (const line of output.split(/\r?\n/)) {
        if (!line.trim()) {
            continue;
        }

        const status = line.slice(0, 2);
        let filePath = line.slice(3).trim();
        if (filePath.includes(" -> ")) {
            filePath = filePath.split(" -> ").pop().trim();
        }

        const entry = ensureFileEntry(files, filePath);
        if (!entry.statuses.includes(status)) {
            entry.statuses.push(status);
        }
        if (status.includes("?")) {
            entry.untracked = true;
        }
    }
}

function parseNumstat(output, files) {
    if (!output) {
        return;
    }

    for (const line of output.split(/\r?\n/)) {
        if (!line.trim()) {
            continue;
        }

        const parts = line.split("\t");
        if (parts.length < 3) {
            continue;
        }

        const added = parts[0] === "-" ? 0 : Number.parseInt(parts[0], 10) || 0;
        const removed = parts[1] === "-" ? 0 : Number.parseInt(parts[1], 10) || 0;
        const filePath = parts.slice(2).join("\t").trim();

        const entry = ensureFileEntry(files, filePath);
        entry.added += added;
        entry.removed += removed;
    }
}

function ensureFileEntry(files, filePath) {
    if (!files.has(filePath)) {
        files.set(filePath, {
            path: filePath,
            added: 0,
            removed: 0,
            statuses: [],
            untracked: false
        });
    }
    return files.get(filePath);
}

function hashValue(value) {
    return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function formatTimestamp(value) {
    return new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatDuration(secondsValue) {
    const seconds = Number.parseInt(String(secondsValue || ""), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return "";
    }

    const minutes = Math.floor(seconds / 60);
    const secondsRemainder = seconds % 60;
    if (minutes > 0 && secondsRemainder > 0) {
        return `${minutes}m ${secondsRemainder}s`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return `${secondsRemainder}s`;
}

function formatMessage(options) {
    const {
        config,
        state,
        kind,
        summary,
        scope,
        status,
        command,
        durationSeconds,
        snapshot,
        explicitFiles,
        sessionFiles
    } = options;

    const lines = [
        `${config.projectName} | ${kind}`,
        formatTimestamp(new Date().toISOString()),
        `Session: ${state.sessionId}`
    ];

    if (summary) {
        lines.push(`Summary: ${sanitizeText(summary)}`);
    }
    if (scope) {
        lines.push(`Scope: ${sanitizeText(scope)}`);
    }
    if (status) {
        lines.push(`Status: ${sanitizeText(status)}`);
    }
    if (command) {
        lines.push(`Command: ${sanitizeText(command)}`);
    }

    const duration = formatDuration(durationSeconds);
    if (duration) {
        lines.push(`Duration: ${duration}`);
    }

    lines.push(`Workspace diff: ${snapshot.files.length} files, +${snapshot.totalAdded}/-${snapshot.totalRemoved}`);
    lines.push(`Session touched: ${state.touchedFiles.length} files`);

    const visibleFiles = explicitFiles.length > 0
        ? explicitFiles
        : sessionFiles.slice(0, config.maxFiles);
    if (visibleFiles.length > 0) {
        lines.push("Files:");
        visibleFiles.slice(0, config.maxFiles).forEach((filePath) => {
            lines.push(`- ${filePath}`);
        });
        const hiddenCount = Math.max(sessionFiles.length - visibleFiles.length, 0);
        if (hiddenCount > 0 && explicitFiles.length === 0) {
            lines.push(`- +${hiddenCount} more`);
        }
    }

    return lines.join("\n");
}

async function sendIfConfigured(config, text, dryRun) {
    if (dryRun) {
        console.log(text);
        return false;
    }

    if (!config.enabled) {
        return false;
    }

    if (!config.botToken || !config.chatId) {
        console.error("[telegram-progress] Telegram is enabled but bot token or chat id is missing.");
        return false;
    }

    await sendTelegramMessage(config, text);
    return true;
}

function sendTelegramMessage(config, text) {
    const body = JSON.stringify({
        chat_id: config.chatId,
        text,
        disable_web_page_preview: true
    });

    return new Promise((resolve, reject) => {
        const request = https.request(
            `https://api.telegram.org/bot${config.botToken}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body)
                }
            },
            (response) => {
                const chunks = [];
                response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                response.on("end", () => {
                    const statusCode = response.statusCode || 0;
                    if (statusCode >= 200 && statusCode < 300) {
                        resolve();
                        return;
                    }

                    const payload = Buffer.concat(chunks).toString("utf8");
                    reject(new Error(`Telegram API returned HTTP ${statusCode}: ${payload.slice(0, 240)}`));
                });
            }
        );

        request.on("error", reject);
        request.write(body);
        request.end();
    });
}

async function runStart(options, config) {
    const sessionId = getSessionId(options);
    const state = createInitialState(sessionId, config);
    const snapshot = readSnapshot();
    state.baselineFiles = snapshotToFileMap(snapshot);
    state.lastSentFingerprint = snapshot.fingerprint;
    saveState(sessionId, state);

    const summary = firstOption(options.summary, "Codex session started");
    const message = formatMessage({
        config,
        state,
        kind: "start",
        summary,
        scope: firstOption(options.scope, ""),
        status: "info",
        command: "",
        durationSeconds: "",
        snapshot,
        explicitFiles: [],
        sessionFiles: []
    });

    const sent = await sendIfConfigured(config, message, Boolean(options["dry-run"]));
    if (sent) {
        state.notificationsSent += 1;
        saveState(sessionId, state);
    }

    appendEvent(sessionId, {
        ts: new Date().toISOString(),
        type: "start",
        summary,
        sent,
        snapshot
    });

    if (options["print-session-id"]) {
        process.stdout.write(`${sessionId}\n`);
    }
}

async function runCheckpoint(options, config) {
    const summary = firstOption(options.summary);
    if (!summary) {
        throw new Error("checkpoint requires --summary");
    }

    const sessionId = getSessionId(options);
    const state = loadState(sessionId, config);
    const snapshot = readSnapshot();
    const explicitFiles = listOption(options.file);
    const sessionFiles = filesChangedSinceBaseline(snapshot, state.baselineFiles || {});
    mergeTouchedFiles(state, sessionFiles);
    mergeTouchedFiles(state, explicitFiles);

    const message = formatMessage({
        config,
        state,
        kind: "checkpoint",
        summary,
        scope: firstOption(options.scope, ""),
        status: firstOption(options.status, "info"),
        command: firstOption(options.command, ""),
        durationSeconds: firstOption(options["duration-seconds"], ""),
        snapshot,
        explicitFiles,
        sessionFiles
    });

    const sent = await sendIfConfigured(config, message, Boolean(options["dry-run"]));
    if (sent) {
        state.notificationsSent += 1;
        state.lastSentFingerprint = snapshot.fingerprint;
    }
    saveState(sessionId, state);

    appendEvent(sessionId, {
        ts: new Date().toISOString(),
        type: "checkpoint",
        summary,
        scope: firstOption(options.scope, ""),
        status: firstOption(options.status, "info"),
        command: firstOption(options.command, ""),
        durationSeconds: firstOption(options["duration-seconds"], ""),
        files: explicitFiles,
        sessionFiles,
        sent,
        snapshot
    });
}

async function runFinish(options, config) {
    const sessionId = getSessionId(options);
    const state = loadState(sessionId, config);
    const snapshot = readSnapshot();
    const sessionFiles = filesChangedSinceBaseline(snapshot, state.baselineFiles || {});
    mergeTouchedFiles(state, sessionFiles);
    const status = firstOption(options.status, "ok");
    const summary = firstOption(
        options.summary,
        status === "fail" ? "Codex session finished with a failure state" : "Codex session completed"
    );

    const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)
    );

    const message = formatMessage({
        config,
        state,
        kind: "finish",
        summary,
        scope: firstOption(options.scope, ""),
        status,
        command: "",
        durationSeconds,
        snapshot,
        explicitFiles: [],
        sessionFiles
    });

    const sent = await sendIfConfigured(config, message, Boolean(options["dry-run"]));
    if (sent) {
        state.notificationsSent += 1;
    }
    state.finishedAt = new Date().toISOString();
    state.lastSentFingerprint = snapshot.fingerprint;
    saveState(sessionId, state);

    appendEvent(sessionId, {
        ts: new Date().toISOString(),
        type: "finish",
        summary,
        status,
        sent,
        durationSeconds,
        sessionFiles,
        snapshot
    });
}

async function runWatch(options, config) {
    const sessionId = getSessionId(options);
    const state = loadState(sessionId, config);
    let shouldStop = false;
    const dryRun = Boolean(options["dry-run"]);

    const handleSignal = () => {
        shouldStop = true;
    };

    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);

    while (!shouldStop) {
        const freshState = loadState(sessionId, config);
        const snapshot = readSnapshot();
        const sessionFiles = filesChangedSinceBaseline(snapshot, freshState.baselineFiles || {});
        mergeTouchedFiles(freshState, sessionFiles);

        const cooldownMs = config.pollSeconds * 1000;
        const lastAutoSentAt = freshState.lastAutoSentAt ? new Date(freshState.lastAutoSentAt).getTime() : 0;
        const changed = snapshot.fingerprint !== freshState.lastSentFingerprint;
        const cooldownElapsed = Date.now() - lastAutoSentAt >= cooldownMs;

        if (changed && cooldownElapsed && snapshot.files.length > 0) {
            const message = formatMessage({
                config,
                state: freshState,
                kind: "auto",
                summary: "Workspace changes detected",
                scope: "",
                status: "info",
                command: "",
                durationSeconds: "",
                snapshot,
                explicitFiles: [],
                sessionFiles
            });

            const sent = await sendIfConfigured(config, message, dryRun);
            freshState.lastAutoSentAt = new Date().toISOString();
            freshState.lastSentFingerprint = snapshot.fingerprint;
            if (sent) {
                freshState.notificationsSent += 1;
            }
            saveState(sessionId, freshState);

            appendEvent(sessionId, {
                ts: new Date().toISOString(),
                type: "auto",
                summary: "Workspace changes detected",
                sessionFiles,
                sent,
                snapshot
            });
        } else {
            saveState(sessionId, freshState);
        }

        await delay(config.pollSeconds * 1000);
    }
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main();
