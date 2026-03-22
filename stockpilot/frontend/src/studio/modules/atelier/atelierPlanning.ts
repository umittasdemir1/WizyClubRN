import type { AnalysisResult, GenericRow } from "../../../types/stock";
import { toIsoDate } from "../../../utils/analysis";
import {
    parseLocaleNumber,
    resolveProductIdentity,
    toText
} from "../../../../../shared/normalization.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STAGNANT_DAYS = 90;
const SLOW_DAYS = 45;
const STAGNANT_MULTIPLIER = 3;
const SLOW_MULTIPLIER = 1.5;
const SURPLUS_BUFFER_MULTIPLIER = 1.5;

const FIELD_ALIASES = {
    warehouseName: ["warehouse_name", "warehouseName", "warehouse", "warehouse name", "location"],
    productCode: ["product_code", "productCode", "sku", "sku_code", "style_code", "style code"],
    productName: ["product_name", "productName", "name", "product", "style_name", "style name"],
    color: ["color", "colour"],
    size: ["size"],
    gender: ["gender", "segment"],
    salesQty: ["sales_qty", "salesQty", "sales", "net_sales", "sales quantity"],
    returnQty: ["return_qty", "returnQty", "returns", "return quantity"],
    inventory: ["inventory", "stock_qty", "on_hand", "on hand", "inventory_qty"],
    productionYear: ["production_year", "productionYear", "season_year", "year"],
    lastSaleDate: ["last_sale_date", "lastSaleDate", "last_sale", "last sale date"],
    firstStockEntryDate: ["first_stock_entry_date", "firstStockEntryDate", "first_stock_date", "first stock entry date"],
    firstSaleDate: ["first_sale_date", "firstSaleDate", "first_sale", "first sale date"],
} as const;

type LifecycleStatus = "healthy" | "slow" | "stagnant";
export type AtelierAction = "rebalance" | "replenish" | "liquidate" | "review" | "watch";
export type AtelierScopeMode = "general" | "specific";
export type AtelierViewMode = "all" | "rebalance" | "replenish" | "liquidate" | "review";

interface AtelierInventoryRecord {
    warehouseName: string;
    productCode: string;
    productName: string;
    color: string;
    size: string;
    gender: string;
    salesQty: number;
    returnQty: number;
    inventory: number;
    productionYear: number | null;
    lastSaleDate: string | null;
    firstStockEntryDate: string | null;
    firstSaleDate: string | null;
    netSalesQty: number;
    returnRate: number;
    sellThroughRate: number;
    daysSinceLastSale: number | null;
    stockAgeDays: number | null;
    daysToFirstSale: number | null;
    lifecycleStatus: LifecycleStatus;
}

interface AtelierTransferSuggestion {
    productCode: string;
    productName: string;
    color: string;
    size: string;
    gender: string;
    fromWarehouseName: string;
    toWarehouseName: string;
    quantity: number;
}

export interface AtelierPlannerRules {
    scopeMode: AtelierScopeMode;
    selectedWarehouse: string | null;
    excludedWarehouses: string[];
    minSalesQty: number | null;
    minInventory: number | null;
    maxInventory: number | null;
    searchTerm: string;
    viewMode: AtelierViewMode;
}

export interface AtelierPlanRow {
    id: string;
    productCode: string;
    productName: string;
    variantLabel: string;
    action: AtelierAction;
    actionLabel: string;
    actionReason: string;
    scopeLabel: string;
    routeLabel: string;
    inventory: number;
    netSalesQty: number;
    transferUnits: number;
    demandGapUnits: number;
    surplusUnits: number;
    stagnantUnits: number;
    warehouseCount: number;
    priorityScore: number;
}

export interface AtelierPlanSnapshot {
    warehouses: string[];
    rows: AtelierPlanRow[];
    counts: Record<AtelierViewMode, number>;
    dataset: {
        usableRows: number;
        discardedRows: number;
    };
    dataQuality: {
        missingCoreFields: string[];
        missingLifecycleFields: string[];
    };
}

function normalizeFieldKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildRowLookup(row: GenericRow) {
    return new Map(
        Object.entries(row).map(([key, value]) => [normalizeFieldKey(key), value] as const)
    );
}

function toNullableYear(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const year = Math.trunc(parsed);
    return year >= 1900 && year <= 2100 ? year : null;
}

function toNullableDate(value: unknown): string | null {
    const iso = toIsoDate(value);
    if (iso) return iso;
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDateValue(value: string | null): Date | null {
    if (!value) return null;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp);
}

function getDaysSince(value: string | null): number | null {
    const date = parseDateValue(value);
    if (!date) return null;
    return Math.max(Math.floor((Date.now() - date.getTime()) / MS_PER_DAY), 0);
}

