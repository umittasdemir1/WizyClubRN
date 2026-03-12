import { useState, useEffect, useLayoutEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ListChecks, ShieldAlert, Upload, ChevronDown, BarChart3, ArrowUpDown, Database, Zap, Layers, Globe } from "lucide-react";
import { Header } from "./components/layout/Header";
import { TabNav } from "./components/layout/TabNav";
import { Footer } from "./components/layout/Footer";
import { FileUploader } from "./components/upload/FileUploader";
import { EmptyState } from "./components/shared/EmptyState";
import { MetricsGrid } from "./components/dashboard/MetricsGrid";
import { CategoryDonutChart } from "./components/dashboard/CategoryDonutChart";
import { StockHealthChart } from "./components/dashboard/StockHealthChart";
import { StockTable } from "./components/analysis/StockTable";
import { TransferMatrix } from "./components/transfer/TransferMatrix";
import { ForecastChart } from "./components/planning/ForecastChart";
import { Button } from "./components/shared/Button";
import { Card } from "./components/shared/Card";
import { useFileUpload } from "./hooks/useFileUpload";
import { exportAnalysisWorkbook } from "./utils/analysis";
import type { AppTab, RecentUpload, UploadStage, UploadWorkflowResult } from "./types/stock";

/* ── Typewriter rotating words ── */
const ROTATING_WORDS = [
    "strategic logistics",
    "revenue orchestration",
    "inventory intelligence",
    "predictive allocation",
];

function useTypewriter(words: string[], typingSpeed = 160, pauseMs = 2200, deletingSpeed = 80) {
    const [displayText, setDisplayText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentWord = words[wordIndex % words.length];
        
        // DURUM 1: Kelime tamamen silindi, bir sonrakine geç
        if (isDeleting && displayText === "") {
            setIsDeleting(false);
            setWordIndex(prev => prev + 1);
            return;
        }

        // DURUM 2: Kelime tamamlandı, durakla ve silmeye başla
        if (!isDeleting && displayText === currentWord) {
            const timeout = setTimeout(() => setIsDeleting(true), pauseMs);
            return () => clearTimeout(timeout);
        }

        // DURUM 3: Yazma veya Silme işlemi devam ediyor
        const handleType = () => {
            setDisplayText(prev => {
                if (isDeleting) {
                    return currentWord.substring(0, Math.max(0, prev.length - 1));
                } else {
                    return currentWord.substring(0, Math.min(currentWord.length, prev.length + 1));
                }
            });
        };

        const timer = setTimeout(handleType, isDeleting ? deletingSpeed : typingSpeed);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, wordIndex, words, typingSpeed, pauseMs, deletingSpeed]);
    
    return displayText;
}

const FEATURES = [
    {
        imgSrc: "/images/feat_ingestion.png",
        title: "Intelligent Ingestion",
        desc: "Seamless normalization of fragmented datasets. Our engine automatically resolves header discrepancies and data types at global scale.",
    },
    {
        imgSrc: "/images/feat_scoring.png",
        title: "Proprietary Scoring",
        desc: "Beyond simple tracking. Compare inventory, sales, returns, and lifecycle signals in one normalized operational view.",
    },
    {
        imgSrc: "/images/feat_logistics.png",
        title: "Logistics Optimization",
        desc: "Dynamic surplus-deficit orchestration. S+ Label matches regional overstock with local shortages to maximize liquidity.",
    },
    {
        imgSrc: "/images/feat_planning.png",
        title: "Predictive Planning",
        desc: "Read production year, first-entry timing, and last-sale recency together to spot stale stock before it hardens.",
    },
];

