import type { AcademiaTranscriptResult } from "../../../types/academia";
import {
    NOTES_CACHE_PREFIX,
    SUMMARY_CACHE_PREFIX,
    TRANSCRIPT_CACHE_PREFIX,
    TRANSCRIPT_TRANSLATION_CACHE_PREFIX,
} from "./constants";
import type { AcademiaNote } from "./types";
import { normalizeAcademiaNote } from "./utils";

// Module-level memory cache — survives component re-mounts within the same page session.
const transcriptMemoryCache = new Map<string, AcademiaTranscriptResult>();
const transcriptTranslationMemoryCache = new Map<string, AcademiaTranscriptResult>();

function buildTranscriptCacheKey(fileName: string): string {
    return `${TRANSCRIPT_CACHE_PREFIX}${fileName.trim().toLowerCase()}`;
}

function buildTranscriptTranslationCacheKey(fileName: string, targetLanguage: string): string {
    return `${TRANSCRIPT_TRANSLATION_CACHE_PREFIX}${fileName.trim().toLowerCase()}:${targetLanguage.trim().toLowerCase()}`;
}

function buildNotesCacheKey(fileName: string): string {
    return `${NOTES_CACHE_PREFIX}${fileName.trim().toLowerCase()}`;
}

function buildSummaryCacheKey(scope: string): string {
    return `${SUMMARY_CACHE_PREFIX}${scope.trim().toLowerCase()}`;
}

export function readCachedTranscript(fileName: string): AcademiaTranscriptResult | null {
    const cacheKey = buildTranscriptCacheKey(fileName);
    const inMemory = transcriptMemoryCache.get(cacheKey);
    if (inMemory) {
        return inMemory;
    }

    try {
        const raw = window.localStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AcademiaTranscriptResult;
        if (!parsed || typeof parsed.text !== "string" || !Array.isArray(parsed.cues)) {
            return null;
        }
        transcriptMemoryCache.set(cacheKey, parsed);
        return parsed;
    } catch {
        return null;
    }
}

export function writeCachedTranscript(fileName: string, transcript: AcademiaTranscriptResult): void {
    const cacheKey = buildTranscriptCacheKey(fileName);
    transcriptMemoryCache.set(cacheKey, transcript);

    try {
        window.localStorage.setItem(cacheKey, JSON.stringify(transcript));
    } catch {
        // Ignore cache write failures and continue with in-memory state.
    }
}

export function readCachedTranscriptTranslation(
    fileName: string,
    targetLanguage: string
): AcademiaTranscriptResult | null {
    const cacheKey = buildTranscriptTranslationCacheKey(fileName, targetLanguage);
    const inMemory = transcriptTranslationMemoryCache.get(cacheKey);
    if (inMemory) {
        return inMemory;
    }

    try {
        const raw = window.localStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AcademiaTranscriptResult;
        if (!parsed || typeof parsed.text !== "string" || !Array.isArray(parsed.cues)) {
            return null;
        }
        transcriptTranslationMemoryCache.set(cacheKey, parsed);
        return parsed;
    } catch {
        return null;
    }
}

export function writeCachedTranscriptTranslation(
    fileName: string,
    targetLanguage: string,
    transcript: AcademiaTranscriptResult
): void {
    const cacheKey = buildTranscriptTranslationCacheKey(fileName, targetLanguage);
    transcriptTranslationMemoryCache.set(cacheKey, transcript);

    try {
        window.localStorage.setItem(cacheKey, JSON.stringify(transcript));
    } catch {
        // Ignore cache write failures and continue with in-memory state.
    }
}

export function readCachedNotes(fileName: string): AcademiaNote[] {
    try {
        const raw = window.localStorage.getItem(buildNotesCacheKey(fileName));
        if (!raw) return [];

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((note) => normalizeAcademiaNote(note))
            .filter((note): note is AcademiaNote => note !== null);
    } catch {
        return [];
    }
}

export function writeCachedNotes(fileName: string, notes: AcademiaNote[]): void {
    try {
        const cacheKey = buildNotesCacheKey(fileName);
        if (notes.length === 0) {
            window.localStorage.removeItem(cacheKey);
            return;
        }
        window.localStorage.setItem(cacheKey, JSON.stringify(notes));
    } catch {
        // Ignore cache write failures and continue with in-memory state.
    }
}

export function readCachedSummary(scope: string): string {
    try {
        return window.localStorage.getItem(buildSummaryCacheKey(scope)) ?? "";
    } catch {
        return "";
    }
}

export function writeCachedSummary(scope: string, summary: string): void {
    try {
        const cacheKey = buildSummaryCacheKey(scope);
        if (!summary.trim()) {
            window.localStorage.removeItem(cacheKey);
            return;
        }
        window.localStorage.setItem(cacheKey, summary);
    } catch {
        // Ignore cache write failures and continue with in-memory state.
    }
}

const SUMMARY_SLATE_SUFFIX = ":slate";

export function readCachedSummarySlate(scope: string): unknown[] | null {
    try {
        const raw = window.localStorage.getItem(buildSummaryCacheKey(scope) + SUMMARY_SLATE_SUFFIX);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function writeCachedSummarySlate(scope: string, value: unknown[]): void {
    try {
        const cacheKey = buildSummaryCacheKey(scope) + SUMMARY_SLATE_SUFFIX;
        window.localStorage.setItem(cacheKey, JSON.stringify(value));
    } catch {
        // Ignore cache write failures.
    }
}
