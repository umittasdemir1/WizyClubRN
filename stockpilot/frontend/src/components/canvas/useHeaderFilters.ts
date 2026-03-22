import { useState } from "react";
import type {
    HeaderFilterKind,
    HeaderFilterSortDirection,
    HeaderFilterState,
    PivotFieldId
} from "./canvasModel";
import { getHeaderFilterStateKey } from "./canvasHeaderFilters";

export function useHeaderFilters() {
    const [openHeaderFilter, setOpenHeaderFilter] = useState<HeaderFilterState | null>(null);
    const [headerFilterSelections, setHeaderFilterSelections] = useState<Record<string, string[]>>({});
    const [headerFilterSortDirections, setHeaderFilterSortDirections] = useState<
        Record<string, HeaderFilterSortDirection>
    >({});
    const [isTableListOpen, setIsTableListOpen] = useState(false);
    const [openHeaderColorTableId, setOpenHeaderColorTableId] = useState<string | null>(null);

    function updateHeaderFilterSelection(
        tableId: string,
        kind: HeaderFilterKind,
        nextValues: string[],
        allValues: string[],
        fieldId?: PivotFieldId,
        rowIndex?: number
    ) {
        const selectionKey = getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex);
        const allowedValues = new Set(allValues);
        const normalizedValues = Array.from(new Set(nextValues)).filter((value) => allowedValues.has(value));

        setHeaderFilterSelections((current) => {
            if (normalizedValues.length === allValues.length) {
                const nextSelections = { ...current };
                delete nextSelections[selectionKey];
                return nextSelections;
            }
            return { ...current, [selectionKey]: normalizedValues };
        });
    }

    function toggleHeaderFilterSortDirection(
        tableId: string,
        kind: HeaderFilterKind,
        fieldId?: PivotFieldId,
        rowIndex?: number
    ) {
        const stateKey = getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex);
        setHeaderFilterSortDirections((current) => ({
            ...current,
            [stateKey]: current[stateKey] === "desc" ? "asc" : "desc"
        }));
    }

    function clearTableHeaderState(tableId: string) {
        setOpenHeaderFilter((current) => (current?.tableId === tableId ? null : current));
        setOpenHeaderColorTableId((current) => (current === tableId ? null : current));
        setHeaderFilterSelections((current) =>
            Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`)))
        );
        setHeaderFilterSortDirections((current) =>
            Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`)))
        );
    }

    function clearAllHeaderState() {
        setOpenHeaderFilter(null);
        setOpenHeaderColorTableId(null);
    }

    return {
        openHeaderFilter,
        setOpenHeaderFilter,
        headerFilterSelections,
        setHeaderFilterSelections,
        headerFilterSortDirections,
        setHeaderFilterSortDirections,
        isTableListOpen,
        setIsTableListOpen,
        openHeaderColorTableId,
        setOpenHeaderColorTableId,
        updateHeaderFilterSelection,
        toggleHeaderFilterSortDirection,
        clearTableHeaderState,
        clearAllHeaderState
    };
}
