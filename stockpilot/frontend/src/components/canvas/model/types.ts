import type { ColumnMeta } from "../../../types/stock";

// ── Type aliases ─────────────────────────────────────────────────────────────

type BasePivotFieldId = string;

export type CustomMetricId = `custom:${string}`;
export type PivotFieldId = BasePivotFieldId | CustomMetricId;
export type PivotZoneId = "filters" | "columns" | "rows" | "values";
export type PivotFieldFormat = "text" | "number" | "percent" | "date";
export type CustomMetricBinaryOperator = "+" | "-" | "*" | "/" | "=" | ">" | "<";
export type CustomMetricOperator = CustomMetricBinaryOperator | "%";
export type CustomMetricParenthesis = "(" | ")";
export type CustomMetricFormat = "integer" | "decimal" | "percent" | "currency" | "multiplier" | "datetime";

export type DateConstantFn = "TODAY" | "DAY_OF_MONTH" | "DAYS_IN_MONTH" | "DAYS_ELAPSED" | "DAYS_REMAINING" | "YEAR";
export type MetricFunctionName = "ROUND" | "ABS" | "MIN" | "MAX" | "IF";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DATE_CONSTANT_LABELS: Record<DateConstantFn, string> = {
    TODAY: "TODAY()",
    DAY_OF_MONTH: "DAY()",
    DAYS_IN_MONTH: "MONTH_DAYS()",
    DAYS_ELAPSED: "ELAPSED()",
    DAYS_REMAINING: "REMAINING()",
    YEAR: "YEAR()"
};

export const METRIC_FUNCTION_ARITY: Record<MetricFunctionName, number> = {
    ROUND: 2,
    ABS: 1,
    MIN: 2,
    MAX: 2,
    IF: 3
};

// ── Token interfaces ──────────────────────────────────────────────────────────

export interface CustomMetricFieldToken {
    type: "field";
    fieldId: PivotFieldId;
}

export interface CustomMetricOperatorToken {
    type: "operator";
    operator: CustomMetricOperator;
}

export interface CustomMetricConstantToken {
    type: "constant";
    value: number;
}

export interface CustomMetricParenthesisToken {
    type: "parenthesis";
    value: CustomMetricParenthesis;
}

export interface CustomMetricDateConstantToken {
    type: "date-constant";
    fn: DateConstantFn;
}

export interface CustomMetricFunctionToken {
    type: "function";
    fn: MetricFunctionName;
}

export interface CustomMetricCommaToken {
    type: "comma";
}

export type CustomMetricExpressionToken =
    | CustomMetricFieldToken
    | CustomMetricOperatorToken
    | CustomMetricConstantToken
    | CustomMetricParenthesisToken
    | CustomMetricDateConstantToken
    | CustomMetricFunctionToken
    | CustomMetricCommaToken;

// ── Core interfaces ───────────────────────────────────────────────────────────

export interface PivotLayout {
    filters: PivotFieldId[];
    columns: PivotFieldId[];
    rows: PivotFieldId[];
    values: PivotFieldId[];
}

export interface PivotFieldDefinition {
    id: PivotFieldId;
    label: string;
    kind: "dimension" | "measure";
    summary: "sum" | "avg" | "count" | "formula";
    format: PivotFieldFormat;
}

export interface CustomMetricDefinition {
    id: CustomMetricId;
    name: string;
    tokens: CustomMetricExpressionToken[];
    format: CustomMetricFormat;
}

export interface PivotCombo {
    key: string;
    labels: string[];
}

export interface AggregationState {
    sum: number;
    count: number;
}

export interface DragState {
    fieldId: PivotFieldId;
    sourceZone: PivotZoneId | "fields";
}

export interface PivotResult {
    valueFields: PivotFieldId[];
    rowCombos: PivotCombo[];
    columnCombos: PivotCombo[];
    matrix: Map<string, Map<string, Record<string, AggregationState>>>;
}

// ── PivotTableInstance sub-interfaces ─────────────────────────────────────────

/**
 * Persisted identity and pivot configuration for a table.
 * These fields are stored in StudioCanvasState and survive page reloads.
 */
export interface PivotTableConfig {
    /** Unique identifier for this pivot table instance. */
    id: string;
    /** Display name shown in the canvas action bar. */
    name: string;
    /** Field placement across the four pivot zones (filters/columns/rows/values). */
    layout: PivotLayout;
}

/**
 * Visual / canvas-level presentation state for a pivot table.
 * Controls how the table appears on the canvas — color, scale, position, size.
 */
