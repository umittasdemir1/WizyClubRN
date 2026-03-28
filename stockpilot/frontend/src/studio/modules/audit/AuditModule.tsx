import { useCallback, useEffect, useMemo, useState } from "react";
import { clearActiveAuditSession, getActiveAuditSession, getAuditHistory } from "./cache";
import { AUDIT_TABS } from "./constants";
import { AuditChecklist } from "./components/AuditChecklist";
import { AuditLanding } from "./components/AuditLanding";
import { AuditLocationPicker } from "./components/AuditLocationPicker";
import { AuditReport } from "./components/AuditReport";
import { useAuditChecklist } from "./hooks/useAuditChecklist";
import locationData from "./mock/locations.json";
import questionData from "./mock/questions.json";
import type { AuditQuestion, AuditSession, AuditSidebarTab, AuditStore, AuditView } from "./types";
import { buildAuditClipboardPayload, calculateAuditScore, createDemoAuditSession, getAuditSectionSummaries } from "./utils";

const AUDIT_QUESTIONS = questionData.questions as AuditQuestion[];
const AUDIT_LOCATIONS = locationData.stores as AuditStore[];

function resolveLocation(session: AuditSession | null) {
    if (!session) {
        return null;
    }

    return session.location ?? AUDIT_LOCATIONS.find((location) => location.code === session.locationCode) ?? null;
}

interface AuditModuleProps {
    onHeroModeChange?: (isHeroMode: boolean) => void;
    onHeaderHiddenChange?: (hidden: boolean) => void;
}

