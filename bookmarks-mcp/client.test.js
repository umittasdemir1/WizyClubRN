const assert = require("node:assert/strict");
const test = require("node:test");

const {
    buildRpcRequest,
    normalizeLimit,
    normalizeRowId,
    normalizeString,
    parseEnvFile
} = require("./client");

test("parseEnvFile reads simple key value pairs", () => {
    const env = parseEnvFile([
        "SUPABASE_URL=https://example.supabase.co",
        "BOOKMARKS_TEST_KEY=\"placeholder\"",
        "# comment",
        ""
    ].join("\n"));

    assert.equal(env.SUPABASE_URL, "https://example.supabase.co");
    assert.equal(env.BOOKMARKS_TEST_KEY, "placeholder");
});

test("normalize helpers clamp and sanitize inputs", () => {
    assert.equal(normalizeString(" hello "), "hello");
    assert.equal(normalizeString("   "), null);
    assert.equal(normalizeLimit(120, 10, 50), 50);
    assert.equal(normalizeLimit("oops", 10, 50), 10);
    assert.equal(normalizeRowId("42"), 42);
    assert.equal(normalizeRowId("0"), null);
});

test("buildRpcRequest formats REST RPC request", () => {
    const request = buildRpcRequest(
        "https://example.supabase.co/",
        "service-role",
        "bookmarks_search_bookmarks",
        { search_query: "mcp", result_limit: 5 }
    );

    assert.equal(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/bookmarks_search_bookmarks"
    );
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers.apikey, "service-role");
    assert.match(request.options.body, /"search_query":"mcp"/);
});
