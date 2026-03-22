import { motion } from "framer-motion";
import { BetweenHorizontalStart, BetweenVerticalStart, Diff, Grip, SlidersHorizontal, X } from "lucide-react";
import { Fragment, type DragEvent } from "react";
import {
    PIVOT_FIELD_TEXT_TYPOGRAPHY,
    PIVOT_ZONES,
    getFieldDefinition,
    type ColumnOverride,
    type CustomMetricDefinition,
    type DragState,
    type PivotFieldId,
    type PivotLayout,
    type PivotZoneId
} from "./canvasModel";
import type { ColumnMeta } from "../../types/stock";

interface PivotLayoutBuilderProps {
    activeLayout: PivotLayout;
    columns: ColumnMeta[];
    customMetrics: CustomMetricDefinition[];
    columnOverrides?: Record<string, ColumnOverride>;
    dragZone: PivotZoneId | null;
    activeDrag: DragState | null;
    dropIndicator: { zoneId: PivotZoneId; index: number } | null;
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    setDragZone: (zoneId: PivotZoneId | null) => void;
    clearDragState: () => void;
    handleZoneDrop: (zoneId: PivotZoneId, event: DragEvent<HTMLDivElement>) => void;
    removeFieldFromZone: (fieldId: PivotFieldId, zoneId: PivotZoneId) => void;
}

export function PivotLayoutBuilder({
    activeLayout,
    columns,
    customMetrics,
    columnOverrides = {},
    dragZone,
    activeDrag,
    dropIndicator,
    setActiveDrag,
    setDropIndicator,
    setDragZone,
    clearDragState,
    handleZoneDrop,
    removeFieldFromZone,
}: PivotLayoutBuilderProps) {
    return (
        <div className="mt-3 grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
            {PIVOT_ZONES.map((zone) => {
                const fields = activeLayout[zone.id];

                return (
                    <div key={zone.id} className="flex flex-col">
                        <div className="mb-2 flex items-start gap-1.5 px-1">
                            <div className="shrink-0 pt-0.5 text-ink">
                                {zone.id === "filters" ? (
                                    <SlidersHorizontal className="h-5 w-5" strokeWidth={1.7} />
                                ) : zone.id === "values" ? (
                                    <Diff className="h-5 w-5" strokeWidth={1.7} />
                                ) : zone.id === "columns" ? (
                                    <BetweenVerticalStart className="h-5 w-5" strokeWidth={1.7} />
                                ) : (
                                    <BetweenHorizontalStart className="h-5 w-5" strokeWidth={1.7} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-display text-[1.12rem] font-light leading-[1.08] tracking-tight text-ink">
                                    {zone.label}
                                </p>
                            </div>
                        </div>

                        <div
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragZone(zone.id);
                                setDropIndicator((current) =>
                                    current?.zoneId === zone.id
                                        ? current
                                        : { zoneId: zone.id, index: fields.length }
                                );
                            }}
                            onDrop={(event) => handleZoneDrop(zone.id, event)}
                            className={`flex aspect-[9/10] min-h-0 flex-col overflow-hidden rounded-[10px] border px-3 pb-3 pt-2.5 shadow-[0_18px_42px_-34px_rgba(11,14,20,0.38)] transition ${
                                dragZone === zone.id
                                    ? "border-slate-300 bg-white/80 backdrop-blur-xl"
                                    : "border-slate-200/70 bg-white/80 backdrop-blur-xl"
                            }`}
                        >
                            <div className="min-h-0 flex-1 space-y-0 overflow-y-auto pr-1">
                                {fields.length === 0 ? (
                                    dropIndicator?.zoneId === zone.id ? (
                                        <motion.div
                                            layout
                                            className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                        />
                                    ) : (
                                        <div className="h-0" />
                                    )
                                ) : (
                                    fields.map((fieldId: PivotFieldId) => (
                                        <Fragment key={`${zone.id}:${fieldId}`}>
                                            {dropIndicator?.zoneId === zone.id &&
                                            dropIndicator.index === fields.indexOf(fieldId) ? (
                                                <motion.div
                                                    layout
                                                    className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                                />
                                            ) : null}

                                            <motion.div
                                                layout
                                                transition={{ layout: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
                                                draggable
                                                onDragStart={(event) => {
                                                    const dataTransfer = (event as unknown as DragEvent<HTMLDivElement>).dataTransfer;
                                                    if (!dataTransfer) return;
                                                    dataTransfer.setData("text/stockpilot-field", fieldId);
                                                    dataTransfer.effectAllowed = "move";
                                                    setActiveDrag({ fieldId, sourceZone: zone.id });
                                                }}
                                                onDragEnd={clearDragState}
                                                onDragOver={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    const bounds = event.currentTarget.getBoundingClientRect();
                                                    const nextIndex =
                                                        event.clientY < bounds.top + bounds.height / 2
                                                            ? fields.indexOf(fieldId)
                                                            : fields.indexOf(fieldId) + 1;
                                                    setDragZone(zone.id);
                                                    setDropIndicator((current) =>
                                                        current?.zoneId === zone.id && current.index === nextIndex
                                                            ? current
                                                            : { zoneId: zone.id, index: nextIndex }
                                                    );
                                                }}
                                                className={`flex items-center justify-between gap-3 border-b border-slate-200/70 py-1 text-sm text-slate-800 transition last:border-b-0 ${
                                                    activeDrag?.fieldId === fieldId && activeDrag?.sourceZone === zone.id
                                                        ? "opacity-45"
                                                        : "opacity-100"
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-start gap-1.5">
                                                    <Grip className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                                                    <span className="truncate font-display text-[0.92rem] font-light leading-[1.08] tracking-tight text-ink">
                                                        {getFieldDefinition(fieldId, columns, customMetrics, columnOverrides).label}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFieldFromZone(fieldId, zone.id)}
                                                    className="rounded-full p-0.5 text-slate-500 transition hover:text-ink"
                                                    aria-label={`Remove ${getFieldDefinition(fieldId, columns, customMetrics, columnOverrides).label}`}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </motion.div>

                                            {dropIndicator?.zoneId === zone.id &&
                                            dropIndicator.index === fields.length &&
                                            fieldId === fields[fields.length - 1] ? (
                                                <motion.div
                                                    layout
                                                    className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                                />
                                            ) : null}
                                        </Fragment>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
