import { analyzeInventory } from "../services/analyzer.js";
import type { AnalyzeInventoryRecordsRequest, AnalyzeInventoryRecordsResponse } from "../contracts/analysis.js";
import { ensureInventoryRecords } from "../utils/validators.js";

export function analyzeInventoryRecords({
    records
}: AnalyzeInventoryRecordsRequest): AnalyzeInventoryRecordsResponse {
    return analyzeInventory(ensureInventoryRecords(records));
}