export function AuditModule({ onHeroModeChange, onHeaderHiddenChange }: AuditModuleProps) {
    const [view, setView] = useState<AuditView>("landing");
    const [history, setHistory] = useState<AuditSession[]>(() => getAuditHistory());
    const [activeDraft, setActiveDraft] = useState<AuditSession | null>(() => getActiveAuditSession());
    const [selectedLocation, setSelectedLocation] = useState<AuditStore | null>(() => resolveLocation(getActiveAuditSession()));
    const [initialSession, setInitialSession] = useState<AuditSession | null>(() => getActiveAuditSession());
    const [reportSession, setReportSession] = useState<AuditSession | null>(null);
    const [activeTab, setActiveTab] = useState<AuditSidebarTab>("checklist");

    const demoSession = useMemo(() => createDemoAuditSession(AUDIT_LOCATIONS[0], AUDIT_QUESTIONS), []);

    useEffect(() => {
        onHeroModeChange?.(false);
    }, [onHeroModeChange]);

    const refreshStoredState = useCallback(() => {
        const nextHistory = getAuditHistory();
        const nextDraft = getActiveAuditSession();
        setHistory(nextHistory);
        setActiveDraft(nextDraft);
        if (!nextDraft && view !== "checklist") {
            setInitialSession(null);
        }
    }, [view]);

    const openReportSession = useCallback((session: AuditSession, tab: AuditSidebarTab) => {
        setReportSession(session);
        setSelectedLocation(resolveLocation(session));
        setInitialSession(null);
        setView("report");
        setActiveTab(tab);
    }, []);

    const handleChecklistSubmit = useCallback((session: AuditSession) => {
        refreshStoredState();
        setReportSession(session);
        setSelectedLocation(resolveLocation(session));
        setInitialSession(null);
        setView("report");
        setActiveTab("report");
    }, [refreshStoredState]);

    const checklist = useAuditChecklist({
        questions: AUDIT_QUESTIONS,
        location: view === "checklist" ? selectedLocation : null,
        initialSession: view === "checklist" ? initialSession : null,
        onSubmit: handleChecklistSubmit,
        onSessionSaved: setActiveDraft,
    });

    const handleStartNew = useCallback(() => {
        clearActiveAuditSession();
        setActiveDraft(null);
        setInitialSession(null);
        setReportSession(null);
        setSelectedLocation(null);
        setView("location-picker");
        setActiveTab("checklist");
    }, []);

    const handleResume = useCallback(() => {
        const draft = activeDraft ?? getActiveAuditSession();
        if (!draft) {
            return;
        }

        setInitialSession(draft);
        setSelectedLocation(resolveLocation(draft));
        setReportSession(null);
        setView("checklist");
        setActiveTab("checklist");
    }, [activeDraft]);

    const handleSelectLocation = useCallback((location: AuditStore) => {
        setSelectedLocation(location);
        setInitialSession(null);
        setReportSession(null);
        setView("checklist");
        setActiveTab("checklist");
    }, []);

    const handleSaveExit = useCallback(() => {
        checklist.saveDraft();
        refreshStoredState();
        setView("landing");
    }, [checklist, refreshStoredState]);

    const handlePreviewReport = useCallback(() => {
        if (history.length > 0) {
            openReportSession(history[0], "history");
            return;
        }

        openReportSession(demoSession, "report");
    }, [demoSession, history, openReportSession]);

    const handleOpenHistoryReport = useCallback((session: AuditSession) => {
        openReportSession(session, "history");
    }, [openReportSession]);

    const handleNewAuditFromReport = useCallback(() => {
        refreshStoredState();
        setReportSession(null);
        setInitialSession(null);
        setSelectedLocation(null);
        setView("landing");
        setActiveTab("checklist");
    }, [refreshStoredState]);

    const handleTabChange = useCallback((tab: AuditSidebarTab) => {
        setActiveTab(tab);

        if (tab === "checklist") {
            const draft = activeDraft ?? getActiveAuditSession();
            if (draft) {
                setInitialSession(draft);
                setSelectedLocation(resolveLocation(draft));
                setView("checklist");
                return;
            }

            if (view === "checklist" && selectedLocation) {
                setView("checklist");
                return;
            }

            setView("location-picker");
            return;
        }

        const targetReport = reportSession ?? history[0] ?? null;
        if (targetReport) {
            openReportSession(targetReport, tab);
            return;
        }

        if (tab === "report") {
            openReportSession(demoSession, "report");
            return;
        }

        setView("landing");
    }, [activeDraft, demoSession, history, openReportSession, reportSession, selectedLocation, view]);

    const handleCopyReport = useCallback(async () => {
        const session = reportSession ?? demoSession;
        const payload = buildAuditClipboardPayload(
            session,
            AUDIT_QUESTIONS,
            getAuditSectionSummaries(AUDIT_QUESTIONS, session.responses),
            calculateAuditScore(session.responses, AUDIT_QUESTIONS.length)
        );

        await navigator.clipboard.writeText(payload);
    }, [demoSession, reportSession]);

    const reportMode = activeTab === "history" ? "history" : "report";
    const resolvedReportSession = reportSession ?? (history[0] ?? demoSession);
    const isLandingView = view === "landing";
    const isChecklistView = view === "checklist";
    const rootClassName = isLandingView
        ? "flex h-full min-h-0 flex-col"
        : isChecklistView
            ? "flex h-full min-h-0 flex-col"
            : "flex h-full min-h-0 flex-col px-4 pb-4 pt-4 md:px-6 lg:px-8";
    const shellClassName = isLandingView
        ? "flex h-full min-h-0 w-full flex-1 flex-col"
        : isChecklistView
            ? "flex h-full min-h-0 w-full flex-1 flex-col"
            : "mx-auto flex h-full min-h-0 w-full max-w-[1680px] flex-1 flex-col gap-4";
    const contentViewportClassName = "min-h-0 flex-1 overflow-hidden";

    return (
        <div className={rootClassName}>
            <div className={shellClassName}>
                <div className={contentViewportClassName}>
                    {view === "landing" ? (
                        <AuditLanding
                            history={history}
                            activeSession={activeDraft}
                            onStartNew={handleStartNew}
                            onPreviewReport={handlePreviewReport}
                            onResume={handleResume}
                            onOpenHistoryReport={handleOpenHistoryReport}
                        />
                    ) : null}

                    {view === "location-picker" ? (
                        <AuditLocationPicker locations={AUDIT_LOCATIONS} onBack={() => setView("landing")} onSelect={handleSelectLocation} />
                    ) : null}

                    {view === "checklist" && selectedLocation ? (
                        <AuditChecklist
                            location={selectedLocation}
                            questions={AUDIT_QUESTIONS}
                            responses={checklist.responses}
                            canSubmit={checklist.canSubmit}
                            onBack={() => setView("location-picker")}
                            onReset={checklist.reset}
                            onSaveDraft={checklist.saveDraft}
                            onSubmit={() => {
                                checklist.submit();
                            }}
                            onAnswerChange={checklist.setAnswer}
                            onCommentChange={checklist.setComment}
                            onAddMedia={checklist.addMediaBatch}
                            onRemoveMedia={checklist.removeMedia}
                            onHeaderHiddenChange={onHeaderHiddenChange}
                        />
                    ) : null}

                    {view === "report" && resolvedReportSession ? (
                        <AuditReport
                            session={resolvedReportSession}
                            questions={AUDIT_QUESTIONS}
                            history={history}
                            mode={reportMode}
                            onSelectHistory={(session) => openReportSession(session, "history")}
                            onPrint={() => window.print()}
                            onCopy={() => {
                                void handleCopyReport();
                            }}
                            onNewAudit={handleNewAuditFromReport}
                            onOpenChecklist={() => handleTabChange("checklist")}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
