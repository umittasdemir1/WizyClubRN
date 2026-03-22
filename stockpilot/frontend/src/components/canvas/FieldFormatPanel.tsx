import { createPortal } from "react-dom";
import { ChevronsUpDown, RotateCcw, X } from "lucide-react";
import {
    type ColumnOverride,
    type CustomMetricFormat,
} from "./canvasModel";
import type { ColumnMeta } from "../../types/stock";

// ── CellSelect ────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";

function CellSelect<T extends string>({
    value,
    options,
    onChange
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find((o) => o.value === value);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex items-center gap-1 rounded-[5px] pl-0 pr-2 py-0.5 text-[0.8rem] text-slate-600 transition hover:bg-slate-100"
            >
                <span>{current?.label ?? value}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" strokeWidth={1.8} />
            </button>
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[110px] overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_8px_24px_-8px_rgba(11,14,20,0.18)]">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[0.8rem] transition hover:bg-slate-50 ${opt.value === value ? "text-ink font-medium" : "text-slate-600"}`}
                        >
                            {opt.label}
                            {opt.value === value && <Check className="h-3 w-3 text-brand" strokeWidth={2.5} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FieldFormatPanelProps {
    columns: ColumnMeta[];
    columnOverrides: Record<string, ColumnOverride>;
    updateColumnOverride: (key: string, override: ColumnOverride | null) => void;
    pendingOverrides: Record<string, { label: string; typeOverride?: "text" | "numeric" | "date"; format: CustomMetricFormat }>;
    savedRows: Set<string>;
    fieldEditorSort: { key: "field" | "label" | "type" | "format"; direction: "asc" | "desc" } | null;
    sortedColumns: ColumnMeta[];
    onClose: () => void;
    onToggleSort: (key: "field" | "label" | "type" | "format") => void;
    onUpdatePending: (key: string, col: ColumnMeta, patch: Partial<{ label: string; typeOverride: "text" | "numeric" | "date"; format: CustomMetricFormat }>) => void;
    onSaveRow: (key: string) => void;
    onResetRow: (key: string) => void;
    onResetAll: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FieldFormatPanel({
    columns,
    columnOverrides,
    pendingOverrides,
    savedRows,
    fieldEditorSort,
    sortedColumns,
    onClose,
    onToggleSort,
    onUpdatePending,
    onSaveRow,
    onResetRow,
    onResetAll,
}: FieldFormatPanelProps) {
    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-8"
            onMouseDown={onClose}
        >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div
                className="relative z-10 flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_24px_64px_-16px_rgba(11,14,20,0.22)]"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pb-4 pt-5">
                    <div className="px-1">
                        <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            {columns.length} Fields
                        </p>
                        <h2 className="mt-1 font-display text-[1.35rem] font-light leading-[1.15] tracking-tight text-ink">
                            Field editor
                        </h2>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        {Object.keys(columnOverrides).length > 0 && (
                            <button
                                type="button"
                                onClick={onResetAll}
                                className="text-[0.78rem] text-slate-400 transition hover:text-red-400"
                            >
                                Reset all
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[6px] p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                        >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto border-t border-slate-100">
                    <table className="w-full border-collapse table-fixed">
                        <colgroup>
                            <col className="w-[160px]" />
                            <col />
                            <col className="w-[110px]" />
                            <col className="w-[120px]" />
                            <col className="w-[72px]" />
                        </colgroup>
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-slate-100">
                                {(["field", "label", "type", "format"] as const).map((key, i) => (
                                    <th key={key} className={`${i === 0 ? "px-6" : "px-4"} py-2 text-left`}>
                                        <button
                                            type="button"
                                            onClick={() => onToggleSort(key)}
                                            className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] transition ${fieldEditorSort?.key === key ? "text-slate-600" : "text-slate-400 hover:text-slate-500"}`}
                                        >
                                            {key === "field" ? "Field" : key === "label" ? "Display name" : key === "type" ? "Type" : "Format"}
                                            <ChevronsUpDown className="h-2.5 w-2.5 shrink-0" />
                                        </button>
                                    </th>
                                ))}
                                <th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedColumns.map((col) => {
                                const pending = pendingOverrides[col.key];
                                const committed = columnOverrides[col.key];
                                const effectiveLabel = pending?.label ?? committed?.label ?? col.label;
                                const effectiveType = (pending?.typeOverride ?? committed?.typeOverride ?? col.type) as "text" | "numeric" | "date";
                                const effectiveFormat = (pending?.format ?? committed?.format ?? "integer") as CustomMetricFormat;
                                const isDirty = !!pending;
                                const isModified = !!committed;
                                const isSaved = savedRows.has(col.key);

                                return (
                                    <tr key={col.key} className="border-b border-slate-100/80 transition-colors hover:bg-slate-50">
                                        {/* Original field key */}
                                        <td className="px-6 py-2 align-middle">
                                            <span className="block truncate font-mono text-[0.75rem] text-slate-400">{col.key}</span>
                                        </td>

                                        {/* Display name */}
                                        <td className="px-4 py-2 align-middle">
                                            <input
                                                className="w-full bg-transparent text-[0.84rem] text-ink outline-none placeholder:text-slate-300"
                                                value={effectiveLabel}
                                                placeholder={col.label}
                                                onChange={(e) => onUpdatePending(col.key, col, { label: e.target.value || col.label })}
                                            />
                                        </td>

                                        {/* Type */}
                                        <td className="px-4 py-2 align-middle">
                                            <CellSelect<"text" | "numeric" | "date">
                                                value={effectiveType}
                                                options={[
                                                    { value: "text", label: "Text" },
                                                    { value: "numeric", label: "Number" },
                                                    { value: "date", label: "Date" }
                                                ]}
                                                onChange={(t) => onUpdatePending(col.key, col, { typeOverride: t })}
                                            />
                                        </td>

                                        {/* Format */}
                                        <td className="px-4 py-2 align-middle">
                                            {effectiveType === "numeric" ? (
                                                <CellSelect<CustomMetricFormat>
                                                    value={effectiveFormat}
                                                    options={[
                                                        { value: "integer", label: "Integer" },
                                                        { value: "decimal", label: "Decimal" },
                                                        { value: "percent", label: "Percent" },
                                                        { value: "currency", label: "Currency" },
                                                        { value: "multiplier", label: "Multiplier" }
                                                    ]}
                                                    onChange={(fmt) => onUpdatePending(col.key, col, { format: fmt })}
                                                />
                                            ) : (
                                                <span className="text-[0.8rem] text-slate-300">—</span>
                                            )}
                                        </td>

                                        {/* Save / Saved / Reset */}
                                        <td className="px-3 py-2 align-middle">
                                            {isSaved ? (
                                                <span className="text-[0.72rem] font-medium text-emerald-500">Saved</span>
                                            ) : isDirty ? (
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => onSaveRow(col.key)}
                                                    className="rounded-full bg-ink px-2.5 py-0.5 text-[0.72rem] font-medium text-white transition hover:bg-slate-700"
                                                >
                                                    Save
                                                </button>
                                            ) : isModified ? (
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => onResetRow(col.key)}
                                                    className="text-slate-300 transition hover:text-red-400"
                                                    title="Reset"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>,
        document.body
    );
}
