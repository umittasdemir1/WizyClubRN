const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function serializeMeta(meta) {
    if (meta == null) return '';
    if (typeof meta === 'string') return meta;
    if (meta instanceof Error) return meta.message;
    if (typeof meta !== 'object') return String(meta);
    return Object.entries(meta)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
        .join(' ');
}

function fallbackLogLine(level, scope, message, meta) {
    const metaText = serializeMeta(meta);
    const line = `[${new Date().toISOString()}] ${level} [${scope}] ${message}${metaText ? ` | ${metaText}` : ''}`;
    if (level === 'ERR') {
        console.error(line);
        return;
    }
    console.log(line);
}

function fallbackLogBanner(title, lines = []) {
    console.log(`\n========== ${title} ==========`);
    for (const line of lines) {
        console.log(` - ${line}`);
    }
    console.log('================================\n');
}

class HlsService {
    constructor(r2Client, bucketName, logger = {}) {
        this.r2 = r2Client;
        this.bucket = bucketName;
        this.logLine = typeof logger.logLine === 'function' ? logger.logLine : fallbackLogLine;
        this.logBanner = typeof logger.logBanner === 'function' ? logger.logBanner : fallbackLogBanner;
    }

    async transcodeToHls(inputPath, outputDir, videoId, outputR2Path, hasAudio = true, originalWidth = 1920, originalHeight = 1080) {
        const hlsOutputDir = path.join(outputDir, videoId);
        if (!fs.existsSync(hlsOutputDir)) {
            fs.mkdirSync(hlsOutputDir, { recursive: true });
        }

        const masterPlaylistName = 'master.m3u8';
        const isPortrait = originalHeight > originalWidth;

        this.logBanner('HLS TRANSCODE REQUEST', [
            `Video ID      : ${videoId}`,
            `Orientation   : ${isPortrait ? 'PORTRAIT' : 'LANDSCAPE'}`,
            `Source Dims   : ${originalWidth}x${originalHeight}`,
            `Target Prefix : ${outputR2Path}`,
        ]);

        // ... (resolution calculation logic remains same) ...

        const getDims = (targetShortSide) => {
            const ratio = originalWidth / originalHeight;
            let w, h;
            if (isPortrait) {
                w = targetShortSide;
                h = Math.round(w / ratio);
            } else {
                h = targetShortSide;
                w = Math.round(h * ratio);
            }
            if (w % 2 !== 0) w++;
            if (h % 2 !== 0) h++;
            return `${w}x${h}`;
        };

        const resHigh = getDims(1080);
        const resMed = getDims(720);
        const resLow = getDims(480);

        // ... (ffmpeg setup remains same) ...

        return new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)
                .outputOptions([
                    '-preset veryfast',
                    '-g 48',
                    '-sc_threshold 0',
                    '-hls_time 6',
                    '-hls_list_size 0',
                    '-hls_segment_filename', `${hlsOutputDir}/section_%v_%03d.ts`
                ]);

            // ... (streams config remains same) ...

            // Stream 0 (High)
            const stream0 = ['-map 0:v:0', `-s:v:0 ${resHigh}`, '-c:v:0 libx264', '-b:v:0 2500k', '-maxrate:v:0 3000k', '-bufsize:v:0 4000k'];
            if (hasAudio) stream0.unshift('-map 0:a:0');
            command.outputOptions(stream0);

            // Stream 1 (Medium)
            const stream1 = ['-map 0:v:0', `-s:v:1 ${resMed}`, '-c:v:1 libx264', '-b:v:1 1200k', '-maxrate:v:1 1500k', '-bufsize:v:1 2000k'];
            if (hasAudio) stream1.unshift('-map 0:a:0');
            command.outputOptions(stream1);

            // Stream 2 (Low)
            const stream2 = ['-map 0:v:0', `-s:v:2 ${resLow}`, '-c:v:2 libx264', '-b:v:2 600k', '-maxrate:v:2 800k', '-bufsize:v:2 1000k'];
            if (hasAudio) stream2.unshift('-map 0:a:0');
            command.outputOptions(stream2);

            if (hasAudio) {
                command.outputOptions(['-c:a aac', '-b:a 128k', '-ar 44100']);
            }

            const mapStr = hasAudio ? 'v:0,a:0 v:1,a:1 v:2,a:2' : 'v:0 v:1 v:2';

