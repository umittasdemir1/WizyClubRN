import type { UploadWorkflowSource } from "../../../shared/stockTypes.js";

export type AppTab = "dashboard" | "analysis" | "transfers" | "planning";
export type UploadStage = "idle" | "uploading" | "analyzing" | "local-processing" | "ready";
export type {
    AnalysisResult,
    ColumnMeta,
    ColumnType,
    GenericRow,
    UploadWorkflowResult,
    UploadWorkflowSource
} from "../../../shared/stockTypes.js";

export interface RecentUpload {
    fileName: string;
    processedAt: string;
    rowCount: number;
    source: UploadWorkflowSource;
}
