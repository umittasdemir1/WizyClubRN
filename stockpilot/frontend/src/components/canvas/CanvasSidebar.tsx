import { motion } from "framer-motion";
import {
    AlignLeft,
    ArrowUpAZ,
    ArrowUpZA,
    BetweenHorizontalStart,
    BetweenVerticalStart,
    Bookmark,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronUp,
    Delete,
    Diff,
    EyeClosed,
    Grip,
    Hash,
    RotateCcw,
    Sigma,
    SlidersHorizontal,
    SquarePen,
    X
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
    DATE_CONSTANT_LABELS,
    METRIC_FUNCTION_ARITY,
    PIVOT_FIELD_TEXT_TYPOGRAPHY,
    PIVOT_ZONES,
    formatCustomMetricOperatorLabel,
    getAvailablePivotFields,
    getFieldDefinition,
    isValidCustomMetricExpression,
    isCustomMetricFieldId,
    type ColumnOverride,
    type CustomMetricBinaryOperator,
    type CustomMetricDefinition,
    type CustomMetricFormat,
    type CustomMetricId,
    type CustomMetricExpressionToken,
    type CustomMetricParenthesis,
    type DateConstantFn,
    type DragState,
    type MetricFunctionName,
    type PivotFieldDefinition,
    type PivotFieldId,
    type PivotLayout,
    type PivotZoneId
} from "./canvasModel";
import { MetricDateDropdown, MetricFormatSelect, MetricFunctionDropdown } from "./MetricFormatSelect";

type SidebarPanel = "calculations" | "layout" | "field-editor" | null;

const CUSTOM_METRIC_BINARY_OPERATORS: CustomMetricBinaryOperator[] = ["+", "-", "*", "/", "=", ">", "<"];
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

interface CanvasSidebarProps {
    activeLayout: PivotLayout;
    columns: import("../../types/stock").ColumnMeta[];
    columnOverrides: Record<string, ColumnOverride>;
    updateColumnOverride: (key: string, override: ColumnOverride | null) => void;
    customMetrics: CustomMetricDefinition[];
    dragZone: PivotZoneId | null;
    activeDrag: DragState | null;
    dropIndicator: { zoneId: PivotZoneId; index: number } | null;
    pinnedFieldIds: PivotFieldId[];
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    setDragZone: (zoneId: PivotZoneId | null) => void;
    clearDragState: () => void;
    handleZoneDrop: (zoneId: PivotZoneId, event: DragEvent<HTMLDivElement>) => void;
    removeFieldFromZone: (fieldId: PivotFieldId, zoneId: PivotZoneId) => void;
    addCustomMetric: (value: Omit<CustomMetricDefinition, "id">) => CustomMetricDefinition;
    deleteCustomMetric: (id: CustomMetricId) => void;
    setPinnedFieldIds: React.Dispatch<React.SetStateAction<PivotFieldId[]>>;
}

function FieldListItem({
    field,
    isHidden,
    isPinned,
    setActiveDrag,
    setDropIndicator,
    clearDragState,
    onEdit,
    onDelete,
    onToggleHide,
    onTogglePin
}: {
    field: PivotFieldDefinition;
    isHidden?: boolean;
    isPinned?: boolean;
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    clearDragState: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleHide?: () => void;
    onTogglePin?: () => void;
}) {
    const isFormula = isCustomMetricFieldId(field.id);

    return (
        <div className={`flex w-full items-center gap-2 border-b border-slate-200/70 px-1 py-1.5 last:border-b-0 ${isHidden ? "opacity-40" : ""}`}>
            <button
                type="button"
                draggable
                onDragStart={(event) => {
                    event.dataTransfer.setData("text/stockpilot-field", field.id);
                    event.dataTransfer.effectAllowed = "move";
                    setActiveDrag({
                        fieldId: field.id,
                        sourceZone: "fields"
                    });
                    setDropIndicator(null);
                }}
                onDragEnd={clearDragState}
                className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:opacity-70"
            >
                {isFormula
                    ? <Sigma className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    : <Grip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                }
                <p className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}>
                    {field.label}
                </p>
            </button>
            <div className="flex shrink-0 items-center gap-1">
                {isFormula ? (
                    <>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onEdit}
                            className="rounded p-0.5 text-slate-400 transition hover:text-ink"
                        >
                            <SquarePen className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onDelete}
                            className="rounded p-0.5 text-slate-400 transition hover:text-red-500"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                    </>
                ) : null}
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onTogglePin}
                    className={`rounded p-0.5 transition ${isPinned ? "text-danger" : "text-slate-400 hover:text-ink"}`}
                >
                    <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} fill={isPinned ? "currentColor" : "none"} />
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onToggleHide}
                    className={`rounded p-0.5 transition ${isHidden ? "text-slate-500" : "text-slate-400 hover:text-ink"}`}
                >
                    <EyeClosed className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
            </div>
        </div>
    );
}

