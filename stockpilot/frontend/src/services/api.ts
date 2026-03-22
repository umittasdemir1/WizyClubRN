import axios, { type AxiosProgressEvent } from "axios";
import type {
    AcademiaTranscriptResult,
    AcademiaTranscriptionStatus,
} from "../types/academia";
import type { UploadWorkflowResult } from "../types/stock";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    timeout: 30000,
});

export async function uploadInventoryFile(
    file: File,
    onProgress?: (progress: number) => void
): Promise<UploadWorkflowResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<UploadWorkflowResult>("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress(event: AxiosProgressEvent) {
            if (!onProgress) return;
            if (!event.total) {
                onProgress(20);
                return;
            }
            const percent = Math.round((event.loaded * 68) / event.total);
            onProgress(Math.max(6, Math.min(68, percent)));
        },
    });

    return response.data;
}

export interface TranscribeAcademiaMediaOptions {
    requestId: string;
    onProgress?: (progress: number) => void;
}

export async function transcribeAcademiaMedia(
    file: File,
    options: TranscribeAcademiaMediaOptions
): Promise<AcademiaTranscriptResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<AcademiaTranscriptResult>("/academia/transcribe", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
            "X-Academia-Request-Id": options.requestId,
        },
        timeout: 600000,
        onUploadProgress(event: AxiosProgressEvent) {
            if (!options.onProgress) return;
            if (!event.total) {
                options.onProgress(18);
                return;
            }
            const percent = Math.round((event.loaded * 24) / event.total);
            options.onProgress(Math.max(6, Math.min(24, percent)));
        },
    });

    return response.data;
}

export async function getAcademiaTranscriptionStatus(
    requestId: string
): Promise<AcademiaTranscriptionStatus | null> {
    try {
        const response = await api.get<AcademiaTranscriptionStatus>(`/academia/status/${requestId}`, {
            timeout: 5000,
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}
