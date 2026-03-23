import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import type { AcademiaTranscriptResult } from "../../../shared/academiaTypes.js";
import {
    AcademiaTranscriptionError,
    MAX_ACADEMIA_UPLOAD_SIZE_BYTES,
    resolveAcademiaMediaKind,
} from "../services/academiaTranscription.js";
import {
    AcademiaTranslationError,
    translateAcademiaTranscript,
} from "../services/academiaTranslation.js";
import {
    getAcademiaJobStatus,
    upsertAcademiaJobStatus,
} from "../services/academiaJobStore.js";
import { transcribeAcademiaMedia } from "../usecases/transcribeAcademiaMedia.js";

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, os.tmpdir()),
        filename: (_req, file, cb) => {
            const extension = path.extname(file.originalname);
            cb(null, `stockpilot-academia-${Date.now()}${extension}`);
        },
    }),
    limits: { fileSize: MAX_ACADEMIA_UPLOAD_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (resolveAcademiaMediaKind(file.mimetype, file.originalname)) {
            cb(null, true);
            return;
        }

        cb(new AcademiaTranscriptionError(
            "UNSUPPORTED_MEDIA_TYPE",
            400,
            "Unsupported media type. Use MP4, MOV, WebM, MP3, M4A, WAV, OGG, or AAC."
        ));
    },
});

export const academiaRouter = Router();

function createAcademiaRequestId(): string {
    return `academia_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readIncomingAcademiaRequestId(req: Request): string | null {
    const headerValue = req.header("x-academia-request-id")?.trim();
    return headerValue ? headerValue : null;
}

function toMegabytes(sizeBytes: number): number {
    return Number((sizeBytes / (1024 * 1024)).toFixed(2));
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

function logAcademiaRouteEvent(
    level: "info" | "warn" | "error",
    event: string,
    details: Record<string, unknown>
): void {
    const detailText = Object.entries(details)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${formatLogValue(value)}`)
        .join(" ");
    const line = `[academia][route] ${event}${detailText ? ` ${detailText}` : ""}`;

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

function isTranscriptPayload(value: unknown): value is AcademiaTranscriptResult {
    if (!value || typeof value !== "object") {
        return false;
    }

    const payload = value as Record<string, unknown>;
    return typeof payload.text === "string" && Array.isArray(payload.cues);
}

academiaRouter.get("/status/:requestId", (req, res) => {
    const status = getAcademiaJobStatus(req.params.requestId);
    if (!status) {
        res.status(404).json({
            error: "STATUS_NOT_FOUND",
            message: "No transcription status was found for the provided request id.",
        });
        return;
    }

    res.json(status);
});

academiaRouter.use((req, res, next) => {
    const startedAt = Date.now();
    res.setTimeout(10 * 60_000, () => {
        const requestId = res.locals.academiaRequestId ?? null;
        if (requestId) {
            upsertAcademiaJobStatus({
                requestId,
                phase: "failed",
                progressPercent: 100,
                message: "Processing timed out after 10 minutes.",
                errorCode: "REQUEST_TIMEOUT",
                completedAt: new Date().toISOString(),
            });
        }

        logAcademiaRouteEvent("error", "transcribe_request_timeout", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            durationMs: Date.now() - startedAt,
        });

        if (!res.headersSent) {
            res.status(503).json({
                error: "REQUEST_TIMEOUT",
                message: "Academia transcription exceeded the 10 minute processing window.",
            });
        }
    });
    next();
});

