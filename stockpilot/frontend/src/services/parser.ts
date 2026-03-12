import * as XLSX from "xlsx";
import { normalizeInventoryRows } from "../utils/analysis";
import type { ParsedInventoryPayload } from "../types/stock";

function parseConcatenatedQuotedCsv(text: string): Record<string, unknown>[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return [];
    }

    const toCells = (line: string) => {
        const trimmed = line.replace(/\r$/, "");
        if (!trimmed.startsWith("\"") || !trimmed.endsWith("\"")) {
            return [];
        }

        return trimmed.slice(1, -1).split("\"\"");
    };

    const headers = toCells(lines[0]);
    if (headers.length <= 1) {
        return [];
    }

    return lines.slice(1).map((line) => {
        const values = toCells(line);
        return headers.reduce<Record<string, unknown>>((row, header, index) => {
            row[header] = values[index] ?? "";
            return row;
        }, {});
    });
}

export async function parseInventoryFile(file: File): Promise<ParsedInventoryPayload> {
    if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const firstLine = text.split(/\r?\n/, 1)[0]?.trim() ?? "";
        const isConcatenatedQuotedCsv =
            firstLine.startsWith("\"") &&
            firstLine.includes("\"\"") &&
            !firstLine.includes(",") &&
            !firstLine.includes(";") &&
            !firstLine.includes("\t");

        if (isConcatenatedQuotedCsv) {
            return normalizeInventoryRows(parseConcatenatedQuotedCsv(text), file.name);
        }
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: false
    });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: ""
    });

    return normalizeInventoryRows(rows, file.name);
}
