import * as XLSX from "xlsx";
import type { ColumnMeta, ColumnType, GenericRow } from "../types/stock";

export interface ParsedFileResult {
    fileName: string;
    rowCount: number;
    columns: ColumnMeta[];
    rows: GenericRow[];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function buildIsoDate(year: number, month: number, day: number): string | null {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return date.toISOString().slice(0, 10);
}

export function toIsoDate(value: unknown): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) return buildIsoDate(parsed.y, parsed.m, parsed.d);
    }

    if (typeof value !== "string") return null;

    const text = value.trim();
    if (!text) return null;

    const isoMatch = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (isoMatch) return buildIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

    // Strip trailing time component: "12.03.2026 00:00:00" → "12.03.2026"
    const dateOnlyText = text.replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, "").trim();

    const localeMatch = dateOnlyText.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (localeMatch) {
        const year = localeMatch[3].length === 2 ? Number(`20${localeMatch[3]}`) : Number(localeMatch[3]);
        return buildIsoDate(year, Number(localeMatch[2]), Number(localeMatch[1]));
    }

    const ts = Date.parse(dateOnlyText);
    if (Number.isFinite(ts)) return new Date(ts).toISOString().slice(0, 10);

    return null;
}

export function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const cleaned = value.replace(/[^\d,.-]/g, "").trim();
        if (!cleaned) return null;
        const normalized =
            cleaned.includes(",") && cleaned.includes(".")
                ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
                    ? cleaned.replace(/\./g, "").replace(",", ".")
                    : cleaned.replace(/,/g, "")
                : cleaned.replace(",", ".");
        const n = Number(normalized);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

// ── Column type detection ─────────────────────────────────────────────────────

function detectColumnType(values: unknown[]): ColumnType {
    const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== "");
    if (nonEmpty.length === 0) return "text";

    const numericCount = nonEmpty.filter((v) => toFiniteNumber(v) !== null).length;
    if (numericCount / nonEmpty.length >= 0.8) return "numeric";

    const dateCount = nonEmpty.filter((v) => toIsoDate(v) !== null).length;
    if (dateCount / nonEmpty.length >= 0.8) return "date";

    return "text";
}

function normalizeCell(value: unknown, type: ColumnType): string | number | null {
    if (value === null || value === undefined || value === "") return null;

    if (type === "numeric") {
        const n = toFiniteNumber(value);
        return n !== null ? n : null;
    }

    if (type === "date") return toIsoDate(value);

    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "number") return String(value);
    return String(value);
}

function toLabel(key: string): string {
    return key
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim();
}

// ── Core normalizer ───────────────────────────────────────────────────────────

export function normalizeGenericRows(
    rawRows: Record<string, unknown>[],
    fileName: string
): ParsedFileResult {
    if (rawRows.length === 0) {
        return { fileName, rowCount: 0, columns: [], rows: [] };
    }

    const keys = Array.from(new Set(rawRows.flatMap((row) => Object.keys(row))));

    const columns: ColumnMeta[] = keys.map((key) => {
        const colValues = rawRows.map((row) => row[key]);
        return { key, label: toLabel(key), type: detectColumnType(colValues) };
    });

    const columnTypeMap = new Map(columns.map((col) => [col.key, col.type]));

    const rows: GenericRow[] = rawRows.map((raw) => {
        const row: GenericRow = {};
        for (const col of columns) {
            row[col.key] = normalizeCell(raw[col.key], columnTypeMap.get(col.key)!);
        }
        return row;
    });

    return { fileName, rowCount: rows.length, columns, rows };
}
