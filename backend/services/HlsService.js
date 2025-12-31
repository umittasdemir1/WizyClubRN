const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

class HlsService {
    constructor(r2Client, bucketName) {
        this.r2 = r2Client;
        this.bucket = bucketName;
    }

    async transcodeToHls(inputPath, outputDir, videoId, outputR2Path, hasAudio = true, originalWidth = 1920, originalHeight = 1080) {
        const hlsOutputDir = path.join(outputDir, videoId);
        if (!fs.existsSync(hlsOutputDir)) {
            fs.mkdirSync(hlsOutputDir, { recursive: true });
        }

        const masterPlaylistName = 'master.m3u8';
        const isPortrait = originalHeight > originalWidth;

        console.log(`🎬 [HLS] Transcoding for ${videoId}... Shape: ${isPortrait ? 'PORTRAIT' : 'LANDSCAPE'} (${originalWidth}x${originalHeight})`);
        console.log(`   📂 Target R2 Path: ${outputR2Path}`);

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
                .on('start', (cmd) => console.log('⚡ [FFmpeg]:', cmd))
                .on('progress', (p) => p.percent && console.log(`⏳ ${p.percent.toFixed(1)}%`))
                .on('end', async () => {
                    console.log(`✅ Done.`);
                    try {
                        // Pass outputR2Path to upload function
                        const url = await this.uploadHlsFolderToR2(hlsOutputDir, outputR2Path, masterPlaylistName);
                        resolve(url);
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('error', (err) => {
                    console.error('❌ [FFmpeg]:', err.message);
                    reject(err);
                })
                .run();
        });
    }

    async uploadHlsFolderToR2(folder, targetPrefix, masterFile) {
        const files = fs.readdirSync(folder);
        console.log(`☁️ Uploading ${files.length} files to ${targetPrefix}...`);

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

        console.log('🎉 Upload complete!');
        return `${process.env.R2_PUBLIC_URL}/${targetPrefix}/${masterFile}`;
    }

    async generateSpriteSheet(inputPath, outputDir, videoId, outputR2Path, duration = 0) {
        // ... (sprite logic) ...
        const SEGMENT_DURATION = 100;
        const segments = Math.ceil((duration || 1) / SEGMENT_DURATION);

        console.log(`🖼️ [Sprite] Generating MULTI-PART sprite system. Duration: ${duration}s.`);

        let firstUrl = '';

        for (let i = 0; i < segments; i++) {
            const startTime = i * SEGMENT_DURATION;
            const spriteFileName = `sprite_${i}.jpg`; // Removed videoId for cleaner path if desired? No keep consistent.
            // Actually, kept convention `sprite_${videoId}_${i}` in original.
            // Let's perform a minor cleanup: `sprite_${i}.jpg` is enough if folder is `videos/UUID`.
            // But let's stick to simple change first: use `outputR2Path`.

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
            console.log(`   ☁️ Uploading ${spriteName}...`);
            const stream = fs.readFileSync(spritePath);
            const r2Key = `${outputR2Path}/${spriteName}`; // USE outputR2Path

            await this.r2.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: r2Key,
                Body: stream,
                ContentType: 'image/jpeg'
            }));

            if (i === 0) {
                firstUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;
            }

            fs.unlinkSync(spritePath);
        }

        return firstUrl;
    }
}

module.exports = HlsService;
