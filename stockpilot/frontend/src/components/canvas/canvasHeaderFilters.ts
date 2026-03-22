import type {
    HeaderFilterKind,
    HeaderFilterOption,
    HeaderFilterSortDirection,
    PivotFieldId
} from "./canvasModel";

export function getHeaderFilterStateKey(
    tableId: string,
    kind: HeaderFilterKind,
    fieldId?: PivotFieldId,
    rowIndex?: number
) {
    if (kind === "row-field") {
        return `${tableId}:${kind}:${fieldId}:${rowIndex}`;
    }

    if (kind === "value-field") {
        return `${tableId}:${kind}:${fieldId}`;
    }

    return `${tableId}:${kind}`;
}

function parseSortableNumber(value: string) {
    const normalizedValue = value.trim().replace(/,/g, "").replace(/%$/g, "");
    if (!/^[+-]?\d+(\.\d+)?$/.test(normalizedValue)) {
        return null;
    }

    const parsedValue = Number.parseFloat(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseSortableDate(value: string) {
    if (!/[/-]/.test(value)) {
        return null;
    }

    const parsedValue = Date.parse(value);
    return Number.isNaN(parsedValue) ? null : parsedValue;
}

export function compareSortableValues(left: string, right: string) {
    const leftNumber = parseSortableNumber(left);
    const rightNumber = parseSortableNumber(right);

    if (leftNumber !== null && rightNumber !== null) {
        return leftNumber - rightNumber;
    }

    const leftDate = parseSortableDate(left);
    const rightDate = parseSortableDate(right);

    if (leftDate !== null && rightDate !== null) {
        return leftDate - rightDate;
    }

    return left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base"
    });
}

export function sortByDirection(value: number, direction: HeaderFilterSortDirection) {
    return direction === "asc" ? value : value * -1;
}

export function sortHeaderFilterOptions(
    options: HeaderFilterOption[],
    direction: HeaderFilterSortDirection
) {
    return [...options].sort((left, right) =>
        sortByDirection(compareSortableValues(left.label, right.label), direction)
    );
}
