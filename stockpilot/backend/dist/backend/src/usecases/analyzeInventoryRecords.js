import { analyzeInventory } from "../services/analyzer.js";
import { ensureInventoryRecords } from "../utils/validators.js";
export function analyzeInventoryRecords({ records }) {
    return analyzeInventory(ensureInventoryRecords(records));
}