academiaRouter.post("/transcribe", upload.single("file"), async (req, res, next) => {
    if (!req.file) {
        logAcademiaRouteEvent("warn", "transcribe_request_missing_file", {
            method: req.method,
            path: req.originalUrl,
        });
        res.status(400).json({ error: "VALIDATION_ERROR", message: "A media file is required." });
        return;
    }

    const requestId = readIncomingAcademiaRequestId(req) ?? createAcademiaRequestId();
    const startedAt = Date.now();
    res.locals.academiaRequestId = requestId;

    upsertAcademiaJobStatus({
        requestId,
        sourceName: req.file.originalname,
        phase: "upload_received",
        progressPercent: 28,
        message: "Upload received. Preparing local transcription worker.",
        startedAt: new Date().toISOString(),
    });

    logAcademiaRouteEvent("info", "transcribe_request_received", {
        requestId,
        sourceName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeMb: toMegabytes(req.file.size),
    });

    try {
        const payload = await transcribeAcademiaMedia({
            filePath: req.file.path,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            requestId,
        });

        upsertAcademiaJobStatus({
            requestId,
            sourceName: req.file.originalname,
            phase: "completed",
            progressPercent: 100,
            message: "Transcript ready.",
            completedAt: new Date().toISOString(),
        });

        logAcademiaRouteEvent("info", "transcribe_request_completed", {
            requestId,
            sourceName: req.file.originalname,
            durationMs: Date.now() - startedAt,
            model: payload.model,
            language: payload.language,
            cueCount: payload.cues.length,
        });

        res.json(payload);
    } catch (error) {
        if (error instanceof AcademiaTranscriptionError) {
            upsertAcademiaJobStatus({
                requestId,
                sourceName: req.file.originalname,
                phase: "failed",
                progressPercent: 100,
                message: error.message,
                errorCode: error.code,
                completedAt: new Date().toISOString(),
            });

            logAcademiaRouteEvent("error", "transcribe_request_failed", {
                requestId,
                sourceName: req.file.originalname,
                durationMs: Date.now() - startedAt,
                errorCode: error.code,
                statusCode: error.statusCode,
                message: error.message,
            });
            res.status(error.statusCode).json({ error: error.code, message: error.message });
            return;
        }
        next(error);
    } finally {
        const cleanupError = await fs.unlink(req.file.path).catch((error) => error);
        if (cleanupError) {
            logAcademiaRouteEvent("warn", "transcribe_upload_cleanup_failed", {
                requestId,
                sourceName: req.file.originalname,
                message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            });
        }
    }
});

academiaRouter.post("/translate", async (req, res, next) => {
    const startedAt = Date.now();
    res.setTimeout(10 * 60_000);

    const transcript = req.body?.transcript;
    const targetLanguage = typeof req.body?.targetLanguage === "string"
        ? req.body.targetLanguage.trim()
        : "";

    if (!isTranscriptPayload(transcript) || !targetLanguage) {
        logAcademiaRouteEvent("warn", "translate_request_invalid", {
            method: req.method,
            path: req.originalUrl,
            hasTranscript: isTranscriptPayload(transcript),
            targetLanguage,
        });
        res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Transcript payload and targetLanguage are required.",
        });
        return;
    }

    logAcademiaRouteEvent("info", "translate_request_received", {
        sourceName: transcript.sourceName,
        sourceLanguage: transcript.language,
        targetLanguage,
        cueCount: transcript.cues.length,
    });

    try {
        const translatedTranscript = await translateAcademiaTranscript(transcript, targetLanguage);
        logAcademiaRouteEvent("info", "translate_request_completed", {
            sourceName: transcript.sourceName,
            durationMs: Date.now() - startedAt,
            sourceLanguage: transcript.language,
            targetLanguage: translatedTranscript.language,
            cueCount: translatedTranscript.cues.length,
            model: translatedTranscript.model,
        });
        res.json(translatedTranscript);
    } catch (error) {
        if (error instanceof AcademiaTranslationError) {
            logAcademiaRouteEvent("error", "translate_request_failed", {
                sourceName: transcript.sourceName,
                durationMs: Date.now() - startedAt,
                sourceLanguage: transcript.language,
                targetLanguage,
                errorCode: error.code,
                statusCode: error.statusCode,
                message: error.message,
            });
            res.status(error.statusCode).json({ error: error.code, message: error.message });
            return;
        }
        next(error);
    }
});

academiaRouter.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        const requestId = res.locals.academiaRequestId ?? readIncomingAcademiaRequestId(req) ?? createAcademiaRequestId();
        upsertAcademiaJobStatus({
            requestId,
            phase: "failed",
            progressPercent: 100,
            message: "Uploaded media exceeds the 250 MB intake limit for S+Academia.",
            errorCode: "MEDIA_TOO_LARGE",
            completedAt: new Date().toISOString(),
        });
        logAcademiaRouteEvent("warn", "transcribe_request_rejected", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            errorCode: "MEDIA_TOO_LARGE",
        });
        res.status(400).json({
            error: "MEDIA_TOO_LARGE",
            message: "Uploaded media exceeds the 250 MB intake limit for S+Academia.",
        });
        return;
    }

    if (error instanceof AcademiaTranscriptionError || error instanceof AcademiaTranslationError) {
        const requestId = res.locals.academiaRequestId ?? readIncomingAcademiaRequestId(req) ?? createAcademiaRequestId();
        upsertAcademiaJobStatus({
            requestId,
            phase: "failed",
            progressPercent: 100,
            message: error.message,
            errorCode: error.code,
            completedAt: new Date().toISOString(),
        });
        logAcademiaRouteEvent("error", "transcribe_request_rejected", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            errorCode: error.code,
            statusCode: error.statusCode,
            message: error.message,
        });
        res.status(error.statusCode).json({ error: error.code, message: error.message });
        return;
    }

    next(error);
});
