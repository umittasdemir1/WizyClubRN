import * as XLSX from "xlsx";
import { parseLocaleNumber, resolveProductIdentity, toText } from "../../../shared/normalization.js";
import type {
    AlertItem,
    AnalysisResult,
    AnalyzedInventoryRecord,
    InventoryRecord,
    LifecyclePoint,
    ParsedInventoryPayload,
    PlanningPoint,
    TransferSuggestion,
    WarehouseBreakdownPoint
} from "../types/stock";

const HEADER_ALIASES = {
    warehouseName: ["warehouse_name", "warehouse name", "depo adı", "depo adi"],
    productCode: ["product_code", "product code", "sku", "stock code", "ürün kodu", "urun kodu"],
    productName: ["product_name", "product name", "ürün adı", "urun adi", "ürün adi"],
    color: ["color", "renk açıklaması", "renk aciklamasi", "renk"],
    size: ["size", "beden"],
    gender: ["gender", "cinsiyet açıklama", "cinsiyet aciklama", "cinsiyet"],
    salesQty: ["sales_qty", "sales qty", "sales quantity", "satis", "satış", "satış miktar"],
    returnQty: ["return_qty", "return qty", "return quantity", "iade miktar", "iade miktari", "iade"],
    inventory: ["inventory", "stock", "on hand", "envanter"],
    productionYear: ["production_year", "production year", "yıl açıklama", "yil aciklama", "yıl", "yil"],
    lastSaleDate: ["last_sale_date", "last sale date", "son satış tarihi", "son satis tarihi"],
    firstStockEntryDate: [
        "first_stock_entry_date",
        "first stock entry date",
        "ilk alış tarihi",
        "ilk alis tarihi",
        "first buy date"
    ],
    firstSaleDate: ["first_sale_date", "first sale date", "ilk satış tarihi", "ilk satis tarihi"]
} satisfies Record<keyof InventoryRecord, string[]>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeHeader(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[ıİ]/g, "i")
        .replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u")
        .replace(/[şŞ]/g, "s")
        .replace(/[öÖ]/g, "o")
        .replace(/[çÇ]/g, "c")
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

function buildIsoDate(year: number, month: number, day: number): string | null {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}

function toIsoDate(value: unknown): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
            return buildIsoDate(parsed.y, parsed.m, parsed.d);
        }
    }

    if (typeof value !== "string") {
        return null;
    }

    const text = value.trim();
    if (!text) {
        return null;
    }

    const isoMatch = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (isoMatch) {
        return buildIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }

    const localeMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (localeMatch) {
        const year = localeMatch[3].length === 2 ? Number(`20${localeMatch[3]}`) : Number(localeMatch[3]);
        return buildIsoDate(year, Number(localeMatch[2]), Number(localeMatch[1]));
    }

    const timestamp = Date.parse(text);
    if (Number.isFinite(timestamp)) {
        return new Date(timestamp).toISOString().slice(0, 10);
    }

    return null;
}

function toYear(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        const year = Math.trunc(value);
        return year >= 1900 && year <= 2100 ? year : null;
    }

    if (typeof value !== "string") {
        return null;
    }

    const text = value.trim();
    if (!text) {
        return null;
    }

    const match = text.match(/\b(19|20)\d{2}\b/);
    if (!match) {
        return null;
    }

    return Number(match[0]);
}

function parseDateValue(value: string | null): Date | null {
    if (!value) {
        return null;
    }

    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
        return null;
    }

    return new Date(timestamp);
}

function getDaysSince(value: string | null): number | null {
    const date = parseDateValue(value);
    if (!date) {
        return null;
    }

    return Math.max(Math.floor((Date.now() - date.getTime()) / MS_PER_DAY), 0);
}

function getDaysBetween(startValue: string | null, endValue: string | null): number | null {
    const start = parseDateValue(startValue);
    const end = parseDateValue(endValue);
    if (!start || !end) {
        return null;
    }

    return Math.max(Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY), 0);
}

function computeLifecycleStatus(
    record: InventoryRecord,
    netSalesQty: number,
    daysSinceLastSale: number | null
): "healthy" | "slow" | "stagnant" {
    if (record.inventory <= 0) {
        return "healthy";
    }

    const demandFloor = Math.max(netSalesQty, 1);

    if (
        (netSalesQty <= 0 && record.inventory > 0) ||
        (daysSinceLastSale !== null && daysSinceLastSale > 90) ||
        record.inventory >= demandFloor * 3
    ) {
        return "stagnant";
    }

    if (
        (daysSinceLastSale !== null && daysSinceLastSale > 45) ||
        record.inventory >= demandFloor * 1.5
    ) {
        return "slow";
    }

    return "healthy";
}

