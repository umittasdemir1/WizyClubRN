#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const RUNTIME_DIR = path.join(REPO_ROOT, ".codex", "runtime", "telegram-progress-reporter");
const CONTROL_STATE_PATH = path.join(RUNTIME_DIR, "backup-control.json");
const RESTORE_DIR = path.join(RUNTIME_DIR, "restored");
const MAX_BACKUP_ENTRIES = 50;

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
        case "archive-backup":
            await runArchiveBackup(options, config);
            return;
        case "restore-backup":
            await runRestoreBackup(options, config);
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
  node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js archive-backup --file <path> [--delete-plain] [--dry-run]
  node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js restore-backup [--backup-id <id>] [--output <path>]

Environment:
  CODEX_TELEGRAM_ENABLED=1
  CODEX_TELEGRAM_BOT_TOKEN=...
  CODEX_TELEGRAM_CHAT_ID=...
  CODEX_TELEGRAM_PROJECT_NAME=WizyClubRN
  CODEX_TELEGRAM_MAX_FILES=6
  CODEX_TELEGRAM_POLL_SECONDS=180
  CODEX_TELEGRAM_BACKUP_ENABLED=1`);
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
        chatId: String(env.CODEX_TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID || ""),
        projectName: env.CODEX_TELEGRAM_PROJECT_NAME || path.basename(REPO_ROOT),
        maxFiles: toPositiveInteger(env.CODEX_TELEGRAM_MAX_FILES, 6),
        pollSeconds: toPositiveInteger(env.CODEX_TELEGRAM_POLL_SECONDS, 180),
        backupEnabled: isTruthy(env.CODEX_TELEGRAM_ENABLED) && !isExplicitFalse(env.CODEX_TELEGRAM_BACKUP_ENABLED)
    };
}

function isTruthy(value) {
    return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function isExplicitFalse(value) {
    return ["0", "false", "no", "off"].includes(String(value || "").trim().toLowerCase());
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

function createInitialControlState() {
    return {
        backups: []
    };
}

function loadControlState() {
    ensureRuntimeDir();
    if (!fs.existsSync(CONTROL_STATE_PATH)) {
        return createInitialControlState();
    }
    return JSON.parse(fs.readFileSync(CONTROL_STATE_PATH, "utf8"));
}

function saveControlState(state) {
    ensureRuntimeDir();
    const next = {
        backups: Array.isArray(state.backups) ? state.backups.slice(0, MAX_BACKUP_ENTRIES) : []
    };
    fs.writeFileSync(CONTROL_STATE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
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
    return new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(value)) + " TSİ";
}

function formatDuration(secondsValue) {
    const seconds = Number.parseInt(String(secondsValue || ""), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return "";
    }

    const minutes = Math.floor(seconds / 60);
    const secondsRemainder = seconds % 60;
    if (minutes > 0 && secondsRemainder > 0) {
        return `${minutes} dk ${secondsRemainder} sn`;
    }
    if (minutes > 0) {
        return `${minutes} dk`;
    }
    return `${secondsRemainder} sn`;
}

function localizeKind(kind) {
    const labels = {
        start: "başlangıç",
        checkpoint: "güncelleme",
        finish: "bitiş",
        auto: "otomatik"
    };

    return labels[kind] || kind;
}

function localizeStatus(status) {
    const labels = {
        ok: "tamam",
        fail: "hata",
        info: "bilgi"
    };

    return labels[status] || status;
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
        `${config.projectName} | ${localizeKind(kind)}`,
        formatTimestamp(new Date().toISOString()),
        `Oturum: ${state.sessionId}`
    ];

    if (summary) {
        lines.push(`Özet: ${sanitizeText(summary)}`);
    }
    if (scope) {
        lines.push(`Kapsam: ${sanitizeText(scope)}`);
    }
    if (status) {
        lines.push(`Durum: ${sanitizeText(localizeStatus(status))}`);
    }
    if (command) {
        lines.push(`Komut: ${sanitizeText(command)}`);
    }

    const duration = formatDuration(durationSeconds);
    if (duration) {
        lines.push(`Süre: ${duration}`);
    }

    lines.push(`Çalışma alanı farkı: ${snapshot.files.length} dosya, +${snapshot.totalAdded}/-${snapshot.totalRemoved}`);
    lines.push(`Oturumda dokunulan: ${state.touchedFiles.length} dosya`);

    const visibleFiles = explicitFiles.length > 0
        ? explicitFiles
        : sessionFiles.slice(0, config.maxFiles);
    if (visibleFiles.length > 0) {
        lines.push("Dosyalar:");
        visibleFiles.slice(0, config.maxFiles).forEach((filePath) => {
            lines.push(`- ${filePath}`);
        });
        const hiddenCount = Math.max(sessionFiles.length - visibleFiles.length, 0);
        if (hiddenCount > 0 && explicitFiles.length === 0) {
            lines.push(`- +${hiddenCount} daha`);
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

    ensureTelegramReady(config);
    await sendTelegramMessage(config, text);
    return true;
}

function ensureTelegramReady(config) {
    if (!config.enabled) {
        throw new Error("Telegram is disabled.");
    }
    if (!config.botToken || !config.chatId) {
        throw new Error("Telegram is enabled but bot token or chat id is missing.");
    }
}

async function sendTelegramMessage(config, text, extraPayload = {}) {
    return telegramJsonRequest(config, "sendMessage", {
        chat_id: config.chatId,
        text,
        disable_web_page_preview: true,
        ...extraPayload
    });
}

async function sendTelegramDocument(config, options) {
    return telegramMultipartRequest(config, "sendDocument", {
        chat_id: config.chatId,
        caption: options.caption || "",
        disable_content_type_detection: "true"
    }, {
        fieldName: "document",
        filename: options.filename,
        contentType: options.contentType || "application/octet-stream",
        data: options.data
    });
}

async function telegramJsonRequest(config, methodName, payload) {
    const body = JSON.stringify(payload || {});
    const responseBody = await httpRequestBuffer(
        `https://api.telegram.org/bot${config.botToken}/${methodName}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        },
        Buffer.from(body, "utf8")
    );

    let parsed;
    try {
        parsed = JSON.parse(responseBody.toString("utf8"));
    } catch (error) {
        throw new Error(`Telegram API returned invalid JSON for ${methodName}`);
    }

    if (!parsed.ok) {
        throw new Error(`Telegram API ${methodName} failed: ${JSON.stringify(parsed).slice(0, 240)}`);
    }

    return parsed.result;
}