function FormulaTokenChip({
    token,
    columns,
    customMetrics
}: {
    token: CustomMetricExpressionToken;
    columns: import("../../types/stock").ColumnMeta[];
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

export function CanvasSidebar({
    activeLayout,
    columns,
    columnOverrides,
    updateColumnOverride,
    customMetrics,
    dragZone,
    activeDrag,
    dropIndicator,
    pinnedFieldIds,
    setActiveDrag,
    setDropIndicator,
    setDragZone,
    clearDragState,
    handleZoneDrop,
    removeFieldFromZone,
    addCustomMetric,
    deleteCustomMetric,
    setPinnedFieldIds
}: CanvasSidebarProps) {
    const [activePanel, setActivePanel] = useState<SidebarPanel>("layout");
    const [isFieldsOpen, setIsFieldsOpen] = useState(true);
    const [calculationName, setCalculationName] = useState("");
    const [calculationFormat, setCalculationFormat] = useState<CustomMetricFormat>("integer");
    const [formulaTokens, setFormulaTokens] = useState<CustomMetricExpressionToken[]>([]);
    const [isFormulaDropActive, setIsFormulaDropActive] = useState(false);
    const [builderError, setBuilderError] = useState<string | null>(null);

    // --- Typewriter Placeholder logic ---
    const [placeholderText, setPlaceholderText] = useState("");
    const placeholders = ["Total Revenue", "Gross Margin", "Net Profit %", "YoY Growth", "Customer LTV", "Retention Rate"];
    const [isNameInputFocused, setIsNameInputFocused] = useState(false);
    
    useEffect(() => {
        if (isNameInputFocused) return;
        let isCancelled = false;
        let pIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let timeout: NodeJS.Timeout;

        const tick = () => {
            if (isCancelled) return;
            const fullText = placeholders[pIndex];
            
            if (isDeleting) {
                setPlaceholderText(fullText.substring(0, charIndex - 1));
                charIndex--;
            } else {
                setPlaceholderText(fullText.substring(0, charIndex + 1));
                charIndex++;
            }

            let delta = isDeleting ? 60 : 120; // Silme hızı vs yazma hızı

            if (!isDeleting && charIndex === fullText.length) {
                isDeleting = true;
                delta = 2000; // Tamamlandığında 2sn bekle
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                pIndex = (pIndex + 1) % placeholders.length;
                delta = 500;
            }

            timeout = setTimeout(tick, delta);
        };

        timeout = setTimeout(tick, 500);
        return () => {
            isCancelled = true;
            clearTimeout(timeout);
        };
    }, [isNameInputFocused]);
    // ------------------------------------
    const [manualInputValue, setManualInputValue] = useState("");
    const [isInputFocused, setIsInputFocused] = useState(false);

    const [hiddenFieldIds, setHiddenFieldIds] = useState<Set<PivotFieldId>>(() => new Set());
    const [fieldSortDirection, setFieldSortDirection] = useState<"asc" | "desc" | null>(null);

    const manualInputRef = useRef<HTMLInputElement>(null);
    const savedTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());

    function flashSaved(key: string) {
        if (savedTimeoutsRef.current[key]) clearTimeout(savedTimeoutsRef.current[key]);
        setSavedRows((prev) => new Set([...prev, key]));
        savedTimeoutsRef.current[key] = setTimeout(() => {
            setSavedRows((prev) => { const next = new Set(prev); next.delete(key); return next; });
        }, 1800);
    }

    function applyColumnOverride(key: string, patch: Partial<ColumnOverride> & { baseCol: import("../../types/stock").ColumnMeta }) {
        const { baseCol, ...rest } = patch;
        const current = columnOverrides[key];
        const base: ColumnOverride = {
            label: current?.label ?? baseCol.label,
            format: current?.format ?? "integer"
        };
        if (current?.typeOverride) base.typeOverride = current.typeOverride;
        const next: ColumnOverride = { ...base, ...rest };
        updateColumnOverride(key, next);
        flashSaved(key);
    }
    const allFields = useMemo(() => {
        const fields = getAvailablePivotFields(columns, customMetrics, columnOverrides);
        const pinnedSet = new Set(pinnedFieldIds);

        const pinned = fields.filter((f) => pinnedSet.has(f.id));
        const hidden = fields.filter((f) => hiddenFieldIds.has(f.id));
        const regular = fields.filter((f) => !pinnedSet.has(f.id) && !hiddenFieldIds.has(f.id));

        if (fieldSortDirection === "asc") {
            regular.sort((a, b) => a.label.localeCompare(b.label));
        } else if (fieldSortDirection === "desc") {
            regular.sort((a, b) => b.label.localeCompare(a.label));
        }

        return [...pinned, ...regular, ...hidden];
    }, [columns, columnOverrides, customMetrics, pinnedFieldIds, hiddenFieldIds, fieldSortDirection]);

    useEffect(() => {
        if (activePanel === "calculations") {
            setTimeout(() => manualInputRef.current?.focus(), 100);
        }
    }, [activePanel]);

    function toggleCalculationsPanel() {
        setActivePanel((current) => (current === "calculations" ? null : "calculations"));
    }

    function loadMetricForEdit(metric: CustomMetricDefinition) {
        setCalculationName(metric.name);
        setCalculationFormat(metric.format);
        setFormulaTokens(metric.tokens);
        setBuilderError(null);
        deleteCustomMetric(metric.id);
        setActivePanel("calculations");
    }

    function toggleLayoutPanel() {
        setActivePanel((current) => (current === "layout" ? null : "layout"));
    }

    function getLastFormulaToken(tokens: CustomMetricExpressionToken[] = formulaTokens) {
        return tokens[tokens.length - 1];
    }

    function getOpenParenthesisCount(tokens: CustomMetricExpressionToken[] = formulaTokens) {
        return tokens.reduce((count, token) => {
            if (token.type !== "parenthesis") {
                return count;
            }

            return token.value === "(" ? count + 1 : Math.max(0, count - 1);
        }, 0);
    }

    function isResolvedFormulaValueToken(token: CustomMetricExpressionToken | undefined) {
        return (
            token?.type === "field" ||
            token?.type === "constant" ||
            token?.type === "date-constant" ||
            (token?.type === "parenthesis" && token.value === ")") ||
            (token?.type === "operator" && token.operator === "%")
        );
    }

    function canAppendValueToken(tokens: CustomMetricExpressionToken[] = formulaTokens) {
        const lastToken = getLastFormulaToken(tokens);
        return (
            !lastToken ||
            (lastToken.type === "operator" && lastToken.operator !== "%") ||
            (lastToken.type === "parenthesis" && lastToken.value === "(") ||
            lastToken.type === "comma"
        );
    }

    function canAppendBinaryOperator(tokens: CustomMetricExpressionToken[] = formulaTokens) {
        return isResolvedFormulaValueToken(getLastFormulaToken(tokens));
    }

    function canAppendParenthesis(value: CustomMetricParenthesis, tokens: CustomMetricExpressionToken[] = formulaTokens) {
        if (value === "(") {
            return canAppendValueToken(tokens);
        }

        return getOpenParenthesisCount(tokens) > 0 && isResolvedFormulaValueToken(getLastFormulaToken(tokens));
    }

    function canAppendPercentOperator(tokens: CustomMetricExpressionToken[] = formulaTokens) {
        return isResolvedFormulaValueToken(getLastFormulaToken(tokens));
    }

    function appendFieldToFormula(fieldId: PivotFieldId) {
        const field = getFieldDefinition(fieldId, columns, customMetrics);
        if (field.kind !== "measure") {
            setBuilderError("Only metric fields can be used in calculations.");
            return;
        }

        if (manualInputValue !== "") {
            setBuilderError("Add an operator after the current number first.");
            manualInputRef.current?.focus();
            return;
        }

        let nextError: string | null = null;
        setFormulaTokens((current) => {
            if (!canAppendValueToken(current)) {
                nextError = "Select an operator before dropping the next metric.";
                return current;
            }

            nextError = null;
            return [...current, { type: "field", fieldId }];
        });
        setBuilderError(nextError);
        manualInputRef.current?.focus();
    }

    function handleFormulaDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const fieldId = event.dataTransfer.getData("text/stockpilot-field") as PivotFieldId;
        setIsFormulaDropActive(false);

        if (!fieldId) {
            return;
        }

        appendFieldToFormula(fieldId);
    }

    function appendDateConstantToFormula(fn: DateConstantFn) {
        if (!canAppendValueToken()) {
            setBuilderError("Add an operator before this constant.");
            return;
        }
        setFormulaTokens((current) => [...current, { type: "date-constant", fn }]);
        setBuilderError(null);
        manualInputRef.current?.focus();
    }

    function appendFunctionToFormula(fn: MetricFunctionName) {
        if (!canAppendValueToken()) {
            setBuilderError("Add an operator before this function.");
            return;
        }
        setFormulaTokens((current) => [
            ...current,
            { type: "function", fn },
            { type: "parenthesis", value: "(" }
        ]);
        setBuilderError(null);
        manualInputRef.current?.focus();
    }

    function appendCommaToFormula() {
        if (!isResolvedFormulaValueToken(getLastFormulaToken())) {
            setBuilderError("Complete the current argument before adding a comma.");
            return;
        }
        setFormulaTokens((current) => [...current, { type: "comma" }]);
        setBuilderError(null);
        manualInputRef.current?.focus();
    }

    function appendBinaryOperatorToFormula(operator: CustomMetricBinaryOperator) {
        let nextError: string | null = null;
        setFormulaTokens((current) => {
            if (current.length === 0) {
                nextError = "Drop a metric or enter a number first.";
                return current;
            }

            const lastToken = current[current.length - 1];
            if (lastToken?.type === "operator" && lastToken.operator !== "%") {
                nextError = null;
                return [...current.slice(0, -1), { type: "operator", operator }];
            }

            if (!canAppendBinaryOperator(current)) {
                nextError = "Add a metric, number, or closing bracket first.";
                return current;
            }

            nextError = null;
            return [...current, { type: "operator", operator }];
        });
        setBuilderError(nextError);
        manualInputRef.current?.focus();
    }

    function appendPercentToFormula() {
        let nextError: string | null = null;
        setFormulaTokens((current) => {
            if (!canAppendPercentOperator(current)) {
                nextError = "Add a metric, number, or closing bracket before %.";
                return current;
            }

            nextError = null;
            return [...current, { type: "operator", operator: "%" }];
        });
        setBuilderError(nextError);
        manualInputRef.current?.focus();
    }

    function appendParenthesisToFormula(value: CustomMetricParenthesis) {
        let nextError: string | null = null;
        setFormulaTokens((current) => {
            if (!canAppendParenthesis(value, current)) {
                nextError =
                    value === "("
                        ? "Add an operator before opening another group."
                        : "Close the expression after a metric or number.";
                return current;
            }

            nextError = null;
            return [...current, { type: "parenthesis", value }];
        });
        setBuilderError(nextError);
        manualInputRef.current?.focus();
    }

    function handleDeleteLastToken() {
        if (manualInputValue !== "") {
            setManualInputValue("");
            setBuilderError(null);
            manualInputRef.current?.focus();
            return;
        }

        setFormulaTokens((current) => (current.length > 0 ? current.slice(0, -1) : current));
        setBuilderError(null);
        manualInputRef.current?.focus();
    }

    function commitManualInput() {
        const numericValue = Number.parseFloat(manualInputValue);
        if (!Number.isNaN(numericValue)) {
            let wasCommitted = false;
            setFormulaTokens((current) => {
                if (!canAppendValueToken(current)) {
                    return current;
                }

                wasCommitted = true;
                return [...current, { type: "constant", value: numericValue }];
            });
            if (wasCommitted) {
                setManualInputValue("");
                setBuilderError(null);
            } else {
                setBuilderError("Add an operator before entering another number.");
            }

            return wasCommitted;
        }
        return false;
    }

    function handleManualInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Backspace" && manualInputValue === "") {
            event.preventDefault();
            handleDeleteLastToken();
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            commitManualInput();
            return;
        }

        if (
            CUSTOM_METRIC_BINARY_OPERATORS.includes(event.key as CustomMetricBinaryOperator) ||
            event.key === "x" ||
            event.key === "X"
        ) {
            event.preventDefault();
            commitManualInput();
            appendBinaryOperatorToFormula(
                event.key === "x" || event.key === "X" ? "*" : (event.key as CustomMetricBinaryOperator)
            );
            return;
        }

        if (event.key === "%") {
            event.preventDefault();
            commitManualInput();
            appendPercentToFormula();
            return;
        }

        if (event.key === "(") {
            event.preventDefault();
            appendParenthesisToFormula("(");
            return;
        }

        if (event.key === ")") {
            event.preventDefault();
            commitManualInput();
            appendParenthesisToFormula(")");
        }
    }

    function handleSaveMetric() {
        let finalTokens = [...formulaTokens];
        const numericValue = Number.parseFloat(manualInputValue);
        if (!Number.isNaN(numericValue)) {
            if (!canAppendValueToken(finalTokens)) {
                setBuilderError("Add an operator before entering another number.");
                manualInputRef.current?.focus();
                return;
            }

            finalTokens.push({ type: "constant", value: numericValue });
        }

        const nextName = calculationName.trim();

        if (!nextName || !isValidCustomMetricExpression(finalTokens)) {
            return;
        }

        addCustomMetric({
            name: nextName,
            tokens: finalTokens,
            format: calculationFormat
        });

        setCalculationName("");
        setCalculationFormat("integer");
        setFormulaTokens([]);
        setManualInputValue("");
        setBuilderError(null);
        setIsFormulaDropActive(false);
        setActivePanel("layout");
    }

    function renderZoneCard(zone: { id: PivotZoneId; label: string }) {
        return (
            <div key={zone.id} className="flex flex-col">
                <div className="mb-2 flex items-start gap-1.5 px-1">
                    <div className="shrink-0 pt-0.5 text-ink">
                        {zone.id === "filters" ? (
                            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.7} />
                        ) : zone.id === "values" ? (
                            <Diff className="h-5 w-5" strokeWidth={1.7} />
                        ) : zone.id === "columns" ? (
                            <BetweenVerticalStart className="h-5 w-5" strokeWidth={1.7} />
                        ) : (
                            <BetweenHorizontalStart className="h-5 w-5" strokeWidth={1.7} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-display text-[1.12rem] font-light leading-[1.08] tracking-tight text-ink">
                            {zone.label}
                        </p>
                    </div>
                </div>

                <div
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragZone(zone.id);
                        setDropIndicator((current) =>
                            current?.zoneId === zone.id
                                ? current
                                : {
                                      zoneId: zone.id,
                                      index: activeLayout[zone.id].length
                                  }
                        );
                    }}
                    onDrop={(event) => handleZoneDrop(zone.id, event)}
                    className={`flex aspect-[9/10] min-h-0 flex-col overflow-hidden rounded-[10px] border px-3 pb-3 pt-2.5 shadow-[0_18px_42px_-34px_rgba(11,14,20,0.38)] transition ${
                        dragZone === zone.id
                            ? "border-slate-300 bg-white/80 backdrop-blur-xl"
                            : "border-slate-200/70 bg-white/80 backdrop-blur-xl"
                    }`}
                >
                    <div className="min-h-0 flex-1 space-y-0 overflow-y-auto pr-1">
                        {activeLayout[zone.id].length === 0 ? (
                            dropIndicator?.zoneId === zone.id ? (
                                <motion.div
                                    layout
                                    className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                />
                            ) : (
                                <div className="h-0" />
                            )
                        ) : (
                            activeLayout[zone.id].map((fieldId: PivotFieldId) => (
                                <Fragment key={`${zone.id}:${fieldId}`}>
                                    {dropIndicator?.zoneId === zone.id &&
                                    dropIndicator.index === activeLayout[zone.id].indexOf(fieldId) ? (
                                        <motion.div
                                            layout
                                            className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                        />
                                    ) : null}

                                    <motion.div
                                        layout
                                        transition={{
                                            layout: {
                                                duration: 0.2,
                                                ease: [0.16, 1, 0.3, 1]
                                            }
                                        }}
                                        draggable
                                        onDragStart={(event) => {
                                            const dataTransfer = (event as unknown as DragEvent<HTMLDivElement>).dataTransfer;

                                            if (!dataTransfer) {
                                                return;
                                            }

                                            dataTransfer.setData("text/stockpilot-field", fieldId);
                                            dataTransfer.effectAllowed = "move";
                                            setActiveDrag({
                                                fieldId,
                                                sourceZone: zone.id
                                            });
                                        }}
                                        onDragEnd={clearDragState}
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            const bounds = event.currentTarget.getBoundingClientRect();
                                            const nextIndex =
                                                event.clientY < bounds.top + bounds.height / 2
                                                    ? activeLayout[zone.id].indexOf(fieldId)
                                                    : activeLayout[zone.id].indexOf(fieldId) + 1;
                                            setDragZone(zone.id);
                                            setDropIndicator((current) =>
                                                current?.zoneId === zone.id && current.index === nextIndex
                                                    ? current
                                                    : {
                                                          zoneId: zone.id,
                                                          index: nextIndex
                                                      }
                                            );
                                        }}
                                        className={`flex items-center justify-between gap-3 border-b border-slate-200/70 py-1 text-sm text-slate-800 transition last:border-b-0 ${
                                            activeDrag?.fieldId === fieldId && activeDrag?.sourceZone === zone.id
                                                ? "opacity-45"
                                                : "opacity-100"
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-start gap-1.5">
                                            <Grip className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                                            <span className="truncate font-display text-[0.92rem] font-light leading-[1.08] tracking-tight text-ink">
                                                {getFieldDefinition(fieldId, columns, customMetrics, columnOverrides).label}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFieldFromZone(fieldId, zone.id)}
                                            className="rounded-full p-0.5 text-slate-500 transition hover:text-ink"
                                            aria-label={`Remove ${getFieldDefinition(fieldId, columns, customMetrics, columnOverrides).label}`}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </motion.div>

                                    {dropIndicator?.zoneId === zone.id &&
                                    dropIndicator.index === activeLayout[zone.id].length &&
                                    fieldId === activeLayout[zone.id][activeLayout[zone.id].length - 1] ? (
                                        <motion.div
                                            layout
                                            className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                        />
                                    ) : null}
                                </Fragment>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <aside className="flex h-[940px] max-h-[940px] flex-col overflow-hidden rounded-[12px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)] backdrop-blur-xl">
            <div className="flex min-h-0 flex-1 flex-col">
                <div>
                    <button
                        type="button"
                        onClick={() => setIsFieldsOpen((current) => !current)}
                        className="flex w-full items-start justify-between gap-4 rounded-[12px] px-1 py-1 text-left transition hover:bg-white/45"
                    >
                        <div className="px-1">
                            <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Fields
                            </p>
                            {isFieldsOpen ? (
                                <h3 className="mt-1 font-display text-[2rem] font-light leading-[1.08] tracking-tight text-ink">
                                    Pivot field builder
                                </h3>
                            ) : null}
                        </div>
                        <span className="mt-px inline-flex shrink-0 items-center justify-center text-slate-500">
                            {isFieldsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                    </button>
                </div>

                {isFieldsOpen ? (
                    <div className="mt-4 h-[184px] shrink-0 overflow-hidden">
                        <div className="h-full overflow-y-auto pr-1">
                            <div className="rounded-[10px] border border-slate-200/70 bg-white/80 px-3 pb-0 pt-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        Core fields
                                    </p>
                                    <div className="flex items-center gap-0.5">
                                        {columns.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setActivePanel((p) => p === "field-editor" ? "layout" : "field-editor")}
                                                className={`inline-flex h-5 w-5 items-center justify-center rounded transition ${activePanel === "field-editor" ? "text-brand" : "text-slate-400 hover:text-slate-600"}`}
                                                aria-label="Edit fields"
                                            >
                                                <SquarePen className="h-3.5 w-3.5" strokeWidth={1.8} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setFieldSortDirection((d) => d === null ? "asc" : d === "asc" ? "desc" : null)}
                                            className={`inline-flex h-5 w-5 items-center justify-center rounded transition ${fieldSortDirection ? "text-brand" : "text-slate-400 hover:text-slate-600"}`}
                                            aria-label={fieldSortDirection === "desc" ? "Sort Z to A" : "Sort A to Z"}
                                        >
                                            {fieldSortDirection === "desc"
                                                ? <ArrowUpZA className="h-3.5 w-3.5" strokeWidth={1.8} />
                                                : <ArrowUpAZ className="h-3.5 w-3.5" strokeWidth={1.8} />
                                            }
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    {allFields.map((field) => {
                                        const metric = isCustomMetricFieldId(field.id)
                                            ? customMetrics.find((m) => m.id === field.id) ?? null
                                            : null;
                                        return (
                                            <FieldListItem
                                                key={field.id}
                                                field={field}
                                                isHidden={hiddenFieldIds.has(field.id)}
                                                isPinned={pinnedFieldIds.includes(field.id)}
                                                setActiveDrag={setActiveDrag}
                                                setDropIndicator={setDropIndicator}
                                                clearDragState={clearDragState}
                                                onEdit={metric ? () => loadMetricForEdit(metric) : undefined}
                                                onDelete={metric ? () => deleteCustomMetric(metric.id) : undefined}
                                                onTogglePin={() => setPinnedFieldIds((prev) => {
                                                    if (prev.includes(field.id)) {
                                                        return prev.filter(id => id !== field.id);
                                                    } else {
                                                        return [...prev, field.id];
                                                    }
                                                })}
                                                onToggleHide={() => setHiddenFieldIds((prev) => {
                                                    const next = new Set(prev);
                                                    next.has(field.id) ? next.delete(field.id) : next.add(field.id);
                                                    return next;
                                                })}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mt-5">
                    <button
                        type="button"
                        onClick={toggleCalculationsPanel}
                        className="flex w-full items-start justify-between gap-4 rounded-[12px] px-1 py-1 text-left transition hover:bg-white/45"
                    >
                        <div className="px-1">
                            <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Calculations
                            </p>
                            {activePanel === "calculations" ? (
                                <h3 className="mt-1 font-display text-[2rem] font-light leading-[1.08] tracking-tight text-ink">
                                    Metric lab
                                </h3>
                            ) : null}
                        </div>
                        <span className="mt-px inline-flex shrink-0 items-center justify-center text-slate-500">
                            {activePanel === "calculations" ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </span>
                    </button>
                </div>

                {activePanel === "calculations" ? (
                    <div className="mt-3 shrink-0 overflow-hidden">
                        <div className="overflow-y-auto pr-1">
                            <div className="rounded-[14px] border border-slate-200/70 bg-white/85 p-4 shadow-[0_18px_42px_-34px_rgba(11,14,20,0.24)]">
                                <div className="flex min-h-full flex-col gap-3">
                                    <div className="flex flex-col gap-4 -mx-[10px]">
                                        <div className="flex items-center justify-between gap-3 px-0 -mt-[10px]" onClick={(e) => e.stopPropagation()}>
                                            <div className="min-w-0 flex-1">
                                                <div className="rounded-[10px] border border-slate-200/70 bg-white/80 h-[36px] flex items-center shadow-sm">
                                                    <input
                                                        value={calculationName}
                                                        onChange={(event) => setCalculationName(event.target.value)}
                                                        onFocus={() => setIsNameInputFocused(true)}
                                                        onBlur={() => setIsNameInputFocused(false)}
                                                        placeholder={placeholderText}
                                                        className={`w-full appearance-none bg-transparent px-4 outline-none border-none ring-0 focus:ring-0 ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink !leading-none -translate-y-[2px] placeholder:text-slate-400`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <MetricFormatSelect
                                                    value={calculationFormat}
                                                    onChange={setCalculationFormat}
                                                />
                                                <MetricDateDropdown
                                                    onSelect={(fn) => { commitManualInput(); appendDateConstantToFormula(fn); }}
                                                />
                                                <MetricFunctionDropdown
                                                    onSelect={(fn) => { commitManualInput(); appendFunctionToFormula(fn); }}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                setIsFormulaDropActive(true);
                                            }}
                                            onDragLeave={() => setIsFormulaDropActive(false)}
                                            onDrop={handleFormulaDrop}
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
                                                        onKeyDown={handleManualInputKeyDown}
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
                                                    onClick={handleDeleteLastToken}
                                                    className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-ink"
                                                    aria-label="Delete last item"
                                                >
                                                    <Delete className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={handleSaveMetric}
                                                    disabled={!calculationName.trim() || !isValidCustomMetricExpression(
                                                        (() => {
                                                            const n = Number.parseFloat(manualInputValue);
                                                            return !Number.isNaN(n) && canAppendValueToken(formulaTokens)
                                                                ? [...formulaTokens, { type: "constant" as const, value: n }]
                                                                : formulaTokens;
                                                        })()
                                                    )}
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
                                        <div
                                            className="flex flex-wrap items-center justify-center gap-[3px]"
                                        >
                                            {CUSTOM_METRIC_OPERATOR_BUTTONS.map((button) => (
                                                <button
                                                    key={`${button.type}:${button.value}`}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        commitManualInput();
                                                        if (button.type === "binary") {
                                                            appendBinaryOperatorToFormula(button.value);
                                                            return;
                                                        }
                                                        if (button.type === "operator") {
                                                            appendPercentToFormula();
                                                            return;
                                                        }
                                                        appendParenthesisToFormula(button.value);
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
                                                onClick={() => { commitManualInput(); appendCommaToFormula(); }}
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
                        </div>
                    </div>
                ) : null}

                <div className="mt-5">
                    <button
                        type="button"
                        onClick={toggleLayoutPanel}
                        className="flex w-full items-start justify-between gap-4 rounded-[12px] px-1 py-1 text-left transition hover:bg-white/45"
                    >
                        <div className="px-1">
                            <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Layout
                            </p>
                            {activePanel === "layout" ? (
                                <h3 className="mt-1 font-display text-[2rem] font-light leading-[1.08] tracking-tight text-ink">
                                    Table mapping
                                </h3>
                            ) : null}
                        </div>
                        <span className="mt-px inline-flex shrink-0 items-center justify-center text-slate-500">
                            {activePanel === "layout" ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </span>
                    </button>
                </div>

                {activePanel === "layout" ? (
                    <div className="mt-3 grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
                        {PIVOT_ZONES.map((zone) => renderZoneCard(zone))}
                    </div>
                ) : null}
            </div>
        </aside>

        {activePanel === "field-editor" && createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
                onMouseDown={() => setActivePanel("layout")}
            >
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[6px]" />
                <div
                    className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[20px] border border-slate-200/60 bg-white shadow-[0_40px_120px_-30px_rgba(11,14,20,0.45)]"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
                        <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Dataset</p>
                            <h2 className="mt-0.5 font-display text-[1.6rem] font-light leading-[1.05] tracking-tight text-ink">
                                Field editor
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[0.75rem] text-slate-400">
                                {columns.length} fields · {Object.keys(columnOverrides).length} modified
                            </span>
                            {Object.keys(columnOverrides).length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        columns.forEach((col) => updateColumnOverride(col.key, null));
                                    }}
                                    className="rounded-[8px] px-2.5 py-1 text-[0.75rem] text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
                                >
                                    Reset all
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setActivePanel("layout")}
                                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                            >
                                <X className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50/90 backdrop-blur-sm">
                                    <th className="w-1 border-b border-slate-100 py-3 pl-2 pr-0" />
                                    <th className="border-b border-slate-100 px-4 py-3 text-left text-[0.63rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Original field</th>
                                    <th className="border-b border-slate-100 px-4 py-3 text-left text-[0.63rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Display name</th>
                                    <th className="border-b border-slate-100 px-4 py-3 text-left text-[0.63rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Type</th>
                                    <th className="border-b border-slate-100 px-4 py-3 text-left text-[0.63rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Format</th>
                                    <th className="w-12 border-b border-slate-100" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/70">
                                {columns.map((col) => {
                                    const override = columnOverrides[col.key];
                                    const effectiveType = override?.typeOverride ?? col.type;
                                    const isModified = !!override;
                                    const isSaved = savedRows.has(col.key);

                                    return (
                                        <tr
                                            key={col.key}
                                            className="group relative transition-colors hover:bg-slate-50/60"
                                        >
                                            {/* Modified accent stripe */}
                                            <td className="w-1 p-0 align-middle">
                                                <div className={`h-full w-[3px] rounded-r-full transition-all ${isModified ? "bg-brand/60" : "bg-transparent"}`} style={{ minHeight: "44px" }} />
                                            </td>

                                            {/* Original key */}
                                            <td className="px-4 py-3 align-middle">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] ${
                                                        col.type === "numeric" ? "bg-brand/10 text-brand" :
                                                        col.type === "date" ? "bg-violet-50 text-violet-500" :
                                                        "bg-slate-100 text-slate-400"
                                                    }`}>
                                                        {col.type === "numeric" ? <Hash className="h-3 w-3" strokeWidth={2} /> :
                                                         col.type === "date" ? <CalendarDays className="h-3 w-3" strokeWidth={1.8} /> :
                                                         <AlignLeft className="h-3 w-3" strokeWidth={1.8} />}
                                                    </span>
                                                    <span className="font-mono text-[0.78rem] leading-none text-slate-400">{col.key}</span>
                                                </div>
                                            </td>

                                            {/* Display name */}
                                            <td className="px-4 py-3 align-middle">
                                                <input
                                                    className={`w-full min-w-[140px] appearance-none rounded-[8px] border px-3 py-1.5 text-[0.84rem] leading-none text-ink outline-none ring-0 transition-all placeholder:text-slate-300 focus:ring-2 ${
                                                        isModified
                                                            ? "border-brand/30 bg-brand/[0.03] focus:border-brand/50 focus:ring-brand/10"
                                                            : "border-slate-200 bg-white focus:border-slate-300 focus:ring-slate-100"
                                                    }`}
                                                    value={override?.label ?? col.label}
                                                    placeholder={col.label}
                                                    onChange={(e) => {
                                                        applyColumnOverride(col.key, { baseCol: col, label: e.target.value || col.label });
                                                    }}
                                                />
                                            </td>

                                            {/* Type selector */}
                                            <td className="px-4 py-3 align-middle">
                                                <div className="inline-flex rounded-[8px] border border-slate-200 bg-slate-50 p-[3px] gap-[2px]">
                                                    {(["text", "numeric", "date"] as const).map((t) => (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            title={t === "numeric" ? "Number" : t === "date" ? "Date" : "Text"}
                                                            onClick={() => {
                                                                const newFormat = t === "numeric" ? (override?.format ?? "integer") : "integer";
                                                                applyColumnOverride(col.key, {
                                                                    baseCol: col,
                                                                    typeOverride: t,
                                                                    ...(t === "numeric" ? { format: newFormat } : {})
                                                                });
                                                            }}
                                                            className={`inline-flex h-6 w-6 items-center justify-center rounded-[5px] transition-all ${
                                                                effectiveType === t
                                                                    ? t === "numeric"
                                                                        ? "bg-brand text-white shadow-sm"
                                                                        : t === "date"
                                                                        ? "bg-violet-500 text-white shadow-sm"
                                                                        : "bg-slate-600 text-white shadow-sm"
                                                                    : "text-slate-400 hover:text-slate-600"
                                                            }`}
                                                        >
                                                            {t === "numeric" ? <Hash className="h-3 w-3" strokeWidth={2.2} /> :
                                                             t === "date" ? <CalendarDays className="h-[11px] w-[11px]" strokeWidth={1.8} /> :
                                                             <AlignLeft className="h-3 w-3" strokeWidth={2} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Format */}
                                            <td className="px-4 py-3 align-middle">
                                                {effectiveType === "numeric" ? (
                                                    <MetricFormatSelect
                                                        value={override?.format ?? "integer"}
                                                        onChange={(fmt) => applyColumnOverride(col.key, { baseCol: col, format: fmt })}
                                                    />
                                                ) : (
                                                    <span className="text-[0.78rem] text-slate-300">—</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-3 align-middle">
                                                <div className="flex items-center justify-center">
                                                    {isSaved ? (
                                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                                                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                                        </span>
                                                    ) : isModified ? (
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => { updateColumnOverride(col.key, null); flashSaved(col.key); }}
                                                            title="Reset to original"
                                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-400"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
                                                        </button>
                                                    ) : null}
                                                </div>
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
        )}
        </>
    );
}
