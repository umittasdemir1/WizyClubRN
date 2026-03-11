import axios from "axios";
import type {
    AnalysisResult,
    InventoryRecord,
    ParsedInventoryPayload,
    TransferSuggestion
} from "../types/stock";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    timeout: 30000
});

export async function uploadInventoryFile(file: File): Promise<ParsedInventoryPayload> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ParsedInventoryPayload>("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
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
