import {
    memo,
    useMemo,
    type MutableRefObject,
    type PointerEvent as ReactPointerEvent
} from "react";
import { motion } from "framer-motion";
import {
    PIVOT_FIELD_TEXT_TYPOGRAPHY,
    TABLE_HEADER_TEXT_TYPOGRAPHY,
    TABLE_RESIZE_HANDLES,
    getFieldDefinition,
    hexToRgba,
    resolveTableHeaderColor,
    type HeaderFilterSortDirection,
    type PivotCombo,
    type PivotFieldId,
    type PivotTableView,
    type TableResizeDirection
} from "./canvasModel";
import {
    getVisibleColumnCombos,
    getVisibleRowCombos,
    renderCell,
    renderColumnTotal,
    renderGrandTotal,
    renderRowTotal
} from "./canvasRenderHelpers";

const FALLBACK_ROW_FIELDS: PivotFieldId[] = ["warehouseName"];
const GRAND_TOTAL_COLUMN_COMBOS: PivotCombo[] = [{ key: "__total__", labels: ["Grand Total"] }];

interface PivotCanvasTableProps {
    view: PivotTableView;
    zIndex: number;
    isActive: boolean;
    isMoving: boolean;
    headerFilterSelections: Record<string, string[]>;
    headerFilterSortDirections: Record<string, HeaderFilterSortDirection>;
    tableElementRefs: MutableRefObject<Record<string, HTMLTableElement | null>>;
    tableWrapperRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
    onTablePointerDown: (tableId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
    onTableResizeStart: (
        tableId: string,
        direction: TableResizeDirection,
        event: ReactPointerEvent<HTMLButtonElement>
    ) => void;
}

function areStringArraysEqual(left: string[] | undefined, right: string[] | undefined) {
    if (left === right) {
        return true;
    }

    if (!left || !right || left.length !== right.length) {
        return false;
    }

    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) {
            return false;
        }
    }

    return true;
}

function areScopedRecordsEqual<Value>(
    previous: Record<string, Value>,
    next: Record<string, Value>,
    tableId: string,
    areValuesEqual: (left: Value | undefined, right: Value | undefined) => boolean = Object.is
) {
    if (previous === next) {
        return true;
    }

    const prefix = `${tableId}:`;
    const previousKeys = Object.keys(previous)
        .filter((key) => key.startsWith(prefix))
        .sort();
    const nextKeys = Object.keys(next)
        .filter((key) => key.startsWith(prefix))
        .sort();

    if (previousKeys.length !== nextKeys.length) {
        return false;
    }

    for (let index = 0; index < previousKeys.length; index += 1) {
        const previousKey = previousKeys[index];
        const nextKey = nextKeys[index];

        if (previousKey !== nextKey) {
            return false;
        }

        if (!areValuesEqual(previous[previousKey], next[nextKey])) {
            return false;
        }
    }

    return true;
}

