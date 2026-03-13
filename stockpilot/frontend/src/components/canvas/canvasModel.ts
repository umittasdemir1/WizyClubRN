import type { AnalyzedInventoryRecord } from "../../types/stock";
import { formatNullableDate, formatNumber, formatPercent } from "../../utils/formatting";

export type PivotZoneId = "filters" | "columns" | "rows" | "values";
export type PivotFieldId = keyof AnalyzedInventoryRecord;

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
    summary: "sum" | "avg" | "count";
    format: "text" | "number" | "percent" | "date";
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

export interface PivotTableInstance {
    id: string;
    name: string;
    layout: PivotLayout;
    headerColor: string;
    filterSelections: Record<string, string>;
    hasCustomizedSize: boolean;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
}

export interface StudioCanvasState {
    tables: PivotTableInstance[];
    activeTableId: string | null;
}

export interface PivotTableView {
    table: PivotTableInstance;
    filterOptions: Record<string, string[]>;
    filteredRecords: AnalyzedInventoryRecord[];
    pivotResult: PivotResult;
    hasColumnGroups: boolean;
    hasMultipleValueFields: boolean;
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
}

export interface MoveState {
    tableId: string;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
}

export const STORAGE_KEY = "stockpilot-pivot-studio-layout-v3";
export const ALL_FILTER_VALUE = "__all__";
export const MIN_TABLE_WIDTH = 220;
export const MIN_TABLE_HEIGHT = 220;
export const DEFAULT_TABLE_WIDTH = 560;
export const DEFAULT_TABLE_HEIGHT = 460;
export const AUTO_FIT_SCROLLBAR_GUTTER = 16;
export const ACTION_BAR_ICON_CLASS = "h-[18px] w-[18px]";
export const ACTION_BAR_ICON_STROKE = 1.95;
export const PIVOT_FIELD_TEXT_TYPOGRAPHY = "font-display text-[0.96rem] font-light leading-[1.04] tracking-tight";
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

export const PIVOT_FIELDS: PivotFieldDefinition[] = [
    { id: "warehouseName", label: "Warehouse", kind: "dimension", summary: "count", format: "text" },
    { id: "productCode", label: "Product Code", kind: "dimension", summary: "count", format: "text" },
    { id: "productName", label: "Product Name", kind: "dimension", summary: "count", format: "text" },
    { id: "color", label: "Color", kind: "dimension", summary: "count", format: "text" },
    { id: "size", label: "Size", kind: "dimension", summary: "count", format: "text" },
    { id: "gender", label: "Gender", kind: "dimension", summary: "count", format: "text" },
    { id: "productionYear", label: "Production Year", kind: "dimension", summary: "count", format: "text" },
    { id: "lastSaleDate", label: "Last Sale Date", kind: "dimension", summary: "count", format: "date" },
    { id: "firstStockEntryDate", label: "First Stock Entry Date", kind: "dimension", summary: "count", format: "date" },
    { id: "firstSaleDate", label: "First Sale Date", kind: "dimension", summary: "count", format: "date" },
    { id: "salesQty", label: "Sales Qty", kind: "measure", summary: "sum", format: "number" },
    { id: "returnQty", label: "Return Qty", kind: "measure", summary: "sum", format: "number" },
    { id: "inventory", label: "Inventory", kind: "measure", summary: "sum", format: "number" },
    { id: "netSalesQty", label: "Net Sales", kind: "measure", summary: "sum", format: "number" },
    { id: "returnRate", label: "Return Rate", kind: "measure", summary: "avg", format: "percent" },
    { id: "sellThroughRate", label: "Sell Through", kind: "measure", summary: "avg", format: "percent" },
    { id: "daysSinceLastSale", label: "Days Since Last Sale", kind: "measure", summary: "avg", format: "number" },
    { id: "stockAgeDays", label: "Stock Age Days", kind: "measure", summary: "avg", format: "number" },
    { id: "daysToFirstSale", label: "Days to First Sale", kind: "measure", summary: "avg", format: "number" }
];

export function getFieldDefinition(fieldId: PivotFieldId) {
    return PIVOT_FIELDS.find((field) => field.id === fieldId)!;
}

