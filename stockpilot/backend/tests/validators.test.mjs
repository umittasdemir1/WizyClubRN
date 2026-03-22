import test from "node:test";
import assert from "node:assert/strict";
import { ensureInventoryRecords } from "../dist/backend/src/utils/validators.js";

test("ensureInventoryRecords normalizes locale-sensitive numbers from API payloads", () => {
    const records = ensureInventoryRecords([
        {
            warehouseName: "Bursa",
            productCode: "SKU-3",
            productName: "Bag",
            salesQty: "1.050,75",
            returnQty: "10,50",
            inventory: "500,25"
        }
    ]);

    assert.equal(records[0].salesQty, 1050.75);
    assert.equal(records[0].returnQty, 10.5);
    assert.equal(records[0].inventory, 500.25);
});

test("ensureInventoryRecords rejects records without product identity", () => {
    assert.throws(
        () =>
            ensureInventoryRecords([
                {
                    warehouseName: "Bursa",
                    productCode: "",
                    productName: ""
                }
            ]),
        /must include productCode or productName/
    );
});
