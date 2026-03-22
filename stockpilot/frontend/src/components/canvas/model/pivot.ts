import type { ColumnMeta, GenericRow } from "../../../types/stock";
import { formatNullableDate, formatPercent, formatNumber } from "../../../utils/formatting";
import {
    type AggregationState,
    type ColumnOverride,
    type CustomMetricCommaToken,
    type CustomMetricConstantToken,
    type CustomMetricDateConstantToken,
    type CustomMetricDefinition,
    type CustomMetricFieldToken,
    type CustomMetricFormat,
    type CustomMetricFunctionToken,
    type CustomMetricId,
    type CustomMetricOperator,
    type CustomMetricOperatorToken,
    type CustomMetricParenthesisToken,
    type DateConstantFn,
    type MetricFunctionName,
    type PivotCombo,
    type PivotFieldId,
    type PivotLayout,
    type PivotResult,
    type PivotTableInstance,
    type StudioCanvasState,
    ALL_FILTER_VALUE,
    DEFAULT_LAYOUT,
    DEFAULT_TABLE_HEADER_COLOR,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_WIDTH
} from "./types";
import {
    buildCustomMetricFieldDefinition,
    columnMetaToFieldDefinition,
    FALLBACK_FIELD_DEF,
    isCustomMetricFieldId,
    formatWithCustomMetricFormat,
    toFiniteNumber
} from "./fields";
import {
    DATE_CONSTANT_FNS,
    evaluateCustomMetricTokens,
    isCustomMetricOperator,
    isCustomMetricParenthesis,
    isValidCustomMetricExpression,
    METRIC_FUNCTION_NAMES,
    normalizeExpressionTokens
} from "./customMetrics";
import { resolveTableHeaderColor } from "./formatting";

