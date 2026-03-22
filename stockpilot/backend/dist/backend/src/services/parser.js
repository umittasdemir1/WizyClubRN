import * as XLSX from "xlsx";
// ── Date helpers ──────────────────────────────────────────────────────────────
function buildIsoDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day) {
        return null;
    }
    return date.toISOString().slice(0, 10);
}
function toIsoDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed)
            return buildIsoDate(parsed.y, parsed.m, parsed.d);
    }
    if (typeof value !== "string")
        return null;
    const text = value.trim();
    if (!text)
        return null;
    const isoMatch = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (isoMatch)
        return buildIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    // Strip trailing time component: "12.03.2026 00:00:00" → "12.03.2026"
    const dateOnlyText = text.replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, "").trim();
    const localeMatch = dateOnlyText.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (localeMatch) {
        const year = localeMatch[3].length === 2 ? Number(`20${localeMatch[3]}`) : Number(localeMatch[3]);
        return buildIsoDate(year, Number(localeMatch[2]), Number(localeMatch[1]));
    }
    const ts = Date.parse(dateOnlyText);
    if (Number.isFinite(ts))
        return new Date(ts).toISOString().slice(0, 10);
    return null;
}
function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const cleaned = value.replace(/[^\d,.-]/g, "").trim();
        if (!cleaned)
            return null;
        const normalized = cleaned.includes(",") && cleaned.includes(".")
            ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
                ? cleaned.replace(/\./g, "").replace(",", ".")
                : cleaned.replace(/,/g, "")
            : cleaned.replace(",", ".");
        const n = Number(normalized);
        if (Number.isFinite(n))
            return n;
    }
    return null;
}
// ── Column type detection ─────────────────────────────────────────────────────
function detectColumnType(values) {
    const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== "");
    if (nonEmpty.length === 0)
        return "text";
    const numericCount = nonEmpty.filter((v) => toFiniteNumber(v) !== null).length;
    if (numericCount / nonEmpty.length >= 0.8)
        return "numeric";
    const dateCount = nonEmpty.filter((v) => toIsoDate(v) !== null).length;
    if (dateCount / nonEmpty.length >= 0.8)
        return "date";
    return "text";
}
// ── Cell normalization ────────────────────────────────────────────────────────
function normalizeCell(value, type) {
    if (value === null || value === undefined || value === "")
        return null;
    if (type === "numeric") {
        const n = toFiniteNumber(value);
        return n !== null ? n : null;
    }
    if (type === "date") {
        return toIsoDate(value);
    }
    // text
    if (typeof value === "string")
        return value.trim() || null;
    if (typeof value === "number")
        return String(value);
    return String(value);
}
// ── Label helper ──────────────────────────────────────────────────────────────
function toLabel(key) {
    return key
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim();
}
// ── Core normalizer ───────────────────────────────────────────────────────────
export function normalizeGenericRows(rawRows, fileName) {
    if (rawRows.length === 0) {
        return { fileName, rowCount: 0, columns: [], rows: [] };
    }
    const keys = Array.from(new Set(rawRows.flatMap((row) => Object.keys(row))));
    const columns = keys.map((key) => {
        const colValues = rawRows.map((row) => row[key]);
        const type = detectColumnType(colValues);
        return { key, label: toLabel(key), type };
    });
    const columnTypeMap = new Map(columns.map((col) => [col.key, col.type]));
    const rows = rawRows.map((raw) => {
        const row = {};
        for (const col of columns) {
            row[col.key] = normalizeCell(raw[col.key], columnTypeMap.get(col.key));
        }
        return row;
    });
    return { fileName, rowCount: rows.length, columns, rows };
}
// ── CSV helpers ───────────────────────────────────────────────────────────────
function parseConcatenatedQuotedCsv(text) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0)
        return [];
    const toCells = (line) => {
        const trimmed = line.replace(/\r$/, "");
        if (!trimmed.startsWith("\"") || !trimmed.endsWith("\""))
            return [];
        return trimmed.slice(1, -1).split("\"\"");
    };
    const headers = toCells(lines[0]);
    if (headers.length <= 1)
        return [];
    return lines.slice(1).map((line) => {
        const values = toCells(line);
        return headers.reduce((row, header, index) => {
            row[header] = values[index] ?? "";
            return row;
        }, {});
    });
}
function decodeCsvText(buffer) {
    // Detect Windows-1254 (Turkish) encoding by checking for null bytes or
    // common high-byte sequences that are invalid in UTF-8
    const hasNullByte = buffer.includes(0x00);
    const hasHighByte = buffer.some((b) => b >= 0x80 && b <= 0x9f);
    if (hasNullByte || hasHighByte) {
        try {
            return new TextDecoder("windows-1254").decode(buffer);
        }
        catch {
            // Fall through to UTF-8
        }
    }
    return buffer.toString("utf8");
}
// ── Public entry point ────────────────────────────────────────────────────────
export function parseFileBuffer(buffer, fileName) {
    if (fileName.toLowerCase().endsWith(".csv")) {
        const text = decodeCsvText(buffer);
        const firstLine = text.split(/\r?\n/, 1)[0]?.trim() ?? "";
        const isConcatenatedQuotedCsv = firstLine.startsWith("\"") &&
            firstLine.includes("\"\"") &&
            !firstLine.includes(",") &&
            !firstLine.includes(";") &&
            !firstLine.includes("\t");
        if (isConcatenatedQuotedCsv) {
            return normalizeGenericRows(parseConcatenatedQuotedCsv(text), fileName);
        }
    }
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    return normalizeGenericRows(rows, fileName);
}
