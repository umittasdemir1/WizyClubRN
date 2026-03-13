import { parseInventoryBuffer } from "../services/parser.js";
import type { ParsedInventoryPayload } from "../types/index.js";

interface ParseInventoryUploadInput {
    buffer: Buffer;
    fileName: string;
}

export function parseInventoryUpload({ buffer, fileName }: ParseInventoryUploadInput): ParsedInventoryPayload {
    return parseInventoryBuffer(buffer, fileName);
}
