class DeleteVideoUseCase {
    constructor({
        createVideoRepository,
        cleanupVideoAssetsFromR2,
        logLine,
        logBanner,
    }) {
        this.createVideoRepository = createVideoRepository;
        this.cleanupVideoAssetsFromR2 = cleanupVideoAssetsFromR2;
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async execute({ videoId, force, userId, video, dbClient }) {
        this.logBanner('DELETE REQUEST', [
            `Video ID: ${videoId}`,
            `Mode: ${force ? 'HARD DELETE (Permanent)' : 'SOFT DELETE (Trash)'}`,
        ]);
        this.logLine('INFO', 'DELETE', 'Authenticated request', { userId: userId || 'none' });

        try {
            const videoRepository = this.createVideoRepository(dbClient);

            if (force) {
                await this.cleanupVideoAssetsFromR2(video, { scope: 'DELETE', videoId });
                const deletedRows = await videoRepository.deleteVideoById(videoId);

                this.logLine('INFO', 'DELETE', 'Database hard delete result', {
                    count: deletedRows.length,
                });
                this.logLine('OK', 'DELETE', 'Hard delete completed', { videoId });
                return { message: 'Video permanently deleted' };
            }

            this.logLine('INFO', 'DELETE', 'Attempting soft delete RPC', { videoId });
            await videoRepository.softDeleteVideo(videoId);
            this.logLine('OK', 'DELETE', 'Video moved to trash', { videoId });
            return { message: 'Video moved to trash' };
        } catch (error) {
            this.logLine('ERR', 'DELETE', 'Unexpected delete error', {
                videoId,
                error: error?.message || error,
            });
            throw error;
        }
    }
}

module.exports = DeleteVideoUseCase;