async function telegramMultipartRequest(config, methodName, fields, file) {
    const boundary = `----wizyclub-${crypto.randomBytes(12).toString("hex")}`;
    const body = buildMultipartBody(boundary, fields, file);

    const responseBody = await httpRequestBuffer(
        `https://api.telegram.org/bot${config.botToken}/${methodName}`,
        {
            method: "POST",
            headers: {
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": body.length
            }
        },
        body
    );

    let parsed;
    try {
        parsed = JSON.parse(responseBody.toString("utf8"));
    } catch (error) {
        throw new Error(`Telegram API returned invalid JSON for ${methodName}`);
    }

    if (!parsed.ok) {
        throw new Error(`Telegram API ${methodName} failed: ${JSON.stringify(parsed).slice(0, 240)}`);
    }

    return parsed.result;
}

function buildMultipartBody(boundary, fields, file) {
    const chunks = [];

    Object.entries(fields || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }
        chunks.push(Buffer.from(`--${boundary}\r\n`, "utf8"));
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`, "utf8"));
        chunks.push(Buffer.from(String(value), "utf8"));
        chunks.push(Buffer.from("\r\n", "utf8"));
    });

    chunks.push(Buffer.from(`--${boundary}\r\n`, "utf8"));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\n`, "utf8"));
    chunks.push(Buffer.from(`Content-Type: ${file.contentType}\r\n\r\n`, "utf8"));
    chunks.push(file.data);
    chunks.push(Buffer.from("\r\n", "utf8"));
    chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));

    return Buffer.concat(chunks);
}

async function telegramDownloadFileById(config, fileId) {
    const fileInfo = await telegramJsonRequest(config, "getFile", { file_id: fileId });
    if (!fileInfo || !fileInfo.file_path) {
        throw new Error("Telegram getFile did not return a file_path");
    }

    return httpRequestBuffer(`https://api.telegram.org/file/bot${config.botToken}/${fileInfo.file_path}`, {
        method: "GET"
    });
}

