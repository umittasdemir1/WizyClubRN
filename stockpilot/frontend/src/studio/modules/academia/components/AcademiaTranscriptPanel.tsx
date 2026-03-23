import type { AcademiaTranscriptResult } from "../../../../types/academia";
import { splitTranscriptWordText } from "../utils";

export type AcademiaTranscriptLanguageView = "source" | "tr";

interface Props {
    transcript: AcademiaTranscriptResult | null;
    transcriptViewportRef: React.RefObject<HTMLDivElement>;
    cueItemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    isTranscriptScrollbarActive: boolean;
    activePlaybackCueIndex: number;
    activePlaybackWordIndex: number;
    onScrollbarActivate: () => void;
    onScrollbarDeactivate: () => void;
    canTranslateToTurkish: boolean;
    selectedTranscriptLanguage: AcademiaTranscriptLanguageView;
    onTranscriptLanguageChange: (language: AcademiaTranscriptLanguageView) => void;
    isTranslationLoading: boolean;
    translationError: string;
}

export function AcademiaTranscriptPanel({
    transcript,
    transcriptViewportRef,
    cueItemRefs,
    isTranscriptScrollbarActive,
    activePlaybackCueIndex,
    activePlaybackWordIndex,
    onScrollbarActivate,
    onScrollbarDeactivate,
    canTranslateToTurkish,
    selectedTranscriptLanguage,
    onTranscriptLanguageChange,
    isTranslationLoading,
    translationError,
}: Props) {
    return (
        <>
            {canTranslateToTurkish ? (
                <div className="border-b border-slate-100 px-6 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex rounded-full bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => onTranscriptLanguageChange("source")}
                                className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                                    selectedTranscriptLanguage === "source"
                                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
                                        : "text-slate-500"
                                }`}
                            >
                                Original
                            </button>
                            <button
                                type="button"
                                onClick={() => onTranscriptLanguageChange("tr")}
                                className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                                    selectedTranscriptLanguage === "tr"
                                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
                                        : "text-slate-500"
                                }`}
                            >
                                Turkish
                            </button>
                        </div>
                        {selectedTranscriptLanguage === "tr" && isTranslationLoading ? (
                            <span className="text-[12px] text-slate-400">Translating…</span>
                        ) : null}
                    </div>
                    {selectedTranscriptLanguage === "tr" && translationError ? (
                        <p className="mt-2 text-[12px] text-rose-500">{translationError}</p>
                    ) : null}
                </div>
            ) : null}
            <div
                ref={transcriptViewportRef}
                className={`min-h-[320px] h-full overflow-y-auto overflow-x-hidden px-6 pb-5 ${canTranslateToTurkish ? "pt-3" : "pt-3"} academia-scrollbar ${
                    isTranscriptScrollbarActive
                        ? "academia-scrollbar-active"
                        : "academia-scrollbar-idle"
                }`}
                onMouseEnter={onScrollbarActivate}
                onMouseMove={onScrollbarActivate}
                onWheel={onScrollbarActivate}
                onTouchStart={onScrollbarActivate}
                onMouseLeave={onScrollbarDeactivate}
            >
                {transcript?.cues.length ? (
                    <div className="space-y-0.5 text-left">
                        {transcript.cues.map((cue, cueIndex) => {
                            const isActiveCue = cueIndex === activePlaybackCueIndex;
                            const activeCueWordIndex = isActiveCue ? activePlaybackWordIndex : -1;

                            return (
                                <div
                                    key={`${cue.startSeconds}-${cueIndex}`}
                                    ref={(node) => {
                                        if (node) {
                                            cueItemRefs.current.set(cueIndex, node);
                                            return;
                                        }
                                        cueItemRefs.current.delete(cueIndex);
                                    }}
                                    className={`origin-left whitespace-normal break-normal py-px text-left text-[17px] leading-7 transition-[color,transform] duration-200 transform-gpu ${
                                        isActiveCue
                                            ? "scale-[1.08] font-normal text-slate-950"
                                            : "scale-100 font-light text-slate-400"
                                    }`}
                                >
                                    {cue.words.length > 0
                                        ? cue.words.map((word, wordIndex) => {
                                              const { leadingSpace, content } = splitTranscriptWordText(
                                                  word.text
                                              );
                                              return (
                                                  <span key={`${cue.startSeconds}-${wordIndex}`}>
                                                      {leadingSpace ? " " : null}
                                                      <span
                                                          className={`transition-colors duration-150 ${
                                                              wordIndex === activeCueWordIndex
                                                                  ? "text-amber-500"
                                                                  : isActiveCue
                                                                    ? "text-slate-950"
                                                                    : "text-slate-400"
                                                          }`}
                                                      >
                                                          {content}
                                                      </span>
                                                  </span>
                                              );
                                          })
                                        : cue.text}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full" />
                )}
            </div>
        </>
    );
}
