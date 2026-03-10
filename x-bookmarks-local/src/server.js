const fs = require("fs/promises");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const { clearSavedSession, hasSavedSession, loginAndSaveSession } = require("./auth");
const { runImport } = require("./importer");
const { mergeBookmarks } = require("./bookmark-utils");
const { PUBLIC_DIR } = require("./paths");
const {
    ensureDataDir,
    loadAuthStatus,
    loadBookmarks,
    loadStatus,
    saveAuthStatus,
    saveBookmarks,
    saveStatus
} = require("./store");

const PORT = Number(process.env.PORT) || 3888;
const HOST = process.env.HOST || "127.0.0.1";

const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
};

let currentImportPromise = null;
let currentAuthPromise = null;

function sendJson(response, statusCode, value) {
    const content = JSON.stringify(value, null, 2);

    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(content);
}

function sendText(response, statusCode, value) {
    response.writeHead(statusCode, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(value);
}

function setCorsHeaders(response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

async function readRequestBody(request) {
    let body = "";
    const maxBytes = 5 * 1024 * 1024;

    for await (const chunk of request) {
        body += chunk;

        if (body.length > maxBytes) {
            throw new Error("Request body too large.");
        }
    }

    if (!body) {
        return {};
    }

    return JSON.parse(body);
}

async function serveStaticFile(response, filePath) {
    try {
        const content = await fs.readFile(filePath);
        const extension = path.extname(filePath);

        response.writeHead(200, {
            "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
            "Cache-Control": "no-store"
        });
        response.end(content);
    } catch (error) {
        if (error.code === "ENOENT") {
            sendText(response, 404, "Not found");
            return;
        }

        throw error;
    }
}

async function handleApiRequest(request, response, url) {
    if (request.method === "OPTIONS") {
        setCorsHeaders(response);
        response.writeHead(204);
        response.end();
        return true;
    }

    if (request.method === "GET" && url.pathname === "/api/bookmarks") {
        setCorsHeaders(response);
        const store = await loadBookmarks();
        sendJson(response, 200, store);
        return true;
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
        setCorsHeaders(response);
        const [status, store] = await Promise.all([
            loadStatus(),
            loadBookmarks()
        ]);

        sendJson(response, 200, {
            ...status,
            totalCount: store.bookmarks.length
        });
        return true;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/status") {
        setCorsHeaders(response);
        const status = await loadAuthStatus();
        sendJson(response, 200, {
            ...status,
            hasSession: hasSavedSession()
        });
        return true;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
        setCorsHeaders(response);
        if (currentAuthPromise) {
            const status = await loadAuthStatus();
            sendJson(response, 202, status);
            return true;
        }

        const body = await readRequestBody(request);

        currentAuthPromise = loginAndSaveSession({
            username: body.username,
            password: body.password,
            secondaryIdentifier: body.secondaryIdentifier,
            verificationCode: body.verificationCode
        }, {
            updateStatus: saveAuthStatus
        }).finally(() => {
            currentAuthPromise = null;
        });

        currentAuthPromise.catch((error) => {
            console.error("Auth failed:", error);
        });

        const status = await loadAuthStatus();
        sendJson(response, 202, {
            ...status,
            hasSession: hasSavedSession()
        });
        return true;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        setCorsHeaders(response);
        if (currentAuthPromise) {
            sendJson(response, 409, {
                error: "Auth is already running."
            });
            return true;
        }

        const status = await clearSavedSession();
        sendJson(response, 200, {
            ...status,
            hasSession: hasSavedSession()
        });
        return true;
    }

    if (request.method === "POST" && url.pathname === "/api/import/browser") {
        setCorsHeaders(response);
        const body = await readRequestBody(request);
        const incomingBookmarks = Array.isArray(body.bookmarks) ? body.bookmarks : [];
        const existingStore = await loadBookmarks();
        const mergedBookmarks = mergeBookmarks(existingStore.bookmarks, incomingBookmarks);
        const importedCount = mergedBookmarks.length - existingStore.bookmarks.length;

        await saveBookmarks(mergedBookmarks);
        await saveStatus({
            state: "idle",
            phase: "complete",
            message: `${incomingBookmarks.length} bookmark browser import ile alindi.`,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            importedCount: incomingBookmarks.length,
            totalCount: mergedBookmarks.length,
            error: null
        });

        sendJson(response, 200, {
            receivedCount: incomingBookmarks.length,
            importedCount,
            totalCount: mergedBookmarks.length
        });
        return true;
    }

    if (request.method === "POST" && url.pathname === "/api/import") {
        setCorsHeaders(response);
        if (currentAuthPromise) {
            sendJson(response, 409, {
                error: "Auth is running. Wait until login finishes."
            });
            return true;
        }

        if (currentImportPromise) {
            const status = await loadStatus();
            sendJson(response, 202, status);
            return true;
        }

        const body = await readRequestBody(request);
        await saveStatus({
            state: "running",
            phase: "queued",
            message: "Import baslatiliyor...",
            startedAt: new Date().toISOString(),
            finishedAt: null,
            importedCount: 0,
            error: null
        });

        currentImportPromise = runImport({
            maxItems: body.maxItems,
            updateStatus: saveStatus
        }).finally(() => {
            currentImportPromise = null;
        });

        currentImportPromise.catch((error) => {
            console.error("Import failed:", error);
        });

        const status = await loadStatus();
        sendJson(response, 202, status);
        return true;
    }

    return false;
}

async function createServer(options = {}) {
    await ensureDataDir();
    const importStatus = await loadStatus();
    const authStatus = await loadAuthStatus();
    const host = options.host || HOST;
    const port = Number(options.port ?? PORT);

    if (importStatus.state === "running") {
        await saveStatus({
            state: "idle",
            phase: "idle",
            message: "Server yeniden basladi.",
            finishedAt: new Date().toISOString(),
            error: null
        });
    }

    if (authStatus.state === "running") {
        await saveAuthStatus({
            state: "idle",
            phase: "idle",
            message: "Server yeniden basladi.",
            finishedAt: new Date().toISOString(),
            error: null,
            hasSession: hasSavedSession()
        });
    }

    const server = http.createServer(async (request, response) => {
        try {
            const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
            const handledApiRequest = await handleApiRequest(request, response, url);

            if (handledApiRequest) {
                return;
            }

            const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
            const filePath = path.join(PUBLIC_DIR, pathname);

            if (!filePath.startsWith(PUBLIC_DIR)) {
                sendText(response, 403, "Forbidden");
                return;
            }

            await serveStaticFile(response, filePath);
        } catch (error) {
            console.error(error);
            sendJson(response, 500, {
                error: error.message
            });
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
            server.off("error", reject);
            resolve();
        });
    });

    return server;
}

async function startServer() {
    const server = await createServer();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : PORT;

    console.log(`X Bookmarks Local running at http://${HOST}:${port}`);
    return server;
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    createServer,
    startServer
};
