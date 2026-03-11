import type { InventoryRecord, TransferSuggestion } from "../types/index.js";

export function buildTransferPlan(records: InventoryRecord[]): TransferSuggestion[] {
    const groups = new Map<string, InventoryRecord[]>();
    for (const record of records) {
        const key = `${record.sku}:${record.productName}`;
        const current = groups.get(key) ?? [];
        current.push(record);
        groups.set(key, current);
    }

    const suggestions: TransferSuggestion[] = [];

    for (const groupRecords of groups.values()) {
        const surplus = groupRecords
            .map((record) => ({
                ...record,
                available: Math.max(record.onHand - Math.round(record.reorderPoint * 1.2), 0)
            }))
            .filter((record) => record.available > 0)
            .sort((left, right) => right.available - left.available);

        const deficit = groupRecords
            .map((record) => ({
                ...record,
                needed: Math.max(record.reorderPoint - record.onHand, 0)
            }))
            .filter((record) => record.needed > 0)
            .sort((left, right) => right.needed - left.needed);

        for (const receiver of deficit) {
            let remainingNeed = receiver.needed;
            for (const donor of surplus) {
                if (donor.store === receiver.store || donor.available <= 0 || remainingNeed <= 0) {
                    continue;
                }

                const quantity = Math.min(donor.available, remainingNeed);
                donor.available -= quantity;
                remainingNeed -= quantity;

                suggestions.push({
                    sku: receiver.sku,
                    productName: receiver.productName,
                    fromStore: donor.store,
                    toStore: receiver.store,
                    quantity,
                    unitPrice: receiver.unitPrice,
                    estimatedValue: quantity * receiver.unitPrice
                });
            }
        }
    }

    return suggestions
        .sort((left, right) => right.estimatedValue - left.estimatedValue)
        .slice(0, 20);
}
