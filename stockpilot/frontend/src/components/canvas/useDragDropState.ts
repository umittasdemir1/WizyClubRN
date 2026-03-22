import { useState } from "react";
import type { DragState, PivotZoneId } from "./canvasModel";

export function useDragDropState() {
    const [dragZone, setDragZone] = useState<PivotZoneId | null>(null);
    const [activeDrag, setActiveDrag] = useState<DragState | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ zoneId: PivotZoneId; index: number } | null>(null);

    function clearDragState() {
        setActiveDrag(null);
        setDragZone(null);
        setDropIndicator(null);
    }

    return {
        dragZone,
        setDragZone,
        activeDrag,
        setActiveDrag,
        dropIndicator,
        setDropIndicator,
        clearDragState
    };
}
