import axios from "axios";
import type {
    AcademiaMediaKind,
    AcademiaTranscriptCue,
    AcademiaTranscriptResult,
    AcademiaTranscriptWord,
    AcademiaTranscriptionStatus,
} from "../../../types/academia";
import { TURKEY_TIME_ZONE, TURKEY_WEEKDAY_INDEX } from "./constants";
import type { AcademiaNote, AcademiaNoteColorToken, AcademiaNoteKind } from "./types";

export function resolveMediaKind(file: File): AcademiaMediaKind {
    if (file.type.startsWith("video/")) return "video";
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return ["mp4", "mov", "webm", "mkv"].includes(extension) ? "video" : "audio";
}

export function extractYouTubeVideoId(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const url = new URL(trimmed);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();

        if (host === "youtu.be") {
            const candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
            return /^[\w-]{11}$/.test(candidate) ? candidate : null;
        }

        if (host === "youtube.com" || host === "m.youtube.com") {
            if (url.pathname === "/watch") {
                const candidate = url.searchParams.get("v") ?? "";
                return /^[\w-]{11}$/.test(candidate) ? candidate : null;
            }

            const segments = url.pathname.split("/").filter(Boolean);
            const candidate = segments[1] ?? "";
            if ((segments[0] === "embed" || segments[0] === "shorts") && /^[\w-]{11}$/.test(candidate)) {
                return candidate;
            }
        }
    } catch {
        return null;
    }

    return null;
}

export function buildYouTubeEmbedUrl(value: string): string | null {
    const videoId = extractYouTubeVideoId(value);
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
}

export function buildAcademiaRequestId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `academia_${crypto.randomUUID()}`;
    }
    return `academia_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface AcademiaTimestampSegment {
    text: string;
    isTimestamp: boolean;
}

const ACADEMIA_TIMESTAMP_REGEX = /\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g;

export function splitTextWithTimestamps(value: string): AcademiaTimestampSegment[] {
    const segments: AcademiaTimestampSegment[] = [];
    let lastIndex = 0;

    for (const match of value.matchAll(ACADEMIA_TIMESTAMP_REGEX)) {
        const index = match.index ?? 0;
        if (index > lastIndex) {
            segments.push({ text: value.slice(lastIndex, index), isTimestamp: false });
        }

        segments.push({ text: match[0], isTimestamp: true });
        lastIndex = index + match[0].length;
    }

    if (lastIndex < value.length) {
        segments.push({ text: value.slice(lastIndex), isTimestamp: false });
    }

    return segments.length > 0 ? segments : [{ text: value, isTimestamp: false }];
}

export function parseTimestampToSeconds(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const parts = trimmed.split(":").map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) {
        return null;
    }

    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
    }

    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
    }

    return null;
}

export function buildAcademiaNoteId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `academia_note_${crypto.randomUUID()}`;
    }
    return `academia_note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveAcademiaNoteColorToken(value: unknown): AcademiaNoteColorToken {
    return value === "slate"
        || value === "rose"
        || value === "amber"
        || value === "orange"
        || value === "emerald"
        || value === "teal"
        || value === "sky"
        || value === "indigo"
        || value === "violet"
        || value === "pink"
        ? value
        : "slate";
}

export function buildLocalStatus(
    requestId: string,
    sourceName: string,
    progressPercent: number,
    message: string,
    phase: AcademiaTranscriptionStatus["phase"],
    errorCode: string | null = null
): AcademiaTranscriptionStatus {
    const timestamp = new Date().toISOString();
    return {
        requestId,
        sourceName,
        phase,
        progressPercent,
        message,
        errorCode,
        startedAt: timestamp,
        updatedAt: timestamp,
        completedAt: phase === "completed" || phase === "failed" ? timestamp : null,
    };
}

