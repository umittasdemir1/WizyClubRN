class SubtitleGenerationService {
    constructor({ subtitleService, logLine, cooldownMs = 30_000 }) {
        this.subtitleService = subtitleService;
        this.logLine = logLine;
        this.cooldownMs = cooldownMs;
        this.inProgress = new Set();
        this.lastTriggeredAt = new Map();
    }

    isInProgress(videoId) {
        return this.inProgress.has(videoId);
    }

    canTrigger(videoId) {
        const lastTs = this.lastTriggeredAt.get(videoId);
        if (!lastTs) return true;
        return (Date.now() - lastTs) > this.cooldownMs;
    }

    trigger(videoId, videoUrl, source, options = {}) {
        if (!this.subtitleService.isAvailable()) return false;
        if (!videoId || !videoUrl) return false;
        const language = typeof options.language === 'string' && options.language.trim()
            ? options.language.trim()
            : 'auto';

        if (this.isInProgress(videoId)) {
            this.logLine('INFO', 'STT', 'Subtitle generation already running, skipping trigger', {
                videoId,
                source,
            });
            return false;
        }

        if (!this.canTrigger(videoId)) {
            this.logLine('INFO', 'STT', 'Subtitle generation skipped due to cooldown', {
                videoId,
                source,
                cooldownMs: this.cooldownMs,
            });
            return false;
        }

        this.inProgress.add(videoId);
        this.lastTriggeredAt.set(videoId, Date.now());

        this.subtitleService.processVideoSubtitles(videoId, videoUrl, language)
            .then(() => this.logLine('OK', 'STT', 'Subtitle generation completed', {
                videoId,
                source,
                language,
            }))
            .catch((error) => this.logLine('ERR', 'STT', 'Subtitle generation failed', {
                videoId,
                source,
                language,
                error: error?.message || error,
            }))
            .finally(() => {
                this.inProgress.delete(videoId);
            });

        return true;
    }
}

module.exports = SubtitleGenerationService;
