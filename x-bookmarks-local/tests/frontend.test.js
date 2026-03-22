const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const test = require("node:test");

test("public app script parses as valid JavaScript", async () => {
    const source = await fs.readFile(
        path.join(__dirname, "..", "public", "app.js"),
        "utf8"
    );

    assert.doesNotThrow(() => {
        new Function(source);
    });
});