export function hexToRgba(hexColor: string, alpha: number) {
    const normalizedHex = hexColor.replace("#", "");
    const parsedHex =
        normalizedHex.length === 3
            ? normalizedHex
                  .split("")
                  .map((character) => `${character}${character}`)
                  .join("")
            : normalizedHex;

    const red = Number.parseInt(parsedHex.slice(0, 2), 16);
    const green = Number.parseInt(parsedHex.slice(2, 4), 16);
    const blue = Number.parseInt(parsedHex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function isHexColor(value: unknown): value is string {
    return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
}

export function resolveTableHeaderColor(value: unknown) {
    return isHexColor(value) ? value : DEFAULT_TABLE_HEADER_COLOR;
}

function uniqueFieldIds(values: PivotFieldId[]) {
    return Array.from(new Set(values.filter((value) => PIVOT_FIELDS.some((field) => field.id === value))));
}

function sanitizeLayout(value: unknown): PivotLayout {
    if (!value || typeof value !== "object") {
        return DEFAULT_LAYOUT;
    }

    const candidate = value as Partial<Record<PivotZoneId, PivotFieldId[]>>;

    return {
        filters: uniqueFieldIds(candidate.filters ?? DEFAULT_LAYOUT.filters),
        columns: uniqueFieldIds(candidate.columns ?? DEFAULT_LAYOUT.columns),
        rows: uniqueFieldIds(candidate.rows ?? DEFAULT_LAYOUT.rows),
        values: uniqueFieldIds(candidate.values ?? DEFAULT_LAYOUT.values)
    };
}

function getDimensionValue(record: AnalyzedInventoryRecord, fieldId: PivotFieldId) {
    const field = getFieldDefinition(fieldId);
    const rawValue = record[fieldId];

    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return "(Blank)";
    }

    if (field.format === "date") {
        return formatNullableDate(typeof rawValue === "string" ? rawValue : String(rawValue));
    }

    return String(rawValue);
}

function getMeasureInput(record: AnalyzedInventoryRecord, fieldId: PivotFieldId) {
    const field = getFieldDefinition(fieldId);
    const rawValue = record[fieldId];

    if (field.kind === "dimension" || field.summary === "count") {
        return {
            sum: rawValue === null || rawValue === undefined || rawValue === "" ? 0 : 1,
            count: rawValue === null || rawValue === undefined || rawValue === "" ? 0 : 1
        };
    }

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        return {
            sum: rawValue,
            count: 1
        };
    }

    return {
        sum: 0,
        count: 0
    };
}

export function resolveAggregationValue(fieldId: PivotFieldId, state: AggregationState | undefined) {
    if (!state) {
        return 0;
    }

    const field = getFieldDefinition(fieldId);

    if (field.summary === "count") {
        return state.count;
    }

    if (field.summary === "avg") {
        return state.count > 0 ? state.sum / state.count : 0;
    }

    return state.sum;
}

export function formatAggregatedValue(fieldId: PivotFieldId, value: number) {
    const field = getFieldDefinition(fieldId);

    if (field.format === "percent") {
        return formatPercent(value);
    }

    return formatNumber(value);
}

function buildComboKey(record: AnalyzedInventoryRecord, fieldIds: PivotFieldId[]) {
    if (fieldIds.length === 0) {
        return {
            key: "__total__",
            labels: ["Grand Total"]
        };
    }

    const labels = fieldIds.map((fieldId) => getDimensionValue(record, fieldId));
    return {
        key: labels.join("|||"),
        labels
    };
}

function sortCombos(combos: PivotCombo[]) {
    return [...combos].sort((left, right) =>
        left.labels.join(" / ").localeCompare(right.labels.join(" / "), "en")
    );
}

