import * as XLSX from "xlsx";
import { normalizeInventoryRows } from "../utils/analysis";
import type { ParsedInventoryPayload } from "../types/stock";

export async function parseInventoryFile(file: File): Promise<ParsedInventoryPayload> {
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
