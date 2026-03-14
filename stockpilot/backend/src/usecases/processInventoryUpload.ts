import { analyzeInventory } from "../services/analyzer.js";
import { parseInventoryBuffer } from "../services/parser.js";
import { buildTransferPlan } from "../services/transfer.js";
import type { ProcessInventoryUploadRequest, ProcessInventoryUploadResponse } from "../contracts/upload.js";

export function processInventoryUpload({
    buffer,
    fileName
}: ProcessInventoryUploadRequest): ProcessInventoryUploadResponse {
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
