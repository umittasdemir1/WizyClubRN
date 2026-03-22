import type { TransferSuggestion } from "../types/index.js";

export interface BuildInventoryTransferPlanRequest {
    records: unknown;
}

export type BuildInventoryTransferPlanResponse = TransferSuggestion[];
