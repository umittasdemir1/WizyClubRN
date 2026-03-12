import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ShieldCheck, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { CanvasStudio } from "../components/canvas/CanvasStudio";
import { BrandSignature } from "../components/layout/BrandSignature";
import { useFileUpload } from "../hooks/useFileUpload";
import type { UploadWorkflowResult } from "../types/stock";
import { formatNumber, formatPercent } from "../utils/formatting";
import {
    isStudioHost,
    isStudioSyncEnvelope,
    loadLatestWorkflowResult,
    saveLatestWorkflowResult
} from "../utils/studio";

interface SummaryCard {
    label: string;
    value: string;
    note: string;
}

function resolveWorkspaceUrl(location: Pick<Location, "origin" | "protocol" | "hostname">) {
    if (isStudioHost(location.hostname)) {
        const rootHost = location.hostname.replace(/^studio\./, "");
        return rootHost ? `${location.protocol}//${rootHost}` : `${location.origin}/`;
    }

    return `${location.origin}/`;
}

function getSyncLabel(result: UploadWorkflowResult | null) {
    if (!result) {
        return "AWAITING DATA";
    }

    return result.source === "api" ? "SYNCED VIA API" : "SYNCED LOCAL";
}

function StudioMetricCard({ card }: { card: SummaryCard }) {
    return (
        <article
            className="premium-card-dark relative min-h-[220px] overflow-hidden px-6 py-6"
            style={{ borderRadius: "12px" }}
        >
            <div
                className="absolute inset-y-0 right-0 w-[55%] overflow-hidden opacity-20 pointer-events-none"
                style={{
                    WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 90%)",
                    maskImage: "linear-gradient(to left, black 10%, transparent 90%)"
                }}
            >
                <div className="story-grid-pattern" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                    <p className="font-display text-[1.75rem] font-light leading-[1.08] tracking-tight text-white sm:text-[2rem]">
                        {card.label}
                    </p>
                    <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-white">
                        {card.value}
                    </p>
                </div>
                <p className="max-w-[22rem] text-lg font-normal leading-relaxed text-slate-200/90">
                    {card.note}
                </p>
            </div>
        </article>
    );
}

export function StudioApp() {
    const [result, setResult] = useState<UploadWorkflowResult | null>(() => loadLatestWorkflowResult());
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollYRef = useRef(0);
    const uploadMutation = useFileUpload();

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 120) {
                setIsHeaderVisible(true);
                lastScrollYRef.current = currentScrollY;
                return;
            }

            if (currentScrollY > lastScrollYRef.current) {
                setIsHeaderVisible(false);
            } else {
                setIsHeaderVisible(true);
            }

            lastScrollYRef.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        saveLatestWorkflowResult(result);
    }, [result]);

    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            if (!isStudioSyncEnvelope(event.data)) {
                return;
            }

            setResult(event.data.payload);
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

            uploadMutation.mutate(file, {
                onSuccess(nextResult) {
                    setResult(nextResult);
                }
            });
        }
    });

    const workspaceUrl = useMemo(
        () => resolveWorkspaceUrl(window.location),
        []
    );

    const summaryCards: SummaryCard[] = [
        {
            label: "Products",
            value: result ? formatNumber(result.analysis.overview.totalProducts) : "—",
            note: result ? `${formatNumber(result.parsed.rowCount)} source rows loaded into the studio session.` : "No dataset loaded yet."
        },
        {
            label: "Inventory",
            value: result ? formatNumber(result.analysis.overview.totalInventory) : "—",
            note: result ? `${formatNumber(result.analysis.overview.warehouses)} warehouses represented in the current file.` : "Inventory totals will appear after sync."
        },
        {
            label: "Net Sales",
            value: result ? formatNumber(result.analysis.overview.totalNetSales) : "—",
            note: result
                ? `${formatPercent(result.analysis.overview.averageReturnRate)} average return rate across visible records.`
                : "Net sales are calculated as sales minus returns."
        },
        {
            label: "Returns",
            value: result ? formatNumber(result.analysis.overview.totalReturns) : "—",
            note: result
                ? `${formatNumber(result.analysis.records.length)} analyzed lines available for pivoting.`
                : "Return pressure appears once the dataset is loaded."
        }
    ];

    return (
        <div className="relative isolate min-h-screen text-ink selection:bg-brandSelection selection:text-white">
            <div className="story-spectrum-bg">
                <div className="bg-grid-pattern" />
            </div>

            <header
                className={`fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isHeaderVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
                }`}
            >
                <div className="mx-auto flex max-w-[1680px] items-center justify-between px-8 py-5 sm:px-12">
                    <BrandSignature onClick={() => window.location.assign(workspaceUrl)} />

                    <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 lg:flex">
                        <button
                            type="button"
                            onClick={() => window.location.assign(workspaceUrl)}
                            className="text-sm font-medium tracking-wide text-ink transition-colors hover:text-brand"
                        >
                            WORKSPACE
                        </button>
                        <span className="text-sm font-medium tracking-wide text-brand">STUDIO</span>
                    </nav>

                    <div className="ml-auto flex items-center gap-3">
                        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/55 px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur sm:flex">
                            <ShieldCheck className={`h-4 w-4 ${result ? "text-success" : "text-slate-300"}`} />
                            {getSyncLabel(result)}
                        </div>
                        <button
                            type="button"
                            onClick={() => window.location.assign(workspaceUrl)}
                            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/55 px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white/70 hover:text-ink"
                        >
                            MAIN WORKSPACE
                            <ArrowUpRight className="h-4 w-4 text-brand" />
                        </button>
                        <button
                            type="button"
                            onClick={open}
                            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/55 px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white/70 hover:text-ink"
                        >
                            UPLOAD DATASET
                            <UploadCloud className="h-4 w-4 text-brand" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="relative z-10 px-4 pb-16 pt-[132px] sm:px-8 lg:px-10">
                <div className="mx-auto max-w-[1680px]">
                    <section className="text-center">
                        <p className="section-tag">Pivot Studio</p>
                        <h1 className="font-display text-4xl font-extralight leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-[5.5rem]">
                            Build the table,
                            <span className="block">read the data</span>
                        </h1>
                        <p className="section-desc !mb-0">
                            Use the same StockPilot surface language, drag fields into pivot zones, and let the right side render a clean analytical table.
                        </p>
                    </section>

                    <section
                        {...getRootProps()}
                        className={`mt-10 grid gap-4 md:grid-cols-2 2xl:grid-cols-4 ${isDragActive ? "rounded-[28px] ring-2 ring-brand/30 ring-offset-2 ring-offset-transparent" : ""}`}
                    >
                        <input {...getInputProps()} />
                        {summaryCards.map((card) => (
                            <StudioMetricCard key={card.label} card={card} />
                        ))}
                    </section>

                    <section className="mt-6">
                        <CanvasStudio analysis={result?.analysis ?? null} />
                    </section>
                </div>
            </div>
        </div>
    );
}
