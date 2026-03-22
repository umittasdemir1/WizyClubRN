import { useRef, useState } from "react";

export type CanvasTool = "pointer" | "hand";

export function useCanvasTool() {
    const [canvasTool, setCanvasTool] = useState<CanvasTool>("pointer");
    const canvasToolRef = useRef<CanvasTool>(canvasTool);

    function setTool(tool: CanvasTool) {
        canvasToolRef.current = tool;
        setCanvasTool(tool);
    }

    return { canvasTool, setCanvasTool: setTool, canvasToolRef };
}
