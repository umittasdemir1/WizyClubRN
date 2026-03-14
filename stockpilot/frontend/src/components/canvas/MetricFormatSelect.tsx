import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CustomMetricFormat, DateConstantFn, MetricFunctionName } from "./canvasModel";
import { DATE_CONSTANT_LABELS, METRIC_FUNCTION_ARITY } from "./canvasModel";

const FORMAT_OPTIONS: { value: CustomMetricFormat; label: string; example: string }[] = [
    { value: "integer",    label: "Integer",    example: "3,247"    },
    { value: "decimal",    label: "Decimal",    example: "3,247.50" },
    { value: "percent",    label: "Percent",    example: "25.3%"    },
    { value: "currency",   label: "Currency",   example: "₺3,247"   },
    { value: "multiplier", label: "Multiplier", example: "2.5x"     },
    { value: "datetime",   label: "Date Time",  example: "14.03.2026" }
];

const FUNCTION_OPTIONS = (Object.keys(METRIC_FUNCTION_ARITY) as MetricFunctionName[]).map((fn) => ({
    value: fn,
    arity: METRIC_FUNCTION_ARITY[fn]
}));

// Shared trigger button style — matches operator buttons
const TRIGGER_CLS =
    "inline-flex h-[26px] items-center gap-1 rounded-[8px] bg-slate-100 px-2 text-[0.78rem] font-semibold leading-none text-slate-500 transition hover:bg-slate-200 hover:text-ink";

// Shared dropdown panel style
const PANEL_CLS =
    "absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-[10px] border border-slate-200/80 bg-white shadow-[0_8px_24px_-8px_rgba(11,14,20,0.18)]";

// Shared dropdown item style
const ITEM_CLS =
    "flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left transition hover:bg-slate-50";

function useOutsideClose(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onClose]);
}

// ─── Format ──────────────────────────────────────────────────────────────────

interface MetricFormatSelectProps {
    value: CustomMetricFormat;
    onChange: (format: CustomMetricFormat) => void;
}

export function MetricFormatSelect({ value, onChange }: MetricFormatSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClose(ref, () => setOpen(false));

    const current = FORMAT_OPTIONS.find((o) => o.value === value) ?? FORMAT_OPTIONS[0];

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen((v) => !v)}
                className={TRIGGER_CLS}
            >
                <span>{current.label}</span>
                <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>

            {open ? (
                <div className={PANEL_CLS}>
                    {FORMAT_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`${ITEM_CLS} ${opt.value === value ? "text-ink" : "text-slate-500"}`}
                        >
                            <span className="text-[0.78rem] font-semibold">{opt.label}</span>
                            <span className="font-mono text-[0.72rem] text-slate-400">{opt.example}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

// ─── Date constants ───────────────────────────────────────────────────────────

interface MetricDateDropdownProps {
    onSelect: (fn: DateConstantFn) => void;
}

export function MetricDateDropdown({ onSelect }: MetricDateDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClose(ref, () => setOpen(false));

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen((v) => !v)}
                className={TRIGGER_CLS}
            >
                <span>date</span>
                <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>

            {open ? (
                <div className={PANEL_CLS}>
                    {(Object.keys(DATE_CONSTANT_LABELS) as DateConstantFn[]).map((fn) => (
                        <button
                            key={fn}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { onSelect(fn); setOpen(false); }}
                            className={`${ITEM_CLS} text-slate-500`}
                        >
                            <span className="font-mono text-[0.78rem] font-semibold">{DATE_CONSTANT_LABELS[fn]}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

// ─── Functions ────────────────────────────────────────────────────────────────

interface MetricFunctionDropdownProps {
    onSelect: (fn: MetricFunctionName) => void;
}

export function MetricFunctionDropdown({ onSelect }: MetricFunctionDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClose(ref, () => setOpen(false));

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen((v) => !v)}
                className={TRIGGER_CLS}
            >
                <span>fn(</span>
                <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>

            {open ? (
                <div className={PANEL_CLS}>
                    {FUNCTION_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { onSelect(opt.value); setOpen(false); }}
                            className={`${ITEM_CLS} text-slate-500`}
                        >
                            <span className="font-mono text-[0.78rem] font-semibold">{opt.value}(</span>
                            <span className="text-[0.72rem] text-slate-400">{opt.arity} arg</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
