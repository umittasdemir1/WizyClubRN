import { accessSync, constants, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type {
    AcademiaMediaKind,
    AcademiaTranscriptCue,
    AcademiaTranscriptResult,
    AcademiaTranscriptWord,
    AcademiaTranscriptionPhase,
} from "../../../shared/academiaTypes.js";
import type { TranscribeAcademiaMediaRequest } from "../contracts/academia.js";
import { upsertAcademiaJobStatus } from "./academiaJobStore.js";

export const MAX_ACADEMIA_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;
const DEFAULT_FASTER_WHISPER_MODEL = "tiny";
const DEFAULT_FASTER_WHISPER_DEVICE = "cpu";
const DEFAULT_FASTER_WHISPER_COMPUTE_TYPE = "int8";
const DEFAULT_FASTER_WHISPER_BEAM_SIZE = 1;
const PYTHON_WORKER_RELATIVE_PATH = "python/transcribe_academia.py";
const WORKER_STATUS_PREFIX = "ACADEMIA_STATUS ";

const AUDIO_MIME_TYPES = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/m4a",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/webm",
    "audio/ogg",
    "audio/aac",
]);

const VIDEO_MIME_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
]);

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".mp4", ".wav", ".webm", ".ogg", ".aac"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv"]);

interface FasterWhisperWorkerWord {
    start?: number;
    end?: number;
    text?: string;
}

interface FasterWhisperWorkerSegment {
    start?: number;
    end?: number;
    text?: string;
    words?: FasterWhisperWorkerWord[];
}

interface FasterWhisperWorkerResponse {
    duration?: number;
    language?: string;
    model?: string;
    segments?: FasterWhisperWorkerSegment[];
    text?: string;
}

interface WorkerErrorPayload {
    error?: {
        code?: string;
        message?: string;
    };
}

interface WorkerStatusPayload {
    phase?: AcademiaTranscriptionPhase;
    progressPercent?: number;
    message?: string;
    sourceName?: string;
}

function formatLogValue(value: unknown): string {
    if (typeof value === "string") {
        return value.includes(" ") ? JSON.stringify(value) : value;
    }
    if (value === null || value === undefined) {
        return "-";
    }
    return String(value);
}

