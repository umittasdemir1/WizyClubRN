import { AppWindowMac, Files, Grid3x3 } from "lucide-react";

interface ActivityBarProps {
    explorerCollapsed: boolean;
    sidebarCollapsed: boolean;
    canvasCollapsed: boolean;
    onToggleExplorer: () => void;
    onToggleSidebar: () => void;
    onToggleCanvas: () => void;
}

export function ActivityBar({
    explorerCollapsed,
    sidebarCollapsed,
    canvasCollapsed,
    onToggleExplorer,
    onToggleSidebar,
    onToggleCanvas,
}: ActivityBarProps) {
    const btn = (active: boolean) =>
        `flex h-11 w-11 items-center justify-center rounded-[10px] transition ${
            active
                ? "text-slate-800 bg-slate-100"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        }`;
    return (
        <div className="flex h-[calc(100vh-91px)] flex-col items-center gap-2">
            <button type="button" onClick={onToggleExplorer} title="Toggle Explorer" className={btn(!explorerCollapsed)}>
                <Files className="h-6 w-6" strokeWidth={1.25} />
            </button>
            <button type="button" onClick={onToggleSidebar} title="Toggle Pivot Sidebar" className={btn(!sidebarCollapsed)}>
                <AppWindowMac className="h-6 w-6" strokeWidth={1.25} />
            </button>
            <button type="button" onClick={onToggleCanvas} title="Toggle Canvas" className={btn(!canvasCollapsed)}>
                <Grid3x3 className="h-6 w-6" strokeWidth={1.25} />
            </button>
        </div>
    );
}
