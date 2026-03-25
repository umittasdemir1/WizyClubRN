import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { resolveStudioUrl } from "./utils/studio";
import { useTypewriter } from "./components/canvas/useTypewriter";

/* ── Typewriter rotating words ── */
const ROTATING_WORDS = [
    "strategic logistics",
    "revenue orchestration",
    "inventory intelligence",
    "predictive allocation",
];

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
    const studioWindowRef = useRef<Window | null>(null);
    const typewriterText = useTypewriter(ROTATING_WORDS);

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, []);

    function handleStudioLaunch() {
        const studioUrl = resolveStudioUrl(window.location);
        const existing = studioWindowRef.current;

        if (existing && !existing.closed) {
            existing.focus();
            return;
        }

        const next = window.open(
            studioUrl,
            "stockpilot-studio",
            "width=1680,height=1040,resizable=yes,scrollbars=yes"
        );

        if (!next) {
            window.location.assign(studioUrl);
            return;
        }

        studioWindowRef.current = next;
        next.focus();
    }

    return (
        <div className="relative isolate min-h-screen text-ink selection:bg-brandSelection selection:text-white">
            <div className="story-spectrum-bg">
                <div className="bg-grid-pattern" />
            </div>

            <div className="relative z-10">
                <Header
                    dataSource={null}
                    onTabShortcut={() => {}}
                    onStudioLaunch={handleStudioLaunch}
                />

                {/* HERO */}
                <section
                    id="hero"
                    className="flex min-h-screen flex-col items-center justify-start px-4 pt-[130px] pb-20 text-center sm:px-8 sm:pt-[130px] lg:pt-[130px]"
                >
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

                            <div className="relative flex min-h-[1.5em] w-full items-center justify-center overflow-hidden text-center">
                                <span className="text-gradient inline-block w-full text-center font-display font-normal italic leading-tight tracking-[-0.04em] sm:tracking-[-0.06em]"
                                    style={{ fontSize: "clamp(1.75rem, 8.5vw, 6.5rem)" }}>
                                    {typewriterText}
                                </span>
                            </div>

                            <p className="mx-auto max-w-4xl text-xl font-light leading-relaxed text-slate-500 sm:text-2xl">
                                Ingest, analyze, and optimize your global inventory footprint.
                                High-fidelity insights for the modern enterprise, zero complexity.
                            </p>
                        </div>

                        <div className="mt-16 sm:mt-20 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-10">
                            <button
                                onClick={handleStudioLaunch}
                                className="btn-premium-solid h-14 sm:h-20 w-full sm:w-auto"
                            >
                                <span className="flex items-center gap-3">
                                    <Upload className="h-5 w-5 sm:h-6 sm:w-6 opacity-80" />
                                    Launch Studio
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document
                                        .getElementById("features")
                                        ?.scrollIntoView({ behavior: "smooth" })
                                }
                                className="btn-premium-outline h-14 sm:h-20 w-full sm:w-auto"
                            >
                                Technical overview
                            </button>
                        </div>
                    </motion.div>
                </section>

                {/* FEATURES */}
                <section id="features" className="px-4 sm:px-8 pt-16 pb-32">
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
                                A high-performance architecture built to handle complex enterprise{" "}
                                <br className="hidden lg:block" />
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
                                    <div
                                        className={`w-full md:w-1/2 flex justify-center ${i % 2 !== 0 ? "md:order-2" : ""}`}
                                    >
                                        <img
                                            src={feat.imgSrc}
                                            alt={feat.title}
                                            className="w-full max-w-sm object-contain mix-blend-multiply drop-shadow-xl"
                                        />
                                    </div>
                                    <div className={`w-full md:w-1/2 ${i % 2 !== 0 ? "md:order-1" : ""}`}>
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

                <Footer />
            </div>
        </div>
    );
}

export default App;
