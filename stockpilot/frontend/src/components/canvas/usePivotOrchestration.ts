import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, ColumnMeta } from "../../types/stock";
import {
    DEFAULT_LAYOUT,
    applyFilters,
    buildFilterOptions,
    buildPivotResult,
    createCustomMetricDefinition,
    createPivotTable,
    getAvailablePivotFields,
    sanitizeStudioState,
    type ColumnOverride,
    type CustomMetricDefinition,
    type CustomMetricId,
    type DragState,
    type HeaderFilterKind,
    type HeaderFilterSortDirection,
    type HeaderFilterState,
    type PivotFieldId,
    type PivotTableInstance,
    type PivotTableView,
    type PivotZoneId
} from "./canvasModel";
import { loadStudioState, persistStudioState } from "./canvasStorage";
import { getHeaderFilterStateKey } from "./canvasHeaderFilters";

export function usePivotOrchestration(analysis: AnalysisResult | null) {
    const initialState = useMemo(() => sanitizeStudioState(null), []);
    const [tables, setTables] = useState<PivotTableInstance[]>(initialState.tables);
    const [activeTableId, setActiveTableId] = useState<string | null>(initialState.activeTableId);
    const [lastActiveTableId, setLastActiveTableId] = useState<string | null>(initialState.activeTableId);
    const [customMetrics, setCustomMetrics] = useState<CustomMetricDefinition[]>(initialState.customMetrics);
    const [pinnedFieldIds, setPinnedFieldIds] = useState<PivotFieldId[]>(initialState.pinnedFieldIds);
    const [columnOverrides, setColumnOverrides] = useState<Record<string, ColumnOverride>>(initialState.columnOverrides);
    
    // Drag and Drop State
    const [dragZone, setDragZone] = useState<PivotZoneId | null>(null);
    const [activeDrag, setActiveDrag] = useState<DragState | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ zoneId: PivotZoneId; index: number } | null>(null);
    
    // Header & Filter State
    const [openHeaderFilter, setOpenHeaderFilter] = useState<HeaderFilterState | null>(null);
    const [headerFilterSelections, setHeaderFilterSelections] = useState<Record<string, string[]>>({});
    const [headerFilterSortDirections, setHeaderFilterSortDirections] = useState<
        Record<string, HeaderFilterSortDirection>
    >({});
    const [isTableListOpen, setIsTableListOpen] = useState(false);
    const [openHeaderColorTableId, setOpenHeaderColorTableId] = useState<string | null>(null);
    
    // Rename State
    const [editingTableId, setEditingTableId] = useState<string | null>(null);
    const [tableNameDraft, setTableNameDraft] = useState("");

    // Refs
    const tableElementRefs = useRef<Record<string, HTMLTableElement | null>>({});

    // Persistence
    useEffect(() => {
        const nextState = loadStudioState();
        setTables(nextState.tables);
        setActiveTableId(nextState.activeTableId);
        setCustomMetrics(nextState.customMetrics);
        setPinnedFieldIds(nextState.pinnedFieldIds);
        setColumnOverrides(nextState.columnOverrides);
    }, []);

    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const state = { tables, activeTableId, customMetrics, pinnedFieldIds, columnOverrides };
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => persistStudioState(state), 500);
    }, [activeTableId, customMetrics, tables, pinnedFieldIds, columnOverrides]);

    // Derived States
    useEffect(() => {
        if (activeTableId) {
            setLastActiveTableId(activeTableId);
        }
    }, [activeTableId]);

    useEffect(() => {
        if (lastActiveTableId && !tables.some((table) => table.id === lastActiveTableId)) {
            setLastActiveTableId(tables[0]?.id ?? null);
        }
    }, [lastActiveTableId, tables]);

    useEffect(() => {
        if (openHeaderColorTableId && !tables.some((table) => table.id === openHeaderColorTableId)) {
            setOpenHeaderColorTableId(null);
        }
    }, [openHeaderColorTableId, tables]);

    useEffect(() => {
        if (!openHeaderFilter) {
            return;
        }

        const table = tables.find((currentTable) => currentTable.id === openHeaderFilter.tableId);
        if (!table) {
            setOpenHeaderFilter(null);
            return;
        }

        if (
            openHeaderFilter.kind === "row-field" &&
            (!openHeaderFilter.fieldId ||
                table.layout.rows[openHeaderFilter.rowIndex ?? -1] !== openHeaderFilter.fieldId)
        ) {
            setOpenHeaderFilter(null);
            return;
        }

        if (openHeaderFilter.kind === "column-group" && table.layout.columns.length === 0) {
            setOpenHeaderFilter(null);
            return;
        }

        if (
            openHeaderFilter.kind === "value-field" &&
            (!openHeaderFilter.fieldId ||
                table.layout.columns.length > 0 ||
                !table.layout.values.includes(openHeaderFilter.fieldId))
        ) {
            setOpenHeaderFilter(null);
        }
    }, [openHeaderFilter, tables]);

    const activeTable = useMemo(
        () =>
            activeTableId
                ? tables.find((table) => table.id === activeTableId) ?? null
                : null,
        [activeTableId, tables]
    );

    useEffect(() => {
        if (activeTableId && !tables.some((table) => table.id === activeTableId)) {
            setActiveTableId(null);
        }
    }, [activeTableId, tables]);

    const rows = analysis?.rows ?? [];
    const columns: ColumnMeta[] = analysis?.columns ?? [];
    const fieldDefinitions = useMemo(() => getAvailablePivotFields(columns, customMetrics, columnOverrides), [columns, customMetrics, columnOverrides]);

    const pivotCache = useRef<Map<string, { cacheKey: string; tableRef: PivotTableInstance; view: PivotTableView }>>(
        new Map()
    );
    const prevRowsRef = useRef(rows);
    const prevCustomMetricsKeyRef = useRef(JSON.stringify(customMetrics));

    const customMetricsKey = JSON.stringify(customMetrics);

    if (prevRowsRef.current !== rows || prevCustomMetricsKeyRef.current !== customMetricsKey) {
        pivotCache.current.clear();
        prevRowsRef.current = rows;
        prevCustomMetricsKeyRef.current = customMetricsKey;
    }

    const tableViews = useMemo<PivotTableView[]>(
        () =>
            tables.map((table) => {
                const layoutKey = JSON.stringify(table.layout);
                const filtersKey = JSON.stringify(table.filterSelections);
                const cacheKey = `${layoutKey}|${filtersKey}|${customMetricsKey}`;

                const cached = pivotCache.current.get(table.id);
                if (cached && cached.cacheKey === cacheKey) {
                    if (cached.tableRef === table && cached.view.columnOverrides === columnOverrides) return cached.view;
                    const updated = {
                        ...cached,
                        tableRef: table,
                        view: { ...cached.view, table, columnOverrides }
                    };
                    pivotCache.current.set(table.id, updated);
                    return updated.view;
                }

                const filterOptions = buildFilterOptions(rows, table.layout.filters, columns, customMetrics);
                const filteredRecords = applyFilters(rows, table.layout, table.filterSelections, columns, customMetrics);
                const pivotResult = buildPivotResult(filteredRecords, table.layout, columns, customMetrics);
                const hasColumnGroups = table.layout.columns.length > 0;
                const hasMultipleValueFields = pivotResult.valueFields.length > 1;

                const entry = {
                    cacheKey,
                    tableRef: table,
                    view: {
                        table,
                        columns,
                        columnOverrides,
                        filterOptions,
                        filteredRecords,
                        pivotResult,
                        hasColumnGroups,
                        hasMultipleValueFields,
                        showSecondaryHeaderRow: hasColumnGroups && hasMultipleValueFields,
                        customMetrics
                    }
                };
                pivotCache.current.set(table.id, entry);
                return entry.view;
            }),
        [columnOverrides, columns, customMetrics, customMetricsKey, rows, tables]
    );

    const activeLayout = activeTable?.layout ?? DEFAULT_LAYOUT;
    const visibleTableViews = useMemo(
        () => tableViews.filter((view) => {
            const layout = view.table.layout;
            return layout.values.length > 0 || layout.rows.length > 0 || layout.columns.length > 0 || layout.filters.length > 0;
        }),
        [tableViews]
    );
    const activeTableView = useMemo(
        () => (activeTableId ? tableViews.find((view) => view.table.id === activeTableId) ?? null : null),
        [activeTableId, tableViews]
    );

    // Actions
    function updateTable(tableId: string, updater: (table: PivotTableInstance) => PivotTableInstance) {
        setTables((current) =>
            current.map((table) => (table.id === tableId ? updater(table) : table))
        );
    }

    function updateTableHeaderColor(tableId: string, headerColor: string) {
        updateTable(tableId, (table) => ({
            ...table,
            headerColor
        }));
    }

    function addCustomMetric(value: Omit<CustomMetricDefinition, "id">) {
        const nextMetric = createCustomMetricDefinition(value, customMetrics);
        setCustomMetrics((current) => [...current, nextMetric]);
        return nextMetric;
    }

    function deleteCustomMetric(id: CustomMetricId) {
        setCustomMetrics((current) => current.filter((m) => m.id !== id));
        setTables((current) =>
            current.map((table) => ({
                ...table,
                layout: {
                    filters: table.layout.filters.filter((f) => f !== id),
                    columns: table.layout.columns.filter((f) => f !== id),
                    rows: table.layout.rows.filter((f) => f !== id),
                    values: table.layout.values.filter((f) => f !== id)
                }
            }))
        );
    }

    function getDropTargetTable() {
        if (activeTable) {
            return activeTable;
        }

        if (lastActiveTableId) {
            const lastActiveTable = tables.find((table) => table.id === lastActiveTableId);
            if (lastActiveTable) {
                return lastActiveTable;
            }
        }

        return tables[0] ?? null;
    }

    function updateActiveTable(updater: (table: PivotTableInstance) => PivotTableInstance) {
        if (!activeTable) {
            return;
        }
        updateTable(activeTable.id, updater);
    }

    function addTable() {
        const nextTable = createPivotTable(tables.length + 1);
        setTables((current) => [...current, nextTable]);
        setActiveTableId(nextTable.id);
        setOpenHeaderFilter(null);
        setOpenHeaderColorTableId(null);
        setIsTableListOpen(false);
    }

    function deleteTable(tableId: string) {
        const currentIndex = tables.findIndex((table) => table.id === tableId);
        if (currentIndex === -1) {
            return;
        }

        const remainingTables = tables.filter((table) => table.id !== tableId);

        if (remainingTables.length === 0) {
            const fallbackTable = createPivotTable(1);
            setTables([fallbackTable]);
            setActiveTableId(fallbackTable.id);
            setLastActiveTableId(fallbackTable.id);
            setOpenHeaderFilter(null);
            setOpenHeaderColorTableId(null);
            setHeaderFilterSelections((current) =>
                Object.fromEntries(
                    Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`))
                )
            );
            setHeaderFilterSortDirections((current) =>
                Object.fromEntries(
                    Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`))
                )
            );
            setIsTableListOpen(false);
            cancelTableRename();
            return;
        }

        let nextActiveTable = remainingTables[Math.min(currentIndex, remainingTables.length - 1)];

        setTables(remainingTables);
        setActiveTableId((currentActiveTableId) =>
            currentActiveTableId === tableId || !remainingTables.some((table) => table.id === currentActiveTableId)
                ? nextActiveTable.id
                : currentActiveTableId
        );
        setLastActiveTableId(nextActiveTable.id);
        setOpenHeaderFilter((currentOpenHeaderFilter) =>
            currentOpenHeaderFilter?.tableId === tableId ? null : currentOpenHeaderFilter
        );
        setOpenHeaderColorTableId((currentOpenHeaderColorTableId) =>
            currentOpenHeaderColorTableId === tableId ? null : currentOpenHeaderColorTableId
        );
        setHeaderFilterSelections((current) =>
            Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`)))
        );
        setHeaderFilterSortDirections((current) =>
            Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`)))
        );
        setIsTableListOpen((currentOpenState) =>
            currentOpenState && remainingTables.some((table) => table.layout.values.length > 0) ? currentOpenState : false
        );

        if (editingTableId === tableId) {
            cancelTableRename();
        }
    }

    function removeFieldFromZone(fieldId: PivotFieldId, zoneId: PivotZoneId) {
        updateActiveTable((table) => ({
            ...table,
            layout: {
                ...table.layout,
                [zoneId]: table.layout[zoneId].filter((item) => item !== fieldId)
            }
        }));
    }

    function insertFieldIntoZone(fieldId: PivotFieldId, zoneId: PivotZoneId, targetIndex: number) {
        const targetTable = getDropTargetTable();
        if (!targetTable) {
            return;
        }

        if (activeTableId !== targetTable.id) {
            setActiveTableId(targetTable.id);
        }

        updateTable(targetTable.id, (table) => {
            const nextLayout = {
                filters: table.layout.filters.filter((item) => item !== fieldId),
                columns: table.layout.columns.filter((item) => item !== fieldId),
                rows: table.layout.rows.filter((item) => item !== fieldId),
                values: table.layout.values.filter((item) => item !== fieldId)
            };
            const nextZoneFields = [...nextLayout[zoneId]];
            const boundedIndex = Math.max(0, Math.min(targetIndex, nextZoneFields.length));
            nextZoneFields.splice(boundedIndex, 0, fieldId);
            nextLayout[zoneId] = nextZoneFields;

            return {
                ...table,
                layout: nextLayout
            };
        });
    }

    function resetActiveTable() {
        if (!activeTable) {
            return;
        }

        updateActiveTable((table) => ({
            ...table,
            layout: DEFAULT_LAYOUT,
            filterSelections: {}
        }));
        setOpenHeaderFilter(null);
        setHeaderFilterSelections((current) =>
            Object.fromEntries(
                Object.entries(current).filter(([key]) => !key.startsWith(`${activeTable.id}:`))
            )
        );
        setHeaderFilterSortDirections((current) =>
            Object.fromEntries(
                Object.entries(current).filter(([key]) => !key.startsWith(`${activeTable.id}:`))
            )
        );
        setOpenHeaderColorTableId(null);
    }

    function updateTableFilterSelection(tableId: string, fieldId: PivotFieldId, value: string) {
        updateTable(tableId, (table) => ({
            ...table,
            filterSelections: {
                ...table.filterSelections,
                [fieldId]: value
            }
        }));
    }

    function startTableRename(tableId: string) {
        const currentTable = tables.find((table) => table.id === tableId);
        if (!currentTable) {
            return;
        }

        setActiveTableId(tableId);
        setIsTableListOpen(false);
        setOpenHeaderFilter(null);
        setOpenHeaderColorTableId(null);
        setEditingTableId(tableId);
        setTableNameDraft(currentTable.name);
    }

    function cancelTableRename() {
        setEditingTableId(null);
        setTableNameDraft("");
    }

    function commitTableRename() {
        if (!editingTableId) {
            return;
        }

        const nextName = tableNameDraft.trim();
        if (nextName) {
            updateTable(editingTableId, (table) => ({
                ...table,
                name: nextName
            }));
        }

        cancelTableRename();
    }

    function clearTableSelection() {
        setActiveTableId(null);
        setOpenHeaderFilter(null);
        setOpenHeaderColorTableId(null);
        setIsTableListOpen(false);
        cancelTableRename();
    }

    function clearDragState() {
        setActiveDrag(null);
        setDragZone(null);
        setDropIndicator(null);
    }

    function updateColumnOverride(key: string, override: ColumnOverride | null) {
        setColumnOverrides((current) => {
            if (override === null) {
                const next = { ...current };
                delete next[key];
                return next;
            }
            return { ...current, [key]: override };
        });
    }

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

            return {
                ...current,
                [selectionKey]: normalizedValues
            };
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

    return {
        tables,
        setTables,
        columns,
        customMetrics,
        pinnedFieldIds,
        setPinnedFieldIds,
        fieldDefinitions,
        activeTable,
        activeTableId,
        setActiveTableId,
        lastActiveTableId,
        setLastActiveTableId,

        dragZone,
        setDragZone,
        activeDrag,
        setActiveDrag,
        dropIndicator,
        setDropIndicator,
        clearDragState,

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

        editingTableId,
        setEditingTableId,
        tableNameDraft,
        setTableNameDraft,
        
        tableElementRefs,

        tableViews,
        activeLayout,
        visibleTableViews,
        activeTableView,

        getDropTargetTable,
        updateTable,
        updateActiveTable,
        columnOverrides,
        updateColumnOverride,
        addCustomMetric,
        deleteCustomMetric,
        addTable,
        deleteTable,
        removeFieldFromZone,
        insertFieldIntoZone,
        resetActiveTable,
        updateTableFilterSelection,
        startTableRename,
        cancelTableRename,
        commitTableRename,
        clearTableSelection,
        updateTableHeaderColor
    };
}
