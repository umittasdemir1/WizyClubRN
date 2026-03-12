import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Boxes, Database, Layers3, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { CanvasStudio } from "../components/canvas/CanvasStudio";
import { useFileUpload } from "../hooks/useFileUpload";
import type { UploadStage, UploadWorkflowResult } from "../types/stock";
import { formatNumber, formatPercent } from "../utils/formatting";
import {
    isStudioHost,
    isStudioSyncEnvelope,
    loadLatestWorkflowResult,
    saveLatestWorkflowResult
} from "../utils/studio";

function getStageLabel(stage: UploadStage) {
    switch (stage) {
        case "uploading":
            return "Uploading dataset";
        case "analyzing":
            return "Calculating metrics";
        case "local-processing":
            return "Falling back to local engine";
        case "ready":
            return "Studio synced";
        default:
            return "Waiting for a live dataset";
    }
}

function resolveWorkspaceUrl(location: Pick<Location, "origin" | "protocol" | "hostname">) {
    if (isStudioHost(location.hostname)) {
        const rootHost = location.hostname.replace(/^studio\./, "");
        return rootHost ? `${location.protocol}//${rootHost}` : `${location.origin}/`;
    }

    return `${location.origin}/`;
}

export function StudioApp() {
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [result, setResult] = useState<UploadWorkflowResult | null>(() => loadLatestWorkflowResult());
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState<UploadStage>("idle");

    const uploadMutation = useFileUpload({
        onProgressChange: setUploadProgress,
        onStageChange: setUploadStage
    });

    useEffect(() => {
        saveLatestWorkflowResult(result);
    }, [result]);

    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            if (!isStudioSyncEnvelope(event.data)) {
                return;
            }

            setResult(event.data.payload);
            setCurrentFile(null);
            setUploadProgress(100);
            setUploadStage("ready");
        }

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        multiple: false,
        noClick: true,
        noKeyboard: true,
        accept: {
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "text/csv": [".csv"]
        },
        disabled: uploadMutation.isPending,
        onDropAccepted(files) {
            const file = files[0];
            if (!file) {
                return;
            }

            setCurrentFile(file);
            setUploadProgress(0);
            setUploadStage("uploading");
            uploadMutation.mutate(file, {
                onSuccess(nextResult) {
                    setResult(nextResult);
                    setUploadProgress(100);
                    setUploadStage("ready");
                },
                onError() {
                    setUploadProgress(0);
                    setUploadStage("idle");
                }
            });
        }
    });

    const workspaceUrl = useMemo(
        () => resolveWorkspaceUrl(window.location),
        []
    );

    const summaryCards = [
        {
            label: "Products",
            value: result ? formatNumber(result.analysis.overview.totalProducts) : "—",
            note: result ? `${formatNumber(result.parsed.rowCount)} source rows` : "No dataset loaded"
        },
        {
            label: "Inventory",
            value: result ? formatNumber(result.analysis.overview.totalInventory) : "—",
            note: result ? `${formatNumber(result.analysis.overview.warehouses)} warehouses` : "Waiting for sync"
        },
        {
            label: "Net Sales",
            value: result ? formatNumber(result.analysis.overview.totalNetSales) : "—",
            note: result
                ? `${formatPercent(result.analysis.overview.averageReturnRate)} avg return rate`
                : "Sales less returns"
        },
        {
            label: "Returns",
            value: result ? formatNumber(result.analysis.overview.totalReturns) : "—",
            note: result
                ? `${formatNumber(result.analysis.overview.stagnantItems)} stagnant items`
                : "Return pressure lens"
        }
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#eef3fb] text-ink">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(36,107,253,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,144,104,0.15),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#edf2f9_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.11)_1px,transparent_1px)] bg-[size:88px_88px] opacity-50" />

            <div className="relative z-10 px-4 py-4 sm:px-6 lg:px-8">
                <header className="rounded-[32px] border border-white/70 bg-white/80 px-5 py-4 shadow-panel backdrop-blur-xl sm:px-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-ink text-white shadow-soft">
                                <Layers3 className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand">
                                    StockPilot Studio
                                </p>
                                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
                                    Drag, compose, and present your metric canvas
                                </h1>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500">
                                <ShieldCheck className="h-4 w-4 text-success" />
                                {result ? `Synced via ${result.source}` : "Awaiting workspace sync"}
                            </div>
                            <button
                                type="button"
                                onClick={() => window.open(workspaceUrl, "_blank", "noopener,noreferrer")}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-ink"
                            >
                                Main workspace
                                <ArrowUpRight className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={open}
                                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                <UploadCloud className="h-4 w-4" />
                                Upload dataset
                            </button>
                        </div>
                    </div>
                </header>

                <section
                    {...getRootProps()}
                    className={`mt-6 rounded-[32px] border px-5 py-5 shadow-panel backdrop-blur-xl transition sm:px-6 ${isDragActive
                        ? "border-brand bg-white/95"
                        : "border-white/70 bg-white/72"
                    }`}
                >
                    <input {...getInputProps()} />
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Live canvas session
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
                                Separate window, shared analysis session
                            </h2>
                            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-500 sm:text-lg">
                                The studio can receive the latest analysis from the main StockPilot window.
                                It also accepts direct `.csv`, `.xls`, and `.xlsx` uploads when you want to work independently.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium text-slate-500">
                                <span className="rounded-full bg-slate-100 px-4 py-2">Canvas-first workspace</span>
                                <span className="rounded-full bg-slate-100 px-4 py-2">Cross-window session sync</span>
                                <span className="rounded-full bg-slate-100 px-4 py-2">Persistent layout memory</span>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-100 bg-slate-950 px-5 py-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                                        Data pulse
                                    </p>
                                    <p className="mt-3 text-2xl font-semibold">
                                        {currentFile?.name ?? result?.parsed.fileName ?? "No dataset connected"}
                                    </p>
                                </div>
                                <Database className="h-5 w-5 text-brand" />
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    <span>{getStageLabel(uploadStage)}</span>
                                    <span>{uploadMutation.isPending ? `${uploadProgress}%` : result ? "LIVE" : "IDLE"}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-[linear-gradient(90deg,#FF9068_0%,#FFD93D_36%,#6BCF7F_68%,#4D96FF_100%)] transition-all duration-300"
                                        style={{ width: `${Math.max(result ? uploadProgress : uploadProgress, result ? 16 : 8)}%` }}
                                    />
                                </div>
                                <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                                    <div className="rounded-[22px] bg-white/5 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rows</p>
                                        <p className="mt-2 text-lg font-semibold text-white">
                                            {result ? formatNumber(result.parsed.rowCount) : "—"}
                                        </p>
                                    </div>
                                    <div className="rounded-[22px] bg-white/5 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Source</p>
                                        <p className="mt-2 text-lg font-semibold text-white">
                                            {result ? result.source.toUpperCase() : "SYNC"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <article
                            key={card.label}
                            className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-panel backdrop-blur-xl"
                        >
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                {card.label}
                            </p>
                            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
                                {card.value}
                            </p>
                            <p className="mt-3 text-sm text-slate-500">{card.note}</p>
                        </article>
                    ))}
                </section>

                <section className="mt-6">
                    <CanvasStudio
                        analysis={result?.analysis ?? null}
                        transfers={result?.transferPlan ?? []}
                        session={{
                            fileName: result?.parsed.fileName ?? null,
                            rowCount: result?.parsed.rowCount ?? 0,
                            source: result?.source ?? null
                        }}
                    />
                </section>
            </div>
        </div>
    );
}
