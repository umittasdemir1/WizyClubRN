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
        const ENABLE_HLS = true;

        console.log(`🚀 [UPLOAD] Mode: ${ENABLE_HLS ? 'HLS (Adaptive)' : 'MP4 (Direct)'}`);

        let videoUrl;

        if (ENABLE_HLS) {
            // Option A: HLS Transcoding
            videoUrl = await hlsService.transcodeToHls(inputPath, tempOutputDir, uniqueId, hasAudio, width, height);
            console.log(`🔗 [VIDEO URL] Generated HLS URL: ${videoUrl}`);
        } else {
            // Option B: MP4 Direct Upload (Pass-through)
            console.log('⚡ [MP4] Skipping transcoding, uploading original MP4...');
            const mp4Key = `videos/${uniqueId}/master.mp4`;
            await uploadToR2(inputPath, mp4Key, 'video/mp4');
            videoUrl = `${process.env.R2_PUBLIC_URL}/${mp4Key}`;
            console.log(`🔗 [VIDEO URL] Direct MP4 URL: ${videoUrl}`);
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

// Endpoint: DELETE Video (Cleanup)
app.delete('/videos/:id', async (req, res) => {
    const videoId = req.params.id;
    console.log(`🗑️ [DELETE] Request for video: ${videoId}`);

    try {
        // 1. Get video info from Supabase
        const { data: video, error: fetchError } = await supabase
            .from('videos')
            .select('*')
            .eq('id', videoId)
            .single();

        if (fetchError || !video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // 2. Extract Timestamp from URL for R2 Cleanup
        // We need the timestamp folder (e.g. 1765387...) NOT the UUID.
        let timestampId = null;
        try {
            // URL: .../videos/1765387197168/master.m3u8
            // Matches /videos/Digits/
            const match = video.video_url.match(/videos\/(\d+)/);
            if (match && match[1]) {
                timestampId = match[1];
            }
        } catch (e) {
            console.error('Error parsing video URL:', e);
        }

        console.log(`🗑️ [DELETE] UUID: ${videoId} | TimestampID: ${timestampId || 'NOT_FOUND'}`);

        // 3. Delete from R2 (Correct Prefix Logic)
        if (timestampId) {
            try {
                // User Recommendation: Remove trailing slash for broader matching
                const folderPrefix = `videos/${timestampId}`;
                console.log(`   👉 R2 Target Prefix: ${folderPrefix}`);

                const listCmd = new ListObjectsV2Command({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Prefix: folderPrefix
                });
                const listRes = await r2.send(listCmd);

                if (listRes.Contents && listRes.Contents.length > 0) {
                    console.log(`   found ${listRes.Contents.length} objects. Deleting...`);
                    const deleteParams = {
                        Bucket: process.env.R2_BUCKET_NAME,
                        Delete: {
                            Objects: listRes.Contents.map(obj => ({ Key: obj.Key }))
                        }
                    };
                    await r2.send(new DeleteObjectsCommand(deleteParams));
                    console.log('   ✅ R2 Folder Deleted.');
                } else {
                    console.log('   ℹ️ R2 Folder not found or empty.');
                }

                // Delete Thumbnail
                const thumbKey = `thumbs/${timestampId}.jpg`;
                try {
                    await r2.send(new DeleteObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Key: thumbKey
                    }));
                    console.log(`   ✅ R2 Thumbnail Deleted: ${thumbKey}`);
                } catch (e) { console.warn('   ⚠️ Thumbnail delete skipped/failed'); }

            } catch (r2Error) {
                console.error('   ⚠️ R2 Cleanup Error:', r2Error.message);
            }
        } else {
            console.warn('   ⚠️ Skipping R2 delete: Could not extract timestamp from URL.');
        }

        // 4. Delete from Supabase (Via RPC if available, else standard)
        // Try RPC first for "Force Delete" (Bypass RLS)
        const { error: rpcError } = await supabase.rpc('force_delete_video', { vid: videoId });

        if (rpcError) {
            console.warn('   ⚠️ RPC force_delete_video failed (maybe not created?). Falling back to standard delete.', rpcError.message);
            const { error: deleteError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (deleteError) {
                console.error('   ❌ DB Delete Failed:', deleteError);
                return res.status(500).json({ error: 'Failed to delete video record' });
            }
        }

        console.log('✅ [DELETE] Process Completed.');
        res.json({ success: true, message: 'Video deleted successfully' });
    } catch (error) {
        console.error('❌ [DELETE] Unexpected Error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
