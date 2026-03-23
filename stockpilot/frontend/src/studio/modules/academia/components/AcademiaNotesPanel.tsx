import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import type { AcademiaNote, AcademiaNoteColorToken } from "../types";
import { formatPlaybackTime, formatTurkeyNoteTimestamp, parseTimestampToSeconds, splitTextWithTimestamps } from "../utils";

function splitPinnedNoteText(value: string): { time: string; rest: string } {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d+:\d{2}(?::\d{2})?)(.*)$/s);

    if (!match) {
        return { time: trimmed, rest: "" };
    }

    return {
        time: match[1],
        rest: match[2].trim(),
    };
}

type NoteColorOption = {
    token: AcademiaNoteColorToken;
    dotClassName: string;
    surfaceClassName: string;
    label: string;
};

const NOTE_COLOR_OPTIONS: NoteColorOption[] = [
    {
        token: "slate",
        label: "Slate",
        dotClassName: "bg-slate-300",
        surfaceClassName: "bg-slate-50",
    },
    {
        token: "rose",
        label: "Rose",
        dotClassName: "bg-rose-300",
        surfaceClassName: "bg-rose-50",
    },
    {
        token: "amber",
        label: "Amber",
        dotClassName: "bg-amber-300",
        surfaceClassName: "bg-amber-50",
    },
    {
        token: "orange",
        label: "Orange",
        dotClassName: "bg-orange-300",
        surfaceClassName: "bg-orange-50",
    },
    {
        token: "emerald",
        label: "Emerald",
        dotClassName: "bg-emerald-300",
        surfaceClassName: "bg-emerald-50",
    },
    {
        token: "teal",
        label: "Teal",
        dotClassName: "bg-teal-300",
        surfaceClassName: "bg-teal-50",
    },
    {
        token: "sky",
        label: "Sky",
        dotClassName: "bg-sky-300",
        surfaceClassName: "bg-sky-50",
    },
    {
        token: "indigo",
        label: "Indigo",
        dotClassName: "bg-indigo-300",
        surfaceClassName: "bg-indigo-50",
    },
    {
        token: "violet",
        label: "Violet",
        dotClassName: "bg-violet-300",
        surfaceClassName: "bg-violet-50",
    },
    {
        token: "pink",
        label: "Pink",
        dotClassName: "bg-pink-300",
        surfaceClassName: "bg-pink-50",
    },
];

function getNoteColorOption(colorToken: AcademiaNoteColorToken): NoteColorOption {
    return NOTE_COLOR_OPTIONS.find((option) => option.token === colorToken) ?? NOTE_COLOR_OPTIONS[0];
}

