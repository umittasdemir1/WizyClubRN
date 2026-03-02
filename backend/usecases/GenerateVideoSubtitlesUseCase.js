const { createHttpError } = require('../utils/httpError');

class GenerateVideoSubtitlesUseCase {
    constructor({
        subtitleService,
        subtitleGenerationService,
        findLatestSubtitleStatus,
        logLine,
    }) {
        this.subtitleService = subtitleService;
        this.subtitleGenerationService = subtitleGenerationService;
        this.findLatestSubtitleStatus = findLatestSubtitleStatus;
        this.logLine = logLine;
    }

    async execute({ videoId, video, language }) {
        if (!this.subtitleService.isAvailable()) {
            throw createHttpError(
                503,
                'STT service is not configured. Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID.'
            );
        }

        if (video.post_type !== 'video' || !video.video_url) {
            throw createHttpError(400, 'Only video posts with video_url can generate subtitles');
        }

        if (this.subtitleGenerationService.isInProgress(videoId)) {
            throw createHttpError(409, 'Subtitle generation is already in progress for this video');
        }

        if (!this.subtitleGenerationService.canTrigger(videoId)) {
            throw createHttpError(
                429,
                'Subtitle generation triggered too frequently. Please wait and try again.'
            );
        }

        try {
            const processingRow = await this.findLatestSubtitleStatus(videoId, 'auto');
            if (processingRow?.status === 'processing') {
                throw createHttpError(409, 'Subtitle generation is already processing in database state');
            }
        } catch (error) {
            if (error?.statusCode) {
                throw error;
            }

            this.logLine('WARN', 'SUBTITLE', 'Could not check existing subtitle status before generation', {
                videoId,
                error: error?.message || error,
            });
        }

        this.logLine('INFO', 'SUBTITLE', 'Manual subtitle generation triggered', { videoId });
        const started = this.subtitleGenerationService.trigger(video.id, video.video_url, 'manual-endpoint', { language });

        if (!started) {
            throw createHttpError(409, 'Subtitle generation could not be started');
        }

        return {
            message: 'Subtitle generation started',
            videoId,
            language,
        };
    }
}

module.exports = GenerateVideoSubtitlesUseCase;
