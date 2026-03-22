import { parseFileBuffer } from "../services/parser.js";
import type { UploadWorkflowResult } from "../types/index.js";

export interface ProcessInventoryUploadRequest {
    buffer: Buffer;
    fileName: string;
}

export function processInventoryUpload({
    buffer,
    fileName
}: ProcessInventoryUploadRequest): UploadWorkflowResult {
    const { columns, rows, rowCount } = parseFileBuffer(buffer, fileName);

    return {
        parsed: { fileName, rowCount, columns },
        analysis: { fileName, columns, rows, rowCount },
        source: "api"
    };
}
