const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { SpeechClient } = require('@google-cloud/speech').v2;

// ──────────────────────────────────────────────
// Fallback logger (same pattern as HlsService)
// ──────────────────────────────────────────────

function fallbackLogLine(level, scope, message, meta) {
    const ts = new Date().toISOString();
    const metaStr = meta ? ' | ' + Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(' ') : '';
    console.log(`${ts} ${level} [${scope}] ${message}${metaStr}`);
}

function fallbackLogBanner(title, lines = []) {
    console.log(`\n${'='.repeat(86)}`);
    console.log(title);
    for (const line of lines) console.log(` - ${line}`);
    console.log(`${'='.repeat(86)}\n`);
}

// ──────────────────────────────────────────────
// SubtitleService
// ──────────────────────────────────────────────

class SubtitleService {
    constructor(supabase, logger = {}) {
        this.supabase = supabase;
        this.logLine = typeof logger.logLine === 'function' ? logger.logLine : fallbackLogLine;
        this.logBanner = typeof logger.logBanner === 'function' ? logger.logBanner : fallbackLogBanner;

        // Google STT v2 client
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.speechClient = null;

        if (this.projectId && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            try {
                this.speechClient = new SpeechClient();
                this.logLine('OK', 'STT_INIT', 'Google Speech-to-Text client initialized', { projectId: this.projectId });
            } catch (err) {
                this.logLine('WARN', 'STT_INIT', 'Failed to initialize Google STT client', { error: err?.message || err });
            }
        } else {
            this.logLine('WARN', 'STT_INIT', 'Google Cloud credentials not configured. STT disabled.', {
                hasProjectId: !!this.projectId,
                hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            });
        }
    }

    /**
     * Check if STT is available
     */
    isAvailable() {
        return this.speechClient !== null && this.projectId !== null;
    }

