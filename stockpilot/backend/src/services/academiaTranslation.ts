import { accessSync, constants, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { AcademiaTranscriptCue, AcademiaTranscriptResult } from "../../../shared/academiaTypes.js";
import { buildWebVttFromCues } from "./academiaTranscription.js";

const PYTHON_TRANSLATION_WORKER_RELATIVE_PATH = "python/translate_academia.py";
const SUPPORTED_TRANSLATION_MODELS: Record<string, string> = {
    "en:tr": "Helsinki-NLP/opus-tatoeba-en-tr",
};

interface TranslationWorkerInput {
    model: string;
    sourceLanguage: string;
    targetLanguage: string;
    texts: string[];
}

interface TranslationWorkerResponse {
    model?: string;
    translations?: string[];
}

interface TranslationWorkerErrorPayload {
    error?: {
        code?: string;
        message?: string;
    };
}

const LIKELY_MOJIBAKE_PATTERN = /[ÃÅÄÂâ]/;

export class AcademiaTranslationError extends Error {
    code: string;
    statusCode: number;

    constructor(code: string, statusCode: number, message: string) {
        super(message);
        this.name = "AcademiaTranslationError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

function normalizeLanguageTag(value: string | null | undefined): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    return normalized.split(/[-_]/)[0] ?? null;
}

function buildTranslationPairKey(sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}:${targetLanguage}`;
}

function fileExists(filePath: string): boolean {
    try {
        accessSync(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
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
        // Ignore missing or unreadable venv config.
    }

    return null;
}

function resolvePythonLibraryPath(): string | null {
    const configured = process.env.STOCKPILOT_PYTHON_LIBRARY_PATH?.trim();
    if (configured) {
        return configured;
    }

    const homeDirectory = process.env.HOME?.trim();
    if (!homeDirectory) {
        return null;
    }

    const nixProfileLibPath = path.join(homeDirectory, ".nix-profile", "lib");
    return fileExists(nixProfileLibPath) ? nixProfileLibPath : null;
}

function resolveModelCacheDir(): string {
    return process.env.STOCKPILOT_MODEL_CACHE_DIR?.trim() || path.join(os.tmpdir(), "stockpilot-model-cache");
}

function mergeLibraryPath(basePath: string | undefined, extraPath: string | null): string | undefined {
    if (!extraPath) {
        return basePath;
    }

    return basePath ? `${extraPath}:${basePath}` : extraPath;
}

function resolvePythonCommand(): string | null {
    const candidates = [
        process.env.STOCKPILOT_PYTHON_BIN?.trim(),
        path.resolve(process.cwd(), ".venv", "Scripts", "python.exe"),
        path.resolve(process.cwd(), ".venv/bin/python3"),
        path.resolve(process.cwd(), ".venv/bin/python"),
        resolvePythonFromVenvConfig(),
        process.env.HOME ? path.join(process.env.HOME, ".nix-profile", "bin", "python3") : null,
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

function resolveTranslationModel(sourceLanguage: string, targetLanguage: string): string | null {
    return SUPPORTED_TRANSLATION_MODELS[buildTranslationPairKey(sourceLanguage, targetLanguage)] ?? null;
}

function normalizeCueText(text: string): string {
    return text
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
}

function countLikelyMojibakeMarkers(text: string): number {
    return (text.match(/[ÃÅÄÂâ]/g) ?? []).length;
}

function repairLikelyMojibake(text: string): string {
    if (!LIKELY_MOJIBAKE_PATTERN.test(text)) {
        return text;
    }

    const repaired = Buffer.from(text, "latin1").toString("utf8");
    if (repaired.includes("\uFFFD")) {
        return text;
    }

    return countLikelyMojibakeMarkers(repaired) < countLikelyMojibakeMarkers(text)
        ? repaired
        : text;
}

function parseWorkerError(rawText: string): { code: string; message: string } {
    try {
        const payload = JSON.parse(rawText) as TranslationWorkerErrorPayload;
        if (payload.error?.message) {
            return {
                code: payload.error.code?.trim() || "PYTHON_TRANSLATION_FAILED",
                message: payload.error.message,
            };
        }
    } catch {
        // Fall back to raw worker output.
    }

    return {
        code: "PYTHON_TRANSLATION_FAILED",
        message: rawText.trim() || "Translation worker failed.",
    };
}

function statusCodeForWorkerError(code: string): number {
    switch (code) {
        case "PYTHON_RUNTIME_MISSING":
        case "PYTHON_TRANSLATION_WORKER_MISSING":
        case "PYTHON_TRANSLATION_DEPENDENCIES_MISSING":
            return 503;
        case "UNSUPPORTED_TRANSLATION_PAIR":
        case "INVALID_TRANSLATION_INPUT":
            return 400;
        default:
            return 502;
    }
}

export function canTranslateAcademiaTranscript(
    transcript: AcademiaTranscriptResult,
    targetLanguage: string
): boolean {
    const sourceLanguage = normalizeLanguageTag(transcript.language);
    const normalizedTargetLanguage = normalizeLanguageTag(targetLanguage);
    if (!sourceLanguage || !normalizedTargetLanguage) {
        return false;
    }

    return Boolean(resolveTranslationModel(sourceLanguage, normalizedTargetLanguage));
}

export function buildTranslatedTranscriptResult(input: {
    transcript: AcademiaTranscriptResult;
    targetLanguage: string;
    translatedCueTexts: string[];
    model: string;
}): AcademiaTranscriptResult {
    const normalizedTargetLanguage = normalizeLanguageTag(input.targetLanguage);
    if (!normalizedTargetLanguage) {
        throw new AcademiaTranslationError(
            "INVALID_TRANSLATION_INPUT",
            400,
            "Target language is required."
        );
    }

    if (input.transcript.cues.length !== input.translatedCueTexts.length) {
        throw new AcademiaTranslationError(
            "INVALID_TRANSLATION_INPUT",
            400,
            "Translated cue count does not match the source transcript."
        );
    }

    const cues: AcademiaTranscriptCue[] = input.transcript.cues.map((cue, index) => ({
        startSeconds: cue.startSeconds,
        endSeconds: cue.endSeconds,
        text: normalizeCueText(repairLikelyMojibake(input.translatedCueTexts[index] ?? "")),
        words: [],
    }));

    return {
        sourceName: input.transcript.sourceName,
        mediaKind: input.transcript.mediaKind,
        model: input.model,
        language: normalizedTargetLanguage,
        durationSeconds: input.transcript.durationSeconds,
        text: cues.map((cue) => cue.text).filter(Boolean).join(" ").trim(),
        vtt: buildWebVttFromCues(cues),
        cues,
    };
}

function resolveTranslationWorkerPath(): string {
    return path.resolve(process.cwd(), PYTHON_TRANSLATION_WORKER_RELATIVE_PATH);
}

async function runPythonTranslationWorker(
    input: TranslationWorkerInput
): Promise<TranslationWorkerResponse> {
    const pythonCommand = resolvePythonCommand();
    if (!pythonCommand) {
        throw new AcademiaTranslationError(
            "PYTHON_RUNTIME_MISSING",
            503,
            "Python runtime was not found. Create backend/.venv or set STOCKPILOT_PYTHON_BIN before using transcript translation."
        );
    }

    const workerPath = resolveTranslationWorkerPath();
    if (!fileExists(workerPath)) {
        throw new AcademiaTranslationError(
            "PYTHON_TRANSLATION_WORKER_MISSING",
            503,
            "The translation worker script is missing from backend/python/translate_academia.py."
        );
    }

    const tempInputPath = path.join(
        os.tmpdir(),
        `stockpilot-academia-translation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`
    );
    writeFileSync(tempInputPath, JSON.stringify(input), "utf8");

    try {
        const args = [workerPath, "--input", tempInputPath];

        return await new Promise<TranslationWorkerResponse>((resolve, reject) => {
            const child = spawn(pythonCommand, args, {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: "1",
                    HF_HOME: resolveModelCacheDir(),
                    TRANSFORMERS_CACHE: resolveModelCacheDir(),
                    XDG_CACHE_HOME: resolveModelCacheDir(),
                    LD_LIBRARY_PATH: mergeLibraryPath(
                        process.env.LD_LIBRARY_PATH,
                        resolvePythonLibraryPath()
                    ),
                },
                stdio: ["ignore", "pipe", "pipe"],
            });

            let stdout = "";
            let stderr = "";

            child.stdout.on("data", (chunk: Buffer | string) => {
                stdout += chunk.toString();
            });

            child.stderr.on("data", (chunk: Buffer | string) => {
                stderr += chunk.toString();
            });

            child.on("error", (error) => {
                reject(new AcademiaTranslationError(
                    "PYTHON_TRANSLATION_FAILED",
                    502,
                    error.message
                ));
            });

            child.on("close", (code) => {
                if (code !== 0) {
                    const workerError = parseWorkerError(stderr || stdout);
                    reject(new AcademiaTranslationError(
                        workerError.code,
                        statusCodeForWorkerError(workerError.code),
                        workerError.message
                    ));
                    return;
                }

                try {
                    resolve(JSON.parse(stdout) as TranslationWorkerResponse);
                } catch {
                    reject(new AcademiaTranslationError(
                        "PYTHON_TRANSLATION_INVALID_RESPONSE",
                        502,
                        "The translation worker returned invalid JSON."
                    ));
                }
            });
        });
    } finally {
        try {
            unlinkSync(tempInputPath);
        } catch {
            // Ignore cleanup failures.
        }
    }
}

export async function translateAcademiaTranscript(
    transcript: AcademiaTranscriptResult,
    targetLanguage: string
): Promise<AcademiaTranscriptResult> {
    const sourceLanguage = normalizeLanguageTag(transcript.language);
    const normalizedTargetLanguage = normalizeLanguageTag(targetLanguage);

    if (!sourceLanguage || !normalizedTargetLanguage) {
        throw new AcademiaTranslationError(
            "INVALID_TRANSLATION_INPUT",
            400,
            "Both source and target languages are required for translation."
        );
    }

    const model = resolveTranslationModel(sourceLanguage, normalizedTargetLanguage);
    if (!model) {
        throw new AcademiaTranslationError(
            "UNSUPPORTED_TRANSLATION_PAIR",
            400,
            `Translation from ${sourceLanguage} to ${normalizedTargetLanguage} is not supported yet.`
        );
    }

    const cueTexts = transcript.cues.map((cue) => normalizeCueText(cue.text));
    const workerResponse = await runPythonTranslationWorker({
        model,
        sourceLanguage,
        targetLanguage: normalizedTargetLanguage,
        texts: cueTexts,
    });

    const translatedCueTexts = Array.isArray(workerResponse.translations)
        ? workerResponse.translations.map((text) => (typeof text === "string" ? text : ""))
        : [];

    return buildTranslatedTranscriptResult({
        transcript,
        targetLanguage: normalizedTargetLanguage,
        translatedCueTexts,
        model: workerResponse.model?.trim() || model,
    });
}
