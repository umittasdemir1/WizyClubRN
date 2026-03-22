const assert = require("node:assert/strict");
const test = require("node:test");

const {
    extractTweetIdFromUrl,
    mergeBookmarks
} = require("../src/bookmark-utils");

test("extractTweetIdFromUrl reads ids from x.com and twitter.com", () => {
    assert.equal(extractTweetIdFromUrl("https://x.com/example/status/12345"), "12345");
    assert.equal(extractTweetIdFromUrl("https://twitter.com/example/status/99999?s=20"), "99999");
    assert.equal(extractTweetIdFromUrl("https://example.com/not-a-tweet"), null);
});

test("mergeBookmarks deduplicates by tweet id and preserves first import date", () => {
    const existing = [
        {
            tweetId: "1",
            tweetUrl: "https://x.com/a/status/1",
            text: "old text",
            firstImportedAt: "2026-03-09T10:00:00.000Z",
            lastSeenAt: "2026-03-09T10:00:00.000Z"
        }
    ];

    const incoming = [
        {
            tweetId: "1",
            tweetUrl: "https://x.com/a/status/1",
            text: "new text",
            externalLinks: ["https://example.com/post"],
            createdAt: "2026-03-01T08:00:00.000Z"
        },
        {
            tweetId: "2",
            tweetUrl: "https://x.com/b/status/2",
            text: "second",
            createdAt: "2026-03-10T09:00:00.000Z"
        }
    ];

    const merged = mergeBookmarks(existing, incoming, "2026-03-10T10:00:00.000Z");

    assert.equal(merged.length, 2);
    assert.equal(merged[0].tweetId, "2");
    assert.equal(merged[1].text, "new text");
    assert.equal(merged[1].firstImportedAt, "2026-03-09T10:00:00.000Z");
    assert.deepEqual(merged[1].externalLinks, ["https://example.com/post"]);
});
