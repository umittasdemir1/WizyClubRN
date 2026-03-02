class GetVideoSubtitlesUseCase {
    constructor({ subtitleService, logLine }) {
        this.subtitleService = subtitleService;
        this.logLine = logLine;
    }

    async execute({ videoId, language }) {
        try {
            this.logLine('INFO', 'SUBTITLE', 'Fetching subtitles', { videoId, language: language || 'all' });
            return await this.subtitleService.getSubtitles(videoId, language || null);
        } catch (error) {
            this.logLine('ERR', 'SUBTITLE', 'Failed to fetch subtitles', { videoId, error: error?.message || error });
            throw error;
        }
    }
}

module.exports = GetVideoSubtitlesUseCase;
