import { useState, useRef, type DragEvent, type KeyboardEvent, type RefObject } from "react";
import {
    getFieldDefinition,
    isValidCustomMetricExpression,
    type CustomMetricBinaryOperator,
    type CustomMetricDefinition,
    type CustomMetricFormat,
    type CustomMetricId,
    type CustomMetricExpressionToken,
    type CustomMetricParenthesis,
    type DateConstantFn,
    type MetricFunctionName,
    type PivotFieldId
} from "./canvasModel";
import type { ColumnMeta } from "../../types/stock";

export function useCustomMetricBuilder(
    columns: ColumnMeta[],
    customMetrics: CustomMetricDefinition[],
    addCustomMetric: (value: Omit<CustomMetricDefinition, "id">) => CustomMetricDefinition,
    deleteCustomMetric: (id: CustomMetricId) => void,
    onSuccess: () => void
) {
    const [calculationName, setCalculationName] = useState("");
    const [calculationFormat, setCalculationFormat] = useState<CustomMetricFormat>("integer");
    const [formulaTokens, setFormulaTokens] = useState<CustomMetricExpressionToken[]>([]);
    const [isFormulaDropActive, setIsFormulaDropActive] = useState(false);
    const [builderError, setBuilderError] = useState<string | null>(null);
    const [manualInputValue, setManualInputValue] = useState("");
    const [isInputFocused, setIsInputFocused] = useState(false);
    const manualInputRef = useRef<HTMLInputElement>(null);

    function getLastFormulaToken(tokens: CustomMetricExpressionToken[] = formulaTokens) {
        return tokens[tokens.length - 1];
    }

    function getOpenParenthesisCount(tokens: CustomMetricExpressionToken[] = formulaTokens) {
        return tokens.reduce((count, token) => {
            if (token.type !== "parenthesis") return count;
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
        setFormulaTokens((current) => {
            if (!canAppendValueToken(current)) {
                setBuilderError("Select an operator before dropping the next metric.");
                return current;
            }
            setBuilderError(null);
            return [...current, { type: "field", fieldId }];
        });
        manualInputRef.current?.focus();
    }

    function onFormulaDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const fieldId = event.dataTransfer.getData("text/stockpilot-field") as PivotFieldId;
        setIsFormulaDropActive(false);
        if (fieldId) appendFieldToFormula(fieldId);
    }

    function onCommitManualInput() {
        const value = parseFloat(manualInputValue);
        if (isNaN(value)) return;
        if (!canAppendValueToken()) {
            setBuilderError("Add an operator before this number.");
            return;
        }
        setFormulaTokens((current) => [...current, { type: "constant", value }]);
        setManualInputValue("");
        setBuilderError(null);
    }

    function onManualInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            event.preventDefault();
            onCommitManualInput();
        } else if (event.key === "Backspace" && manualInputValue === "" && formulaTokens.length > 0) {
            setFormulaTokens((current) => current.slice(0, -1));
            setBuilderError(null);
        }
    }

    function onSaveMetric() {
        onCommitManualInput();
        const name = calculationName.trim();
        if (!name) { setBuilderError("Enter a name for this calculation."); return; }
        if (formulaTokens.length === 0) { setBuilderError("Enter a formula."); return; }
        if (!isValidCustomMetricExpression(formulaTokens)) { setBuilderError("The formula is incomplete or invalid."); return; }
        
        addCustomMetric({ name, format: calculationFormat, tokens: formulaTokens });
        setCalculationName("");
        setCalculationFormat("integer");
        setFormulaTokens([]);
        setBuilderError(null);
        onSuccess();
    }

    const canSave = calculationName.trim() !== "" && formulaTokens.length > 0 && isValidCustomMetricExpression(formulaTokens);

    return {
        calculationName, setCalculationName,
        calculationFormat, setCalculationFormat,
        formulaTokens, setFormulaTokens,
        isFormulaDropActive, setIsFormulaDropActive,
        builderError, setBuilderError,
        manualInputValue, setManualInputValue,
        isInputFocused, setIsInputFocused,
        manualInputRef,
        canSave,
        onFormulaDrop,
        onCommitManualInput,
        onManualInputKeyDown,
        onSaveMetric,
        onDeleteLastToken: () => setFormulaTokens((prev) => prev.slice(0, -1)),
        onAppendBinaryOperator: (operator: CustomMetricBinaryOperator) => {
            if (!isResolvedFormulaValueToken(getLastFormulaToken())) {
                setBuilderError("Add a metric or number before this operator.");
                return;
            }
            setFormulaTokens((current) => [...current, { type: "operator", operator }]);
            setBuilderError(null);
        },
        onAppendPercent: () => {
            if (!isResolvedFormulaValueToken(getLastFormulaToken())) {
                setBuilderError("Add a metric or number before this operator.");
                return;
            }
            setFormulaTokens((current) => [...current, { type: "operator", operator: "%" }]);
            setBuilderError(null);
        },
        onAppendParenthesis: (value: CustomMetricParenthesis) => {
            if (value === "(") {
                if (!canAppendValueToken()) { setBuilderError("Add an operator before this parenthesis."); return; }
            } else {
                if (getOpenParenthesisCount() === 0) { setBuilderError("No open parenthesis to close."); return; }
                if (!isResolvedFormulaValueToken(getLastFormulaToken())) { setBuilderError("Complete the expression inside the parenthesis first."); return; }
            }
            setFormulaTokens((current) => [...current, { type: "parenthesis", value }]);
            setBuilderError(null);
        },
        onAppendComma: () => {
            if (!isResolvedFormulaValueToken(getLastFormulaToken())) { setBuilderError("Add a metric or number before this comma."); return; }
            setFormulaTokens((current) => [...current, { type: "comma" }]);
            setBuilderError(null);
        },
        onAppendDateConstant: (fn: DateConstantFn) => {
            if (!canAppendValueToken()) { setBuilderError("Add an operator before this constant."); return; }
            setFormulaTokens((current) => [...current, { type: "date-constant", fn }]);
            setBuilderError(null);
        },
        onAppendFunction: (fn: MetricFunctionName) => {
            if (!canAppendValueToken()) { setBuilderError("Add an operator before this function."); return; }
            setFormulaTokens((current) => [...current, { type: "function", fn }, { type: "parenthesis", value: "(" }]);
            setBuilderError(null);
        },
        loadMetricForEdit: (metric: CustomMetricDefinition) => {
            setCalculationName(metric.name);
            setCalculationFormat(metric.format);
            setFormulaTokens(metric.tokens);
            setBuilderError(null);
            deleteCustomMetric(metric.id);
        }
    };
}
