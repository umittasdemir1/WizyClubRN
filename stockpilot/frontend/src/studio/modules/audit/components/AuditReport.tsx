import { useRef, type ReactNode } from "react";
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Clipboard,
    ClipboardList,
    History,
    Printer,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { AuditIssue, AuditQuestion, AuditSectionSummary, AuditSession } from "../types";
import { calculateAuditScore, formatAuditDateTime, getAuditIssues, getAuditSectionSummaries } from "../utils";

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

interface ScoreMeta {
    label: string;
    toneClassName: string;
    badgeClassName: string;
    subtleClassName: string;
    ringColor: string;
}

interface EvidenceItem {
    id: string;
    name: string;
    objectUrl?: string | null;
    type: string;
}

function getScoreMeta(value: number): ScoreMeta {
    if (value >= 80) {
        return {
            label: "Excellent",
            toneClassName: "text-success",
            badgeClassName: "border-success/20 bg-success/10 text-success",
            subtleClassName: "bg-success/10 text-success",
            ringColor: "#1FA971",
        };
    }

    if (value >= 60) {
        return {
            label: "Watchlist",
            toneClassName: "text-warning",
            badgeClassName: "border-warning/20 bg-warning/10 text-warning",
            subtleClassName: "bg-warning/10 text-warning",
            ringColor: "#F2B13F",
        };
    }

    return {
        label: "Critical",
        toneClassName: "text-danger",
        badgeClassName: "border-danger/20 bg-danger/10 text-danger",
        subtleClassName: "bg-danger/10 text-danger",
        ringColor: "#E45858",
    };
}

function formatAuditDuration(startedAt: string, completedAt: string | null) {
    if (!completedAt) {
        return "In progress";
    }

    const started = new Date(startedAt).getTime();
    const completed = new Date(completedAt).getTime();
    const totalMinutes = Math.max(0, Math.round((completed - started) / 60000));

    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
}

function compactSectionLabel(title: string) {
    if (title.includes("Entrance")) return "Entrance";
    if (title.includes("Merchandising")) return "Merch";
    if (title.includes("Customer")) return "Customer";
    if (title.includes("Staff")) return "Staff";
    if (title.includes("Operations")) return "Ops";
    return title.split(" ")[0] ?? title;
}

function collectEvidenceItems(session: AuditSession): EvidenceItem[] {
    return Object.values(session.responses).flatMap((response) => response.mediaFiles.map((media) => ({
        id: `${response.questionId}-${media.name}-${media.createdAt}`,
        name: media.name,
        objectUrl: media.objectUrl,
        type: media.type,
    })));
}

function getMediaExtension(name: string) {
    const segments = name.toLowerCase().split(".");
    return segments.length > 1 ? (segments.pop() ?? "") : "";
}

