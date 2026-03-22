import type { AcademiaTranscriptionPhase, AcademiaTranscriptionStatus } from "../../../shared/academiaTypes.js";

const RETENTION_MS = 60 * 60_000;
const academiaJobs = new Map<string, AcademiaTranscriptionStatus>();

interface AcademiaJobStatusUpdate {
    requestId: string;
    sourceName?: string | null;
    phase: AcademiaTranscriptionPhase;
    progressPercent: number;
    message: string;
    errorCode?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
}

function clampProgress(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
}

function pruneExpiredStatuses(now = Date.now()): void {
    for (const [requestId, status] of academiaJobs.entries()) {
        const reference = status.completedAt ?? status.updatedAt;
        const ageMs = now - Date.parse(reference);
        if (Number.isNaN(ageMs) || ageMs > RETENTION_MS) {
            academiaJobs.delete(requestId);
        }
    }
}

export function upsertAcademiaJobStatus(update: AcademiaJobStatusUpdate): AcademiaTranscriptionStatus {
    pruneExpiredStatuses();

    const current = academiaJobs.get(update.requestId);
    const nextStatus: AcademiaTranscriptionStatus = {
        requestId: update.requestId,
        sourceName: update.sourceName ?? current?.sourceName ?? null,
        phase: update.phase,
        progressPercent: clampProgress(update.progressPercent),
        message: update.message,
        errorCode: update.errorCode ?? current?.errorCode ?? null,
        startedAt: update.startedAt ?? current?.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: update.completedAt ?? current?.completedAt ?? null,
    };

    academiaJobs.set(update.requestId, nextStatus);
    return nextStatus;
}

export function getAcademiaJobStatus(requestId: string): AcademiaTranscriptionStatus | null {
    pruneExpiredStatuses();
    return academiaJobs.get(requestId) ?? null;
}
