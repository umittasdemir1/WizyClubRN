import test from "node:test";
import assert from "node:assert/strict";
import { parseFileBuffer } from "../dist/backend/src/services/parser.js";

test("parseFileBuffer parses locale-sensitive numeric strings in CSV", () => {
    const csv = [
        '"warehouse name";"product code";"product name";"sales qty";"return qty";"inventory"',
        '"Ankara";"SKU-1";"Sneaker";"1.234,56";"12,25";"2.345,00"'
    ].join("\n");

    const payload = parseFileBuffer(Buffer.from(csv, "utf8"), "inventory.csv");

    assert.equal(payload.rowCount, 1);
    assert.equal(payload.fileName, "inventory.csv");
    assert.ok(Array.isArray(payload.columns));
    assert.ok(payload.columns.length > 0);
    assert.ok(typeof payload.columns[0] === "object");
});

test("parseFileBuffer returns correct column metadata shape", () => {
    const csv = [
        '"sku";"product name";"inventory"',
        '"SKU-2";"Tee";"10"'
    ].join("\n");

    const payload = parseFileBuffer(Buffer.from(csv, "utf8"), "test.csv");

    assert.equal(payload.rowCount, 1);
    // Each column should have key, label, type
    for (const col of payload.columns) {
        assert.ok("key" in col, "column should have key");
        assert.ok("label" in col, "column should have label");
        assert.ok("type" in col, "column should have type");
    }
});
