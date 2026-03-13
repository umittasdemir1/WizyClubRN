import { motion } from "framer-motion";
import {
    BetweenHorizontalStart,
    BetweenVerticalStart,
    Check,
    ChevronDown,
    ChevronUp,
    Diff,
    Grip,
    SlidersHorizontal,
    X
} from "lucide-react";
import { Fragment, useMemo, useState, type DragEvent } from "react";
import {
    PIVOT_FIELD_TEXT_TYPOGRAPHY,
    PIVOT_ZONES,
    describeCustomMetric,
    getAvailablePivotFields,
    getFieldDefinition,
    isCustomMetricFieldId,
    type CustomMetricDefinition,
    type CustomMetricExpressionToken,
    type CustomMetricOperator,
    type DragState,
    type PivotFieldDefinition,
    type PivotFieldId,
    type PivotLayout,
    type PivotZoneId
} from "./canvasModel";

type SidebarPanel = "calculations" | "layout" | null;

const CUSTOM_METRIC_OPERATORS: CustomMetricOperator[] = ["+", "-", "*", "/"];

interface CanvasSidebarProps {
    activeLayout: PivotLayout;
    customMetrics: CustomMetricDefinition[];
    dragZone: PivotZoneId | null;
    activeDrag: DragState | null;
    dropIndicator: { zoneId: PivotZoneId; index: number } | null;
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    setDragZone: (zoneId: PivotZoneId | null) => void;
    clearDragState: () => void;
    handleZoneDrop: (zoneId: PivotZoneId, event: DragEvent<HTMLDivElement>) => void;
    removeFieldFromZone: (fieldId: PivotFieldId, zoneId: PivotZoneId) => void;
    addCustomMetric: (value: Omit<CustomMetricDefinition, "id">) => CustomMetricDefinition;
}

function FieldListItem({
    field,
    customMetrics,
    setActiveDrag,
    setDropIndicator,
    clearDragState
}: {
    field: PivotFieldDefinition;
    customMetrics: CustomMetricDefinition[];
    setActiveDrag: (state: DragState | null) => void;
    setDropIndicator: React.Dispatch<React.SetStateAction<{ zoneId: PivotZoneId; index: number } | null>>;
    clearDragState: () => void;
}) {
    const isFormula = isCustomMetricFieldId(field.id);
    const metric = isFormula ? customMetrics.find((currentMetric) => currentMetric.id === field.id) ?? null : null;
    const fieldDescription = metric ? describeCustomMetric(metric, customMetrics) : null;

    return (
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
            className="flex w-full items-start gap-2 border-b border-slate-200/70 px-1 py-1.5 text-left transition hover:border-brand/30 last:border-b-0"
        >
            <Grip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                    <p className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}>
                        {field.label}
                    </p>
                    {isFormula ? (
                        <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Saved
                        </span>
                    ) : null}
                </div>
                {fieldDescription ? (
                    <p className="mt-0.5 truncate text-[0.72rem] font-medium uppercase tracking-[0.16em] text-slate-400">
                        {fieldDescription}
                    </p>
                ) : null}
            </div>
        </button>
    );
}

