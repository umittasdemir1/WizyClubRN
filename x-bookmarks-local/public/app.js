const TRUSTED_X_ORIGINS = new Set([
    "https://x.com",
    "https://www.x.com",
    "https://twitter.com",
    "https://www.twitter.com"
]);

const elements = {
    authUsername: document.querySelector("#auth-username"),
    authPassword: document.querySelector("#auth-password"),
    authSecondary: document.querySelector("#auth-secondary"),
    authCode: document.querySelector("#auth-code"),
    authLoginButton: document.querySelector("#auth-login-button"),
    authClearButton: document.querySelector("#auth-clear-button"),
    authMessage: document.querySelector("#auth-message"),
    importButton: document.querySelector("#import-button"),
    browserScript: document.querySelector("#browser-script"),
    copyScriptButton: document.querySelector("#copy-script-button"),
    maxItems: document.querySelector("#max-items"),
    searchInput: document.querySelector("#search-input"),
    storedCount: document.querySelector("#stored-count"),
    lastImportCount: document.querySelector("#last-import-count"),
    statusPhase: document.querySelector("#status-phase"),
    statusMessage: document.querySelector("#status-message"),
    statusMeta: document.querySelector("#status-meta"),
    bookmarkList: document.querySelector("#bookmark-list"),
    bookmarkTemplate: document.querySelector("#bookmark-template")
};

const state = {
    authStatus: null,
    bookmarks: [],
    status: null,
    query: ""
};

let bridgeImportPromise = null;

function isTrustedXOrigin(origin) {
    return TRUSTED_X_ORIGINS.has(origin);
}

function formatDate(value) {
    if (!value) {
        return "Unknown date";
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(value));
}

function filteredBookmarks() {
    const query = state.query.trim().toLowerCase();

    if (!query) {
        return state.bookmarks;
    }

    return state.bookmarks.filter((bookmark) => {
        return [
            bookmark.text,
            bookmark.rawText,
            bookmark.authorHandle,
            bookmark.authorName,
            ...(bookmark.externalLinks || [])
        ]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query));
    });
}

