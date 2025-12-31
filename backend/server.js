require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os'); // For temp directory in story uploads

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Set FFmpeg and FFprobe paths explicitly using static binaries
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('@ffprobe-installer/ffprobe').path;
console.log('✅ FFmpeg path:', ffmpegStatic);
console.log('✅ FFprobe path:', ffprobeStatic);
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);

// Multer: Temporary uploads
const upload = multer({ dest: 'temp_uploads/' });

console.log('4. Initializing R2 Client...');
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

console.log('5. Initializing Supabase Client...');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper: Upload to R2 with CDN Cache Headers
async function uploadToR2(filePath, fileName, contentType) {
    const fileStream = fs.readFileSync(filePath);
    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: fileStream,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable', // 1 year CDN cache
    }));
    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
}

console.log('6. Loading HlsService...');
const HlsService = require('./services/HlsService');
console.log('7. Initializing HlsService...');
const hlsService = new HlsService(r2, process.env.R2_BUCKET_NAME);
console.log('8. HlsService READY.');

// 🔥 Upload Progress Tracking
const uploadProgress = new Map(); // { uniqueId: { stage: string, percent: number } }

// Endpoint: Get Upload Progress
app.get('/upload-progress/:id', (req, res) => {
    const progress = uploadProgress.get(req.params.id);
    if (!progress) {
        return res.json({ stage: 'unknown', percent: 0 });
    }
    res.json(progress);
});

