class ListRecentlyDeletedStoriesUseCase {
    constructor({
        createStoryRepository,
        storyRetentionMs,
        logLine,
    }) {
        this.createStoryRepository = createStoryRepository;
        this.storyRetentionMs = storyRetentionMs;
        this.logLine = logLine;
    }

    async execute({ userId, dbClient }) {
        this.logLine('INFO', 'RECENTLY_DELETED', 'Fetching recently deleted stories');

        try {
            const cutoff = new Date(Date.now() - this.storyRetentionMs).toISOString();
            const storyRepository = this.createStoryRepository(dbClient);
            const stories = await storyRepository.listRecentlyDeletedStories(userId, cutoff);

            this.logLine('OK', 'RECENTLY_DELETED', 'Recently deleted stories fetched', {
                userId,
                count: stories.length,
            });

            return stories;
        } catch (error) {
            this.logLine('ERR', 'RECENTLY_DELETED', 'Failed to fetch recently deleted stories', {
                userId,
                error: error?.message || error,
            });
            throw error;
        }
    }
}

module.exports = ListRecentlyDeletedStoriesUseCase;
