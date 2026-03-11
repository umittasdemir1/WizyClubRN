import * as XLSX from "xlsx";
import type { InventoryRecord, ParsedInventoryPayload } from "../types/index.js";

const HEADER_ALIASES = {
    sku: ["sku", "stok kodu", "stock code", "product code", "item code"],
    productName: ["product", "product name", "urun", "urun adi", "item"],
    category: ["category", "kategori", "group", "department"],
    store: ["store", "magaza", "branch", "location", "warehouse"],
    onHand: ["on hand", "stock", "stok", "quantity", "qty", "mevcut stok"],
    unitPrice: ["unit price", "price", "fiyat", "birim fiyat", "cost"],
    dailySales: ["daily sales", "avg daily sales", "gunluk satis", "sales"],
    leadTimeDays: ["lead time", "lead time days", "termin", "teslim suresi"],
    safetyStock: ["safety stock", "guvenlik stogu", "buffer"],
    reorderPoint: ["reorder point", "yeniden siparis noktasi", "min stock", "minimum stock"]
} satisfies Record<keyof InventoryRecord, string[]>;

function normalizeHeader(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

function findColumn(row: Record<string, unknown>, aliases: string[]): unknown {
    const keys = Object.keys(row);
    for (const key of keys) {
        const normalized = normalizeHeader(key);
        if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
            return row[key];
        }
    }

    return undefined;
}

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
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

function computeReorderPoint(
    dailySales: number,
    leadTimeDays: number,
    safetyStock: number,
    explicitReorderPoint: number
): number {
    if (explicitReorderPoint > 0) {
        return explicitReorderPoint;
    }

    return Math.max(Math.round(dailySales * leadTimeDays + safetyStock), safetyStock);
}

export function normalizeInventoryRows(
    rows: Record<string, unknown>[],
    fileName: string
): ParsedInventoryPayload {
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

    const records = rows
        .map((row, index) => {
            const sku = toText(findColumn(row, HEADER_ALIASES.sku), `SKU-${index + 1}`);
            const productName = toText(findColumn(row, HEADER_ALIASES.productName), sku);
            const category = toText(findColumn(row, HEADER_ALIASES.category), "Uncategorized");
            const store = toText(findColumn(row, HEADER_ALIASES.store), "Main Store");
            const onHand = toNumber(findColumn(row, HEADER_ALIASES.onHand));
            const unitPrice = toNumber(findColumn(row, HEADER_ALIASES.unitPrice));
            const dailySales = toNumber(findColumn(row, HEADER_ALIASES.dailySales), 1);
            const leadTimeDays = Math.max(
                toNumber(findColumn(row, HEADER_ALIASES.leadTimeDays), 7),
                1
            );
            const safetyStock = Math.max(
                toNumber(findColumn(row, HEADER_ALIASES.safetyStock), 2),
                0
            );
            const explicitReorderPoint = Math.max(
                toNumber(findColumn(row, HEADER_ALIASES.reorderPoint)),
                0
            );

            return {
                sku,
                productName,
                category,
                store,
                onHand,
                unitPrice,
                dailySales,
                leadTimeDays,
                safetyStock,
                reorderPoint: computeReorderPoint(
                    dailySales,
                    leadTimeDays,
                    safetyStock,
                    explicitReorderPoint
                )
            } satisfies InventoryRecord;
        })
        .filter((record) => record.productName || record.sku);

    return {
        fileName,
        columns,
        rowCount: records.length,
        records
    };
}

export function parseInventoryBuffer(buffer: Buffer, fileName: string): ParsedInventoryPayload {
    const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: false
    });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: ""
    });

    return normalizeInventoryRows(rows, fileName);
}
