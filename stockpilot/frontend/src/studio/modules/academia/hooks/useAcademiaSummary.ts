import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readCachedSummary, readCachedSummarySlate, writeCachedSummary, writeCachedSummarySlate } from "../cache";
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
    cachedSlateValue: unknown[] | null;
    setSummaryDraft: Dispatch<SetStateAction<string>>;
    submitSummary: () => void;
    saveSummarySlateValue: (value: unknown[]) => void;
}

export function useAcademiaSummary({
    sourceMode,
    mediaFile,
    youtubeEmbedUrl,
}: UseAcademiaSummaryInput): UseAcademiaSummaryResult {
    const [summaryDraft, setSummaryDraft] = useState("");
    const [savedSummaryText, setSavedSummaryText] = useState("");
    const [cachedSlateValue, setCachedSlateValue] = useState<unknown[] | null>(null);
    const latestSlateValueRef = useRef<unknown[] | null>(null);

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
            setCachedSlateValue(null);
            return;
        }

        const cachedSummary = readCachedSummary(summaryCacheScope);
        const cachedSlate = readCachedSummarySlate(summaryCacheScope);
        setSummaryDraft(cachedSummary);
        setSavedSummaryText(cachedSummary);
        setCachedSlateValue(cachedSlate);
    }, [summaryCacheScope]);

    const saveSummarySlateValue = useCallback((value: unknown[]) => {
        latestSlateValueRef.current = value;
    }, []);

    function submitSummary() {
        if (!summaryCacheScope) {
            return;
        }

        const normalizedSummary = summaryDraft.trim();
        writeCachedSummary(summaryCacheScope, normalizedSummary);
        if (latestSlateValueRef.current) {
            writeCachedSummarySlate(summaryCacheScope, latestSlateValueRef.current);
            setCachedSlateValue(latestSlateValueRef.current);
        }
        setSummaryDraft(normalizedSummary);
        setSavedSummaryText(normalizedSummary);
    }

    return {
        summaryCacheScope,
        summaryDraft,
        savedSummaryText,
        canSubmitSummary,
        cachedSlateValue,
        setSummaryDraft,
        submitSummary,
        saveSummarySlateValue,
    };
}
