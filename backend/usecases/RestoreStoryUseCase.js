class RestoreStoryUseCase {
    constructor({
        createStoryRepository,
        storyRetentionMs,
        logLine,
        logBanner,
    }) {
        this.createStoryRepository = createStoryRepository;
        this.storyRetentionMs = storyRetentionMs;
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async execute({ storyId, userId, dbClient }) {
        this.logBanner('RESTORE STORY REQUEST', [`Story ID: ${storyId}`]);

        try {
            const storyRepository = this.createStoryRepository(dbClient);
            const story = await storyRepository.findStoryById(storyId, {
                select: 'id, user_id, deleted_at',
                onlyDeleted: true,
            });

            if (!story) {
                const notFoundError = new Error('Deleted story not found');
                notFoundError.statusCode = 404;
                throw notFoundError;
            }

            if (story.user_id !== userId) {
                const forbiddenError = new Error('Forbidden');
                forbiddenError.statusCode = 403;
                throw forbiddenError;
            }

            const deletedAt = new Date(story.deleted_at);
            const retentionWindowMs = this.storyRetentionMs;
            if ((Date.now() - deletedAt.getTime()) >= retentionWindowMs) {
                const expiredError = new Error('Story can no longer be restored. 24 hours have passed.');
                expiredError.statusCode = 410;
                throw expiredError;
            }

            await storyRepository.restoreStory(storyId, userId);
            this.logLine('OK', 'RESTORE_STORY', 'Story restored successfully', { storyId, userId });
            return { message: 'Story restored' };
        } catch (error) {
            this.logLine('ERR', 'RESTORE_STORY', 'Story restore failed', {
                storyId,
                error: error?.message || error,
            });
            throw error;
        }
    }
}

module.exports = RestoreStoryUseCase;
