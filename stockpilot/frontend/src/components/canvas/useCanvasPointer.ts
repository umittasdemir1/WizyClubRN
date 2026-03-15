import {
    useCallback,
    useEffect,
    useLayoutEffect,
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

    const tableCanvasRef = useRef<HTMLDivElement | null>(null);
    const canvasInnerRef = useRef<HTMLDivElement | null>(null);
    const moveStateRef = useRef<MoveState | null>(null);
    const resizeStateRef = useRef<ResizeState | null>(null);
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

    useLayoutEffect(() => {
        // Skip auto-fit when only position/name/color changed (not layout/data/scale)
        const autoFitKey = tables.map((t) =>
            `${t.id}:${t.scale}:${JSON.stringify(t.layout)}:${JSON.stringify(t.filterSelections)}`
        ).join("|");
        if (autoFitKey === prevAutoFitKeyRef.current) return;
        prevAutoFitKeyRef.current = autoFitKey;

        const currentCanvasZoom = canvasZoomRef.current;
        setTables((current) => {
            let hasChanges = false;

            const nextTables = current.map((table) => {
                const tableElement = tableElementRefs.current[table.id];
                if (!tableElement) {
                    return table;
                }

                // getBoundingClientRect includes both CSS zoom (table.scale) AND
                // canvas transform scale (canvasZoom). Divide by canvasZoom to get
                // the size in inner-canvas coordinates (which is what we store).
                const rect = tableElement.getBoundingClientRect();
                const nextWidth = Math.ceil(rect.width / currentCanvasZoom);
                const nextHeight = Math.ceil(rect.height / currentCanvasZoom);

                if (nextWidth <= 0 || nextHeight <= 0) {
                    return table;
                }

                if (table.size.width === nextWidth && table.size.height === nextHeight) {
                    return table;
                }

                hasChanges = true;
                return {
                    ...table,
                    size: {
                        width: nextWidth,
                        height: nextHeight
                    }
                };
            });

            return hasChanges ? nextTables : current;
        });
    }, [analysis, tables, setTables, tableElementRefs]);

    useEffect(() => {
        function handlePointerMove(event: PointerEvent) {
            const canvas = tableCanvasRef.current;
            if (!canvas) {
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

    // ── Canvas zoom via Ctrl+Wheel ──
    useEffect(() => {
        const canvas = tableCanvasRef.current;
        if (!canvas) return;

        function handleWheel(event: WheelEvent) {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();

            const delta = event.deltaY > 0 ? -CANVAS_ZOOM_STEP : CANVAS_ZOOM_STEP;
            setCanvasZoom((prev) => {
                const next = Math.round((prev + delta) * 100) / 100;
                return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, next));
            });
        }

        canvas.addEventListener("wheel", handleWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", handleWheel);
    }, []);

    const zoomIn = useCallback(() => {
        setCanvasZoom((prev) => Math.min(MAX_CANVAS_ZOOM, Math.round((prev + CANVAS_ZOOM_STEP) * 100) / 100));
    }, []);

    const zoomOut = useCallback(() => {
        setCanvasZoom((prev) => Math.max(MIN_CANVAS_ZOOM, Math.round((prev - CANVAS_ZOOM_STEP) * 100) / 100));
    }, []);

    const zoomReset = useCallback(() => {
        setCanvasZoom(DEFAULT_CANVAS_ZOOM);
    }, []);

    const zoomToFit = useCallback(() => {
        const canvas = tableCanvasRef.current;
        if (!canvas) return;
        const currentTables = tablesRef.current;
        if (currentTables.length === 0) return;

        // Compute bounding box of all tables in inner canvas coordinates
        let maxRight = 0;
        let maxBottom = 0;
        for (const table of currentTables) {
            maxRight = Math.max(maxRight, table.position.x + table.size.width);
            maxBottom = Math.max(maxBottom, table.position.y + table.size.height);
        }

        if (maxRight <= 0 || maxBottom <= 0) return;

        const viewportWidth = canvas.clientWidth;
        const viewportHeight = canvas.clientHeight;
        const fitZoom = Math.min(viewportWidth / maxRight, viewportHeight / maxBottom, MAX_CANVAS_ZOOM);
        setCanvasZoom(Math.max(MIN_CANVAS_ZOOM, Math.round(fitZoom * 100) / 100));
    }, []);

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

    const handleTablePointerDown = useCallback((tableId: string, event: ReactPointerEvent<HTMLDivElement>) => {
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
    }, [setActiveTableId, startTableMove]);

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

        movingTableId,
        resizingTableId,

        handleTablePointerDown,
        startTableResize
    };
}