function buildBrowserImportScript() {
    const apiUrl = new URL("/api/import/browser", window.location.origin).toString();
    const bridgeUrl = new URL("/", window.location.origin).toString();
    const appOrigin = window.location.origin;
    const maxItems = Number(elements.maxItems?.value) || 400;

    return [
        "(() => {",
        `    const apiUrl = ${JSON.stringify(apiUrl)};`,
        `    const bridgeUrl = ${JSON.stringify(bridgeUrl)};`,
        `    const appOrigin = ${JSON.stringify(appOrigin)};`,
        `    const maxItems = ${maxItems};`,
        "    const scrollPauseMs = 1200;",
        "    const stallLimit = 10;",
        "    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
        "    let importResolved = false;",
        "",
        "    const normalizeUrl = (value) => {",
        "        if (typeof value !== \"string\" || !value.trim()) {",
        "            return null;",
        "        }",
        "",
        "        try {",
        "            const url = new URL(value.trim());",
        "            url.hash = \"\";",
        "            return url.toString();",
        "        } catch (error) {",
        "            return null;",
        "        }",
        "    };",
        "",
        "    const isXHost = (hostname) => {",
        "        const host = String(hostname || \"\").toLowerCase();",
        "        return host === \"x.com\" || host === \"www.x.com\" || host === \"twitter.com\" || host === \"www.twitter.com\";",
        "    };",
        "",
        "    const parseStatusInfo = (value) => {",
        "        const normalizedUrl = normalizeUrl(value);",
        "",
        "        if (!normalizedUrl) {",
        "            return null;",
        "        }",
        "",
        "        try {",
        "            const url = new URL(normalizedUrl);",
        "            const parts = url.pathname.split(\"/\").filter(Boolean);",
        "            const statusIndex = parts.indexOf(\"status\");",
        "",
        "            if (!isXHost(url.hostname) || statusIndex < 1 || !parts[statusIndex + 1]) {",
        "                return null;",
        "            }",
        "",
        "            return {",
        "                tweetUrl: normalizedUrl,",
        "                authorHandle: parts[statusIndex - 1] || null,",
        "                tweetId: parts[statusIndex + 1] || null",
        "            };",
        "        } catch (error) {",
        "            return null;",
        "        }",
        "    };",
        "",
        "    const getStatusInfo = (article) => {",
        "        const links = Array.from(article.querySelectorAll(\"a[href]\"))",
        "            .map((anchor) => parseStatusInfo(anchor.href))",
        "            .filter(Boolean);",
        "",
        "        return links[0] || null;",
        "    };",
        "",
        "    const getAuthorName = (article, authorHandle) => {",
        "        const handleText = authorHandle ? \"@\" + authorHandle : null;",
        "        const spans = Array.from(article.querySelectorAll(\"span\"))",
        "            .map((span) => span.textContent.trim())",
        "            .filter(Boolean);",
        "",
        "        return spans.find((text) => {",
        "            if (text === handleText || text.startsWith(\"@\")) {",
        "                return false;",
        "            }",
        "",
        "            return text !== \"...\" && text !== \"More\" && text !== \"·\";",
        "        }) || null;",
        "    };",
        "",
        "    const getExternalLinks = (article) => {",
        "        return Array.from(new Set(",
        "            Array.from(article.querySelectorAll(\"a[href]\"))",
        "                .map((anchor) => normalizeUrl(anchor.href))",
        "                .filter(Boolean)",
        "                .filter((href) => {",
        "                    const url = new URL(href);",
        "                    return !isXHost(url.hostname);",
        "                })",
        "        ));",
        "    };",
        "",
        "    const extractVisibleBookmarks = () => {",
        "        return Array.from(document.querySelectorAll(\"article\"))",
        "            .map((article) => {",
        "                const statusInfo = getStatusInfo(article);",
        "",
        "                if (!statusInfo) {",
        "                    return null;",
        "                }",
        "",
        "                const text = Array.from(article.querySelectorAll(\"[data-testid='tweetText']\"))",
        "                    .map((node) => node.innerText.trim())",
        "                    .filter(Boolean)",
        "                    .join(\"\\n\");",
        "",
        "                return {",
        "                    tweetId: statusInfo.tweetId,",
        "                    tweetUrl: statusInfo.tweetUrl,",
        "                    authorHandle: statusInfo.authorHandle,",
        "                    authorName: getAuthorName(article, statusInfo.authorHandle),",
        "                    text: text || null,",
        "                    rawText: article.innerText.trim() || null,",
        "                    createdAt: article.querySelector(\"time\")?.dateTime || null,",
        "                    externalLinks: getExternalLinks(article)",
        "                };",
        "            })",
        "            .filter(Boolean);",
        "    };",
        "",
        "    const collectBookmarks = async () => {",
        "        if (!isXHost(location.hostname) || !location.pathname.startsWith(\"/i/bookmarks\")) {",
        "            throw new Error(\"Scripti https://x.com/i/bookmarks sayfasinda calistir.\");",
        "        }",
        "",
        "        const collected = new Map();",
        "        let stallCount = 0;",
        "",
        "        while (collected.size < maxItems && stallCount < stallLimit) {",
        "            const visibleBookmarks = extractVisibleBookmarks();",
        "            const previousCount = collected.size;",
        "",
        "            for (const bookmark of visibleBookmarks) {",
        "                const key = bookmark.tweetId || bookmark.tweetUrl;",
        "",
        "                if (key) {",
        "                    collected.set(key, bookmark);",
        "                }",
        "            }",
        "",
        "            console.log(\"[x-bookmarks-local]\", \"visible total:\", collected.size);",
        "",
        "            if (collected.size === previousCount) {",
        "                stallCount += 1;",
        "            } else {",
        "                stallCount = 0;",
        "            }",
        "",
        "            if (collected.size >= maxItems || stallCount >= stallLimit) {",
        "                break;",
        "            }",
        "",
        "            window.scrollBy(0, window.innerHeight * 0.9);",
        "            await sleep(scrollPauseMs);",
        "        }",
        "",
        "        return Array.from(collected.values());",
        "    };",
        "",
        "    const openBridgeWindow = () => {",
        "        const bridgeWindow = window.open(bridgeUrl, \"xBookmarksLocalBridge\");",
        "",
        "        if (!bridgeWindow) {",
        "            throw new Error(\"Popup engellendi. App sayfasini ayri sekmede acip tekrar dene.\");",
        "        }",
        "",
        "        return bridgeWindow;",
        "    };",
        "",
        "    const waitForImportResult = (timeoutMs) => {",
        "        return new Promise((resolve, reject) => {",
        "            const timeoutId = window.setTimeout(() => {",
        "                cleanup();",
        "                reject(new Error(\"App bridge cevap vermedi. App sayfasinin acik oldugundan emin ol.\"));",
        "            }, timeoutMs);",
        "",
        "            const cleanup = () => {",
        "                importResolved = true;",
        "                window.clearTimeout(timeoutId);",
        "                window.removeEventListener(\"message\", onMessage);",
        "            };",
        "",
        "            const onMessage = (event) => {",
        "                if (event.origin !== appOrigin || !event.data || typeof event.data !== \"object\") {",
        "                    return;",
        "                }",
        "",
        "                if (event.data.type === \"x-bookmarks-local-import-result\") {",
        "                    cleanup();",
        "                    resolve(event.data.result);",
        "                    return;",
        "                }",
        "",
        "                if (event.data.type === \"x-bookmarks-local-import-error\") {",
        "                    cleanup();",
        "                    reject(new Error(event.data.error || \"Bridge import basarisiz.\"));",
        "                }",
        "            };",
        "",
        "            window.addEventListener(\"message\", onMessage);",
        "        });",
        "    };",
        "",
        "    const dispatchToBridge = async (bridgeWindow, bookmarks) => {",
        "        for (let attempt = 1; attempt <= 20 && !importResolved; attempt += 1) {",
        "            bridgeWindow.postMessage({",
        "                type: \"x-bookmarks-local-import\",",
        "                bookmarks",
        "            }, appOrigin);",
        "",
        "            console.log(\"[x-bookmarks-local]\", \"bridge dispatch attempt:\", attempt);",
        "            await sleep(1000);",
        "        }",
        "    };",
        "",
        "    collectBookmarks()",
        "        .then(async (bookmarks) => {",
        "            const bridgeWindow = openBridgeWindow();",
        "            const resultPromise = waitForImportResult(30000);",
        "",
        "            dispatchToBridge(bridgeWindow, bookmarks).catch((error) => {",
        "                console.warn(\"[x-bookmarks-local]\", error);",
        "            });",
        "",
        "            const result = await resultPromise;",
        "            console.log(\"[x-bookmarks-local]\", \"import tamam:\", result);",
        "            alert(\"Browser import tamam. Gelen: \" + result.receivedCount + \", yeni: \" + result.importedCount + \", toplam: \" + result.totalCount);",
        "        })",
        "        .catch((error) => {",
        "            console.error(\"[x-bookmarks-local]\", error);",
        "            alert(error.message);",
        "        });",
        "})();"
    ].join("\n");
}

