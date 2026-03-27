import { ArrowRight, Check, ChevronDown, Circle, Info } from "lucide-react";
import type { AuditSession } from "../types";

interface AuditLandingProps {
    history: AuditSession[];
    activeSession: AuditSession | null;
    onStartNew: () => void;
    onPreviewReport: () => void;
    onResume: () => void;
    onOpenHistoryReport: (session: AuditSession) => void;
}

function SelectChip({ label, active = false }: { label: string; active?: boolean }) {
    return (
        <button
            type="button"
            className={`inline-flex h-7 min-w-[56px] items-center justify-center rounded-[4px] border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${active ? "border-[#49a186] bg-[#49a186] text-white" : "border-[#d9dfdd] bg-white text-[#77817e]"}`}
        >
            {label}
        </button>
    );
}

function RatingDot({ active = false }: { active?: boolean }) {
    return <span className={`h-3.5 w-3.5 rounded-full border ${active ? "border-[#4aa187] bg-[#4aa187]" : "border-[#cfd6d3] bg-white"}`} />;
}

export function AuditLanding({ activeSession, history, onStartNew, onPreviewReport, onResume, onOpenHistoryReport }: AuditLandingProps) {
    const secondaryAction = activeSession
        ? { label: "Resume Saved Audit", onClick: onResume }
        : history.length > 0
            ? { label: "Open Latest Report", onClick: () => onOpenHistoryReport(history[0]) }
            : { label: "View Sample Report", onClick: onPreviewReport };

    return (
        <section className="relative h-full min-h-0 overflow-hidden bg-[#f7fbf8]">
            <div className="pointer-events-none absolute inset-x-[-8%] top-[-8%] h-[52%]">
                <div className="absolute left-[-8%] top-[10%] h-[52%] w-[42%] rounded-[100%] bg-[#dfeee9]/60 rotate-[10deg]" />
                <div className="absolute left-[10%] top-[5%] h-[56%] w-[48%] rounded-[100%] bg-[#edf6f3]/80 -rotate-[8deg]" />
                <div className="absolute left-[32%] top-[8%] h-[54%] w-[44%] rounded-[100%] bg-[#dcebe5]/55 rotate-[9deg]" />
                <div className="absolute right-[4%] top-[2%] h-[58%] w-[50%] rounded-[100%] bg-[#e7f3ef]/75 -rotate-[9deg]" />
                <div className="absolute right-[-12%] top-[10%] h-[55%] w-[45%] rounded-[100%] bg-[#d9ebe4]/65 rotate-[8deg]" />
            </div>

            <div className="relative mx-auto flex h-full max-w-[1480px] items-center px-4 py-6 sm:px-6 lg:px-10">
                <div className="grid w-full items-center gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(540px,640px)]">
                    <div className="max-w-[620px] self-center pt-2 lg:pt-0">
                        <h1 className="max-w-[11ch] font-sans text-[clamp(3.1rem,6vw,5.6rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-black">
                            All-in-One Platform
                            <br />
                            for <span className="text-[#3f8f79]">Audit</span>
                            <span className="ml-3 inline-block h-[0.95em] w-[3px] translate-y-1 bg-[#3f8f79]" />
                        </h1>

                        <div className="mt-8 max-w-[42rem] border-l-[3px] border-[#49a186] pl-5 text-[1.16rem] leading-9 text-[#5f6f69]">
                            Less paperwork, <span className="font-semibold text-[#101716]">more insights</span>. Work smarter
                            with our <span className="font-semibold text-[#101716]">mobile auditing</span> solution and focus on
                            what really matters.
                        </div>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                            <button
                                type="button"
                                onClick={onStartNew}
                                className="inline-flex h-14 items-center justify-center gap-3 rounded-[4px] bg-[#3f8f79] px-8 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#337764]"
                            >
                                Go To Audit Form
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={secondaryAction.onClick}
                                className="inline-flex h-14 items-center justify-center gap-3 rounded-[4px] border border-[#dce6e2] bg-white px-8 text-sm font-semibold uppercase tracking-[0.08em] text-[#5d7269] transition hover:border-[#bfd5cc] hover:bg-[#fbfdfc]"
                            >
                                {secondaryAction.label}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-5 flex items-center gap-2 text-[0.95rem] text-[#64736e]">
                            <Check className="h-4 w-4 text-[#49a186]" />
                            <span>No credit card, no commitment.</span>
                        </div>

                        <div className="mt-16 flex flex-wrap items-center gap-4 text-sm text-[#6f7f7a]">
                            <span className="font-semibold text-[#111816]">S+Audit</span>
                            <span>is available on:</span>
                            <span className="text-[#5ca695] underline underline-offset-4">Web</span>
                            <span className="text-[#5ca695] underline underline-offset-4">iOS</span>
                            <span className="text-[#5ca695] underline underline-offset-4">Android</span>
                            <div className="ml-0 flex items-center gap-3 sm:ml-4">
                                <div className="rounded-[10px] border border-[#d7dedb] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f2c2a] shadow-[0_12px_24px_rgba(18,32,28,0.05)]">
                                    App Store
                                </div>
                                <div className="rounded-[10px] border border-[#d7dedb] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f2c2a] shadow-[0_12px_24px_rgba(18,32,28,0.05)]">
                                    Google Play
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative hidden h-[620px] xl:block">
                        <div className="absolute right-16 top-6 w-[350px] rounded-[18px] border border-[#dae1de] bg-white p-2 shadow-[0_28px_70px_rgba(28,43,39,0.12)]">
                            <div className="mb-3 flex justify-center">
                                <div className="h-2 w-2 rounded-full bg-[#ebefee]" />
                            </div>
                            <div className="overflow-hidden rounded-[14px] border border-[#eef2f0] bg-[#fbfcfb]">
                                <div className="bg-[#2f3f52] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                                    Premises Inspection
                                </div>

                                <div className="space-y-5 px-5 py-4 text-[#33433f]">
                                    <div>
                                        <div className="mb-3 flex items-start justify-between gap-3 text-[12px] leading-5">
                                            <p>1. Was the last inspection less than 7 days ago?</p>
                                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#909a97]" />
                                        </div>
                                        <div className="flex gap-2">
                                            <SelectChip label="Yes" active />
                                            <SelectChip label="No" />
                                            <SelectChip label="N/A" />
                                        </div>
                                    </div>

                                    <div className="border-t border-[#edf1ef] pt-4">
                                        <div className="mb-3 flex items-start justify-between gap-3 text-[12px] leading-5">
                                            <p>2. Marketing displays updated per weekly promotions?</p>
                                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#909a97]" />
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-[#899491]">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                <div key={value} className="flex flex-col items-center gap-2">
                                                    <RatingDot active={value === 4} />
                                                    <span>{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 grid grid-cols-[170px_1fr] gap-3">
                                            <div className="relative overflow-hidden rounded-[8px] border border-[#dde5e1] bg-[#f3ece4]">
                                                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(180,150,112,0.28),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.08))]" />
                                                <div className="relative flex h-[88px] items-center justify-center gap-2">
                                                    <div className="h-10 w-10 rounded-full border-2 border-[#e14f4f]" />
                                                    <div className="h-[2px] w-10 rotate-[-35deg] bg-[#e14f4f]" />
                                                </div>
                                            </div>
                                            <div className="rounded-[8px] border border-[#edf1ef] bg-white p-3 text-[10px] text-[#8a9491]">
                                                <p className="font-semibold uppercase tracking-[0.08em] text-[#71807b]">Comments</p>
                                                <p className="mt-2 leading-4">Old promotional material still in use during weekly standards walk.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#edf1ef] pt-4">
                                        <div className="mb-3 flex items-start justify-between gap-3 text-[12px] leading-5">
                                            <p>3. Are all staff members trained in hygiene and fire safety?</p>
                                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#909a97]" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-[4px] bg-[#f1f5f4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#61706a]">
                                                Excellent
                                            </span>
                                            <span className="rounded-[4px] bg-[#f5f2e9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#866f39]">
                                                Average
                                            </span>
                                            <span className="rounded-[4px] bg-[#fceaea] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d14b4b]">
                                                Unacceptable
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#edf1ef] pt-4">
                                        <div className="mb-3 text-[12px] leading-5">
                                            <p>4. Is the front of house free of clutter and clean?</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <SelectChip label="Yes" active />
                                            <SelectChip label="No" />
                                            <SelectChip label="N/A" />
                                        </div>
                                    </div>

                                    <div className="border-t border-[#edf1ef] pt-4">
                                        <div className="mb-3 text-[12px] leading-5">
                                            <p>5. Frequency of kitchen self-inspection:</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-[#d7dedb] bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#687874]"
                                        >
                                            Once per day
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-center">
                                <div className="h-5 w-5 rounded-full border border-[#e2e8e5] bg-white" />
                            </div>
                        </div>

                        <div className="absolute bottom-12 right-0 w-[214px] rounded-[28px] border border-[#eceeed] bg-white px-5 pb-6 pt-7 shadow-[0_24px_60px_rgba(31,45,41,0.12)]">
                            <div className="mb-5 flex items-center justify-between text-[10px] text-[#a0aaa7]">
                                <span>9:41</span>
                                <div className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#8f9794]" />
                                    <span className="h-1.5 w-5 rounded-full bg-[#8f9794]" />
                                </div>
                            </div>

                            <h3 className="text-center text-[13px] font-medium text-[#65716d]">Inspection report</h3>
                            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9aa5a1]">History</p>

                            <div className="mt-4 flex items-end justify-between gap-2">
                                {[38, 64, 52, 71, 84].map((height, index) => (
                                    <div key={height} className="flex flex-col items-center gap-2">
                                        <div className="flex h-[82px] w-4 items-end rounded-full bg-[#edf0ef] p-[3px]">
                                            <div
                                                className={`w-full rounded-full ${index === 4 ? "bg-[#31475c]" : "bg-[#56697b]"}`}
                                                style={{ height: `${height}%` }}
                                            />
                                        </div>
                                        <span className="text-[8px] uppercase tracking-[0.08em] text-[#aab3b0]">
                                            {index === 0 ? "Jan" : index === 1 ? "Feb" : index === 2 ? "Mar" : index === 3 ? "Apr" : "May"}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                                {[
                                    { score: "100%", label: "Safety", color: "#58bf97" },
                                    { score: "50%", label: "Audit", color: "#f1b66a" },
                                    { score: "25%", label: "Training", color: "#ef8b7f" },
                                ].map((item) => (
                                    <div key={item.label} className="flex flex-col items-center gap-2">
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-full border text-[9px] font-semibold"
                                            style={{ borderColor: item.color, color: item.color }}
                                        >
                                            {item.score}
                                        </div>
                                        <span className="text-[8px] uppercase tracking-[0.08em] text-[#a2aca9]">{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="h-[1px] bg-[#eef2f0]" />
                                <div>
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#97a29e]">Scores</p>
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-2 text-[9px] text-[#75807c]">
                                            <Circle className="h-2.5 w-2.5 fill-[#58bf97] text-[#58bf97]" />
                                            <span>Site cleanlines inspection less than 30 days ago</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] text-[#75807c]">
                                            <Circle className="h-2.5 w-2.5 fill-[#ef8b7f] text-[#ef8b7f]" />
                                            <span>Staff trained and updated fire safety process</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