function FormulaTokenChip({
    token,
    customMetrics,
    onRemove
}: {
    token: CustomMetricExpressionToken;
    customMetrics: CustomMetricDefinition[];
    onRemove: () => void;
}) {
    const label =
        token.type === "field" ? getFieldDefinition(token.fieldId, customMetrics).label : token.operator;

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                token.type === "field"
                    ? "border-slate-200 bg-white text-ink"
                    : "border-slate-900 bg-slate-900 text-white"
            }`}
        >
            <span className="font-medium">{label}</span>
            <button
                type="button"
                onClick={onRemove}
                className={`rounded-full p-0.5 transition ${
                    token.type === "field" ? "text-slate-400 hover:text-ink" : "text-white/70 hover:text-white"
                }`}
                aria-label={`Remove ${label}`}
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </span>
    );
}

export function CanvasSidebar({
    activeLayout,
    customMetrics,
    dragZone,
    activeDrag,
    dropIndicator,
    setActiveDrag,
    setDropIndicator,
    setDragZone,
    clearDragState,
    handleZoneDrop,
    removeFieldFromZone,
    addCustomMetric
}: CanvasSidebarProps) {
    const [activePanel, setActivePanel] = useState<SidebarPanel>("layout");
    const [isFieldsOpen, setIsFieldsOpen] = useState(true);
    const [calculationName, setCalculationName] = useState("");
    const [calculationFormat, setCalculationFormat] = useState<"number" | "percent">("number");
    const [formulaTokens, setFormulaTokens] = useState<CustomMetricExpressionToken[]>([]);
    const [isFormulaDropActive, setIsFormulaDropActive] = useState(false);
    const [builderError, setBuilderError] = useState<string | null>(null);

    const allFields = useMemo(() => getAvailablePivotFields(customMetrics), [customMetrics]);
    const savedMetricFields = allFields.filter((field) => isCustomMetricFieldId(field.id));
    const standardFields = allFields.filter((field) => !isCustomMetricFieldId(field.id));

    function toggleCalculationsPanel() {
        setActivePanel((current) => (current === "calculations" ? null : "calculations"));
    }

    function toggleLayoutPanel() {
        setActivePanel((current) => (current === "layout" ? null : "layout"));
    }

    function appendFieldToFormula(fieldId: PivotFieldId) {
        const field = getFieldDefinition(fieldId, customMetrics);
        if (field.kind !== "measure") {
            setBuilderError("Only metric fields can be used in calculations.");
            return;
        }

        let nextError: string | null = null;
        setFormulaTokens((current) => {
            const lastToken = current[current.length - 1];
            if (lastToken?.type === "field") {
                nextError = "Select an operator before dropping the next metric.";
                return current;
            }

            nextError = null;
            return [...current, { type: "field", fieldId }];
        });
        setBuilderError(nextError);
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

    function appendOperatorToFormula(operator: CustomMetricOperator) {
        let nextError: string | null = null;
        setFormulaTokens((current) => {
            if (current.length === 0) {
                nextError = "Drop a metric first.";
                return current;
            }

            const lastToken = current[current.length - 1];
            if (lastToken?.type === "operator") {
                nextError = null;
                return [...current.slice(0, -1), { type: "operator", operator }];
            }

            nextError = null;
            return [...current, { type: "operator", operator }];
        });
        setBuilderError(nextError);
    }

    function removeFormulaToken(tokenIndex: number) {
        setFormulaTokens((current) => {
            const nextTokens = current.filter((_, index) => index !== tokenIndex);

            if (nextTokens[0]?.type === "operator") {
                nextTokens.shift();
            }

            if (nextTokens[nextTokens.length - 1]?.type === "operator") {
                nextTokens.pop();
            }

            return nextTokens.filter((token, index) => {
                if (token.type === "field") {
                    return index % 2 === 0;
                }

                return index % 2 === 1;
            });
        });
        setBuilderError(null);
    }

    function handleSaveMetric() {
        const nextName = calculationName.trim();

        if (
            !nextName ||
            formulaTokens.length < 3 ||
            formulaTokens[0]?.type !== "field" ||
            formulaTokens[formulaTokens.length - 1]?.type !== "field"
        ) {
            setBuilderError("Name the metric and build a valid formula first.");
            return;
        }

        addCustomMetric({
            name: nextName,
            tokens: formulaTokens,
            format: calculationFormat
        });

        setCalculationName("");
        setCalculationFormat("number");
        setFormulaTokens([]);
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
                                                {getFieldDefinition(fieldId, customMetrics).label}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFieldFromZone(fieldId, zone.id)}
                                            className="rounded-full p-0.5 text-slate-500 transition hover:text-ink"
                                            aria-label={`Remove ${getFieldDefinition(fieldId, customMetrics).label}`}
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
                            <div className="rounded-[10px] border border-slate-200/70 bg-white/80 px-3 py-2">
                                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Core fields
                                </p>
                                <div className="mt-2">
                                    {standardFields.map((field) => (
                                        <FieldListItem
                                            key={field.id}
                                            field={field}
                                            customMetrics={customMetrics}
                                            setActiveDrag={setActiveDrag}
                                            setDropIndicator={setDropIndicator}
                                            clearDragState={clearDragState}
                                        />
                                    ))}
                                </div>
                            </div>

                            {savedMetricFields.length > 0 ? (
                                <div className="mt-3 rounded-[10px] border border-slate-200/70 bg-white/80 px-3 py-2">
                                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        Saved metrics
                                    </p>
                                    <div className="mt-2">
                                        {savedMetricFields.map((field) => (
                                            <FieldListItem
                                                key={field.id}
                                                field={field}
                                                customMetrics={customMetrics}
                                                setActiveDrag={setActiveDrag}
                                                setDropIndicator={setDropIndicator}
                                                clearDragState={clearDragState}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
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
                                <div className="space-y-3">
                                    <div
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            setIsFormulaDropActive(true);
                                        }}
                                        onDragLeave={() => setIsFormulaDropActive(false)}
                                        onDrop={handleFormulaDrop}
                                        className={`min-h-[132px] -mx-1 -mt-2 pb-2 transition ${
                                            isFormulaDropActive ? "bg-slate-50/70" : ""
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <p className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                Formula
                                            </p>
                                            <span className="h-4 w-px shrink-0 bg-slate-200" aria-hidden="true" />
                                            <p className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                Save
                                            </p>
                                            <input
                                                value={calculationName}
                                                onChange={(event) => setCalculationName(event.target.value)}
                                                placeholder="......................"
                                                className="h-8 min-w-0 flex-1 bg-transparent px-0 font-medium text-ink outline-none transition placeholder:text-slate-300"
                                            />
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setCalculationFormat("number")}
                                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[0.68rem] font-semibold transition ${
                                                        calculationFormat === "number"
                                                            ? "bg-slate-900 text-white"
                                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    }`}
                                                    aria-pressed={calculationFormat === "number"}
                                                    aria-label="Use number format"
                                                >
                                                    123
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCalculationFormat("percent")}
                                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[0.9rem] font-semibold leading-none transition ${
                                                        calculationFormat === "percent"
                                                            ? "bg-slate-900 text-white"
                                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    }`}
                                                    aria-pressed={calculationFormat === "percent"}
                                                    aria-label="Use percent format"
                                                >
                                                    %
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveMetric}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-ink"
                                                    aria-label="Save formula"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-2 h-px w-full bg-slate-100" aria-hidden="true" />
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {formulaTokens.length > 0 ? (
                                                formulaTokens.map((token, tokenIndex) => (
                                                    <FormulaTokenChip
                                                        key={`formula-token:${tokenIndex}`}
                                                        token={token}
                                                        customMetrics={customMetrics}
                                                        onRemove={() => removeFormulaToken(tokenIndex)}
                                                    />
                                                ))
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="px-1 py-1">
                                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            Operator
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-4">
                                            {CUSTOM_METRIC_OPERATORS.map((operator) => (
                                                <button
                                                    key={operator}
                                                    type="button"
                                                    onClick={() => appendOperatorToFormula(operator)}
                                                    className="text-[1.35rem] font-semibold leading-none text-ink transition hover:text-slate-500"
                                                >
                                                    {operator}
                                                </button>
                                            ))}
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
    );
}
