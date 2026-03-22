import type { ColumnMeta } from "../../../types/stock";
import { formatPercent, formatNumber } from "../../../utils/formatting";
import {
    type AggregationState,
    type ColumnOverride,
    type CustomMetricDefinition,
    type CustomMetricId,
    type PivotFieldDefinition,
    type PivotFieldFormat,
    type PivotFieldId,
    DATE_CONSTANT_LABELS
} from "./types";
import {
    evaluateCustomMetricTokens,
    formatCustomMetricOperatorLabel,
    normalizeExpressionTokens,
    toFiniteNumber
} from "./customMetrics";

// ── Field utilities ───────────────────────────────────────────────────────────

export function isCustomMetricFieldId(fieldId: PivotFieldId): fieldId is CustomMetricId {
    return fieldId.startsWith("custom:");
}

function mapCustomMetricFormatToPivotFormat(format: import("./types").CustomMetricFormat): PivotFieldFormat {
    return format === "percent" ? "percent" : "number";
}

export function buildCustomMetricFieldDefinition(metric: CustomMetricDefinition): PivotFieldDefinition {
    return {
        id: metric.id,
        label: metric.name,
        kind: "measure",
        summary: "formula",
        format: mapCustomMetricFormatToPivotFormat(metric.format)
    };
}

export function columnMetaToFieldDefinition(col: ColumnMeta, overrides: Record<string, ColumnOverride> = {}): PivotFieldDefinition {
    const override = overrides[col.key];
    const effectiveType = override?.typeOverride ?? col.type;
    return {
        id: col.key,
        label: override?.label ?? col.label,
        kind: effectiveType === "numeric" ? "measure" : "dimension",
        summary: effectiveType === "numeric" ? "sum" : "count",
        format: effectiveType === "numeric" ? "number" : effectiveType === "date" ? "date" : "text"
    };
}

export const FALLBACK_FIELD_DEF = (fieldId: PivotFieldId): PivotFieldDefinition => ({
    id: fieldId,
    label: fieldId,
    kind: "dimension",
    summary: "count",
    format: "text"
});

export function getAvailablePivotFields(
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = [],
    columnOverrides: Record<string, ColumnOverride> = {}
) {
    return [
        ...columns.map((col) => columnMetaToFieldDefinition(col, columnOverrides)),
        ...customMetrics.map(buildCustomMetricFieldDefinition)
    ];
}

export function getMeasureFieldDefinitions(
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = [],
    columnOverrides: Record<string, ColumnOverride> = {}
) {
    return getAvailablePivotFields(columns, customMetrics, columnOverrides).filter((field) => field.kind === "measure");
}

export function getFieldDefinition(
    fieldId: PivotFieldId,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = [],
    columnOverrides: Record<string, ColumnOverride> = {}
) {
    if (isCustomMetricFieldId(fieldId)) {
        const metric = customMetrics.find((m) => m.id === fieldId);
        return metric ? buildCustomMetricFieldDefinition(metric) : FALLBACK_FIELD_DEF(fieldId);
    }
    const col = columns.find((c) => c.key === fieldId);
    return col ? columnMetaToFieldDefinition(col, columnOverrides) : FALLBACK_FIELD_DEF(fieldId);
}

// ── Pre-computed Map-based lookups for hot paths (O(1) instead of .find()) ──

export function buildFieldLookupMaps(columns: ColumnMeta[], customMetrics: CustomMetricDefinition[]) {
    const colMap = new Map<string, ColumnMeta>(columns.map((c) => [c.key, c]));
    const metricMap = new Map<string, CustomMetricDefinition>(customMetrics.map((m) => [m.id, m]));
    return { colMap, metricMap };
}

export function getFieldDefinitionFast(
    fieldId: PivotFieldId,
    colMap: Map<string, ColumnMeta>,
    metricMap: Map<string, CustomMetricDefinition>,
    columnOverrides: Record<string, ColumnOverride> = {}
) {
    if (isCustomMetricFieldId(fieldId)) {
        const metric = metricMap.get(fieldId);
        return metric ? buildCustomMetricFieldDefinition(metric) : FALLBACK_FIELD_DEF(fieldId);
    }
    const col = colMap.get(fieldId);
    return col ? columnMetaToFieldDefinition(col, columnOverrides) : FALLBACK_FIELD_DEF(fieldId);
}

export function resolveAggregationValueFast(
    fieldId: PivotFieldId,
    state: AggregationState | undefined,
    colMap: Map<string, ColumnMeta>,
    metricMap: Map<string, CustomMetricDefinition>
) {
    if (!state) return 0;
    const field = getFieldDefinitionFast(fieldId, colMap, metricMap);
    if (field.summary === "count") return state.count;
    if (field.summary === "avg") return state.count > 0 ? state.sum / state.count : 0;
    return state.sum;
}

function getCustomMetricDefinitionFast(
    fieldId: PivotFieldId,
    metricMap: Map<string, CustomMetricDefinition>
) {
    return metricMap.get(fieldId) ?? null;
}

export function resolveFieldValueFromAggregationStatesFast(
    fieldId: PivotFieldId,
    states: Record<string, AggregationState> | undefined,
    colMap: Map<string, ColumnMeta>,
    metricMap: Map<string, CustomMetricDefinition>,
    visited = new Set<PivotFieldId>()
): number {
    if (visited.has(fieldId)) return 0;

    if (!isCustomMetricFieldId(fieldId)) {
        return resolveAggregationValueFast(fieldId, states?.[fieldId], colMap, metricMap);
    }

    const metric = getCustomMetricDefinitionFast(fieldId, metricMap);
    if (!metric) return 0;

    visited.add(fieldId);
    const result = evaluateCustomMetricTokens(
        metric.tokens,
        (currentFieldId, currentVisited) =>
            resolveFieldValueFromAggregationStatesFast(currentFieldId, states, colMap, metricMap, currentVisited),
        visited
    );
    visited.delete(fieldId);
    return result;
}

export function formatAggregatedValueFast(
    fieldId: PivotFieldId,
    value: number,
    colMap: Map<string, ColumnMeta>,
    metricMap: Map<string, CustomMetricDefinition>,
    columnOverrides: Record<string, ColumnOverride> = {}
) {
    if (isCustomMetricFieldId(fieldId)) {
        const metric = metricMap.get(fieldId);
        if (metric) return formatWithCustomMetricFormat(value, metric.format);
    }

    const override = columnOverrides[fieldId];
    if (override) return formatWithCustomMetricFormat(value, override.format);

    const field = getFieldDefinitionFast(fieldId, colMap, metricMap);
    if (field.format === "percent") return formatPercent(value);
    return formatNumber(value);
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

// ── Formatting helper (needed by formatAggregatedValueFast above) ─────────────
// This is intentionally in fields.ts (not formatting.ts) because it's used
// both here and by formatting.ts, and importing from formatting.ts would create
// a circular dep (formatting.ts imports from fields.ts).

export function formatWithCustomMetricFormat(value: number, format: import("./types").CustomMetricFormat): string {
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

export { toFiniteNumber };
