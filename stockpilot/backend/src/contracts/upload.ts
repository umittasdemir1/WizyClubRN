import type { ParsedInventoryPayload, UploadWorkflowResult } from "../types/index.js";

export interface ParseInventoryUploadRequest {
    buffer: Buffer;
    fileName: string;
}

export type ParseInventoryUploadResponse = ParsedInventoryPayload;

export interface ProcessInventoryUploadRequest {
    buffer: Buffer;
    fileName: string;
}

export type ProcessInventoryUploadResponse = UploadWorkflowResult;
