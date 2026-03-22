import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";
import {
    type ColumnOverride,
    type CustomMetricDefinition,
    type CustomMetricId,
    type DragState,
    type PivotFieldId,
    type PivotLayout,
    type PivotZoneId
} from "./canvasModel";
import { CustomMetricEditor } from "./CustomMetricEditor";
import { FieldFormatPanel } from "./FieldFormatPanel";
import { PivotFieldBrowser } from "./PivotFieldBrowser";
import { PivotLayoutBuilder } from "./PivotLayoutBuilder";
import { useCustomMetricBuilder } from "./useCustomMetricBuilder";
import { useFieldFormatState } from "./useFieldFormatState";

type SidebarPanel = "calculations" | "layout" | "field-editor" | null;

interface CanvasSidebarProps {
    activeLayout: PivotLayout;
    columns: import("../../types/stock").ColumnMeta[];
    columnOverrides: Record<string, ColumnOverride>;
    updateColumnOverride: (key: string, override: ColumnOverride | null) => void;
    customMetrics: CustomMetricDefinition[];
    dragZone: PivotZoneId | null;
    activeDrag: DragState | null;
    dropIndicator: { zoneId: PivotZoneId; index: number } | null;
    pinnedFieldIds: PivotFieldId[];
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    setDragZone: (zoneId: PivotZoneId | null) => void;
    clearDragState: () => void;
    handleZoneDrop: (zoneId: PivotZoneId, event: DragEvent<HTMLDivElement>) => void;
    removeFieldFromZone: (fieldId: PivotFieldId, zoneId: PivotZoneId) => void;
    addCustomMetric: (value: Omit<CustomMetricDefinition, "id">) => CustomMetricDefinition;
    deleteCustomMetric: (id: CustomMetricId) => void;
    setPinnedFieldIds: React.Dispatch<React.SetStateAction<PivotFieldId[]>>;
}

export function CanvasSidebar({
    activeLayout,
    columns,
    columnOverrides,
    updateColumnOverride,
    customMetrics,
    dragZone,
    activeDrag,
    dropIndicator,
    pinnedFieldIds,
    setActiveDrag,
    setDropIndicator,
    setDragZone,
    clearDragState,
    handleZoneDrop,
    removeFieldFromZone,
    addCustomMetric,
    deleteCustomMetric,
    setPinnedFieldIds,
}: CanvasSidebarProps) {
    const [activePanel, setActivePanel] = useState<SidebarPanel>("layout");
    const [isFieldsOpen, setIsFieldsOpen] = useState(true);

    const metricBuilder = useCustomMetricBuilder(
        columns,
        customMetrics,
        addCustomMetric,
        deleteCustomMetric,
        () => setActivePanel("layout")
    );

    const formatState = useFieldFormatState(
        columns,
        columnOverrides,
        updateColumnOverride
    );

    useEffect(() => {
        if (activePanel === "calculations") {
            setTimeout(() => metricBuilder.manualInputRef.current?.focus(), 100);
        }
        if (activePanel !== "field-editor") {
            formatState.setPendingOverrides({});
        }
    }, [activePanel]);

    return (
        <>
        <aside className="flex h-[calc(100vh-91px)] flex-col overflow-hidden rounded-[12px] border border-slate-200/70 bg-white/80 shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)] backdrop-blur-xl">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
                
                {/* ── Fields Section ── */}
                <div>
                    <button
                        type="button"
                        onClick={() => setIsFieldsOpen((v) => !v)}
                        className="flex w-full items-start justify-between gap-4 rounded-[12px] px-1 py-1 text-left transition hover:bg-white/45"
                    >
                        <div className="px-1">
                            <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Fields
                            </p>
                        </div>
                        <span className="mt-px inline-flex shrink-0 items-center justify-center text-slate-500">
                            {isFieldsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                    </button>
                </div>

                {isFieldsOpen && (
                    <div className="mt-4 h-[184px] shrink-0 overflow-hidden">
                        <PivotFieldBrowser
                            columns={columns}
                            customMetrics={customMetrics}
                            columnOverrides={columnOverrides}
                            pinnedFieldIds={pinnedFieldIds}
                            setPinnedFieldIds={setPinnedFieldIds}
                            activeDrag={activeDrag}
                            setActiveDrag={setActiveDrag}
                            setDropIndicator={setDropIndicator}
                            clearDragState={clearDragState}
                            deleteCustomMetric={deleteCustomMetric}
                            onEditMetric={metricBuilder.loadMetricForEdit}
                            isFieldEditorOpen={activePanel === "field-editor"}
                            onOpenFieldEditor={() => setActivePanel((p) => p === "field-editor" ? "layout" : "field-editor")}
                        />
                    </div>
                )}

                {/* ── Calculations Section ── */}
                <div className="mt-5">
                    <button
                        type="button"
                        onClick={() => setActivePanel((p) => p === "calculations" ? "layout" : "calculations")}
                        className="flex w-full items-start justify-between gap-4 rounded-[12px] px-1 py-1 text-left transition hover:bg-white/45"
                    >
                        <div className="px-1">
                            <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Calculations
                            </p>
                        </div>
                        <span className="mt-px inline-flex shrink-0 items-center justify-center text-slate-500">
                            {activePanel === "calculations" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                    </button>
                </div>

                {activePanel === "calculations" && (
                    <div className="mt-3 shrink-0 overflow-hidden">
                        <div className="overflow-y-auto pr-1">
                            <CustomMetricEditor
                                {...metricBuilder}
                                columns={columns}
                                customMetrics={customMetrics}
                            />
                        </div>
                    </div>
                )}

                {/* ── Layout Section ── */}
                <div className="mt-5">
                    <button
                        type="button"
                        onClick={() => setActivePanel((p) => p === "layout" ? null : "layout")}
                        className="flex w-full items-start justify-between gap-4 rounded-[12px] px-1 py-1 text-left transition hover:bg-white/45"
                    >
                        <div className="px-1">
                            <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Layout
                            </p>
                        </div>
                        <span className="mt-px inline-flex shrink-0 items-center justify-center text-slate-500">
                            {activePanel === "layout" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                    </button>
                </div>

                {activePanel === "layout" && (
                    <PivotLayoutBuilder
                        activeLayout={activeLayout}
                        columns={columns}
                        customMetrics={customMetrics}
                        dragZone={dragZone}
                        activeDrag={activeDrag}
                        dropIndicator={dropIndicator}
                        setActiveDrag={setActiveDrag}
                        setDropIndicator={setDropIndicator}
                        setDragZone={setDragZone}
                        clearDragState={clearDragState}
                        handleZoneDrop={handleZoneDrop}
                        removeFieldFromZone={removeFieldFromZone}
                    />
                )}

            </div>
        </aside>

        {activePanel === "field-editor" && (
            <FieldFormatPanel
                {...formatState}
                columns={columns}
                columnOverrides={columnOverrides}
                updateColumnOverride={updateColumnOverride}
                onClose={() => setActivePanel("layout")}
            />
        )}
        </>
    );
}
