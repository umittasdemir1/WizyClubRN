import {
    assertNever,
    DATE_CONSTANT_LABELS,
    METRIC_FUNCTION_ARITY,
    type CustomMetricBinaryOperator,
    type CustomMetricCommaToken,
    type CustomMetricConstantToken,
    type CustomMetricDateConstantToken,
    type CustomMetricExpressionToken,
    type CustomMetricFieldToken,
    type CustomMetricFormat,
    type CustomMetricFunctionToken,
    type CustomMetricOperator,
    type CustomMetricParenthesis,
    type CustomMetricParenthesisToken,
    type CustomMetricOperatorToken,
    type DateConstantFn,
    type MetricFunctionName,
    type PivotFieldId
} from "./types";

// ── Private helpers ───────────────────────────────────────────────────────────

function isCustomMetricOperator(value: unknown): value is CustomMetricOperator {
    return value === "+" || value === "-" || value === "*" || value === "/" || value === "=" || value === ">" || value === "<" || value === "%";
}

function isCustomMetricParenthesis(value: unknown): value is CustomMetricParenthesis {
    return value === "(" || value === ")";
}

function isBinaryCustomMetricOperator(operator: CustomMetricOperator): operator is CustomMetricBinaryOperator {
    return operator !== "%";
}

function applyMetricOperator(left: number, right: number, operator: CustomMetricBinaryOperator) {
    if (operator === "+") {
        return left + right;
    }

    if (operator === "-") {
        return left - right;
    }

    if (operator === "*") {
        return left * right;
    }

    if (operator === "=") {
        return Math.abs(left - right) < 1e-9 ? 1 : 0;
    }

    if (operator === ">") {
        return left > right ? 1 : 0;
    }

    if (operator === "<") {
        return left < right ? 1 : 0;
    }

    return right === 0 ? 0 : left / right;
}

export function toFiniteNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export const METRIC_FUNCTION_NAMES: MetricFunctionName[] = ["ROUND", "ABS", "MIN", "MAX", "IF"];
export const DATE_CONSTANT_FNS: DateConstantFn[] = ["TODAY", "DAY_OF_MONTH", "DAYS_IN_MONTH", "DAYS_ELAPSED", "DAYS_REMAINING", "YEAR"];

function getCustomMetricOperatorPrecedence(operator: CustomMetricOperator) {
    if (operator === "%") {
        return 4;
    }

    if (operator === "*" || operator === "/") {
        return 3;
    }

    if (operator === "+" || operator === "-") {
        return 2;
    }

    return 1;
}

type RPNOutputToken =
    | CustomMetricFieldToken
    | CustomMetricConstantToken
    | CustomMetricOperatorToken
    | CustomMetricDateConstantToken
    | CustomMetricFunctionToken;

type OperatorStackToken =
    | CustomMetricOperatorToken
    | CustomMetricParenthesisToken
    | CustomMetricFunctionToken;

// ── Public exports ────────────────────────────────────────────────────────────

export function normalizeExpressionTokens(tokens: CustomMetricExpressionToken[]) {
    return tokens.filter((token) => {
        if (token.type === "field") return true;
        if (token.type === "constant") return Number.isFinite(token.value);
        if (token.type === "operator") return isCustomMetricOperator(token.operator);
        if (token.type === "parenthesis") return isCustomMetricParenthesis(token.value);
        if (token.type === "date-constant") return DATE_CONSTANT_FNS.includes(token.fn);
        if (token.type === "function") return METRIC_FUNCTION_NAMES.includes(token.fn);
        if (token.type === "comma") return true;
        return false;
    });
}

