const X_STATUS_URL_PATTERN = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/i;

function toValidIsoString(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function cleanString(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function cleanStringArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return Array.from(
        new Set(
            values
                .map((value) => cleanString(value))
                .filter(Boolean)
        )
    );
}

function normalizeUrl(url) {
    const value = cleanString(url);

    if (!value) {
        return null;
    }

    try {
        const parsed = new URL(value);
        parsed.hash = "";
        return parsed.toString();
    } catch (error) {
        return null;
    }
}

function extractTweetIdFromUrl(url) {
    const normalizedUrl = normalizeUrl(url);

    if (!normalizedUrl) {
        return null;
    }

    const match = normalizedUrl.match(X_STATUS_URL_PATTERN);
    return match ? match[2] : null;
}

function extractAuthorHandleFromUrl(url) {
    const normalizedUrl = normalizeUrl(url);

    if (!normalizedUrl) {
        return null;
    }

    const match = normalizedUrl.match(X_STATUS_URL_PATTERN);
    return match ? match[1] : null;
}

function buildBookmarkId(bookmark) {
    if (bookmark.tweetId) {
        return `tweet:${bookmark.tweetId}`;
    }

    if (bookmark.tweetUrl) {
        return `url:${bookmark.tweetUrl}`;
    }

    return null;
}

function normalizeBookmark(rawBookmark, importedAt = new Date().toISOString()) {
    const tweetUrl = normalizeUrl(rawBookmark.tweetUrl);
    const tweetId = cleanString(rawBookmark.tweetId) || extractTweetIdFromUrl(tweetUrl);
    const authorHandle = cleanString(rawBookmark.authorHandle) || extractAuthorHandleFromUrl(tweetUrl);
    const text = cleanString(rawBookmark.text);
    const rawText = cleanString(rawBookmark.rawText);
    const createdAt = toValidIsoString(rawBookmark.createdAt);
    const firstImportedAt = toValidIsoString(rawBookmark.firstImportedAt) || toValidIsoString(importedAt);
    const lastSeenAt = toValidIsoString(rawBookmark.lastSeenAt) || toValidIsoString(importedAt);
    const externalLinks = cleanStringArray(rawBookmark.externalLinks).map(normalizeUrl).filter(Boolean);

    const bookmark = {
        tweetId: tweetId || null,
        tweetUrl,
        authorHandle: authorHandle || null,
        authorName: cleanString(rawBookmark.authorName) || null,
        text: text || rawText || null,
        rawText: rawText || text || null,
        createdAt,
        externalLinks,
        firstImportedAt,
        lastSeenAt
    };

    bookmark.id = buildBookmarkId(bookmark);
    return bookmark;
}

function compareBookmarks(left, right) {
    const leftDate = left.createdAt || left.firstImportedAt || "";
    const rightDate = right.createdAt || right.firstImportedAt || "";

    if (leftDate !== rightDate) {
        return rightDate.localeCompare(leftDate);
    }

    return (right.lastSeenAt || "").localeCompare(left.lastSeenAt || "");
}

function mergeBookmarks(existingBookmarks, incomingBookmarks, importedAt = new Date().toISOString()) {
    const merged = new Map();

    for (const bookmark of existingBookmarks || []) {
        const normalized = normalizeBookmark(bookmark, importedAt);

        if (normalized.id) {
            merged.set(normalized.id, normalized);
        }
    }

    for (const bookmark of incomingBookmarks || []) {
        const normalized = normalizeBookmark(bookmark, importedAt);

        if (!normalized.id) {
            continue;
        }

        const previous = merged.get(normalized.id);

        if (previous) {
            merged.set(normalized.id, {
                ...previous,
                ...normalized,
                externalLinks: cleanStringArray([
                    ...previous.externalLinks,
                    ...normalized.externalLinks
                ]),
                firstImportedAt: previous.firstImportedAt || normalized.firstImportedAt,
                lastSeenAt: normalized.lastSeenAt || previous.lastSeenAt
            });
            continue;
        }

        merged.set(normalized.id, normalized);
    }

    return Array.from(merged.values()).sort(compareBookmarks);
}

module.exports = {
    extractTweetIdFromUrl,
    extractAuthorHandleFromUrl,
    normalizeBookmark,
    mergeBookmarks
};
