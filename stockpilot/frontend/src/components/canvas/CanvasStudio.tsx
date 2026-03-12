import { useEffect, useState, type DragEvent } from "react";
import {
    BellRing,
    Boxes,
    Database,
    Grip,
    LayoutTemplate,
    RotateCcw,
    Rows3,
    ShieldCheck,
    Trash2,
    Warehouse
} from "lucide-react";
import type { AnalysisResult, TransferSuggestion } from "../../types/stock";
import { formatNumber, formatPercent } from "../../utils/formatting";

type CanvasWidgetId =
    | "inventory"
    | "net-sales"
    | "returns"
    | "lifecycle"
    | "warehouses"
    | "planning"
    | "alerts"
    | "transfers";

interface CanvasStudioProps {
    analysis: AnalysisResult | null;
    transfers: TransferSuggestion[];
    session: {
        fileName: string | null;
        rowCount: number;
        source: "api" | "local" | null;
    };
}

interface CanvasWidgetDefinition {
    id: CanvasWidgetId;
    label: string;
    description: string;
    spanClass: string;
}

const STORAGE_KEY = "stockpilot-canvas-layout";

const DEFAULT_WIDGETS: CanvasWidgetId[] = [
    "inventory",
    "net-sales",
    "returns",
    "lifecycle",
    "warehouses",
    "planning"
];

const WIDGET_LIBRARY: CanvasWidgetDefinition[] = [
    {
        id: "inventory",
        label: "Inventory Snapshot",
        description: "Total inventory and product spread across the network.",
        spanClass: "xl:col-span-1"
    },
    {
        id: "net-sales",
        label: "Net Sales",
        description: "Core sales movement after returns are deducted.",
        spanClass: "xl:col-span-1"
    },
    {
        id: "returns",
        label: "Returns Lens",
        description: "Return count and blended return rate in one tile.",
        spanClass: "xl:col-span-1"
    },
    {
        id: "lifecycle",
        label: "Lifecycle Mix",
        description: "Healthy, slow-moving, and stagnant distribution.",
        spanClass: "xl:col-span-1"
    },
    {
        id: "warehouses",
        label: "Warehouse Mix",
        description: "Top warehouses by inventory and net sales intensity.",
        spanClass: "xl:col-span-2"
    },
    {
        id: "planning",
        label: "Planning Rail",
        description: "Inventory and demand patterns by production year.",
        spanClass: "xl:col-span-2"
    },
    {
        id: "alerts",
        label: "Attention Queue",
        description: "Operational exceptions that need manual review.",
        spanClass: "xl:col-span-2"
    },
    {
        id: "transfers",
        label: "Transfer Queue",
        description: "Warehouse rebalancing suggestions from the latest run.",
        spanClass: "xl:col-span-2"
    }
];

function isCanvasWidgetId(value: string): value is CanvasWidgetId {
    return WIDGET_LIBRARY.some((widget) => widget.id === value);
}

function getWidgetDefinition(id: CanvasWidgetId) {
    return WIDGET_LIBRARY.find((widget) => widget.id === id)!;
}

