import { cn } from "../../../../lib/utils";

interface AuditProgressBarProps {
    value: number;
    label?: string;
    valueLabel?: string;
    toneClassName?: string;
    className?: string;
}

export function AuditProgressBar({
    value,
    label,
    valueLabel,
    toneClassName = "bg-brand",
    className,
}: AuditProgressBarProps) {
    const normalizedValue = Math.max(0, Math.min(100, value));

    return (
        <div className={cn("space-y-2", className)}>
            {(label || valueLabel) ? (
                <div className="flex items-center justify-between gap-3 text-[12px] font-medium text-slate-500">
                    <span>{label}</span>
                    <span>{valueLabel ?? `%${normalizedValue}`}</span>
                </div>
            ) : null}
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={cn("h-full rounded-full transition-all duration-300", toneClassName)}
                    style={{ width: `${normalizedValue}%` }}
                />
            </div>
        </div>
    );
}
