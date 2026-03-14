import { analyzeInventory } from "../services/analyzer.js";
import { parseInventoryBuffer } from "../services/parser.js";
import { buildTransferPlan } from "../services/transfer.js";
export function processInventoryUpload({ buffer, fileName }) {
    const parsed = parseInventoryBuffer(buffer, fileName);
    const records = parsed.records;
    return {
        parsed: {
            fileName: parsed.fileName,
            columns: parsed.columns,
            rowCount: parsed.rowCount
        },
        analysis: analyzeInventory(records),
        transferPlan: buildTransferPlan(records),
        source: "api"
    };
}