function getDaysBetween(startValue: string | null, endValue: string | null): number | null {
    const start = parseDateValue(startValue);
    const end = parseDateValue(endValue);
    if (!start || !end) return null;
    return Math.max(Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY), 0);
}

function computeLifecycleStatus(
    record: Pick<AtelierInventoryRecord, "inventory">,
    netSalesQty: number,
    daysSinceLastSale: number | null
): LifecycleStatus {
    if (record.inventory <= 0) return "healthy";

    const demandFloor = Math.max(netSalesQty, 1);

    if (
        (netSalesQty <= 0 && record.inventory > 0) ||
        (daysSinceLastSale !== null && daysSinceLastSale > STAGNANT_DAYS) ||
        record.inventory >= demandFloor * STAGNANT_MULTIPLIER
    ) {
        return "stagnant";
    }

    if (
        (daysSinceLastSale !== null && daysSinceLastSale > SLOW_DAYS) ||
        record.inventory >= demandFloor * SLOW_MULTIPLIER
    ) {
        return "slow";
    }

    return "healthy";
}

function buildVariantKey(record: Pick<AtelierInventoryRecord, "productCode" | "productName" | "color" | "size" | "gender">) {
    return [
        record.productCode,
        record.productName,
        record.color,
        record.size,
        record.gender,
    ].join("::");
}

function buildVariantLabel(record: Pick<AtelierInventoryRecord, "color" | "size" | "gender">) {
    return [record.color, record.size, record.gender]
        .filter((part) => part && part !== "Unknown" && part !== "Unspecified")
        .join(" / ") || "Core variant";
}

function toInventoryRecord(row: GenericRow): AtelierInventoryRecord | null {
    const lookup = buildRowLookup(row);
    const pick = (aliases: readonly string[]) => {
        for (const alias of aliases) {
            const value = lookup.get(normalizeFieldKey(alias));
            if (value !== undefined && value !== null && value !== "") {
                return value;
            }
        }
        return null;
    };

    const productIdentity = resolveProductIdentity(
        pick(FIELD_ALIASES.productCode),
        pick(FIELD_ALIASES.productName)
    );

    if (!productIdentity) {
        return null;
    }

    const baseRecord = {
        warehouseName: toText(pick(FIELD_ALIASES.warehouseName), "Main Warehouse"),
        productCode: productIdentity.productCode,
        productName: productIdentity.productName,
        color: toText(pick(FIELD_ALIASES.color), "Unknown"),
        size: toText(pick(FIELD_ALIASES.size), "Unknown"),
        gender: toText(pick(FIELD_ALIASES.gender), "Unspecified"),
        salesQty: Math.max(parseLocaleNumber(pick(FIELD_ALIASES.salesQty)), 0),
        returnQty: Math.max(parseLocaleNumber(pick(FIELD_ALIASES.returnQty)), 0),
        inventory: Math.max(parseLocaleNumber(pick(FIELD_ALIASES.inventory)), 0),
        productionYear: toNullableYear(pick(FIELD_ALIASES.productionYear)),
        lastSaleDate: toNullableDate(pick(FIELD_ALIASES.lastSaleDate)),
        firstStockEntryDate: toNullableDate(pick(FIELD_ALIASES.firstStockEntryDate)),
        firstSaleDate: toNullableDate(pick(FIELD_ALIASES.firstSaleDate)),
    };

    const netSalesQty = Math.max(baseRecord.salesQty - baseRecord.returnQty, 0);
    const returnRate = baseRecord.salesQty > 0 ? baseRecord.returnQty / baseRecord.salesQty : 0;
    const sellThroughBase = netSalesQty + baseRecord.inventory;
    const sellThroughRate = sellThroughBase > 0 ? netSalesQty / sellThroughBase : 0;
    const daysSinceLastSale = getDaysSince(baseRecord.lastSaleDate);
    const stockAgeDays = getDaysSince(baseRecord.firstStockEntryDate);
    const daysToFirstSale = getDaysBetween(baseRecord.firstStockEntryDate, baseRecord.firstSaleDate);

    return {
        ...baseRecord,
        netSalesQty,
        returnRate,
        sellThroughRate,
        daysSinceLastSale,
        stockAgeDays,
        daysToFirstSale,
        lifecycleStatus: computeLifecycleStatus(baseRecord, netSalesQty, daysSinceLastSale),
    };
}

