import { ArrowUp } from "lucide-react";

interface Props {
    summaryDraft: string;
    canSubmitSummary: boolean;
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
}

export function AcademiaSummaryPanel({ summaryDraft, canSubmitSummary, onDraftChange, onSubmit }: Props) {
    return (
        <div className="shrink-0 bg-white/96 px-6 py-5">
            <div className="rounded-[12px] border border-slate-200 bg-slate-50/88 px-4 py-5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
                <div className="relative">
                    <textarea
                        value={summaryDraft}
                        onChange={(event) => onDraftChange(event.target.value)}
                        rows={4}
                        className="academia-scrollbar min-h-[96px] max-h-[180px] w-full resize-none border-none bg-transparent pb-0 pt-0 pl-2 pr-12 text-[14px] leading-6 text-slate-700 outline-none"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                        placeholder="Write your summary…"
                    />
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!canSubmitSummary}
                        className="absolute -bottom-[15px] -right-[10px] inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-900 text-white shadow-[0_16px_34px_-22px_rgba(15,23,42,0.46)] transition"
                        aria-label="Save summary"
                    >
                        <ArrowUp className="h-5 w-5" strokeWidth={2.8} />
                    </button>
                </div>
            </div>
        </div>
    );
}
