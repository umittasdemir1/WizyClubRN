import type {
    AnalysisResult,
    ParsedInventoryPayload,
    TransferSuggestion
} from "../../../shared/stockTypes.js";

export type AppTab = "dashboard" | "analysis" | "transfers" | "planning";
export type UploadStage = "idle" | "uploading" | "analyzing" | "local-processing" | "ready";
export type {
    AlertItem,
    AnalysisResult,
    AnalyzedInventoryRecord,
    InventoryRecord,
    LifecyclePoint,
    OverviewMetrics,
    ParsedInventoryPayload,
    PlanningPoint,
    TransferSuggestion,
    WarehouseBreakdownPoint
} from "../../../shared/stockTypes.js";

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
