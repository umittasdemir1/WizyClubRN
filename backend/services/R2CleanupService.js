function createR2CleanupService({ r2, bucketName, logLine, listObjectsV2Command, deleteObjectsCommand }) {
    function parseMediaUrlsField(mediaUrlsField) {
        if (Array.isArray(mediaUrlsField)) return mediaUrlsField;
        if (typeof mediaUrlsField !== 'string') return [];

        try {
            const parsed = JSON.parse(mediaUrlsField);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function extractR2KeyFromValue(value) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;

        try {
            const parsed = new URL(trimmed);
            return (parsed.pathname || '').replace(/^\/+/, '') || null;
        } catch {
            const withoutQuery = trimmed.split('?')[0].split('#')[0];
            return withoutQuery.replace(/^\/+/, '') || null;
        }
    }

    function deriveScopedR2Prefix(key) {
        if (typeof key !== 'string' || key.length === 0) return null;

        const segments = key.split('/').filter(Boolean);
        if (segments.length < 2) return null;

        if (segments[0] === 'videos') {
            return `videos/${segments[1]}`;
        }

        if (
            segments[0] === 'media'
            && segments.length >= 4
            && (segments[2] === 'posts' || segments[2] === 'videos')
        ) {
            return `media/${segments[1]}/${segments[2]}/${segments[3]}`;
        }

        return null;
    }

    function deriveLegacyVideoIdFromKey(key) {
        if (typeof key !== 'string' || key.length === 0) return null;
        const segments = key.split('/').filter(Boolean);
        if (segments.length < 2) return null;

        if (segments[0] === 'videos') {
            return segments[1];
        }

        if (segments[0] === 'media' && segments.length >= 4 && segments[2] === 'videos') {
            return segments[3];
        }

        return null;
    }

    function buildStoryCleanupTargets(story) {
        const objectKeysToDelete = new Set();
        const folderPrefixesToClean = new Set();

        const registerCleanupTarget = (value) => {
            const key = extractR2KeyFromValue(value);
            if (!key) return;
            objectKeysToDelete.add(key);

            const slashIndex = key.lastIndexOf('/');
            if (slashIndex > 0) {
                folderPrefixesToClean.add(key.slice(0, slashIndex));
            }
        };

        if (story && typeof story === 'object') {
            registerCleanupTarget(story.video_url);
            registerCleanupTarget(story.thumbnail_url);

            const mediaUrls = parseMediaUrlsField(story.media_urls);
            for (const mediaItem of mediaUrls) {
                if (!mediaItem || typeof mediaItem !== 'object') continue;
                registerCleanupTarget(mediaItem.url);
                registerCleanupTarget(mediaItem.thumbnail);
                registerCleanupTarget(mediaItem.sprite);
            }
        }

        return { objectKeysToDelete, folderPrefixesToClean };
    }

    function buildVideoCleanupTargets(video) {
        const objectKeysToDelete = new Set();
        const folderPrefixesToClean = new Set();
        const legacyVideoIds = new Set();

        const registerCleanupTarget = (value) => {
            const key = extractR2KeyFromValue(value);
            if (!key) return;
            objectKeysToDelete.add(key);

            const prefix = deriveScopedR2Prefix(key);
            if (prefix) {
                folderPrefixesToClean.add(prefix);
            }

            const legacyVideoId = deriveLegacyVideoIdFromKey(key);
            if (legacyVideoId) {
                legacyVideoIds.add(legacyVideoId);
            }
        };

        if (video && typeof video === 'object') {
            registerCleanupTarget(video.video_url);
            registerCleanupTarget(video.thumbnail_url);
            registerCleanupTarget(video.sprite_url);

            const mediaUrls = parseMediaUrlsField(video.media_urls);
            for (const mediaItem of mediaUrls) {
                if (!mediaItem || typeof mediaItem !== 'object') continue;
                registerCleanupTarget(mediaItem.url);
                registerCleanupTarget(mediaItem.thumbnail);
                registerCleanupTarget(mediaItem.sprite);
            }
        }

        for (const folderPrefix of folderPrefixesToClean) {
            objectKeysToDelete.add(`${folderPrefix}/thumb.jpg`);
            objectKeysToDelete.add(`${folderPrefix}/thumb.jpeg`);
            objectKeysToDelete.add(`${folderPrefix}/thumb.png`);
            objectKeysToDelete.add(`${folderPrefix}/thumbnail.jpg`);
            objectKeysToDelete.add(`${folderPrefix}/thumbnail.jpeg`);
            objectKeysToDelete.add(`${folderPrefix}/thumbnail.png`);
        }

        for (const legacyVideoId of legacyVideoIds) {
            objectKeysToDelete.add(`thumbs/${legacyVideoId}.jpg`);
            objectKeysToDelete.add(`thumbs/${legacyVideoId}.jpeg`);
            objectKeysToDelete.add(`thumbs/${legacyVideoId}.png`);
            objectKeysToDelete.add(`thumbs/${legacyVideoId}.webp`);
        }

        return { objectKeysToDelete, folderPrefixesToClean };
    }

    function splitIntoChunks(values, size) {
        const chunks = [];
        for (let i = 0; i < values.length; i += size) {
            chunks.push(values.slice(i, i + size));
        }
        return chunks;
    }

    async function deleteR2ObjectsUnderPrefix(prefix) {
        let deletedCount = 0;
        let continuationToken;
        const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

        do {
            const listRes = await r2.send(new listObjectsV2Command({
                Bucket: bucketName,
                Prefix: normalizedPrefix,
                ContinuationToken: continuationToken,
            }));

            const listedKeys = Array.isArray(listRes.Contents)
                ? listRes.Contents
                    .map((obj) => obj?.Key)
                    .filter((key) => typeof key === 'string' && key.length > 0)
                : [];

            for (const keyChunk of splitIntoChunks(listedKeys, 1000)) {
                if (keyChunk.length === 0) continue;
                await r2.send(new deleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: {
                        Objects: keyChunk.map((Key) => ({ Key })),
                    },
                }));
                deletedCount += keyChunk.length;
            }

            continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
        } while (continuationToken);

        return deletedCount;
    }

    async function cleanupStoryAssetsFromR2(story, options = {}) {
        const { scope = 'STORY_CLEANUP', storyId = story?.id } = options;
        const { objectKeysToDelete, folderPrefixesToClean } = buildStoryCleanupTargets(story);
        const cleanedPrefixes = new Set();
        let deletedCount = 0;

        for (const folderPrefix of folderPrefixesToClean) {
            const normalizedPrefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
            try {
                deletedCount += await deleteR2ObjectsUnderPrefix(normalizedPrefix);
                cleanedPrefixes.add(normalizedPrefix);
            } catch (error) {
                if (typeof logLine === 'function') {
                    logLine('WARN', scope, 'R2 prefix cleanup failed', {
                        storyId,
                        folderPrefix: normalizedPrefix,
                        error: error?.message || error,
                    });
                }
                throw error;
            }
        }

        const directKeys = Array.from(objectKeysToDelete).filter((key) =>
            !Array.from(cleanedPrefixes).some((prefix) => key.startsWith(prefix))
        );

        for (const keyChunk of splitIntoChunks(directKeys, 1000)) {
            if (keyChunk.length === 0) continue;
            try {
                await r2.send(new deleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: {
                        Objects: keyChunk.map((Key) => ({ Key })),
                    },
                }));
                deletedCount += keyChunk.length;
            } catch (error) {
                if (typeof logLine === 'function') {
                    logLine('WARN', scope, 'R2 direct key cleanup failed', {
                        storyId,
                        keyCount: keyChunk.length,
                        error: error?.message || error,
                    });
                }
                throw error;
            }
        }

        return { deletedCount };
    }

    async function cleanupVideoAssetsFromR2(video, options = {}) {
        const { scope = 'VIDEO_CLEANUP', videoId = video?.id } = options;
        const { objectKeysToDelete, folderPrefixesToClean } = buildVideoCleanupTargets(video);
        const cleanedPrefixes = new Set();
        let deletedCount = 0;
        let failureCount = 0;

        for (const folderPrefix of folderPrefixesToClean) {
            const normalizedPrefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
            try {
                deletedCount += await deleteR2ObjectsUnderPrefix(normalizedPrefix);
                cleanedPrefixes.add(normalizedPrefix);
            } catch (error) {
                failureCount += 1;
                if (typeof logLine === 'function') {
                    logLine('WARN', scope, 'R2 prefix cleanup failed', {
                        videoId,
                        folderPrefix: normalizedPrefix,
                        error: error?.message || error,
                    });
                }
            }
        }

        const cleanedPrefixList = Array.from(cleanedPrefixes);
        const directKeys = Array.from(objectKeysToDelete).filter((key) =>
            !cleanedPrefixList.some((prefix) => key.startsWith(prefix))
        );

        for (const keyChunk of splitIntoChunks(directKeys, 1000)) {
            if (keyChunk.length === 0) continue;
            try {
                await r2.send(new deleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: {
                        Objects: keyChunk.map((Key) => ({ Key })),
                    },
                }));
                deletedCount += keyChunk.length;
            } catch (error) {
                failureCount += 1;
                if (typeof logLine === 'function') {
                    logLine('WARN', scope, 'R2 direct key cleanup failed', {
                        videoId,
                        keyCount: keyChunk.length,
                        error: error?.message || error,
                    });
                }
            }
        }

        return { deletedCount, failureCount };
    }

    return {
        parseMediaUrlsField,
        extractR2KeyFromValue,
        deriveScopedR2Prefix,
        deriveLegacyVideoIdFromKey,
        buildStoryCleanupTargets,
        buildVideoCleanupTargets,
        splitIntoChunks,
        deleteR2ObjectsUnderPrefix,
        cleanupStoryAssetsFromR2,
        cleanupVideoAssetsFromR2,
    };
}

module.exports = {
    createR2CleanupService,
};
