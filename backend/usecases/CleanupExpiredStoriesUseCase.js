class CleanupExpiredStoriesUseCase {
    constructor({ cleanupExpiredStories }) {
        this.cleanupExpiredStories = cleanupExpiredStories;
    }

    async execute() {
        return this.cleanupExpiredStories();
    }
}

module.exports = CleanupExpiredStoriesUseCase;
