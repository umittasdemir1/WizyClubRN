export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(value || 0);
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
    }).format(value || 0);
}

export function formatPercent(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    }).format(Number.isFinite(value) ? value : 0);
}

export function formatNullableDate(value: string | null): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}
