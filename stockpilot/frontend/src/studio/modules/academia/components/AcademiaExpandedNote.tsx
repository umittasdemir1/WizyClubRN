import { X } from "lucide-react";
import type { AcademiaNote } from "../types";
import { formatPlaybackTime, formatTurkeyNoteTimestamp } from "../utils";

interface Props {
    note: AcademiaNote;
    onClose: () => void;
    onSeekToTime: (seconds: number) => void;
}

export function AcademiaExpandedNote({ note, onClose, onSeekToTime }: Props) {
    return (
        <div
            className="absolute inset-0 z-30 bg-[rgba(255,255,255,0.98)] backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="flex h-full flex-col"
                onClick={(event) => event.stopPropagation()}
                style={{ fontFamily: "Poppins, sans-serif" }}
            >
                {/* Screenshot header */}
                <div className="relative overflow-hidden bg-slate-950 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.55)]">
                    <img
                        src={note.screenshotDataUrl}
                        alt={`Captured at ${formatPlaybackTime(note.capturedAtSeconds)}`}
                        className="h-auto max-h-[300px] w-full object-contain"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.72)_100%)]" />
                    <button
                        type="button"
                        onClick={() => onSeekToTime(note.capturedAtSeconds)}
                        className="absolute bottom-4 left-4 text-[13px] font-medium tracking-[0.04em] text-white transition hover:text-white/80"
                    >
                        {formatPlaybackTime(note.capturedAtSeconds)}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-md transition hover:bg-white/24"
                        aria-label="Close note preview"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Note body */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pr-6">
                    <div
                        className="mb-4 text-right text-[11px] font-light leading-4 text-slate-400"
                    >
                        {formatTurkeyNoteTimestamp(note.savedAt ?? note.createdAt)}
                    </div>
                    {note.text.trim() ? (
                        <p className="whitespace-pre-wrap text-[14px] leading-6 text-slate-700">
                            {note.text}
                        </p>
                    ) : (
                        <p className="text-[14px] leading-6 text-slate-400">No note text.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
