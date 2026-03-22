import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult } from "../../types/stock";
import {
    getActionBarNameWidth,
} from "./canvasModel";
import { useTypewriter } from "./useTypewriter";
import { ActivityBar } from "./ActivityBar";
import { DatasetPanel } from "./DatasetPanel";
import { CanvasHeader } from "./CanvasHeader";
import { CanvasSidebar } from "./CanvasSidebar";
import { usePivotOrchestration } from "./usePivotOrchestration";
import { useCanvasPointer } from "./useCanvasPointer";
import { PivotCanvasTable } from "./PivotCanvasTable";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasEmptyState } from "./CanvasEmptyState";
import { usePivotStudio } from "./PivotStudioContext";
import { ErrorBoundary } from "../ErrorBoundary";


interface CanvasStudioProps {
    analysis: AnalysisResult | null;
}

/**
 * CanvasStudio
 * 
 * The composition root for the pivot canvas workspace.
 * Decomposed from a 1,400+ line "God Component" into focused sub-components:
 * - ActivityBar: Panel toggles
 * - DatasetPanel: File/folder explorer
 * - CanvasHeader: Table management, filters, and naming
 * - CanvasSidebar: Pivot field configuration and custom metrics
 * - PivotCanvasTable: The rendering engine for individual pivot tables
 */
