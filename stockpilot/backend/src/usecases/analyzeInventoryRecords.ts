import { analyzeInventory } from "../services/analyzer.js";
import type { AnalysisResult } from "../types/index.js";
import { ensureInventoryRecords } from "../utils/validators.js";

interface AnalyzeInventoryRecordsInput {
    records: unknown;
}

export function analyzeInventoryRecords({ records }: AnalyzeInventoryRecordsInput): AnalysisResult {
    return analyzeInventory(ensureInventoryRecords(records));
}
