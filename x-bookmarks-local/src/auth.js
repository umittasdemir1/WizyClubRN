const fs = require("fs");
const fsp = require("fs/promises");

const { chromium } = require("playwright");

const { resolveBrowserLaunchOptions } = require("./browser");
const { STORAGE_STATE_FILE } = require("./paths");
const { saveAuthStatus } = require("./store");
const { X_BOOKMARKS_URL, waitForBookmarksPage } = require("./x-bookmarks-page");

const X_LOGIN_URL = "https://x.com/i/flow/login";

function hasSavedSession() {
    return fs.existsSync(STORAGE_STATE_FILE);
}

async function clearSavedSession() {
    await fsp.rm(STORAGE_STATE_FILE, {
        force: true
    });

    return saveAuthStatus({
        state: "idle",
        phase: "idle",
        message: "Session temizlendi.",
        error: null,
        finishedAt: new Date().toISOString(),
        hasSession: false
    });
}

async function clickButtonByNames(page, names) {
    for (const name of names) {
        const button = page.getByRole("button", {
            name: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i")
        }).first();

        if (await button.count()) {
            await button.click();
            return true;
        }
    }

    return false;
}

async function fillFirstVisible(locatorList, value) {
    for (const locator of locatorList) {
        if (await locator.count()) {
            await locator.first().fill(value);
            return true;
        }
    }

    return false;
}

async function performHeadlessLogin(page, credentials, updateStatus) {
    await page.goto(X_LOGIN_URL, {
        waitUntil: "domcontentloaded"
    });

    await updateStatus({
        state: "running",
        phase: "username",
        message: "X kullanici bilgisi giriliyor..."
    });

    const usernameFilled = await fillFirstVisible([
        page.locator("input[autocomplete='username']"),
        page.locator("input[name='text']"),
        page.locator("input[type='text']"),
        page.locator("input[type='email']")
    ], credentials.username);

    if (!usernameFilled) {
        throw new Error("X login ekraninda kullanici alani bulunamadi.");
    }

    if (!(await clickButtonByNames(page, ["Next", "Ileri"]))) {
        await page.keyboard.press("Enter");
    }

    await page.waitForTimeout(1500);

    const passwordInput = page.locator("input[name='password'], input[type='password']").first();
    if (!(await passwordInput.count())) {
        const challengeInput = page.locator("input[name='text'], input[type='text'], input[type='tel']").first();

        if (await challengeInput.count()) {
            await updateStatus({
                state: "running",
                phase: "secondary_identifier",
                message: "X ek kullanici dogrulamasi istiyor..."
            });

            await challengeInput.fill(credentials.secondaryIdentifier || credentials.username);

            if (!(await clickButtonByNames(page, ["Next", "Ileri"]))) {
                await page.keyboard.press("Enter");
            }

            await page.waitForTimeout(1500);
        }
    }

    if (!(await passwordInput.count())) {
        throw new Error("Sifre alani gorunmedi. X login akisi beklenenden farkli olabilir.");
    }

    await updateStatus({
        state: "running",
        phase: "password",
        message: "Sifre gonderiliyor..."
    });

    await passwordInput.fill(credentials.password);

    if (!(await clickButtonByNames(page, ["Log in", "Sign in", "Giris yap"]))) {
        await page.keyboard.press("Enter");
    }

    await page.waitForTimeout(2000);

    const verificationInput = page.locator("input[name='text'], input[inputmode='numeric']").first();
    if (await verificationInput.count()) {
        const pageText = (await page.locator("body").innerText()).toLowerCase();

        if (
            pageText.includes("verification code") ||
            pageText.includes("authentication code") ||
            pageText.includes("two-factor")
        ) {
            if (!credentials.verificationCode) {
                throw new Error("X iki adimli dogrulama kodu istiyor. Verification code alanini doldur.");
            }

            await updateStatus({
                state: "running",
                phase: "verification_code",
                message: "Dogrulama kodu gonderiliyor..."
            });

            await verificationInput.fill(credentials.verificationCode);

            if (!(await clickButtonByNames(page, ["Next", "Verify", "Onayla"]))) {
                await page.keyboard.press("Enter");
            }
        }
    }
}

async function loginAndSaveSession(credentials, options = {}) {
    const updateStatus = options.updateStatus || saveAuthStatus;
    let browser = null;
    let context = null;

    if (!credentials.username || !credentials.password) {
        throw new Error("Username ve password zorunlu.");
    }

    await updateStatus({
        state: "running",
        phase: "launching",
        message: "Headless X login basliyor...",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        error: null,
        hasSession: hasSavedSession()
    });

    try {
        browser = await chromium.launch({
            ...resolveBrowserLaunchOptions(),
            headless: true
        });

        context = await browser.newContext({
            viewport: {
                width: 1440,
                height: 1080
            }
        });

        const page = await context.newPage();
        await performHeadlessLogin(page, credentials, updateStatus);
        await page.goto(X_BOOKMARKS_URL, {
            waitUntil: "domcontentloaded"
        });

        await waitForBookmarksPage(page, {
            updateStatus,
            interactiveLoginAllowed: false,
            loginTimeoutMs: 45_000,
            loginRequiredMessage: "Headless login tamamlanamadi. Giris bilgileri gecersiz ya da ek dogrulama gerekiyor."
        });

        await context.storageState({
            path: STORAGE_STATE_FILE
        });

        await updateStatus({
            state: "idle",
            phase: "saved",
            message: "Session kaydedildi. Artik headless import calisabilir.",
            finishedAt: new Date().toISOString(),
            error: null,
            hasSession: true
        });

        return {
            hasSession: true
        };
    } catch (error) {
        await updateStatus({
            state: "error",
            phase: "failed",
            message: "Headless login basarisiz oldu.",
            finishedAt: new Date().toISOString(),
            error: error.message,
            hasSession: hasSavedSession()
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
    hasSavedSession,
    clearSavedSession,
    loginAndSaveSession
};
