const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const test = require("node:test");

test("browser import endpoint stores and merges incoming bookmarks", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "x-bookmarks-local-"));
    process.env.X_BOOKMARKS_LOCAL_DATA_DIR = tempDir;

    const serverPath = require.resolve("../src/server");
    const pathsPath = require.resolve("../src/paths");
    const storePath = require.resolve("../src/store");
    delete require.cache[serverPath];
    delete require.cache[pathsPath];
    delete require.cache[storePath];

    const { createServer } = require("../src/server");
    const server = await createServer({ host: "127.0.0.1", port: 0 });
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
        const response = await fetch(`${baseUrl}/api/import/browser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                bookmarks: [
                    {
                        tweetUrl: "https://x.com/example/status/1",
                        text: "same tweet"
                    },
                    {
                        tweetUrl: "https://x.com/example/status/1",
                        text: "same tweet updated",
                        externalLinks: ["https://example.com/post"]
                    }
                ]
            })
        });
        const payload = await response.json();
        const bookmarkStore = JSON.parse(
            await fs.readFile(path.join(tempDir, "bookmarks.json"), "utf8")
        );

        assert.equal(response.status, 200);
        assert.equal(payload.receivedCount, 2);
        assert.equal(payload.importedCount, 1);
        assert.equal(payload.totalCount, 1);
        assert.equal(bookmarkStore.bookmarks.length, 1);
        assert.equal(bookmarkStore.bookmarks[0].text, "same tweet updated");
        assert.deepEqual(bookmarkStore.bookmarks[0].externalLinks, ["https://example.com/post"]);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
        delete process.env.X_BOOKMARKS_LOCAL_DATA_DIR;
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});