export interface PivotTableUIState {
    /** Background color of the table header row (hex string). */
    headerColor: string;
    /** Canvas zoom scale applied to this individual table (1 = 100%). */
    scale: number;
    /** Top-left position of the table on the infinite canvas (canvas-space pixels). */
    position: {
        x: number;
        y: number;
    };
    /** Dimensions of the table container on the canvas (canvas-space pixels). */
    size: {
        width: number;
        height: number;
    };
    /**
     * When true, the user has manually resized this table and auto-fit should
     * not override its size when layout/columns change.
     */
    manualSize?: boolean;
}

/**
 * Runtime filter selections — not part of the pivot layout, but affect
 * which rows are included in the aggregation result.
 */
export interface PivotTableRuntime {
    /**
     * Map of filter-zone fieldId → selected filter value.
     * Use the sentinel `ALL_FILTER_VALUE` ("__all__") to represent "no filter".
     */
    filterSelections: Record<string, string>;
}

/**
 * A single pivot table instance on the canvas.
 *
 * Composed from three focused sub-interfaces:
 * - {@link PivotTableConfig}   — identity + layout (persisted)
 * - {@link PivotTableUIState}  — visual / canvas appearance
 * - {@link PivotTableRuntime}  — transient filter state
 *
 * All existing code that references `PivotTableInstance` continues to work
 * unchanged because the intersection preserves every field.
 */
export type PivotTableInstance = PivotTableConfig & PivotTableUIState & PivotTableRuntime;

export interface ColumnOverride {
    label: string;
    typeOverride?: "numeric" | "text" | "date";
    format: CustomMetricFormat;
}

export interface StudioCanvasState {
    tables: PivotTableInstance[];
    activeTableId: string | null;
    customMetrics: CustomMetricDefinition[];
    pinnedFieldIds: PivotFieldId[];
    columnOverrides: Record<string, ColumnOverride>;
}

/**
 * A fully-resolved, render-ready view of a pivot table.
 *
 * Produced by `usePivotOrchestration` and consumed by `PivotCanvasTable`.
 * Groups into three concerns:
 *
 * **Domain / data**
 * - `table`            — the underlying {@link PivotTableInstance}
 * - `columns`          — raw column metadata from the uploaded dataset
 * - `columnOverrides`  — user-defined label/type/format overrides per column key
 * - `filterOptions`    — available distinct values per filter-zone field
 * - `filteredRecords`  — dataset rows after filter selections are applied
 * - `pivotResult`      — aggregated pivot matrix (rows × columns × values)
 * - `customMetrics`    — custom metric definitions visible to this table
 *
 * **UI / rendering hints**
 * - `hasColumnGroups`         — true when there are column-zone fields (renders a group header row)
 * - `hasMultipleValueFields`  — true when >1 value-zone field exists
 * - `showSecondaryHeaderRow`  — true when a secondary sub-header row should render
 */
export interface PivotTableView {
    // ── Domain / data ─────────────────────────────────────────────────────────
    /** The underlying pivot table instance (config + ui state + runtime). */
    table: PivotTableInstance;
    /** Raw column metadata derived from the uploaded dataset file. */
    columns: ColumnMeta[];
    /** User-defined display label, type and format overrides keyed by column id. */
    columnOverrides: Record<string, ColumnOverride>;
    /** Available distinct values for each filter-zone field (used to populate filter dropdowns). */
    filterOptions: Record<string, string[]>;
    /** Dataset rows remaining after all active filter selections are applied. */
    filteredRecords: import("../../../types/stock").GenericRow[];
    /** Aggregated pivot result: row combos × column combos × value aggregations. */
    pivotResult: PivotResult;
    /** Custom metric definitions that are in scope for this table. */
    customMetrics: CustomMetricDefinition[];

    // ── UI / rendering hints ──────────────────────────────────────────────────
    /** True when the layout has ≥1 column-zone field — triggers rendering of the group header row. */
    hasColumnGroups: boolean;
    /** True when the layout has >1 value-zone field — affects column span and label rendering. */
    hasMultipleValueFields: boolean;
    /** True when a secondary (sub-)header row should be rendered below the primary header. */
    showSecondaryHeaderRow: boolean;
}

export type HeaderFilterKind = "row-field" | "column-group" | "value-field" | "table-menu";
export type HeaderFilterSortDirection = "asc" | "desc";

export interface HeaderFilterOption {
    label: string;
    value: string;
}

