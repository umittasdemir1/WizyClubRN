import type { UploadWorkflowResult } from "../types/index.js";

export interface ProcessInventoryUploadRequest {
    buffer: Buffer;
    fileName: string;
}

export type ProcessInventoryUploadResponse = UploadWorkflowResult;
