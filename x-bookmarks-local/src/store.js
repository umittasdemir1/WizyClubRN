const fs = require("fs/promises");

const {
    DATA_DIR,
    AUTH_STATUS_FILE,
    BOOKMARKS_FILE,
    STATUS_FILE
} = require("./paths");

const EMPTY_BOOKMARK_STORE = {
    version: 1,
    updatedAt: null,
    bookmarks: []
};

const DEFAULT_STATUS = {
    state: "idle",
    phase: "idle",
    message: "Ready",
    startedAt: null,
    finishedAt: null,
    importedCount: 0,
    totalCount: 0,
    error: null
};

const DEFAULT_AUTH_STATUS = {
    state: "idle",
    phase: "idle",
    message: "Session yok.",
    startedAt: null,
    finishedAt: null,
    error: null,
    hasSession: false
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile(filePath, fallbackValue) {
    try {
        const content = await fs.readFile(filePath, "utf8");
        return JSON.parse(content);
    } catch (error) {
        if (error.code === "ENOENT") {
            return clone(fallbackValue);
        }

        throw error;
    }
}

async function writeJsonFile(filePath, value) {
    await ensureDataDir();

    const tempFilePath = `${filePath}.tmp`;
    const content = `${JSON.stringify(value, null, 2)}\n`;

    await fs.writeFile(tempFilePath, content, "utf8");
    await fs.rename(tempFilePath, filePath);
}

async function loadBookmarks() {
    const store = await readJsonFile(BOOKMARKS_FILE, EMPTY_BOOKMARK_STORE);

    if (!Array.isArray(store.bookmarks)) {
        return clone(EMPTY_BOOKMARK_STORE);
    }

    return {
        version: 1,
        updatedAt: store.updatedAt || null,
        bookmarks: store.bookmarks
    };
}

async function saveBookmarks(bookmarks) {
    const payload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        bookmarks
    };

    await writeJsonFile(BOOKMARKS_FILE, payload);
    return payload;
}

async function loadStatus() {
    const status = await readJsonFile(STATUS_FILE, DEFAULT_STATUS);
    return {
        ...clone(DEFAULT_STATUS),
        ...status
    };
}

async function saveStatus(partialStatus) {
    const currentStatus = await loadStatus();
    const nextStatus = {
        ...clone(DEFAULT_STATUS),
        ...currentStatus,
        ...partialStatus
    };

    await writeJsonFile(STATUS_FILE, nextStatus);
    return nextStatus;
}

async function loadAuthStatus() {
    const status = await readJsonFile(AUTH_STATUS_FILE, DEFAULT_AUTH_STATUS);
    return {
        ...clone(DEFAULT_AUTH_STATUS),
        ...status
    };
}

async function saveAuthStatus(partialStatus) {
    const currentStatus = await loadAuthStatus();
    const nextStatus = {
        ...clone(DEFAULT_AUTH_STATUS),
        ...currentStatus,
        ...partialStatus
    };

    await writeJsonFile(AUTH_STATUS_FILE, nextStatus);
    return nextStatus;
}

module.exports = {
    ensureDataDir,
    loadBookmarks,
    saveBookmarks,
    loadAuthStatus,
    loadStatus,
    saveAuthStatus,
    saveStatus,
    EMPTY_BOOKMARK_STORE,
    DEFAULT_AUTH_STATUS,
    DEFAULT_STATUS
};
