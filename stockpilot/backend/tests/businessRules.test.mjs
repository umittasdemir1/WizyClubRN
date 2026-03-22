import test from "node:test";
import assert from "node:assert/strict";
import { analyzeInventory } from "../dist/backend/src/services/analyzer.js";
import { buildTransferPlan } from "../dist/backend/src/services/transfer.js";

function getBaseRecord() {
    return {
        warehouseName: "Main Warehouse",
        productCode: "TEST-SKU",
        productName: "Test Product",
        color: "Black",
        size: "M",
        gender: "U",
        salesQty: 0,
        returnQty: 0,
        inventory: 0,
        productionYear: 2024,
        lastSaleDate: null,
        firstStockEntryDate: null,
        firstSaleDate: null,
    };
}

test("Analysis Rules: item with no inventory and no sales is healthy", () => {
    const record = getBaseRecord();
    const result = analyzeInventory([record]);
    assert.equal(result.records[0].lifecycleStatus, "healthy");
});

test("Analysis Rules: item with high inventory and no sales is stagnant", () => {
    const record = getBaseRecord();
    record.inventory = 10;
    const result = analyzeInventory([record]);
    assert.equal(result.records[0].lifecycleStatus, "stagnant");
});

test("Analysis Rules: returns are subtracted from gross sales for lifecycle checks", () => {
    const record = getBaseRecord();
    record.salesQty = 10;
    record.returnQty = 10;
    record.inventory = 10; // Net sales is 0, inventory > 0 -> stagnant
    const result = analyzeInventory([record]);
    assert.equal(result.records[0].lifecycleStatus, "stagnant");
});

test("Analysis Rules: item with recent sales and balanced inventory is healthy", () => {
    const record = getBaseRecord();
    record.salesQty = 20;
    record.inventory = 10; 
    // Net sales 20. demandFloor = 20. Inventory 10 is < demandFloor * 1.5 (30).
    const result = analyzeInventory([record]);
    assert.equal(result.records[0].lifecycleStatus, "healthy");
});

test("Transfer Rules: transfer transfers from surplus to deficit", () => {
    const donor = getBaseRecord();
    donor.warehouseName = "Donor";
    donor.salesQty = 10; // target inventory: 15
    donor.inventory = 35; // surplus: 20

    const receiver = getBaseRecord();
    receiver.warehouseName = "Receiver";
    receiver.salesQty = 10; // demand target: 10
    receiver.inventory = 0; // deficit: 10

    const suggestions = buildTransferPlan([donor, receiver]);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].fromWarehouseName, "Donor");
    assert.equal(suggestions[0].toWarehouseName, "Receiver");
    assert.equal(suggestions[0].quantity, 10);
});

test("Transfer Rules: transfer handles partial fulfillment", () => {
    const donor = getBaseRecord();
    donor.warehouseName = "Donor";
    donor.salesQty = 10; // target: 15
    donor.inventory = 20; // surplus: 5

    const receiver = getBaseRecord();
    receiver.warehouseName = "Receiver";
    receiver.salesQty = 10; // demand: 10
    receiver.inventory = 0; // deficit: 10

    const suggestions = buildTransferPlan([donor, receiver]);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].quantity, 5);
});
