import test from "node:test";
import assert from "node:assert/strict";
import { analyzeInventoryRecords } from "../dist/backend/src/usecases/analyzeInventoryRecords.js";
import { buildInventoryTransferPlan } from "../dist/backend/src/usecases/buildInventoryTransferPlan.js";
import { processInventoryUpload } from "../dist/backend/src/usecases/processInventoryUpload.js";

test("analyzeInventoryRecords validates raw payloads before analysis", () => {
    const result = analyzeInventoryRecords({
        records: [
            {
                warehouseName: "Ankara",
                productCode: "SKU-11",
                productName: "Sneaker",
                salesQty: "120,5",
                returnQty: "20,5",
                inventory: "75"
            }
        ]
    });

    assert.equal(result.overview.totalProducts, 1);
    assert.equal(result.overview.totalInventory, 75);
    assert.equal(result.overview.totalNetSales, 100);
    assert.equal(result.records[0].productCode, "SKU-11");
});

test("buildInventoryTransferPlan validates raw payloads before planning transfers", () => {
    const suggestions = buildInventoryTransferPlan({
        records: [
            {
                warehouseName: "Ankara",
                productCode: "SKU-22",
                productName: "Boot",
                color: "Black",
                size: "42",
                gender: "Unisex",
                salesQty: "20",
                returnQty: "0",
                inventory: "40"
            },
            {
                warehouseName: "Izmir",
                productCode: "SKU-22",
                productName: "Boot",
                color: "Black",
                size: "42",
                gender: "Unisex",
                salesQty: "18",
                returnQty: "0",
                inventory: "2"
            }
        ]
    });

    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].fromWarehouseName, "Ankara");
    assert.equal(suggestions[0].toWarehouseName, "Izmir");
    assert.equal(suggestions[0].quantity, 10);
    assert.equal(suggestions[0].demandGap, 16);
});

test("processInventoryUpload parses CSV and returns parsed metadata", () => {
    const result = processInventoryUpload({
        fileName: "inventory.csv",
        buffer: Buffer.from(
            [
                "\"warehouse name\"\"sku\"\"product name\"\"sales qty\"\"return qty\"\"inventory\"",
                "\"Istanbul\"\"SKU-33\"\"Coat\"\"15\"\"2\"\"18\""
            ].join("\n"),
            "utf8"
        )
    });

    assert.equal(result.source, "api");
    assert.equal(result.parsed.fileName, "inventory.csv");
    assert.equal(result.parsed.rowCount, 1);
    assert.ok(Array.isArray(result.parsed.columns));
    assert.ok(result.parsed.columns.length > 0);
});

test("processInventoryUpload returns column metadata with key/label/type", () => {
    const result = processInventoryUpload({
        fileName: "inventory.csv",
        buffer: Buffer.from(
            [
                "\"warehouse name\"\"sku\"\"product name\"\"sales qty\"\"return qty\"\"inventory\"",
                "\"Ankara\"\"SKU-44\"\"Jacket\"\"20\"\"2\"\"48\"",
                "\"Izmir\"\"SKU-44\"\"Jacket\"\"18\"\"0\"\"3\""
            ].join("\n"),
            "utf8"
        )
    });

    assert.equal(result.source, "api");
    assert.equal(result.parsed.rowCount, 2);
    // Columns are ColumnMeta objects with key, label, type
    for (const col of result.parsed.columns) {
        assert.ok("key" in col, "column should have key");
        assert.ok("label" in col, "column should have label");
        assert.ok("type" in col, "column should have type");
    }
});
