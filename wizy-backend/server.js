require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Set FFmpeg and FFprobe paths explicitly using static binaries
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('@ffprobe-installer/ffprobe').path;
console.log('✅ FFmpeg path:', ffmpegStatic);
console.log('✅ FFprobe path:', ffprobeStatic);
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);

// Multer: Temporary uploads
const upload = multer({ dest: 'temp_uploads/' });

// Cloudflare R2 Client
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper: Upload to R2
async function uploadToR2(filePath, fileName, contentType) {
    const fileStream = fs.readFileSync(filePath);
    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: fileStream,
        ContentType: contentType,
    }));
    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
}

// HLS Service
const HlsService = require('./services/HlsService');
const hlsService = new HlsService(r2, process.env.R2_BUCKET_NAME); // Use explicit bucket from env

// Endpoint: HLS Video Upload
app.post('/upload-hls', upload.single('video'), async (req, res) => {
    const file = req.file;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    // Determine is_commercial flag
    // 'İş Birliği İçermiyor' means is_commercial = false
    const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';

    const inputPath = file.path;
    const uniqueId = Date.now().toString(); // Simple ID, ideally UUID
    const tempOutputDir = path.join(__dirname, 'temp_uploads');

    // Thumbnail paths
    const thumbFileName = `thumbs/${uniqueId}.jpg`;
    const processedThumbPath = path.join(tempOutputDir, `thumb_${uniqueId}.jpg`);

    console.log(`🎬 [HLS] Processing: ${file.originalname} (ID: ${uniqueId})`);

    // Early response to client (Optimistic UI)? 
    // No, let's keep it sync for the MVP to ensure success, 
    // but in prod this should be a background job.

    try {
        // Step 0: Extract Metadata (Width/Height)
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg(inputPath).ffprobe((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        let width = videoStream ? videoStream.width : 0;
        let height = videoStream ? videoStream.height : 0;
        const duration = parseFloat(metadata.format.duration || 0);

        // Check for rotation (Portrait video filmed as landscape)
        const rotation = videoStream.tags && videoStream.tags.rotate ? parseInt(videoStream.tags.rotate, 10) : 0;
        if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
            console.log(`🔄 [METADATA] Rotation detected (${rotation}°). Swapping dimensions.`);
            [width, height] = [height, width];
        }

        console.log(`📏 [METADATA] Dimensions: ${width}x${height}`);

        const hasAudio = metadata.streams.some(s => s.codec_type === 'audio'); // Check if audio stream exists

        // Step 1: Generate Thumbnail (Still needed for cover)
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions(['-q:v 2']) // Highest JPEG quality
                .screenshots({
                    count: 1,
                    filename: `thumb_${uniqueId}.jpg`,
                    folder: 'temp_uploads',
                    size: '1080x?' // Increased resolution
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Upload Thumbnail
        const thumbUrl = await uploadToR2(processedThumbPath, thumbFileName, 'image/jpeg');

        // FEATURE FLAG: Hybrid Engine Switch
        // true = HLS (Adaptive, Multi-bitrate) | false = MP4 (Direct, High Quality, Fast)
        const ENABLE_HLS = false;

        console.log(`🚀 [UPLOAD] Mode: ${ENABLE_HLS ? 'HLS (Adaptive)' : 'MP4 (Direct)'}`);

        let videoUrl;

        if (ENABLE_HLS) {
            // Option A: HLS Transcoding
            videoUrl = await hlsService.transcodeToHls(inputPath, tempOutputDir, uniqueId, hasAudio, width, height);
            console.log(`🔗 [VIDEO URL] Generated HLS URL: ${videoUrl}`);
        } else {
            // Option B: Smart Optimized MP4 (1080p, CRF 23)
            console.log('⚡ [MP4] Smart Optimization Starting...');

            const optimizedPath = path.join(tempOutputDir, `optimized_${uniqueId}.mp4`);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .videoCodec('libx264')
                    // Resize to 1080p width (keep aspect ratio), but only if input is larger
                    // 'scale=1080:-2' means width=1080, height=calc(maintain aspect), ensure height divisible by 2
                    // But we should check dimensions. Simple approach: 'scale=min(iw\,1080):-2' not supported by helper
                    .size('1080x?')
                    .outputOptions([
                        '-crf 23',           // Visual Quality (Lower = Better, 18-28 is good range)
                        '-preset veryfast',  // Fast encoding
                        '-movflags +faststart', // Move atom to front for instant playback
                        '-pix_fmt yuv420p',  // Ensure compatibility
                        '-maxrate 4M',       // Cap max bitrate for safety (4Mbps is plenty for 1080p mobile)
                        '-bufsize 8M'
                    ])
                    .on('start', (cmd) => console.log('   👉 FFmpeg Command:', cmd))
                    .on('end', () => {
                        console.log('   ✅ Optimization Complete.');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('   ❌ Optimization Failed:', err);
                        reject(err);
                    })
                    .save(optimizedPath);
            });

            // Compare Sizes
            const originalStats = fs.statSync(inputPath);
            const optimizedStats = fs.statSync(optimizedPath);
            console.log(`   📉 Size: ${(originalStats.size / 1024 / 1024).toFixed(2)}MB -> ${(optimizedStats.size / 1024 / 1024).toFixed(2)}MB`);

            const mp4Key = `videos/${uniqueId}/master.mp4`;
            await uploadToR2(optimizedPath, mp4Key, 'video/mp4');
            videoUrl = `${process.env.R2_PUBLIC_URL}/${mp4Key}`;
            console.log(`🔗 [VIDEO URL] Optimized MP4 URL: ${videoUrl}`);

            // Cleanup optimized file
            if (fs.existsSync(optimizedPath)) fs.unlinkSync(optimizedPath);
        }

        // Step 2.5: Generate Sprite Sheet (2s intervals)
        // CRITICAL: We generate sprites even for MP4 mode so seekbar preview works!
        const spriteUrl = await hlsService.generateSpriteSheet(inputPath, tempOutputDir, uniqueId, duration);
        console.log(`🖼️ [SPRITE] Generated sprite URL: ${spriteUrl}`);

        // Step 3: Save metadata to Supabase
        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: userId || 'test-user',
                video_url: videoUrl,
                thumbnail_url: thumbUrl,
                sprite_url: spriteUrl,
                description: description || '',
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                commercial_type: commercialType || null,
                is_commercial: isCommercial,
                width: width,
                height: height,
                likes_count: 0,
                views_count: 0,
                processing_status: 'completed'
            })
            .select();

        if (error) throw error;

        console.log('🎉 [HLS] Upload & Processing successful!');

        res.json({
            success: true,
            message: 'Video uploaded and transcoded to HLS',
            data: data[0]
        });

        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(processedThumbPath)) fs.unlinkSync(processedThumbPath);

        // Cleanup HLS folder
        const hlsFolder = path.join(tempOutputDir, uniqueId);
        if (fs.existsSync(hlsFolder)) {
            fs.rmSync(hlsFolder, { recursive: true, force: true });
        }

    } catch (error) {
        console.error('❌ [HLS] Error:', error);
        res.status(500).json({ error: error.message });

        // Basic cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
});

