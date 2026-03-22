import { ArrowUp, X } from "lucide-react";
import type { AcademiaComposerVisualDraft } from "../types";
import { formatPlaybackTime } from "../utils";

interface Props {
    sidebarMessageDraft: string;
    composerVisualDraft: AcademiaComposerVisualDraft | null;
    canSubmitSidebarNote: boolean;
    onDraftChange: (value: string) => void;
    onClearVisualDraft: () => void;
    onSubmit: () => void;
}

export function AcademiaNoteComposer({
    sidebarMessageDraft,
    composerVisualDraft,
    canSubmitSidebarNote,
    onDraftChange,
    onClearVisualDraft,
    onSubmit,
}: Props) {
    return (
        <div className="shrink-0 bg-white/96 px-6 py-5">
            <div className="rounded-[12px] border border-slate-200 bg-slate-50/88 px-4 py-5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
                <div className="relative">
                    <div className="flex items-start gap-3">
                        {/* Screenshot preview thumbnail */}
                        {composerVisualDraft ? (
                            <div className="relative -ml-[10px] -mt-[15px] h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[12px] border border-slate-200 bg-slate-200">
                                <img
                                    src={composerVisualDraft.screenshotDataUrl}
                                    alt={`Draft capture at ${formatPlaybackTime(composerVisualDraft.capturedAtSeconds)}`}
                                    className="h-full w-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={onClearVisualDraft}
                                    className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(15,23,42,0.72)] text-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.72)] transition hover:bg-[rgba(15,23,42,0.88)]"
                                    aria-label="Clear draft preview"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        ) : null}

                        {/* Text input */}
                        <textarea
                            value={sidebarMessageDraft}
                            onChange={(event) => onDraftChange(event.target.value)}
                            placeholder="Start taking notes..."
                            rows={4}
                            className={`academia-scrollbar min-h-[96px] max-h-[180px] w-full resize-none border-none bg-transparent pb-0 pt-0 text-[14px] leading-6 text-slate-700 outline-none placeholder:font-light placeholder:text-slate-400 ${
                                composerVisualDraft ? "pl-0 pr-12" : "pl-2 pr-12"
                            }`}
                        />
                    </div>

                    {/* Submit button */}
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!canSubmitSidebarNote}
                        className="absolute -bottom-[15px] -right-[10px] inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-900 text-white shadow-[0_16px_34px_-22px_rgba(15,23,42,0.46)] transition"
                        aria-label="Save drafted note"
                    >
                        <ArrowUp className="h-5 w-5" strokeWidth={2.8} />
                    </button>
                </div>
            </div>
        </div>
    );
}
