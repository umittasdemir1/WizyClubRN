import * as XLSX from "xlsx";
import type {
    AlertItem,
    AnalysisResult,
    AnalyzedInventoryRecord,
    CategoryBreakdownPoint,
    ForecastPoint,
    InventoryRecord,
    ParsedInventoryPayload,
    StockHealthPoint,
    TransferSuggestion
} from "../types/stock";

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

function computeStockStatus(record: InventoryRecord): "healthy" | "warning" | "critical" {
    if (record.onHand <= record.reorderPoint * 0.75) {
        return "critical";
    }

    if (record.onHand <= record.reorderPoint * 1.15) {
        return "warning";
    }

    return "healthy";
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

function assignAbcClasses(records: AnalyzedInventoryRecord[]): AnalyzedInventoryRecord[] {
    const ranked = [...records].sort((left, right) => right.revenueScore - left.revenueScore);
    const totalRevenue = ranked.reduce((sum, record) => sum + record.revenueScore, 0) || 1;
    let runningShare = 0;

    const lookup = new Map<string, "A" | "B" | "C">();
    for (const record of ranked) {
        runningShare += record.revenueScore / totalRevenue;
        const abcClass = runningShare <= 0.8 ? "A" : runningShare <= 0.95 ? "B" : "C";
        lookup.set(`${record.store}:${record.sku}`, abcClass);
    }

    return records.map((record) => ({
        ...record,
        abcClass: lookup.get(`${record.store}:${record.sku}`) ?? "C"
    }));
}

export function analyzeInventory(records: InventoryRecord[]): AnalysisResult {
    const enrichedBase = records.map((record) => {
        const stockValue = record.onHand * record.unitPrice;
        const revenueScore = record.dailySales * 30 * Math.max(record.unitPrice, 1);
        const coverageDays = record.dailySales > 0 ? record.onHand / record.dailySales : record.onHand;
        const reorderQuantity = Math.max(record.reorderPoint - record.onHand, 0);
        const suggestedPurchase = Math.max(record.reorderPoint * 1.25 - record.onHand, 0);

        return {
            ...record,
            stockValue,
            revenueScore,
            coverageDays,
            reorderQuantity,
            suggestedPurchase,
            abcClass: "C",
            stockStatus: computeStockStatus(record)
        } satisfies AnalyzedInventoryRecord;
    });

    const enriched = assignAbcClasses(enrichedBase);
    const distinctSkuCount = new Set(enriched.map((record) => record.sku)).size;
    const storeCount = new Set(enriched.map((record) => record.store)).size;

    const categoryTotals = new Map<string, CategoryBreakdownPoint>();
    const stockHealthCounts = new Map<StockHealthPoint["name"], number>([
        ["Healthy", 0],
        ["Warning", 0],
        ["Critical", 0]
    ]);

    for (const record of enriched) {
        const currentCategory = categoryTotals.get(record.category) ?? {
            name: record.category,
            value: 0,
            quantity: 0
        };
        currentCategory.value += record.stockValue;
        currentCategory.quantity += record.onHand;
        categoryTotals.set(record.category, currentCategory);

        if (record.stockStatus === "healthy") {
            stockHealthCounts.set("Healthy", (stockHealthCounts.get("Healthy") ?? 0) + 1);
        } else if (record.stockStatus === "warning") {
            stockHealthCounts.set("Warning", (stockHealthCounts.get("Warning") ?? 0) + 1);
        } else {
            stockHealthCounts.set("Critical", (stockHealthCounts.get("Critical") ?? 0) + 1);
        }
    }

    const forecast: ForecastPoint[] = Array.from({ length: 6 }, (_, index) => {
        const projectedDemand = enriched.reduce(
            (sum, record) => sum + record.dailySales * 7 * (1 + index * 0.05),
            0
        );
        const reorderTarget = enriched.reduce((sum, record) => sum + record.reorderPoint, 0);

        return {
            label: `Week ${index + 1}`,
            projectedDemand: Number(projectedDemand.toFixed(0)),
            reorderTarget: Number(reorderTarget.toFixed(0))
        };
    });

    const alerts: AlertItem[] = enriched
        .filter((record) => record.reorderQuantity > 0)
        .sort((left, right) => right.reorderQuantity - left.reorderQuantity)
        .slice(0, 8)
        .map((record) => ({
            sku: record.sku,
            productName: record.productName,
            store: record.store,
            shortage: record.reorderQuantity
        }));

    return {
        overview: {
            totalSkus: distinctSkuCount,
            totalStockValue: enriched.reduce((sum, record) => sum + record.stockValue, 0),
            lowStockItems: enriched.filter((record) => record.stockStatus === "critical").length,
            overstockItems: enriched.filter((record) => record.onHand > record.reorderPoint * 2)
                .length,
            stores: storeCount
        },
        records: enriched,
        categoryBreakdown: [...categoryTotals.values()].sort((left, right) => right.value - left.value),
        stockHealth: [
            { name: "Healthy", value: stockHealthCounts.get("Healthy") ?? 0, tone: "#1FA971" },
            { name: "Warning", value: stockHealthCounts.get("Warning") ?? 0, tone: "#F2B13F" },
            { name: "Critical", value: stockHealthCounts.get("Critical") ?? 0, tone: "#E45858" }
        ],
        forecast,
        alerts
    };
}

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

export function exportAnalysisWorkbook(records: AnalyzedInventoryRecord[]): void {
    const worksheet = XLSX.utils.json_to_sheet(
        records.map((record) => ({
            SKU: record.sku,
            Product: record.productName,
            Store: record.store,
            Category: record.category,
            "On Hand": record.onHand,
            "Unit Price": record.unitPrice,
            "Stock Value": record.stockValue,
            "ABC Class": record.abcClass,
            Status: record.stockStatus,
            "Reorder Point": record.reorderPoint,
            "Suggested Purchase": record.suggestedPurchase
        }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analysis");
    XLSX.writeFile(workbook, "stockpilot-analysis.xlsx");
}