export function getMediaDisplayName(fileName: string): string {
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

export function formatPlaybackTime(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
        return "0:00";
    }

    const totalSeconds = Math.floor(value);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getTurkeyDateParts(value: string | Date): {
    day: string;
    month: string;
    year: number;
    weekday: string;
    weekdayIndex: number;
    hour: string;
    minute: string;
} | null {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: TURKEY_TIME_ZONE,
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
    const weekday = lookup("weekday");
    const weekdayIndex = TURKEY_WEEKDAY_INDEX[weekday];

    if (!weekday || weekdayIndex === undefined) {
        return null;
    }

    return {
        day: lookup("day"),
        month: lookup("month"),
        year: Number(lookup("year")),
        weekday,
        weekdayIndex,
        hour: lookup("hour"),
        minute: lookup("minute"),
    };
}

export function formatTurkeyNoteTimestamp(value: string | null): string {
    if (!value) {
        return "";
    }

    const noteParts = getTurkeyDateParts(value);
    const nowParts = getTurkeyDateParts(new Date());
    if (!noteParts || !nowParts) {
        return "";
    }

    const noteDay = new Date(Date.UTC(noteParts.year, Number(noteParts.month) - 1, Number(noteParts.day)));
    const nowDay = new Date(Date.UTC(nowParts.year, Number(nowParts.month) - 1, Number(nowParts.day)));
    const noteWeekStart = noteDay.getTime() - noteParts.weekdayIndex * 24 * 60 * 60 * 1000;
    const currentWeekStart = nowDay.getTime() - nowParts.weekdayIndex * 24 * 60 * 60 * 1000;

    if (noteWeekStart === currentWeekStart) {
        return `${noteParts.weekday} ${noteParts.hour}:${noteParts.minute}`;
    }

    return `${noteParts.day}/${noteParts.month} ${noteParts.hour}:${noteParts.minute}`;
}

export function normalizeAcademiaNote(value: unknown): AcademiaNote | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const note = value as Record<string, unknown>;
    if (
        typeof note.id !== "string"
        || typeof note.capturedAtSeconds !== "number"
        || !Number.isFinite(note.capturedAtSeconds)
        || typeof note.createdAt !== "string"
        || typeof note.screenshotDataUrl !== "string"
        || typeof note.sourceName !== "string"
        || typeof note.text !== "string"
    ) {
        return null;
    }

    const inferredKind: AcademiaNoteKind = note.screenshotDataUrl.trim().length > 0 ? "visual" : "typewriter";
    const kind = note.kind === "visual" || note.kind === "typewriter" || note.kind === "pinned"
        ? note.kind
        : inferredKind;

    return {
        id: note.id,
        kind,
        colorToken: resolveAcademiaNoteColorToken(note.colorToken),
        capturedAtSeconds: note.capturedAtSeconds,
        createdAt: note.createdAt,
        screenshotDataUrl: note.screenshotDataUrl,
        sourceName: note.sourceName,
        text: note.text,
        isSaved: typeof note.isSaved === "boolean" ? note.isSaved : false,
        savedAt: typeof note.savedAt === "string" ? note.savedAt : null,
    };
}

export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (typeof message === "string" && message.trim()) {
            return message;
        }
        return error.message;
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return "Transcript generation failed.";
}

export function findActiveCue(
    transcript: AcademiaTranscriptResult | null,
    currentSeconds: number
): AcademiaTranscriptCue | null {
    if (!transcript?.cues.length) {
        return null;
    }

    return (
        transcript.cues.find((cue) => {
            if (cue.words.length > 0) {
                return cue.words.some(
                    (word) => currentSeconds >= word.startSeconds && currentSeconds <= word.endSeconds
                );
            }
            return currentSeconds >= cue.startSeconds && currentSeconds <= cue.endSeconds;
        }) ?? null
    );
}

export function findLatestStartedCueIndex(
    transcript: AcademiaTranscriptResult | null,
    currentSeconds: number
): number {
    if (!transcript?.cues.length) {
        return -1;
    }

    for (let index = transcript.cues.length - 1; index >= 0; index -= 1) {
        if (currentSeconds >= transcript.cues[index].startSeconds) {
            return index;
        }
    }

    return -1;
}

export function findActiveWordIndex(words: AcademiaTranscriptWord[], currentSeconds: number): number {
    return words.findIndex(
        (word) => currentSeconds >= word.startSeconds && currentSeconds <= word.endSeconds
    );
}

export function splitTranscriptWordText(value: string): { leadingSpace: boolean; content: string } {
    const match = value.match(/^(\s*)(.*)$/s);
    if (!match) {
        return { leadingSpace: false, content: value };
    }

    return {
        leadingSpace: match[1].length > 0,
        content: match[2],
    };
}

/**
 * Produces synthetic word-level tokens for cues that have no word timestamps
 * (e.g. translated cues). Splits the cue text by whitespace and distributes
 * the cue duration evenly so word-level amber highlighting can work.
 */
export function interpolateWordTokens(cue: AcademiaTranscriptCue): AcademiaTranscriptWord[] {
    const tokens = cue.text.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const duration = Math.max(cue.endSeconds - cue.startSeconds, 0);
    const tokenDuration = duration / tokens.length;
    return tokens.map((token, i) => ({
        text: i === 0 ? token : ` ${token}`,
        startSeconds: cue.startSeconds + i * tokenDuration,
        endSeconds: cue.startSeconds + (i + 1) * tokenDuration,
    }));
}
