import { ArrowUpAZ, ArrowUpZA, Bookmark, EyeClosed, Grip, Sigma, SquarePen, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
    PIVOT_FIELD_TEXT_TYPOGRAPHY,
    getAvailablePivotFields,
    isCustomMetricFieldId,
    type ColumnOverride,
    type CustomMetricDefinition,
    type CustomMetricId,
    type DragState,
    type PivotFieldDefinition,
    type PivotFieldId,
    type PivotZoneId,
} from "./canvasModel";
import type { ColumnMeta } from "../../types/stock";

// ── FieldListItem ──────────────────────────────────────────────────────────────
function FieldListItem({
    field,
    isHidden,
    isPinned,
    setActiveDrag,
    setDropIndicator,
    clearDragState,
    onEdit,
    onDelete,
    onToggleHide,
    onTogglePin
}: {
    field: PivotFieldDefinition;
    isHidden?: boolean;
    isPinned?: boolean;
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    clearDragState: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleHide?: () => void;
    onTogglePin?: () => void;
}) {
    const isFormula = isCustomMetricFieldId(field.id);

    return (
        <div className={`flex w-full items-center gap-2 border-b border-slate-200/70 py-1.5 last:border-b-0 ${isHidden ? "opacity-40" : ""}`}>
            <button
                type="button"
                draggable
                onDragStart={(event) => {
                    event.dataTransfer.setData("text/stockpilot-field", field.id);
                    event.dataTransfer.effectAllowed = "move";
                    setActiveDrag({
                        fieldId: field.id,
                        sourceZone: "fields"
                    });
                    setDropIndicator(null);
                }}
                onDragEnd={clearDragState}
                className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:opacity-70"
            >
                {isFormula
                    ? <Sigma className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    : <Grip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                }
                <p className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}>
                    {field.label}
                </p>
            </button>
            <div className="flex shrink-0 items-center gap-0.5">
                {isFormula ? (
                    <>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onEdit}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:text-ink"
                        >
                            <SquarePen className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onDelete}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:text-red-500"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                    </>
                ) : null}
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onTogglePin}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded transition ${isPinned ? "text-danger" : "text-slate-400 hover:text-ink"}`}
                >
                    <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} fill={isPinned ? "currentColor" : "none"} />
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onToggleHide}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded transition ${isHidden ? "text-slate-500" : "text-slate-400 hover:text-ink"}`}
                >
                    <EyeClosed className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
            </div>
        </div>
    );
}

// ── PivotFieldBrowser ─────────────────────────────────────────────────────────
export interface PivotFieldBrowserProps {
    columns: ColumnMeta[];
    customMetrics: CustomMetricDefinition[];
    columnOverrides: Record<string, ColumnOverride>;
    pinnedFieldIds: PivotFieldId[];
    setPinnedFieldIds: React.Dispatch<React.SetStateAction<PivotFieldId[]>>;
    activeDrag: DragState | null;
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    clearDragState: () => void;
    deleteCustomMetric: (id: CustomMetricId) => void;
    onEditMetric: (metric: CustomMetricDefinition) => void;
    isFieldEditorOpen: boolean;
    onOpenFieldEditor: () => void;
}

export function PivotFieldBrowser({
    columns,
    customMetrics,
    columnOverrides,
    pinnedFieldIds,
    setPinnedFieldIds,
    setActiveDrag,
    setDropIndicator,
    clearDragState,
    deleteCustomMetric,
    onEditMetric,
    isFieldEditorOpen,
    onOpenFieldEditor,
}: PivotFieldBrowserProps) {
    const [hiddenFieldIds, setHiddenFieldIds] = useState<Set<PivotFieldId>>(() => new Set());
    const [fieldSortDirection, setFieldSortDirection] = useState<"asc" | "desc" | null>(null);

    const allFields = useMemo(() => {
        const fields = getAvailablePivotFields(columns, customMetrics, columnOverrides);
        const pinnedSet = new Set(pinnedFieldIds);

        const pinned = fields.filter((f) => pinnedSet.has(f.id));
        const hidden = fields.filter((f) => hiddenFieldIds.has(f.id));
        const regular = fields.filter((f) => !pinnedSet.has(f.id) && !hiddenFieldIds.has(f.id));

        if (fieldSortDirection === "asc") {
            regular.sort((a, b) => a.label.localeCompare(b.label));
        } else if (fieldSortDirection === "desc") {
            regular.sort((a, b) => b.label.localeCompare(a.label));
        }

        return [...pinned, ...regular, ...hidden];
    }, [columns, columnOverrides, customMetrics, pinnedFieldIds, hiddenFieldIds, fieldSortDirection]);

    return (
        <div className="h-full overflow-y-auto pr-1">
            <div className="rounded-[10px] border border-slate-200/70 bg-white/80 px-3 pb-0 pt-2">
                <div className="flex items-center justify-between">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Core fields
                    </p>
                    <div className="flex items-center gap-0.5">
                        {columns.length > 0 && (
                            <button
                                type="button"
                                onClick={onOpenFieldEditor}
                                className={`inline-flex h-5 w-5 items-center justify-center rounded transition ${isFieldEditorOpen ? "text-brand" : "text-slate-400 hover:text-slate-600"}`}
                                aria-label="Edit fields"
                            >
                                <SquarePen className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setFieldSortDirection((d) => d === null ? "asc" : d === "asc" ? "desc" : null)}
                            className={`inline-flex h-5 w-5 items-center justify-center rounded transition ${fieldSortDirection ? "text-brand" : "text-slate-400 hover:text-slate-600"}`}
                            aria-label={fieldSortDirection === "desc" ? "Sort Z to A" : "Sort A to Z"}
                        >
                            {fieldSortDirection === "desc"
                                ? <ArrowUpZA className="h-3.5 w-3.5" strokeWidth={1.8} />
                                : <ArrowUpAZ className="h-3.5 w-3.5" strokeWidth={1.8} />
                            }
                        </button>
                    </div>
                </div>
                <div className="mt-2">
                    {allFields.map((field) => {
                        const metric = isCustomMetricFieldId(field.id)
                            ? customMetrics.find((m) => m.id === field.id) ?? null
                            : null;
                        return (
                            <FieldListItem
                                key={field.id}
                                field={field}
                                isHidden={hiddenFieldIds.has(field.id)}
                                isPinned={pinnedFieldIds.includes(field.id)}
                                setActiveDrag={setActiveDrag}
                                setDropIndicator={setDropIndicator}
                                clearDragState={clearDragState}
                                onEdit={metric ? () => onEditMetric(metric) : undefined}
                                onDelete={metric ? () => deleteCustomMetric(metric.id) : undefined}
                                onTogglePin={() => setPinnedFieldIds((prev) => {
                                    if (prev.includes(field.id)) {
                                        return prev.filter(id => id !== field.id);
                                    } else {
                                        return [...prev, field.id];
                                    }
                                })}
                                onToggleHide={() => setHiddenFieldIds((prev) => {
                                    const next = new Set(prev);
                                    next.has(field.id) ? next.delete(field.id) : next.add(field.id);
                                    return next;
                                })}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
