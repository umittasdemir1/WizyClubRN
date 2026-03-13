import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInventoryRows } from "../dist/backend/src/services/parser.js";

test("normalizeInventoryRows parses locale-sensitive numeric strings", () => {
    const payload = normalizeInventoryRows(
        [
            {
                warehouse_name: "Ankara",
                product_code: "SKU-1",
                product_name: "Sneaker",
                sales_qty: "1.234,56",
                return_qty: "12,25",
                inventory: "2.345,00"
            }
        ],
        "inventory.csv"
    );

    assert.equal(payload.rowCount, 1);
    assert.equal(payload.records[0].salesQty, 1234.56);
    assert.equal(payload.records[0].returnQty, 12.25);
    assert.equal(payload.records[0].inventory, 2345);
});

test("normalizeInventoryRows ignores rows without product code and name", () => {
    const payload = normalizeInventoryRows(
        [
            {
                warehouse_name: "Istanbul",
                product_code: "",
                product_name: ""
            },
            {
                warehouse_name: "Izmir",
                product_code: "SKU-2",
                product_name: "Tee"
            }
        ],
        "inventory.csv"
    );

    assert.equal(payload.rowCount, 1);
    assert.deepEqual(
        payload.records.map((record) => record.productCode),
        ["SKU-2"]
    );
});
