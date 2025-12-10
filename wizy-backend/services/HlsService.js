const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

class HlsService {
    constructor(r2Client, bucketName) {
        this.r2 = r2Client;
        this.bucket = bucketName;
    }

    async transcodeToHls(inputPath, outputDir, videoId) {
        const hlsOutputDir = path.join(outputDir, videoId);
        if (!fs.existsSync(hlsOutputDir)) {
            fs.mkdirSync(hlsOutputDir, { recursive: true });
        }

        const masterPlaylistName = 'master.m3u8';

        console.log(`🎬 [HLS] Starting transcoding for ${videoId}...`);
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-preset medium',
                    '-g 48',
                    '-sc_threshold 0',
                    '-hls_time 6',
                    '-hls_list_size 0',
                    '-hls_segment_filename', `${hlsOutputDir}/section_%v_%03d.ts`
                ])
                .outputOptions([
                    '-map 0:v:0', '-map 0:a:0',
                    '-s:v:0 1920x1080', '-c:v:0 libx264',
                    '-b:v:0 2500k', '-maxrate:v:0 3000k', '-bufsize:v:0 4000k'
                ])
                .outputOptions([
                    '-map 0:v:0', '-map 0:a:0',
                    '-s:v:1 1280x720', '-c:v:1 libx264',
                    '-b:v:1 1200k', '-maxrate:v:1 1500k', '-bufsize:v:1 2000k'
                ])
                .outputOptions([
                    '-map 0:v:0', '-map 0:a:0',
                    '-s:v:2 854x480', '-c:v:2 libx264',
                    '-b:v:2 600k', '-maxrate:v:2 800k', '-bufsize:v:2 1000k'
                ])
                .outputOptions(['-c:a aac', '-b:a 128k', '-ar 44100'])
                .outputOptions([
                    '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2',
                    '-master_pl_name', masterPlaylistName,
                    '-f hls'
                ])
                .output(`${hlsOutputDir}/stream_%v.m3u8`)
                .on('start', (cmd) => console.log('⚡ [FFmpeg]:', cmd))
                .on('progress', (p) => p.percent && console.log(`⏳ ${p.percent.toFixed(1)}%`))
                .on('end', async () => {
                    console.log(`✅ Done (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);
                    try {
                        const url = await this.uploadHlsFolderToR2(hlsOutputDir, videoId, masterPlaylistName);
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

    async uploadHlsFolderToR2(folder, videoId, masterFile) {
        const files = fs.readdirSync(folder);
        console.log(`☁️ Uploading ${files.length} files...`);

        await Promise.all(files.map(async (file) => {
            const stream = fs.readFileSync(path.join(folder, file));
            const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

            await this.r2.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: `videos/${videoId}/${file}`,
                Body: stream,
                ContentType: contentType
            }));
        }));

        console.log('🎉 Upload complete!');
        return `${process.env.R2_PUBLIC_URL}/videos/${videoId}/${masterFile}`;
    }

    async generateSpriteSheet(inputPath, outputDir, videoId) {
        const spriteFileName = `sprite_${videoId}.jpg`;
        const spritePath = path.join(outputDir, spriteFileName);

        console.log(`🖼️ [Sprite] Generating VERTICAL sprite sheet (100x180, 10 columns)...`);

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vf', 'fps=1,scale=100:180,tile=10x100', // 100x180, 1 screenshot per second
                    '-frames:v', '1',
                    '-q:v', '2'
                ])
                .output(spritePath)
                .on('start', (cmd) => console.log('⚡ [Sprite]:', cmd))
                .on('end', async () => {
                    try {
                        console.log('✅ [Sprite] Generated!');
                        const stream = fs.readFileSync(spritePath);
                        const r2Key = `videos/${videoId}/${spriteFileName}`;

                        await this.r2.send(new PutObjectCommand({
                            Bucket: this.bucket,
                            Key: r2Key,
                            Body: stream,
                            ContentType: 'image/jpeg'
                        }));

                        const url = `${process.env.R2_PUBLIC_URL}/${r2Key}`;
                        console.log(`🎉 [Sprite] Uploaded: ${url}`);
                        fs.unlinkSync(spritePath);
                        resolve(url);
                    } catch (err) {
                        console.error('❌ [Sprite Upload]:', err);
                        reject(err);
                    }
                })
                .on('error', (err) => {
                    console.error('❌ [Sprite]:', err.message);
                    reject(err);
                })
                .run();
        });
    }
}

module.exports = HlsService;
