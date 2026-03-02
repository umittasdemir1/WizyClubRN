const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createHttpError } = require('../utils/httpError');

class PreviewSubtitlesUseCase {
    constructor({
        subtitleService,
        mediaProcessingService,
        logLine,
    }) {
        this.subtitleService = subtitleService;
        this.mediaProcessingService = mediaProcessingService;
        this.logLine = logLine;
    }

    hasAudioStream(metadata) {
        const streams = Array.isArray(metadata?.streams) ? metadata.streams : [];
        return streams.some((stream) => stream?.codec_type === 'audio');
    }

    async execute({ files, body }) {
        const safeFiles = files || {};
        const audioFile = Array.isArray(safeFiles.audio) ? safeFiles.audio[0] : null;
        const videoFile = Array.isArray(safeFiles.video) ? safeFiles.video[0] : null;
        const file = audioFile || videoFile;
        const inputType = audioFile ? 'audio' : (videoFile ? 'video' : 'none');
        const language = (body?.language || 'auto').trim();

        if (!file) {
            throw createHttpError(400, 'No media file provided (audio/video)');
        }

        if (!this.subtitleService.isAvailable()) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            throw createHttpError(503, 'Subtitle service is not available (Check configuration)');
        }

        this.logLine('INFO', 'STT_PREVIEW', 'Preview request received', {
            filename: file.originalname,
            size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            language,
            inputType,
        });

        const tempAudioPath = path.join(os.tmpdir(), `stt_preview_${uuidv4()}.wav`);

        try {
            if (inputType === 'video') {
                const metadata = await this.mediaProcessingService.probeMetadata(file.path);
                if (!this.hasAudioStream(metadata)) {
                    this.logLine('INFO', 'STT_PREVIEW', 'No audio stream detected, skipping STT', {
                        filename: file.originalname,
                    });
                    return {
                        success: false,
                        reason: 'NO_AUDIO_STREAM',
                        segments: [],
                        detectedLanguage: null,
                    };
                }

                await this.subtitleService.extractAudio(file.path, tempAudioPath);
            } else {
                fs.copyFileSync(file.path, tempAudioPath);
            }

            const audioStats = fs.statSync(tempAudioPath);
            if (!audioStats?.size || audioStats.size < 16 * 1024) {
                this.logLine('INFO', 'STT_PREVIEW', 'Preview audio too small, skipping STT', {
                    filename: file.originalname,
                    inputType,
                    audioBytes: audioStats?.size || 0,
                });
                return {
                    success: false,
                    reason: 'AUDIO_TOO_SMALL',
                    segments: [],
                    detectedLanguage: null,
                };
            }

            const { segments, detectedLanguage } = await this.subtitleService.transcribeAudio(tempAudioPath, language);
            this.logLine('OK', 'STT_PREVIEW', 'Preview completed', {
                segments: segments?.length || 0,
                detectedLanguage,
            });

            return {
                success: true,
                segments,
                detectedLanguage,
            };
        } catch (error) {
            const message = error?.message || 'STT transcription failed';
            this.logLine('ERR', 'STT_PREVIEW', 'Preview failed', { error: message });
            throw createHttpError(500, message);
        } finally {
            if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        }
    }
}

module.exports = PreviewSubtitlesUseCase;
