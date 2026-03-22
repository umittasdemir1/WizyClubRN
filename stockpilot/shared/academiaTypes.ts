export type AcademiaMediaKind = "audio" | "video";

export interface AcademiaTranscriptWord {
    startSeconds: number;
    endSeconds: number;
    text: string;
}

export interface AcademiaTranscriptCue {
    startSeconds: number;
    endSeconds: number;
    text: string;
    words: AcademiaTranscriptWord[];
}

export interface AcademiaTranscriptResult {
    sourceName: string;
    mediaKind: AcademiaMediaKind;
    model: string;
    language: string | null;
    durationSeconds: number | null;
    text: string;
    vtt: string;
    cues: AcademiaTranscriptCue[];
}

export type AcademiaTranscriptionPhase =
    | "idle"
    | "uploading"
    | "upload_received"
    | "worker_started"
    | "model_loading"
    | "transcription_started"
    | "transcribing"
    | "completed"
    | "failed";

export interface AcademiaTranscriptionStatus {
    requestId: string;
    sourceName: string | null;
    phase: AcademiaTranscriptionPhase;
    progressPercent: number;
    message: string;
    errorCode: string | null;
    startedAt: string | null;
    updatedAt: string;
    completedAt: string | null;
}
