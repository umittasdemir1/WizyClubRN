export type ColumnType = "numeric" | "text" | "date";

export interface ColumnMeta {
    key: string;
    label: string;
    type: ColumnType;
}

export type GenericRow = Record<string, string | number | null>;

export interface AnalysisResult {
    columns: ColumnMeta[];
    rows: GenericRow[];
    rowCount: number;
    fileName: string;
}

export type UploadWorkflowSource = "api" | "local";

export interface UploadWorkflowResult {
    parsed: {
        fileName: string;
        rowCount: number;
        columns: ColumnMeta[];
    };
    analysis: AnalysisResult;
    source: UploadWorkflowSource;
}