export function CanvasStudio({ analysis, transfers, session }: CanvasStudioProps) {
    const [widgets, setWidgets] = useState<CanvasWidgetId[]>(DEFAULT_WIDGETS);
    const [isCanvasActive, setIsCanvasActive] = useState(false);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                setWidgets(DEFAULT_WIDGETS);
                return;
            }

            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                const nextWidgets = parsed.filter((value): value is CanvasWidgetId => isCanvasWidgetId(value));
                setWidgets(nextWidgets.length > 0 ? nextWidgets : DEFAULT_WIDGETS);
                return;
            }

            setWidgets(DEFAULT_WIDGETS);
        } catch {
            window.localStorage.removeItem(STORAGE_KEY);
            setWidgets(DEFAULT_WIDGETS);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    }, [widgets]);

    function addWidget(id: CanvasWidgetId) {
        setWidgets((current) => (current.includes(id) ? current : [...current, id]));
    }

    function removeWidget(id: CanvasWidgetId) {
        setWidgets((current) => current.filter((widgetId) => widgetId !== id));
    }

    function resetLayout() {
        setWidgets(DEFAULT_WIDGETS);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const widgetId = event.dataTransfer.getData("text/stockpilot-widget");
        if (isCanvasWidgetId(widgetId)) {
            addWidget(widgetId);
        }
        setIsCanvasActive(false);
    }

    return (
        <div className="grid gap-6 2xl:grid-cols-[300px_minmax(0,1fr)_280px]">
            <aside className="rounded-[34px] border border-white/70 bg-white/82 p-5 shadow-panel backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                            Widget Library
                        </p>
                        <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
                            Compose your board
                        </h3>
                    </div>
                    <LayoutTemplate className="h-5 w-5 text-brand" />
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                    Drag modules into the board or tap to pin them. Layout changes are stored locally for this browser.
                </p>

                <div className="mt-6 space-y-3">
                    {WIDGET_LIBRARY.map((widget) => {
                        const isPinned = widgets.includes(widget.id);

                        return (
                            <button
                                key={widget.id}
                                type="button"
                                draggable
                                onClick={() => addWidget(widget.id)}
                                onDragStart={(event) => {
                                    event.dataTransfer.setData("text/stockpilot-widget", widget.id);
                                    event.dataTransfer.effectAllowed = "copy";
                                }}
                                className={`flex w-full items-start gap-3 rounded-[26px] border px-4 py-4 text-left transition ${
                                    isPinned
                                        ? "border-brand/20 bg-brandSoft/60"
                                        : "border-slate-100 bg-slate-50 hover:border-brand/20 hover:bg-white"
                                }`}
                            >
                                <Grip className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-ink">{widget.label}</p>
                                        {isPinned ? (
                                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
                                                Pinned
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                        {widget.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </aside>

            <section
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsCanvasActive(true);
                }}
                onDragLeave={() => setIsCanvasActive(false)}
                onDrop={handleDrop}
                className={`rounded-[36px] border p-5 shadow-panel backdrop-blur-xl transition ${
                    isCanvasActive
                        ? "border-brand bg-white/95"
                        : "border-white/70 bg-white/78"
                }`}
            >
                <div className="flex flex-col gap-4 rounded-[30px] border border-slate-100 bg-slate-50/90 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                            Canvas Board
                        </p>
                        <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
                            Executive metric surface
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            {widgets.length} widgets active. Drag more modules in, remove them, or restore the starter layout.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={resetLayout}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-ink"
                        >
                            <Rows3 className="h-4 w-4" />
                            Starter layout
                        </button>
                        <button
                            type="button"
                            onClick={() => setWidgets([])}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-ink"
                        >
                            <Trash2 className="h-4 w-4" />
                            Clear board
                        </button>
                    </div>
                </div>

                {widgets.length === 0 ? (
                    <div className="flex min-h-[620px] items-center justify-center">
                        <div className="max-w-xl rounded-[34px] border border-slate-100 bg-white px-10 py-14 text-center shadow-panel">
                            <LayoutTemplate className="mx-auto h-12 w-12 text-brand" />
                            <h4 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink">
                                Board is empty
                            </h4>
                            <p className="mt-4 text-lg leading-relaxed text-slate-500">
                                Pull modules from the library or restore the default layout to start shaping your presentation.
                            </p>
                            <button
                                type="button"
                                onClick={resetLayout}
                                className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                <Rows3 className="h-4 w-4" />
                                Restore starter layout
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-5 grid gap-5 xl:grid-cols-2">
                        {widgets.map((widgetId) => {
                            const widget = getWidgetDefinition(widgetId);

                            return (
                                <div key={widgetId} className={widget.spanClass}>
                                    <CanvasWidgetCard
                                        analysis={analysis}
                                        transfers={transfers}
                                        widgetId={widgetId}
                                        onRemove={() => removeWidget(widgetId)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <aside className="rounded-[34px] border border-white/70 bg-white/82 p-5 shadow-panel backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                            Session Inspector
                        </p>
                        <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
                            Current context
                        </h3>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-success" />
                </div>

                <div className="mt-6 rounded-[28px] bg-slate-950 px-5 py-5 text-white">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Dataset
                            </p>
                            <p className="mt-3 text-lg font-semibold">
                                {session.fileName ?? "No file connected"}
                            </p>
                        </div>
                        <Database className="h-5 w-5 text-brand" />
                    </div>
                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 2xl:grid-cols-1">
                        <div className="rounded-[22px] bg-white/5 px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rows</p>
                            <p className="mt-2 text-lg font-semibold">{formatNumber(session.rowCount)}</p>
                        </div>
                        <div className="rounded-[22px] bg-white/5 px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Engine</p>
                            <p className="mt-2 text-lg font-semibold">
                                {session.source ? session.source.toUpperCase() : "SYNC"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Board stack
                    </p>
                    <div className="mt-4 space-y-2">
                        {widgets.map((widgetId) => (
                            <div
                                key={widgetId}
                                className="flex items-center justify-between rounded-[18px] bg-white px-3 py-3"
                            >
                                <span className="text-sm font-semibold text-ink">
                                    {getWidgetDefinition(widgetId).label}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeWidget(widgetId)}
                                    className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:text-ink"
                                    aria-label={`Remove ${getWidgetDefinition(widgetId).label}`}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-slate-100 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Quick signals
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-500">
                        <div className="flex items-center justify-between">
                            <span>Transfers ready</span>
                            <span className="font-semibold text-ink">{formatNumber(transfers.length)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Alerts ready</span>
                            <span className="font-semibold text-ink">
                                {formatNumber(analysis?.alerts.length ?? 0)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Slow + stagnant</span>
                            <span className="font-semibold text-ink">
                                {formatNumber(
                                    (analysis?.overview.slowMovingItems ?? 0) +
                                        (analysis?.overview.stagnantItems ?? 0)
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}

interface CanvasWidgetCardProps {
    analysis: AnalysisResult | null;
    transfers: TransferSuggestion[];
    widgetId: CanvasWidgetId;
    onRemove: () => void;
}

function CanvasWidgetCard({ analysis, transfers, widgetId, onRemove }: CanvasWidgetCardProps) {
    const withFallback = (message: string) =>
        analysis ? message : "Upload or sync a dataset to populate this widget.";

    return (
        <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-panel">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {getWidgetDefinition(widgetId).label}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        {getWidgetDefinition(widgetId).description}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:text-ink"
                    aria-label="Remove widget"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {widgetId === "inventory" ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-brand">
                        <Boxes className="h-5 w-5" />
                        <span className="text-sm font-semibold">Inventory and products</span>
                    </div>
                    <p className="font-display text-5xl font-semibold tracking-tight text-ink">
                        {analysis ? formatNumber(analysis.overview.totalInventory) : "—"}
                    </p>
                    <p className="text-sm text-slate-500">
                        {analysis
                            ? `${formatNumber(analysis.overview.totalProducts)} products across ${formatNumber(analysis.overview.warehouses)} warehouses`
                            : withFallback("")}
                    </p>
                </div>
            ) : null}

            {widgetId === "net-sales" ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-success">
                        <Warehouse className="h-5 w-5" />
                        <span className="text-sm font-semibold">Net sales movement</span>
                    </div>
                    <p className="font-display text-5xl font-semibold tracking-tight text-ink">
                        {analysis ? formatNumber(analysis.overview.totalNetSales) : "—"}
                    </p>
                    <p className="text-sm text-slate-500">
                        {withFallback("Sales minus returns from the connected dataset.")}
                    </p>
                </div>
            ) : null}

            {widgetId === "returns" ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-warning">
                        <RotateCcw className="h-5 w-5" />
                        <span className="text-sm font-semibold">Return pressure</span>
                    </div>
                    <p className="font-display text-5xl font-semibold tracking-tight text-ink">
                        {analysis ? formatNumber(analysis.overview.totalReturns) : "—"}
                    </p>
                    <p className="text-sm text-slate-500">
                        {analysis
                            ? `Average return rate ${formatPercent(analysis.overview.averageReturnRate)}`
                            : withFallback("")}
                    </p>
                </div>
            ) : null}

            {widgetId === "lifecycle" ? (
                <div className="space-y-4">
                    {(analysis?.lifecycleBreakdown ?? []).length > 0 ? (
                        (analysis?.lifecycleBreakdown ?? []).map((item) => (
                            <div key={item.name}>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <span className="font-semibold text-ink">{item.name}</span>
                                    <span className="text-slate-500">{formatNumber(item.value)}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${Math.max(
                                                8,
                                                (item.value /
                                                    Math.max(
                                                        ...(analysis?.lifecycleBreakdown ?? []).map((entry) => entry.value),
                                                        1
                                                    )) *
                                                    100
                                            )}%`,
                                            backgroundColor: item.tone
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">{withFallback("Lifecycle signals will render here.")}</p>
                    )}
                </div>
            ) : null}

            {widgetId === "warehouses" ? (
                <div className="space-y-3">
                    {(analysis?.warehouseBreakdown ?? []).slice(0, 5).map((item) => (
                        <div
                            key={item.name}
                            className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3"
                        >
                            <div>
                                <p className="font-semibold text-ink">{item.name}</p>
                                <p className="text-xs text-slate-500">
                                    {formatNumber(item.quantity)} net sales
                                </p>
                            </div>
                            <span className="text-sm font-semibold text-slate-600">
                                {formatNumber(item.value)} units
                            </span>
                        </div>
                    ))}
                    {!analysis ? <p className="text-sm text-slate-500">{withFallback("")}</p> : null}
                </div>
            ) : null}

            {widgetId === "planning" ? (
                <div className="space-y-3">
                    {(analysis?.planning ?? []).slice(0, 6).map((item) => (
                        <div key={item.label} className="rounded-[22px] border border-slate-100 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-ink">{item.label}</p>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    Production year
                                </p>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                                <span>Inventory {formatNumber(item.inventory)}</span>
                                <span>Net sales {formatNumber(item.netSalesQty)}</span>
                            </div>
                        </div>
                    ))}
                    {!analysis ? <p className="text-sm text-slate-500">{withFallback("")}</p> : null}
                </div>
            ) : null}

            {widgetId === "alerts" ? (
                <div className="space-y-3">
                    {(analysis?.alerts ?? []).slice(0, 5).map((item) => (
                        <div key={`${item.productCode}:${item.warehouseName}`} className="rounded-[22px] bg-slate-50 px-4 py-3">
                            <div className="flex items-start gap-3">
                                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                                <div>
                                    <p className="font-semibold text-ink">{item.productName}</p>
                                    <p className="text-xs text-slate-500">
                                        {item.warehouseName} · {item.productCode}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {item.issue} · {item.metric}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!analysis ? <p className="text-sm text-slate-500">{withFallback("")}</p> : null}
                </div>
            ) : null}

            {widgetId === "transfers" ? (
                <div className="space-y-3">
                    {transfers.slice(0, 5).map((item) => (
                        <div
                            key={`${item.productCode}:${item.fromWarehouseName}:${item.toWarehouseName}`}
                            className="rounded-[22px] border border-slate-100 px-4 py-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-ink">{item.productCode}</p>
                                    <p className="text-xs text-slate-500">
                                        {item.fromWarehouseName} → {item.toWarehouseName}
                                    </p>
                                </div>
                                <span className="rounded-full bg-brandSoft px-3 py-1 text-xs font-semibold text-brand">
                                    {formatNumber(item.quantity)} units
                                </span>
                            </div>
                        </div>
                    ))}
                    {transfers.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            {analysis
                                ? "No transfer suggestion exists for the current dataset."
                                : "Upload or sync a dataset to generate transfer ideas."}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
