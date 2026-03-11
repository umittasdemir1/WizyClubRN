export type AppTab = "dashboard" | "analysis" | "transfers" | "planning";
export type UploadStage = "idle" | "uploading" | "analyzing" | "local-processing" | "ready";

export interface InventoryRecord {
    sku: string;
    productName: string;
    category: string;
    store: string;
    onHand: number;
    unitPrice: number;
    dailySales: number;
    leadTimeDays: number;
    safetyStock: number;
    reorderPoint: number;
}

export interface ParsedInventoryPayload {
    fileName: string;
    columns: string[];
    rowCount: number;
    records: InventoryRecord[];
}

export interface AnalyzedInventoryRecord extends InventoryRecord {
    stockValue: number;
    revenueScore: number;
    coverageDays: number;
    reorderQuantity: number;
    suggestedPurchase: number;
    abcClass: "A" | "B" | "C";
    stockStatus: "healthy" | "warning" | "critical";
}

export interface CategoryBreakdownPoint {
    name: string;
    value: number;
    quantity: number;
}

export interface StockHealthPoint {
    name: "Healthy" | "Warning" | "Critical";
    value: number;
    tone: string;
}

export interface ForecastPoint {
    label: string;
    projectedDemand: number;
    reorderTarget: number;
}

export interface AlertItem {
    sku: string;
    productName: string;
    store: string;
    shortage: number;
}

export interface OverviewMetrics {
    totalSkus: number;
    totalStockValue: number;
    lowStockItems: number;
    overstockItems: number;
    stores: number;
}

export interface AnalysisResult {
    overview: OverviewMetrics;
    records: AnalyzedInventoryRecord[];
    categoryBreakdown: CategoryBreakdownPoint[];
    stockHealth: StockHealthPoint[];
    forecast: ForecastPoint[];
    alerts: AlertItem[];
}

export interface TransferSuggestion {
    sku: string;
    productName: string;
    fromStore: string;
    toStore: string;
    quantity: number;
    unitPrice: number;
    estimatedValue: number;
}

export interface UploadWorkflowResult {
    parsed: ParsedInventoryPayload;
    analysis: AnalysisResult;
    transferPlan: TransferSuggestion[];
    source: "api" | "local";
}

export interface RecentUpload {
    fileName: string;
    processedAt: string;
    rowCount: number;
    source: "api" | "local";
}