function NoteColorPalette({
    activeToken,
    onSelect,
}: {
    activeToken: AcademiaNoteColorToken;
    onSelect: (colorToken: AcademiaNoteColorToken) => void;
}) {
    return (
        <div className="mt-3 flex flex-wrap gap-2">
            {NOTE_COLOR_OPTIONS.map((option) => {
                const isActive = option.token === activeToken;
                return (
                    <button
                        key={option.token}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onSelect(option.token);
                        }}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
                            isActive
                                ? "border-slate-900 bg-white shadow-[0_8px_20px_-16px_rgba(15,23,42,0.65)]"
                                : "border-white/70 bg-white/72 hover:border-slate-300"
                        }`}
                        aria-label={`Set note color to ${option.label}`}
                        title={option.label}
                    >
                        <span className={`h-4 w-4 rounded-full ${option.dotClassName}`} />
                    </button>
                );
            })}
        </div>
    );
}

interface Props {
    visualNotes: AcademiaNote[];
    pinnedNotes: AcademiaNote[];
    writtenNotes: AcademiaNote[];
    notesViewportRef: React.RefObject<HTMLDivElement>;
    visualNotesRailRef: React.RefObject<HTMLDivElement>;
    isTranscriptScrollbarActive: boolean;
    onScrollbarActivate: () => void;
    onScrollbarDeactivate: () => void;
    onScrollVisualNotes: (direction: "left" | "right") => void;
    onSeekToTime: (seconds: number) => void;
    onOpenNote: (noteId: string) => void;
    onDeletePinnedNote: (noteId: string) => void;
    onUpdateNoteColor: (noteId: string, colorToken: AcademiaNoteColorToken) => void;
}

export function AcademiaNotesPanel({
    visualNotes,
    pinnedNotes,
    writtenNotes,
    notesViewportRef,
    visualNotesRailRef,
    isTranscriptScrollbarActive,
    onScrollbarActivate,
    onScrollbarDeactivate,
    onScrollVisualNotes,
    onSeekToTime,
    onOpenNote,
    onDeletePinnedNote,
    onUpdateNoteColor,
}: Props) {
    const [activeColorNoteId, setActiveColorNoteId] = useState<string | null>(null);

    return (
        <div
            ref={notesViewportRef}
            className={`academia-scrollbar academia-scrollbar-no-gutter min-h-[320px] h-full overflow-y-auto overflow-x-hidden px-6 pt-3 pb-5 ${
                isTranscriptScrollbarActive ? "academia-scrollbar-active" : "academia-scrollbar-idle"
            }`}
            onMouseEnter={onScrollbarActivate}
            onMouseMove={onScrollbarActivate}
            onWheel={onScrollbarActivate}
            onTouchStart={onScrollbarActivate}
            onMouseLeave={onScrollbarDeactivate}
        >
            <div className="space-y-3">
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Visual Notes
                        </h3>
                    </div>
                    {visualNotes.length > 0 ? (
                        <div className="-mx-[19px] flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => onScrollVisualNotes("left")}
                                className="inline-flex h-[68px] w-5 shrink-0 items-center justify-center text-slate-400 transition hover:text-slate-700"
                                aria-label="Scroll visual notes left"
                            >
                                <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.3} />
                            </button>
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <div
                                    ref={visualNotesRailRef}
                                    className="academia-scrollbar academia-scrollbar-no-gutter flex flex-nowrap items-start gap-1.5 overflow-x-auto overflow-y-hidden scroll-smooth pb-1"
                                >
                                    {visualNotes.map((note) => {
                                        const isPaletteOpen = activeColorNoteId === note.id;

                                        return (
                                            <article key={note.id} className="w-[68px] shrink-0 overflow-visible">
                                                <div onClick={() => setActiveColorNoteId((current) => current === note.id ? null : note.id)}>
                                                    <div className="group/note-preview relative h-[68px] w-[68px] overflow-hidden rounded-[12px] border border-slate-200 bg-slate-200">
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onSeekToTime(note.capturedAtSeconds);
                                                            }}
                                                            className="block h-full w-full text-left"
                                                            aria-label={`Jump to ${formatPlaybackTime(note.capturedAtSeconds)}`}
                                                        >
                                                            <img
                                                                src={note.screenshotDataUrl}
                                                                alt={`Captured at ${formatPlaybackTime(note.capturedAtSeconds)}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </button>
                                                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_100%)] opacity-0 transition duration-200 group-hover/note-preview:opacity-100" />
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onOpenNote(note.id);
                                                            }}
                                                            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(15,23,42,0.82)] text-white opacity-0 transition duration-200 group-hover/note-preview:opacity-100 hover:bg-[rgba(15,23,42,0.92)]"
                                                            aria-label="Expand note"
                                                        >
                                                            <Maximize className="h-3 w-3" strokeWidth={2.15} />
                                                        </button>
                                                    </div>
                                                    {isPaletteOpen ? (
                                                        <NoteColorPalette
                                                            activeToken={note.colorToken}
                                                            onSelect={(colorToken) => onUpdateNoteColor(note.id, colorToken)}
                                                        />
                                                    ) : null}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onScrollVisualNotes("right")}
                                className="inline-flex h-[68px] w-5 shrink-0 items-center justify-center text-slate-400 transition hover:text-slate-700"
                                aria-label="Scroll visual notes right"
                            >
                                <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.3} />
                            </button>
                        </div>
                    ) : null}
                </section>

                <section className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Pinned
                    </h3>
                    {pinnedNotes.length > 0 ? (
                        <div className="space-y-2">
                            {pinnedNotes.map((note) => {
                                const pinnedText = splitPinnedNoteText(note.text);
                                const colorOption = getNoteColorOption(note.colorToken);
                                const isPaletteOpen = activeColorNoteId === note.id;

                                return (
                                    <article
                                        key={`pinned-${note.id}`}
                                        className={`rounded-[10px] px-3 py-3 transition ${colorOption.surfaceClassName}`}
                                        onClick={() => setActiveColorNoteId((current) => current === note.id ? null : note.id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div
                                                    className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left text-[13px] leading-5"
                                                    style={{ fontFamily: "Poppins, sans-serif" }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onSeekToTime(note.capturedAtSeconds);
                                                        }}
                                                        className="font-medium text-sky-600 transition hover:text-sky-700"
                                                    >
                                                        {pinnedText.time}
                                                    </button>
                                                    {pinnedText.rest ? (
                                                        <span className="text-slate-700">{pinnedText.rest}</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-start gap-2">
                                                <time
                                                    dateTime={note.savedAt ?? note.createdAt}
                                                    className="pt-0.5 text-[11px] font-light leading-4 text-slate-400"
                                                    style={{ fontFamily: "Poppins, sans-serif" }}
                                                >
                                                    {formatTurkeyNoteTimestamp(note.savedAt ?? note.createdAt)}
                                                </time>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onDeletePinnedNote(note.id);
                                                    }}
                                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/80 hover:text-slate-600"
                                                    aria-label="Delete pinned note"
                                                >
                                                    <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                                                </button>
                                            </div>
                                        </div>
                                        {isPaletteOpen ? (
                                            <NoteColorPalette
                                                activeToken={note.colorToken}
                                                onSelect={(colorToken) => onUpdateNoteColor(note.id, colorToken)}
                                            />
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
                </section>

                <section className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Typewriter
                    </h3>
                    {writtenNotes.length > 0 ? (
                        <div className="space-y-2">
                            {writtenNotes.map((note) => {
                                const colorOption = getNoteColorOption(note.colorToken);
                                const isPaletteOpen = activeColorNoteId === note.id;

                                return (
                                    <article
                                        key={`written-${note.id}`}
                                        className={`rounded-[10px] px-3 py-3 transition ${colorOption.surfaceClassName}`}
                                        onClick={() => setActiveColorNoteId((current) => current === note.id ? null : note.id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div
                                                className="min-w-0 flex-1 whitespace-pre-wrap text-[13px] leading-5 text-slate-700"
                                                style={{ fontFamily: "Poppins, sans-serif" }}
                                            >
                                                {splitTextWithTimestamps(note.text).map((segment, index) => {
                                                    if (!segment.isTimestamp) {
                                                        return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
                                                    }

                                                    const timestampSeconds = parseTimestampToSeconds(segment.text);
                                                    if (timestampSeconds === null) {
                                                        return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
                                                    }

                                                    return (
                                                        <button
                                                            key={`${segment.text}-${index}`}
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onSeekToTime(timestampSeconds);
                                                            }}
                                                            className="font-medium text-sky-600 transition hover:text-sky-700"
                                                        >
                                                            {segment.text}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex shrink-0 items-start gap-2">
                                                <time
                                                    dateTime={note.savedAt ?? note.createdAt}
                                                    className="pt-0.5 text-[11px] font-light leading-4 text-slate-400"
                                                    style={{ fontFamily: "Poppins, sans-serif" }}
                                                >
                                                    {formatTurkeyNoteTimestamp(note.savedAt ?? note.createdAt)}
                                                </time>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onDeletePinnedNote(note.id);
                                                    }}
                                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/80 hover:text-slate-600"
                                                    aria-label="Delete typewriter note"
                                                >
                                                    <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                                                </button>
                                            </div>
                                        </div>
                                        {isPaletteOpen ? (
                                            <NoteColorPalette
                                                activeToken={note.colorToken}
                                                onSelect={(colorToken) => onUpdateNoteColor(note.id, colorToken)}
                                            />
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
