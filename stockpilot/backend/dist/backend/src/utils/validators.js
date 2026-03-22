import { parseLocaleNumber, resolveProductIdentity, toText } from "../../../shared/normalization.js";
function isRecordLike(value) {
    return typeof value === "object" && value !== null;
}
function toNullableYear(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    const year = Math.trunc(parsed);
    return year >= 1900 && year <= 2100 ? year : null;
}
function toNullableDate(value) {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }
    return null;
}
const MAX_RECORDS = 10_000;
export function ensureInventoryRecords(value) {
    if (!Array.isArray(value)) {
        throw new Error("`records` must be an array.");
    }
    if (value.length > MAX_RECORDS) {
        throw new Error(`Too many records: ${value.length} exceeds the maximum of ${MAX_RECORDS}.`);
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
        };
    });
}