export interface HeaderFilterState {
    tableId: string;
    kind: HeaderFilterKind;
    headerKey: string;
    fieldId?: PivotFieldId;
    rowIndex?: number;
}

export type TableResizeDirection =
    | "n"
    | "e"
    | "s"
    | "w"
    | "ne"
    | "nw"
    | "se"
    | "sw";

export interface ResizeState {
    tableId: string;
    direction: TableResizeDirection;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startScale: number;
    naturalWidth: number;
    naturalHeight: number;
    currentX?: number;
    currentY?: number;
    currentWidth?: number;
    currentHeight?: number;
    currentScale?: number;
    hasMoved?: boolean;
}

export interface MoveState {
    tableId: string;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    hasMoved?: boolean;
}

// ── UI / Canvas constants ─────────────────────────────────────────────────────

export const STORAGE_KEY = "stockpilot-pivot-studio-layout-v3";
export const ALL_FILTER_VALUE = "__all__";
export const MIN_TABLE_WIDTH = 220;
export const MIN_TABLE_HEIGHT = 220;
export const DEFAULT_TABLE_WIDTH = 560;
export const DEFAULT_TABLE_HEIGHT = 460;
export const AUTO_FIT_SCROLLBAR_GUTTER = 16;

export const MIN_CANVAS_ZOOM = 0.1;
export const MAX_CANVAS_ZOOM = 3;
export const DEFAULT_CANVAS_ZOOM = 1;
export const CANVAS_ZOOM_STEP = 0.1;
export const ACTION_BAR_ICON_CLASS = "h-[18px] w-[18px]";
export const ACTION_BAR_ICON_STROKE = 1.95;
export const PIVOT_FIELD_TEXT_TYPOGRAPHY = "font-display text-[0.96rem] font-light leading-[1.3] tracking-tight";
export const TABLE_HEADER_TEXT_TYPOGRAPHY = "font-display text-[1rem] font-light leading-[1.04] tracking-tight";
export const DEFAULT_TABLE_HEADER_COLOR = "#080a0f";
export const TABLE_HEADER_COLOR_OPTIONS = [
    "#080a0f",
    "#1d4ed8",
    "#0f766e",
    "#166534",
    "#a16207",
    "#c2410c",
    "#be123c",
    "#7c3aed",
    "#1e293b",
    "#475569"
];

export const DEFAULT_LAYOUT: PivotLayout = {
    filters: [],
    columns: [],
    rows: [],
    values: []
};

export const PIVOT_ZONES: {
    id: PivotZoneId;
    label: string;
}[] = [
    {
        id: "filters",
        label: "Filters"
    },
    {
        id: "columns",
        label: "Columns"
    },
    {
        id: "rows",
        label: "Rows"
    },
    {
        id: "values",
        label: "Values"
    }
];

export const TABLE_RESIZE_HANDLES: {
    direction: TableResizeDirection;
    className: string;
}[] = [
    { direction: "n", className: "left-3 right-3 -top-[2px] h-[4px] cursor-ns-resize" },
    { direction: "e", className: "bottom-3 -right-[2px] top-3 w-[4px] cursor-ew-resize" },
    { direction: "s", className: "bottom-[-2px] left-3 right-3 h-[4px] cursor-ns-resize" },
    { direction: "w", className: "bottom-3 -left-[2px] top-3 w-[4px] cursor-ew-resize" },
    { direction: "ne", className: "-right-[2px] -top-[2px] h-[7px] w-[7px] cursor-nesw-resize" },
    { direction: "nw", className: "-left-[2px] -top-[2px] h-[7px] w-[7px] cursor-nwse-resize" },
    { direction: "se", className: "bottom-[-2px] -right-[2px] h-[7px] w-[7px] cursor-nwse-resize" },
    { direction: "sw", className: "bottom-[-2px] -left-[2px] h-[7px] w-[7px] cursor-nesw-resize" }
];

// ── Utilities ─────────────────────────────────────────────────────────────────

// 3.5: Exhaustiveness helper — TypeScript will error if a case is unhandled
export function assertNever(x: never): never {
    throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

// 3.6: Validate that a format is compatible with the column type override
export function isCompatibleFormat(
    typeOverride: ColumnOverride["typeOverride"],
    format: CustomMetricFormat
): boolean {
    if (!typeOverride) return true; // no override → allow all formats
    switch (typeOverride) {
        case "date":
            return format === "datetime";
        case "text":
            return false; // text columns don't support numeric formats
        case "numeric":
            return format !== "datetime";
        default:
            return assertNever(typeOverride);
    }
}
