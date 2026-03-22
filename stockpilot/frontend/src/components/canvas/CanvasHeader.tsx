import {
    ArrowUpAZ,
    ArrowUpZA,
    Check,
    ChevronDown,
    Palette,
    Plus,
    SquarePen,
    SlidersHorizontal,
    X
} from "lucide-react";
import React, { useMemo } from "react";
import {
    ACTION_BAR_ICON_CLASS,
    ACTION_BAR_ICON_STROKE,
    PIVOT_FIELD_TEXT_TYPOGRAPHY,
    TABLE_HEADER_COLOR_OPTIONS,
    getFieldDefinition,
    resolveTableHeaderColor,
    type HeaderFilterKind,
    type HeaderFilterOption,
    type PivotFieldId,
    type PivotTableView
} from "./canvasModel";
import {
    getColumnGroupFilterOptions,
    getHeaderFilterSelectedValues,
    getHeaderFilterSortDirection,
    getRowFieldFilterOptions,
    getValueFieldFilterOptions
} from "./canvasRenderHelpers";

interface CanvasHeaderProps {
    headerTableName: string;
    actionBarNameWidth: number;
    emptyHeaderText: string;
    orchestration: any;
    columns: any[];
    customMetrics: any[];
    columnOverrides: Record<string, any>;
}