// Endpoint: DELETE Video (Soft Delete by default)
app.delete('/videos/:id', async (req, res) => {
    const videoId = req.params.id;
    const force = req.query.force === 'true'; // ?force=true for permanent delete

    console.log(`\n\n🗑️ [DELETE REQUEST START]`);
    console.log(`   📝 Video ID: ${videoId}`);
    console.log(`   ❓ Force Query Param: "${req.query.force}"`);
    console.log(`   🛡️ Parsed Force Mode: ${force}`);
    console.log(`   👉 Decision: ${force ? 'HARD DELETE (Permanent)' : 'SOFT DELETE (Trash)'}`);

    try {
        if (force) {
            // ============================================
            // HARD DELETE (Permanent)
            // ============================================

            // 1. Get video info
            const { data: video, error: fetchError } = await supabase
                .from('videos')
                .select('*')
                .eq('id', videoId)
                .single();

            if (fetchError || !video) {
                console.warn(`   ⚠️ Video not found during HARD delete search. Error: ${fetchError?.message}`);
                return res.status(404).json({ error: 'Video not found' });
            }

            // 2. R2 Cleanup
            let timestampId = null;
            try {
                const match = video.video_url.match(/videos\/(\d+)/);
                if (match && match[1]) timestampId = match[1];
            } catch (e) {
                console.error('Error parsing video URL:', e);
            }

            if (timestampId) {
                try {
                    const folderPrefix = `videos/${timestampId}`;
                    console.log(`   👉 [HARD] Cleaning R2 Folder: ${folderPrefix}`);

                    const listCmd = new ListObjectsV2Command({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Prefix: folderPrefix
                    });
                    const listRes = await r2.send(listCmd);

                    if (listRes.Contents && listRes.Contents.length > 0) {
                        const deleteParams = {
                            Bucket: process.env.R2_BUCKET_NAME,
                            Delete: {
                                Objects: listRes.Contents.map(obj => ({ Key: obj.Key }))
                            }
                        };
                        await r2.send(new DeleteObjectsCommand(deleteParams));
                        console.log('   ✅ R2 Folder Deleted.');
                    }

                    // Delete Thumbnail
                    let thumbKey = `thumbs/${timestampId}.jpg`;
                    try {
                        await r2.send(new DeleteObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: thumbKey
                        }));
                        console.log(`   ✅ R2 Thumbnail Deleted.`);
                    } catch (e) { }

                } catch (r2Error) {
                    console.error('   ⚠️ R2 Cleanup Error:', r2Error.message);
                }
            }

            // 3. DB Delete
            const { error: deleteError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (deleteError) throw deleteError;

            console.log('✅ [HARD DELETE] Completed.');
            return res.json({ success: true, message: 'Video permanently deleted' });

        } else {
            // ============================================
            // SOFT DELETE
            // ============================================
            console.log(`   👉 Attempting Soft Delete via RPC for ${videoId}`);
            const { error } = await supabase.rpc('soft_delete_video', { video_id: videoId });

            if (error) {
                console.error('   ❌ Soft Delete RPC Error:', error);
                throw error;
            }

            // Verify if it was actually deleted (optional but good for feedback)
            // Just assume success if no error, as RPC handles it.
            // If the ID didn't exist, the update inside RPC just does nothing.
            // We can check if we want to return 404, but for now Success is fine.

            console.log('✅ [SOFT DELETE] Video marked as deleted.');
            return res.json({ success: true, message: 'Video moved to trash' });
        }

    } catch (error) {
        console.error('❌ [DELETE] Unexpected Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Endpoint: RESTORE Video
app.post('/videos/:id/restore', async (req, res) => {
    const videoId = req.params.id;
    console.log(`♻️ [RESTORE] Request for video: ${videoId}`);

    try {
        console.log(`   👉 Attempting Restore via RPC for ${videoId}`);
        const { error } = await supabase.rpc('restore_video', { video_id: videoId });

        if (error) {
            console.error('   ❌ Restore RPC Error:', error);
            throw error;
        }

        console.log('✅ [RESTORE] Video restored successfully.');
        res.json({ success: true, message: 'Video restored' });

    } catch (error) {
        console.error('❌ [RESTORE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(process.env.PORT, () => {
    console.log(`🚀 Video Backend running on http://localhost:${process.env.PORT}`);
    console.log(`📦 Target Bucket: "${process.env.R2_BUCKET_NAME}"`); // DEBUG LOG
    console.log(`📡 Ready to accept uploads`);
});