function buildTransferSuggestions(records: AtelierInventoryRecord[]) {
    const groups = new Map<string, AtelierInventoryRecord[]>();

    for (const record of records) {
        const key = buildVariantKey(record);
        const current = groups.get(key) ?? [];
        current.push(record);
        groups.set(key, current);
    }

    const suggestions: AtelierTransferSuggestion[] = [];

    for (const groupRecords of groups.values()) {
        const surplus = groupRecords
            .map((record) => {
                const targetInventory = Math.max(Math.ceil(record.netSalesQty * SURPLUS_BUFFER_MULTIPLIER), 1);
                return {
                    ...record,
                    available: Math.max(record.inventory - targetInventory, 0),
                };
            })
            .filter((record) => record.available > 0)
            .sort((left, right) => right.available - left.available);

        const deficit = groupRecords
            .map((record) => {
                const demandTarget = Math.max(Math.ceil(record.netSalesQty), 1);
                return {
                    ...record,
                    needed: Math.max(demandTarget - record.inventory, 0),
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
                });
            }
        }
    }

    return suggestions;
}

function getMissingFieldLabels(columnKeys: Set<string>, aliases: Record<string, readonly string[]>) {
    return Object.entries(aliases)
        .filter(([, groupAliases]) =>
            !groupAliases.some((alias) => columnKeys.has(normalizeFieldKey(alias)))
        )
        .map(([label]) => label);
}

function getActionLabel(action: AtelierAction) {
    switch (action) {
        case "rebalance":
            return "Rebalance";
        case "replenish":
            return "Replenish";
        case "liquidate":
            return "Liquidate";
        case "review":
            return "Review";
        default:
            return "Watch";
    }
}