function toReversePolishExpression(tokens: CustomMetricExpressionToken[]) {
    const normalizedTokens = normalizeExpressionTokens(tokens);
    if (normalizedTokens.length === 0) return null;

    const output: RPNOutputToken[] = [];
    const operatorStack: OperatorStackToken[] = [];
    let expectsValue = true;

    for (const token of normalizedTokens) {
        // Values
        if (token.type === "field" || token.type === "constant" || token.type === "date-constant") {
            if (!expectsValue) return null;
            output.push(token);
            expectsValue = false;
            continue;
        }

        // Function: push to operator stack, next token must be (
        if (token.type === "function") {
            if (!expectsValue) return null;
            operatorStack.push(token);
            continue;
        }

        // Parentheses
        if (token.type === "parenthesis") {
            if (token.value === "(") {
                if (!expectsValue) return null;
                operatorStack.push(token);
                continue;
            }

            if (expectsValue) return null;

            let foundOpen = false;
            while (operatorStack.length > 0) {
                const top = operatorStack.pop()!;
                if (top.type === "parenthesis" && top.value === "(") {
                    foundOpen = true;
                    break;
                }
                if (top.type === "operator") output.push(top);
            }

            if (!foundOpen) return null;

            // If top is a function, pop it to output
            if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === "function") {
                output.push(operatorStack.pop() as CustomMetricFunctionToken);
            }

            expectsValue = false;
            continue;
        }

        // Comma: argument separator
        if (token.type === "comma") {
            if (expectsValue) return null;
            while (operatorStack.length > 0) {
                const top = operatorStack[operatorStack.length - 1];
                if (top.type === "parenthesis") break;
                output.push(operatorStack.pop() as CustomMetricOperatorToken);
            }
            expectsValue = true;
            continue;
        }

        // % unary postfix
        if (token.operator === "%") {
            if (expectsValue) return null;

            while (operatorStack.length > 0) {
                const top = operatorStack[operatorStack.length - 1];
                if (top.type !== "operator") break;
                if (getCustomMetricOperatorPrecedence(top.operator) < getCustomMetricOperatorPrecedence(token.operator)) break;
                output.push(operatorStack.pop() as CustomMetricOperatorToken);
            }

            operatorStack.push(token);
            expectsValue = false;
            continue;
        }

        // Binary operators
        if (expectsValue || !isBinaryCustomMetricOperator(token.operator)) return null;

        while (operatorStack.length > 0) {
            const top = operatorStack[operatorStack.length - 1];
            if (top.type !== "operator") break;
            if (getCustomMetricOperatorPrecedence(top.operator) < getCustomMetricOperatorPrecedence(token.operator)) break;
            output.push(operatorStack.pop() as CustomMetricOperatorToken);
        }

        operatorStack.push(token);
        expectsValue = true;
    }

    if (expectsValue) return null;

    while (operatorStack.length > 0) {
        const top = operatorStack.pop()!;
        if (top.type === "parenthesis") return null;
        output.push(top as RPNOutputToken);
    }

    return output;
}

export function isValidCustomMetricExpression(tokens: CustomMetricExpressionToken[]) {
    return toReversePolishExpression(tokens) !== null;
}

export function evaluateDateConstant(fn: DateConstantFn): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    switch (fn) {
        case "TODAY": return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        case "DAY_OF_MONTH": return day;
        case "DAYS_ELAPSED": return day;
        case "DAYS_IN_MONTH": return new Date(year, month + 1, 0).getDate();
        case "DAYS_REMAINING": return new Date(year, month + 1, 0).getDate() - day;
        case "YEAR": return year;
        default: return assertNever(fn);
    }
}

function applyMetricFunction(fn: MetricFunctionName, args: number[]): number {
    const a = args[0] ?? 0;
    const b = args[1] ?? 0;
    const c = args[2] ?? 0;
    switch (fn) {
        case "ABS": return Math.abs(a);
        case "ROUND": return Math.round(a * Math.pow(10, b)) / Math.pow(10, b);
        case "MIN": return Math.min(a, b);
        case "MAX": return Math.max(a, b);
        case "IF": return a !== 0 ? b : c;
        default: return assertNever(fn);
    }
}

export function evaluateCustomMetricTokens(
    tokens: CustomMetricExpressionToken[],
    resolveFieldValue: (fieldId: PivotFieldId, visited: Set<PivotFieldId>) => number,
    visited: Set<PivotFieldId>
) {
    const reversePolishTokens = toReversePolishExpression(tokens);
    if (!reversePolishTokens) return 0;

    const stack: number[] = [];

    for (const token of reversePolishTokens) {
        if (token.type === "field") {
            stack.push(resolveFieldValue(token.fieldId, visited));
            continue;
        }

        if (token.type === "constant") {
            stack.push(token.value);
            continue;
        }

        if (token.type === "date-constant") {
            stack.push(evaluateDateConstant(token.fn));
            continue;
        }

        if (token.type === "function") {
            const arity = METRIC_FUNCTION_ARITY[token.fn];
            const args: number[] = [];
            for (let i = 0; i < arity; i++) {
                const val = stack.pop();
                if (val === undefined) return 0;
                args.unshift(val);
            }
            stack.push(applyMetricFunction(token.fn, args));
            continue;
        }

        if (token.operator === "%") {
            const value = stack.pop();
            if (value === undefined) return 0;
            stack.push(value / 100);
            continue;
        }

        const right = stack.pop();
        const left = stack.pop();
        if (left === undefined || right === undefined) return 0;
        stack.push(applyMetricOperator(left, right, token.operator));
    }

    return stack.length === 1 ? toFiniteNumber(stack[0]) : 0;
}

export function formatCustomMetricOperatorLabel(operator: CustomMetricOperator) {
    return operator === "*" ? "x" : operator;
}

// Re-export for use by fields.ts / pivot.ts that need to check token types
export { isCustomMetricOperator, isCustomMetricParenthesis };

// Export the unused type reference to silence linter if needed
export type { CustomMetricFormat };