function logAcademiaServiceEvent(
    level: "info" | "warn" | "error",
    event: string,
    details: Record<string, unknown>
): void {
    const detailText = Object.entries(details)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${formatLogValue(value)}`)
        .join(" ");
    const line = `[academia][service] ${event}${detailText ? ` ${detailText}` : ""}`;

    if (level === "error") {
        console.error(line);
        return;
    }

    if (level === "warn") {
        console.warn(line);
        return;
    }

    console.info(line);
}

function summarizeWorkerOutput(value: string): string {
    return value.replace(/\s+/g, " ").trim().slice(0, 400);
}

function clampProgress(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
}

function emitAcademiaStatus(
    requestId: string | null,
    sourceName: string,
    phase: AcademiaTranscriptionPhase,
    progressPercent: number,
    message: string,
    errorCode?: string | null
): void {
    if (!requestId) return;

    upsertAcademiaJobStatus({
        requestId,
        sourceName,
        phase,
        progressPercent: clampProgress(progressPercent),
        message,
        errorCode,
        completedAt: phase === "completed" || phase === "failed" ? new Date().toISOString() : undefined,
    });
}

function handleWorkerStatusLine(
    rawLine: string,
    requestId: string | null,
    sourceName: string
): boolean {
    if (!rawLine.startsWith(WORKER_STATUS_PREFIX)) {
        return false;
    }

    const payloadText = rawLine.slice(WORKER_STATUS_PREFIX.length).trim();
    try {
        const payload = JSON.parse(payloadText) as WorkerStatusPayload;
        if (
            !payload ||
            typeof payload.phase !== "string" ||
            typeof payload.progressPercent !== "number" ||
            typeof payload.message !== "string"
        ) {
            return false;
        }

        const resolvedSourceName = payload.sourceName?.trim() || sourceName;
        emitAcademiaStatus(
            requestId,
            resolvedSourceName,
            payload.phase,
            payload.progressPercent,
            payload.message
        );
        logAcademiaServiceEvent("info", "worker_progress", {
            requestId,
            sourceName: resolvedSourceName,
            phase: payload.phase,
            progressPercent: clampProgress(payload.progressPercent),
            message: payload.message,
        });
        return true;
    } catch {
        return false;
    }
}

export class AcademiaTranscriptionError extends Error {
    code: string;
    statusCode: number;

    constructor(code: string, statusCode: number, message: string) {
        super(message);
        this.name = "AcademiaTranscriptionError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

function toLower(value: string): string {
    return value.trim().toLowerCase();
}

export function resolveAcademiaMediaKind(mimeType: string, fileName: string): AcademiaMediaKind | null {
    const normalizedMimeType = toLower(mimeType);
    if (AUDIO_MIME_TYPES.has(normalizedMimeType)) return "audio";
    if (VIDEO_MIME_TYPES.has(normalizedMimeType)) return "video";

    const extension = path.extname(fileName).toLowerCase();
    if (AUDIO_EXTENSIONS.has(extension)) return "audio";
    if (VIDEO_EXTENSIONS.has(extension)) return "video";

    return null;
}

export function formatVttTimestamp(totalSeconds: number): string {
    const clamped = Math.max(0, totalSeconds);
    const totalMilliseconds = Math.round(clamped * 1000);
    const hours = Math.floor(totalMilliseconds / 3_600_000);
    const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
    const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
    const milliseconds = totalMilliseconds % 1000;

    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":") + `.${String(milliseconds).padStart(3, "0")}`;
}

function normalizeCueText(text: string): string {
    return text
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
}

function normalizeWordText(text: string): string {
    return text.replace(/\r/g, "");
}

function normalizeTranscriptWords(
    words: FasterWhisperWorkerWord[] | undefined,
    cueStartSeconds: number,
    cueEndSeconds: number,
    cueText: string
): AcademiaTranscriptWord[] {
    const normalizedWords = Array.isArray(words)
        ? words
              .map((word) => {
                  const startSeconds = toFiniteNumber(word.start);
                  const endSeconds = toFiniteNumber(word.end);
                  const text = typeof word.text === "string" ? normalizeWordText(word.text) : "";
                  if (startSeconds === null || endSeconds === null || !text.trim()) {
                      return null;
                  }
                  const [safeStart, safeEnd] = sanitizeCueTimeline(startSeconds, endSeconds);
                  return { startSeconds: safeStart, endSeconds: safeEnd, text };
              })
              .filter((word): word is AcademiaTranscriptWord => word !== null)
        : [];

    if (normalizedWords.length > 0) {
        return normalizedWords;
    }

    return cueText
        ? [{ startSeconds: cueStartSeconds, endSeconds: cueEndSeconds, text: cueText }]
        : [];
}

export function buildWebVttFromCues(cues: AcademiaTranscriptCue[]): string {
    const lines = ["WEBVTT", ""];

    for (const cue of cues) {
        const text = normalizeCueText(cue.text);
        if (!text) continue;
        lines.push(`${formatVttTimestamp(cue.startSeconds)} --> ${formatVttTimestamp(cue.endSeconds)}`);
        lines.push(text);
        lines.push("");
    }

    return `${lines.join("\n").trimEnd()}\n`;
}

function toFiniteNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeCueTimeline(startSeconds: number, endSeconds: number): [number, number] {
    const safeStart = Math.max(0, startSeconds);
    const safeEnd = Math.max(safeStart + 0.01, endSeconds);
    return [safeStart, safeEnd];
}

function resolveConfiguredModel(): string {
    return process.env.FASTER_WHISPER_MODEL?.trim() || DEFAULT_FASTER_WHISPER_MODEL;
}

function resolveConfiguredDevice(): string {
    return process.env.FASTER_WHISPER_DEVICE?.trim() || DEFAULT_FASTER_WHISPER_DEVICE;
}

function resolveConfiguredComputeType(): string {
    return process.env.FASTER_WHISPER_COMPUTE_TYPE?.trim() || DEFAULT_FASTER_WHISPER_COMPUTE_TYPE;
}

function resolveConfiguredBeamSize(): number {
    const raw = process.env.FASTER_WHISPER_BEAM_SIZE?.trim();
    if (!raw) return DEFAULT_FASTER_WHISPER_BEAM_SIZE;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FASTER_WHISPER_BEAM_SIZE;
}

function resolvePythonLibraryPath(): string | null {
    const configured = process.env.STOCKPILOT_PYTHON_LIBRARY_PATH?.trim();
    if (configured) {
        return configured;
    }

    const homeDirectory = process.env.HOME?.trim();
    if (homeDirectory) {
        const nixProfileLibPath = path.join(homeDirectory, ".nix-profile", "lib");
        if (fileExists(nixProfileLibPath)) {
            return nixProfileLibPath;
        }
    }

    return null;
}

function resolveModelCacheDir(): string {
    return process.env.STOCKPILOT_MODEL_CACHE_DIR?.trim() || path.join(os.tmpdir(), "stockpilot-model-cache");
}

/**
 * Read the pyvenv.cfg written by `python -m venv` to extract the `executable`
 * field — the absolute path of the Python binary that created the venv.
 * On nix systems this is a permanent content-addressed store path and stays
 * valid even after `nix-profile` updates break the .venv/bin symlinks.
 */
function resolvePythonFromVenvConfig(): string | null {
    try {
        const cfgPath = path.resolve(process.cwd(), ".venv", "pyvenv.cfg");
        const cfg = readFileSync(cfgPath, "utf8");
        const match = cfg.match(/^executable\s*=\s*(.+)$/m);
        const executablePath = match?.[1]?.trim();
        if (executablePath && commandExists(executablePath)) {
            return executablePath;
        }
    } catch {
        // pyvenv.cfg missing or unreadable — not a fatal error.
    }
    return null;
}

function mergeLibraryPath(basePath: string | undefined, extraPath: string | null): string | undefined {
    if (!extraPath) {
        return basePath;
    }

    return basePath ? `${extraPath}:${basePath}` : extraPath;
}

export function normalizeTranscriptResult(input: {
    sourceName: string;
    mediaKind: AcademiaMediaKind;
    payload: FasterWhisperWorkerResponse;
}): AcademiaTranscriptResult {
    const rawText = typeof input.payload.text === "string" ? input.payload.text.trim() : "";
    const segmentCues = Array.isArray(input.payload.segments)
        ? input.payload.segments
              .map((segment) => {
                  const startSeconds = toFiniteNumber(segment.start);
                  const endSeconds = toFiniteNumber(segment.end);
                  const text = typeof segment.text === "string" ? normalizeCueText(segment.text) : "";
                  if (startSeconds === null || endSeconds === null || !text) {
                      return null;
                  }
                  const [safeStart, safeEnd] = sanitizeCueTimeline(startSeconds, endSeconds);
                  return {
                      startSeconds: safeStart,
                      endSeconds: safeEnd,
                      text,
                      words: normalizeTranscriptWords(segment.words, safeStart, safeEnd, text),
                  };
              })
              .filter((cue): cue is AcademiaTranscriptCue => cue !== null)
        : [];

    const durationSeconds =
        toFiniteNumber(input.payload.duration) ??
        segmentCues[segmentCues.length - 1]?.endSeconds ??
        (rawText ? 4 : null);

    const cues =
        segmentCues.length > 0
            ? segmentCues
            : rawText && durationSeconds !== null
              ? [{
                    startSeconds: 0,
                    endSeconds: Math.max(4, durationSeconds),
                    text: rawText,
                    words: [{
                        startSeconds: 0,
                        endSeconds: Math.max(4, durationSeconds),
                        text: rawText,
                    }],
                }]
              : [];

    return {
        sourceName: input.sourceName,
        mediaKind: input.mediaKind,
        model: input.payload.model?.trim() || resolveConfiguredModel(),
        language: typeof input.payload.language === "string" ? input.payload.language : null,
        durationSeconds,
        text: rawText,
        vtt: buildWebVttFromCues(cues),
        cues,
    };
}

function resolvePythonWorkerPath(): string {
    return path.resolve(process.cwd(), PYTHON_WORKER_RELATIVE_PATH);
}

function commandExists(command: string): boolean {
    if (!command) return false;

    if (path.isAbsolute(command)) {
        try {
            accessSync(command, constants.X_OK);
            return true;
        } catch {
            return false;
        }
    }

    const result = spawnSync(command, ["--version"], { stdio: "ignore" });
    return !result.error && result.status === 0;
}

function fileExists(filePath: string): boolean {
    try {
        accessSync(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function resolvePythonCommand(): string | null {
    const candidates = [
        // 1. Explicit override — highest priority, always wins.
        process.env.STOCKPILOT_PYTHON_BIN?.trim(),
        // 2. Venv bin paths — packages (faster-whisper etc.) are installed here.
        //    Must come before any raw system Python that lacks the packages.
        path.resolve(process.cwd(), ".venv", "Scripts", "python.exe"),
        path.resolve(process.cwd(), ".venv/bin/python3"),
        path.resolve(process.cwd(), ".venv/bin/python"),
        // 3. pyvenv.cfg executable — the raw nix-store Python that created the venv.
        //    Only reached when venv symlinks are broken (e.g. nix garbage-collect).
        //    Packages won't be found via this path, but it prevents a silent "not found".
        resolvePythonFromVenvConfig(),
        // 4. nix-profile (works after `nix-env -iA nixpkgs.python311`).
        process.env.HOME ? path.join(process.env.HOME, ".nix-profile", "bin", "python3") : null,
        // 5. System PATH — works on macOS, Windows, and standard Linux.
        "python3",
        "py",
        "python",
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
        if (commandExists(candidate)) {
            return candidate;
        }
    }

    return null;
}

function parseWorkerError(rawText: string): { code: string; message: string } {
    try {
        const payload = JSON.parse(rawText) as WorkerErrorPayload;
        if (payload.error?.message) {
            return {
                code: payload.error.code?.trim() || "PYTHON_WORKER_FAILED",
                message: payload.error.message,
            };
        }
    } catch {
        // Fall through to raw stderr/stdout text.
    }

    return {
        code: "PYTHON_WORKER_FAILED",
        message: rawText.trim() || "faster-whisper worker failed.",
    };
}

function statusCodeForWorkerError(code: string): number {
    switch (code) {
        case "PYTHON_RUNTIME_MISSING":
        case "PYTHON_WORKER_MISSING":
        case "PYTHON_DEPENDENCIES_MISSING":
            return 503;
        case "UNSUPPORTED_MEDIA_TYPE":
            return 400;
        default:
            return 502;
    }
}

async function runPythonWorker(
    request: TranscribeAcademiaMediaRequest,
    mediaKind: AcademiaMediaKind
): Promise<FasterWhisperWorkerResponse> {
    const requestId = request.requestId ?? null;
    const workerStartedAt = Date.now();
    const configuredModel = resolveConfiguredModel();
    const configuredDevice = resolveConfiguredDevice();
    const configuredComputeType = resolveConfiguredComputeType();
    const configuredBeamSize = resolveConfiguredBeamSize();
    const pythonCommand = resolvePythonCommand();
    if (!pythonCommand) {
        throw new AcademiaTranscriptionError(
            "PYTHON_RUNTIME_MISSING",
            503,
            "Python runtime was not found. Create backend/.venv or set STOCKPILOT_PYTHON_BIN before using S+Academia transcription."
        );
    }

    const workerPath = resolvePythonWorkerPath();
    if (!fileExists(workerPath)) {
        throw new AcademiaTranscriptionError(
            "PYTHON_WORKER_MISSING",
            503,
            "The faster-whisper worker script is missing from backend/python/transcribe_academia.py."
        );
    }

    emitAcademiaStatus(
        requestId,
        request.originalName,
        "worker_started",
        38,
        "Local transcription worker started."
    );
    logAcademiaServiceEvent("info", "python_worker_started", {
        requestId,
        sourceName: request.originalName,
        mediaKind,
        model: configuredModel,
        device: configuredDevice,
        computeType: configuredComputeType,
        beamSize: configuredBeamSize,
    });

    const args = [
        workerPath,
        "--file",
        request.filePath,
        "--name",
        request.originalName,
        "--kind",
        mediaKind,
    ];

    return new Promise<FasterWhisperWorkerResponse>((resolve, reject) => {
        const child = spawn(pythonCommand, args, {
            cwd: process.cwd(),
            env: {
                ...process.env,
                PYTHONUNBUFFERED: "1",
                HF_HOME: resolveModelCacheDir(),
                TRANSFORMERS_CACHE: resolveModelCacheDir(),
                XDG_CACHE_HOME: resolveModelCacheDir(),
                FASTER_WHISPER_MODEL: configuredModel,
                FASTER_WHISPER_DEVICE: configuredDevice,
                FASTER_WHISPER_COMPUTE_TYPE: configuredComputeType,
                FASTER_WHISPER_BEAM_SIZE: String(configuredBeamSize),
                LD_LIBRARY_PATH: mergeLibraryPath(
                    process.env.LD_LIBRARY_PATH,
                    resolvePythonLibraryPath()
                ),
            },
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderrBuffer = "";
        let stderrForError = "";

        child.stdout.on("data", (chunk: Buffer | string) => {
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk: Buffer | string) => {
            stderrBuffer += chunk.toString();

            let lineBreakIndex = stderrBuffer.indexOf("\n");
            while (lineBreakIndex !== -1) {
                const rawLine = stderrBuffer.slice(0, lineBreakIndex).trim();
                stderrBuffer = stderrBuffer.slice(lineBreakIndex + 1);
                if (rawLine && !handleWorkerStatusLine(rawLine, requestId, request.originalName)) {
                    stderrForError += `${rawLine}\n`;
                }
                lineBreakIndex = stderrBuffer.indexOf("\n");
            }
        });

        child.on("error", (error) => {
            emitAcademiaStatus(
                requestId,
                request.originalName,
                "failed",
                100,
                error.message,
                "PYTHON_WORKER_FAILED"
            );
            logAcademiaServiceEvent("error", "python_worker_spawn_failed", {
                requestId,
                sourceName: request.originalName,
                durationMs: Date.now() - workerStartedAt,
                message: error.message,
            });
            reject(new AcademiaTranscriptionError(
                "PYTHON_WORKER_FAILED",
                502,
                error.message
            ));
        });

        child.on("close", (code) => {
            const trailingLine = stderrBuffer.trim();
            if (trailingLine && !handleWorkerStatusLine(trailingLine, requestId, request.originalName)) {
                stderrForError += `${trailingLine}\n`;
            }

            if (code !== 0) {
                const workerError = parseWorkerError(stderrForError || stdout);
                emitAcademiaStatus(
                    requestId,
                    request.originalName,
                    "failed",
                    100,
                    workerError.message,
                    workerError.code
                );
                logAcademiaServiceEvent("error", "python_worker_failed", {
                    requestId,
                    sourceName: request.originalName,
                    durationMs: Date.now() - workerStartedAt,
                    exitCode: code,
                    errorCode: workerError.code,
                    message: workerError.message,
                    workerOutput: summarizeWorkerOutput(stderrForError || stdout),
                });
                reject(new AcademiaTranscriptionError(
                    workerError.code,
                    statusCodeForWorkerError(workerError.code),
                    workerError.message
                ));
                return;
            }

            try {
                const payload = JSON.parse(stdout) as FasterWhisperWorkerResponse;
                emitAcademiaStatus(
                    requestId,
                    request.originalName,
                    "completed",
                    100,
                    "Transcript ready."
                );
                logAcademiaServiceEvent("info", "python_worker_completed", {
                    requestId,
                    sourceName: request.originalName,
                    durationMs: Date.now() - workerStartedAt,
                    language: payload.language ?? null,
                    segmentCount: Array.isArray(payload.segments) ? payload.segments.length : 0,
                    transcriptCharacters: typeof payload.text === "string" ? payload.text.length : 0,
                });
                resolve(payload);
            } catch {
                emitAcademiaStatus(
                    requestId,
                    request.originalName,
                    "failed",
                    100,
                    "The faster-whisper worker returned invalid JSON.",
                    "PYTHON_WORKER_INVALID_RESPONSE"
                );
                logAcademiaServiceEvent("error", "python_worker_invalid_response", {
                    requestId,
                    sourceName: request.originalName,
                    durationMs: Date.now() - workerStartedAt,
                    workerOutput: summarizeWorkerOutput(stdout),
                });
                reject(new AcademiaTranscriptionError(
                    "PYTHON_WORKER_INVALID_RESPONSE",
                    502,
                    "The faster-whisper worker returned invalid JSON."
                ));
            }
        });
    });
}

export async function transcribeAcademiaMediaFile(
    request: TranscribeAcademiaMediaRequest
): Promise<AcademiaTranscriptResult> {
    const mediaKind = resolveAcademiaMediaKind(request.mimeType, request.originalName);
    if (!mediaKind) {
        throw new AcademiaTranscriptionError(
            "UNSUPPORTED_MEDIA_TYPE",
            400,
            "Unsupported media type. Use MP4, MOV, WebM, MP3, M4A, WAV, OGG, or AAC."
        );
    }

    const payload = await runPythonWorker(request, mediaKind);

    return normalizeTranscriptResult({
        sourceName: request.originalName,
        mediaKind,
        payload,
    });
}
