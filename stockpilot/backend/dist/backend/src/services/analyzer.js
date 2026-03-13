const MS_PER_DAY = 24 * 60 * 60 * 1000;
function parseDateValue(value) {
    if (!value) {
        return null;
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
        return null;
    }
    return new Date(timestamp);
}
function getDaysSince(value) {
    const date = parseDateValue(value);
    if (!date) {
        return null;
    }
    return Math.max(Math.floor((Date.now() - date.getTime()) / MS_PER_DAY), 0);
}
function getDaysBetween(startValue, endValue) {
    const start = parseDateValue(startValue);
    const end = parseDateValue(endValue);
    if (!start || !end) {
        return null;
    }
    return Math.max(Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY), 0);
}
function computeLifecycleStatus(record, netSalesQty, daysSinceLastSale) {
    if (record.inventory <= 0) {
        return "healthy";
    }
    const demandFloor = Math.max(netSalesQty, 1);
    if ((netSalesQty <= 0 && record.inventory > 0) ||
        (daysSinceLastSale !== null && daysSinceLastSale > 90) ||
        record.inventory >= demandFloor * 3) {
        return "stagnant";
    }
    if ((daysSinceLastSale !== null && daysSinceLastSale > 45) ||
        record.inventory >= demandFloor * 1.5) {
        return "slow";
    }
    return "healthy";
}
export function analyzeInventory(records) {
    const enriched = records.map((record) => {
        const netSalesQty = Math.max(record.salesQty - record.returnQty, 0);
        const returnRate = record.salesQty > 0 ? record.returnQty / record.salesQty : 0;
        const sellThroughBase = netSalesQty + record.inventory;
        const sellThroughRate = sellThroughBase > 0 ? netSalesQty / sellThroughBase : 0;
        const daysSinceLastSale = getDaysSince(record.lastSaleDate);
        const stockAgeDays = getDaysSince(record.firstStockEntryDate);
        const daysToFirstSale = getDaysBetween(record.firstStockEntryDate, record.firstSaleDate);
        const lifecycleStatus = computeLifecycleStatus(record, netSalesQty, daysSinceLastSale);
        return {
            ...record,
            netSalesQty,
            returnRate,
            sellThroughRate,
            daysSinceLastSale,
            stockAgeDays,
            daysToFirstSale,
            lifecycleStatus
        };
    });
    const totalProducts = new Set(enriched.map((record) => record.productCode)).size;
    const warehouses = new Set(enriched.map((record) => record.warehouseName)).size;
    const totalInventory = enriched.reduce((sum, record) => sum + record.inventory, 0);
    const totalNetSales = enriched.reduce((sum, record) => sum + record.netSalesQty, 0);
    const totalReturns = enriched.reduce((sum, record) => sum + record.returnQty, 0);
    const totalGrossSales = enriched.reduce((sum, record) => sum + record.salesQty, 0);
    const warehouseTotals = new Map();
    const lifecycleCounts = new Map([
        ["Healthy", 0],
        ["Slow Moving", 0],
        ["Stagnant", 0]
    ]);
    const planningByYear = new Map();
    for (const record of enriched) {
        const warehousePoint = warehouseTotals.get(record.warehouseName) ?? {
            name: record.warehouseName,
            value: 0,
            quantity: 0
        };
        warehousePoint.value += record.inventory;
        warehousePoint.quantity += record.netSalesQty;
        warehouseTotals.set(record.warehouseName, warehousePoint);
        if (record.lifecycleStatus === "healthy") {
            lifecycleCounts.set("Healthy", (lifecycleCounts.get("Healthy") ?? 0) + 1);
        }
        else if (record.lifecycleStatus === "slow") {
            lifecycleCounts.set("Slow Moving", (lifecycleCounts.get("Slow Moving") ?? 0) + 1);
        }
        else {
            lifecycleCounts.set("Stagnant", (lifecycleCounts.get("Stagnant") ?? 0) + 1);
        }
        const yearLabel = record.productionYear ? String(record.productionYear) : "Unknown";
        const planningPoint = planningByYear.get(yearLabel) ?? {
            label: yearLabel,
            inventory: 0,
            netSalesQty: 0
        };
        planningPoint.inventory += record.inventory;
        planningPoint.netSalesQty += record.netSalesQty;
        planningByYear.set(yearLabel, planningPoint);
    }
    const alerts = enriched
        .filter((record) => record.lifecycleStatus !== "healthy")
        .sort((left, right) => {
        if (left.lifecycleStatus !== right.lifecycleStatus) {
            return left.lifecycleStatus === "stagnant" ? -1 : 1;
        }
        return right.inventory - left.inventory;
    })
        .slice(0, 8)
        .map((record) => ({
        productCode: record.productCode,
        productName: record.productName,
        warehouseName: record.warehouseName,
        issue: record.lifecycleStatus === "stagnant" ? "No recent pull" : "Stock moving slowly",
        metric: record.daysSinceLastSale === null
            ? `${record.inventory} units in inventory`
            : `${record.daysSinceLastSale} days since last sale`
    }));
    const planning = [...planningByYear.values()].sort((left, right) => {
        if (left.label === "Unknown") {
            return 1;
        }
        if (right.label === "Unknown") {
            return -1;
        }
        return Number(left.label) - Number(right.label);
    });
    return {
        overview: {
            totalProducts,
            totalInventory,
            totalNetSales,
            totalReturns,
            warehouses,
            averageReturnRate: totalGrossSales > 0 ? totalReturns / totalGrossSales : 0,
            slowMovingItems: enriched.filter((record) => record.lifecycleStatus === "slow").length,
            stagnantItems: enriched.filter((record) => record.lifecycleStatus === "stagnant").length
        },
        records: enriched,
        warehouseBreakdown: [...warehouseTotals.values()].sort((left, right) => right.value - left.value),
        lifecycleBreakdown: [
            { name: "Healthy", value: lifecycleCounts.get("Healthy") ?? 0, tone: "#1FA971" },
            { name: "Slow Moving", value: lifecycleCounts.get("Slow Moving") ?? 0, tone: "#F2B13F" },
            { name: "Stagnant", value: lifecycleCounts.get("Stagnant") ?? 0, tone: "#E45858" }
        ],
        planning,
        alerts
    };
}
