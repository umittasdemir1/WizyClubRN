import type { InventoryRecord } from "../types/index.js";

function isRecordLike(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function ensureInventoryRecords(value: unknown): InventoryRecord[] {
    if (!Array.isArray(value)) {
        throw new Error("`records` must be an array.");
    }

    return value.map((item, index) => {
        if (!isRecordLike(item)) {
            throw new Error(`Record at index ${index} must be an object.`);
        }

        return {
            sku: String(item.sku ?? ""),
            productName: String(item.productName ?? item.sku ?? ""),
            category: String(item.category ?? "Uncategorized"),
            store: String(item.store ?? "Main Store"),
            onHand: Number(item.onHand ?? 0),
            unitPrice: Number(item.unitPrice ?? 0),
            dailySales: Number(item.dailySales ?? 0),
            leadTimeDays: Number(item.leadTimeDays ?? 0),
            safetyStock: Number(item.safetyStock ?? 0),
            reorderPoint: Number(item.reorderPoint ?? 0)
        } satisfies InventoryRecord;
    });
}
