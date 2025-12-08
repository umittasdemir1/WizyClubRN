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

// Endpoint: Video Upload
app.post('/upload', upload.single('video'), async (req, res) => {
    const file = req.file;
    const { userId, description } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    const inputPath = file.path;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const videoFileName = `videos/${uniqueSuffix}.mp4`;
    const thumbFileName = `thumbs/${uniqueSuffix}.jpg`;

    const processedVideoPath = `temp_uploads/proc_${uniqueSuffix}.mp4`;
    const processedThumbPath = `temp_uploads/thumb_${uniqueSuffix}.jpg`;

    console.log(`🎬 Processing: ${file.originalname}`);

    try {
        // Step 1: Process video (FastStart optimization with copy codecs to avoid re-encoding)
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions('-movflags +faststart')
                .outputOptions('-c:v copy')  // Copy video codec (faster, no quality loss)
                .outputOptions('-c:a copy')  // Copy audio codec
                .save(processedVideoPath)
                .on('progress', (progress) => {
                    console.log(`Processing: ${progress.percent?.toFixed(1)}%`);
                })
                .on('end', () => {
                    console.log('✅ Video processing complete');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('❌ FFmpeg error:', err.message);
                    reject(err);
                });
        });

        // Step 2: Generate thumbnail
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .screenshots({
                    count: 1,
                    filename: `thumb_${uniqueSuffix}.jpg`,
                    folder: 'temp_uploads',
                    size: '720x?'
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log('✅ Processing complete, uploading to R2...');

        // Step 3: Upload to R2
        const videoUrl = await uploadToR2(processedVideoPath, videoFileName, 'video/mp4');
        const thumbUrl = await uploadToR2(processedThumbPath, thumbFileName, 'image/jpeg');

        // Step 4: Save metadata to Supabase
        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: userId || 'test-user',
                video_url: videoUrl,
                thumbnail_url: thumbUrl,
                description: description || '',
                likes_count: 0,
                views_count: 0
            })
            .select();

        if (error) throw error;

        console.log('🎉 Upload successful!');

        res.json({
            success: true,
            message: 'Video uploaded successfully',
            data: data[0]
        });

        // Cleanup
        [inputPath, processedVideoPath, processedThumbPath].forEach(p => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });

        // Cleanup on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(processedVideoPath)) fs.unlinkSync(processedVideoPath);
        if (fs.existsSync(processedThumbPath)) fs.unlinkSync(processedThumbPath);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(process.env.PORT, () => {
    console.log(`🚀 Video Backend running on http://localhost:${process.env.PORT}`);
    console.log(`📡 Ready to accept uploads`);
});
