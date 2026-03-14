export interface InventoryRecord {
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
}

export interface ParsedInventorySummary {
    fileName: string;
    columns: string[];
    rowCount: number;
}

export interface ParsedInventoryPayload extends ParsedInventorySummary {
    records: InventoryRecord[];
}

export interface AnalyzedInventoryRecord extends InventoryRecord {
    netSalesQty: number;
    returnRate: number;
    sellThroughRate: number;
    daysSinceLastSale: number | null;
    stockAgeDays: number | null;
    daysToFirstSale: number | null;
    lifecycleStatus: "healthy" | "slow" | "stagnant";
}

export interface WarehouseBreakdownPoint {
    name: string;
    value: number;
    quantity: number;
}

export interface LifecyclePoint {
    name: "Healthy" | "Slow Moving" | "Stagnant";
    value: number;
    tone: string;
}

export interface PlanningPoint {
    label: string;
    inventory: number;
    netSalesQty: number;
}

export interface AlertItem {
    productCode: string;
    productName: string;
    warehouseName: string;
    issue: string;
    metric: string;
}

export interface OverviewMetrics {
    totalProducts: number;
    totalInventory: number;
    totalNetSales: number;
    totalReturns: number;
    warehouses: number;
    averageReturnRate: number;
    slowMovingItems: number;
    stagnantItems: number;
}

export interface AnalysisResult {
    overview: OverviewMetrics;
    records: AnalyzedInventoryRecord[];
    warehouseBreakdown: WarehouseBreakdownPoint[];
    lifecycleBreakdown: LifecyclePoint[];
    planning: PlanningPoint[];
    alerts: AlertItem[];
}

export interface TransferSuggestion {
    productCode: string;
    productName: string;
    color: string;
    size: string;
    gender: string;
    fromWarehouseName: string;
    toWarehouseName: string;
    quantity: number;
    demandGap: number;
}

export type UploadWorkflowSource = "api" | "local";

export interface UploadWorkflowResult {
    parsed: ParsedInventorySummary;
    analysis: AnalysisResult;
    transferPlan: TransferSuggestion[];
    source: UploadWorkflowSource;
}
