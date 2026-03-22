import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { readCachedSummary, writeCachedSummary } from "../cache";
import type { AcademiaSourceMode } from "../types";

interface UseAcademiaSummaryInput {
    sourceMode: AcademiaSourceMode;
    mediaFile: File | null;
    youtubeEmbedUrl: string | null;
}

export interface UseAcademiaSummaryResult {
    summaryCacheScope: string | null;
    summaryDraft: string;
    savedSummaryText: string;
    canSubmitSummary: boolean;
    setSummaryDraft: Dispatch<SetStateAction<string>>;
    submitSummary: () => void;
}

export function useAcademiaSummary({
    sourceMode,
    mediaFile,
    youtubeEmbedUrl,
}: UseAcademiaSummaryInput): UseAcademiaSummaryResult {
    const [summaryDraft, setSummaryDraft] = useState("");
    const [savedSummaryText, setSavedSummaryText] = useState("");

    const summaryCacheScope = useMemo(() => {
        if (sourceMode === "upload" && mediaFile) {
            return `upload:${mediaFile.name}`;
        }
        if (youtubeEmbedUrl) {
            return `youtube:${youtubeEmbedUrl}`;
        }
        return null;
    }, [mediaFile, sourceMode, youtubeEmbedUrl]);

    const canSubmitSummary =
        summaryCacheScope !== null && summaryDraft.trim() !== savedSummaryText.trim();

    // Hydrate summary from cache when scope changes.
    useEffect(() => {
        if (!summaryCacheScope) {
            setSummaryDraft("");
            setSavedSummaryText("");
            return;
        }

        const cachedSummary = readCachedSummary(summaryCacheScope);
        setSummaryDraft(cachedSummary);
        setSavedSummaryText(cachedSummary);
    }, [summaryCacheScope]);

    function submitSummary() {
        if (!summaryCacheScope) {
            return;
        }

        const normalizedSummary = summaryDraft.trim();
        writeCachedSummary(summaryCacheScope, normalizedSummary);
        setSummaryDraft(normalizedSummary);
        setSavedSummaryText(normalizedSummary);
    }

    return {
        summaryCacheScope,
        summaryDraft,
        savedSummaryText,
        canSubmitSummary,
        setSummaryDraft,
        submitSummary,
    };
}
