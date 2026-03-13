import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent
} from "react";
import {
    AUTO_FIT_SCROLLBAR_GUTTER,
    DEFAULT_TABLE_HEIGHT,
    MIN_TABLE_HEIGHT,
    type MoveState,
    type PivotTableInstance,
    type ResizeState,
    type TableResizeDirection,
    MIN_TABLE_WIDTH
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

    const tableCanvasRef = useRef<HTMLDivElement | null>(null);
    const moveStateRef = useRef<MoveState | null>(null);
    const resizeStateRef = useRef<ResizeState | null>(null);
    const tablesRef = useRef(tables);
    const activeTableIdRef = useRef(activeTableId);
    const editingTableIdRef = useRef(editingTableId);
    const resizingTableIdRef = useRef<string | null>(resizingTableId);

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

    useLayoutEffect(() => {
        const canvas = tableCanvasRef.current;
        if (!canvas) {
            return;
        }

        setTables((current) => {
            let hasChanges = false;

            const nextTables = current.map((table) => {
                if (table.hasCustomizedSize || table.layout.values.length === 0) {
                    return table;
                }

                const tableElement = tableElementRefs.current[table.id];
                if (!tableElement) {
                    return table;
                }

                const availableWidth = Math.max(0, canvas.clientWidth - table.position.x);
                const availableHeight = Math.max(0, canvas.clientHeight - table.position.y);
                const contentHeight = Math.ceil(tableElement.getBoundingClientRect().height);
                const nextHeight = Math.min(contentHeight, DEFAULT_TABLE_HEIGHT, availableHeight);
                const needsVerticalScrollbar = contentHeight > nextHeight;
                const contentWidth = Math.ceil(tableElement.getBoundingClientRect().width);
                const nextWidth = Math.min(
                    contentWidth + (needsVerticalScrollbar ? AUTO_FIT_SCROLLBAR_GUTTER : 0),
                    availableWidth
                );

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

            const canvasRect = canvas.getBoundingClientRect();
            const moveState = moveStateRef.current;
            if (moveState) {
                const currentTable = tablesRef.current.find((table) => table.id === moveState.tableId);
                if (!currentTable) {
                    return;
                }

                const deltaX = event.clientX - moveState.startPointerX;
                const deltaY = event.clientY - moveState.startPointerY;
                const nextX = Math.min(
                    Math.max(0, moveState.startX + deltaX),
                    Math.max(0, canvasRect.width - currentTable.size.width)
                );
                const nextY = Math.min(
                    Math.max(0, moveState.startY + deltaY),
                    Math.max(0, canvasRect.height - currentTable.size.height)
                );

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
                const deltaX = event.clientX - resizeState.startPointerX;
                const deltaY = event.clientY - resizeState.startPointerY;
                const startLeft = resizeState.startX;
                const startTop = resizeState.startY;
                const startRight = resizeState.startX + resizeState.startWidth;
                const startBottom = resizeState.startY + resizeState.startHeight;

                let nextLeft = startLeft;
                let nextTop = startTop;
                let nextRight = startRight;
                let nextBottom = startBottom;

                if (resizeState.direction.includes("e")) {
                    nextRight = Math.min(
                        canvasRect.width,
                        Math.max(startLeft + MIN_TABLE_WIDTH, startRight + deltaX)
                    );
                }

                if (resizeState.direction.includes("s")) {
                    nextBottom = Math.min(
                        canvasRect.height,
                        Math.max(startTop + MIN_TABLE_HEIGHT, startBottom + deltaY)
                    );
                }

                if (resizeState.direction.includes("w")) {
                    nextLeft = Math.max(0, Math.min(startRight - MIN_TABLE_WIDTH, startLeft + deltaX));
                }

                if (resizeState.direction.includes("n")) {
                    nextTop = Math.max(0, Math.min(startBottom - MIN_TABLE_HEIGHT, startTop + deltaY));
                }

                resizeState.currentX = nextLeft;
                resizeState.currentY = nextTop;
                resizeState.currentWidth = nextRight - nextLeft;
                resizeState.currentHeight = nextBottom - nextTop;
                resizeState.hasMoved = true;

                const wrapper = tableWrapperRefs.current[resizeState.tableId];
                if (wrapper) {
                    wrapper.style.left = `${nextLeft}px`;
                    wrapper.style.top = `${nextTop}px`;
                    wrapper.style.width = `${nextRight - nextLeft}px`;
                    wrapper.style.height = `${nextBottom - nextTop}px`;
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
                        table.id === state.tableId && state.currentX !== undefined && state.currentY !== undefined && state.currentWidth !== undefined && state.currentHeight !== undefined
                            ? {
                                  ...table,
                                  hasCustomizedSize: true,
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
        resizeStateRef.current = {
            tableId,
            direction,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: currentTable.position.x,
            startY: currentTable.position.y,
            startWidth: currentTable.size.width,
            startHeight: currentTable.size.height
        };
    }, [setActiveTableId]);

    return {
        tableCanvasRef,

        movingTableId,
        resizingTableId,

        handleTablePointerDown,
        startTableResize
    };
}
