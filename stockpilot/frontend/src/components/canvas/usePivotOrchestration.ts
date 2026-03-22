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
    type PivotFieldId,
    type PivotTableInstance,
    type PivotTableView,
    type PivotZoneId
} from "./canvasModel";
import { loadStudioState } from "./canvasStorage";
import { useDragDropState } from "./useDragDropState";
import { useHeaderFilters } from "./useHeaderFilters";
import { useStorageSync } from "./useStorageSync";

export function usePivotOrchestration(analysis: AnalysisResult | null) {
    const initialState = useMemo(() => sanitizeStudioState(null), []);
    const [tables, setTables] = useState<PivotTableInstance[]>(initialState.tables);
    const [activeTableId, setActiveTableId] = useState<string | null>(initialState.activeTableId);
    const [lastActiveTableId, setLastActiveTableId] = useState<string | null>(initialState.activeTableId);
    const [customMetrics, setCustomMetrics] = useState<CustomMetricDefinition[]>(initialState.customMetrics);
    const [pinnedFieldIds, setPinnedFieldIds] = useState<PivotFieldId[]>(initialState.pinnedFieldIds);
    const [columnOverrides, setColumnOverrides] = useState<Record<string, ColumnOverride>>(initialState.columnOverrides);
    const [editingTableId, setEditingTableId] = useState<string | null>(null);
    const [tableNameDraft, setTableNameDraft] = useState("");

    const tableElementRefs = useRef<Record<string, HTMLTableElement | null>>({});

    // Sub-hooks for focused state domains
    const drag = useDragDropState();
    const filters = useHeaderFilters();

    // Persistence
    useEffect(() => {
        const nextState = loadStudioState();
        setTables(nextState.tables);
        setActiveTableId(nextState.activeTableId);
        setCustomMetrics(nextState.customMetrics);
        setPinnedFieldIds(nextState.pinnedFieldIds);
        setColumnOverrides(nextState.columnOverrides);
    }, []);

    useStorageSync({ tables, activeTableId, customMetrics, pinnedFieldIds, columnOverrides });

    // Derived / cleanup effects
    useEffect(() => {
        if (activeTableId) setLastActiveTableId(activeTableId);
    }, [activeTableId]);

    useEffect(() => {
        if (lastActiveTableId && !tables.some((table) => table.id === lastActiveTableId)) {
            setLastActiveTableId(tables[0]?.id ?? null);
        }
    }, [lastActiveTableId, tables]);

    useEffect(() => {
        if (filters.openHeaderColorTableId && !tables.some((t) => t.id === filters.openHeaderColorTableId)) {
            filters.setOpenHeaderColorTableId(null);
        }
    }, [filters, tables]);

    useEffect(() => {
        if (!filters.openHeaderFilter) return;
        const table = tables.find((t) => t.id === filters.openHeaderFilter!.tableId);
        if (!table) { filters.setOpenHeaderFilter(null); return; }
        const hf = filters.openHeaderFilter;
        if (
            hf.kind === "row-field" &&
            (!hf.fieldId || table.layout.rows[hf.rowIndex ?? -1] !== hf.fieldId)
        ) { filters.setOpenHeaderFilter(null); return; }
        if (hf.kind === "column-group" && table.layout.columns.length === 0) { filters.setOpenHeaderFilter(null); return; }
        if (hf.kind === "value-field" && (!hf.fieldId || table.layout.columns.length > 0 || !table.layout.values.includes(hf.fieldId))) {
            filters.setOpenHeaderFilter(null);
        }
    }, [filters, tables]);

    useEffect(() => {
        if (activeTableId && !tables.some((t) => t.id === activeTableId)) setActiveTableId(null);
    }, [activeTableId, tables]);

    // Pivot computation
    const rows = analysis?.rows ?? [];
    const columns: ColumnMeta[] = analysis?.columns ?? [];
    const fieldDefinitions = useMemo(
        () => getAvailablePivotFields(columns, customMetrics, columnOverrides),
        [columns, customMetrics, columnOverrides]
    );

    const pivotCache = useRef<Map<string, { cacheKey: string; tableRef: PivotTableInstance; view: PivotTableView }>>(new Map());
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
                const overridesKey = JSON.stringify(columnOverrides);
                const cacheKey = `${layoutKey}|${filtersKey}|${customMetricsKey}|${overridesKey}`;

                const cached = pivotCache.current.get(table.id);
                if (cached && cached.cacheKey === cacheKey) {
                    if (cached.tableRef === table && cached.view.columnOverrides === columnOverrides) return cached.view;
                    const updated = { ...cached, tableRef: table, view: { ...cached.view, table, columnOverrides } };
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
                        table, columns, columnOverrides, filterOptions, filteredRecords, pivotResult,
                        hasColumnGroups, hasMultipleValueFields,
                        showSecondaryHeaderRow: hasColumnGroups && hasMultipleValueFields,
                        customMetrics
                    }
                };
                pivotCache.current.set(table.id, entry);
                return entry.view;
            }),
        [columnOverrides, columns, customMetrics, customMetricsKey, rows, tables]
    );

    const activeLayout = tables.find((t) => t.id === activeTableId)?.layout ?? DEFAULT_LAYOUT;
    const activeTable = useMemo(
        () => (activeTableId ? tables.find((t) => t.id === activeTableId) ?? null : null),
        [activeTableId, tables]
    );
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
        setTables((current) => current.map((table) => (table.id === tableId ? updater(table) : table)));
    }

    function updateTableHeaderColor(tableId: string, headerColor: string) {
        updateTable(tableId, (table) => ({ ...table, headerColor }));
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
        if (activeTable) return activeTable;
        if (lastActiveTableId) {
            const last = tables.find((t) => t.id === lastActiveTableId);
            if (last) return last;
        }
        return tables[0] ?? null;
    }

    function updateActiveTable(updater: (table: PivotTableInstance) => PivotTableInstance) {
        if (!activeTable) return;
        updateTable(activeTable.id, updater);
    }

    function addTable() {
        const nextTable = createPivotTable(tables.length + 1);
        setTables((current) => [...current, nextTable]);
        setActiveTableId(nextTable.id);
        filters.clearAllHeaderState();
        filters.setIsTableListOpen(false);
    }

    function deleteTable(tableId: string) {
        const currentIndex = tables.findIndex((t) => t.id === tableId);
        if (currentIndex === -1) return;
        const remainingTables = tables.filter((t) => t.id !== tableId);

        if (remainingTables.length === 0) {
            const fallbackTable = createPivotTable(1);
            setTables([fallbackTable]);
            setActiveTableId(fallbackTable.id);
            setLastActiveTableId(fallbackTable.id);
            filters.clearTableHeaderState(tableId);
            filters.setIsTableListOpen(false);
            cancelTableRename();
            return;
        }

        const nextActiveTable = remainingTables[Math.min(currentIndex, remainingTables.length - 1)];
        setTables(remainingTables);
        setActiveTableId((current) =>
            current === tableId || !remainingTables.some((t) => t.id === current) ? nextActiveTable.id : current
        );
        setLastActiveTableId(nextActiveTable.id);
        filters.clearTableHeaderState(tableId);
        filters.setIsTableListOpen((current) =>
            current && remainingTables.some((t) => t.layout.values.length > 0) ? current : false
        );
        if (editingTableId === tableId) cancelTableRename();
    }

    function removeFieldFromZone(fieldId: PivotFieldId, zoneId: PivotZoneId) {
        updateActiveTable((table) => ({
            ...table,
            layout: { ...table.layout, [zoneId]: table.layout[zoneId].filter((item) => item !== fieldId) }
        }));
    }

    function insertFieldIntoZone(fieldId: PivotFieldId, zoneId: PivotZoneId, targetIndex: number) {
        const targetTable = getDropTargetTable();
        if (!targetTable) return;
        if (activeTableId !== targetTable.id) setActiveTableId(targetTable.id);
        updateTable(targetTable.id, (table) => {
            const nextLayout = {
                filters: table.layout.filters.filter((item) => item !== fieldId),
                columns: table.layout.columns.filter((item) => item !== fieldId),
                rows: table.layout.rows.filter((item) => item !== fieldId),
                values: table.layout.values.filter((item) => item !== fieldId)
            };
            const nextZoneFields = [...nextLayout[zoneId]];
            nextZoneFields.splice(Math.max(0, Math.min(targetIndex, nextZoneFields.length)), 0, fieldId);
            nextLayout[zoneId] = nextZoneFields;
            return { ...table, layout: nextLayout };
        });
    }

    function resetActiveTable() {
        if (!activeTable) return;
        updateActiveTable((table) => ({ ...table, layout: DEFAULT_LAYOUT, filterSelections: {} }));
        filters.clearTableHeaderState(activeTable.id);
    }

    function updateTableFilterSelection(tableId: string, fieldId: PivotFieldId, value: string) {
        updateTable(tableId, (table) => ({
            ...table,
            filterSelections: { ...table.filterSelections, [fieldId]: value }
        }));
    }

    function startTableRename(tableId: string) {
        const currentTable = tables.find((t) => t.id === tableId);
        if (!currentTable) return;
        setActiveTableId(tableId);
        filters.setIsTableListOpen(false);
        filters.clearAllHeaderState();
        setEditingTableId(tableId);
        setTableNameDraft(currentTable.name);
    }

    function cancelTableRename() {
        setEditingTableId(null);
        setTableNameDraft("");
    }

    function commitTableRename() {
        if (!editingTableId) return;
        const nextName = tableNameDraft.trim();
        if (nextName) updateTable(editingTableId, (table) => ({ ...table, name: nextName }));
        cancelTableRename();
    }

    function clearTableSelection() {
        setActiveTableId(null);
        filters.clearAllHeaderState();
        filters.setIsTableListOpen(false);
        cancelTableRename();
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

        // Drag & drop (from useDragDropState)
        dragZone: drag.dragZone,
        setDragZone: drag.setDragZone,
        activeDrag: drag.activeDrag,
        setActiveDrag: drag.setActiveDrag,
        dropIndicator: drag.dropIndicator,
        setDropIndicator: drag.setDropIndicator,
        clearDragState: drag.clearDragState,

        // Header filters (from useHeaderFilters)
        openHeaderFilter: filters.openHeaderFilter,
        setOpenHeaderFilter: filters.setOpenHeaderFilter,
        headerFilterSelections: filters.headerFilterSelections,
        setHeaderFilterSelections: filters.setHeaderFilterSelections,
        headerFilterSortDirections: filters.headerFilterSortDirections,
        setHeaderFilterSortDirections: filters.setHeaderFilterSortDirections,
        isTableListOpen: filters.isTableListOpen,
        setIsTableListOpen: filters.setIsTableListOpen,
        openHeaderColorTableId: filters.openHeaderColorTableId,
        setOpenHeaderColorTableId: filters.setOpenHeaderColorTableId,
        updateHeaderFilterSelection: filters.updateHeaderFilterSelection,
        toggleHeaderFilterSortDirection: filters.toggleHeaderFilterSortDirection,

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