export function CanvasHeader({
    headerTableName,
    actionBarNameWidth,
    emptyHeaderText,
    orchestration,
    columns,
    customMetrics,
    columnOverrides
}: CanvasHeaderProps) {
    const activeTableHeaderColor = resolveTableHeaderColor(orchestration.activeTable?.headerColor);

    // Cache header filter menu sections
    const headerFilterMenuSections = useMemo<Array<{
        key: string;
        title: string;
        kind: Exclude<HeaderFilterKind, "table-menu">;
        options: HeaderFilterOption[];
        fieldId?: PivotFieldId;
        rowIndex?: number;
    }>>(() => {
        const view = orchestration.activeTableView as PivotTableView | undefined;
        if (!view || !orchestration.openHeaderFilter || orchestration.openHeaderFilter.kind !== "table-menu") {
            return [];
        }

        const fieldLabelMap = new Map<PivotFieldId, string>();
        const allFieldIds = [
            ...view.table.layout.rows,
            ...view.table.layout.columns,
            ...view.pivotResult.valueFields
        ];
        for (const fid of allFieldIds) {
            if (!fieldLabelMap.has(fid)) {
                fieldLabelMap.set(fid, getFieldDefinition(fid, columns, customMetrics, columnOverrides).label);
            }
        }

        return [
            ...view.table.layout.rows.map((fieldId: PivotFieldId, rowIndex: number) => ({
                key: `row-field:${fieldId}:${rowIndex}`,
                title: fieldLabelMap.get(fieldId) ?? fieldId,
                kind: "row-field" as const,
                options: getRowFieldFilterOptions(view, fieldId, rowIndex, orchestration.headerFilterSortDirections),
                fieldId,
                rowIndex
            })),
            ...(view.hasColumnGroups
                ? [
                      {
                          key: "column-group",
                          title: view.table.layout.columns
                              .map((fieldId: PivotFieldId) => fieldLabelMap.get(fieldId) ?? fieldId)
                              .join(" / "),
                          kind: "column-group" as const,
                          options: getColumnGroupFilterOptions(view, orchestration.headerFilterSortDirections)
                      }
                  ]
                : view.pivotResult.valueFields.map((fieldId: PivotFieldId) => ({
                      key: `value-field:${fieldId}`,
                      title: fieldLabelMap.get(fieldId) ?? fieldId,
                      kind: "value-field" as const,
                      options: getValueFieldFilterOptions(view, fieldId, orchestration.headerFilterSortDirections),
                      fieldId
                  })))
        ].filter((section) => section.options.length > 0);
    }, [
        orchestration.activeTableView,
        orchestration.openHeaderFilter,
        orchestration.headerFilterSortDirections,
        columns,
        customMetrics,
        columnOverrides
    ]);

    function renderHeaderFilterMenu(view: PivotTableView) {
        if (
            !orchestration.openHeaderFilter ||
            orchestration.openHeaderFilter.tableId !== view.table.id ||
            orchestration.openHeaderFilter.kind !== "table-menu"
        ) {
            return null;
        }

        const sections = headerFilterMenuSections;

        function renderCheckboxSection(
            title: string,
            kind: Exclude<HeaderFilterKind, "table-menu">,
            options: HeaderFilterOption[],
            fieldId?: PivotFieldId,
            rowIndex?: number
        ) {
            const optionValues = options.map((option) => option.value);
            const selectedValues = getHeaderFilterSelectedValues(
                view.table.id,
                kind,
                optionValues,
                orchestration.headerFilterSelections,
                fieldId,
                rowIndex
            );
            const selectedValueSet = new Set(selectedValues);
            const sortDirection = getHeaderFilterSortDirection(view.table.id, kind, orchestration.headerFilterSortDirections, fieldId, rowIndex);
            const allSelected = selectedValues.length === optionValues.length;

            return (
                <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white" key={kind + (fieldId || "")}>
                    <div className="flex min-w-0 items-center gap-2 px-3 py-1">
                        <span className="min-w-0 flex-1 truncate pl-px text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            {title}
                        </span>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                orchestration.toggleHeaderFilterSortDirection(view.table.id, kind, fieldId, rowIndex);
                            }}
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 transition hover:text-[#080a0f]"
                            aria-label={`Sort ${title}`}
                        >
                            {sortDirection === "asc" ? (
                                <ArrowUpAZ className="h-4 w-4" strokeWidth={1.8} />
                            ) : (
                                <ArrowUpZA className="h-4 w-4" strokeWidth={1.8} />
                            )}
                        </button>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1 transition hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() =>
                                orchestration.updateHeaderFilterSelection(
                                    view.table.id,
                                    kind,
                                    allSelected ? [] : optionValues,
                                    optionValues,
                                    fieldId,
                                    rowIndex
                                )
                            }
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#080a0f] focus:ring-0"
                        />
                        <span className="truncate font-display text-[0.84rem] font-light leading-[1.08] tracking-tight text-ink">
                            All
                        </span>
                    </label>

                    <div className="max-h-[220px] overflow-y-auto">
                        {options.map((option) => (
                            <label
                                key={`${view.table.id}:${kind}:${option.value}`}
                                className="flex cursor-pointer items-center gap-2 px-3 py-1 transition hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValueSet.has(option.value)}
                                    onChange={(event) => {
                                        const nextValues = new Set(selectedValues);
                                        if (event.target.checked) {
                                            nextValues.add(option.value);
                                        } else {
                                            nextValues.delete(option.value);
                                        }

                                        orchestration.updateHeaderFilterSelection(
                                            view.table.id,
                                            kind,
                                            Array.from(nextValues),
                                            optionValues,
                                            fieldId,
                                            rowIndex
                                        );
                                    }}
                                    className="h-3.5 w-3.5 rounded border-slate-300 accent-[#080a0f] focus:ring-0"
                                />
                                <span className="truncate font-display text-[0.84rem] font-light leading-[1.08] tracking-tight text-ink">
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div
                className="header-filter-menu absolute left-0 top-full z-[140] mt-[14px] isolate w-[265px] max-w-[420px] overflow-hidden rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_22px_48px_-28px_rgba(11,14,20,0.24)]"
                style={{ backgroundColor: "#ffffff", opacity: 1 }}
                onPointerDown={(event) => event.stopPropagation()}
            >
                {sections.length > 0 ? (
                    <div className="max-h-[440px] space-y-1 overflow-y-auto">
                        {sections.map((section) => (
                            <div key={`${view.table.id}:${section.key}`}>
                                {renderCheckboxSection(
                                    section.title,
                                    section.kind,
                                    section.options,
                                    section.fieldId,
                                    section.rowIndex
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[8px] border border-slate-200 bg-white px-3 py-3 font-display text-[0.84rem] font-light leading-[1.08] tracking-tight text-slate-500">
                        No filterable fields
                    </div>
                )}
            </div>
        );
    }

    function renderHeaderFilterTrigger(view: PivotTableView) {
        const headerKey = `table-header-filter:${view.table.id}`;
        const isOpen =
            orchestration.openHeaderFilter?.tableId === view.table.id &&
            orchestration.openHeaderFilter.headerKey === headerKey &&
            orchestration.openHeaderFilter.kind === "table-menu";
        const activeFilterCount = Object.keys(orchestration.headerFilterSelections).filter((key) =>
            key.startsWith(`${view.table.id}:`)
        );
        const filterCountLabel =
            activeFilterCount.length > 9 ? "9+" : String(activeFilterCount.length);

        return (
            <button
                type="button"
                onPointerDown={(event) => {
                    event.stopPropagation();
                    orchestration.setActiveTableId(view.table.id);
                    orchestration.setIsTableListOpen(false);
                    orchestration.setOpenHeaderColorTableId(null);
                    orchestration.setOpenHeaderFilter((current: any) =>
                        current?.tableId === view.table.id &&
                        current.headerKey === headerKey &&
                        current.kind === "table-menu"
                            ? null
                            : {
                                  tableId: view.table.id,
                                  headerKey,
                                  kind: "table-menu"
                              }
                    );
                }}
                className={`relative inline-flex shrink-0 items-center justify-center rounded-[10px] p-1 text-[#080a0f] transition ${
                    isOpen ? "bg-slate-100" : ""
                }`}
                aria-label={`Filter ${view.table.name}`}
            >
                <SlidersHorizontal
                    className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                    strokeWidth={ACTION_BAR_ICON_STROKE}
                />
                {activeFilterCount.length > 0 ? (
                    <span className="absolute -right-1 -top-0.5 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#ef4444] px-[3px] text-center text-[8px] font-semibold leading-none text-white align-middle">
                        {filterCountLabel}
                    </span>
                ) : null}
            </button>
        );
    }

    return (
        <div className="canvas-studio-header premium-card-dark relative z-[90] h-11 overflow-visible" style={{ borderRadius: "14px" }}>

            <div
                className={`relative z-10 flex h-full min-w-0 items-center gap-4 px-4 ${
                    headerTableName ? "justify-between" : "justify-start"
                }`}
            >
                {headerTableName ? (
                    <div className="flex min-w-0 flex-1 items-center justify-start">
                        <div className="relative z-[110] flex shrink-0 -translate-x-[10px] items-center">
                            <div className="inline-flex min-w-0 shrink-0 items-center gap-0.5 rounded-[12px] bg-white px-1.5 py-[2px]">
                                <div className="shrink-0" style={{ width: actionBarNameWidth }}>
                                    {orchestration.activeTable && orchestration.editingTableId === orchestration.activeTable.id ? (
                                        <input
                                            // autoFocus ensures the input catches focus immediately upon mount
                                            autoFocus
                                            value={orchestration.tableNameDraft}
                                            onChange={(event) => orchestration.setTableNameDraft(event.target.value)}
                                            onBlur={orchestration.commitTableRename}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    orchestration.commitTableRename();
                                                }

                                                if (event.key === "Escape") {
                                                    event.preventDefault();
                                                    orchestration.cancelTableRename();
                                                }
                                            }}
                                            className={`h-[30px] w-full rounded-[10px] bg-transparent px-3 py-1 ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-[#080a0f] outline-none placeholder:text-slate-400`}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                orchestration.setOpenHeaderColorTableId(null);
                                                orchestration.setOpenHeaderFilter(null);
                                                orchestration.setIsTableListOpen((current: boolean) => !current);
                                            }}
                                            className="inline-flex h-[30px] w-full min-w-0 items-center justify-between gap-2 rounded-[10px] px-3 py-1 text-left text-[#080a0f] transition hover:bg-slate-100"
                                            aria-haspopup="menu"
                                            aria-expanded={orchestration.isTableListOpen}
                                            aria-label="Open table list"
                                        >
                                            <span className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-[#080a0f]`}>
                                                {headerTableName}
                                            </span>
                                            <ChevronDown
                                                className={`${ACTION_BAR_ICON_CLASS} shrink-0 text-slate-500 transition ${
                                                    orchestration.isTableListOpen ? "rotate-180" : ""
                                                }`}
                                                strokeWidth={ACTION_BAR_ICON_STROKE}
                                            />
                                        </button>
                                    )}
                                </div>
                                {orchestration.activeTable ? (
                                    <div
                                        className="inline-flex shrink-0 items-center gap-1"
                                    >
                                        <button
                                            type="button"
                                            onPointerDown={(event) => {
                                                event.stopPropagation();
                                                orchestration.setActiveTableId(orchestration.activeTable!.id);
                                                orchestration.setIsTableListOpen(false);
                                                orchestration.setOpenHeaderFilter(null);
                                                orchestration.setOpenHeaderColorTableId((current: string | null) =>
                                                    current === orchestration.activeTable!.id ? null : orchestration.activeTable!.id
                                                );
                                            }}
                                            className="inline-flex shrink-0 items-center rounded-[10px] p-1 text-[#080a0f] transition"
                                            aria-label={`Change ${orchestration.activeTable.name} header color`}
                                        >
                                            <Palette
                                                className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                                strokeWidth={ACTION_BAR_ICON_STROKE}
                                            />
                                        </button>

                                        {orchestration.openHeaderColorTableId === orchestration.activeTable.id ? (
                                            <div className="inline-flex shrink-0 items-center gap-1 pr-0.5" onPointerDown={(e) => e.stopPropagation()}>
                                                {TABLE_HEADER_COLOR_OPTIONS.map((color) => {
                                                    const isSelected = activeTableHeaderColor === color;

                                                    return (
                                                        <button
                                                            key={`header-color:${orchestration.activeTable!.id}:${color}`}
                                                            type="button"
                                                            onClick={() => {
                                                                orchestration.updateTableHeaderColor(orchestration.activeTable!.id, color);
                                                            }}
                                                            className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition"
                                                            style={{ backgroundColor: color }}
                                                            aria-label={`Set ${orchestration.activeTable!.name} header color to ${color}`}
                                                        >
                                                            {isSelected ? (
                                                                <Check
                                                                    className="h-[10px] w-[10px] text-white"
                                                                    strokeWidth={2.6}
                                                                />
                                                            ) : null}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                {orchestration.activeTableView ? renderHeaderFilterTrigger(orchestration.activeTableView) : null}
                                {orchestration.activeTable ? (
                                    <button
                                    type="button"
                                    onClick={() => orchestration.deleteTable(orchestration.activeTable!.id)}
                                    className="inline-flex shrink-0 items-center rounded-[10px] p-1 text-[#080a0f] transition"
                                    aria-label={`Delete ${orchestration.activeTable.name}`}
                                >
                                    <X
                                        className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                        strokeWidth={ACTION_BAR_ICON_STROKE}
                                    />
                                </button>
                            ) : null}
                                <button
                                    type="button"
                                    onClick={orchestration.addTable}
                                    className="inline-flex shrink-0 items-center rounded-[10px] p-1 text-[#080a0f] transition"
                                    aria-label="Create new table"
                                >
                                <Plus
                                    className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                    strokeWidth={ACTION_BAR_ICON_STROKE}
                                />
                            </button>
                                {orchestration.activeTable ? (
                                    <button
                                        type="button"
                                        onClick={() => orchestration.startTableRename(orchestration.activeTable!.id)}
                                        className="inline-flex shrink-0 items-center justify-center rounded-[10px] p-1 text-[#080a0f] transition"
                                        aria-label={`Rename ${orchestration.activeTable.name}`}
                                    >
                                        <SquarePen
                                            className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                            strokeWidth={ACTION_BAR_ICON_STROKE}
                                        />
                                    </button>
                                ) : null}
                            </div>

                            {headerTableName && orchestration.isTableListOpen ? (
                                <div
                                    className="absolute left-0 right-0 top-full z-[140] mt-1 isolate overflow-hidden rounded-[14px] border border-slate-200 bg-white p-1.5 shadow-[0_22px_48px_-28px_rgba(11,14,20,0.24)]"
                                    style={{ backgroundColor: "#ffffff", opacity: 1 }}
                                    onPointerDown={(event) => event.stopPropagation()}
                                >
                                    {orchestration.visibleTableViews.map((view: PivotTableView) => (
                                        <div
                                            key={`header-table-option:${view.table.id}`}
                                            className={`mb-0.5 flex items-center gap-1 rounded-[10px] last:mb-0 ${
                                                view.table.id === orchestration.activeTableId ? "bg-slate-100" : "bg-transparent"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onPointerDown={(event) => {
                                                    event.stopPropagation();
                                                    orchestration.setActiveTableId(view.table.id);
                                                    orchestration.setLastActiveTableId(view.table.id);
                                                    orchestration.setOpenHeaderColorTableId(null);
                                                    orchestration.setIsTableListOpen(false);
                                                }}
                                                className="flex h-[30px] min-w-0 flex-1 items-center rounded-[10px] px-3 py-1 text-left text-[#080a0f] transition hover:bg-slate-100"
                                            >
                                                <span className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY}`}>
                                                    {view.table.name}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onPointerDown={(event) => {
                                                    event.stopPropagation();
                                                    orchestration.deleteTable(view.table.id);
                                                }}
                                                className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] text-[#080a0f] transition hover:bg-slate-100"
                                                aria-label={`Delete ${view.table.name}`}
                                            >
                                                <X className="h-4 w-4" strokeWidth={1.95} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            {orchestration.activeTableView &&
                            orchestration.openHeaderFilter?.tableId === orchestration.activeTableView.table.id &&
                            orchestration.openHeaderFilter.kind === "table-menu"
                                ? renderHeaderFilterMenu(orchestration.activeTableView)
                                : null}
                        </div>
                    </div>
                ) : (
                    <span
                        className="inline-flex h-full max-w-full items-center"
                        style={{ paddingBottom: 0 }}
                    >
                        <span
                            className="text-gradient truncate font-display text-[1.16rem] font-bold leading-none tracking-tight"
                            style={{ paddingBottom: 0 }}
                        >
                            {emptyHeaderText}
                        </span>
                    </span>
                )}
            </div>
        </div>
    );
}
