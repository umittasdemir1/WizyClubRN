// 4.3: Consistent error reporting utility
// Use this instead of ad-hoc console.error calls throughout the codebase.

type ErrorSeverity = "warn" | "error";

export function reportError(context: string, error: unknown, severity: ErrorSeverity = "error") {
    const message = error instanceof Error ? error.message : String(error);
    if (severity === "warn") {
        console.warn(`[${context}]`, message, error);
    } else {
        console.error(`[${context}]`, message, error);
    }
}
