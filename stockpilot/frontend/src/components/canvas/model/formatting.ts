import type { ColumnMeta } from "../../../types/stock";
import { formatPercent, formatNumber } from "../../../utils/formatting";
import {
    type ColumnOverride,
    type CustomMetricDefinition,
    type PivotFieldId,
    DEFAULT_TABLE_HEADER_COLOR
} from "./types";
import {
    getFieldDefinition,
    isCustomMetricFieldId,
    formatWithCustomMetricFormat
} from "./fields";

export { formatWithCustomMetricFormat };

export function formatAggregatedValue(
    fieldId: PivotFieldId,
    value: number,
    columns: ColumnMeta[] = [],
    customMetrics: CustomMetricDefinition[] = [],
    columnOverrides: Record<string, ColumnOverride> = {}
) {
    if (isCustomMetricFieldId(fieldId)) {
        const metric = customMetrics.find((m) => m.id === fieldId);
        if (metric) return formatWithCustomMetricFormat(value, metric.format);
    }

    const override = columnOverrides[fieldId];
    if (override) return formatWithCustomMetricFormat(value, override.format);

    const field = getFieldDefinition(fieldId, columns, customMetrics);
    if (field.format === "percent") return formatPercent(value);
    return formatNumber(value);
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
