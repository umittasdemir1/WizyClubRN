const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { SpeechClient } = require('@google-cloud/speech').v2;
const { SUBTITLE_SEGMENT_DURATION_MS } = require('../config/constants');

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
     * Probe audio duration in seconds using FFprobe
     */
    async _probeAudioDuration(audioPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
                if (err) return reject(err);
                const duration = parseFloat(metadata?.format?.duration || '0');
                resolve(duration);
            });
        });
    }

    /**
     * Split audio file into chunks of chunkDurationSec seconds using FFmpeg.
     * Returns array of { chunkPath, offsetMs }.
     */
    async _splitAudioIntoChunks(audioPath, chunkDurationSec = 55) {
        const totalDuration = await this._probeAudioDuration(audioPath);
        const chunks = [];
        const ext = path.extname(audioPath);
        const baseName = path.basename(audioPath, ext);
        const dir = path.dirname(audioPath);

        if (totalDuration <= chunkDurationSec) {
            return [{ chunkPath: audioPath, offsetMs: 0, isOriginal: true }];
        }

        let startSec = 0;
        let chunkIndex = 0;

        while (startSec < totalDuration) {
            const chunkPath = path.join(dir, `${baseName}_chunk${chunkIndex}${ext}`);
            const duration = Math.min(chunkDurationSec, totalDuration - startSec);

            await new Promise((resolve, reject) => {
                ffmpeg(audioPath)
                    .setStartTime(startSec)
                    .duration(duration)
                    .audioChannels(1)
                    .audioFrequency(16000)
                    .audioCodec('pcm_s16le')
                    .format('wav')
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err))
                    .save(chunkPath);
            });

            chunks.push({
                chunkPath,
                offsetMs: Math.round(startSec * 1000),
                isOriginal: false,
            });

            startSec += chunkDurationSec;
            chunkIndex++;
        }

        this.logLine('INFO', 'STT_CHUNK', 'Audio split into chunks', {
            totalDuration: `${totalDuration.toFixed(1)}s`,
            chunkCount: chunks.length,
            chunkDuration: `${chunkDurationSec}s`,
        });

        return chunks;
    }

    /**
     * Transcribe a single audio buffer using Google Cloud Speech-to-Text v2.
     * Returns raw response results.
     */
    async _transcribeSingleBuffer(audioBuffer, languageCodes) {
        const audioBase64 = audioBuffer.toString('base64');

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

        const [response] = await this.speechClient.recognize({
            recognizer,
            config: recognitionConfig,
            content: audioBase64,
        });

        return response;
    }

    /**
     * Parse Google STT response results into subtitle segments.
     * offsetMs is added to all timestamps (for chunk support).
     */
    _parseResultsToSegments(results, offsetMs = 0) {
        const segments = [];
        let detectedLanguage = null;

        if (!results) return { segments, detectedLanguage };

        for (const result of results) {
            if (!result.alternatives || result.alternatives.length === 0) continue;

            const alt = result.alternatives[0];

            if (result.languageCode && !detectedLanguage) {
                detectedLanguage = result.languageCode;
            }

            if (alt.words && alt.words.length > 0) {
                let currentSegment = { startMs: 0, endMs: 0, words: [] };

                for (const word of alt.words) {
                    const startMs = this._durationToMs(word.startOffset) + offsetMs;
                    const endMs = this._durationToMs(word.endOffset) + offsetMs;

                    if (currentSegment.words.length === 0) {
                        currentSegment.startMs = startMs;
                    }

                    currentSegment.words.push(word.word);
                    currentSegment.endMs = endMs;

                    const segmentDuration = currentSegment.endMs - currentSegment.startMs;
                    const endsWithPunctuation = /[.!?]$/.test(word.word);

                    if (
                        segmentDuration >= SUBTITLE_SEGMENT_DURATION_MS
                        || (
                            segmentDuration >= (SUBTITLE_SEGMENT_DURATION_MS / 2)
                            && endsWithPunctuation
                        )
                    ) {
                        segments.push({
                            startMs: currentSegment.startMs,
                            endMs: currentSegment.endMs,
                            text: currentSegment.words.join(' '),
                        });
                        currentSegment = { startMs: 0, endMs: 0, words: [] };
                    }
                }

                if (currentSegment.words.length > 0) {
                    segments.push({
                        startMs: currentSegment.startMs,
                        endMs: currentSegment.endMs,
                        text: currentSegment.words.join(' '),
                    });
                }
            } else if (alt.transcript) {
                const endMs = this._durationToMs(result.resultEndOffset) + offsetMs;
                const startMs = endMs - 5000;

                segments.push({
                    startMs: Math.max(0, startMs),
                    endMs,
                    text: alt.transcript.trim(),
                });
            }
        }

        return { segments, detectedLanguage };
    }

    /**
     * Transcribe audio using Google Cloud Speech-to-Text v2.
     * Automatically splits audio into chunks if longer than 55 seconds.
     * Returns { segments: [{ startMs, endMs, text }], detectedLanguage }
     */
    async transcribeAudio(audioPath, languageCode = 'auto') {
        if (!this.isAvailable()) {
            throw new Error('Google Cloud STT is not configured. Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID.');
        }

        const languageCodes = languageCode === 'auto'
            ? ['tr-TR', 'en-US']
            : [languageCode];

        const STT_CHUNK_DURATION_SEC = 55;
        const chunkTempPaths = [];

        try {
            const chunks = await this._splitAudioIntoChunks(audioPath, STT_CHUNK_DURATION_SEC);

            // Track temp chunk files for cleanup
            for (const chunk of chunks) {
                if (!chunk.isOriginal) chunkTempPaths.push(chunk.chunkPath);
            }

            const isSingleChunk = chunks.length === 1;

            if (isSingleChunk) {
                // Single chunk: original flow (no splitting needed)
                const audioContent = fs.readFileSync(chunks[0].chunkPath);
                this.logLine('INFO', 'STT_API', 'Sending audio to Google STT', {
                    audioSize: `${(audioContent.length / 1024 / 1024).toFixed(2)}MB`,
                    languages: languageCodes.join(','),
                });

                const response = await this._transcribeSingleBuffer(audioContent, languageCodes);
                const { segments, detectedLanguage } = this._parseResultsToSegments(response.results, 0);

                this.logLine('OK', 'STT_API', 'Transcription completed', {
                    segments: segments.length,
                    detectedLanguage: detectedLanguage || languageCode,
                });

                return { segments, detectedLanguage: detectedLanguage || languageCode };
            }

            // Multi-chunk: process each chunk sequentially
            this.logLine('INFO', 'STT_API', 'Starting chunked transcription', {
                chunks: chunks.length,
                languages: languageCodes.join(','),
            });

            const allSegments = [];
            let finalDetectedLanguage = languageCode;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const audioContent = fs.readFileSync(chunk.chunkPath);

                this.logLine('INFO', 'STT_CHUNK', `Transcribing chunk ${i + 1}/${chunks.length}`, {
                    audioSize: `${(audioContent.length / 1024 / 1024).toFixed(2)}MB`,
                    offsetMs: chunk.offsetMs,
                });

                try {
                    const response = await this._transcribeSingleBuffer(audioContent, languageCodes);
                    const { segments, detectedLanguage } = this._parseResultsToSegments(
                        response.results,
                        chunk.offsetMs,
                    );

                    if (detectedLanguage) finalDetectedLanguage = detectedLanguage;
                    allSegments.push(...segments);

                    this.logLine('OK', 'STT_CHUNK', `Chunk ${i + 1}/${chunks.length} completed`, {
                        segments: segments.length,
                    });
                } catch (chunkErr) {
                    this.logLine('WARN', 'STT_CHUNK', `Chunk ${i + 1}/${chunks.length} failed, skipping`, {
                        error: chunkErr?.message || chunkErr,
                    });
                    // Continue with remaining chunks even if one fails
                }
            }

            this.logLine('OK', 'STT_API', 'Chunked transcription completed', {
                totalSegments: allSegments.length,
                chunks: chunks.length,
                detectedLanguage: finalDetectedLanguage,
            });

            return { segments: allSegments, detectedLanguage: finalDetectedLanguage };
        } catch (err) {
            this.logLine('ERR', 'STT_API', 'Google STT API error', { error: err?.message || err });
            throw err;
        } finally {
            // Cleanup temp chunk files
            for (const tempPath of chunkTempPaths) {
                if (fs.existsSync(tempPath)) {
                    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
                }
            }
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
                    segments,
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
