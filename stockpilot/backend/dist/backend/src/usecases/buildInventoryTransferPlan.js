import { buildTransferPlan } from "../services/transfer.js";
import { ensureInventoryRecords } from "../utils/validators.js";
export function buildInventoryTransferPlan({ records }) {
    return buildTransferPlan(ensureInventoryRecords(records));
}