export function buildAtelierPlanSnapshot(
    analysis: AnalysisResult | null,
    rules: AtelierPlannerRules
): AtelierPlanSnapshot | null {
    if (!analysis) return null;

    const allValidRecords = analysis.rows
        .map(toInventoryRecord)
        .filter((record): record is AtelierInventoryRecord => record !== null);

    const warehouses = [...new Set(allValidRecords.map((record) => record.warehouseName))].sort((left, right) =>
        left.localeCompare(right)
    );

    const excluded = new Set(rules.excludedWarehouses);
    const candidateRecords = allValidRecords.filter((record) => !excluded.has(record.warehouseName));
    const transfers = buildTransferSuggestions(candidateRecords);

    const transfersByVariant = new Map<string, AtelierTransferSuggestion[]>();
    for (const transfer of transfers) {
        const key = [
            transfer.productCode,
            transfer.productName,
            transfer.color,
            transfer.size,
            transfer.gender,
        ].join("::");
        const current = transfersByVariant.get(key) ?? [];
        current.push(transfer);
        transfersByVariant.set(key, current);
    }

    const groupedRecords = new Map<string, AtelierInventoryRecord[]>();
    for (const record of candidateRecords) {
        const key = buildVariantKey(record);
        const current = groupedRecords.get(key) ?? [];
        current.push(record);
        groupedRecords.set(key, current);
    }

    const baseRows: AtelierPlanRow[] = [...groupedRecords.entries()]
        .map(([key, groupRecords]) => {
            const lead = groupRecords[0];
            const variantTransfers = transfersByVariant.get(key) ?? [];
            const warehouseCount = new Set(groupRecords.map((record) => record.warehouseName)).size;
            const totalInventory = groupRecords.reduce((sum, record) => sum + record.inventory, 0);
            const totalNetSales = groupRecords.reduce((sum, record) => sum + record.netSalesQty, 0);
            const totalSales = groupRecords.reduce((sum, record) => sum + record.salesQty, 0);
            const totalReturns = groupRecords.reduce((sum, record) => sum + record.returnQty, 0);
            const totalReturnRate = totalSales > 0 ? totalReturns / totalSales : 0;

            const focusRecords = rules.scopeMode === "specific" && rules.selectedWarehouse
                ? groupRecords.filter((record) => record.warehouseName === rules.selectedWarehouse)
                : groupRecords;

            if (focusRecords.length === 0) {
                return null;
            }

            const inventory = focusRecords.reduce((sum, record) => sum + record.inventory, 0);
            const netSalesQty = focusRecords.reduce((sum, record) => sum + record.netSalesQty, 0);
            const demandGapUnits = focusRecords.reduce((sum, record) => {
                const demandTarget = Math.max(Math.ceil(record.netSalesQty), 1);
                return sum + Math.max(demandTarget - record.inventory, 0);
            }, 0);
            const surplusUnits = focusRecords.reduce((sum, record) => {
                const targetInventory = Math.max(Math.ceil(record.netSalesQty * SURPLUS_BUFFER_MULTIPLIER), 1);
                return sum + Math.max(record.inventory - targetInventory, 0);
            }, 0);
            const stagnantUnits = focusRecords
                .filter((record) => record.lifecycleStatus === "stagnant")
                .reduce((sum, record) => sum + record.inventory, 0);

            const incomingUnits = rules.scopeMode === "specific" && rules.selectedWarehouse
                ? variantTransfers
                    .filter((transfer) => transfer.toWarehouseName === rules.selectedWarehouse)
                    .reduce((sum, transfer) => sum + transfer.quantity, 0)
                : 0;
            const outgoingUnits = rules.scopeMode === "specific" && rules.selectedWarehouse
                ? variantTransfers
                    .filter((transfer) => transfer.fromWarehouseName === rules.selectedWarehouse)
                    .reduce((sum, transfer) => sum + transfer.quantity, 0)
                : 0;
            const transferUnits = rules.scopeMode === "specific"
                ? incomingUnits + outgoingUnits
                : variantTransfers.reduce((sum, transfer) => sum + transfer.quantity, 0);

            let action: AtelierAction = "watch";
            let actionReason = "Operating inside the current rule band.";

            if ((rules.scopeMode === "specific" && incomingUnits > 0 && demandGapUnits > 0) || (rules.scopeMode === "general" && transferUnits > 0 && demandGapUnits > 0)) {
                action = "rebalance";
                actionReason = "Stock can move between active stores under the current rules.";
            } else if (demandGapUnits > 0 && netSalesQty > 0) {
                action = "replenish";
                actionReason = "Sales are running ahead of available inventory.";
            } else if (stagnantUnits > 0 || (netSalesQty <= 0 && inventory > 0)) {
                action = "liquidate";
                actionReason = "Inventory is aging with weak or no demand pull.";
            } else if (totalReturnRate >= 0.12) {
                action = "review";
                actionReason = "Return pressure is above the safe operating band.";
            }

            const routeLabel = rules.scopeMode === "specific"
                ? `${incomingUnits} in / ${outgoingUnits} out`
                : variantTransfers.length > 0
                    ? variantTransfers
                        .slice(0, 2)
                        .map((transfer) => `${transfer.fromWarehouseName} -> ${transfer.toWarehouseName}`)
                        .join(" | ")
                    : "No active transfer lane";

            return {
                id: key,
                productCode: lead.productCode,
                productName: lead.productName,
                variantLabel: buildVariantLabel(lead),
                action,
                actionLabel: getActionLabel(action),
                actionReason,
                scopeLabel: rules.scopeMode === "specific" && rules.selectedWarehouse
                    ? rules.selectedWarehouse
                    : `${warehouseCount} warehouses`,
                routeLabel,
                inventory,
                netSalesQty,
                transferUnits,
                demandGapUnits,
                surplusUnits,
                stagnantUnits,
                warehouseCount,
                priorityScore: transferUnits * 4 + demandGapUnits * 3 + stagnantUnits * 2 + surplusUnits + (action === "review" ? 1 : 0),
            };
        })
        .filter((row): row is AtelierPlanRow => row !== null)
        .filter((row) => rules.minSalesQty === null || row.netSalesQty >= rules.minSalesQty)
        .filter((row) => rules.minInventory === null || row.inventory >= rules.minInventory)
        .filter((row) => rules.maxInventory === null || row.inventory <= rules.maxInventory)
        .filter((row) => {
            const query = rules.searchTerm.trim().toLowerCase();
            if (!query) return true;
            return [
                row.productCode,
                row.productName,
                row.variantLabel,
                row.scopeLabel,
                row.routeLabel,
                row.actionLabel,
            ].some((value) => value.toLowerCase().includes(query));
        })
        .sort((left, right) => right.priorityScore - left.priorityScore || right.inventory - left.inventory);

    const counts: Record<AtelierViewMode, number> = {
        all: baseRows.length,
        rebalance: baseRows.filter((row) => row.action === "rebalance").length,
        replenish: baseRows.filter((row) => row.action === "replenish").length,
        liquidate: baseRows.filter((row) => row.action === "liquidate").length,
        review: baseRows.filter((row) => row.action === "review").length,
    };

    const rows = rules.viewMode === "all"
        ? baseRows
        : baseRows.filter((row) => row.action === rules.viewMode);

    const columnKeys = new Set(analysis.columns.map((column) => normalizeFieldKey(column.key)));

    return {
        warehouses,
        rows,
        counts,
        dataset: {
            usableRows: candidateRecords.length,
            discardedRows: Math.max(analysis.rowCount - allValidRecords.length, 0),
        },
        dataQuality: {
            missingCoreFields: getMissingFieldLabels(columnKeys, {
                warehouse: FIELD_ALIASES.warehouseName,
                product: [...FIELD_ALIASES.productCode, ...FIELD_ALIASES.productName],
                sales: FIELD_ALIASES.salesQty,
                returns: FIELD_ALIASES.returnQty,
                inventory: FIELD_ALIASES.inventory,
            }),
            missingLifecycleFields: getMissingFieldLabels(columnKeys, {
                productionYear: FIELD_ALIASES.productionYear,
                lastSaleDate: FIELD_ALIASES.lastSaleDate,
                firstStockEntryDate: FIELD_ALIASES.firstStockEntryDate,
            }),
        },
    };
}
