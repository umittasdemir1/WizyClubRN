const {
    DRAFT_RETENTION_MS,
    STORY_RETENTION_MS,
    STORY_CLEANUP_INTERVAL_MS,
    STORY_CLEANUP_STARTUP_DELAY_MS,
    EXPIRED_STORY_CLEANUP_INTERVAL_MS,
    EXPIRED_STORY_CLEANUP_BATCH_SIZE,
} = require('../config/constants');

function createCleanupService({ supabase, cleanupStoryAssetsFromR2, splitIntoChunks, logLine }) {
    async function cleanupExpiredStories() {
        const nowIso = new Date().toISOString();
        const { data: expiredStories, error: fetchError } = await supabase
            .from('stories')
            .select('id, user_id, video_url, thumbnail_url, media_urls, expires_at')
            .lt('expires_at', nowIso)
            .order('expires_at', { ascending: true });

        if (fetchError) throw fetchError;

        if (!expiredStories || expiredStories.length === 0) {
            return { deletedCount: 0, failedCount: 0, deletedR2Objects: 0 };
        }

        const deletableStoryIds = [];
        const failedStoryIds = [];
        let deletedR2Objects = 0;

        for (const story of expiredStories) {
            try {
                const cleanup = await cleanupStoryAssetsFromR2(story, {
                    scope: 'STORY_CLEANUP',
                    storyId: story.id,
                });
                deletedR2Objects += cleanup.deletedCount || 0;
                deletableStoryIds.push(story.id);
            } catch (error) {
                failedStoryIds.push(story.id);
                logLine('WARN', 'STORY_CLEANUP', 'Skipping story hard delete because R2 cleanup failed', {
                    storyId: story.id,
                    error: error?.message || error,
                });
            }
        }

        let deletedCount = 0;
        for (const storyIdChunk of splitIntoChunks(deletableStoryIds, EXPIRED_STORY_CLEANUP_BATCH_SIZE)) {
            if (storyIdChunk.length === 0) continue;

            const { data: deletedRows, error: deleteError } = await supabase
                .from('stories')
                .delete()
                .in('id', storyIdChunk)
                .select('id');

            if (deleteError) throw deleteError;
            deletedCount += deletedRows?.length || 0;
        }

        logLine('INFO', 'STORY_CLEANUP', 'Expired stories cleaned', {
            expiredCount: expiredStories.length,
            deletedCount,
            failedCount: failedStoryIds.length,
            deletedR2Objects,
        });

        return { deletedCount, failedCount: failedStoryIds.length, deletedR2Objects };
    }

    async function cleanupExpiredDrafts() {
        const { data, error } = await supabase
            .from('drafts')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select('id');

        if (error) throw error;

        const count = data?.length || 0;
        logLine('INFO', 'DRAFTS', 'Expired drafts cleaned', { deletedCount: count });
        return count;
    }

    async function cleanupSoftDeletedStories() {
        const cutoff = new Date(Date.now() - STORY_RETENTION_MS).toISOString();
        const { data: expiredStories, error: fetchError } = await supabase
            .from('stories')
            .select('id, user_id, video_url, thumbnail_url, media_urls, deleted_at')
            .not('deleted_at', 'is', null)
            .lt('deleted_at', cutoff);

        if (fetchError) throw fetchError;

        if (!expiredStories || expiredStories.length === 0) {
            return { cleaned: 0 };
        }

        logLine('INFO', 'AUTO_CLEANUP', 'Auto-cleaning expired soft-deleted stories', {
            count: expiredStories.length,
        });

        let cleaned = 0;
        for (const story of expiredStories) {
            try {
                await cleanupStoryAssetsFromR2(story, { scope: 'AUTO_CLEANUP', storyId: story.id });
                await supabase.from('stories').delete().eq('id', story.id);
                cleaned += 1;
                logLine('OK', 'AUTO_CLEANUP', 'Story permanently deleted', { storyId: story.id });
            } catch (error) {
                logLine('ERR', 'AUTO_CLEANUP', 'Failed to clean story', {
                    storyId: story.id,
                    error: error?.message || error,
                });
            }
        }

        return { cleaned };
    }

    function startStoryCleanupScheduler() {
        cleanupExpiredStories().catch((error) => {
            logLine('ERR', 'STORY_CLEANUP', 'Scheduled cleanup failed', { error: error?.message || error });
        });

        setInterval(() => {
            cleanupExpiredStories().catch((error) => {
                logLine('ERR', 'STORY_CLEANUP', 'Scheduled cleanup failed', { error: error?.message || error });
            });
        }, EXPIRED_STORY_CLEANUP_INTERVAL_MS);
    }

    function startDraftCleanupScheduler() {
        cleanupExpiredDrafts().catch((error) => {
            logLine('ERR', 'DRAFTS', 'Scheduled cleanup failed', { error: error?.message || error });
        });

        setInterval(() => {
            cleanupExpiredDrafts().catch((error) => {
                logLine('ERR', 'DRAFTS', 'Scheduled cleanup failed', { error: error?.message || error });
            });
        }, DRAFT_RETENTION_MS);
    }

    function startSoftDeletedStoryCleanupScheduler() {
        const run = () => {
            cleanupSoftDeletedStories().catch((error) => {
                logLine('ERR', 'AUTO_CLEANUP', 'Auto-cleanup failed', { error: error?.message || error });
            });
        };

        setInterval(run, STORY_CLEANUP_INTERVAL_MS);
        setTimeout(run, STORY_CLEANUP_STARTUP_DELAY_MS);
    }

    return {
        cleanupExpiredStories,
        cleanupExpiredDrafts,
        cleanupSoftDeletedStories,
        startStoryCleanupScheduler,
        startDraftCleanupScheduler,
        startSoftDeletedStoryCleanupScheduler,
    };
}

module.exports = {
    createCleanupService,
};
