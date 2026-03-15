import type { ColumnMeta, GenericRow } from "../../types/stock";
import { formatNullableDate, formatNumber, formatPercent } from "../../utils/formatting";

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
    pinnedFieldIds: PivotFieldId[];
}

export interface PivotTableView {
    table: PivotTableInstance;
    columns: ColumnMeta[];
    filterOptions: Record<string, string[]>;
    filteredRecords: GenericRow[];
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

export function isCustomMetricFieldId(fieldId: PivotFieldId): fieldId is CustomMetricId {
    return fieldId.startsWith("custom:");
}

function mapCustomMetricFormatToPivotFormat(format: CustomMetricFormat): PivotFieldFormat {
    return format === "percent" ? "percent" : "number";
}

function buildCustomMetricFieldDefinition(metric: CustomMetricDefinition): PivotFieldDefinition {
    return {
        id: metric.id,
        label: metric.name,
        kind: "measure",
        summary: "formula",
        format: mapCustomMetricFormatToPivotFormat(metric.format)
    };
}

function columnMetaToFieldDefinition(col: ColumnMeta): PivotFieldDefinition {
    return {
        id: col.key,
        label: col.label,
        kind: col.type === "numeric" ? "measure" : "dimension",
        summary: col.type === "numeric" ? "sum" : "count",
        format: col.type === "numeric" ? "number" : col.type === "date" ? "date" : "text"
    };
}

const FALLBACK_FIELD_DEF = (fieldId: PivotFieldId): PivotFieldDefinition => ({
    id: fieldId,
    label: fieldId,
    kind: "dimension",
    summary: "count",
    format: "text"
});

export function getAvailablePivotFields(
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    return [
        ...columns.map(columnMetaToFieldDefinition),
        ...customMetrics.map(buildCustomMetricFieldDefinition)
    ];
}

export function getMeasureFieldDefinitions(
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    return getAvailablePivotFields(columns, customMetrics).filter((field) => field.kind === "measure");
}

function getCustomMetricDefinition(
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = []
) {
    return customMetrics.find((metric) => metric.id === fieldId) ?? null;
}

export function getFieldDefinition(
    fieldId: PivotFieldId,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    return (
        getAvailablePivotFields(columns, customMetrics).find((field) => field.id === fieldId) ??
        FALLBACK_FIELD_DEF(fieldId)
    );
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

export function formatCustomMetricOperatorLabel(operator: CustomMetricOperator) {
    return operator === "*" ? "x" : operator;
}

function isCustomMetricOperator(value: unknown): value is CustomMetricOperator {
    return value === "+" || value === "-" || value === "*" || value === "/" || value === "=" || value === ">" || value === "<" || value === "%";
}

function isCustomMetricParenthesis(value: unknown): value is CustomMetricParenthesis {
    return value === "(" || value === ")";
}

function isBinaryCustomMetricOperator(operator: CustomMetricOperator): operator is CustomMetricBinaryOperator {
    return operator !== "%";
}

export function describeCustomMetric(
    metric: CustomMetricDefinition,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    return metric.tokens
        .map((token) => {
            if (token.type === "field") return getFieldDefinition(token.fieldId, columns, customMetrics).label;
            if (token.type === "operator") return formatCustomMetricOperatorLabel(token.operator);
            if (token.type === "constant") return String(token.value);
            if (token.type === "parenthesis") return token.value;
            if (token.type === "date-constant") return DATE_CONSTANT_LABELS[token.fn];
            if (token.type === "function") return token.fn + "(";
            if (token.type === "comma") return ",";
            return "";
        })
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
    if (typeof value !== "string" || !value) return false;
    if (value.startsWith("custom:")) return customMetrics.some((m) => m.id === value);
    return true; // accept any non-empty string — columns are dynamic
}

function uniqueFieldIds(values: unknown[], customMetrics: CustomMetricDefinition[] = []) {
    return Array.from(
        new Set(values.filter((value): value is PivotFieldId => isKnownFieldId(value, customMetrics)))
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

function applyMetricOperator(left: number, right: number, operator: CustomMetricBinaryOperator) {
    if (operator === "+") {
        return left + right;
    }

    if (operator === "-") {
        return left - right;
    }

    if (operator === "*") {
        return left * right;
    }

    if (operator === "=") {
        return Math.abs(left - right) < 1e-9 ? 1 : 0;
    }

    if (operator === ">") {
        return left > right ? 1 : 0;
    }

    if (operator === "<") {
        return left < right ? 1 : 0;
    }

    return right === 0 ? 0 : left / right;
}

function toFiniteNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

const METRIC_FUNCTION_NAMES: MetricFunctionName[] = ["ROUND", "ABS", "MIN", "MAX", "IF"];
const DATE_CONSTANT_FNS: DateConstantFn[] = ["TODAY", "DAY_OF_MONTH", "DAYS_IN_MONTH", "DAYS_ELAPSED", "DAYS_REMAINING", "YEAR"];

function normalizeExpressionTokens(tokens: CustomMetricExpressionToken[]) {
    return tokens.filter((token) => {
        if (token.type === "field") return true;
        if (token.type === "constant") return Number.isFinite(token.value);
        if (token.type === "operator") return isCustomMetricOperator(token.operator);
        if (token.type === "parenthesis") return isCustomMetricParenthesis(token.value);
        if (token.type === "date-constant") return DATE_CONSTANT_FNS.includes(token.fn);
        if (token.type === "function") return METRIC_FUNCTION_NAMES.includes(token.fn);
        if (token.type === "comma") return true;
        return false;
    });
}

function getCustomMetricOperatorPrecedence(operator: CustomMetricOperator) {
    if (operator === "%") {
        return 4;
    }

    if (operator === "*" || operator === "/") {
        return 3;
    }

    if (operator === "+" || operator === "-") {
        return 2;
    }

    return 1;
}

type RPNOutputToken =
    | CustomMetricFieldToken
    | CustomMetricConstantToken
    | CustomMetricOperatorToken
    | CustomMetricDateConstantToken
    | CustomMetricFunctionToken;

type OperatorStackToken =
    | CustomMetricOperatorToken
    | CustomMetricParenthesisToken
    | CustomMetricFunctionToken;

function toReversePolishExpression(tokens: CustomMetricExpressionToken[]) {
    const normalizedTokens = normalizeExpressionTokens(tokens);
    if (normalizedTokens.length === 0) return null;

    const output: RPNOutputToken[] = [];
    const operatorStack: OperatorStackToken[] = [];
    let expectsValue = true;

    for (const token of normalizedTokens) {
        // Values
        if (token.type === "field" || token.type === "constant" || token.type === "date-constant") {
            if (!expectsValue) return null;
            output.push(token);
            expectsValue = false;
            continue;
        }

        // Function: push to operator stack, next token must be (
        if (token.type === "function") {
            if (!expectsValue) return null;
            operatorStack.push(token);
            continue;
        }

        // Parentheses
        if (token.type === "parenthesis") {
            if (token.value === "(") {
                if (!expectsValue) return null;
                operatorStack.push(token);
                continue;
            }

            if (expectsValue) return null;

            let foundOpen = false;
            while (operatorStack.length > 0) {
                const top = operatorStack.pop()!;
                if (top.type === "parenthesis" && top.value === "(") {
                    foundOpen = true;
                    break;
                }
                if (top.type === "operator") output.push(top);
            }

            if (!foundOpen) return null;

            // If top is a function, pop it to output
            if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === "function") {
                output.push(operatorStack.pop() as CustomMetricFunctionToken);
            }

            expectsValue = false;
            continue;
        }

        // Comma: argument separator
        if (token.type === "comma") {
            if (expectsValue) return null;
            while (operatorStack.length > 0) {
                const top = operatorStack[operatorStack.length - 1];
                if (top.type === "parenthesis") break;
                output.push(operatorStack.pop() as CustomMetricOperatorToken);
            }
            expectsValue = true;
            continue;
        }

        // % unary postfix
        if (token.operator === "%") {
            if (expectsValue) return null;

            while (operatorStack.length > 0) {
                const top = operatorStack[operatorStack.length - 1];
                if (top.type !== "operator") break;
                if (getCustomMetricOperatorPrecedence(top.operator) < getCustomMetricOperatorPrecedence(token.operator)) break;
                output.push(operatorStack.pop() as CustomMetricOperatorToken);
            }

            operatorStack.push(token);
            expectsValue = false;
            continue;
        }

        // Binary operators
        if (expectsValue || !isBinaryCustomMetricOperator(token.operator)) return null;

        while (operatorStack.length > 0) {
            const top = operatorStack[operatorStack.length - 1];
            if (top.type !== "operator") break;
            if (getCustomMetricOperatorPrecedence(top.operator) < getCustomMetricOperatorPrecedence(token.operator)) break;
            output.push(operatorStack.pop() as CustomMetricOperatorToken);
        }

        operatorStack.push(token);
        expectsValue = true;
    }

    if (expectsValue) return null;

    while (operatorStack.length > 0) {
        const top = operatorStack.pop()!;
        if (top.type === "parenthesis") return null;
        output.push(top as RPNOutputToken);
    }

    return output;
}

export function isValidCustomMetricExpression(tokens: CustomMetricExpressionToken[]) {
    return toReversePolishExpression(tokens) !== null;
}

function evaluateDateConstant(fn: DateConstantFn): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    if (fn === "TODAY") return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    if (fn === "DAY_OF_MONTH" || fn === "DAYS_ELAPSED") return day;
    if (fn === "DAYS_IN_MONTH") return new Date(year, month + 1, 0).getDate();
    if (fn === "DAYS_REMAINING") return new Date(year, month + 1, 0).getDate() - day;
    if (fn === "YEAR") return year;
    return 0;
}

function applyMetricFunction(fn: MetricFunctionName, args: number[]): number {
    const a = args[0] ?? 0;
    const b = args[1] ?? 0;
    const c = args[2] ?? 0;
    if (fn === "ABS") return Math.abs(a);
    if (fn === "ROUND") return Math.round(a * Math.pow(10, b)) / Math.pow(10, b);
    if (fn === "MIN") return Math.min(a, b);
    if (fn === "MAX") return Math.max(a, b);
    if (fn === "IF") return a !== 0 ? b : c;
    return 0;
}

function evaluateCustomMetricTokens(
    tokens: CustomMetricExpressionToken[],
    resolveFieldValue: (fieldId: PivotFieldId, visited: Set<PivotFieldId>) => number,
    visited: Set<PivotFieldId>
) {
    const reversePolishTokens = toReversePolishExpression(tokens);
    if (!reversePolishTokens) return 0;

    const stack: number[] = [];

    for (const token of reversePolishTokens) {
        if (token.type === "field") {
            stack.push(resolveFieldValue(token.fieldId, visited));
            continue;
        }

        if (token.type === "constant") {
            stack.push(token.value);
            continue;
        }

        if (token.type === "date-constant") {
            stack.push(evaluateDateConstant(token.fn));
            continue;
        }

        if (token.type === "function") {
            const arity = METRIC_FUNCTION_ARITY[token.fn];
            const args: number[] = [];
            for (let i = 0; i < arity; i++) {
                const val = stack.pop();
                if (val === undefined) return 0;
                args.unshift(val);
            }
            stack.push(applyMetricFunction(token.fn, args));
            continue;
        }

        if (token.operator === "%") {
            const value = stack.pop();
            if (value === undefined) return 0;
            stack.push(value / 100);
            continue;
        }

        const right = stack.pop();
        const left = stack.pop();
        if (left === undefined || right === undefined) return 0;
        stack.push(applyMetricOperator(left, right, token.operator));
    }

    return stack.length === 1 ? toFiniteNumber(stack[0]) : 0;
}

function getRecordFieldValue(
    record: GenericRow,
    fieldId: PivotFieldId,
    customMetrics: CustomMetricDefinition[] = [],
    visited = new Set<PivotFieldId>()
): string | number | null {
    if (!isCustomMetricFieldId(fieldId)) {
        return record[fieldId] ?? null;
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
    record: GenericRow,
    fieldId: PivotFieldId,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    const field = getFieldDefinition(fieldId, columns, customMetrics);
    const rawValue = getRecordFieldValue(record, fieldId, customMetrics);

    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return "(Blank)";
    }

    if (isCustomMetricFieldId(fieldId)) {
        const metric = customMetrics.find((m) => m.id === fieldId);
        if (metric) return formatWithCustomMetricFormat(toFiniteNumber(rawValue), metric.format);
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
    record: GenericRow,
    fieldId: PivotFieldId,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    const field = getFieldDefinition(fieldId, columns, customMetrics);
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
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    if (!state) {
        return 0;
    }

    const field = getFieldDefinition(fieldId, columns, customMetrics);

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
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = [],
    visited = new Set<PivotFieldId>()
): number {
    if (visited.has(fieldId)) {
        return 0;
    }

    if (!isCustomMetricFieldId(fieldId)) {
        return resolveAggregationValue(fieldId, states?.[fieldId], columns, customMetrics);
    }

    const metric = getCustomMetricDefinition(fieldId, customMetrics);
    if (!metric) {
        return 0;
    }

    visited.add(fieldId);
    const result = evaluateCustomMetricTokens(
        metric.tokens,
        (currentFieldId, currentVisited) =>
            resolveFieldValueFromAggregationStates(currentFieldId, states, columns, customMetrics, currentVisited),
        visited
    );
    visited.delete(fieldId);

    return result;
}

function formatWithCustomMetricFormat(value: number, format: CustomMetricFormat): string {
    if (format === "percent") return formatPercent(value);
    if (format === "integer") return Math.round(value).toLocaleString("tr-TR");
    if (format === "decimal") return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (format === "currency") return "₺" + value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (format === "multiplier") return value.toFixed(2) + "x";
    if (format === "datetime") {
        const date = new Date(value * 1000 * 60 * 60 * 24);
        return date.toLocaleDateString("tr-TR");
    }
    return formatNumber(value);
}

export function formatAggregatedValue(
    fieldId: PivotFieldId,
    value: number,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    if (isCustomMetricFieldId(fieldId)) {
        const metric = customMetrics.find((m) => m.id === fieldId);
        if (metric) return formatWithCustomMetricFormat(value, metric.format);
    }

    const field = getFieldDefinition(fieldId, columns, customMetrics);
    if (field.format === "percent") return formatPercent(value);
    return formatNumber(value);
}

function buildComboKey(
    record: GenericRow,
    fieldIds: PivotFieldId[],
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    if (fieldIds.length === 0) {
        return {
            key: "__total__",
            labels: ["Grand Total"]
        };
    }

    const labels = fieldIds.map((fieldId) => getDimensionValue(record, fieldId, columns, customMetrics));
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
    const tokens = rawTokens.reduce<CustomMetricExpressionToken[]>((accumulator, token) => {
        if (!token || typeof token !== "object") {
            return accumulator;
        }

        const candidateFieldToken = token as Partial<CustomMetricFieldToken>;
        if (candidateFieldToken.type === "field") {
            if (!isKnownFieldId(candidateFieldToken.fieldId, existingMetrics)) {
                return accumulator;
            }

            return [...accumulator, { type: "field", fieldId: candidateFieldToken.fieldId }];
        }

        const candidateConstantToken = token as Partial<CustomMetricConstantToken>;
        if (
            candidateConstantToken.type === "constant" &&
            typeof candidateConstantToken.value === "number" &&
            Number.isFinite(candidateConstantToken.value)
        ) {
            return [...accumulator, { type: "constant", value: candidateConstantToken.value }];
        }

        const candidateOperatorToken = token as Partial<CustomMetricOperatorToken>;
        if (candidateOperatorToken.type === "operator" && isCustomMetricOperator(candidateOperatorToken.operator)) {
            return [...accumulator, { type: "operator", operator: candidateOperatorToken.operator }];
        }

        const candidateParenthesisToken = token as Partial<CustomMetricParenthesisToken>;
        if (
            candidateParenthesisToken.type === "parenthesis" &&
            isCustomMetricParenthesis(candidateParenthesisToken.value)
        ) {
            return [...accumulator, { type: "parenthesis", value: candidateParenthesisToken.value }];
        }

        const candidateDateConstantToken = token as Partial<CustomMetricDateConstantToken>;
        if (
            candidateDateConstantToken.type === "date-constant" &&
            DATE_CONSTANT_FNS.includes(candidateDateConstantToken.fn as DateConstantFn)
        ) {
            return [...accumulator, { type: "date-constant", fn: candidateDateConstantToken.fn as DateConstantFn }];
        }

        const candidateFunctionToken = token as Partial<CustomMetricFunctionToken>;
        if (
            candidateFunctionToken.type === "function" &&
            METRIC_FUNCTION_NAMES.includes(candidateFunctionToken.fn as MetricFunctionName)
        ) {
            return [...accumulator, { type: "function", fn: candidateFunctionToken.fn as MetricFunctionName }];
        }

        const candidateCommaToken = token as Partial<CustomMetricCommaToken>;
        if (candidateCommaToken.type === "comma") {
            return [...accumulator, { type: "comma" }];
        }

        return accumulator;
    }, []);
    const knownFormats: CustomMetricFormat[] = ["integer", "decimal", "percent", "currency", "multiplier", "datetime"];
    const rawFormat = String(candidate.format ?? "");
    const format: CustomMetricFormat = knownFormats.includes(rawFormat as CustomMetricFormat)
        ? (rawFormat as CustomMetricFormat)
        : rawFormat === "percent" ? "percent" : "integer";
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
        tokens: isValidCustomMetricExpression(tokens)
            ? normalizeExpressionTokens(tokens)
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
                  width: candidate.size.width,
                  height: candidate.size.height
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
            customMetrics: [],
            pinnedFieldIds: []
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

    const pinnedFieldIds = Array.isArray(candidate.pinnedFieldIds)
        ? uniqueFieldIds(candidate.pinnedFieldIds, customMetrics)
        : [];

    return {
        tables: nextTables,
        activeTableId,
        customMetrics,
        pinnedFieldIds
    };
}

export function buildFilterOptions(
    records: GenericRow[],
    filterFields: PivotFieldId[],
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    return filterFields.reduce<Record<string, string[]>>((accumulator, fieldId) => {
        const values = sortCombos(
            Array.from(
                new Map(
                    records.map((record) => {
                        const label = getDimensionValue(record, fieldId, columns, customMetrics);
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
    records: GenericRow[],
    layout: PivotLayout,
    filterSelections: Record<string, string>,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    return records.filter((record) =>
        layout.filters.every((fieldId) => {
            const selectedValue = filterSelections[fieldId] ?? ALL_FILTER_VALUE;
            if (selectedValue === ALL_FILTER_VALUE) {
                return true;
            }

            return getDimensionValue(record, fieldId, columns, customMetrics) === selectedValue;
        })
    );
}

export function buildPivotResult(
    filteredRecords: GenericRow[],
    layout: PivotLayout,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
): PivotResult {
    const valueFields: PivotFieldId[] = layout.values.length > 0 ? layout.values : [];

    if (valueFields.length === 0) {
        const rowMap = new Map<string, PivotCombo>();
        const columnMap = new Map<string, PivotCombo>();
        for (const record of filteredRecords) {
            const rowCombo = buildComboKey(record, layout.rows, columns, customMetrics);
            const columnCombo = buildComboKey(record, layout.columns, columns, customMetrics);
            rowMap.set(rowCombo.key, rowCombo);
            columnMap.set(columnCombo.key, columnCombo);
        }
        if (layout.rows.length === 0 && rowMap.size === 0) rowMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });
        if (layout.columns.length === 0 && columnMap.size === 0) columnMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });
        return {
            valueFields,
            rowCombos: sortCombos(Array.from(rowMap.values())),
            columnCombos: sortCombos(Array.from(columnMap.values())),
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
        const rowCombo = buildComboKey(record, layout.rows, columns, customMetrics);
        const columnCombo = buildComboKey(record, layout.columns, columns, customMetrics);

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
            const input = getMeasureInput(record, fieldId, columns, customMetrics);
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
