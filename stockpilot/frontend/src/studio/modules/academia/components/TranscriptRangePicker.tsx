import { useMemo } from "react";
import type { AcademiaTranscriptResult } from "../../../../types/academia";
import { formatPlaybackTime } from "../utils";

interface Props {
    variant: "original" | "translate";
    startSeconds: number | null;
    endSeconds: number | null;
    videoCurrentTime: number;
    transcript: AcademiaTranscriptResult | null;
    onSetStart: () => void;
    onSetEnd: () => void;
    onInsert: () => void;
    onCancel: () => void;
}

export function TranscriptRangePicker({
    variant,
    startSeconds,
    endSeconds,
    videoCurrentTime,
    transcript,
    onSetStart,
    onSetEnd,
    onInsert,
    onCancel,
}: Props) {
    const rangeStart = startSeconds !== null && endSeconds !== null
        ? Math.min(startSeconds, endSeconds)
        : startSeconds;
    const rangeEnd = startSeconds !== null && endSeconds !== null
        ? Math.max(startSeconds, endSeconds)
        : endSeconds;

    const previewCues = useMemo(() => {
        if (!transcript || rangeStart === null || rangeEnd === null) return [];
        return transcript.cues.filter(
            (cue) => cue.startSeconds < rangeEnd && cue.endSeconds > rangeStart
        );
    }, [transcript, rangeStart, rangeEnd]);

    const previewText = useMemo(
        () => previewCues.map((c) => c.text.trim()).join(" "),
        [previewCues]
    );

    const canInsert = startSeconds !== null && endSeconds !== null && previewCues.length > 0;
    const currentTimeLabel = formatPlaybackTime(videoCurrentTime);

    return (
        <div className="absolute bottom-2 left-2 right-2 z-20 overflow-hidden rounded-[14px] border border-white/15 bg-slate-950/55 p-3 shadow-[0_22px_60px_-28px_rgba(2,6,23,0.72)] backdrop-blur-xl">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Transcript Quote — {variant === "original" ? "Original" : "Turkish"}
            </div>

            <div className="mb-2 space-y-1.5">
                <div className="flex items-center gap-2">
                    <span className="w-8 shrink-0 text-right text-[12px] text-white/50">From</span>
                    <div className="flex h-7 flex-1 items-center rounded-[8px] bg-white/8 px-2.5 text-[13px] tabular-nums text-white">
                        {startSeconds !== null ? formatPlaybackTime(startSeconds) : "—"}
                    </div>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); onSetStart(); }}
                        className="flex h-7 shrink-0 items-center rounded-[8px] bg-white/10 px-2.5 text-[12px] font-medium text-white/80 transition hover:bg-white/18 hover:text-white"
                    >
                        Set {currentTimeLabel}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-8 shrink-0 text-right text-[12px] text-white/50">To</span>
                    <div className="flex h-7 flex-1 items-center rounded-[8px] bg-white/8 px-2.5 text-[13px] tabular-nums text-white">
                        {endSeconds !== null ? formatPlaybackTime(endSeconds) : "—"}
                    </div>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); onSetEnd(); }}
                        className="flex h-7 shrink-0 items-center rounded-[8px] bg-white/10 px-2.5 text-[12px] font-medium text-white/80 transition hover:bg-white/18 hover:text-white"
                    >
                        Set {currentTimeLabel}
                    </button>
                </div>
            </div>

            {previewCues.length > 0 ? (
                <div className="mb-2.5 rounded-[8px] bg-white/6 px-2.5 py-2">
                    <span className="text-[11px] text-white/40">
                        {previewCues.length} cue{previewCues.length > 1 ? "s" : ""} ·{" "}
                    </span>
                    <span className="text-[12px] leading-5 text-white/70">
                        {previewText.length > 120 ? `${previewText.slice(0, 120)}…` : previewText}
                    </span>
                </div>
            ) : startSeconds !== null && endSeconds !== null ? (
                <div className="mb-2.5 rounded-[8px] bg-white/6 px-2.5 py-2 text-[12px] text-white/40">
                    No transcript cues in this range.
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
                    className="flex h-7 items-center rounded-[8px] px-2.5 text-[12px] text-white/50 transition hover:text-white/80"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={!canInsert}
                    onMouseDown={(e) => { e.preventDefault(); if (canInsert) onInsert(); }}
                    className="flex h-7 items-center rounded-[8px] bg-white/15 px-3 text-[12px] font-medium text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Insert Quote
                </button>
            </div>
        </div>
    );
}