function resolveEvidencePreviewKind(item: { name: string; type: string }) {
    const normalizedType = item.type.toLowerCase();
    if (normalizedType.startsWith("image/")) {
        return "image" as const;
    }

    if (normalizedType.startsWith("video/")) {
        return "video" as const;
    }

    const extension = getMediaExtension(item.name);
    if (["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "svg"].includes(extension)) {
        return "image" as const;
    }

    if (["mp4", "mov", "webm", "m4v", "ogv", "ogg"].includes(extension)) {
        return "video" as const;
    }

    return "unknown" as const;
}

function resolveIssueSection(issueId: number, sections: AuditSectionSummary[]) {
    return sections.find((section) => issueId >= section.startId && issueId <= section.endId)?.title ?? "Operational review";
}

function buildRecommendation(issues: AuditIssue[], weakestSection: AuditSectionSummary | null) {
    if (issues.length === 0) {
        return "Maintain this operating standard and use the report as a benchmark for the next visit.";
    }

    if (weakestSection) {
        return `Prioritize ${weakestSection.title.toLowerCase()} and close failed checkpoints before the next review cycle.`;
    }

    return "Prioritize the failed checkpoints and collect follow-up evidence for closure.";
}

function buildImpactText(issues: AuditIssue[], sections: AuditSectionSummary[]) {
    if (issues.length === 0) {
        return "No active operational blockers detected in this audit.";
    }

    const affectedSections = sections.filter((section) => section.score.no > 0).length;
    return `${issues.length} failed checks are spread across ${affectedSections} sections and need follow-up.`;
}

function EvidenceCarousel({ items }: { items: EvidenceItem[] }) {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const canNavigate = items.length > 3;

    function handleScroll(direction: "left" | "right") {
        if (!viewportRef.current) {
            return;
        }

        const offset = Math.max(viewportRef.current.clientWidth - 96, 240);
        viewportRef.current.scrollBy({
            left: direction === "right" ? offset : -offset,
            behavior: "smooth",
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-[1.1rem] font-semibold tracking-tight text-ink">Evidence Files</h3>
                    <p className="mt-1 text-sm text-slate-500">Captured media from this audit session.</p>
                </div>
                {canNavigate ? (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleScroll("left")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e6ebf2] bg-white text-slate-500 transition hover:bg-[#f8fafc] hover:text-ink"
                            aria-label="Show previous evidence"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleScroll("right")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e6ebf2] bg-white text-slate-500 transition hover:bg-[#f8fafc] hover:text-ink"
                            aria-label="Show next evidence"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                ) : null}
            </div>

            <div
                ref={viewportRef}
                className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {items.map((item) => {
                    const previewKind = resolveEvidencePreviewKind(item);

                    return (
                        <div
                            key={item.id}
                            className="w-[220px] shrink-0 overflow-hidden rounded-[16px] border border-[#edf1f6] bg-white sm:w-[240px] lg:w-[260px]"
                        >
                            <div className="flex aspect-[4/3] items-center justify-center bg-[#eef3f9] text-slate-400">
                                {item.objectUrl && previewKind === "image" ? (
                                    <img src={item.objectUrl} alt="Evidence" className="h-full w-full object-cover" />
                                ) : item.objectUrl && previewKind === "video" ? (
                                    <video src={item.objectUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                                ) : (
                                    <Camera className="h-5 w-5" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ReportCard({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <section className={cn("rounded-[20px] border border-[#e8edf5] bg-white", className)}>
            {children}
        </section>
    );
}

function StatCard({
    label,
    value,
    meta,
    valueClassName,
}: {
    label: string;
    value: string;
    meta: string;
    valueClassName?: string;
}) {
    return (
        <ReportCard className="flex min-h-[168px] flex-col justify-between px-5 py-5">
            <p className="text-[1.25rem] font-semibold tracking-tight text-ink">{label}</p>
            <div className="pt-6">
                <p className={cn("font-display text-[3rem] font-semibold leading-none tracking-[-0.05em] text-ink", valueClassName)}>{value}</p>
                <p className="mt-2 text-xs font-medium text-slate-400">{meta}</p>
            </div>
        </ReportCard>
    );
}

function AuditScoreBar({ value }: { value: number }) {
    const normalizedValue = Math.max(0, Math.min(100, value));

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] font-medium tracking-[-0.01em] text-slate-400">Overall score</p>
                    <p className="mt-1 font-display text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-ink">{normalizedValue}%</p>
                </div>
                <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-semibold text-brand">Live compliance</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[#e8eef6]">
                <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#06b6d4_45%,#22c55e_100%)] transition-[width] duration-500 ease-out"
                    style={{ width: `${normalizedValue}%` }}
                />
            </div>
        </div>
    );
}

export function AuditReport({
    session,
    questions,
    history,
    mode,
    onSelectHistory,
    onPrint,
    onCopy,
    onNewAudit,
    onOpenChecklist,
}: AuditReportProps) {
    const score = calculateAuditScore(session.responses, questions.length);
    const sections = getAuditSectionSummaries(questions, session.responses);
    const issues = getAuditIssues(questions, session.responses);
    const scoreMeta = getScoreMeta(score.compliance);
    const durationLabel = formatAuditDuration(session.startedAt, session.completedAt);
    const answeredCount = questions.length - score.unanswered;
    const completionRate = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
    const evidenceItems = collectEvidenceItems(session);
    const evidenceCount = evidenceItems.length;
    const sectionsOnTrack = sections.filter((section) => section.score.compliance >= 80).length;
    const affectedSections = sections.filter((section) => section.score.no > 0).length;
    const weakestSection = sections.reduce<AuditSectionSummary | null>((worst, section) => {
        if (!worst || section.score.compliance < worst.score.compliance) {
            return section;
        }
        return worst;
    }, null);
    const recommendation = buildRecommendation(issues, weakestSection);
    const impactText = buildImpactText(issues, sections);
    const trendData = sections.map((section) => ({
        name: compactSectionLabel(section.title),
        yes: section.score.yes,
        no: section.score.no,
    }));

    return (
        <div className="min-h-full bg-[#f4f7fb]">
            <div className="mx-auto flex min-h-full w-full max-w-[1680px] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
                <div className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="space-y-4 xl:self-start">
                        <ReportCard className="px-5 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-display text-[1.4rem] font-semibold tracking-tight text-ink">{session.locationName}</h2>
                                    <p className="mt-1 text-xs text-slate-500">{session.locationCode} · {session.location.city}, {session.location.country}</p>
                                </div>
                                <div className="rounded-full border border-[#e5ebf3] px-3 py-1 text-[11px] font-semibold text-slate-500">
                                    Finalized
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 text-sm text-slate-500">
                                <div className="flex items-center justify-between gap-4">
                                    <span>Analyzed</span>
                                    <span className="font-medium text-ink">{formatAuditDateTime(session.completedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span>Duration</span>
                                    <span className="font-medium text-ink">{durationLabel}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span>Store Type</span>
                                    <span className="font-medium text-ink">{session.location.type}</span>
                                </div>
                            </div>

                            <div className="mt-6 rounded-[16px] bg-[#f7f9fc] px-4 py-4">
                                <div>
                                    <span className="text-sm text-slate-500">Audit Review Progress</span>
                                </div>
                                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e8eef6]">
                                    <div
                                        className="h-full rounded-full bg-[linear-gradient(90deg,#7c3aed_0%,#6366f1_48%,#06b6d4_100%)] transition-[width] duration-500 ease-out"
                                        style={{ width: `${completionRate}%` }}
                                    />
                                </div>
                                <div className="mt-3 flex flex-wrap justify-center gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500">{answeredCount}/{questions.length} answered</span>
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500">{score.unanswered} pending</span>
                                </div>
                            </div>
                        </ReportCard>

                        <ReportCard className="px-5 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-display text-[1.35rem] font-semibold tracking-tight text-ink">Executive Review</h2>
                                </div>
                                <button type="button" onClick={onCopy} className="rounded-full p-2 text-slate-400 transition hover:bg-[#f4f7fb] hover:text-slate-600">
                                    <Clipboard className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="mt-5 space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-500">Risk Zone</span>
                                    <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold", scoreMeta.badgeClassName)}>{scoreMeta.label}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-500">Focus Area</span>
                                    <span className="text-right font-medium text-ink">{weakestSection?.title ?? "No issues found"}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500">Impact</span>
                                    <span className="max-w-[11rem] text-right font-medium leading-6 text-ink">{impactText}</span>
                                </div>
                            </div>

                            <div className="mt-5 rounded-[16px] bg-[#f6f2ff] px-4 py-4">
                                <p className="text-[11px] font-semibold text-slate-500">Recommendation</p>
                                <p className="mt-2 text-[13px] leading-6 text-[#4b4f66]">{recommendation}</p>
                            </div>

                            <div className="mt-5 space-y-2">
                                <button
                                    type="button"
                                    onClick={onOpenChecklist}
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#172337]"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    Open Checklist
                                </button>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={onPrint}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#e6ebf2] bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-[#f8fafc]"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        Print
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onCopy}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#e6ebf2] bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-[#f8fafc]"
                                    >
                                        <Clipboard className="h-3.5 w-3.5" />
                                        Copy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onNewAudit}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#e6ebf2] bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-[#f8fafc]"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        New
                                    </button>
                                </div>
                            </div>
                        </ReportCard>

                        <ReportCard className="px-5 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-display text-[1.35rem] font-semibold tracking-tight text-ink">
                                        {mode === "history" && history.length > 0 ? "Audit History" : "Findings Status"}
                                    </h2>
                                </div>
                                {mode === "history" && history.length > 0 ? <History className="h-4 w-4 text-slate-400" /> : <ClipboardList className="h-4 w-4 text-slate-400" />}
                            </div>

                            {mode === "history" && history.length > 0 ? (
                                <div className="mt-5 space-y-2">
                                    {history.map((entry) => {
                                        const entryScore = calculateAuditScore(entry.responses, questions.length);
                                        const entryMeta = getScoreMeta(entryScore.compliance);
                                        const isActive = entry.id === session.id;
                                        return (
                                            <button
                                                key={entry.id}
                                                type="button"
                                                onClick={() => onSelectHistory(entry)}
                                                className={cn(
                                                    "flex w-full items-start justify-between gap-3 rounded-[14px] border px-3 py-3 text-left transition",
                                                    isActive ? "border-[#d8e1ee] bg-[#f7f9fc]" : "border-transparent hover:bg-[#f7f9fc]"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-ink">{entry.locationName}</p>
                                                    <p className="mt-1 text-xs text-slate-400">{formatAuditDateTime(entry.completedAt)}</p>
                                                </div>
                                                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", entryMeta.subtleClassName)}>{entryScore.compliance}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : issues.length > 0 ? (
                                <div className="mt-5 space-y-3">
                                    <div className="rounded-[16px] bg-[#fff4f4] px-4 py-4">
                                        <p className="text-sm font-medium text-ink">{issues.length} active findings</p>
                                        <p className="mt-1 text-sm text-slate-500">Across {affectedSections} sections requiring follow-up.</p>
                                    </div>
                                    <div className="space-y-2">
                                        {issues.slice(0, 3).map((issue) => (
                                            <div key={issue.question.id} className="rounded-[14px] bg-[#f7f9fc] px-4 py-3">
                                                <p className="line-clamp-2 text-sm font-medium text-ink">{issue.question.question}</p>
                                                <p className="mt-1 text-xs text-slate-400">{resolveIssueSection(issue.question.id, sections)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-5 rounded-[16px] bg-[#f7f9fc] px-4 py-6">
                                    <p className="text-sm font-medium text-ink">No active findings</p>
                                    <p className="mt-1 text-sm text-slate-500">This audit closed without any failed checkpoints.</p>
                                </div>
                            )}
                        </ReportCard>
                    </aside>

                    <div className="min-w-0 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                            <StatCard label="Compliance" value={`${score.compliance}%`} meta={scoreMeta.label} valueClassName={scoreMeta.toneClassName} />
                            <StatCard label="Passed Checks" value={String(score.yes)} meta={`of ${questions.length} total`} />
                            <StatCard label="Identified Risks" value={String(score.no)} meta={`across ${affectedSections} sections`} valueClassName={issues.length > 0 ? "text-danger" : undefined} />
                            <StatCard label="Coverage" value={`${completionRate}%`} meta={`${score.unanswered} pending`} valueClassName={score.unanswered === 0 ? "text-success" : undefined} />
                        </div>

                        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_260px]">
                            <ReportCard className="px-5 py-5 sm:px-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-[1.25rem] font-semibold tracking-tight text-ink">Audit Response Trend</h2>
                                        <p className="mt-1 text-sm text-slate-500">Passed vs failed checkpoints across audit sections.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                                        <span className="rounded-full bg-[#e8f7f0] px-3 py-1 text-success">Passed</span>
                                        <span className="rounded-full bg-[#fceaea] px-3 py-1 text-danger">Failed</span>
                                    </div>
                                </div>

                                <div className="mt-6 h-[290px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData} margin={{ left: -16, right: 12, top: 12, bottom: 0 }}>
                                            <CartesianGrid stroke="#e8edf5" strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                            <Tooltip
                                                cursor={{ stroke: "#d7e2f0", strokeWidth: 1, strokeDasharray: "4 4" }}
                                                contentStyle={{
                                                    borderRadius: 14,
                                                    border: "1px solid #e5ebf3",
                                                    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                                                }}
                                            />
                                            <Line type="monotone" dataKey="yes" stroke="#178f63" strokeWidth={2.5} dot={{ r: 0 }} activeDot={{ r: 5 }} />
                                            <Line type="monotone" dataKey="no" stroke="#d86a6a" strokeWidth={2.2} dot={{ r: 0 }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </ReportCard>

                            <ReportCard className="px-5 py-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-medium tracking-[-0.01em] text-slate-400">AI Confidence</p>
                                        <h2 className="mt-3 text-[1.15rem] font-semibold tracking-tight text-ink">Overall Score</h2>
                                    </div>
                                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                                </div>

                                <div className="mt-5">
                                    <AuditScoreBar value={score.compliance} />
                                </div>

                                <div className="mt-5 space-y-3">
                                    <div className="flex items-center justify-between rounded-[14px] bg-[#f7f9fc] px-4 py-3">
                                        <span className="text-sm text-slate-500">Sections on track</span>
                                        <span className="text-sm font-semibold text-ink">{sectionsOnTrack}/{sections.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-[14px] bg-[#f7f9fc] px-4 py-3">
                                        <span className="text-sm text-slate-500">Evidence files</span>
                                        <span className="text-sm font-semibold text-ink">{evidenceCount}</span>
                                    </div>
                                </div>
                            </ReportCard>
                        </div>

                        <ReportCard className="px-5 py-5 sm:px-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-[1.25rem] font-semibold tracking-tight text-ink">Action Register</h2>
                                    <p className="mt-1 text-sm text-slate-500">A final view of section health and required follow-up work.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-medium">
                                    <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-brand">{session.location.type}</span>
                                    <span className="rounded-full bg-[#f5f7fb] px-3 py-1 text-slate-500">{session.location.staff_count} staff</span>
                                </div>
                            </div>

                            <div className="mt-5 overflow-hidden rounded-[16px] border border-[#edf1f6]">
                                <div className="grid grid-cols-[minmax(220px,1.8fr)_1fr_1fr_1fr_1fr] gap-3 border-b border-[#edf1f6] bg-[#fafcff] px-4 py-3 text-[11px] font-medium text-slate-400">
                                    <span>Section</span>
                                    <span>Answered</span>
                                    <span>Compliance</span>
                                    <span>Findings</span>
                                    <span>Status</span>
                                </div>
                                <div className="divide-y divide-[#edf1f6] bg-white">
                                    {sections.map((section) => {
                                        const sectionMeta = getScoreMeta(section.score.compliance);
                                        return (
                                            <div key={section.id} className="grid grid-cols-[minmax(220px,1.8fr)_1fr_1fr_1fr_1fr] gap-3 px-4 py-4 text-sm text-ink">
                                                <div>
                                                    <p className="font-medium text-ink">{section.title}</p>
                                                    <p className="mt-1 text-xs text-slate-400">{section.score.yes} yes · {section.score.no} no · {section.score.na} n/a</p>
                                                </div>
                                                <span className="text-slate-500">{section.answered}/{section.total}</span>
                                                <span className={cn("font-semibold", sectionMeta.toneClassName)}>{section.score.compliance}%</span>
                                                <span className={cn(section.score.no > 0 ? "text-danger" : "text-success")}>{section.score.no}</span>
                                                <span>
                                                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", sectionMeta.subtleClassName)}>
                                                        {sectionMeta.label}
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {evidenceItems.length > 0 ? (
                                <div className="mt-5">
                                    <EvidenceCarousel items={evidenceItems} />
                                </div>
                            ) : (
                                <div className="mt-5 rounded-[16px] border border-[#edf1f6] bg-[#fafcff] px-4 py-10 text-center">
                                    <Camera className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-3 text-sm font-medium text-ink">No media evidence</p>
                                    <p className="mt-1 text-sm text-slate-500">Attach audit photos or videos to review them here.</p>
                                </div>
                            )}
                        </ReportCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
