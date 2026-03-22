import { buildTransferPlan } from "../services/transfer.js";
import type { BuildInventoryTransferPlanRequest, BuildInventoryTransferPlanResponse } from "../contracts/transfer.js";
import { ensureInventoryRecords } from "../utils/validators.js";

export function buildInventoryTransferPlan({
    records
}: BuildInventoryTransferPlanRequest): BuildInventoryTransferPlanResponse {
    return buildTransferPlan(ensureInventoryRecords(records));
}