function PivotCanvasTableComponent({
    view,
    zIndex,
    isActive,
    isMoving,
    headerFilterSelections,
    headerFilterSortDirections,
    tableElementRefs,
    tableWrapperRefs,
    onTablePointerDown,
    onTableResizeStart
}: PivotCanvasTableProps) {
    const visibleRowCombos = useMemo(
        () => getVisibleRowCombos(view, headerFilterSelections, headerFilterSortDirections),
        [headerFilterSelections, headerFilterSortDirections, view]
    );
    const visibleColumnCombos = useMemo(
        () => getVisibleColumnCombos(view, headerFilterSelections, headerFilterSortDirections),
        [headerFilterSelections, headerFilterSortDirections, view]
    );
    const renderedColumnCombos =
        view.table.layout.columns.length > 0 ? visibleColumnCombos : GRAND_TOTAL_COLUMN_COMBOS;
    const rowFields = view.table.layout.rows.length > 0 ? view.table.layout.rows : FALLBACK_ROW_FIELDS;
    const tableHeaderColor = resolveTableHeaderColor(view.table.headerColor);
    const tableHeaderStyle = { backgroundColor: tableHeaderColor };
    const tableGridBorderStyle = {
        borderColor: hexToRgba(tableHeaderColor, 0.18)
    };

    return (
        <motion.div
            ref={(node) => {
                if (node) {
                    tableWrapperRefs.current[view.table.id] = node;
                } else {
                    delete tableWrapperRefs.current[view.table.id];
                }
            }}
            onPointerDown={(event) => onTablePointerDown(view.table.id, event)}
            style={{
                left: view.table.position.x,
                top: view.table.position.y,
                width: view.table.size.width,
                height: view.table.size.height,
                zIndex
            }}
            className={`absolute left-0 top-0 isolate flex max-h-full max-w-full flex-col overflow-visible rounded-none bg-white ${
                isMoving ? "cursor-grabbing " : isActive ? "cursor-grab " : ""
            }${
                isActive
                    ? "shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)]"
                    : "shadow-[0_18px_42px_-34px_rgba(11,14,20,0.24)]"
            }`}
        >
            {view.filteredRecords.length === 0 ? (
                <div className="min-h-0 flex-1" />
            ) : (
                <div className="min-h-0 flex-1 overflow-hidden">
                    <div className="h-full w-full overflow-auto">
                        <table
                            ref={(node) => {
                                if (node) {
                                    tableElementRefs.current[view.table.id] = node;
                                    return;
                                }

                                delete tableElementRefs.current[view.table.id];
                            }}
                            className="pivot-table w-max min-w-max table-auto border-collapse text-[13px] leading-tight text-slate-800"
                        >
                            <thead className="sticky top-0 z-10 text-white" style={tableHeaderStyle}>
                                <tr>
                                    {rowFields.map((fieldId, index) => (
                                        <th
                                            key={`row-header:${view.table.id}:${fieldId}:${index}`}
                                            rowSpan={view.showSecondaryHeaderRow ? 2 : 1}
                                            className={`whitespace-nowrap border px-3 py-0.5 text-left ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                            style={tableGridBorderStyle}
                                        >
                                            {view.table.layout.rows.length > 0
                                                ? getFieldDefinition(fieldId, view.customMetrics).label
                                                : "Rows"}
                                        </th>
                                    ))}

                                    {view.hasColumnGroups ? (
                                        visibleColumnCombos.map((combo) => (
                                            <th
                                                key={`column-group:${view.table.id}:${combo.key}`}
                                                colSpan={view.hasMultipleValueFields ? view.pivotResult.valueFields.length : 1}
                                                className={`whitespace-nowrap border px-3 py-0.5 text-center ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                style={tableGridBorderStyle}
                                            >
                                                {combo.labels.join(" / ")}
                                            </th>
                                        ))
                                    ) : (
                                        view.pivotResult.valueFields.map((fieldId) => (
                                            <th
                                                key={`value-header-top:${view.table.id}:${fieldId}`}
                                                className={`whitespace-nowrap border px-3 py-0.5 text-right ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                style={tableGridBorderStyle}
                                            >
                                                {getFieldDefinition(fieldId, view.customMetrics).label}
                                            </th>
                                        ))
                                    )}

                                    {view.hasColumnGroups
                                        ? view.pivotResult.valueFields.map((fieldId) => (
                                              <th
                                                  key={`grand-header:${view.table.id}:${fieldId}`}
                                                  rowSpan={view.showSecondaryHeaderRow ? 2 : 1}
                                                  className={`whitespace-nowrap border px-3 py-0.5 text-right ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                  style={tableGridBorderStyle}
                                              >
                                                  {getFieldDefinition(fieldId, view.customMetrics).label}
                                              </th>
                                          ))
                                        : null}
                                </tr>

                                {view.showSecondaryHeaderRow ? (
                                    <tr>
                                        {visibleColumnCombos.map((combo) =>
                                            view.pivotResult.valueFields.map((fieldId) => (
                                                <th
                                                    key={`value-header:${view.table.id}:${combo.key}:${fieldId}`}
                                                    className={`whitespace-nowrap border px-3 py-0.5 text-right ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                    style={tableGridBorderStyle}
                                                >
                                                    {getFieldDefinition(fieldId, view.customMetrics).label}
                                                </th>
                                            ))
                                        )}
                                    </tr>
                                ) : null}
                            </thead>
                            <tbody>
                                {visibleRowCombos.map((rowCombo, rowIndex) => (
                                    <tr
                                        key={`row:${view.table.id}:${rowCombo.key}`}
                                        className={rowIndex % 2 === 0 ? "bg-white/96" : "bg-slate-50/55"}
                                    >
                                        {(view.table.layout.rows.length > 0 ? rowCombo.labels : ["Grand Total"]).map(
                                            (label, index) => (
                                                <td
                                                    key={`row-label:${view.table.id}:${rowCombo.key}:${index}`}
                                                    className={`whitespace-nowrap border px-3 py-0.5 ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                    style={tableGridBorderStyle}
                                                >
                                                    {label}
                                                </td>
                                            )
                                        )}

                                        {renderedColumnCombos.map((columnCombo) =>
                                            view.pivotResult.valueFields.map((fieldId) => (
                                                <td
                                                    key={`cell:${view.table.id}:${rowCombo.key}:${columnCombo.key}:${fieldId}`}
                                                    className={`whitespace-nowrap border px-3 py-0.5 text-right tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-slate-700`}
                                                    style={tableGridBorderStyle}
                                                >
                                                    {renderCell(view, rowCombo.key, columnCombo.key, fieldId)}
                                                </td>
                                            ))
                                        )}

                                        {view.table.layout.columns.length > 0
                                            ? view.pivotResult.valueFields.map((fieldId) => (
                                                  <td
                                                      key={`row-total:${view.table.id}:${rowCombo.key}:${fieldId}`}
                                                      className={`whitespace-nowrap border bg-brandSoft/45 px-3 py-0.5 text-right tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                      style={tableGridBorderStyle}
                                                  >
                                                      {renderRowTotal(view, rowCombo.key, fieldId, visibleColumnCombos)}
                                                  </td>
                                              ))
                                            : null}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    {Array.from({
                                        length: Math.max(view.table.layout.rows.length, 1)
                                    }).map((_, index) => (
                                        <td
                                            key={`footer-label:${view.table.id}:${index}`}
                                            className={`whitespace-nowrap border px-3 py-0.5 font-semibold ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                            style={tableGridBorderStyle}
                                        >
                                            {index === 0 ? "Grand Total" : ""}
                                        </td>
                                    ))}

                                    {renderedColumnCombos.map((columnCombo) =>
                                        view.pivotResult.valueFields.map((fieldId) => (
                                            <td
                                                key={`column-total:${view.table.id}:${columnCombo.key}:${fieldId}`}
                                                className={`whitespace-nowrap border px-3 py-0.5 text-right font-semibold tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                style={tableGridBorderStyle}
                                            >
                                                {renderColumnTotal(view, columnCombo.key, fieldId, visibleRowCombos)}
                                            </td>
                                        ))
                                    )}

                                    {view.table.layout.columns.length > 0
                                        ? view.pivotResult.valueFields.map((fieldId) => (
                                              <td
                                                  key={`grand-total:${view.table.id}:${fieldId}`}
                                                  className={`whitespace-nowrap border px-3 py-0.5 text-right font-semibold tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                  style={tableGridBorderStyle}
                                              >
                                                  {renderGrandTotal(
                                                      view,
                                                      fieldId,
                                                      visibleRowCombos,
                                                      visibleColumnCombos
                                                  )}
                                              </td>
                                          ))
                                        : null}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {TABLE_RESIZE_HANDLES.map((handle) => (
                <button
                    key={`${view.table.id}:${handle.direction}`}
                    type="button"
                    data-table-resize-handle="true"
                    aria-label={`Resize ${view.table.name} from ${handle.direction}`}
                    onPointerDown={(event) => onTableResizeStart(view.table.id, handle.direction, event)}
                    className={`absolute z-20 block touch-none bg-transparent p-0 ${handle.className}`}
                />
            ))}
        </motion.div>
    );
}

function arePivotCanvasTablePropsEqual(previous: PivotCanvasTableProps, next: PivotCanvasTableProps) {
    if (
        previous.view !== next.view ||
        previous.zIndex !== next.zIndex ||
        previous.isActive !== next.isActive ||
        previous.isMoving !== next.isMoving ||
        previous.tableElementRefs !== next.tableElementRefs ||
        previous.tableWrapperRefs !== next.tableWrapperRefs ||
        previous.onTablePointerDown !== next.onTablePointerDown ||
        previous.onTableResizeStart !== next.onTableResizeStart
    ) {
        return false;
    }

    const tableId = previous.view.table.id;

    return (
        areScopedRecordsEqual(
            previous.headerFilterSelections,
            next.headerFilterSelections,
            tableId,
            areStringArraysEqual
        ) &&
        areScopedRecordsEqual(
            previous.headerFilterSortDirections,
            next.headerFilterSortDirections,
            tableId
        )
    );
}

export const PivotCanvasTable = memo(PivotCanvasTableComponent, arePivotCanvasTablePropsEqual);

PivotCanvasTable.displayName = "PivotCanvasTable";