export function CanvasStudio({
    analysis,
}: CanvasStudioProps) {
    // ── Context & Orchestration ───────────────────────────────────────────────
    const { files } = usePivotStudio();
    const orchestration = usePivotOrchestration(analysis);
    
    // ── UI State ──────────────────────────────────────────────────────────────
    const [explorerCollapsed, setExplorerCollapsed] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [canvasCollapsed, setCanvasCollapsed] = useState(false);
    const tableWrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // ── Interaction Hooks ─────────────────────────────────────────────────────
    const pointer = useCanvasPointer({
        analysis,
        tables: orchestration.tables,
        setTables: orchestration.setTables,
        tableElementRefs: orchestration.tableElementRefs,
        tableWrapperRefs,
        activeTableId: orchestration.activeTableId,
        setActiveTableId: orchestration.setActiveTableId,
        editingTableId: orchestration.editingTableId
    });

    const canvasSectionRef = useRef<HTMLElement | null>(null);

    // Prevent browser Ctrl+Wheel zoom over the entire canvas section
    useEffect(() => {
        const section = canvasSectionRef.current;
        if (!section) return;
        function handleWheel(e: WheelEvent) {
            if (e.ctrlKey || e.metaKey) e.preventDefault();
        }
        section.addEventListener("wheel", handleWheel, { passive: false });
        return () => section.removeEventListener("wheel", handleWheel);
    }, []);

    const emptyHeaderText = useTypewriter(["Table Editor"]);

    // Handle outside clicks to close workspace menus
    useEffect(() => {
        function handlePointerDown(event: PointerEvent) {
            const target = event.target as HTMLElement;
            if (
                target.closest("button") || 
                target.closest("input") || 
                target.closest(".canvas-studio-header") ||
                target.closest(".header-filter-menu")
            ) return;
            
            orchestration.setIsTableListOpen(false);
            orchestration.setOpenHeaderFilter(null);
            orchestration.setOpenHeaderColorTableId(null);
        }
        window.addEventListener("pointerdown", handlePointerDown);
        return () => window.removeEventListener("pointerdown", handlePointerDown);
    }, [orchestration]);

    const canvasInnerStyle = useMemo(() => {
        let maxRight = 0;
        let maxBottom = 0;
        for (const table of orchestration.tables) {
            maxRight = Math.max(maxRight, table.position.x + table.size.width);
            maxBottom = Math.max(maxBottom, table.position.y + table.size.height);
        }
        return {
            width:  maxRight * pointer.canvasZoom,
            height: maxBottom * pointer.canvasZoom,
        };
    }, [orchestration.tables, pointer.canvasZoom]);

    const headerTableName = (() => {
        const layout = orchestration.activeTable?.layout;
        if (!layout) return "";
        const hasAny = layout.values.length > 0 || layout.rows.length > 0 || layout.columns.length > 0 || layout.filters.length > 0;
        return hasAny ? orchestration.activeTable!.name : "";
    })();

    const actionBarNameWidth = getActionBarNameWidth(
        orchestration.activeTable && orchestration.editingTableId === orchestration.activeTable.id 
            ? orchestration.tableNameDraft || headerTableName 
            : headerTableName
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className="grid gap-[10px] px-[10px] pb-[10px]"
            style={{
                gridTemplateColumns: [
                    "44px",
                    explorerCollapsed ? null : "260px",
                    sidebarCollapsed  ? null : "420px",
                    canvasCollapsed   ? null : "minmax(0,1fr)",
                ].filter(Boolean).join(" ")
            }}
        >
            <ActivityBar
                explorerCollapsed={explorerCollapsed}
                sidebarCollapsed={sidebarCollapsed}
                canvasCollapsed={canvasCollapsed}
                onToggleExplorer={() => setExplorerCollapsed((v) => !v)}
                onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
                onToggleCanvas={() => setCanvasCollapsed((v) => !v)}
            />

            {!explorerCollapsed && (
                <ErrorBoundary>
                    <DatasetPanel
                        explorerCollapsed={explorerCollapsed}
                        onToggleExplorer={() => setExplorerCollapsed((v) => !v)}
                    />
                </ErrorBoundary>
            )}

            {!sidebarCollapsed && (
                <ErrorBoundary>
                    <CanvasSidebar
                        activeLayout={orchestration.activeLayout}
                        customMetrics={orchestration.customMetrics}
                        dragZone={orchestration.dragZone}
                        activeDrag={orchestration.activeDrag}
                        dropIndicator={orchestration.dropIndicator}
                        pinnedFieldIds={orchestration.pinnedFieldIds}
                        setActiveDrag={orchestration.setActiveDrag}
                        setDropIndicator={orchestration.setDropIndicator}
                        setDragZone={orchestration.setDragZone}
                        clearDragState={orchestration.clearDragState}
                        handleZoneDrop={(zoneId, event) => {
                            event.preventDefault();
                            const targetTable = orchestration.getDropTargetTable();
                            if (!targetTable) {
                                orchestration.clearDragState();
                                return;
                            }
                            const fieldId = (orchestration.activeDrag?.fieldId ??
                                event.dataTransfer.getData("text/stockpilot-field")) as any;
                            const targetIndex =
                                orchestration.dropIndicator?.zoneId === zoneId ? orchestration.dropIndicator.index : targetTable.layout[zoneId].length;
                            orchestration.insertFieldIntoZone(fieldId, zoneId, targetIndex);
                            orchestration.clearDragState();
                        }}
                        removeFieldFromZone={orchestration.removeFieldFromZone}
                        addCustomMetric={orchestration.addCustomMetric}
                        deleteCustomMetric={orchestration.deleteCustomMetric}
                        setPinnedFieldIds={orchestration.setPinnedFieldIds}
                        columns={orchestration.columns}
                        columnOverrides={orchestration.columnOverrides}
                        updateColumnOverride={orchestration.updateColumnOverride}
                    />
                </ErrorBoundary>
            )}

            {!canvasCollapsed && (
                <section ref={canvasSectionRef} className="relative flex h-[calc(100vh-91px)] flex-col overflow-hidden rounded-[12px] border border-slate-200/70 bg-white/80 p-[10px] shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)] backdrop-blur-xl">
                    <ErrorBoundary>
                        <CanvasHeader
                            headerTableName={headerTableName}
                            actionBarNameWidth={actionBarNameWidth}
                            emptyHeaderText={emptyHeaderText}
                            orchestration={orchestration}
                            columns={orchestration.columns}
                            customMetrics={orchestration.customMetrics}
                            columnOverrides={orchestration.columnOverrides}
                        />
                    </ErrorBoundary>

                    {!analysis ? (
                        <div className="mt-3 min-h-0 flex-1" />
                    ) : orchestration.visibleTableViews.length === 0 ? (
                        <CanvasEmptyState />
                    ) : (
                        <div className="relative mt-3 flex min-h-0 flex-1 overflow-hidden rounded-none">
                            <div className="canvas-grid-pattern" />
                            <div
                                ref={pointer.tableCanvasRef}
                                className="relative min-h-0 flex-1 overflow-auto rounded-none"
                                style={{ cursor: pointer.canvasTool === "hand" ? "grab" : undefined }}
                                onPointerDown={(event) => {
                                    if (pointer.canvasTool === "hand") {
                                        pointer.handleCanvasPointerDown(event);
                                        return;
                                    }
                                    if (event.target === event.currentTarget || (event.target as HTMLElement).hasAttribute("data-canvas-inner")) {
                                        orchestration.clearTableSelection();
                                    }
                                }}
                            >
                                <div
                                    ref={pointer.canvasInnerRef}
                                    data-canvas-inner="true"
                                    style={{
                                        position: "relative",
                                        width: canvasInnerStyle.width,
                                        height: canvasInnerStyle.height,
                                        minWidth: "100%",
                                        minHeight: "100%"
                                    }}
                                >
                                    <div style={{
                                        transform: `scale(${pointer.canvasZoom})`,
                                        transformOrigin: "0 0"
                                    }}>
                                        {orchestration.visibleTableViews.map((view, viewIndex) => {
                                            const isMoving =
                                                pointer.movingTableId === view.table.id || pointer.resizingTableId === view.table.id;
                                            const tableLayer = isMoving
                                                ? orchestration.visibleTableViews.length + 2
                                                : orchestration.activeTableId === view.table.id
                                                  ? orchestration.visibleTableViews.length + 1
                                                  : viewIndex + 1;

                                            return (
                                                <PivotCanvasTable
                                                    key={view.table.id}
                                                    view={view}
                                                    zIndex={tableLayer}
                                                    isActive={orchestration.activeTableId === view.table.id}
                                                    isMoving={isMoving}
                                                    headerFilterSelections={orchestration.headerFilterSelections}
                                                    headerFilterSortDirections={orchestration.headerFilterSortDirections}
                                                    tableElementRefs={orchestration.tableElementRefs}
                                                    tableWrapperRefs={tableWrapperRefs}
                                                    onTablePointerDown={pointer.handleTablePointerDown}
                                                    onTableResizeStart={pointer.startTableResize}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <CanvasToolbar
                                canvasTool={pointer.canvasTool}
                                canvasZoom={pointer.canvasZoom}
                                setCanvasTool={pointer.setCanvasTool}
                                zoomOut={pointer.zoomOut}
                                zoomReset={pointer.zoomReset}
                                zoomIn={pointer.zoomIn}
                                zoomToFit={pointer.zoomToFit}
                            />
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
