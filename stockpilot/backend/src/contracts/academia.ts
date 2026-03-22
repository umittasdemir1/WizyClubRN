import type {
    AcademiaTranscriptResult,
    AcademiaTranscriptionStatus,
} from "../../../shared/academiaTypes.js";

export interface TranscribeAcademiaMediaRequest {
    filePath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    requestId?: string;
}

export type TranscribeAcademiaMediaResponse = AcademiaTranscriptResult;
export type GetAcademiaTranscriptionStatusResponse = AcademiaTranscriptionStatus;
