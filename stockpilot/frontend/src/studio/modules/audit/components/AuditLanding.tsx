import { ArrowRight } from "lucide-react";
import type { AuditSession } from "../types";

interface AuditLandingProps {
    history: AuditSession[];
    activeSession: AuditSession | null;
    onStartNew: () => void;
    onPreviewReport: () => void;
    onResume: () => void;
    onOpenHistoryReport: (session: AuditSession) => void;
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
                <div className="grid w-full items-center gap-12">
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

                    </div>

                </div>
            </div>
        </section>
    );
}
