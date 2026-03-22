import { parseFileBuffer } from "../services/parser.js";
export function processInventoryUpload({ buffer, fileName }) {
    const { columns, rows, rowCount } = parseFileBuffer(buffer, fileName);
    return {
        parsed: { fileName, rowCount, columns },
        analysis: { fileName, columns, rows, rowCount },
        source: "api"
    };
}
