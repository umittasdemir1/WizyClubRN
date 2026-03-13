import { parseInventoryBuffer } from "../services/parser.js";
import type { ParseInventoryUploadRequest, ParseInventoryUploadResponse } from "../contracts/upload.js";

export function parseInventoryUpload({
    buffer,
    fileName
}: ParseInventoryUploadRequest): ParseInventoryUploadResponse {
    return parseInventoryBuffer(buffer, fileName);
}