async function copyBrowserScript() {
    const script = buildBrowserImportScript();
    elements.browserScript.value = script;

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(script);
        return;
    }

    elements.browserScript.focus();
    elements.browserScript.select();
    document.execCommand("copy");
}

function renderBookmarks() {
    const bookmarks = filteredBookmarks();
    elements.bookmarkList.innerHTML = "";

    if (!bookmarks.length) {
        const emptyState = document.createElement("article");
        emptyState.className = "empty-card";
        emptyState.textContent = state.bookmarks.length
            ? "Filtreye uyan bookmark yok."
            : "Henuz bookmark import edilmedi.";
        elements.bookmarkList.append(emptyState);
        return;
    }

    for (const bookmark of bookmarks) {
        const fragment = elements.bookmarkTemplate.content.cloneNode(true);

        fragment.querySelector(".author-name").textContent = bookmark.authorName || "Unknown author";
        fragment.querySelector(".author-handle").textContent = bookmark.authorHandle ? `@${bookmark.authorHandle}` : "Handle unavailable";
        fragment.querySelector(".bookmark-text").textContent = bookmark.text || bookmark.rawText || "No text captured";
        fragment.querySelector(".created-at").textContent = formatDate(bookmark.createdAt || bookmark.firstImportedAt);
        fragment.querySelector(".external-count").textContent = `${(bookmark.externalLinks || []).length} external link`;

        const link = fragment.querySelector(".open-link");
        link.href = bookmark.tweetUrl;

        elements.bookmarkList.append(fragment);
    }
}

function renderAuthStatus() {
    const authStatus = state.authStatus;

    if (!authStatus) {
        return;
    }

    const label = authStatus.hasSession
        ? "Session kayitli. Import hazir."
        : authStatus.error
            ? `${authStatus.message || "Auth error"} ${authStatus.error}`
            : authStatus.message || "Session yok.";

    elements.authMessage.textContent = label;

    const authRunning = authStatus.state === "running";
    elements.authLoginButton.disabled = authRunning || state.status?.state === "running";
    elements.authClearButton.disabled = authRunning;
    elements.authLoginButton.textContent = authRunning ? "Logging in..." : "Login & Save Session";
}

function renderImportStatus() {
    const status = state.status;

    if (!status) {
        return;
    }

    const phase = (status.phase || status.state || "idle").replaceAll("_", " ");

    elements.statusPhase.textContent = phase;
    elements.statusMessage.textContent = status.error
        ? `${status.message || "Error"} ${status.error}`
        : status.message || "Ready.";
    elements.statusMeta.textContent = [
        status.startedAt ? `Started: ${formatDate(status.startedAt)}` : null,
        status.finishedAt ? `Finished: ${formatDate(status.finishedAt)}` : null
    ].filter(Boolean).join(" | ");

    elements.lastImportCount.textContent = String(status.importedCount || 0);

    const importDisabled = status.state === "running" || !state.authStatus?.hasSession || state.authStatus?.state === "running";
    elements.importButton.disabled = importDisabled;
    elements.importButton.textContent = status.state === "running" ? "Import running..." : "Import from X";
}

