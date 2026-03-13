import type { AnalysisResult } from "../types/index.js";

export interface AnalyzeInventoryRecordsRequest {
    records: unknown;
}

export type AnalyzeInventoryRecordsResponse = AnalysisResult;