            command.outputOptions([
                '-var_stream_map', mapStr,
                '-master_pl_name', masterPlaylistName,
                '-f hls'
            ])
                .output(`${hlsOutputDir}/stream_%v.m3u8`)
                .on('start', (cmd) => this.logLine('INFO', 'HLS_FFMPEG', 'FFmpeg command started', { videoId, cmd }))
                .on('progress', (p) => p.percent && this.logLine('INFO', 'HLS_FFMPEG', 'FFmpeg progress', {
                    videoId,
                    percent: Number(p.percent.toFixed(1)),
                }))
                .on('end', async () => {
                    this.logLine('OK', 'HLS_FFMPEG', 'FFmpeg transcode completed', { videoId });
                    try {
                        // Pass outputR2Path to upload function
                        const url = await this.uploadHlsFolderToR2(hlsOutputDir, outputR2Path, masterPlaylistName);
                        resolve(url);
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('error', (err) => {
                    this.logLine('ERR', 'HLS_FFMPEG', 'FFmpeg transcode failed', { videoId, error: err?.message || err });
                    reject(err);
                })
                .run();
        });
    }

    async uploadHlsFolderToR2(folder, targetPrefix, masterFile) {
        const files = fs.readdirSync(folder);
        this.logLine('INFO', 'HLS_UPLOAD', 'Uploading HLS files to R2', {
            targetPrefix,
            fileCount: files.length,
        });

        await Promise.all(files.map(async (file) => {
            const stream = fs.readFileSync(path.join(folder, file));
            const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

            await this.r2.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: `${targetPrefix}/${file}`, // USE targetPrefix (media/uid/videos/vid)
                Body: stream,
                ContentType: contentType
            }));
        }));

        this.logLine('OK', 'HLS_UPLOAD', 'HLS upload complete', { targetPrefix, fileCount: files.length });
        return `${process.env.R2_PUBLIC_URL}/${targetPrefix}/${masterFile}`;
    }

    async generateSpriteSheet(inputPath, outputDir, videoId, outputR2Path, duration = 0) {
        // ... (sprite logic) ...
        const SEGMENT_DURATION = 100;
        const segments = Math.ceil((duration || 1) / SEGMENT_DURATION);

        this.logLine('INFO', 'SPRITE', 'Generating multi-part sprite', {
            videoId,
            durationSeconds: duration,
            segments,
        });

        let firstUrl = '';

        for (let i = 0; i < segments; i++) {
            const startTime = i * SEGMENT_DURATION;
            const spriteName = `sprite_${videoId}_${i}.jpg`;
            const spritePath = path.join(outputDir, spriteName);

            // ... (ffmpeg generation) ...
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .outputOptions([
                        `-ss ${startTime}`,
                        `-t ${SEGMENT_DURATION}`,
                        '-vf', 'fps=1,scale=200:360:force_original_aspect_ratio=decrease,pad=200:360:(ow-iw)/2:(oh-ih)/2:black,tile=10x10',
                        '-frames:v', '1',
                        '-q:v', '2'
                    ])
                    .output(spritePath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            // Upload Part
            this.logLine('INFO', 'SPRITE', 'Uploading sprite part', { videoId, spriteName, partIndex: i });
            const stream = fs.readFileSync(spritePath);
            const r2Key = `${outputR2Path}/${spriteName}`; // USE outputR2Path

            const maxAttempts = 3;
            let uploaded = false;
            let lastError = null;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await this.r2.send(new PutObjectCommand({
                        Bucket: this.bucket,
                        Key: r2Key,
                        Body: stream,
                        ContentType: 'image/jpeg'
                    }));
                    uploaded = true;
                    break;
                } catch (error) {
                    lastError = error;
                    const cause = error?.cause;
                    this.logLine(attempt < maxAttempts ? 'WARN' : 'ERR', 'SPRITE', 'Sprite upload attempt failed', {
                        videoId,
                        spriteName,
                        partIndex: i,
                        attempt,
                        maxAttempts,
                        error: error?.message || error,
                        code: error?.code,
                        cause: cause?.message || cause,
                        causeCode: cause?.code,
                    });
                    if (attempt < maxAttempts) {
                        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
                    }
                }
            }

            if (!uploaded) {
                throw lastError || new Error(`Sprite upload failed for ${spriteName}`);
            }

            if (i === 0) {
                firstUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;
            }

            fs.unlinkSync(spritePath);
        }

        return firstUrl;
    }
}

module.exports = HlsService;
