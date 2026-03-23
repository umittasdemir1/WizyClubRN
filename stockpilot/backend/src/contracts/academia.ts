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

export interface TranslateAcademiaTranscriptRequestBody {
    transcript: AcademiaTranscriptResult;
    targetLanguage: string;
}

export type TranscribeAcademiaMediaResponse = AcademiaTranscriptResult;
export type TranslateAcademiaTranscriptResponse = AcademiaTranscriptResult;
export type GetAcademiaTranscriptionStatusResponse = AcademiaTranscriptionStatus;
