export function toText(value: unknown, fallback = ""): string {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return fallback;
}

export function parseLocaleNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const cleaned = value.replace(/[^\d,.-]/g, "").trim();
        const normalized =
            cleaned.includes(",") && cleaned.includes(".")
                ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
                    ? cleaned.replace(/\./g, "").replace(",", ".")
                    : cleaned.replace(/,/g, "")
                : cleaned.replace(",", ".");
        // Parse normalized (locale-aware) first; fall back to raw cleaned string
        const normalizedParsed = Number(normalized);
        if (Number.isFinite(normalizedParsed)) {
            return normalizedParsed;
        }

        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

export function resolveProductIdentity(productCodeValue: unknown, productNameValue: unknown) {
    const rawProductCode = toText(productCodeValue);
    const rawProductName = toText(productNameValue);

    if (!rawProductCode && !rawProductName) {
        return null;
    }

    const productCode = rawProductCode || rawProductName;
    const productName = rawProductName || productCode;

    return {
        productCode,
        productName
    };
}