    /**
     * Extract audio from video using FFmpeg
     * Converts to 16kHz mono WAV (optimal for STT)
     */
    async extractAudio(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .noVideo()
                .audioChannels(1)
                .audioFrequency(16000)
                .audioCodec('pcm_s16le')
                .format('wav')
                .on('start', (cmd) => {
                    this.logLine('INFO', 'STT_AUDIO', 'FFmpeg audio extraction started', { cmd: cmd.substring(0, 120) });
                })
                .on('end', () => {
                    this.logLine('OK', 'STT_AUDIO', 'Audio extraction completed', { outputPath });
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    this.logLine('ERR', 'STT_AUDIO', 'Audio extraction failed', { error: err?.message || err });
                    reject(err);
                })
                .save(outputPath);
        });
    }

    /**
     * Transcribe audio using Google Cloud Speech-to-Text v2
     * Returns array of segments: [{ startMs, endMs, text }]
     */
    async transcribeAudio(audioPath, languageCode = 'auto') {
        if (!this.isAvailable()) {
            throw new Error('Google Cloud STT is not configured. Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID.');
        }

        const audioContent = fs.readFileSync(audioPath);
        const audioBase64 = audioContent.toString('base64');

        // Build recognition config
        const languageCodes = languageCode === 'auto'
            ? ['tr-TR', 'en-US']  // Auto-detect between Turkish and English
            : [languageCode];

        const recognitionConfig = {
            autoDecodingConfig: {},
            languageCodes,
            model: 'long',
            features: {
                enableWordTimeOffsets: true,
                enableAutomaticPunctuation: true,
            },
        };

        const recognizer = `projects/${this.projectId}/locations/global/recognizers/_`;

        this.logLine('INFO', 'STT_API', 'Sending audio to Google STT', {
            audioSize: `${(audioContent.length / 1024 / 1024).toFixed(2)}MB`,
            languages: languageCodes.join(','),
        });

        try {
            const [response] = await this.speechClient.recognize({
                recognizer,
                config: recognitionConfig,
                content: audioBase64,
            });

            const segments = [];
            let detectedLanguage = languageCode;

            if (response.results) {
                for (const result of response.results) {
                    if (!result.alternatives || result.alternatives.length === 0) continue;

                    const alt = result.alternatives[0];

                    // Detect language from first result
                    if (result.languageCode) {
                        detectedLanguage = result.languageCode;
                    }

                    if (alt.words && alt.words.length > 0) {
                        // Word-level timestamps available → group into ~3 second segments
                        let currentSegment = { startMs: 0, endMs: 0, words: [] };

                        for (const word of alt.words) {
                            const startMs = this._durationToMs(word.startOffset);
                            const endMs = this._durationToMs(word.endOffset);

                            if (currentSegment.words.length === 0) {
                                currentSegment.startMs = startMs;
                            }

                            currentSegment.words.push(word.word);
                            currentSegment.endMs = endMs;

                            // Split segments at ~3 seconds or punctuation
                            const segmentDuration = currentSegment.endMs - currentSegment.startMs;
                            const endsWithPunctuation = /[.!?]$/.test(word.word);

                            if (segmentDuration >= 3000 || (segmentDuration >= 1500 && endsWithPunctuation)) {
                                segments.push({
                                    startMs: currentSegment.startMs,
                                    endMs: currentSegment.endMs,
                                    text: currentSegment.words.join(' '),
                                });
                                currentSegment = { startMs: 0, endMs: 0, words: [] };
                            }
                        }

                        // Push remaining words
                        if (currentSegment.words.length > 0) {
                            segments.push({
                                startMs: currentSegment.startMs,
                                endMs: currentSegment.endMs,
                                text: currentSegment.words.join(' '),
                            });
                        }
                    } else if (alt.transcript) {
                        // No word-level timestamps, use result-level
                        const startMs = this._durationToMs(result.resultEndOffset) - 5000;
                        const endMs = this._durationToMs(result.resultEndOffset);

                        segments.push({
                            startMs: Math.max(0, startMs),
                            endMs,
                            text: alt.transcript.trim(),
                        });
                    }
                }
            }

            this.logLine('OK', 'STT_API', 'Transcription completed', {
                segments: segments.length,
                detectedLanguage,
            });

            return { segments, detectedLanguage };
        } catch (err) {
            this.logLine('ERR', 'STT_API', 'Google STT API error', { error: err?.message || err });
            throw err;
        }
    }

    /**
     * Main pipeline: process a video's subtitles
     * Downloads from URL, extracts audio, transcribes, saves to DB
     */
    async processVideoSubtitles(videoId, videoUrl, languageCode = 'auto') {
        const tempDir = os.tmpdir();
        const tempVideoPath = path.join(tempDir, `stt_video_${videoId}.mp4`);
        const tempAudioPath = path.join(tempDir, `stt_audio_${videoId}.wav`);

        this.logBanner('STT PIPELINE', [
            `Video ID : ${videoId}`,
            `Video URL: ${videoUrl?.substring(0, 80)}...`,
        ]);

        try {
            // 1. Update status to processing
            await this.supabase
                .from('subtitles')
                .upsert({
                    video_id: videoId,
                    language: languageCode,
                    status: 'processing',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'video_id,language' });

            // 2. Download video from R2/CDN
            this.logLine('INFO', 'STT_DL', 'Downloading video for STT', { videoId });
            const response = await fetch(videoUrl);
            if (!response.ok) throw new Error(`Video download failed: ${response.status}`);

            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(tempVideoPath, buffer);
            this.logLine('OK', 'STT_DL', 'Video downloaded', {
                size: `${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
            });

            // 3. Extract audio
            await this.extractAudio(tempVideoPath, tempAudioPath);

            // 4. Check audio file size (Google STT inline limit: ~10MB for sync recognize)
            const audioStats = fs.statSync(tempAudioPath);
            const audioSizeMB = audioStats.size / 1024 / 1024;

            if (audioSizeMB > 10) {
                this.logLine('WARN', 'STT_SIZE', 'Audio too large for sync recognize, may need batch', {
                    sizeMB: audioSizeMB.toFixed(2),
                });
            }

            // 5. Transcribe
            const { segments, detectedLanguage } = await this.transcribeAudio(tempAudioPath, languageCode);

            // 6. Save to Supabase
            const { error } = await this.supabase
                .from('subtitles')
                .upsert({
                    video_id: videoId,
                    language: languageCode,
                    status: 'completed',
                    segments: JSON.stringify(segments),
                    error_message: null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'video_id,language' });

            if (error) {
                this.logLine('ERR', 'STT_DB', 'Failed to save subtitles', { error: error.message });
                throw error;
            }

            this.logLine('OK', 'STT_DONE', 'Subtitles saved successfully', {
                videoId,
                language: languageCode,
                detectedLanguage,
                segments: segments.length,
            });

            return { videoId, language: languageCode, detectedLanguage, segments };
        } catch (err) {
            this.logLine('ERR', 'STT_PIPELINE', 'STT pipeline failed', {
                videoId,
                error: err?.message || err,
            });

            // Update status to failed
            await this.supabase
                .from('subtitles')
                .upsert({
                    video_id: videoId,
                    language: languageCode,
                    status: 'failed',
                    error_message: String(err?.message || err).substring(0, 500),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'video_id,language' });

            throw err;
        } finally {
            // Cleanup temp files
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
            this.logLine('INFO', 'STT_CLEAN', 'Temp files cleaned up');
        }
    }

    /**
     * Get subtitles for a video
     */
    async getSubtitles(videoId, language = null) {
        let query = this.supabase
            .from('subtitles')
            .select('*')
            .eq('video_id', videoId);

        if (language) {
            query = query.eq('language', language);
        }

        query = query.order('updated_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    /**
     * Helper: Convert Google duration string (e.g. "1.500s") to milliseconds
     */
    _durationToMs(duration) {
        if (!duration) return 0;

        // Handle protobuf Duration format: { seconds: '1', nanos: 500000000 }
        if (typeof duration === 'object') {
            const seconds = parseInt(duration.seconds || '0', 10);
            const nanos = parseInt(duration.nanos || '0', 10);
            return seconds * 1000 + Math.floor(nanos / 1000000);
        }

        // Handle string format: "1.500s"
        if (typeof duration === 'string') {
            const cleaned = duration.replace('s', '');
            return Math.floor(parseFloat(cleaned) * 1000);
        }

        return 0;
    }
}

module.exports = SubtitleService;
