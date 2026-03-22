import { ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import type { AcademiaNote } from "../types";
import { formatPlaybackTime, formatTurkeyNoteTimestamp } from "../utils";

interface Props {
    visualNotes: AcademiaNote[];
    writtenNotes: AcademiaNote[];
    notesViewportRef: React.RefObject<HTMLDivElement>;
    visualNotesRailRef: React.RefObject<HTMLDivElement>;
    isTranscriptScrollbarActive: boolean;
    onScrollbarActivate: () => void;
    onScrollbarDeactivate: () => void;
    onScrollVisualNotes: (direction: "left" | "right") => void;
    onSeekToTime: (seconds: number) => void;
    onOpenNote: (noteId: string) => void;
}

export function AcademiaNotesPanel({
    visualNotes,
    writtenNotes,
    notesViewportRef,
    visualNotesRailRef,
    isTranscriptScrollbarActive,
    onScrollbarActivate,
    onScrollbarDeactivate,
    onScrollVisualNotes,
    onSeekToTime,
    onOpenNote,
}: Props) {
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
                {/* Visual notes rail */}
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
                                    className="academia-scrollbar academia-scrollbar-no-gutter flex flex-nowrap items-start gap-1.5 overflow-x-auto overflow-y-hidden scroll-smooth"
                                >
                                    {visualNotes.map((note) => (
                                        <article
                                            key={note.id}
                                            className="w-[68px] shrink-0 overflow-hidden rounded-[12px]"
                                        >
                                            <div className="group/note-preview relative h-[68px] w-[68px] overflow-hidden rounded-[12px] border border-slate-200 bg-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => onSeekToTime(note.capturedAtSeconds)}
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
                                                    onClick={() => onOpenNote(note.id)}
                                                    className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(15,23,42,0.82)] text-white opacity-0 transition duration-200 group-hover/note-preview:opacity-100 hover:bg-[rgba(15,23,42,0.92)]"
                                                    aria-label="Expand note"
                                                >
                                                    <Maximize className="h-3 w-3" strokeWidth={2.15} />
                                                </button>
                                            </div>
                                        </article>
                                    ))}
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

                {/* Written notes list */}
                <section className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Typewriter
                    </h3>
                    {writtenNotes.length > 0 ? (
                        <div className="space-y-1.5">
                            {writtenNotes.map((note) => (
                                <article
                                    key={`written-${note.id}`}
                                    className="flex items-start justify-between gap-4 px-1 py-0"
                                >
                                    <p
                                        className="min-w-0 flex-1 whitespace-pre-wrap text-[13px] leading-5 text-slate-700"
                                        style={{ fontFamily: "Poppins, sans-serif" }}
                                    >
                                        {note.text}
                                    </p>
                                    <time
                                        dateTime={note.savedAt ?? note.createdAt}
                                        className="shrink-0 pt-0.5 text-[11px] font-light leading-4 text-slate-400"
                                        style={{ fontFamily: "Poppins, sans-serif" }}
                                    >
                                        {formatTurkeyNoteTimestamp(note.savedAt ?? note.createdAt)}
                                    </time>
                                </article>
                            ))}
                        </div>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
