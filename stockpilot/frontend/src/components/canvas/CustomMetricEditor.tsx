import { motion } from "framer-motion";
import { Check, Delete } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type DragEvent, type RefObject } from "react";
import {
    DATE_CONSTANT_LABELS,
    PIVOT_FIELD_TEXT_TYPOGRAPHY,
    formatCustomMetricOperatorLabel,
    getFieldDefinition,
    isValidCustomMetricExpression,
    type CustomMetricBinaryOperator,
    type CustomMetricDefinition,
    type CustomMetricFormat,
    type CustomMetricExpressionToken,
    type CustomMetricParenthesis,
    type DateConstantFn,
    type MetricFunctionName,
} from "./canvasModel";
import { MetricDateDropdown, MetricFormatSelect, MetricFunctionDropdown } from "./MetricFormatSelect";
import type { ColumnMeta } from "../../types/stock";

// ── Operator buttons config ────────────────────────────────────────────────────

const CUSTOM_METRIC_OPERATOR_BUTTONS: Array<
    | { type: "binary"; value: CustomMetricBinaryOperator }
    | { type: "operator"; value: "%" }
    | { type: "parenthesis"; value: CustomMetricParenthesis }
> = [
    { type: "binary", value: "+" },
    { type: "binary", value: "-" },
    { type: "binary", value: "*" },
    { type: "binary", value: "/" },
    { type: "operator", value: "%" },
    { type: "binary", value: "=" },
    { type: "parenthesis", value: "(" },
    { type: "parenthesis", value: ")" },
    { type: "binary", value: ">" },
    { type: "binary", value: "<" }
];

// ── FormulaTokenChip ──────────────────────────────────────────────────────────

function FormulaTokenChip({
    token,
    columns,
    customMetrics
}: {
    token: CustomMetricExpressionToken;
    columns: ColumnMeta[];
    customMetrics: CustomMetricDefinition[];
}) {
    let label: string;
    if (token.type === "field") label = getFieldDefinition(token.fieldId, columns, customMetrics).label;
    else if (token.type === "operator") label = formatCustomMetricOperatorLabel(token.operator);
    else if (token.type === "constant") label = String(token.value);
    else if (token.type === "parenthesis") label = token.value;
    else if (token.type === "date-constant") label = DATE_CONSTANT_LABELS[token.fn];
    else if (token.type === "function") label = token.fn + "(";
    else if (token.type === "comma") label = ",";
    else label = "";

    const isSymbol = token.type === "operator" || token.type === "parenthesis" || token.type === "comma";

    return (
        <span
            className={`${PIVOT_FIELD_TEXT_TYPOGRAPHY} leading-none ${
                isSymbol ? "text-slate-400 font-bold" : "text-ink"
            }`}
        >
            {label}
        </span>
    );
}

// ── MetricNameInput ───────────────────────────────────────────────────────────

const TYPEWRITER_PLACEHOLDERS = ["Total Revenue", "Gross Margin", "Net Profit %", "YoY Growth", "Customer LTV", "Retention Rate"];

function MetricNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [placeholder, setPlaceholder] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (isFocused) return;
        let cancelled = false;
        let pIndex = 0;
        let charIndex = 0;
        let deleting = false;
        let timer: ReturnType<typeof setTimeout>;

        const tick = () => {
            if (cancelled) return;
            const full = TYPEWRITER_PLACEHOLDERS[pIndex];
            if (deleting) { setPlaceholder(full.substring(0, charIndex - 1)); charIndex--; }
            else { setPlaceholder(full.substring(0, charIndex + 1)); charIndex++; }
            let delay = deleting ? 60 : 120;
            if (!deleting && charIndex === full.length) { deleting = true; delay = 2000; }
            else if (deleting && charIndex === 0) { deleting = false; pIndex = (pIndex + 1) % TYPEWRITER_PLACEHOLDERS.length; delay = 500; }
            timer = setTimeout(tick, delay);
        };

        timer = setTimeout(tick, 500);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [isFocused]);

    return (
        <div className="rounded-[10px] border border-slate-200/70 bg-white/80 h-[36px] flex items-center shadow-sm">
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={`w-full appearance-none bg-transparent px-4 outline-none border-none ring-0 focus:ring-0 ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink !leading-none -translate-y-[2px] placeholder:text-slate-400`}
            />
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CustomMetricEditorProps {
    columns: ColumnMeta[];
    customMetrics: CustomMetricDefinition[];
    calculationName: string;
    calculationFormat: CustomMetricFormat;
    formulaTokens: CustomMetricExpressionToken[];
    isFormulaDropActive: boolean;
    builderError: string | null;
    manualInputValue: string;
    isInputFocused: boolean;
    manualInputRef: RefObject<HTMLInputElement>;
    canSave: boolean;
    setCalculationName: (name: string) => void;
    setCalculationFormat: (format: CustomMetricFormat) => void;
    setManualInputValue: (value: string) => void;
    setIsInputFocused: (focused: boolean) => void;
    setIsFormulaDropActive: (active: boolean) => void;
    onFormulaDrop: (event: DragEvent<HTMLDivElement>) => void;
    onDeleteLastToken: () => void;
    onSaveMetric: () => void;
    onAppendBinaryOperator: (operator: CustomMetricBinaryOperator) => void;
    onAppendPercent: () => void;
    onAppendParenthesis: (value: CustomMetricParenthesis) => void;
    onAppendComma: () => void;
    onCommitManualInput: () => void;
    onManualInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onAppendDateConstant: (fn: DateConstantFn) => void;
    onAppendFunction: (fn: MetricFunctionName) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomMetricEditor({
    columns,
    customMetrics,
    calculationName,
    calculationFormat,
    formulaTokens,
    isFormulaDropActive,
    builderError,
    manualInputValue,
    isInputFocused,
    manualInputRef,
    canSave,
    setCalculationName,
    setCalculationFormat,
    setManualInputValue,
    setIsInputFocused,
    setIsFormulaDropActive,
    onFormulaDrop,
    onDeleteLastToken,
    onSaveMetric,
    onAppendBinaryOperator,
    onAppendPercent,
    onAppendParenthesis,
    onAppendComma,
    onCommitManualInput,
    onManualInputKeyDown,
    onAppendDateConstant,
    onAppendFunction,
}: CustomMetricEditorProps) {
    return (
        <div className="rounded-[14px] border border-slate-200/70 bg-white/85 p-4 shadow-[0_18px_42px_-34px_rgba(11,14,20,0.24)]">
            <div className="flex min-h-full flex-col gap-3">
                <div className="flex flex-col gap-4 -mx-[10px]">
                    <div className="flex items-center justify-between gap-3 px-0 -mt-[10px]" onClick={(e) => e.stopPropagation()}>
                        <div className="min-w-0 flex-1">
                            <MetricNameInput value={calculationName} onChange={setCalculationName} />
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <MetricFormatSelect
                                value={calculationFormat}
                                onChange={setCalculationFormat}
                            />
                            <MetricDateDropdown
                                onSelect={(fn) => { onCommitManualInput(); onAppendDateConstant(fn); }}
                            />
                            <MetricFunctionDropdown
                                onSelect={(fn) => { onCommitManualInput(); onAppendFunction(fn); }}
                            />
                        </div>
                    </div>
                    <div
                        onDragOver={(event) => {
                            event.preventDefault();
                            setIsFormulaDropActive(true);
                        }}
                        onDragLeave={() => setIsFormulaDropActive(false)}
                        onDrop={onFormulaDrop}
                        onClick={() => manualInputRef.current?.focus()}
                        className={`relative min-h-[170px] rounded-[12px] border p-3 pb-12 transition cursor-text overflow-y-auto -mt-[10px] ${
                            isFormulaDropActive
                                ? "border-brand/40 bg-brand/5"
                                : "border-slate-200/60 bg-slate-50/30"
                        }`}
                    >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                            {formulaTokens.map((token, tokenIndex) => (
                                <FormulaTokenChip
                                    key={`formula-token:${tokenIndex}`}
                                    token={token}
                                    columns={columns}
                                    customMetrics={customMetrics}
                                />
                            ))}
                            <div className="relative inline-flex min-w-[4px] items-baseline">
                                <input
                                    ref={manualInputRef}
                                    value={manualInputValue}
                                    onChange={(e) => setManualInputValue(e.target.value.replace(/[^0-9.]/g, ""))}
                                    onKeyDown={onManualInputKeyDown}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                    className="absolute inset-0 w-full bg-transparent opacity-0 cursor-text outline-none p-0 border-none ring-0 focus:ring-0"
                                    style={{ width: Math.max(manualInputValue.length * 8, 12) }}
                                />
                                <span className={`${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink leading-none whitespace-pre`}>
                                    {manualInputValue}
                                </span>
                                {isInputFocused && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                                        className="ml-px w-px self-center bg-ink"
                                        style={{ height: "0.96em" }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Action Buttons (Delete & Save) */}
                        <div
                            className="absolute bottom-[7px] right-[7px] flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={onDeleteLastToken}
                                className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-ink"
                                aria-label="Delete last item"
                            >
                                <Delete className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={onSaveMetric}
                                disabled={!canSave}
                                className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-100 disabled:hover:text-slate-500"
                                aria-label="Save formula"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-auto space-y-2">
                    {/* Operators */}
                    <div className="flex flex-wrap items-center justify-center gap-[3px]">
                        {CUSTOM_METRIC_OPERATOR_BUTTONS.map((button) => (
                            <button
                                key={`${button.type}:${button.value}`}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onCommitManualInput();
                                    if (button.type === "binary") {
                                        onAppendBinaryOperator(button.value);
                                        return;
                                    }
                                    if (button.type === "operator") {
                                        onAppendPercent();
                                        return;
                                    }
                                    onAppendParenthesis(button.value);
                                }}
                                className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-slate-100 text-[0.9rem] font-semibold leading-none text-slate-500 transition hover:bg-slate-200 hover:text-ink"
                            >
                                {button.type === "binary"
                                    ? formatCustomMetricOperatorLabel(button.value)
                                    : button.value}
                            </button>
                        ))}
                        {/* Comma */}
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { onCommitManualInput(); onAppendComma(); }}
                            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-slate-100 text-[0.9rem] font-semibold leading-none text-slate-500 transition hover:bg-slate-200 hover:text-ink"
                        >
                            ,
                        </button>
                    </div>
                </div>

                {builderError ? (
                    <p className="px-1 text-sm text-rose-600">{builderError}</p>
                ) : null}
            </div>
        </div>
    );
}
