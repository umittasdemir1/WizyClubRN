const express = require('express');
const UploadStoryDTO = require('../dto/UploadStoryDTO');

function createStoryRoutes({
    supabase,
    attachOptionalAuth,
    upload,
    uploadStoryUseCase,
    requireAuth,
    deleteStoryUseCase,
    restoreStoryUseCase,
    listRecentlyDeletedStoriesUseCase,
    cleanupExpiredStoriesUseCase,
    cleanupSoftDeletedStoriesUseCase,
    logLine,
}) {
    const router = express.Router();

    router.post('/upload-story', attachOptionalAuth, upload.array('video', 10), async (req, res) => {
        try {
            const dto = new UploadStoryDTO(req.body, req.files, req.user?.id || null);
            const requestPayload = dto.toRequest();
            const uploadedStory = await uploadStoryUseCase.execute({
                files: requestPayload.files,
                body: requestPayload.body,
                dbClient: req.dbClient || supabase,
                authenticatedUserId: requestPayload.authenticatedUserId,
            });

            return res.json({ success: true, data: uploadedStory });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({
                error: error?.message || 'Story upload failed',
            });
        }
    });

    router.delete('/stories/:id', requireAuth, async (req, res) => {
        try {
            const result = await deleteStoryUseCase.execute({
                storyId: req.params.id,
                userId: req.user?.id,
                force: req.query.force === 'true',
                dbClient: req.dbClient || supabase,
            });
            return res.json({ success: true, message: result.message });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Internal server error' });
        }
    });

    router.post('/stories/:id/restore', requireAuth, async (req, res) => {
        try {
            const result = await restoreStoryUseCase.execute({
                storyId: req.params.id,
                userId: req.user?.id,
                dbClient: req.dbClient || supabase,
            });
            return res.json({ success: true, message: result.message });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Internal server error' });
        }
    });

    router.get('/stories/recently-deleted', requireAuth, async (req, res) => {
        try {
            const stories = await listRecentlyDeletedStoriesUseCase.execute({
                userId: req.user?.id,
                dbClient: req.dbClient || supabase,
            });
            return res.json({ success: true, data: stories });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Internal server error' });
        }
    });

    router.post('/stories/cleanup-expired', async (req, res) => {
        try {
            const result = await cleanupSoftDeletedStoriesUseCase.execute();
            return res.json({ success: true, cleaned: result.cleaned || 0 });
        } catch (error) {
            logLine('ERR', 'CLEANUP', 'Cleanup failed', { error: error?.message || error });
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    router.post('/stories/cleanup', async (req, res) => {
        try {
            const result = await cleanupExpiredStoriesUseCase.execute();
            return res.json({ success: true, ...result });
        } catch (error) {
            logLine('ERR', 'STORY_CLEANUP', 'Manual cleanup failed', { error: error?.message || error });
            return res.status(500).json({ error: 'Failed to cleanup stories' });
        }
    });

    return router;
}

module.exports = {
    createStoryRoutes,
};
