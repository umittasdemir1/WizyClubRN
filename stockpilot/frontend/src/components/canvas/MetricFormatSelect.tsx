import { useEffect, useRef, useState } from "react";
import { ChevronDown, Type, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

function toTitleCase(str: string) {
    return str
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .replace(/\(\)/g, "");
}

const TRIGGER_BTN_CLS = "inline-flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-all duration-200 focus:outline-none";
const PANEL_CLS = "absolute right-0 top-full z-[100] mt-1.5 min-w-[170px] overflow-hidden rounded-[14px] border border-slate-200/60 bg-white/95 p-1 shadow-[0_12px_36px_-12px_rgba(11,14,20,0.28)] backdrop-blur-md";
const ITEM_BTN_CLS = "group flex w-full items-center justify-between rounded-[8px] px-2 py-1.5 text-left transition hover:bg-slate-50 hover:text-ink text-slate-600";
const TEXT_STYLE = "text-[0.74rem] font-medium";

function Badge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <div className="absolute -right-1 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 shadow-sm ring-1 ring-[#f1f5f9]">
            <span className="block text-[0.52rem] font-bold text-white leading-none translate-y-px">
                {count}
            </span>
        </div>
    );
}

function useOutsideClose(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onClose]);
}

const DropdownWrapper = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={PANEL_CLS}
            >
                {children}
            </motion.div>
        )}
    </AnimatePresence>
);

// ─── Format Select ────────────────────────────────────────────────────────────
export function MetricFormatSelect({ value, onChange }: { value: CustomMetricFormat; onChange: (f: CustomMetricFormat) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClose(ref, () => setOpen(false));

    // Badge logic for format: show "1" if not default (integer)
    const count = value !== "integer" ? 1 : 0;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`${TRIGGER_BTN_CLS} ${open ? "bg-slate-200 text-brand" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-ink"}`}
            >
                <Type className="h-4 w-4" strokeWidth={2.5} />
                <Badge count={count} />
            </button>
            <DropdownWrapper isOpen={open}>
                <div className="space-y-0.5">
                    {FORMAT_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`${ITEM_BTN_CLS} ${opt.value === value ? "bg-slate-50 text-brand" : ""}`}
                        >
                            <span className={TEXT_STYLE}>{opt.label}</span>
                            <span className="font-mono text-[0.68rem] opacity-40">{opt.example}</span>
                        </button>
                    ))}
                </div>
            </DropdownWrapper>
        </div>
    );
}

// ─── Date Dropdown ───────────────────────────────────────────────────────────
export function MetricDateDropdown({ onSelect, count = 0 }: { onSelect: (fn: DateConstantFn) => void; count?: number }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClose(ref, () => setOpen(false));

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`${TRIGGER_BTN_CLS} ${open ? "bg-slate-200 text-brand" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-ink"}`}
            >
                <Calendar className="h-4 w-4" strokeWidth={2.5} />
                <Badge count={count} />
            </button>
            <DropdownWrapper isOpen={open}>
                <div className="space-y-0.5">
                    {(Object.keys(DATE_CONSTANT_LABELS) as DateConstantFn[]).map((fn) => (
                        <button
                            key={fn}
                            type="button"
                            onClick={() => { onSelect(fn); setOpen(false); }}
                            className={ITEM_BTN_CLS}
                        >
                            <span className={TEXT_STYLE}>{toTitleCase(DATE_CONSTANT_LABELS[fn])}</span>
                        </button>
                    ))}
                </div>
            </DropdownWrapper>
        </div>
    );
}

// ─── Function Dropdown ────────────────────────────────────────────────────────
export function MetricFunctionDropdown({ onSelect, count = 0 }: { onSelect: (fn: MetricFunctionName) => void; count?: number }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClose(ref, () => setOpen(false));

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`${TRIGGER_BTN_CLS} ${open ? "bg-slate-200 text-brand" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-ink"}`}
            >
                <div className="flex items-center font-serif italic leading-none">
                    <span className="text-[1.2rem]" style={{ transform: "translateY(-1px)" }}>ƒ</span>
                    <span className="text-[0.95rem] -ml-0.5" style={{ transform: "translateY(1px)" }}>x</span>
                </div>
                <Badge count={count} />
            </button>
            <DropdownWrapper isOpen={open}>
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-0.5">
                        {FUNCTION_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onSelect(opt.value); setOpen(false); }}
                                className={ITEM_BTN_CLS}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="font-serif text-[0.85rem] italic text-brand">ƒ</span>
                                    <span className={TEXT_STYLE}>{toTitleCase(opt.value)}</span>
                                </div>
                                <span className="text-[0.6rem] text-slate-400">{opt.arity} arg</span>
                            </button>
                        ))}
                    </div>
                </div>
            </DropdownWrapper>
            <style sx-only>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
