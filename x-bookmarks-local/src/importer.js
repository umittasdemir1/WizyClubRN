const fs = require("fs");

const { chromium } = require("playwright");

const { resolveBrowserLaunchOptions } = require("./browser");
const { mergeBookmarks } = require("./bookmark-utils");
const { STORAGE_STATE_FILE } = require("./paths");
const { loadBookmarks, saveBookmarks, saveStatus } = require("./store");
const { X_BOOKMARKS_URL, waitForBookmarksPage, collectBookmarks } = require("./x-bookmarks-page");

function getNumberOption(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasSavedSession() {
    return fs.existsSync(STORAGE_STATE_FILE);
}

function buildImportOptions(options = {}) {
    return {
        maxItems: getNumberOption(options.maxItems, 400),
        scrollPauseMs: getNumberOption(options.scrollPauseMs, 1200),
        stallLimit: getNumberOption(options.stallLimit, 10),
        loginTimeoutMs: getNumberOption(options.loginTimeoutMs, 45_000),
        headless: options.headless !== false
    };
}

async function runImport(options = {}) {
    const importOptions = buildImportOptions(options);
    const updateStatus = options.updateStatus || saveStatus;
    let browser = null;
    let context = null;

    await updateStatus({
        state: "running",
        phase: "launching",
        message: "Headless import tarayicisi aciliyor...",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        importedCount: 0,
        error: null
    });

    try {
        if (!hasSavedSession()) {
            throw new Error("Session bulunamadi. Once Login & Save Session yap.");
        }

        browser = await chromium.launch({
            ...resolveBrowserLaunchOptions(),
            headless: importOptions.headless
        });

        context = await browser.newContext({
            storageState: STORAGE_STATE_FILE,
            viewport: {
                width: 1440,
                height: 1080
            }
        });

        const page = await context.newPage();

        await page.goto(X_BOOKMARKS_URL, {
            waitUntil: "domcontentloaded"
        });

        const pageState = await waitForBookmarksPage(page, {
            updateStatus,
            interactiveLoginAllowed: false,
            loginTimeoutMs: importOptions.loginTimeoutMs,
            loginRequiredMessage: "Kayitli session gecersiz veya suresi dolmus. Tekrar Login & Save Session yap."
        });

        if (pageState === "empty") {
            const existingStore = await loadBookmarks();

            await updateStatus({
                state: "idle",
                phase: "complete",
                message: "Bookmarks bos gorunuyor.",
                finishedAt: new Date().toISOString(),
                importedCount: 0,
                totalCount: existingStore.bookmarks.length,
                error: null
            });

            return {
                importedCount: 0,
                totalCount: existingStore.bookmarks.length
            };
        }

        const importedBookmarks = await collectBookmarks(page, importOptions, updateStatus);
        const existingStore = await loadBookmarks();
        const mergedBookmarks = mergeBookmarks(existingStore.bookmarks, importedBookmarks);

        await saveBookmarks(mergedBookmarks);
        await context.storageState({
            path: STORAGE_STATE_FILE
        });

        await updateStatus({
            state: "idle",
            phase: "complete",
            message: `${importedBookmarks.length} bookmark ice aktarildi.`,
            finishedAt: new Date().toISOString(),
            importedCount: importedBookmarks.length,
            totalCount: mergedBookmarks.length,
            error: null
        });

        return {
            importedCount: importedBookmarks.length,
            totalCount: mergedBookmarks.length
        };
    } catch (error) {
        await updateStatus({
            state: "error",
            phase: "failed",
            message: "Import basarisiz oldu.",
            finishedAt: new Date().toISOString(),
            error: error.message
        });
        throw error;
    } finally {
        if (context) {
            await context.close();
        }

        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    runImport
};
