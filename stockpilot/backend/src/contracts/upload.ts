import type { ParsedInventoryPayload } from "../types/index.js";

export interface ParseInventoryUploadRequest {
    buffer: Buffer;
    fileName: string;
}

export type ParseInventoryUploadResponse = ParsedInventoryPayload;
