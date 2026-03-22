import React from "react";

/**
 * Shown inside the canvas area when there are no table views to display
 * (analysis is loaded but no pivot tables have been configured yet).
 */
export function CanvasEmptyState() {
    return (
        <div className="relative mt-3 flex min-h-0 flex-1 overflow-hidden rounded-none">
            <div className="canvas-grid-pattern" />
        </div>
    );
}