// Helper: Update progress
function setUploadProgress(id, stage, percent) {
    uploadProgress.set(id, { stage, percent });
    console.log(`📊 [PROGRESS] ${id}: ${stage} - ${percent}%`);
}

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
    const uniqueId = uuidv4(); // Professional UUID instead of timestamp
    const tempOutputDir = path.join(__dirname, 'temp_uploads');

    // Professional Content Routing (media/{userId}/videos/{videoId}/...)
    const baseKey = `media/${userId || 'test-user'}/videos/${uniqueId}`;
    const thumbFileName = `${baseKey}/thumb.jpg`;
    const processedThumbPath = path.join(tempOutputDir, `thumb_${uniqueId}.jpg`);

    console.log(`\n🎬 [HLS] --- NEW UPLOAD START ---`);
    console.log(`🎬 [HLS] File: ${file.originalname}`);
    console.log(`🎬 [HLS] ID: ${uniqueId}`);
    console.log(`🎬 [HLS] UserID: ${userId}`);
    console.log(`🎬 [HLS] Description: ${description}`);

    // Early response to client (Optimistic UI)? 
    // No, let's keep it sync for the MVP to ensure success, 
    // but in prod this should be a background job.

    try {
        setUploadProgress(uniqueId, 'analyzing', 5);
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
        setUploadProgress(uniqueId, 'thumbnail', 15);

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
        setUploadProgress(uniqueId, 'video', 25);

        // FEATURE FLAG: Hybrid Engine Switch
        // true = HLS (Adaptive, Multi-bitrate) | false = MP4 (Direct, High Quality, Fast)
        const ENABLE_HLS = false;

        console.log(`🚀 [UPLOAD] Mode: ${ENABLE_HLS ? 'HLS (Adaptive)' : 'MP4 (Direct)'}`);

        let videoUrl;

        if (ENABLE_HLS) {
            // Option A: HLS Transcoding
            videoUrl = await hlsService.transcodeToHls(inputPath, tempOutputDir, uniqueId, baseKey, hasAudio, width, height);
            console.log(`🔗 [VIDEO URL] Generated HLS URL: ${videoUrl}`);
        } else {
            // Option B: Smart Optimized MP4 (CRF 26, TikTok-style compression)
            console.log('⚡ [MP4] Smart Optimization Starting...');
            console.log(`   📂 Input: ${inputPath}`);
            console.log(`   📐 Original Dimensions: ${width}x${height}`);
            const optimizedPath = path.join(tempOutputDir, `optimized_${uniqueId}.mp4`);
            console.log(`   📂 Output: ${optimizedPath}`);

            // Smart Scaling: Only downscale if video is larger than 1080p width
            const shouldScale = width > 1080;
            console.log(`   🎯 Scaling: ${shouldScale ? 'YES (downscale to 1080p)' : 'NO (keep original size)'}`);

            await new Promise((resolve, reject) => {
                let cmd = ffmpeg(inputPath)
                    .videoCodec('libx264');

                // Only apply scaling if needed (prevents upscaling small videos)
                if (shouldScale) {
                    cmd = cmd.size('1080x?');
                }

                cmd.outputOptions([
                    '-crf 26',           // TikTok-style compression (smaller files, good quality)
                    '-preset veryfast',  // Fast encoding
                    '-movflags +faststart', // Move atom to front for instant playback
                    '-pix_fmt yuv420p',  // Ensure compatibility
                    '-maxrate 3M',       // Lower max bitrate for mobile-optimized delivery
                    '-bufsize 6M'
                ])
                    .on('start', (cmdLine) => console.log('   👉 FFmpeg Command:', cmdLine))
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

            const mp4Key = `${baseKey}/master.mp4`;
            console.log(`🚀 [R2] Uploading MP4 to: ${mp4Key}...`);
            await uploadToR2(optimizedPath, mp4Key, 'video/mp4');
            videoUrl = `${process.env.R2_PUBLIC_URL}/${mp4Key}`;
            console.log(`🔗 [VIDEO URL] Optimized MP4 URL: ${videoUrl}`);

            // Cleanup optimized file
            if (fs.existsSync(optimizedPath)) fs.unlinkSync(optimizedPath);
        }
        setUploadProgress(uniqueId, 'sprite', 70);

        // Step 2.5: Generate Sprite Sheet (2s intervals)
        console.log(`🖼️ [SPRITE] Generating sprite sheet for ${duration}s video...`);
        const spriteUrl = await hlsService.generateSpriteSheet(inputPath, tempOutputDir, uniqueId, baseKey, duration);
        console.log(`🖼️ [SPRITE] Generated sprite URL: ${spriteUrl}`);
        setUploadProgress(uniqueId, 'saving', 85);

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
        setUploadProgress(uniqueId, 'done', 100);

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


// ============================================
// Endpoint: STORY Upload (Simple, no HLS)
// ============================================
app.post('/upload-story', upload.single('video'), async (req, res) => {
    const file = req.file;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const uniqueId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const inputPath = file.path;
    const isVideo = file.mimetype.startsWith('video/');
    const fileExtension = isVideo ? 'mp4' : 'jpg';
    const baseKey = `stories/${userId}/${uniqueId}`;

    console.log(`📖 [STORY] Upload started: ${uniqueId}`);
    console.log(`📖 [STORY] User: ${userId}, Type: ${isVideo ? 'video' : 'image'}`);

    try {
        let storyUrl = '';
        let thumbnailUrl = '';
        let width = 0;
        let height = 0;

        if (isVideo) {
            // Get video metadata
            const metadata = await new Promise((resolve, reject) => {
                ffmpeg(inputPath).ffprobe((err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            width = videoStream?.width || 1080;
            height = videoStream?.height || 1920;

            // Upload original video to R2 (no transcoding for stories)
            const videoKey = `${baseKey}/story.${fileExtension}`;
            await uploadToR2(inputPath, videoKey, file.mimetype);
            storyUrl = `${process.env.R2_PUBLIC_URL}/${videoKey}`;

            // Generate thumbnail
            const thumbPath = path.join(os.tmpdir(), `${uniqueId}_thumb.jpg`);
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .screenshots({
                        count: 1,
                        folder: os.tmpdir(),
                        filename: `${uniqueId}_thumb.jpg`,
                        size: '?x480'
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            const thumbKey = `${baseKey}/thumb.jpg`;
            await uploadToR2(thumbPath, thumbKey, 'image/jpeg');
            thumbnailUrl = `${process.env.R2_PUBLIC_URL}/${thumbKey}`;

            // Cleanup temp thumb
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        } else {
            // Image story - upload directly
            const imageKey = `${baseKey}/story.jpg`;
            await uploadToR2(inputPath, imageKey, file.mimetype);
            storyUrl = `${process.env.R2_PUBLIC_URL}/${imageKey}`;
            thumbnailUrl = storyUrl; // Same as image for photos
        }

        // Insert into stories table
        const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        const { data, error } = await supabase.from('stories').insert({
            user_id: userId,
            video_url: storyUrl,
            thumbnail_url: thumbnailUrl,
            width,
            height,
            is_commercial: isCommercial,
            brand_name: brandName || null,
            brand_url: brandUrl || null,
            commercial_type: commercialType || null,
            expires_at: expiresAt.toISOString()
        }).select();

        if (error) {
            console.error('❌ [STORY] Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log('🎉 [STORY] Upload successful!', data[0]?.id);

        res.json({
            success: true,
            message: 'Story uploaded successfully',
            data: data[0]
        });

        // Cleanup input file
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    } catch (error) {
        console.error('❌ [STORY] Error:', error);
        res.status(500).json({ error: error.message });

        // Cleanup
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

    // 🔐 JWT Authentication
    const authHeader = req.headers.authorization;
    console.log(`   🔑 Auth Header: ${authHeader ? 'Present' : 'MISSING'}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`   ❌ No valid Authorization header`);
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated Supabase client (respects RLS)
    const dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log(`   👤 Auth User: ${user?.id || 'NONE'} | Error: ${authError?.message || 'NONE'}`);

    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        if (force) {
            // ============================================
            // HARD DELETE (Permanent)
            // ============================================

            // 1. Get video info (using authenticated client)
            const { data: video, error: fetchError } = await dbClient
                .from('videos')
                .select('*')
                .eq('id', videoId)
                .single();

            if (fetchError || !video) {
                console.warn(`   ⚠️ Video not found during HARD delete search. Error: ${fetchError?.message}`);
                return res.status(404).json({ error: 'Video not found' });
            }

            // 1. Fetch Video Details (Already done above as 'video')
            // Using 'video' object which contains video_url, sprite_url, thumbnail_url since we selected '*'

            // 2. R2 Cleanup - Support BOTH legacy and new URL formats
            const videoUrl = video.video_url;
            const pathsToClean = new Set();

            // A. Add Video Folder (Main)
            let videoFolder = null;
            if (videoUrl.includes('/media/')) {
                const match = videoUrl.match(/media\/.*\/videos\/[^\/]+/); // media/USER/videos/UUID
                if (match) videoFolder = match[0];
            } else if (videoUrl.includes('/videos/')) {
                const match = videoUrl.match(/videos\/[^\/]+/); // videos/UUID
                if (match) videoFolder = match[0];
            }
            if (videoFolder) pathsToClean.add(videoFolder);

            // B. Add Sprite Folder (Often 'videos/UUID' even if main video is in 'media/')
            if (video?.sprite_url) {
                const spriteMatch = video.sprite_url.match(/videos\/[^\/]+/); // videos/UUID
                if (spriteMatch) {
                    pathsToClean.add(spriteMatch[0]);
                    console.log(`   found separate sprite folder: ${spriteMatch[0]}`);
                }
            }

            // Execute Cleanup for all identified folders
            for (const folder of pathsToClean) {
                try {
                    console.log(`   👉 [HARD] Cleaning R2 Folder: ${folder}`);
                    const listCmd = new ListObjectsV2Command({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Prefix: folder
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
                        console.log(`   ✅ R2 Folder Deleted (${listRes.Contents.length} files) from: ${folder}`);
                    } else {
                        console.log(`   ⚠️ No files found in R2 folder: ${folder}`);
                    }
                } catch (r2Error) {
                    console.error(`   ⚠️ R2 Cleanup Error for ${folder}:`, r2Error.message);
                }
            }

            // 3. DB Delete (using authenticated client for RLS)
            const { error: deleteError, count } = await dbClient
                .from('videos')
                .delete()
                .eq('id', videoId);

            console.log(`   📊 Delete Result: count=${count}, error=${deleteError?.message || 'NONE'}`);

            if (deleteError) throw deleteError;

            console.log('✅ [HARD DELETE] Completed.');
            return res.json({ success: true, message: 'Video permanently deleted' });

        } else {
            // ============================================
            // SOFT DELETE
            // ============================================
            console.log(`   👉 Attempting Soft Delete via RPC for ${videoId}`);
            const { error } = await dbClient.rpc('soft_delete_video', { video_id: videoId });

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

// Endpoint: Avatar Upload
app.post('/upload-avatar', upload.single('image'), async (req, res) => {
    const file = req.file;
    const { userId } = req.body;

    if (!file || !userId) {
        return res.status(400).json({ error: 'Missing image or userId' });
    }

    try {
        console.log(`👤 [AVATAR] Process starting for user: ${userId}`);
        const extension = path.extname(file.originalname) || '.jpg';

        const fileName = `users/${userId}/profile/avatar${extension}`;

        // 1. Upload to R2
        const rawAvatarUrl = await uploadToR2(file.path, fileName, file.mimetype);

        // 2. Add Cache Buster (important for CDNs and apps)

        const avatarUrl = `${rawAvatarUrl}?t=${Date.now()}`;

        // 3. Update Supabase Profile Record
        console.log(`   👉 Syncing to Supabase Profiles...`);
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId);

        if (dbError) {
            console.error('   ❌ Supabase Update Error:', dbError.message);
            throw dbError;
        }

        // Cleanup temp file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        console.log(`✅ [AVATAR] Success: ${avatarUrl}`);
        res.json({ success: true, avatarUrl });

    } catch (error) {
        console.error('❌ [AVATAR] Fatal Error:', error);
        res.status(500).json({ error: error.message });
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// Health check
// Temporary Migration Endpoint
app.get('/migrate-assets', async (req, res) => {
    try {
        console.log("🚀 Starting R2 Migration via Endpoint...");
        const mainUserId = "687c8079-e94c-42c2-9442-8a4a6b63dec6";

        // 1. Migrate Avatar
        try {
            const oldAvatarKey = "avatars/wizyclub-official.jpg";
            const newAvatarKey = `users/${mainUserId}/profile/avatar.jpg`;
            await r2.send(new CopyObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                CopySource: `${process.env.R2_BUCKET_NAME}/${oldAvatarKey}`,
                Key: newAvatarKey
            }));
            await supabase.from('profiles').update({ avatar_url: `${process.env.R2_PUBLIC_URL}/${newAvatarKey}` }).eq('id', mainUserId);
            console.log("✅ Avatar migrated.");
        } catch (e) {
            console.log("⚠️ Avatar migration skipped.");
        }

        // 2. Migrate Videos
        const { data: videos } = await supabase.from('videos').select('*').order('created_at', { ascending: true });
        const r2Videos = ["1766009656643", "1766011111754", "1766012583186"];

        if (videos) {
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                const timestamp = r2Videos[i];
                if (!timestamp) continue;

                const newBase = `media/${mainUserId}/videos/${video.id}`;

                // Copy Video
                try {
                    await r2.send(new CopyObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        CopySource: `${process.env.R2_BUCKET_NAME}/videos/${timestamp}/master.mp4`,
                        Key: `${newBase}/master.mp4`
                    }));
                    await r2.send(new CopyObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        CopySource: `${process.env.R2_BUCKET_NAME}/thumbs/${timestamp}.jpg`,
                        Key: `${newBase}/thumb.jpg`
                    }));
                    // Optional sprite
                    try {
                        await r2.send(new CopyObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            CopySource: `${process.env.R2_BUCKET_NAME}/videos/${timestamp}/sprite_${timestamp}_0.jpg`,
                            Key: `${newBase}/sprite.jpg`
                        }));
                    } catch (e) { }

                    await supabase.from('videos').update({
                        video_url: `${process.env.R2_PUBLIC_URL}/${newBase}/master.mp4`,
                        thumbnail_url: `${process.env.R2_PUBLIC_URL}/${newBase}/thumb.jpg`,
                        sprite_url: `${process.env.R2_PUBLIC_URL}/${newBase}/sprite.jpg`
                    }).eq('id', video.id);
                    console.log(`✅ Video ${video.id} migrated.`);
                } catch (err) {
                    console.error(`❌ Video ${i} error:`, err.message);
                }
            }
        }

        // 3. Migrate Stories
        const { data: stories } = await supabase.from('stories').select('*');
        if (stories && videos) {
            for (const story of stories) {
                const matchingVideo = videos.find(v => v.id === story.id);
                if (matchingVideo) {
                    const newBase = `media/${mainUserId}/videos/${matchingVideo.id}`;
                    await supabase.from('stories').update({
                        video_url: `${process.env.R2_PUBLIC_URL}/${newBase}/master.mp4`,
                        thumbnail_url: `${process.env.R2_PUBLIC_URL}/${newBase}/thumb.jpg`
                    }).eq('id', story.id);
                }
            }
        }

        res.json({ success: true, message: "Migration triggered successfully. Check logs." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Video Backend running on http://0.0.0.0:${PORT}`);
    console.log(`🏠 Local Access: http://localhost:${PORT}`);
    console.log(`🌐 Network Access: http://192.168.0.138:${PORT}`);
    console.log(`📦 Target Bucket: "${process.env.R2_BUCKET_NAME}"`);
    console.log(`📡 Ready to accept uploads`);
});
