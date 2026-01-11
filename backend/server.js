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
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');

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

// Swagger / OpenAPI docs (local)
const openApiPath = path.join(__dirname, 'docs', 'openapi.yaml');
const openApiSpec = yaml.load(fs.readFileSync(openApiPath, 'utf8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

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

// Endpoint: HLS Video Upload (Supports Carousels)
app.post('/upload-hls', upload.array('video', 10), async (req, res) => {
    const files = req.files;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
    }

    // Determine is_commercial flag
    // 'İş Birliği İçermiyor' means is_commercial = false
    const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';

    const uniqueId = uuidv4();
    const tempOutputDir = path.join(__dirname, 'temp_uploads');
    const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');

    console.log(`\n🎬 [UPLOAD] --- NEW UPLOAD START ---`);
    console.log(`🎬 [UPLOAD] Count: ${files.length}, Type: ${isCarousel ? 'carousel' : 'video'}`);
    console.log(`🎬 [UPLOAD] ID: ${uniqueId}`);
    console.log(`🎬 [UPLOAD] UserID: ${userId}`);

    try {
        const mediaUrls = [];
        let firstThumbUrl = '';
        let firstSpriteUrl = '';
        let finalWidth = 0;
        let finalHeight = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isVideo = file.mimetype.startsWith('video/');
            const indexLabel = files.length > 1 ? `_${i}` : '';
            const baseKey = `media/${userId || 'test-user'}/posts/${uniqueId}${indexLabel}`;
            const inputPath = file.path;

            setUploadProgress(uniqueId, `item_${i}`, 10 + Math.floor((i / files.length) * 80));

            if (isVideo) {
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
                const rotation = videoStream.tags && videoStream.tags.rotate ? parseInt(videoStream.tags.rotate, 10) : 0;
                if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
                    [width, height] = [height, width];
                }

                if (i === 0) {
                    finalWidth = width;
                    finalHeight = height;
                }

                const processedThumbPath = path.join(tempOutputDir, `thumb_${uniqueId}_${i}.jpg`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .outputOptions(['-q:v 2'])
                        .screenshots({
                            count: 1,
                            filename: `thumb_${uniqueId}_${i}.jpg`,
                            folder: tempOutputDir,
                            size: '1080x?'
                        })
                        .on('end', resolve)
                        .on('error', reject);
                });

                const thumbUrl = await uploadToR2(processedThumbPath, `${baseKey}/thumb.jpg`, 'image/jpeg');
                if (i === 0) firstThumbUrl = thumbUrl;

                const optimizedPath = path.join(tempOutputDir, `optimized_${uniqueId}_${i}.mp4`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .videoCodec('libx264')
                        .size(width > 1080 ? '1080x?' : `${width}x${height}`)
                        .outputOptions(['-crf 26', '-preset veryfast', '-movflags +faststart', '-pix_fmt yuv420p'])
                        .on('end', resolve)
                        .on('error', reject)
                        .save(optimizedPath);
                });

                const videoUrl = await uploadToR2(optimizedPath, `${baseKey}/master.mp4`, 'video/mp4');

                let spriteUrl = '';
                if (i === 0) {
                    spriteUrl = await hlsService.generateSpriteSheet(inputPath, tempOutputDir, uniqueId, baseKey, duration);
                    firstSpriteUrl = spriteUrl;
                }

                mediaUrls.push({ url: videoUrl, type: 'video', thumbnail: thumbUrl, sprite: spriteUrl });

                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(processedThumbPath)) fs.unlinkSync(processedThumbPath);
                if (fs.existsSync(optimizedPath)) fs.unlinkSync(optimizedPath);
            } else {
                const imageKey = `${baseKey}/image.jpg`;
                const imageUrl = await uploadToR2(inputPath, imageKey, file.mimetype);

                if (i === 0) {
                    firstThumbUrl = imageUrl;
                    finalWidth = 1080;
                    finalHeight = 1920;
                }

                mediaUrls.push({ url: imageUrl, type: 'image' });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        }

        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: userId || 'test-user',
                video_url: mediaUrls[0].url,
                thumbnail_url: firstThumbUrl,
                sprite_url: firstSpriteUrl,
                media_urls: mediaUrls,
                post_type: isCarousel ? 'carousel' : 'video',
                description: description || '',
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                commercial_type: commercialType || null,
                is_commercial: isCommercial,
                width: finalWidth,
                height: finalHeight,
                processing_status: 'completed'
            })
            .select();

        if (error) throw error;

        setUploadProgress(uniqueId, 'done', 100);
        res.json({ success: true, data: data[0] });

    } catch (error) {
        console.error('❌ [UPLOAD] Error:', error);
        res.status(500).json({ error: error.message });
        if (files) files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
});