function httpRequestBuffer(url, options, bodyBuffer) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, options, (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            response.on("end", () => {
                const statusCode = response.statusCode || 0;
                const payload = Buffer.concat(chunks);
                if (statusCode >= 200 && statusCode < 300) {
                    resolve(payload);
                    return;
                }
                reject(new Error(`HTTP ${statusCode}: ${payload.toString("utf8").slice(0, 240)}`));
            });
        });

        request.on("error", reject);
        if (bodyBuffer && bodyBuffer.length > 0) {
            request.write(bodyBuffer);
        }
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

    const summary = firstOption(options.summary, "Codex oturumu başladı");
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

function ensureBackupReady(config) {
    ensureTelegramReady(config);
    if (!config.backupEnabled) {
        throw new Error("Telegram backup flow is disabled.");
    }
}

async function runArchiveBackup(options, config) {
    const filePath = firstOption(options.file);
    if (!filePath) {
        throw new Error("archive-backup requires --file");
    }

    if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filePath}`);
    }

    ensureBackupReady(config);

    const absolutePath = path.resolve(filePath);
    const plaintext = fs.readFileSync(absolutePath);
    const backupId = `${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${hashValue(plaintext)}`;
    const sha256 = crypto.createHash("sha256").update(plaintext).digest("hex");

    if (options["dry-run"]) {
        console.log(`[telegram-progress] would archive plaintext backup ${backupId} from ${absolutePath}`);
        return;
    }

    const result = await sendTelegramDocument(config, {
        filename: path.basename(absolutePath),
        contentType: "application/octet-stream",
        data: plaintext,
        caption: `${config.projectName} env yedeği\nYedek ID: ${backupId}`
    });

    const document = result && result.document ? result.document : null;
    if (!document || !document.file_id) {
        throw new Error("Telegram sendDocument succeeded but did not return a document file_id.");
    }

    const controlState = loadControlState();
    upsertBackupEntry(controlState, {
        backupId,
        createdAt: new Date().toISOString(),
        originalName: path.basename(absolutePath),
        fileId: document.file_id,
        fileUniqueId: document.file_unique_id || "",
        messageId: result.message_id || 0,
        sha256,
        format: "plain"
    });
    saveControlState(controlState);

    if (options["delete-plain"]) {
        safeUnlink(absolutePath);
    }

    console.log(`[telegram-progress] archived plaintext backup ${backupId}`);
}

function upsertBackupEntry(controlState, entry) {
    const current = Array.isArray(controlState.backups) ? controlState.backups : [];
    const filtered = current.filter((item) => item.backupId !== entry.backupId);
    filtered.unshift(entry);
    filtered.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    controlState.backups = filtered.slice(0, MAX_BACKUP_ENTRIES);
}

function selectBackupEntry(controlState, requestedBackupId) {
    const backups = Array.isArray(controlState.backups) ? controlState.backups : [];
    if (backups.length === 0) {
        return null;
    }
    if (!requestedBackupId) {
        return backups[0];
    }
    return backups.find((entry) => entry.backupId === requestedBackupId) || null;
}

async function runRestoreBackup(options, config) {
    ensureBackupReady(config);

    const controlState = loadControlState();
    const backup = selectBackupEntry(controlState, firstOption(options["backup-id"], ""));
    if (!backup) {
        throw new Error("No archived backup found.");
    }
    if (backup.format !== "plain") {
        throw new Error(`Backup ${backup.backupId} uses unsupported legacy format. Create a new plaintext backup first.`);
    }

    const downloaded = await telegramDownloadFileById(config, backup.fileId);
    const outputPath = resolveRestoreOutputPath(options, backup.backupId);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, downloaded);
    safeChmod(outputPath);
    console.log(outputPath);
}

function resolveRestoreOutputPath(options, backupId) {
    const explicit = firstOption(options.output);
    if (explicit) {
        return path.resolve(explicit);
    }

    return path.join(RESTORE_DIR, `${backupId}.env`);
}

function safeUnlink(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        // Ignore missing temp files.
    }
}

function safeChmod(filePath) {
    try {
        fs.chmodSync(filePath, 0o600);
    } catch (error) {
        // Ignore platforms that do not support chmod semantics.
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
        status === "fail" ? "Codex oturumu hata ile bitti" : "Codex oturumu tamamlandı"
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
                summary: "Çalışma alanı değişiklikleri algılandı",
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
                summary: "Çalışma alanı değişiklikleri algılandı",
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
