import React from "react";
import { Hand, Maximize2, Minus, MousePointer2, Plus } from "lucide-react";

export interface CanvasToolbarProps {
    canvasTool: "pointer" | "hand";
    canvasZoom: number;
    setCanvasTool: (tool: "pointer" | "hand") => void;
    zoomOut: () => void;
    zoomReset: () => void;
    zoomIn: () => void;
    zoomToFit: () => void;
}

export function CanvasToolbar({
    canvasTool,
    canvasZoom,
    setCanvasTool,
    zoomOut,
    zoomReset,
    zoomIn,
    zoomToFit,
}: CanvasToolbarProps) {
    return (
        <div className="absolute bottom-[22px] left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-[14px] bg-[#080a0f] px-3 py-2 shadow-[0_12px_40px_-8px_rgba(8,10,15,0.5)]">
            <button
                type="button"
                onClick={() => setCanvasTool("pointer")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] transition ${
                    canvasTool === "pointer"
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                aria-label="Pointer tool"
            >
                <MousePointer2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
            <button
                type="button"
                onClick={() => setCanvasTool("hand")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] transition ${
                    canvasTool === "hand"
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                aria-label="Hand tool"
            >
                <Hand className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
            <div className="mx-0.5 h-6 w-px bg-white/15" />
            <button
                type="button"
                onClick={zoomOut}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Zoom out"
            >
                <Minus className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
            <button
                type="button"
                onClick={zoomReset}
                className="inline-flex h-8 min-w-[50px] items-center justify-center rounded-[10px] px-2 font-display text-[13px] font-medium tabular-nums text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Reset zoom"
            >
                {Math.round(canvasZoom * 100)}%
            </button>
            <button
                type="button"
                onClick={zoomIn}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Zoom in"
            >
                <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
            <div className="mx-0.5 h-6 w-px bg-white/15" />
            <button
                type="button"
                onClick={zoomToFit}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Zoom to fit"
            >
                <Maximize2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
        </div>
    );
}