// ── Private helpers ───────────────────────────────────────────────────────────

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

    const candidate = value as Partial<Record<"filters" | "columns" | "rows" | "values", PivotFieldId[]>>;

    return {
        filters: uniqueFieldIds(candidate.filters ?? DEFAULT_LAYOUT.filters, customMetrics),
        columns: uniqueFieldIds(candidate.columns ?? DEFAULT_LAYOUT.columns, customMetrics),
        rows: uniqueFieldIds(candidate.rows ?? DEFAULT_LAYOUT.rows, customMetrics),
        values: uniqueFieldIds(candidate.values ?? DEFAULT_LAYOUT.values, customMetrics)
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

    const metric = customMetrics.find((m) => m.id === fieldId) ?? null;
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

    const metric = customMetrics.find((m) => m.id === fieldId) ?? null;
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

function fieldDefFromMaps(
    fieldId: PivotFieldId,
    colMap: Map<string, ColumnMeta>,
    metricMap: Map<string, CustomMetricDefinition>
) {
    if (isCustomMetricFieldId(fieldId)) {
        const m = metricMap.get(fieldId);
        return m ? buildCustomMetricFieldDefinition(m) : FALLBACK_FIELD_DEF(fieldId);
    }
    const col = colMap.get(fieldId);
    return col ? columnMetaToFieldDefinition(col) : FALLBACK_FIELD_DEF(fieldId);
}

function getDimensionValueFast(
    record: GenericRow,
    fieldId: PivotFieldId,
    fieldDef: ReturnType<typeof fieldDefFromMaps>,
    customMetrics: CustomMetricDefinition[]
): string {
    let rawValue: unknown;
    if (isCustomMetricFieldId(fieldId)) {
        rawValue = getRecordFieldValue(record, fieldId, customMetrics);
    } else {
        rawValue = record[fieldId] ?? null;
    }
    if (rawValue === null || rawValue === undefined || rawValue === "") return "(Blank)";
    if (isCustomMetricFieldId(fieldId)) {
        const metric = customMetrics.find((m) => m.id === fieldId);
        if (metric) return formatWithCustomMetricFormat(toFiniteNumber(rawValue), metric.format);
    }
    if (fieldDef.format === "date") return formatNullableDate(typeof rawValue === "string" ? rawValue : String(rawValue));
    if (fieldDef.format === "percent") return formatPercent(toFiniteNumber(rawValue));
    if (fieldDef.format === "number") return formatNumber(toFiniteNumber(rawValue));
    return String(rawValue);
}

function createTableId() {
    return `pivot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultTableSize() {
    return {
        width: DEFAULT_TABLE_WIDTH,
        height: DEFAULT_TABLE_HEIGHT
    };
}

// ── Public exports ────────────────────────────────────────────────────────────

export function resolveAggregationValue(
    fieldId: PivotFieldId,
    state: AggregationState | undefined,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    if (!state) {
        return 0;
    }

    const field = (() => {
        if (isCustomMetricFieldId(fieldId)) {
            const metric = customMetrics.find((m) => m.id === fieldId);
            return metric ? buildCustomMetricFieldDefinition(metric) : FALLBACK_FIELD_DEF(fieldId);
        }
        const col = columns.find((c) => c.key === fieldId);
        return col ? columnMetaToFieldDefinition(col) : FALLBACK_FIELD_DEF(fieldId);
    })();

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

    const metric = customMetrics.find((m) => m.id === fieldId) ?? null;
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

export function getActionBarNameWidth(label: string) {
    const normalizedLabel = label.trim();
    const estimatedWidth = Math.ceil(normalizedLabel.length * 9 + 48);
    return Math.min(240, Math.max(116, estimatedWidth));
}

export function createPivotTable(index: number): PivotTableInstance {
    const cascade = (index - 1) * 36;
    return {
        id: createTableId(),
        name: `Table ${index}`,
        layout: DEFAULT_LAYOUT,
        headerColor: DEFAULT_TABLE_HEADER_COLOR,
        filterSelections: {},
        scale: 1,
        position: {
            x: cascade,
            y: cascade
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
    const tokens = rawTokens.reduce<import("./types").CustomMetricExpressionToken[]>((accumulator, token) => {
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
    const scale =
        typeof (candidate as { scale?: unknown }).scale === "number" &&
        Number.isFinite((candidate as { scale?: unknown }).scale as number) &&
        (candidate as { scale?: unknown }).scale as number > 0
            ? (candidate as { scale?: unknown }).scale as number
            : 1;

    return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : fallback.id,
        name: typeof candidate.name === "string" && candidate.name ? candidate.name : fallback.name,
        layout: sanitizeLayout(candidate.layout, customMetrics),
        headerColor: resolveTableHeaderColor(candidate.headerColor),
        filterSelections: nextFilterSelections,
        position: nextPosition,
        size: nextSize,
        scale
    };
}

export function sanitizeStudioState(value: unknown): StudioCanvasState {
    if (!value || typeof value !== "object") {
        const initialTable = createPivotTable(1);
        return {
            tables: [initialTable],
            activeTableId: initialTable.id,
            customMetrics: [],
            pinnedFieldIds: [],
            columnOverrides: {}
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

    const columnOverrides =
        candidate.columnOverrides && typeof candidate.columnOverrides === "object" && !Array.isArray(candidate.columnOverrides)
            ? (candidate.columnOverrides as Record<string, ColumnOverride>)
            : {};

    return {
        tables: nextTables,
        activeTableId,
        customMetrics,
        pinnedFieldIds,
        columnOverrides
    };
}

export function buildFilterOptions(
    records: GenericRow[],
    filterFields: PivotFieldId[],
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
) {
    const colMap = new Map<string, ColumnMeta>(columns.map((c) => [c.key, c]));
    const metricMap = new Map<string, CustomMetricDefinition>(customMetrics.map((m) => [m.id, m]));
    const fieldDefs = filterFields.map((id) => fieldDefFromMaps(id, colMap, metricMap));

    return filterFields.reduce<Record<string, string[]>>((accumulator, fieldId, i) => {
        const fieldDef = fieldDefs[i];
        const values = sortCombos(
            Array.from(
                new Map(
                    records.map((record) => {
                        const label = getDimensionValueFast(record, fieldId, fieldDef, customMetrics);
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
    if (layout.filters.length === 0) return records;
    const colMap = new Map<string, ColumnMeta>(columns.map((c) => [c.key, c]));
    const metricMap = new Map<string, CustomMetricDefinition>(customMetrics.map((m) => [m.id, m]));
    const fieldDefs = layout.filters.map((id) => fieldDefFromMaps(id, colMap, metricMap));

    return records.filter((record) =>
        layout.filters.every((fieldId, i) => {
            const selectedValue = filterSelections[fieldId] ?? ALL_FILTER_VALUE;
            if (selectedValue === ALL_FILTER_VALUE) return true;
            return getDimensionValueFast(record, fieldId, fieldDefs[i], customMetrics) === selectedValue;
        })
    );
}

export function buildPivotResult(
    filteredRecords: GenericRow[],
    layout: PivotLayout,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = []
): PivotResult {
    // ── Pre-build O(1) lookup maps — avoids columns.find() per row×field ────
    const colMap = new Map<string, ColumnMeta>(columns.map((c) => [c.key, c]));
    const metricMap = new Map<string, CustomMetricDefinition>(customMetrics.map((m) => [m.id, m]));

    // Pre-compute field defs for layout fields once (not per record)
    const rowFieldDefs = layout.rows.map((id) => fieldDefFromMaps(id, colMap, metricMap));
    const colFieldDefs = layout.columns.map((id) => fieldDefFromMaps(id, colMap, metricMap));

    function getRowCombo(record: GenericRow): PivotCombo {
        if (layout.rows.length === 0) return { key: "__total__", labels: ["Grand Total"] };
        const labels = layout.rows.map((id, i) => getDimensionValueFast(record, id, rowFieldDefs[i], customMetrics));
        return { key: labels.join("|||"), labels };
    }

    function getColCombo(record: GenericRow): PivotCombo {
        if (layout.columns.length === 0) return { key: "__total__", labels: ["Grand Total"] };
        const labels = layout.columns.map((id, i) => getDimensionValueFast(record, id, colFieldDefs[i], customMetrics));
        return { key: labels.join("|||"), labels };
    }
    // ────────────────────────────────────────────────────────────────────────

    const valueFields: PivotFieldId[] = layout.values.length > 0 ? layout.values : [];

    if (valueFields.length === 0) {
        const rowMap = new Map<string, PivotCombo>();
        const columnMap = new Map<string, PivotCombo>();
        for (const record of filteredRecords) {
            const rowCombo = getRowCombo(record);
            const colCombo = getColCombo(record);
            rowMap.set(rowCombo.key, rowCombo);
            columnMap.set(colCombo.key, colCombo);
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

    // Pre-compute agg field defs once
    const aggFieldDefs = aggregateFieldIds.map((id) => fieldDefFromMaps(id, colMap, metricMap));
    const nAgg = aggregateFieldIds.length;

    const rowMap = new Map<string, PivotCombo>();
    const columnMap = new Map<string, PivotCombo>();
    const matrix = new Map<string, Map<string, Record<string, AggregationState>>>();

    for (const record of filteredRecords) {
        const rowCombo = getRowCombo(record);
        const colCombo = getColCombo(record);

        if (!rowMap.has(rowCombo.key)) rowMap.set(rowCombo.key, rowCombo);
        if (!columnMap.has(colCombo.key)) columnMap.set(colCombo.key, colCombo);

        let rowBucket = matrix.get(rowCombo.key);
        if (!rowBucket) { rowBucket = new Map(); matrix.set(rowCombo.key, rowBucket); }

        let cell = rowBucket.get(colCombo.key);
        if (!cell) {
            cell = {} as Record<string, AggregationState>;
            for (const id of aggregateFieldIds) cell[id] = { sum: 0, count: 0 };
            rowBucket.set(colCombo.key, cell);
        }

        // Inline measure accumulation — no getFieldDefinition call per record
        for (let i = 0; i < nAgg; i++) {
            const fieldId = aggregateFieldIds[i];
            const fieldDef = aggFieldDefs[i];
            let rawValue: unknown;
            if (isCustomMetricFieldId(fieldId)) {
                rawValue = getRecordFieldValue(record, fieldId, customMetrics);
            } else {
                rawValue = record[fieldId] ?? null;
            }
            const aggCell = cell[fieldId];
            if (fieldDef.kind === "dimension" || fieldDef.summary === "count") {
                const has = rawValue !== null && rawValue !== undefined && rawValue !== "";
                aggCell.sum += has ? 1 : 0;
                aggCell.count += has ? 1 : 0;
            } else {
                aggCell.sum += toFiniteNumber(rawValue);
                aggCell.count += 1;
            }
        }
    }

    if (layout.rows.length === 0 && rowMap.size === 0) rowMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });
    if (layout.columns.length === 0 && columnMap.size === 0) columnMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });

    return {
        valueFields,
        rowCombos: sortCombos(Array.from(rowMap.values())),
        columnCombos: sortCombos(Array.from(columnMap.values())),
        matrix
    };
}
