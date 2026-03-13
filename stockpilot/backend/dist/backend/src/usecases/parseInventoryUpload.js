import { parseInventoryBuffer } from "../services/parser.js";
export function parseInventoryUpload({ buffer, fileName }) {
    return parseInventoryBuffer(buffer, fileName);
}
