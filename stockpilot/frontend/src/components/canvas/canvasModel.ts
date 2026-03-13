import type { AnalyzedInventoryRecord } from "../../types/stock";
import { formatNullableDate, formatNumber, formatPercent } from "../../utils/formatting";

type BasePivotFieldId = keyof AnalyzedInventoryRecord;

export type CustomMetricId = `custom:${string}`;
export type PivotFieldId = BasePivotFieldId | CustomMetricId;
export type PivotZoneId = "filters" | "columns" | "rows" | "values";
export type PivotFieldFormat = "text" | "number" | "percent" | "date";
export type CustomMetricOperator = "+" | "-" | "*" | "/";

export interface CustomMetricFieldToken {
    type: "field";
    fieldId: PivotFieldId;
}

export interface CustomMetricOperatorToken {
    type: "operator";
    operator: CustomMetricOperator;
}

export type CustomMetricExpressionToken = CustomMetricFieldToken | CustomMetricOperatorToken;

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
    format: "number" | "percent";
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
    customMetrics: CustomMetricDefinition[];
}

export interface PivotTableView {
    table: PivotTableInstance;
    filterOptions: Record<string, string[]>;
    filteredRecords: AnalyzedInventoryRecord[];
    pivotResult: PivotResult;
    hasColumnGroups: boolean;
    hasMultipleValueFields: boolean;
    showSecondaryHeaderRow: boolean;
    customMetrics: CustomMetricDefinition[];
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
    currentX?: number;
    currentY?: number;
    currentWidth?: number;
    currentHeight?: number;
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

const BASE_PIVOT_FIELDS: PivotFieldDefinition[] = [
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

export const PIVOT_FIELDS = BASE_PIVOT_FIELDS;

export function isCustomMetricFieldId(fieldId: PivotFieldId): fieldId is CustomMetricId {
    return fieldId.startsWith("custom:");
}

function buildCustomMetricFieldDefinition(metric: CustomMetricDefinition): PivotFieldDefinition {
    return {
        id: metric.id,
        label: metric.name,
        kind: "measure",
        summary: "formula",
        format: metric.format
    };
}

export function getAvailablePivotFields(customMetrics: CustomMetricDefinition[] = []) {
    return [
        ...BASE_PIVOT_FIELDS,
        ...customMetrics.map((metric) => buildCustomMetricFieldDefinition(metric))
    ];
}

export function getMeasureFieldDefinitions(customMetrics: CustomMetricDefinition[] = []) {
    return getAvailablePivotFields(customMetrics).filter((field) => field.kind === "measure");
}

function getCustomMetricDefinition(
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = []
) {
    return customMetrics.find((metric) => metric.id === fieldId) ?? null;
}

export function getFieldDefinition(
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = []
) {
    return getAvailablePivotFields(customMetrics).find((field) => field.id === fieldId)!;
}

function slugifyCustomMetricName(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function createCustomMetricDefinition(
    value: Omit<CustomMetricDefinition, "id">,
    existingMetrics: CustomMetricDefinition[]
): CustomMetricDefinition {
    const normalizedName = value.name.trim();
    const slugBase = slugifyCustomMetricName(normalizedName) || "metric";
    let nextId = `custom:${slugBase}` as CustomMetricId;
    let duplicateIndex = 2;

    while (existingMetrics.some((metric) => metric.id === nextId)) {
        nextId = `custom:${slugBase}-${duplicateIndex}` as CustomMetricId;
        duplicateIndex += 1;
    }

    return {
        ...value,
        id: nextId,
        name: normalizedName,
        tokens: normalizeExpressionTokens(value.tokens)
    };
}

export function describeCustomMetric(
    metric: CustomMetricDefinition,
    customMetrics: CustomMetricDefinition[] = []
) {
    return metric.tokens
        .map((token) =>
            token.type === "field"
                ? getFieldDefinition(token.fieldId, customMetrics).label
                : token.operator
        )
        .join(" ");
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

function isKnownFieldId(
    value: unknown,
    customMetrics: CustomMetricDefinition[] = []
): value is PivotFieldId {
    return (
        typeof value === "string" &&
        getAvailablePivotFields(customMetrics).some((field) => field.id === value)
    );
}

function uniqueFieldIds(values: PivotFieldId[], customMetrics: CustomMetricDefinition[] = []) {
    return Array.from(
        new Set(values.filter((value) => getAvailablePivotFields(customMetrics).some((field) => field.id === value)))
    );
}

function sanitizeLayout(value: unknown, customMetrics: CustomMetricDefinition[] = []): PivotLayout {
    if (!value || typeof value !== "object") {
        return DEFAULT_LAYOUT;
    }

    const candidate = value as Partial<Record<PivotZoneId, PivotFieldId[]>>;

    return {
        filters: uniqueFieldIds(candidate.filters ?? DEFAULT_LAYOUT.filters, customMetrics),
        columns: uniqueFieldIds(candidate.columns ?? DEFAULT_LAYOUT.columns, customMetrics),
        rows: uniqueFieldIds(candidate.rows ?? DEFAULT_LAYOUT.rows, customMetrics),
        values: uniqueFieldIds(candidate.values ?? DEFAULT_LAYOUT.values, customMetrics)
    };
}

function applyMetricOperator(left: number, right: number, operator: CustomMetricOperator) {
    if (operator === "+") {
        return left + right;
    }

    if (operator === "-") {
        return left - right;
    }

    if (operator === "*") {
        return left * right;
    }

    return right === 0 ? 0 : left / right;
}

function toFiniteNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeExpressionTokens(tokens: CustomMetricExpressionToken[]) {
    return tokens.filter((token, index) => {
        if (token.type === "field") {
            return index % 2 === 0;
        }

        return index % 2 === 1;
    });
}

function evaluateCustomMetricTokens(
    tokens: CustomMetricExpressionToken[],
    resolveFieldValue: (fieldId: PivotFieldId, visited: Set<PivotFieldId>) => number,
    visited: Set<PivotFieldId>
) {
    const normalizedTokens = normalizeExpressionTokens(tokens);
    const firstToken = normalizedTokens[0];
    if (!firstToken || firstToken.type !== "field") {
        return 0;
    }

    let result = resolveFieldValue(firstToken.fieldId, visited);

    for (let index = 1; index < normalizedTokens.length - 1; index += 2) {
        const operatorToken = normalizedTokens[index];
        const nextFieldToken = normalizedTokens[index + 1];

        if (operatorToken?.type !== "operator" || nextFieldToken?.type !== "field") {
            continue;
        }

        result = applyMetricOperator(
            result,
            resolveFieldValue(nextFieldToken.fieldId, visited),
            operatorToken.operator
        );
    }

    return result;
}

function getRecordFieldValue(
    record: AnalyzedInventoryRecord,
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = [],
    visited = new Set<PivotFieldId>()
): string | number | null {
    if (!isCustomMetricFieldId(fieldId)) {
        return record[fieldId as BasePivotFieldId];
    }

    if (visited.has(fieldId)) {
        return 0;
    }

    const metric = getCustomMetricDefinition(fieldId, customMetrics);
    if (!metric) {
        return 0;
    }

    visited.add(fieldId);
    const result = evaluateCustomMetricTokens(
        metric.tokens,
        (currentFieldId, currentVisited) =>
            toFiniteNumber(getRecordFieldValue(record, currentFieldId, customMetrics, currentVisited)),
        visited
    );
    visited.delete(fieldId);

    return result;
}

function getDimensionValue(
    record: AnalyzedInventoryRecord,
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = []
) {
    const field = getFieldDefinition(fieldId, customMetrics);
    const rawValue = getRecordFieldValue(record, fieldId, customMetrics);

    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return "(Blank)";
    }

    if (field.format === "date") {
        return formatNullableDate(typeof rawValue === "string" ? rawValue : String(rawValue));
    }

    if (field.format === "percent") {
        return formatPercent(toFiniteNumber(rawValue));
    }

    if (field.format === "number") {
        return formatNumber(toFiniteNumber(rawValue));
    }

    return String(rawValue);
}

function getMeasureInput(
    record: AnalyzedInventoryRecord,
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = []
) {
    const field = getFieldDefinition(fieldId, customMetrics);
    const rawValue = getRecordFieldValue(record, fieldId, customMetrics);

    if (field.kind === "dimension" || field.summary === "count") {
        return {
            sum: rawValue === null || rawValue === undefined || rawValue === "" ? 0 : 1,
            count: rawValue === null || rawValue === undefined || rawValue === "" ? 0 : 1
        };
    }

    const numericValue = toFiniteNumber(rawValue);

    return {
        sum: numericValue,
        count: 1
    };
}

export function resolveAggregationValue(
    fieldId: PivotFieldId,
    state: AggregationState | undefined,
    customMetrics: CustomMetricDefinition[] = []
) {
    if (!state) {
        return 0;
    }

    const field = getFieldDefinition(fieldId, customMetrics);

    if (field.summary === "count") {
        return state.count;
    }

    if (field.summary === "avg") {
        return state.count > 0 ? state.sum / state.count : 0;
    }

    return state.sum;
}

export function resolveFieldValueFromAggregationStates(
    fieldId: PivotFieldId,
    states: Record<string, AggregationState> | undefined,
    customMetrics: CustomMetricDefinition[] = [],
    visited = new Set<PivotFieldId>()
): number {
    if (visited.has(fieldId)) {
        return 0;
    }

    if (!isCustomMetricFieldId(fieldId)) {
        return resolveAggregationValue(fieldId, states?.[fieldId], customMetrics);
    }

    const metric = getCustomMetricDefinition(fieldId, customMetrics);
    if (!metric) {
        return 0;
    }

    visited.add(fieldId);
    const result = evaluateCustomMetricTokens(
        metric.tokens,
        (currentFieldId, currentVisited) =>
            resolveFieldValueFromAggregationStates(currentFieldId, states, customMetrics, currentVisited),
        visited
    );
    visited.delete(fieldId);

    return result;
}

export function formatAggregatedValue(
    fieldId: PivotFieldId,
    value: number,
    customMetrics: CustomMetricDefinition[] = []
) {
    const field = getFieldDefinition(fieldId, customMetrics);

    if (field.format === "percent") {
        return formatPercent(value);
    }

    return formatNumber(value);
}

function buildComboKey(
    record: AnalyzedInventoryRecord,
    fieldIds: PivotFieldId[],
    customMetrics: CustomMetricDefinition[] = []
) {
    if (fieldIds.length === 0) {
        return {
            key: "__total__",
            labels: ["Grand Total"]
        };
    }

    const labels = fieldIds.map((fieldId) => getDimensionValue(record, fieldId, customMetrics));
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

function collectAggregateFieldIds(
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = [],
    collected = new Set<PivotFieldId>(),
    visited = new Set<PivotFieldId>()
) {
    if (visited.has(fieldId)) {
        return collected;
    }

    if (!isCustomMetricFieldId(fieldId)) {
        collected.add(fieldId);
        return collected;
    }

    const metric = getCustomMetricDefinition(fieldId, customMetrics);
    if (!metric) {
        return collected;
    }

    visited.add(fieldId);
    for (const token of metric.tokens) {
        if (token.type === "field") {
            collectAggregateFieldIds(token.fieldId, customMetrics, collected, visited);
        }
    }
    visited.delete(fieldId);

    return collected;
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

function sanitizeCustomMetric(
    value: unknown,
    index: number,
    existingMetrics: CustomMetricDefinition[]
): CustomMetricDefinition | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as Partial<CustomMetricDefinition>;
    const fallbackName = `Metric ${index}`;
    const nextName =
        typeof candidate.name === "string" && candidate.name.trim()
            ? candidate.name.trim()
            : fallbackName;
    const legacyCandidate = candidate as Partial<{
        leftFieldId: PivotFieldId;
        operator: CustomMetricOperator;
        rightFieldId: PivotFieldId;
    }>;
    const rawTokens = Array.isArray(candidate.tokens)
        ? candidate.tokens
        : [
              { type: "field", fieldId: legacyCandidate.leftFieldId ?? "netSalesQty" },
              { type: "operator", operator: legacyCandidate.operator ?? "+" },
              { type: "field", fieldId: legacyCandidate.rightFieldId ?? "inventory" }
          ];
    const tokens = rawTokens.reduce<CustomMetricExpressionToken[]>((accumulator, token, tokenIndex) => {
        if (!token || typeof token !== "object") {
            return accumulator;
        }

        if (tokenIndex % 2 === 0) {
            const candidateToken = token as Partial<CustomMetricFieldToken>;
            if (!isKnownFieldId(candidateToken.fieldId, existingMetrics)) {
                return accumulator;
            }

            return [...accumulator, { type: "field", fieldId: candidateToken.fieldId }];
        }

        const candidateToken = token as Partial<CustomMetricOperatorToken>;
        const operator: CustomMetricOperator =
            candidateToken.operator === "-" ||
            candidateToken.operator === "*" ||
            candidateToken.operator === "/" ||
            candidateToken.operator === "+"
                ? candidateToken.operator
                : "+";

        return [...accumulator, { type: "operator", operator }];
    }, []);
    const format = candidate.format === "percent" ? "percent" : "number";
    const id =
        typeof candidate.id === "string" && candidate.id.startsWith("custom:")
            ? (candidate.id as CustomMetricId)
            : (`custom:metric-${index}` as CustomMetricId);

    const uniqueId = existingMetrics.some((metric) => metric.id === id)
        ? (`${id}-${existingMetrics.length + 1}` as CustomMetricId)
        : id;

    return {
        id: uniqueId,
        name: nextName,
        tokens:
            tokens.length >= 3 && tokens[0]?.type === "field" && tokens[tokens.length - 1]?.type === "field"
                ? tokens
                : [
                      { type: "field", fieldId: "netSalesQty" },
                      { type: "operator", operator: "+" },
                      { type: "field", fieldId: "inventory" }
                  ],
        format
    };
}

function sanitizeCustomMetrics(value: unknown) {
    if (!Array.isArray(value)) {
        return [] as CustomMetricDefinition[];
    }

    return value.reduce<CustomMetricDefinition[]>((accumulator, metric, index) => {
        const nextMetric = sanitizeCustomMetric(metric, index + 1, accumulator);
        if (!nextMetric) {
            return accumulator;
        }

        return [...accumulator, nextMetric];
    }, []);
}

function sanitizeTable(
    value: unknown,
    index: number,
    customMetrics: CustomMetricDefinition[] = []
): PivotTableInstance {
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
        layout: sanitizeLayout(candidate.layout, customMetrics),
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
            activeTableId: initialTable.id,
            customMetrics: []
        };
    }

    const candidate = value as Partial<StudioCanvasState>;
    const customMetrics = sanitizeCustomMetrics(candidate.customMetrics);
    const nextTables =
        Array.isArray(candidate.tables) && candidate.tables.length > 0
            ? candidate.tables.map((table, index) => sanitizeTable(table, index + 1, customMetrics))
            : [createPivotTable(1)];

    const activeTableId =
        typeof candidate.activeTableId === "string" &&
        nextTables.some((table) => table.id === candidate.activeTableId)
            ? candidate.activeTableId
            : nextTables[0].id;

    return {
        tables: nextTables,
        activeTableId,
        customMetrics
    };
}

export function buildFilterOptions(
    records: AnalyzedInventoryRecord[],
    filterFields: PivotFieldId[],
    customMetrics: CustomMetricDefinition[] = []
) {
    return filterFields.reduce<Record<string, string[]>>((accumulator, fieldId) => {
        const values = sortCombos(
            Array.from(
                new Map(
                    records.map((record) => {
                        const label = getDimensionValue(record, fieldId, customMetrics);
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
    filterSelections: Record<string, string>,
    customMetrics: CustomMetricDefinition[] = []
) {
    return records.filter((record) =>
        layout.filters.every((fieldId) => {
            const selectedValue = filterSelections[fieldId] ?? ALL_FILTER_VALUE;
            if (selectedValue === ALL_FILTER_VALUE) {
                return true;
            }

            return getDimensionValue(record, fieldId, customMetrics) === selectedValue;
        })
    );
}

export function buildPivotResult(
    filteredRecords: AnalyzedInventoryRecord[],
    layout: PivotLayout,
    customMetrics: CustomMetricDefinition[] = []
): PivotResult {
    const valueFields = layout.values.length > 0 ? layout.values : [];

    if (valueFields.length === 0) {
        return {
            valueFields,
            rowCombos: [],
            columnCombos: [],
            matrix: new Map<string, Map<string, Record<string, AggregationState>>>()
        };
    }

    const aggregateFieldIds = Array.from(
        valueFields.reduce<Set<PivotFieldId>>((accumulator, fieldId) => {
            collectAggregateFieldIds(fieldId, customMetrics, accumulator);
            return accumulator;
        }, new Set<PivotFieldId>())
    );
    const rowMap = new Map<string, PivotCombo>();
    const columnMap = new Map<string, PivotCombo>();
    const matrix = new Map<string, Map<string, Record<string, AggregationState>>>();

    for (const record of filteredRecords) {
        const rowCombo = buildComboKey(record, layout.rows, customMetrics);
        const columnCombo = buildComboKey(record, layout.columns, customMetrics);

        rowMap.set(rowCombo.key, rowCombo);
        columnMap.set(columnCombo.key, columnCombo);

        const rowBucket = matrix.get(rowCombo.key) ?? new Map<string, Record<string, AggregationState>>();
        const cell =
            rowBucket.get(columnCombo.key) ??
            (Object.fromEntries(aggregateFieldIds.map((fieldId) => [fieldId, { sum: 0, count: 0 }])) as Record<
                string,
                AggregationState
            >);

        for (const fieldId of aggregateFieldIds) {
            const input = getMeasureInput(record, fieldId, customMetrics);
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
