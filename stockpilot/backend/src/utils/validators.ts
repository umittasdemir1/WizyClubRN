import type { InventoryRecord } from "../types/index.js";

function isRecordLike(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function toText(value: unknown, fallback: string): string {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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

        return {
            warehouseName: toText(item.warehouseName, "Main Warehouse"),
            productCode: toText(item.productCode, ""),
            productName: toText(item.productName, toText(item.productCode, "")),
            color: toText(item.color, "Unknown"),
            size: toText(item.size, "Unknown"),
            gender: toText(item.gender, "Unspecified"),
            salesQty: Math.max(toNumber(item.salesQty), 0),
            returnQty: Math.max(toNumber(item.returnQty), 0),
            inventory: Math.max(toNumber(item.inventory), 0),
            productionYear: toNullableYear(item.productionYear),
            lastSaleDate: toNullableDate(item.lastSaleDate),
            firstStockEntryDate: toNullableDate(item.firstStockEntryDate),
            firstSaleDate: toNullableDate(item.firstSaleDate)
        } satisfies InventoryRecord;
    });
}
