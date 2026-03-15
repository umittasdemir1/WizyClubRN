import {
    compareSortableValues,
    getHeaderFilterStateKey,
    sortByDirection,
    sortHeaderFilterOptions
} from "./canvasHeaderFilters";
import {
    formatAggregatedValue,
    resolveFieldValueFromAggregationStates,
    type AggregationState,
    type HeaderFilterKind,
    type HeaderFilterOption,
    type HeaderFilterSortDirection,
    type PivotFieldId,
    type PivotTableView,
    type PivotCombo
} from "./canvasModel";

export function getHeaderFilterSelectedValues(
    tableId: string,
    kind: HeaderFilterKind,
    allValues: string[],
    headerFilterSelections: Record<string, string[]>,
    fieldId?: PivotFieldId,
    rowIndex?: number
) {
    const selectionKey = getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex);
    const currentValues = headerFilterSelections[selectionKey];
    if (!currentValues) {
        return allValues;
    }

    const allowedValues = new Set(allValues);
    return currentValues.filter((value) => allowedValues.has(value));
}

export function getHeaderFilterSortDirection(
    tableId: string,
    kind: HeaderFilterKind,
    headerFilterSortDirections: Record<string, HeaderFilterSortDirection>,
    fieldId?: PivotFieldId,
    rowIndex?: number
) {
    return (
        headerFilterSortDirections[getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex)] ?? "asc"
    );
}

export function getRowFieldFilterOptions(
    view: PivotTableView,
    fieldId: PivotFieldId,
    rowIndex: number,
    headerFilterSortDirections: Record<string, HeaderFilterSortDirection>
) {
    const options = Array.from(new Set(view.pivotResult.rowCombos.map((combo) => combo.labels[rowIndex]))).map(
        (value) => ({
            label: value,
            value
        })
    );

    return sortHeaderFilterOptions(
        options,
        getHeaderFilterSortDirection(view.table.id, "row-field", headerFilterSortDirections, fieldId, rowIndex)
    );
}

export function getColumnGroupFilterOptions(view: PivotTableView, headerFilterSortDirections: Record<string, HeaderFilterSortDirection>) {
    return sortHeaderFilterOptions(
        view.pivotResult.columnCombos.map((combo) => ({
            label: combo.labels.join(" / "),
            value: combo.key
        })),
        getHeaderFilterSortDirection(view.table.id, "column-group", headerFilterSortDirections)
    );
}

function mergeAggregationMaps(
    accumulator: Record<string, AggregationState>,
    currentStateMap: Record<string, AggregationState> | undefined
) {
    if (!currentStateMap) {
        return accumulator;
    }

    for (const [stateKey, state] of Object.entries(currentStateMap)) {
        const currentEntry = accumulator[stateKey] ?? { sum: 0, count: 0 };
        currentEntry.sum += state.sum;
        currentEntry.count += state.count;
        accumulator[stateKey] = currentEntry;
    }

    return accumulator;
}

function formatResolvedValue(
    view: PivotTableView,
    fieldId: PivotFieldId,
    states: Record<string, AggregationState> | undefined
) {
    return formatAggregatedValue(
        fieldId,
        resolveFieldValueFromAggregationStates(fieldId, states, view.columns, view.customMetrics),
        view.columns,
        view.customMetrics
    );
}

export function renderCell(view: PivotTableView, rowKey: string, columnKey: string, fieldId: PivotFieldId) {
    const rowBucket = view.pivotResult.matrix.get(rowKey);
    const cell = rowBucket?.get(columnKey);
    return formatResolvedValue(view, fieldId, cell);
}

export function getValueFieldFilterOptions(view: PivotTableView, fieldId: PivotFieldId, headerFilterSortDirections: Record<string, HeaderFilterSortDirection>) {
    const options = Array.from(
        new Set(
            view.pivotResult.rowCombos.map((rowCombo) => renderCell(view, rowCombo.key, "__total__", fieldId))
        )
    ).map((value) => ({
        label: value,
        value
    }));

    return sortHeaderFilterOptions(
        options,
        getHeaderFilterSortDirection(view.table.id, "value-field", headerFilterSortDirections, fieldId)
    );
}

export function getVisibleColumnCombos(view: PivotTableView, headerFilterSelections: Record<string, string[]>, headerFilterSortDirections: Record<string, HeaderFilterSortDirection>) {
    if (!view.hasColumnGroups) {
        return view.pivotResult.columnCombos;
    }

    const options = getColumnGroupFilterOptions(view, headerFilterSortDirections);
    const selectedValues = new Set(
        getHeaderFilterSelectedValues(
            view.table.id,
            "column-group",
            options.map((option) => option.value),
            headerFilterSelections
        )
    );
    const sortDirection = getHeaderFilterSortDirection(view.table.id, "column-group", headerFilterSortDirections);

    return [...view.pivotResult.columnCombos]
        .filter((combo) => selectedValues.has(combo.key))
        .sort((left, right) =>
            sortByDirection(
                compareSortableValues(left.labels.join(" / "), right.labels.join(" / ")),
                sortDirection
            )
        );
}

