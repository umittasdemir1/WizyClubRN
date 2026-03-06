class DeleteStoryUseCase {
    constructor({
        createStoryRepository,
        cleanupStoryAssetsFromR2,
        logLine,
        logBanner,
    }) {
        this.createStoryRepository = createStoryRepository;
        this.cleanupStoryAssetsFromR2 = cleanupStoryAssetsFromR2;
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async execute({ storyId, userId, force, dbClient }) {
        this.logBanner('DELETE STORY REQUEST', [
            `Story ID: ${storyId}`,
            `Mode: ${force ? 'HARD DELETE (Permanent)' : 'SOFT DELETE (Trash)'}`,
        ]);

        try {
            const storyRepository = this.createStoryRepository(dbClient);

            if (force) {
                const story = await storyRepository.findStoryById(storyId);

                if (!story) {
                    const notFoundError = new Error('Story not found');
                    notFoundError.statusCode = 404;
                    throw notFoundError;
                }

                if (story.user_id !== userId) {
                    const forbiddenError = new Error('Forbidden');
                    forbiddenError.statusCode = 403;
                    throw forbiddenError;
                }

                await this.cleanupStoryAssetsFromR2(story, { scope: 'DELETE_STORY', storyId });
                const deletedRows = await storyRepository.hardDeleteStory(storyId, userId);

                if (deletedRows.length === 0) {
                    const notFoundError = new Error('Story not found');
                    notFoundError.statusCode = 404;
                    throw notFoundError;
                }

                this.logLine('OK', 'DELETE_STORY', 'Story hard deleted', { storyId, userId });
                return { message: 'Story deleted permanently' };
            }

            const softDeletedRows = await storyRepository.softDeleteStory(storyId, userId, new Date().toISOString());
            if (softDeletedRows.length === 0) {
                const ownershipStory = await storyRepository.findStoryById(storyId, {
                    select: 'id, user_id',
                });

                if (!ownershipStory) {
                    const notFoundError = new Error('Story not found');
                    notFoundError.statusCode = 404;
                    throw notFoundError;
                }

                if (ownershipStory.user_id !== userId) {
                    const forbiddenError = new Error('Forbidden');
                    forbiddenError.statusCode = 403;
                    throw forbiddenError;
                }
            }

            this.logLine('OK', 'DELETE_STORY', 'Story soft deleted (moved to trash)', { storyId, userId });
            return { message: 'Story moved to trash' };
        } catch (error) {
            this.logLine('ERR', 'DELETE_STORY', 'Story delete failed', {
                storyId,
                force,
                error: error?.message || error,
            });
            throw error;
        }
    }
}

module.exports = DeleteStoryUseCase;
