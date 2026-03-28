interface AuditSectionHeaderProps {
    title: string;
    answered: number;
    total: number;
    yes: number;
    no: number;
    na: number;
}

export function AuditSectionHeader({ title, answered, total, yes, no, na }: AuditSectionHeaderProps) {
    const isComplete = answered === total && total > 0;

    return (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white px-4 py-3 sm:px-5">
            <h3 className="font-display text-[1.4rem] font-semibold tracking-tight text-ink sm:text-[1.65rem]">
                {title}
            </h3>

            <div className="flex shrink-0 items-center gap-2">
                {/* answered / total */}
                <span className={`text-[12px] font-semibold tabular-nums ${isComplete ? "text-emerald-600" : "text-slate-400"}`}>
                    {answered}/{total}
                </span>

                {/* yes / no / na pills — only show when at least one answer exists */}
                {(yes > 0 || no > 0 || na > 0) ? (
                    <div className="flex items-center gap-1">
                        {yes > 0 && (
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-700">
                                {yes}Y
                            </span>
                        )}
                        {no > 0 && (
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-100 px-1.5 text-[11px] font-semibold text-rose-700">
                                {no}N
                            </span>
                        )}
                        {na > 0 && (
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-700">
                                {na}–
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
