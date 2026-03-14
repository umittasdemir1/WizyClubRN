import axios, { type AxiosProgressEvent } from "axios";
import type {
    AnalysisResult,
    InventoryRecord,
    UploadWorkflowResult,
    TransferSuggestion
} from "../types/stock";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    timeout: 30000
});

export async function uploadInventoryFile(
    file: File,
    onProgress?: (progress: number) => void
): Promise<UploadWorkflowResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<UploadWorkflowResult>("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        },
        onUploadProgress(event: AxiosProgressEvent) {
            if (!onProgress) {
                return;
            }

            if (!event.total) {
                onProgress(20);
                return;
            }

            const percent = Math.round((event.loaded * 68) / event.total);
            onProgress(Math.max(6, Math.min(68, percent)));
        }
    });

    return response.data;
}

export async function analyzeInventoryApi(records: InventoryRecord[]): Promise<AnalysisResult> {
    const response = await api.post<AnalysisResult>("/analyze", {
        records
    });
    return response.data;
}

export async function getTransferPlanApi(
    records: InventoryRecord[]
): Promise<TransferSuggestion[]> {
    const response = await api.post<TransferSuggestion[]>("/transfer-plan", {
        records
    });
    return response.data;
}
