require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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

        // Step 2: Transcode to HLS & Upload (Mobile-Optimized)
        const hlsUrl = await hlsService.transcodeToHls(inputPath, tempOutputDir, uniqueId);
        console.log(`🔗 [VIDEO URL] Generated HLS URL: ${hlsUrl}`);

        // Step 2.5: Generate Sprite Sheet (2s intervals)
        const spriteUrl = await hlsService.generateSpriteSheet(inputPath, tempOutputDir, uniqueId);
        console.log(`🖼️ [SPRITE] Generated sprite URL: ${spriteUrl}`);

        // Step 3: Save metadata to Supabase
        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: userId || 'test-user',
                video_url: hlsUrl,
                thumbnail_url: thumbUrl,
                sprite_url: spriteUrl,
                description: description || '',
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                commercial_type: commercialType || null,
                is_commercial: isCommercial,
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(process.env.PORT, () => {
    console.log(`🚀 Video Backend running on http://localhost:${process.env.PORT}`);
    console.log(`📦 Target Bucket: "${process.env.R2_BUCKET_NAME}"`); // DEBUG LOG
    console.log(`📡 Ready to accept uploads`);
});
