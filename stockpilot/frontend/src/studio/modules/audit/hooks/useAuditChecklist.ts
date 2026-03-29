import { useCallback, useEffect, useMemo, useState } from "react";
import {
    clearActiveAuditSession,
    getActiveAuditSession,
    pushAuditHistory,
    saveActiveAuditSession,
} from "../cache";
import {
    AUDIT_MEDIA_LIMIT,
    AUDIT_MIN_COMPLETION_RATIO,
} from "../constants";
import type {
    AuditAnswer,
    AuditProgress,
    AuditQuestion,
    AuditQuestionResponse,
    AuditScore,
    AuditSectionSummary,
    AuditSession,
    AuditStore,
} from "../types";
import {
    calculateAuditProgress,
    calculateAuditScore,
    createAuditSession,
    getAuditSectionSummaries,
} from "../utils";
import { useAuditMedia } from "./useAuditMedia";

interface UseAuditChecklistOptions {
    questions: AuditQuestion[];
    location: AuditStore | null;
    initialSession?: AuditSession | null;
    minCompletionRatio?: number;
    onSubmit?: (session: AuditSession) => void;
    onSessionSaved?: (session: AuditSession | null) => void;
}

interface UseAuditChecklistReturn {
    session: AuditSession | null;
    responses: Record<number, AuditQuestionResponse>;
    progress: AuditProgress;
    score: AuditScore;
    sectionSummaries: AuditSectionSummary[];
    canSubmit: boolean;
    lastSavedAt: string | null;
    setAnswer: (questionId: number, answer: AuditAnswer) => void;
    setComment: (questionId: number, comment: string) => void;
    addMedia: (questionId: number, file: File) => void;
    addMediaBatch: (questionId: number, files: File[]) => void;
    removeMedia: (questionId: number, index: number) => void;
    reset: () => void;
    saveDraft: () => void;
    submit: () => AuditSession | null;
    resume: () => boolean;
}

function buildInitialSession(
    questions: AuditQuestion[],
    location: AuditStore | null,
    initialSession?: AuditSession | null
) {
    if (initialSession) {
        return createAuditSession(initialSession.location, questions, initialSession);
    }

    if (location) {
        return createAuditSession(location, questions);
    }

    return null;
}

export function useAuditChecklist({
    questions,
    location,
    initialSession = null,
    minCompletionRatio = AUDIT_MIN_COMPLETION_RATIO,
    onSubmit,
    onSessionSaved,
}: UseAuditChecklistOptions): UseAuditChecklistReturn {
    const { addFiles, removeMedia: removeMediaFiles, revokeResponseMedia } = useAuditMedia();
    const [session, setSession] = useState<AuditSession | null>(() => (
        buildInitialSession(questions, location, initialSession)
    ));
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

    useEffect(() => {
        setSession(() => buildInitialSession(questions, location, initialSession));
        setLastSavedAt(null);
    }, [initialSession?.id, location?.code, questions]);

    const responses = session?.responses ?? {};
    const minimumRequired = Math.ceil(questions.length * minCompletionRatio);

    const progress = useMemo(
        () => calculateAuditProgress(responses, questions.length, minimumRequired),
        [minimumRequired, questions.length, responses]
    );

    const score = useMemo(
        () => calculateAuditScore(responses, questions.length),
        [questions.length, responses]
    );

    const sectionSummaries = useMemo(
        () => getAuditSectionSummaries(questions, responses),
        [questions, responses]
    );

    const canSubmit = progress.answered >= progress.minimumRequired;

    const patchResponse = useCallback(
        (questionId: number, updater: (response: AuditQuestionResponse) => AuditQuestionResponse) => {
            setSession((currentSession) => {
                if (!currentSession) {
                    return currentSession;
                }

                const currentResponse = currentSession.responses[questionId];
                if (!currentResponse) {
                    return currentSession;
                }

                return {
                    ...currentSession,
                    responses: {
                        ...currentSession.responses,
                        [questionId]: updater(currentResponse),
                    },
                };
            });
        },
        []
    );

    const setAnswer = useCallback((questionId: number, answer: AuditAnswer) => {
        patchResponse(questionId, (response) => ({
            ...response,
            answer,
            answeredAt: answer ? new Date().toISOString() : null,
        }));
    }, [patchResponse]);

    const setComment = useCallback((questionId: number, comment: string) => {
        patchResponse(questionId, (response) => ({
            ...response,
            comment,
        }));
    }, [patchResponse]);

    const addMediaBatch = useCallback((questionId: number, files: File[]) => {
        if (files.length === 0) {
            return;
        }

        patchResponse(questionId, (response) => {
            const remainingSlots = Math.max(AUDIT_MEDIA_LIMIT - response.mediaFiles.length, 0);
            if (remainingSlots === 0) {
                return response;
            }

            return {
                ...response,
                mediaFiles: addFiles(response.mediaFiles, files.slice(0, remainingSlots)),
            };
        });
    }, [addFiles, patchResponse]);

    const addMedia = useCallback((questionId: number, file: File) => {
        addMediaBatch(questionId, [file]);
    }, [addMediaBatch]);

    const removeMedia = useCallback((questionId: number, index: number) => {
        patchResponse(questionId, (response) => ({
            ...response,
            mediaFiles: removeMediaFiles(response.mediaFiles, index),
        }));
    }, [patchResponse, removeMediaFiles]);

    const reset = useCallback(() => {
        setSession((currentSession) => {
            if (currentSession) {
                revokeResponseMedia(currentSession.responses);
            }

            const nextSession = buildInitialSession(questions, location, null);
            onSessionSaved?.(nextSession);
            return nextSession;
        });
        setLastSavedAt(null);
        clearActiveAuditSession();
    }, [location, onSessionSaved, questions, revokeResponseMedia]);

    const saveDraft = useCallback(() => {
        if (!session || session.completedAt) {
            return;
        }

        saveActiveAuditSession(session);
        onSessionSaved?.(session);
        setLastSavedAt(new Date().toISOString());
    }, [onSessionSaved, session]);

    const submit = useCallback(() => {
        if (!session || !canSubmit) {
            return null;
        }

        const completedSession: AuditSession = {
            ...session,
            completedAt: new Date().toISOString(),
        };

        pushAuditHistory(completedSession);
        clearActiveAuditSession();
        onSessionSaved?.(null);
        setLastSavedAt(completedSession.completedAt);
        setSession(completedSession);
        onSubmit?.(completedSession);
        return completedSession;
    }, [canSubmit, onSessionSaved, onSubmit, session]);

    const resume = useCallback(() => {
        const cachedSession = getActiveAuditSession();
        if (!cachedSession) {
            return false;
        }

        setSession(createAuditSession(cachedSession.location, questions, cachedSession));
        onSessionSaved?.(cachedSession);
        return true;
    }, [onSessionSaved, questions]);

    useEffect(() => {
        if (!session || session.completedAt) {
            return;
        }

        const timer = window.setTimeout(() => {
            saveActiveAuditSession(session);
            onSessionSaved?.(session);
            setLastSavedAt(new Date().toISOString());
        }, 500);

        return () => window.clearTimeout(timer);
    }, [onSessionSaved, session]);

    return {
        session,
        responses,
        progress,
        score,
        sectionSummaries,
        canSubmit,
        lastSavedAt,
        setAnswer,
        setComment,
        addMedia,
        addMediaBatch,
        removeMedia,
        reset,
        saveDraft,
        submit,
        resume,
    };
}