function createTableId() {
    return `pivot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getActionBarNameWidth(label: string) {
    const normalizedLabel = label.trim();
    const estimatedWidth = Math.ceil(normalizedLabel.length * 9 + 48);
    return Math.min(240, Math.max(116, estimatedWidth));
}

function getDefaultTableSize() {
    return {
        width: DEFAULT_TABLE_WIDTH,
        height: DEFAULT_TABLE_HEIGHT
    };
}

export function createPivotTable(index: number): PivotTableInstance {
    const offset = (index - 1) * 36;
    return {
        id: createTableId(),
        name: `Table ${index}`,
        layout: DEFAULT_LAYOUT,
        headerColor: DEFAULT_TABLE_HEADER_COLOR,
        filterSelections: {},
        hasCustomizedSize: false,
        position: {
            x: offset,
            y: offset
        },
        size: getDefaultTableSize()
    };
}

function sanitizeTable(value: unknown, index: number): PivotTableInstance {
    const fallback = createPivotTable(index);
    if (!value || typeof value !== "object") {
        return fallback;
    }

    const candidate = value as Partial<PivotTableInstance>;
    const nextPosition =
        candidate.position &&
        typeof candidate.position === "object" &&
        typeof candidate.position.x === "number" &&
        typeof candidate.position.y === "number"
            ? {
                  x: candidate.position.x,
                  y: candidate.position.y
              }
            : fallback.position;
    const nextSize =
        candidate.size &&
        typeof candidate.size === "object" &&
        typeof candidate.size.width === "number" &&
        typeof candidate.size.height === "number"
            ? {
                  width: Math.max(MIN_TABLE_WIDTH, candidate.size.width),
                  height: Math.max(MIN_TABLE_HEIGHT, candidate.size.height)
              }
            : fallback.size;

    const nextFilterSelections =
        candidate.filterSelections && typeof candidate.filterSelections === "object"
            ? Object.fromEntries(
                  Object.entries(candidate.filterSelections).filter(
                      ([, currentValue]) => typeof currentValue === "string"
                  )
              )
            : {};
    const hasCustomizedSize =
        typeof candidate.hasCustomizedSize === "boolean"
            ? candidate.hasCustomizedSize
            : nextSize.width !== fallback.size.width || nextSize.height !== fallback.size.height;

    return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : fallback.id,
        name: typeof candidate.name === "string" && candidate.name ? candidate.name : fallback.name,
        layout: sanitizeLayout(candidate.layout),
        headerColor: resolveTableHeaderColor(candidate.headerColor),
        filterSelections: nextFilterSelections,
        position: nextPosition,
        size: nextSize,
        hasCustomizedSize
    };
}

export function sanitizeStudioState(value: unknown): StudioCanvasState {
    if (!value || typeof value !== "object") {
        const initialTable = createPivotTable(1);
        return {
            tables: [initialTable],
            activeTableId: initialTable.id
        };
    }

    const candidate = value as Partial<StudioCanvasState>;
    const nextTables =
        Array.isArray(candidate.tables) && candidate.tables.length > 0
            ? candidate.tables.map((table, index) => sanitizeTable(table, index + 1))
            : [createPivotTable(1)];

    const activeTableId =
        typeof candidate.activeTableId === "string" &&
        nextTables.some((table) => table.id === candidate.activeTableId)
            ? candidate.activeTableId
            : nextTables[0].id;

    return {
        tables: nextTables,
        activeTableId
    };
}

export function buildFilterOptions(records: AnalyzedInventoryRecord[], filterFields: PivotFieldId[]) {
    return filterFields.reduce<Record<string, string[]>>((accumulator, fieldId) => {
        const values = sortCombos(
            Array.from(
                new Map(
                    records.map((record) => {
                        const label = getDimensionValue(record, fieldId);
                        return [label, { key: label, labels: [label] }];
                    })
                ).values()
            )
        ).map((entry) => entry.labels[0]);

        accumulator[fieldId] = values;
        return accumulator;
    }, {});
}

export function applyFilters(
    records: AnalyzedInventoryRecord[],
    layout: PivotLayout,
    filterSelections: Record<string, string>
) {
    return records.filter((record) =>
        layout.filters.every((fieldId) => {
            const selectedValue = filterSelections[fieldId] ?? ALL_FILTER_VALUE;
            if (selectedValue === ALL_FILTER_VALUE) {
                return true;
            }

            return getDimensionValue(record, fieldId) === selectedValue;
        })
    );
}

export function buildPivotResult(filteredRecords: AnalyzedInventoryRecord[], layout: PivotLayout): PivotResult {
    const valueFields = layout.values.length > 0 ? layout.values : [];

    if (valueFields.length === 0) {
        return {
            valueFields,
            rowCombos: [],
            columnCombos: [],
            matrix: new Map<string, Map<string, Record<string, AggregationState>>>()
        };
    }

    const rowMap = new Map<string, PivotCombo>();
    const columnMap = new Map<string, PivotCombo>();
    const matrix = new Map<string, Map<string, Record<string, AggregationState>>>();

    for (const record of filteredRecords) {
        const rowCombo = buildComboKey(record, layout.rows);
        const columnCombo = buildComboKey(record, layout.columns);

        rowMap.set(rowCombo.key, rowCombo);
        columnMap.set(columnCombo.key, columnCombo);

        const rowBucket = matrix.get(rowCombo.key) ?? new Map<string, Record<string, AggregationState>>();
        const cell =
            rowBucket.get(columnCombo.key) ??
            (Object.fromEntries(valueFields.map((fieldId) => [fieldId, { sum: 0, count: 0 }])) as Record<
                string,
                AggregationState
            >);

        for (const fieldId of valueFields) {
            const input = getMeasureInput(record, fieldId);
            cell[fieldId].sum += input.sum;
            cell[fieldId].count += input.count;
        }

        rowBucket.set(columnCombo.key, cell);
        matrix.set(rowCombo.key, rowBucket);
    }

    if (layout.rows.length === 0 && rowMap.size === 0) {
        rowMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });
    }

    if (layout.columns.length === 0 && columnMap.size === 0) {
        columnMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });
    }

    return {
        valueFields,
        rowCombos: sortCombos(Array.from(rowMap.values())),
        columnCombos: sortCombos(Array.from(columnMap.values())),
        matrix
    };
}
