import { CheckCircle2, Clipboard, ClipboardList, History, Printer, RefreshCw, TriangleAlert } from "lucide-react";
import type { AuditQuestion, AuditSession } from "../types";
import { calculateAuditScore, formatAuditDateTime, getAuditIssues, getAuditScoreBarTone, getAuditSectionSummaries } from "../utils";
import { AuditProgressBar } from "./AuditProgressBar";

interface AuditReportProps {
    session: AuditSession;
    questions: AuditQuestion[];
    history: AuditSession[];
    mode: "report" | "history";
    onSelectHistory: (session: AuditSession) => void;
    onPrint: () => void;
    onCopy: () => void;
    onNewAudit: () => void;
    onOpenChecklist: () => void;
}

function AuditGauge({ value }: { value: number }) {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const strokeOffset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

    return (
        <div className="relative h-40 w-40">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                <defs>
                    <linearGradient id="audit-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#246BFD" />
                        <stop offset="100%" stopColor="#1FA971" />
                    </linearGradient>
                </defs>
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="12" />
                <circle cx="70" cy="70" r={radius} fill="none" stroke="url(#audit-gauge-gradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-4xl font-semibold tracking-tight text-ink">{value}%</span>
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Compliance
                </span>
            </div>
        </div>
    );
}

export function AuditReport({ session, questions, history, mode, onSelectHistory, onPrint, onCopy, onNewAudit, onOpenChecklist }: AuditReportProps) {
    const score = calculateAuditScore(session.responses, questions.length);
    const sections = getAuditSectionSummaries(questions, session.responses);
    const issues = getAuditIssues(questions, session.responses);

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto px-1 pb-6">
            <div className={`grid gap-4 ${mode === "history" && history.length > 0 ? "xl:grid-cols-[320px_minmax(0,1fr)]" : ""}`}>
                {mode === "history" && history.length > 0 ? (
                    <aside className="h-fit rounded-[24px] border border-line bg-white px-5 py-5 shadow-soft xl:sticky xl:top-0">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Audit archive</p>
                                <h2 className="mt-2 font-display text-[1.4rem] font-semibold tracking-tight text-ink">History</h2>
                            </div>
                            <History className="h-5 w-5 text-brand" />
                        </div>
                        <div className="mt-5 space-y-3">
                            {history.map((entry) => {
                                const entryScore = calculateAuditScore(entry.responses, questions.length);
                                const isActive = entry.id === session.id;

                                return (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => onSelectHistory(entry)}
                                        className={`w-full rounded-[18px] border px-4 py-4 text-left ${isActive ? "border-ink bg-mist" : "border-line bg-white"}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-display text-lg font-semibold tracking-tight text-ink">{entry.locationName}</p>
                                                <p className="mt-1 text-xs text-slate-500">{entry.locationCode} • {formatAuditDateTime(entry.completedAt)}</p>
                                            </div>
                                            <span className="rounded-full border border-line bg-white px-3 py-1 text-sm font-semibold text-ink">{entryScore.compliance}%</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>
                ) : null}

                <div className="space-y-4">
                    <section className="rounded-[24px] border border-line bg-white px-6 py-6 shadow-soft sm:px-8 sm:py-7">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Inspection report</p>
                                <h1 className="mt-2 font-display text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.4rem]">{session.locationName}</h1>
                                <p className="mt-2 text-sm leading-7 text-slate-500 sm:text-base">
                                    {session.locationCode} • {session.location.city} • {formatAuditDateTime(session.completedAt)}
                                </p>
                                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                                    <span className="rounded-full bg-success/10 px-4 py-2 font-semibold text-success">{score.yes} compliant</span>
                                    <span className="rounded-full bg-danger/10 px-4 py-2 font-semibold text-danger">{score.no} non-compliant</span>
                                    <span className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-500">{score.na} N/A</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-5 lg:flex-row">
                                <AuditGauge value={score.compliance} />
                                <div className="flex flex-col gap-3">
                                    <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                                        <Printer className="h-4 w-4" />
                                        Print
                                    </button>
                                    <button type="button" onClick={onCopy} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                                        <Clipboard className="h-4 w-4" />
                                        Copy summary
                                    </button>
                                    <button type="button" onClick={onOpenChecklist} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                                        <ClipboardList className="h-4 w-4" />
                                        Back to checklist
                                    </button>
                                    <button type="button" onClick={onNewAudit} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white">
                                        <RefreshCw className="h-4 w-4" />
                                        New audit
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[24px] border border-line bg-white px-6 py-6 shadow-soft sm:px-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Section scores</p>
                                <h2 className="mt-2 font-display text-[1.6rem] font-semibold tracking-tight text-ink">Section performance</h2>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            {sections.map((section) => (
                                <div key={section.id} className="rounded-[18px] border border-line bg-mist px-5 py-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-display text-[1.1rem] font-semibold tracking-tight text-ink">{section.title}</h3>
                                            <p className="mt-1 text-sm text-slate-500">{section.score.yes} yes • {section.score.no} no • {section.score.na} n/a</p>
                                        </div>
                                        <span className="text-lg font-semibold text-slate-600">{section.score.compliance}%</span>
                                    </div>
                                    <AuditProgressBar value={section.score.compliance} toneClassName={getAuditScoreBarTone(section.score.compliance)} className="mt-4" />
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[24px] border border-line bg-white px-6 py-6 shadow-soft sm:px-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Findings</p>
                                <h2 className="mt-2 font-display text-[1.6rem] font-semibold tracking-tight text-ink">Issues</h2>
                            </div>
                            <TriangleAlert className="h-5 w-5 text-danger" />
                        </div>

                        {issues.length > 0 ? (
                            <div className="mt-6 space-y-4">
                                {issues.map((issue) => (
                                    <article key={issue.question.id} className="rounded-[18px] border border-danger/20 bg-danger/5 px-5 py-5">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-danger">Question {issue.question.id}</p>
                                                <h3 className="mt-2 font-display text-[1.1rem] font-semibold tracking-tight text-ink">{issue.question.question}</h3>
                                                <p className="mt-3 text-sm leading-7 text-slate-600">{issue.response.comment || "No comment provided."}</p>
                                            </div>
                                            <span className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white">Issue</span>
                                        </div>
                                        {issue.response.mediaFiles.length > 0 ? (
                                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                {issue.response.mediaFiles.map((media, index) => (
                                                    <div key={`${media.name}-${index}`} className="overflow-hidden rounded-[16px] border border-line bg-white">
                                                        <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-center text-xs text-slate-500">
                                                            {media.objectUrl && media.type.startsWith("image/") ? (
                                                                <img src={media.objectUrl} alt={media.name} className="h-full w-full object-cover" />
                                                            ) : media.objectUrl && media.type.startsWith("video/") ? (
                                                                <video src={media.objectUrl} className="h-full w-full object-cover" muted />
                                                            ) : (
                                                                <span className="px-4">Preview unavailable</span>
                                                            )}
                                                        </div>
                                                        <div className="px-4 py-3">
                                                            <p className="truncate text-sm font-semibold text-ink">{media.name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-[18px] border border-dashed border-line bg-mist px-5 py-10 text-center text-sm text-slate-500">
                                No "No" responses were recorded in this audit.
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
