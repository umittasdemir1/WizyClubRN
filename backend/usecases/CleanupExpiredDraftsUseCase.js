class CleanupExpiredDraftsUseCase {
    constructor({ cleanupExpiredDrafts }) {
        this.cleanupExpiredDrafts = cleanupExpiredDrafts;
    }

    async execute() {
        return this.cleanupExpiredDrafts();
    }
}

module.exports = CleanupExpiredDraftsUseCase;
