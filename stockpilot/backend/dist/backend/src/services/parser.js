import * as XLSX from "xlsx";
import { parseLocaleNumber, resolveProductIdentity, toText } from "../../../shared/normalization.js";
const HEADER_ALIASES = {
    warehouseName: ["warehouse_name", "warehouse name", "depo adı", "depo adi"],
    productCode: ["product_code", "product code", "sku", "stock code", "ürün kodu", "urun kodu"],
    productName: ["product_name", "product name", "ürün adı", "urun adi", "ürün adi"],
    color: ["color", "renk açıklaması", "renk aciklamasi", "renk"],
    size: ["size", "beden"],
    gender: ["gender", "cinsiyet açıklama", "cinsiyet aciklama", "cinsiyet"],
    salesQty: ["sales_qty", "sales qty", "sales quantity", "satis", "satış", "satış miktar"],
    returnQty: ["return_qty", "return qty", "return quantity", "iade miktar", "iade miktari", "iade"],
    inventory: ["inventory", "stock", "on hand", "envanter"],
    productionYear: ["production_year", "production year", "yıl açıklama", "yil aciklama", "yıl", "yil"],
    lastSaleDate: ["last_sale_date", "last sale date", "son satış tarihi", "son satis tarihi"],
    firstStockEntryDate: [
        "first_stock_entry_date",
        "first stock entry date",
        "ilk alış tarihi",
        "ilk alis tarihi",
        "first buy date"
    ],
    firstSaleDate: ["first_sale_date", "first sale date", "ilk satış tarihi", "ilk satis tarihi"]
};
function normalizeHeader(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[ıİ]/g, "i")
        .replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u")
        .replace(/[şŞ]/g, "s")
        .replace(/[öÖ]/g, "o")
        .replace(/[çÇ]/g, "c")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}
function findColumn(row, aliases) {
    const keys = Object.keys(row);
    for (const key of keys) {
        const normalized = normalizeHeader(key);
        if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
            return row[key];
        }
    }
    return undefined;
}
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
        if (parsed) {
            return buildIsoDate(parsed.y, parsed.m, parsed.d);
        }
    }
    if (typeof value !== "string") {
        return null;
    }
    const text = value.trim();
    if (!text) {
        return null;
    }
    const isoMatch = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (isoMatch) {
        return buildIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }
    const localeMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (localeMatch) {
        const year = localeMatch[3].length === 2 ? Number(`20${localeMatch[3]}`) : Number(localeMatch[3]);
        return buildIsoDate(year, Number(localeMatch[2]), Number(localeMatch[1]));
    }
    const timestamp = Date.parse(text);
    if (Number.isFinite(timestamp)) {
        return new Date(timestamp).toISOString().slice(0, 10);
    }
    return null;
}
function toYear(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        const year = Math.trunc(value);
        return year >= 1900 && year <= 2100 ? year : null;
    }
    if (typeof value !== "string") {
        return null;
    }
    const text = value.trim();
    if (!text) {
        return null;
    }
    const match = text.match(/\b(19|20)\d{2}\b/);
    if (!match) {
        return null;
    }
    return Number(match[0]);
}
function parseConcatenatedQuotedCsv(text) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0) {
        return [];
    }
    const toCells = (line) => {
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
        return headers.reduce((row, header, index) => {
            row[header] = values[index] ?? "";
            return row;
        }, {});
    });
}
function decodeCsvText(buffer) {
    const utf8 = buffer.toString("utf8");
    if (!utf8.includes("�")) {
        return utf8;
    }
    try {
        return new TextDecoder("windows-1254").decode(buffer);
    }
    catch {
        return utf8;
    }
}
export function normalizeInventoryRows(rows, fileName) {
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const records = rows
        .map((row) => {
        const productIdentity = resolveProductIdentity(findColumn(row, HEADER_ALIASES.productCode), findColumn(row, HEADER_ALIASES.productName));
        if (!productIdentity) {
            return null;
        }
        return {
            warehouseName: toText(findColumn(row, HEADER_ALIASES.warehouseName), "Main Warehouse"),
            productCode: productIdentity.productCode,
            productName: productIdentity.productName,
            color: toText(findColumn(row, HEADER_ALIASES.color), "Unknown"),
            size: toText(findColumn(row, HEADER_ALIASES.size), "Unknown"),
            gender: toText(findColumn(row, HEADER_ALIASES.gender), "Unspecified"),
            salesQty: Math.max(parseLocaleNumber(findColumn(row, HEADER_ALIASES.salesQty)), 0),
            returnQty: Math.max(parseLocaleNumber(findColumn(row, HEADER_ALIASES.returnQty)), 0),
            inventory: Math.max(parseLocaleNumber(findColumn(row, HEADER_ALIASES.inventory)), 0),
            productionYear: toYear(findColumn(row, HEADER_ALIASES.productionYear)),
            lastSaleDate: toIsoDate(findColumn(row, HEADER_ALIASES.lastSaleDate)),
            firstStockEntryDate: toIsoDate(findColumn(row, HEADER_ALIASES.firstStockEntryDate)),
            firstSaleDate: toIsoDate(findColumn(row, HEADER_ALIASES.firstSaleDate))
        };
    })
        .filter((record) => record !== null);
    return {
        fileName,
        columns,
        rowCount: records.length,
        records
    };
}
export function parseInventoryBuffer(buffer, fileName) {
    if (fileName.toLowerCase().endsWith(".csv")) {
        const text = decodeCsvText(buffer);
        const firstLine = text.split(/\r?\n/, 1)[0]?.trim() ?? "";
        const isConcatenatedQuotedCsv = firstLine.startsWith("\"") &&
            firstLine.includes("\"\"") &&
            !firstLine.includes(",") &&
            !firstLine.includes(";") &&
            !firstLine.includes("\t");
        if (isConcatenatedQuotedCsv) {
            return normalizeInventoryRows(parseConcatenatedQuotedCsv(text), fileName);
        }
    }
    const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: false
    });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: ""
    });
    return normalizeInventoryRows(rows, fileName);
}
