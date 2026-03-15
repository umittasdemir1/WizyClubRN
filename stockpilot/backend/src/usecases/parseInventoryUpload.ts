import { parseFileBuffer } from "../services/parser.js";

export interface ParseInventoryUploadRequest {
    buffer: Buffer;
    fileName: string;
}

export function parseInventoryUpload({
    buffer,
    fileName
}: ParseInventoryUploadRequest) {
    return parseFileBuffer(buffer, fileName);
}
