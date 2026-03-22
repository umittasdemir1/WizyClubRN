import { useEffect, useMemo, useRef, useState } from "react";
import type { AcademiaTranscriptCue, AcademiaTranscriptResult } from "../../../../types/academia";
import { TRANSCRIPT_SCROLL_LEAD_LINES } from "../constants";
import type { AcademiaSourceMode } from "../types";
import { findActiveCue, findActiveWordIndex, findLatestStartedCueIndex } from "../utils";

interface UseTranscriptScrollInput {
    transcript: AcademiaTranscriptResult | null;
    videoCurrentTime: number;
    sourceMode: AcademiaSourceMode;
}

export interface UseTranscriptScrollResult {
    transcriptViewportRef: React.RefObject<HTMLDivElement>;
    cueItemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    isTranscriptScrollbarActive: boolean;
    activateTranscriptScrollbar: () => void;
    deactivateTranscriptScrollbar: () => void;
    activePlaybackCue: AcademiaTranscriptCue | null;
    activePlaybackCueIndex: number;
    activePlaybackWordIndex: number;
}

export function useTranscriptScroll({
    transcript,
    videoCurrentTime,
    sourceMode,
}: UseTranscriptScrollInput): UseTranscriptScrollResult {
    const transcriptViewportRef = useRef<HTMLDivElement>(null);
    const cueItemRefs = useRef(new Map<number, HTMLDivElement>());
    const scrollbarTimerRef = useRef<number | null>(null);

    const [isTranscriptScrollbarActive, setIsTranscriptScrollbarActive] = useState(false);

    const activePlaybackCue = useMemo(
        () => (sourceMode === "upload" ? findActiveCue(transcript, videoCurrentTime) : null),
        [sourceMode, transcript, videoCurrentTime]
    );

    const activePlaybackCueIndex = useMemo(
        () =>
            activePlaybackCue && transcript?.cues.length
                ? transcript.cues.findIndex((cue) => cue === activePlaybackCue)
                : -1,
        [activePlaybackCue, transcript]
    );

    const scrollPlaybackCueIndex = useMemo(
        () =>
            sourceMode === "upload"
                ? findLatestStartedCueIndex(transcript, videoCurrentTime)
                : -1,
        [sourceMode, transcript, videoCurrentTime]
    );

    const activePlaybackWordIndex = useMemo(
        () =>
            activePlaybackCue ? findActiveWordIndex(activePlaybackCue.words, videoCurrentTime) : -1,
        [activePlaybackCue, videoCurrentTime]
    );

    // Auto-scroll transcript to keep active cue visible.
    useEffect(() => {
        const viewportNode = transcriptViewportRef.current;
        if (!viewportNode) return;

        if (scrollPlaybackCueIndex < 0) {
            viewportNode.scrollTo({ top: 0, behavior: "auto" });
            return;
        }

        if (scrollPlaybackCueIndex < TRANSCRIPT_SCROLL_LEAD_LINES) {
            viewportNode.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        const nextTopCueIndex = Math.max(scrollPlaybackCueIndex - (TRANSCRIPT_SCROLL_LEAD_LINES - 1), 0);
        const nextTopCueNode = cueItemRefs.current.get(nextTopCueIndex);
        if (!nextTopCueNode) return;

        viewportNode.scrollTo({
            top: Math.max(nextTopCueNode.offsetTop - 4, 0),
            behavior: "smooth",
        });
    }, [scrollPlaybackCueIndex]);

    // Cleanup timer on unmount.
    useEffect(() => {
        return () => {
            if (scrollbarTimerRef.current !== null) {
                window.clearTimeout(scrollbarTimerRef.current);
            }
        };
    }, []);

    function clearScrollbarTimer() {
        if (scrollbarTimerRef.current !== null) {
            window.clearTimeout(scrollbarTimerRef.current);
            scrollbarTimerRef.current = null;
        }
    }

    function activateTranscriptScrollbar() {
        setIsTranscriptScrollbarActive(true);
        clearScrollbarTimer();
        scrollbarTimerRef.current = window.setTimeout(() => {
            setIsTranscriptScrollbarActive(false);
            scrollbarTimerRef.current = null;
        }, 900);
    }

    function deactivateTranscriptScrollbar() {
        clearScrollbarTimer();
        setIsTranscriptScrollbarActive(false);
    }

    return {
        transcriptViewportRef,
        cueItemRefs,
        isTranscriptScrollbarActive,
        activateTranscriptScrollbar,
        deactivateTranscriptScrollbar,
        activePlaybackCue,
        activePlaybackCueIndex,
        activePlaybackWordIndex,
    };
}