export function normalizeInventoryRows(
    rows: Record<string, unknown>[],
    fileName: string
): ParsedInventoryPayload {
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

    const records = rows
        .map((row) => {
            const productIdentity = resolveProductIdentity(
                findColumn(row, HEADER_ALIASES.productCode),
                findColumn(row, HEADER_ALIASES.productName)
            );

            if (!productIdentity) {
                return null;
            }

            return {
                warehouseName: toText(findColumn(row, HEADER_ALIASES.warehouseName), "Main Warehouse"),
                productCode: productIdentity.productCode,
                productName: productIdentity.productName,
                color: toText(findColumn(row, HEADER_ALIASES.color), "Unknown"),
                size: toText(findColumn(row, HEADER_ALIASES.size), "Unknown"),
                gender: toText(findColumn(row, HEADER_ALIASES.gender), "Unspecified"),
                salesQty: Math.max(parseLocaleNumber(findColumn(row, HEADER_ALIASES.salesQty)), 0),
                returnQty: Math.max(parseLocaleNumber(findColumn(row, HEADER_ALIASES.returnQty)), 0),
                inventory: Math.max(parseLocaleNumber(findColumn(row, HEADER_ALIASES.inventory)), 0),
                productionYear: toYear(findColumn(row, HEADER_ALIASES.productionYear)),
                lastSaleDate: toIsoDate(findColumn(row, HEADER_ALIASES.lastSaleDate)),
                firstStockEntryDate: toIsoDate(findColumn(row, HEADER_ALIASES.firstStockEntryDate)),
                firstSaleDate: toIsoDate(findColumn(row, HEADER_ALIASES.firstSaleDate))
            } satisfies InventoryRecord;
        })
        .filter((record): record is InventoryRecord => record !== null);

    return {
        fileName,
        columns,
        rowCount: records.length,
        records
    };
}

export function analyzeInventory(records: InventoryRecord[]): AnalysisResult {
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
        } satisfies AnalyzedInventoryRecord;
    });

    const totalProducts = new Set(enriched.map((record) => record.productCode)).size;
    const warehouses = new Set(enriched.map((record) => record.warehouseName)).size;
    const totalInventory = enriched.reduce((sum, record) => sum + record.inventory, 0);
    const totalNetSales = enriched.reduce((sum, record) => sum + record.netSalesQty, 0);
    const totalReturns = enriched.reduce((sum, record) => sum + record.returnQty, 0);
    const totalGrossSales = enriched.reduce((sum, record) => sum + record.salesQty, 0);

    const warehouseTotals = new Map<string, WarehouseBreakdownPoint>();
    const lifecycleCounts = new Map<LifecyclePoint["name"], number>([
        ["Healthy", 0],
        ["Slow Moving", 0],
        ["Stagnant", 0]
    ]);
    const planningByYear = new Map<string, PlanningPoint>();

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
        } else if (record.lifecycleStatus === "slow") {
            lifecycleCounts.set("Slow Moving", (lifecycleCounts.get("Slow Moving") ?? 0) + 1);
        } else {
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

    const alerts: AlertItem[] = enriched
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
            metric:
                record.daysSinceLastSale === null
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

export function exportAnalysisWorkbook(records: AnalyzedInventoryRecord[]): void {
    const worksheet = XLSX.utils.json_to_sheet(
        records.map((record) => ({
            "Warehouse Name": record.warehouseName,
            "Product Code": record.productCode,
            "Product Name": record.productName,
            Color: record.color,
            Size: record.size,
            Gender: record.gender,
            "Sales Qty": record.salesQty,
            "Return Qty": record.returnQty,
            Inventory: record.inventory,
            "Net Sales Qty": record.netSalesQty,
            "Sell Through Rate": record.sellThroughRate,
            "Return Rate": record.returnRate,
            "Production Year": record.productionYear ?? "",
            "Last Sale Date": record.lastSaleDate ?? "",
            "First Stock Entry Date": record.firstStockEntryDate ?? "",
            "First Sale Date": record.firstSaleDate ?? "",
            "Days Since Last Sale": record.daysSinceLastSale ?? "",
            "Stock Age Days": record.stockAgeDays ?? "",
            "Days To First Sale": record.daysToFirstSale ?? "",
            "Lifecycle Status": record.lifecycleStatus
        }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analysis");
    XLSX.writeFile(workbook, "stockpilot-analysis.xlsx");
}
