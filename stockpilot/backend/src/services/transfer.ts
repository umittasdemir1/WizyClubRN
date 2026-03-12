import type { InventoryRecord, TransferSuggestion } from "../types/index.js";

export function buildTransferPlan(records: InventoryRecord[]): TransferSuggestion[] {
    const groups = new Map<string, InventoryRecord[]>();

    for (const record of records) {
        const key = [
            record.productCode,
            record.productName,
            record.color,
            record.size,
            record.gender
        ].join(":");
        const current = groups.get(key) ?? [];
        current.push(record);
        groups.set(key, current);
    }

    const suggestions: TransferSuggestion[] = [];

    for (const groupRecords of groups.values()) {
        const surplus = groupRecords
            .map((record) => {
                const netSalesQty = Math.max(record.salesQty - record.returnQty, 0);
                const targetInventory = Math.max(Math.ceil(netSalesQty * 1.5), 1);

                return {
                    ...record,
                    available: Math.max(record.inventory - targetInventory, 0)
                };
            })
            .filter((record) => record.available > 0)
            .sort((left, right) => right.available - left.available);

        const deficit = groupRecords
            .map((record) => {
                const netSalesQty = Math.max(record.salesQty - record.returnQty, 0);
                const demandTarget = Math.max(Math.ceil(netSalesQty), 1);

                return {
                    ...record,
                    needed: Math.max(demandTarget - record.inventory, 0)
                };
            })
            .filter((record) => record.needed > 0)
            .sort((left, right) => right.needed - left.needed);

        for (const receiver of deficit) {
            let remainingNeed = receiver.needed;

            for (const donor of surplus) {
                if (
                    donor.warehouseName === receiver.warehouseName ||
                    donor.available <= 0 ||
                    remainingNeed <= 0
                ) {
                    continue;
                }

                const quantity = Math.min(donor.available, remainingNeed);
                donor.available -= quantity;
                remainingNeed -= quantity;

                suggestions.push({
                    productCode: receiver.productCode,
                    productName: receiver.productName,
                    color: receiver.color,
                    size: receiver.size,
                    gender: receiver.gender,
                    fromWarehouseName: donor.warehouseName,
                    toWarehouseName: receiver.warehouseName,
                    quantity,
                    demandGap: receiver.needed
                });
            }
        }
    }

    return suggestions
        .sort((left, right) => right.quantity - left.quantity)
        .slice(0, 20);
}