// ============================================
// Endpoint: STORY Upload (Simple, no HLS)
// ============================================
// Endpoint: STORY Upload (Supports Carousels)
app.post('/upload-story', upload.array('video', 10), async (req, res) => {
    const files = req.files;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const uniqueId = uuidv4();
    const tempOutputDir = path.join(__dirname, 'temp_uploads');
    const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');

    console.log(`📖 [STORY] Upload started: ${uniqueId}, Count: ${files.length}`);

    try {
        const mediaUrls = [];
        let firstThumbUrl = '';
        let finalWidth = 1080;
        let finalHeight = 1920;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isVideo = file.mimetype.startsWith('video/');
            const indexLabel = files.length > 1 ? `_${i}` : '';
            const baseKey = `media/${userId}/stories/${uniqueId}${indexLabel}`;
            const inputPath = file.path;

            if (isVideo) {
                const metadata = await new Promise((resolve, reject) => {
                    ffmpeg(inputPath).ffprobe((err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });

                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                let width = videoStream?.width || 1080;
                let height = videoStream?.height || 1920;

                const videoKey = `${baseKey}/story.mp4`;
                await uploadToR2(inputPath, videoKey, file.mimetype);
                const storyUrl = `${process.env.R2_PUBLIC_URL}/${videoKey}`;

                // Process Thumb
                const thumbPath = path.join(os.tmpdir(), `${uniqueId}_${i}_thumb.jpg`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .screenshots({
                            count: 1,
                            folder: os.tmpdir(),
                            filename: `${uniqueId}_${i}_thumb.jpg`,
                            size: '?x480'
                        })
                        .on('end', resolve)
                        .on('error', reject);
                });

                const thumbKey = `${baseKey}/thumb.jpg`;
                const thumbnailUrl = await uploadToR2(thumbPath, thumbKey, 'image/jpeg');

                if (i === 0) {
                    firstThumbUrl = thumbnailUrl;
                    finalWidth = width;
                    finalHeight = height;
                }

                mediaUrls.push({ url: storyUrl, type: 'video', thumbnail: thumbnailUrl });
                if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            } else {
                const imageKey = `${baseKey}/story.jpg`;
                const imageUrl = await uploadToR2(inputPath, imageKey, file.mimetype);

                if (i === 0) firstThumbUrl = imageUrl;
                mediaUrls.push({ url: imageUrl, type: 'image' });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        }

        const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { data, error } = await supabase.from('stories').insert({
            user_id: userId,
            video_url: mediaUrls[0].url,
            thumbnail_url: firstThumbUrl,
            media_urls: mediaUrls,
            post_type: isCarousel ? 'carousel' : 'video',
            width: finalWidth,
            height: finalHeight,
            is_commercial: isCommercial,
            brand_name: brandName || null,
            brand_url: brandUrl || null,
            commercial_type: commercialType || null,
            expires_at: expiresAt.toISOString()
        }).select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });

    } catch (error) {
        console.error('❌ [STORY] Error:', error);
        res.status(500).json({ error: error.message });
        if (files) files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
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

// ========================================
// DRAFTS ENDPOINTS
// ========================================

// Get all drafts for current user
app.get('/drafts', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const { data, error } = await supabase
            .from('drafts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error fetching drafts:', error);
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// Get single draft by ID
app.get('/drafts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('drafts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error fetching draft:', error);
        res.status(500).json({ error: 'Failed to fetch draft' });
    }
});

// Create new draft
app.post('/drafts', async (req, res) => {
    const {
        userId,
        mediaUri,
        mediaType,
        thumbnailUri,
        description,
        commercialType,
        brandName,
        brandUrl,
        tags,
        useAILabel,
        uploadMode
    } = req.body;

    if (!userId || !mediaUri || !mediaType) {
        return res.status(400).json({ error: 'userId, mediaUri, and mediaType are required' });
    }

    try {
        const { data, error } = await supabase
            .from('drafts')
            .insert({
                user_id: userId,
                media_uri: mediaUri,
                media_type: mediaType,
                thumbnail_uri: thumbnailUri,
                description: description || null,
                commercial_type: commercialType || null,
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                tags: tags || [],
                use_ai_label: useAILabel || false,
                upload_mode: uploadMode || 'video',
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ [DRAFTS] Created draft ${data.id} for user ${userId}`);
        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error creating draft:', error);
        res.status(500).json({ error: 'Failed to create draft' });
    }
});

// Update draft
app.patch('/drafts/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Map frontend fields to database fields
    const dbUpdates = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.commercialType !== undefined) dbUpdates.commercial_type = updates.commercialType;
    if (updates.brandName !== undefined) dbUpdates.brand_name = updates.brandName;
    if (updates.brandUrl !== undefined) dbUpdates.brand_url = updates.brandUrl;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.useAILabel !== undefined) dbUpdates.use_ai_label = updates.useAILabel;

    try {
        const { data, error } = await supabase
            .from('drafts')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ [DRAFTS] Updated draft ${id}`);
        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error updating draft:', error);
        res.status(500).json({ error: 'Failed to update draft' });
    }
});

// Delete draft
app.delete('/drafts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('drafts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        console.log(`✅ [DRAFTS] Deleted draft ${id}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[DRAFTS] Error deleting draft:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

// Cleanup expired drafts (cron job endpoint)
app.post('/drafts/cleanup', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('drafts')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select('id');

        if (error) throw error;

        const count = data?.length || 0;
        console.log(`🧹 [DRAFTS] Cleaned up ${count} expired drafts`);
        res.json({ success: true, deletedCount: count });
    } catch (error) {
        console.error('[DRAFTS] Error cleaning up drafts:', error);
        res.status(500).json({ error: 'Failed to cleanup drafts' });
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