function App() {
    const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [result, setResult] = useState<UploadWorkflowResult | null>(null);
    const [history, setHistory] = useState<RecentUpload[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
    const [isSwitchPending, startTabTransition] = useTransition();
    const uploadMutation = useFileUpload({
        onProgressChange: setUploadProgress,
        onStageChange: setUploadStage
    });
    const typewriterText = useTypewriter(ROTATING_WORDS);

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, []);

    function handleUpload(file: File) {
        setCurrentFile(file);
        setUploadProgress(0);
        setUploadStage("uploading");

        uploadMutation.mutate(file, {
            onSuccess(nextResult) {
                setResult(nextResult);
                setHistory((current) =>
                    [{
                        fileName: nextResult.parsed.fileName,
                        processedAt: new Date().toISOString(),
                        rowCount: nextResult.parsed.rowCount,
                        source: nextResult.source,
                    }, ...current].slice(0, 5)
                );
                setUploadProgress(100);
                setUploadStage("ready");
            },
            onError() {
                setUploadProgress(0);
                setUploadStage("idle");
            },
        });
    }

    function handleClearUpload() {
        setCurrentFile(null);
        setResult(null);
        setHistory([]);
        setUploadProgress(0);
        setUploadStage("idle");
        uploadMutation.reset();
    }

    function handleTabChange(tab: AppTab) {
        startTabTransition(() => setActiveTab(tab));
    }

    const latestUpload = history[0] ?? null;

    return (
        <div className="relative isolate min-h-screen text-ink selection:bg-brandSelection selection:text-white">
            <div className="story-spectrum-bg">
                <div className="bg-grid-pattern" />
            </div>

            <div className="relative z-10">
            <Header dataSource={result?.source ?? null} />

            {/* HERO SECTION */}
            <section id="hero" className="flex min-h-screen flex-col items-center justify-start px-4 pt-[130px] pb-20 text-center sm:px-8 sm:pt-[130px] lg:pt-[130px]">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="mx-auto max-w-6xl"
                >
                    <p className="mb-10 text-sm font-semibold uppercase tracking-[0.5em] text-brand">
                        Elite Inventory Orchestration
                    </p>

                    <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:gap-8 lg:gap-10">
                        <h1 className="font-display text-4xl font-extralight leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-[6.5rem]">
                            <span className="block">Your spreadsheet,</span>
                            <span className="block">instant</span>
                        </h1>

                        <div className="flex min-h-[1.35em] items-center justify-center overflow-visible text-center">
                            <span className="text-gradient inline-block w-max max-w-none whitespace-nowrap font-display text-4xl font-normal italic leading-none tracking-[-0.06em] sm:text-6xl lg:text-[6.5rem]">
                                <span className="inline-block whitespace-nowrap">
                                    {typewriterText}
                                </span>
                            </span>
                        </div>

                        <p className="mx-auto max-w-4xl text-xl font-light leading-relaxed text-slate-500 sm:text-2xl">
                            Ingest, analyze, and optimize your global inventory footprint.
                            High-fidelity insights for the modern enterprise, zero complexity.
                        </p>
                    </div>

                    <div className="mt-20 flex flex-wrap items-center justify-center gap-10">
                        <button
                            onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-premium-solid h-20"
                        >
                            <span className="flex items-center gap-3">
                                <Upload className="h-6 w-6 opacity-80" />
                                Initialize analysis
                            </span>
                        </button>
                        <button
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-premium-outline h-20"
                        >
                            Technical overview
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* FEATURES SECTION (Square Cards) */}
            <section id="features" className="px-8 pt-16 pb-0">
                <div className="mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1 }}
                        className="text-center"
                    >
                        <p className="section-tag">Platform Capability</p>
                        <h2 className="section-title">Engineered for precision</h2>
                        <p className="section-desc">
                            A high-performance architecture built to handle complex enterprise <br className="hidden lg:block"/> 
                            data structures with redundant synchronization protocols.
                        </p>
                    </motion.div>

                    <div className="mt-20 flex flex-col gap-10">
                        {FEATURES.map((feat, i) => (
                            <motion.div
                                key={feat.title}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.8, delay: i * 0.15 }}
                                className="premium-square-card overflow-hidden flex flex-col md:flex-row items-center gap-10 md:gap-20 p-10 md:p-16 text-left min-h-[auto]"
                            >
                                <div className={`w-full md:w-1/2 flex justify-center ${i % 2 !== 0 ? 'md:order-2' : ''}`}>
                                    <img 
                                        src={feat.imgSrc} 
                                        alt={feat.title} 
                                        className="w-full max-w-sm object-contain mix-blend-multiply drop-shadow-xl" 
                                    />
                                </div>
                                <div className={`w-full md:w-1/2 ${i % 2 !== 0 ? 'md:order-1' : ''}`}>
                                    <h3 className="font-display text-3xl font-light tracking-tight text-ink sm:text-4xl lg:text-5xl">
                                        {feat.title}
                                    </h3>
                                    <p className="mt-6 text-xl font-light leading-relaxed text-slate-500">
                                        {feat.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* UPLOAD SECTION */}
            <section id="upload" className="px-8 pt-20 pb-40 bg-slate-50/20">
                <div className="mx-auto max-w-5xl">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1 }}
                        className="text-center"
                    >
                        <p className="section-tag">Data Integration</p>
                        <h2 className="section-title">Commence analysis</h2>
                        <p className="section-desc">
                            Connect your enterprise dataset via secure node ingestion. <br className="hidden sm:block"/>
                            Processing occurs in real-time across high-fidelity edge engines.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="mt-20"
                    >
                        <FileUploader
                            currentFile={currentFile}
                            isLoading={uploadMutation.isPending}
                            latestUpload={latestUpload}
                            onSelect={handleUpload}
                            onClear={handleClearUpload}
                            uploadProgress={uploadProgress}
                            uploadStage={uploadStage}
                        />
                    </motion.div>
                </div>
            </section>

            {/* WORKSPACE SECTION */}
            <section id="workspace" className="px-8 pt-20 pb-40">
                <div className="mx-auto max-w-5xl">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1 }}
                        className="mb-20 text-center"
                    >
                        <p className="section-tag">Visualization Layer</p>
                        <h2 className="section-title">Strategic Workspace</h2>
                    </motion.div>

                    <div className="flex justify-center mb-16">
                        <TabNav activeTab={activeTab} onChange={handleTabChange} />
                    </div>

                    <div className="mt-20">
                        {!result ? (
                            <div className="min-h-[600px] flex items-center justify-center">
                                <EmptyState />
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    {activeTab === "dashboard" && (
                                        <div className="space-y-20">
                                            <MetricsGrid overview={result.analysis.overview} />
                                            <div className="grid gap-20 xl:grid-cols-2">
                                                <CategoryDonutChart data={result.analysis.warehouseBreakdown} />
                                                <StockHealthChart data={result.analysis.lifecycleBreakdown} />
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === "analysis" && <StockTable records={result.analysis.records} />}
                                    {activeTab === "transfers" && <TransferMatrix transfers={result.transferPlan} />}
                                    {activeTab === "planning" && (
                                        <ForecastChart
                                            data={result.analysis.planning}
                                            records={result.analysis.records}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </section>

            <Footer />
            </div>
        </div>
    );
}

export default App;
