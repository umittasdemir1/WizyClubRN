import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent
} from "react";
import {
    CANVAS_ZOOM_STEP,
    DEFAULT_CANVAS_ZOOM,
    MAX_CANVAS_ZOOM,
    MIN_CANVAS_ZOOM,
    MIN_TABLE_HEIGHT,
    MIN_TABLE_WIDTH,
    type MoveState,
    type PivotTableInstance,
    type ResizeState,
    type TableResizeDirection
} from "./canvasModel";
import type { AnalysisResult } from "../../types/stock";
import { useCanvasTool } from "./useCanvasTool";

// Re-export for consumers that imported CanvasTool from this module
export type { CanvasTool } from "./useCanvasTool";

interface PanState {
    startPointerX: number;
    startPointerY: number;
    startScrollLeft: number;
    startScrollTop: number;
}

interface UseCanvasPointerParams {
    analysis: AnalysisResult | null;
    tables: PivotTableInstance[];
    setTables: React.Dispatch<React.SetStateAction<PivotTableInstance[]>>;
    tableElementRefs: React.MutableRefObject<Record<string, HTMLTableElement | null>>;
    tableWrapperRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    activeTableId: string | null;
    setActiveTableId: (id: string | null) => void;
    editingTableId: string | null;
}

export function useCanvasPointer({
    analysis,
    tables,
    setTables,
    tableElementRefs,
    tableWrapperRefs,
    activeTableId,
    setActiveTableId,
    editingTableId
}: UseCanvasPointerParams) {
    const [movingTableId, setMovingTableId] = useState<string | null>(null);
    const [resizingTableId, setResizingTableId] = useState<string | null>(null);
    const [canvasZoom, setCanvasZoom] = useState(DEFAULT_CANVAS_ZOOM);

    // Sub-hooks for focused concerns
    const { canvasTool, setCanvasTool, canvasToolRef } = useCanvasTool();

    const tableCanvasRef = useRef<HTMLDivElement | null>(null);
    const canvasInnerRef = useRef<HTMLDivElement | null>(null);
    const moveStateRef = useRef<MoveState | null>(null);
    const resizeStateRef = useRef<ResizeState | null>(null);
    const panStateRef = useRef<PanState | null>(null);
    const tablesRef = useRef(tables);
    const activeTableIdRef = useRef(activeTableId);
    const editingTableIdRef = useRef(editingTableId);
    const resizingTableIdRef = useRef<string | null>(resizingTableId);
    const canvasZoomRef = useRef(canvasZoom);
    const prevAutoFitKeyRef = useRef("");

    useEffect(() => {
        tablesRef.current = tables;
    }, [tables]);

    useEffect(() => {
        activeTableIdRef.current = activeTableId;
    }, [activeTableId]);

    useEffect(() => {
        editingTableIdRef.current = editingTableId;
    }, [editingTableId]);

    useEffect(() => {
        resizingTableIdRef.current = resizingTableId;
    }, [resizingTableId]);

    useEffect(() => {
        canvasZoomRef.current = canvasZoom;
    }, [canvasZoom]);



    // Compute a key that changes only when layout/scale/filters change (not position/color/name).
    // Adding this to the useLayoutEffect dep array ensures auto-fit fires on every relevant change.
    const autoFitKey = useMemo(() =>
        tables.map((t) =>
            `${t.id}:${t.scale}:${JSON.stringify(t.layout)}:${JSON.stringify(t.filterSelections)}`
        ).join("|"),
        [tables]
    );

    useLayoutEffect(() => {
        const currentCanvasZoom = canvasZoomRef.current;
        setTables((current) => {
            let hasChanges = false;

            const nextTables = current.map((table) => {
                // Skip tables the user has manually resized — their size is intentional.
                if (table.manualSize) return table;

                const tableElement = tableElementRefs.current[table.id];
                if (!tableElement) return table;

                // getBoundingClientRect includes both CSS zoom (table.scale) AND
                // canvas transform scale (canvasZoom). Divide by canvasZoom to get
                // the size in inner-canvas coordinates (which is what we store).
                const rect = tableElement.getBoundingClientRect();
                const nextWidth = Math.ceil(rect.width / currentCanvasZoom);
                // +1 to prevent border-collapse rounding from clipping the grand total row
                const nextHeight = Math.ceil(rect.height / currentCanvasZoom) + 1;

                if (nextWidth <= 0 || nextHeight <= 0) return table;
                if (table.size.width === nextWidth && table.size.height === nextHeight) return table;

                hasChanges = true;
                return { ...table, size: { width: nextWidth, height: nextHeight } };
            });

            return hasChanges ? nextTables : current;
        });
    }, [autoFitKey, analysis, setTables, tableElementRefs]);

    useEffect(() => {
        function handlePointerMove(event: PointerEvent) {
            const canvas = tableCanvasRef.current;
            if (!canvas) {
                return;
            }

            // Hand tool panning
            const panState = panStateRef.current;
            if (panState) {
                const dx = event.clientX - panState.startPointerX;
                const dy = event.clientY - panState.startPointerY;
                canvas.scrollLeft = panState.startScrollLeft - dx;
                canvas.scrollTop = panState.startScrollTop - dy;
                return;
            }

            const moveState = moveStateRef.current;
            if (moveState) {
                const zoom = canvasZoomRef.current;
                const deltaX = (event.clientX - moveState.startPointerX) / zoom;
                const deltaY = (event.clientY - moveState.startPointerY) / zoom;
                const nextX = Math.max(0, moveState.startX + deltaX);
                const nextY = Math.max(0, moveState.startY + deltaY);

                moveState.currentX = nextX;
                moveState.currentY = nextY;
                moveState.hasMoved = true;

                const wrapper = tableWrapperRefs.current[moveState.tableId];
                if (wrapper) {
                    wrapper.style.left = `${nextX}px`;
                    wrapper.style.top = `${nextY}px`;
                }
                return;
            }

            const resizeState = resizeStateRef.current;
            if (resizeState) {
                const zoom = canvasZoomRef.current;
                const deltaX = (event.clientX - resizeState.startPointerX) / zoom;
                const deltaY = (event.clientY - resizeState.startPointerY) / zoom;
                const startLeft = resizeState.startX;
                const startTop = resizeState.startY;
                const startRight = resizeState.startX + resizeState.startWidth;
                const startBottom = resizeState.startY + resizeState.startHeight;

                // Calculate raw dragged bounds
                let rawRight = startRight;
                let rawBottom = startBottom;
                let rawLeft = startLeft;
                let rawTop = startTop;

                if (resizeState.direction.includes("e")) rawRight = startRight + deltaX;
                if (resizeState.direction.includes("s")) rawBottom = startBottom + deltaY;
                if (resizeState.direction.includes("w")) rawLeft = startLeft + deltaX;
                if (resizeState.direction.includes("n")) rawTop = startTop + deltaY;

                // Derive new scale: use height for pure-vertical handles, width for all others
                const isPureVertical = resizeState.direction === "n" || resizeState.direction === "s";
                const minScale = Math.max(
                    MIN_TABLE_WIDTH / resizeState.naturalWidth,
                    MIN_TABLE_HEIGHT / resizeState.naturalHeight
                );
                const rawScale = isPureVertical
                    ? (rawBottom - rawTop) / resizeState.naturalHeight
                    : (rawRight - rawLeft) / resizeState.naturalWidth;
                const newScale = Math.max(rawScale, minScale);

                // New dimensions are always naturalSize × scale (uniform scaling)
                const newWidth = resizeState.naturalWidth * newScale;
                const newHeight = resizeState.naturalHeight * newScale;

                // Recompute origin so the "fixed" edge stays in place
                let finalLeft = startLeft;
                let finalTop = startTop;
                if (resizeState.direction.includes("w")) finalLeft = startRight - newWidth;
                if (resizeState.direction.includes("n")) finalTop = startBottom - newHeight;

                resizeState.currentX = finalLeft;
                resizeState.currentY = finalTop;
                resizeState.currentWidth = newWidth;
                resizeState.currentHeight = newHeight;
                resizeState.currentScale = newScale;
                resizeState.hasMoved = true;

                // Apply zoom directly to table element for immediate visual feedback
                const tableElement = tableElementRefs.current[resizeState.tableId];
                if (tableElement) {
                    (tableElement.style as CSSStyleDeclaration & { zoom: string }).zoom = String(newScale);
                }

                const wrapper = tableWrapperRefs.current[resizeState.tableId];
                if (wrapper) {
                    wrapper.style.left = `${finalLeft}px`;
                    wrapper.style.top = `${finalTop}px`;
                    wrapper.style.width = `${newWidth}px`;
                    wrapper.style.height = `${newHeight}px`;
                }
                return;
            }
        }

        function handlePointerUp() {
            panStateRef.current = null;

            if (moveStateRef.current?.hasMoved) {
                const state = moveStateRef.current;
                setTables((current) =>
                    current.map((table) =>
                        table.id === state.tableId && state.currentX !== undefined && state.currentY !== undefined
                            ? { ...table, position: { x: state.currentX, y: state.currentY } }
                            : table
                    )
                );
            }

            if (resizeStateRef.current?.hasMoved) {
                const state = resizeStateRef.current;
                setTables((current) =>
                    current.map((table) =>
                        table.id === state.tableId &&
                        state.currentX !== undefined &&
                        state.currentY !== undefined &&
                        state.currentWidth !== undefined &&
                        state.currentHeight !== undefined &&
                        state.currentScale !== undefined
                            ? {
                                  ...table,
                                  manualSize: true,
                                  scale: state.currentScale,
                                  position: { x: state.currentX, y: state.currentY },
                                  size: { width: state.currentWidth, height: state.currentHeight }
                              }
                            : table
                    )
                );
            }

            moveStateRef.current = null;
            setMovingTableId(null);
            resizeStateRef.current = null;
            setResizingTableId(null);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [setTables]);


    // ── Pending scroll target (applied after DOM update via useLayoutEffect) ──
    const pendingScrollRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);

    /**
     * After React commits DOM changes (new zoom → new inner div dimensions),
     * apply the pending scroll.
     */
    useLayoutEffect(() => {
        const pending = pendingScrollRef.current;
        if (!pending) return;
        pendingScrollRef.current = null;

        const canvas = tableCanvasRef.current;
        if (!canvas) return;

        canvas.scrollLeft = pending.scrollLeft;
        canvas.scrollTop = pending.scrollTop;
    }, [canvasZoom]);

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Get the content-space focal point for the active table (or bounding-box center of all tables). */
    const getFocalPoint = useCallback((): { x: number; y: number } | null => {
        const tables = tablesRef.current;
        if (tables.length === 0) return null;

        const active = tables.find((t) => t.id === activeTableIdRef.current);
        if (active) {
            return {
                x: active.position.x + active.size.width / 2,
                y: active.position.y + active.size.height / 2,
            };
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const t of tables) {
            minX = Math.min(minX, t.position.x);
            minY = Math.min(minY, t.position.y);
            maxX = Math.max(maxX, t.position.x + t.size.width);
            maxY = Math.max(maxY, t.position.y + t.size.height);
        }
        return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    }, []);

    /** Clamp a raw zoom value to the allowed range. */
    const clampZoom = useCallback((raw: number): number => {
        return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, Math.round(raw * 100) / 100));
    }, []);

    /**
     * Apply zoom centered on the active table (or all-tables center).
     */
    const applyZoom = useCallback((next: number) => {
        const canvas = tableCanvasRef.current;
        if (!canvas) return;

        const clamped = clampZoom(next);
        const oldZoom = canvasZoomRef.current;
        if (clamped === oldZoom) return;

        // Focal point = center of what's currently visible in the viewport
        const viewCenterX = canvas.scrollLeft + canvas.clientWidth / 2;
        const viewCenterY = canvas.scrollTop + canvas.clientHeight / 2;
        const focalX = viewCenterX / oldZoom;
        const focalY = viewCenterY / oldZoom;

        pendingScrollRef.current = {
            scrollLeft: Math.max(0, focalX * clamped - canvas.clientWidth / 2),
            scrollTop:  Math.max(0, focalY * clamped - canvas.clientHeight / 2),
        };
        setCanvasZoom(clamped);
    }, [clampZoom]);

    // ── Canvas zoom via Ctrl+Wheel (focal-point under cursor) ──
    useEffect(() => {
        const canvas = tableCanvasRef.current;
        if (!canvas) return;

        function handleWheel(event: WheelEvent) {
            if (!canvas) return;
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();

            const oldZoom = canvasZoomRef.current;
            const delta = event.deltaY > 0 ? -CANVAS_ZOOM_STEP : CANVAS_ZOOM_STEP;
            const nextZoom = oldZoom + delta;
            const clamped = clampZoom(nextZoom);
            if (clamped === oldZoom) return;

            const canvasRect = canvas.getBoundingClientRect();
            const mouseViewportX = event.clientX - canvasRect.left;
            const mouseViewportY = event.clientY - canvasRect.top;
            const focalX = (canvas.scrollLeft + mouseViewportX) / oldZoom;
            const focalY = (canvas.scrollTop + mouseViewportY) / oldZoom;

            pendingScrollRef.current = {
                scrollLeft: Math.max(0, focalX * clamped - mouseViewportX),
                scrollTop:  Math.max(0, focalY * clamped - mouseViewportY),
            };
            setCanvasZoom(clamped);
        }

        canvas.addEventListener("wheel", handleWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", handleWheel);
    }, [clampZoom]);

    const zoomIn = useCallback(() => {
        applyZoom(canvasZoomRef.current + CANVAS_ZOOM_STEP);
    }, [applyZoom]);

    const zoomOut = useCallback(() => {
        applyZoom(canvasZoomRef.current - CANVAS_ZOOM_STEP);
    }, [applyZoom]);

    const zoomReset = useCallback(() => {
        applyZoom(DEFAULT_CANVAS_ZOOM);
    }, [applyZoom]);

    const zoomToFit = useCallback(() => {
        const canvas = tableCanvasRef.current;
        if (!canvas) return;
        const currentTables = tablesRef.current;
        if (currentTables.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const table of currentTables) {
            minX = Math.min(minX, table.position.x);
            minY = Math.min(minY, table.position.y);
            maxX = Math.max(maxX, table.position.x + table.size.width);
            maxY = Math.max(maxY, table.position.y + table.size.height);
        }

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        if (contentWidth <= 0 || contentHeight <= 0) return;

        const padding = 0.9;
        const fitZoom = Math.min(
            (canvas.clientWidth * padding) / contentWidth,
            (canvas.clientHeight * padding) / contentHeight,
            MAX_CANVAS_ZOOM
        );
        const clamped = clampZoom(fitZoom);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        pendingScrollRef.current = {
            scrollLeft: Math.max(0, centerX * clamped - canvas.clientWidth / 2),
            scrollTop:  Math.max(0, centerY * clamped - canvas.clientHeight / 2),
        };
        setCanvasZoom(clamped);
    }, [clampZoom]);

    const startTableMove = useCallback((tableId: string, event: ReactPointerEvent<HTMLDivElement>) => {
        if (editingTableIdRef.current || resizingTableIdRef.current) {
            return;
        }

        const currentTable = tablesRef.current.find((table) => table.id === tableId);
        if (!currentTable) {
            return;
        }

        event.preventDefault();
        setActiveTableId(tableId);
        setMovingTableId(tableId);
        moveStateRef.current = {
            tableId,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: currentTable.position.x,
            startY: currentTable.position.y
        };
    }, [setActiveTableId]);

    const handleCanvasPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (canvasToolRef.current !== "hand") return;

        const canvas = tableCanvasRef.current;
        if (!canvas) return;

        event.preventDefault();
        panStateRef.current = {
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startScrollLeft: canvas.scrollLeft,
            startScrollTop: canvas.scrollTop
        };
    }, []);

    const handleTablePointerDown = useCallback((tableId: string, event: ReactPointerEvent<HTMLDivElement>) => {
        // Hand tool: start panning instead of table interaction
        if (canvasToolRef.current === "hand") {
            handleCanvasPointerDown(event);
            return;
        }

        const target = event.target as HTMLElement;
        if (
            target.closest("[data-no-table-drag='true']") ||
            target.closest("[data-table-resize-handle='true']")
        ) {
            return;
        }

        if (activeTableIdRef.current !== tableId) {
            setActiveTableId(tableId);
            return;
        }

        startTableMove(tableId, event);
    }, [setActiveTableId, startTableMove, handleCanvasPointerDown]);

    const startTableResize = useCallback((
        tableId: string,
        direction: TableResizeDirection,
        event: ReactPointerEvent<HTMLButtonElement>
    ) => {
        const currentTable = tablesRef.current.find((table) => table.id === tableId);
        if (!currentTable) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        moveStateRef.current = null;
        setMovingTableId(null);
        setActiveTableId(tableId);
        setResizingTableId(tableId);
        const naturalWidth = currentTable.size.width / currentTable.scale;
        const naturalHeight = currentTable.size.height / currentTable.scale;
        resizeStateRef.current = {
            tableId,
            direction,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: currentTable.position.x,
            startY: currentTable.position.y,
            startWidth: currentTable.size.width,
            startHeight: currentTable.size.height,
            startScale: currentTable.scale,
            naturalWidth,
            naturalHeight
        };
    }, [setActiveTableId]);

    return {
        tableCanvasRef,
        canvasInnerRef,

        canvasZoom,
        zoomIn,
        zoomOut,
        zoomReset,
        zoomToFit,

        canvasTool,
        setCanvasTool,

        movingTableId,
        resizingTableId,

        handleCanvasPointerDown,
        handleTablePointerDown,
        startTableResize
    };
}