export function getVisibleRowCombos(view: PivotTableView, headerFilterSelections: Record<string, string[]>, headerFilterSortDirections: Record<string, HeaderFilterSortDirection>) {
    const filteredRowCombos = view.pivotResult.rowCombos.filter((rowCombo) => {
        const rowFieldSelectionPasses = view.table.layout.rows.every((fieldId, rowIndex) => {
            const options = getRowFieldFilterOptions(view, fieldId, rowIndex, headerFilterSortDirections);
            const selectedValues = new Set(
                getHeaderFilterSelectedValues(
                    view.table.id,
                    "row-field",
                    options.map((option) => option.value),
                    headerFilterSelections,
                    fieldId,
                    rowIndex
                )
            );

            return selectedValues.has(rowCombo.labels[rowIndex]);
        });

        if (!rowFieldSelectionPasses) {
            return false;
        }

        if (view.hasColumnGroups) {
            return true;
        }

        return view.pivotResult.valueFields.every((fieldId) => {
            const options = getValueFieldFilterOptions(view, fieldId, headerFilterSortDirections);
            const selectedValues = new Set(
                getHeaderFilterSelectedValues(
                    view.table.id,
                    "value-field",
                    options.map((option) => option.value),
                    headerFilterSelections,
                    fieldId
                )
            );

            return selectedValues.has(renderCell(view, rowCombo.key, "__total__", fieldId));
        });
    });

    const explicitValueSortFieldId =
        !view.hasColumnGroups
            ? view.pivotResult.valueFields.find((fieldId) =>
                  Object.prototype.hasOwnProperty.call(
                      headerFilterSortDirections,
                      getHeaderFilterStateKey(view.table.id, "value-field", fieldId)
                  )
              )
            : undefined;

    return [...filteredRowCombos].sort((left, right) => {
        if (explicitValueSortFieldId) {
            const sortDirection = getHeaderFilterSortDirection(
                view.table.id,
                "value-field",
                headerFilterSortDirections,
                explicitValueSortFieldId
            );
            const comparison = compareSortableValues(
                renderCell(view, left.key, "__total__", explicitValueSortFieldId),
                renderCell(view, right.key, "__total__", explicitValueSortFieldId)
            );

            if (comparison !== 0) {
                return sortByDirection(comparison, sortDirection);
            }
        }

        for (const [rowIndex, fieldId] of view.table.layout.rows.entries()) {
            const comparison = compareSortableValues(left.labels[rowIndex], right.labels[rowIndex]);
            if (comparison !== 0) {
                return sortByDirection(
                    comparison,
                    getHeaderFilterSortDirection(view.table.id, "row-field", headerFilterSortDirections, fieldId, rowIndex)
                );
            }
        }

        return 0;
    });
}

export function renderRowTotal(
    view: PivotTableView,
    rowKey: string,
    fieldId: PivotFieldId,
    columnCombos: PivotCombo[]
) {
    const mergedState = columnCombos.reduce<Record<string, AggregationState>>(
        (accumulator, combo) => {
            return mergeAggregationMaps(accumulator, view.pivotResult.matrix.get(rowKey)?.get(combo.key));
        },
        {}
    );

    return formatResolvedValue(view, fieldId, mergedState);
}

export function renderColumnTotal(
    view: PivotTableView,
    columnKey: string,
    fieldId: PivotFieldId,
    rowCombos: PivotCombo[]
) {
    const mergedState = rowCombos.reduce<Record<string, AggregationState>>(
        (accumulator, rowCombo) => {
            return mergeAggregationMaps(accumulator, view.pivotResult.matrix.get(rowCombo.key)?.get(columnKey));
        },
        {}
    );

    return formatResolvedValue(view, fieldId, mergedState);
}

export function renderGrandTotal(
    view: PivotTableView,
    fieldId: PivotFieldId,
    rowCombos: PivotCombo[],
    columnCombos: PivotCombo[]
) {
    const mergedState = rowCombos.reduce<Record<string, AggregationState>>(
        (accumulator, rowCombo) => {
            for (const combo of columnCombos) {
                mergeAggregationMaps(accumulator, view.pivotResult.matrix.get(rowCombo.key)?.get(combo.key));
            }

            return accumulator;
        },
        {}
    );

    return formatResolvedValue(view, fieldId, mergedState);
}
