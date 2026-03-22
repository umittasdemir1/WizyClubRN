const X_BOOKMARKS_URL = "https://x.com/i/bookmarks";

async function getBookmarksPageState(page) {
    return page.evaluate(() => {
        const url = window.location.href;
        const bodyText = (document.body?.innerText || "").toLowerCase();
        const hasStatusArticles = Boolean(document.querySelector("article a[href*='/status/']"));
        const hasLoginInput = Boolean(
            document.querySelector("input[autocomplete='username'], input[name='text'], input[type='password']")
        );
        const isOnBookmarks = /\/i\/bookmarks/.test(url);
        const isLoginFlow = /\/i\/flow\/login|\/login/.test(url);
        const looksEmpty = isOnBookmarks && !hasStatusArticles && (
            bodyText.includes("save posts for later") ||
            bodyText.includes("henuz") ||
            bodyText.includes("kaydedilen")
        );

        return {
            hasStatusArticles,
            hasLoginInput,
            isOnBookmarks,
            isLoginFlow,
            looksEmpty
        };
    });
}

async function waitForBookmarksPage(page, options) {
    const updateStatus = options.updateStatus || (async () => {});
    const loginTimeoutMs = Number(options.loginTimeoutMs) || 60_000;
    const interactiveLoginAllowed = options.interactiveLoginAllowed !== false;
    const deadline = Date.now() + loginTimeoutMs;
    let lastPhase = "";

    while (Date.now() < deadline) {
        const state = await getBookmarksPageState(page);

        if (state.hasStatusArticles) {
            return "ready";
        }

        if (state.looksEmpty) {
            return "empty";
        }

        if (!interactiveLoginAllowed && (state.isLoginFlow || state.hasLoginInput)) {
            throw new Error(
                options.loginRequiredMessage ||
                "Session bulunamadi ya da suresi dolmus. Once Login & Save Session yap."
            );
        }

        let nextPhase = "loading";
        let nextMessage = "X bookmarks sayfasi yukleniyor...";

        if (state.isLoginFlow || state.hasLoginInput) {
            nextPhase = "awaiting_login";
            nextMessage = "X login gerekiyor.";
        } else if (state.isOnBookmarks) {
            nextPhase = "loading_bookmarks";
            nextMessage = "Bookmarks listesi yukleniyor...";
        }

        if (nextPhase !== lastPhase) {
            await updateStatus({
                state: "running",
                phase: nextPhase,
                message: nextMessage
            });
            lastPhase = nextPhase;
        }

        await page.waitForTimeout(1500);
    }

    throw new Error("X Bookmarks sayfasi hazir olmadi.");
}

async function extractVisibleBookmarks(page) {
    return page.evaluate(() => {
        const statusPattern = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/i;

        const normalizeUrl = (value) => {
            if (typeof value !== "string" || !value.trim()) {
                return null;
            }

            try {
                const url = new URL(value.trim());
                url.hash = "";
                return url.toString();
            } catch (error) {
                return null;
            }
        };

        const getStatusUrl = (article) => {
            const links = Array.from(article.querySelectorAll("a[href]"))
                .map((anchor) => normalizeUrl(anchor.href))
                .filter(Boolean);

            return links.find((href) => statusPattern.test(href)) || null;
        };

        const getAuthorName = (article, authorHandle) => {
            const handleText = authorHandle ? `@${authorHandle}` : null;
            const spans = Array.from(article.querySelectorAll("span"))
                .map((span) => span.textContent.trim())
                .filter(Boolean);

            return spans.find((text) => {
                if (text === handleText) {
                    return false;
                }

                if (text.startsWith("@")) {
                    return false;
                }

                if (text === "\u00b7" || text === "..." || text === "More") {
                    return false;
                }

                return true;
            }) || null;
        };

        const getExternalLinks = (article) => {
            return Array.from(
                new Set(
                    Array.from(article.querySelectorAll("a[href]"))
                        .map((anchor) => normalizeUrl(anchor.href))
                        .filter(Boolean)
                        .filter((href) => {
                            const url = new URL(href);
                            return !/(^|\.)x\.com$/i.test(url.hostname) && !/(^|\.)twitter\.com$/i.test(url.hostname);
                        })
                )
            );
        };

        return Array.from(document.querySelectorAll("article"))
            .map((article) => {
                const tweetUrl = getStatusUrl(article);

                if (!tweetUrl) {
                    return null;
                }

                const match = tweetUrl.match(statusPattern);
                const authorHandle = match ? match[1] : null;
                const tweetId = match ? match[2] : null;
                const text = Array.from(article.querySelectorAll("[data-testid='tweetText']"))
                    .map((node) => node.innerText.trim())
                    .filter(Boolean)
                    .join("\n");

                return {
                    tweetId,
                    tweetUrl,
                    authorHandle,
                    authorName: getAuthorName(article, authorHandle),
                    text: text || null,
                    rawText: article.innerText.trim() || null,
                    createdAt: article.querySelector("time")?.dateTime || null,
                    externalLinks: getExternalLinks(article)
                };
            })
            .filter(Boolean);
    });
}

async function collectBookmarks(page, options, updateStatus) {
    const collected = new Map();
    const maxItems = Number(options.maxItems) || 400;
    const scrollPauseMs = Number(options.scrollPauseMs) || 1200;
    const stallLimit = Number(options.stallLimit) || 10;
    let stallCount = 0;

    while (collected.size < maxItems && stallCount < stallLimit) {
        const visibleBookmarks = await extractVisibleBookmarks(page);
        const previousCount = collected.size;

        for (const bookmark of visibleBookmarks) {
            const key = bookmark.tweetId || bookmark.tweetUrl;

            if (!key) {
                continue;
            }

            collected.set(key, bookmark);
        }

        if (collected.size === previousCount) {
            stallCount += 1;
        } else {
            stallCount = 0;
        }

        await updateStatus({
            state: "running",
            phase: "collecting",
            message: `${collected.size} bookmark toplandi...`,
            importedCount: collected.size
        });

        if (collected.size >= maxItems || stallCount >= stallLimit) {
            break;
        }

        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight * 0.9);
        });
        await page.waitForTimeout(scrollPauseMs);
    }

    return Array.from(collected.values());
}

module.exports = {
    X_BOOKMARKS_URL,
    waitForBookmarksPage,
    collectBookmarks
};