function render() {
    elements.storedCount.textContent = String(state.bookmarks.length);
    if (elements.browserScript) {
        elements.browserScript.value = buildBrowserImportScript();
    }
    renderAuthStatus();
    renderImportStatus();
    renderBookmarks();
}

async function loadBookmarks() {
    const response = await fetch("/api/bookmarks", {
        cache: "no-store"
    });
    const payload = await response.json();
    state.bookmarks = Array.isArray(payload.bookmarks) ? payload.bookmarks : [];
}

async function loadStatus() {
    const response = await fetch("/api/status", {
        cache: "no-store"
    });
    state.status = await response.json();
}

async function loadAuthStatus() {
    const response = await fetch("/api/auth/status", {
        cache: "no-store"
    });
    state.authStatus = await response.json();
}

async function refresh() {
    await Promise.all([loadBookmarks(), loadStatus(), loadAuthStatus()]);
    render();
}

async function importBookmarksFromBridge(bookmarks) {
    const response = await fetch("/api/import/browser", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            bookmarks: Array.isArray(bookmarks) ? bookmarks : []
        })
    });

    if (!response.ok) {
        throw new Error(`Import endpoint hata verdi: ${response.status}`);
    }

    return response.json();
}

function handleBridgeMessage(event) {
    if (!isTrustedXOrigin(event.origin)) {
        return;
    }

    if (!event.data || typeof event.data !== "object" || event.data.type !== "x-bookmarks-local-import") {
        return;
    }

    if (bridgeImportPromise) {
        return;
    }

    state.status = {
        state: "running",
        phase: "browser_import",
        message: "Browser bridge import aliniyor...",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        importedCount: Array.isArray(event.data.bookmarks) ? event.data.bookmarks.length : 0,
        error: null
    };
    render();

    bridgeImportPromise = importBookmarksFromBridge(event.data.bookmarks)
        .then(async (result) => {
            if (event.source && typeof event.source.postMessage === "function") {
                event.source.postMessage({
                    type: "x-bookmarks-local-import-result",
                    result
                }, event.origin);
            }

            await refresh();
            return result;
        })
        .catch((error) => {
            if (event.source && typeof event.source.postMessage === "function") {
                event.source.postMessage({
                    type: "x-bookmarks-local-import-error",
                    error: error.message
                }, event.origin);
            }

            state.status = {
                state: "error",
                phase: "browser_import_failed",
                message: "Browser bridge import basarisiz oldu.",
                error: error.message
            };
            render();
        })
        .finally(() => {
            bridgeImportPromise = null;
        });
}

async function startAuthLogin() {
    await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: elements.authUsername.value.trim(),
            password: elements.authPassword.value,
            secondaryIdentifier: elements.authSecondary.value.trim(),
            verificationCode: elements.authCode.value.trim()
        })
    });

    elements.authPassword.value = "";
    elements.authCode.value = "";

    await refresh();
}

async function clearSession() {
    await fetch("/api/auth/logout", {
        method: "POST"
    });

    await refresh();
}

async function startImport() {
    const maxItems = Number(elements.maxItems.value) || 400;

    await fetch("/api/import", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ maxItems })
    });

    await refresh();
}

elements.authLoginButton.addEventListener("click", () => {
    startAuthLogin().catch((error) => {
        state.authStatus = {
            state: "error",
            phase: "failed",
            message: "Login baslatilamadi.",
            error: error.message,
            hasSession: false
        };
        render();
    });
});

elements.authClearButton.addEventListener("click", () => {
    clearSession().catch((error) => {
        state.authStatus = {
            state: "error",
            phase: "failed",
            message: "Session temizlenemedi.",
            error: error.message,
            hasSession: Boolean(state.authStatus?.hasSession)
        };
        render();
    });
});

elements.importButton.addEventListener("click", () => {
    startImport().catch((error) => {
        state.status = {
            state: "error",
            phase: "failed",
            message: "Import baslatilamadi.",
            error: error.message
        };
        render();
    });
});

elements.copyScriptButton?.addEventListener("click", () => {
    copyBrowserScript().then(() => {
        elements.copyScriptButton.textContent = "Copied";

        window.setTimeout(() => {
            elements.copyScriptButton.textContent = "Copy Browser Script";
        }, 1600);
    }).catch((error) => {
        state.status = {
            state: "error",
            phase: "copy_failed",
            message: "Browser script kopyalanamadi.",
            error: error.message
        };
        render();
    });
});

elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderBookmarks();
});

elements.maxItems?.addEventListener("input", () => {
    if (elements.browserScript) {
        elements.browserScript.value = buildBrowserImportScript();
    }
});

window.addEventListener("message", handleBridgeMessage);

setInterval(() => {
    refresh().catch(() => {});
}, 3000);

refresh().catch((error) => {
    state.status = {
        state: "error",
        phase: "failed",
        message: "Ilk veri yuklenemedi.",
        error: error.message
    };
    render();
});
