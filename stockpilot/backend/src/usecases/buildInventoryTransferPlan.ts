import { buildTransferPlan } from "../services/transfer.js";
import type { TransferSuggestion } from "../types/index.js";
import { ensureInventoryRecords } from "../utils/validators.js";

interface BuildInventoryTransferPlanInput {
    records: unknown;
}

export function buildInventoryTransferPlan({
    records
}: BuildInventoryTransferPlanInput): TransferSuggestion[] {
    return buildTransferPlan(ensureInventoryRecords(records));
}
