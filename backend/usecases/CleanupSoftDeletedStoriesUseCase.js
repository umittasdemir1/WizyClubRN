class CleanupSoftDeletedStoriesUseCase {
    constructor({ cleanupSoftDeletedStories }) {
        this.cleanupSoftDeletedStories = cleanupSoftDeletedStories;
    }

    async execute() {
        return this.cleanupSoftDeletedStories();
    }
}

module.exports = CleanupSoftDeletedStoriesUseCase;
