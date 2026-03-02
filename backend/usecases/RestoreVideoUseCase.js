class RestoreVideoUseCase {
    constructor({ createVideoRepository, logLine, logBanner }) {
        this.createVideoRepository = createVideoRepository;
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async execute({ videoId, dbClient }) {
        this.logBanner('RESTORE REQUEST', [`Video ID: ${videoId}`]);

        try {
            this.logLine('INFO', 'RESTORE', 'Attempting restore RPC', { videoId });
            const videoRepository = this.createVideoRepository(dbClient);
            await videoRepository.restoreVideo(videoId);
            this.logLine('OK', 'RESTORE', 'Video restored successfully', { videoId });
            return { message: 'Video restored' };
        } catch (error) {
            this.logLine('ERR', 'RESTORE', 'Restore failed', { videoId, error: error?.message || error });
            throw error;
        }
    }
}

module.exports = RestoreVideoUseCase;
