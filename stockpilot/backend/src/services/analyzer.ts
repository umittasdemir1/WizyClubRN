import type {
    AlertItem,
    AnalysisResult,
    AnalyzedInventoryRecord,
    CategoryBreakdownPoint,
    ForecastPoint,
    InventoryRecord,
    StockHealthPoint
} from "../types/index.js";

function computeStockStatus(record: InventoryRecord): "healthy" | "warning" | "critical" {
    if (record.onHand <= record.reorderPoint * 0.75) {
        return "critical";
    }

    if (record.onHand <= record.reorderPoint * 1.15) {
        return "warning";
    }

    return "healthy";
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
