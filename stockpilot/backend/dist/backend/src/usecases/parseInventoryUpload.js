import { parseFileBuffer } from "../services/parser.js";
export function parseInventoryUpload({ buffer, fileName }) {
    return parseFileBuffer(buffer, fileName);
}
