import { parseLocaleNumber, resolveProductIdentity, toText } from "../../../shared/normalization.js";
import type { InventoryRecord } from "../types/index.js";

function isRecordLike(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function toNullableYear(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    const year = Math.trunc(parsed);
    return year >= 1900 && year <= 2100 ? year : null;
}

function toNullableDate(value: unknown): string | null {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    return null;
}

export function ensureInventoryRecords(value: unknown): InventoryRecord[] {
    if (!Array.isArray(value)) {
        throw new Error("`records` must be an array.");
    }

    return value.map((item, index) => {
        if (!isRecordLike(item)) {
            throw new Error(`Record at index ${index} must be an object.`);
        }

        const productIdentity = resolveProductIdentity(item.productCode, item.productName);

        if (!productIdentity) {
            throw new Error(`Record at index ${index} must include productCode or productName.`);
        }

        return {
            warehouseName: toText(item.warehouseName, "Main Warehouse"),
            productCode: productIdentity.productCode,
            productName: productIdentity.productName,
            color: toText(item.color, "Unknown"),
            size: toText(item.size, "Unknown"),
            gender: toText(item.gender, "Unspecified"),
            salesQty: Math.max(parseLocaleNumber(item.salesQty), 0),
            returnQty: Math.max(parseLocaleNumber(item.returnQty), 0),
            inventory: Math.max(parseLocaleNumber(item.inventory), 0),
            productionYear: toNullableYear(item.productionYear),
            lastSaleDate: toNullableDate(item.lastSaleDate),
            firstStockEntryDate: toNullableDate(item.firstStockEntryDate),
            firstSaleDate: toNullableDate(item.firstSaleDate)
        } satisfies InventoryRecord;
    });
}
