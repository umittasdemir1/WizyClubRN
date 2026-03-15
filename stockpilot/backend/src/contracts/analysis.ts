import type { LegacyAnalysisResult } from "../types/index.js";

export interface AnalyzeInventoryRecordsRequest {
    records: unknown;
}

export type AnalyzeInventoryRecordsResponse = LegacyAnalysisResult;
