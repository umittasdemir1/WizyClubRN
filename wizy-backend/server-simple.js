require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

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

// Endpoint: Video Upload (NO FFmpeg processing - direct upload)
app.post('/upload', upload.single('video'), async (req, res) => {
    const file = req.file;
    const { userId, description } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    const inputPath = file.path;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const videoFileName = `videos/${uniqueSuffix}.mp4`;

    console.log(`📤 Uploading: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    try {
        // Direct upload to R2 (no processing)
        const videoUrl = await uploadToR2(inputPath, videoFileName, 'video/mp4');

        // Save metadata to Supabase
        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: userId || 'test-user',
                video_url: videoUrl,
                thumbnail_url: '', // No thumbnail for now
                description: description || '',
                likes_count: 0,
                views_count: 0
            })
            .select();

        if (error) throw error;

        console.log('✅ Upload successful!');

        res.json({
            success: true,
            message: 'Video uploaded successfully (no processing)',
            data: data[0]
        });

        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });

        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(process.env.PORT, () => {
    console.log(`🚀 Video Backend running on http://localhost:${process.env.PORT}`);
    console.log(`📡 Ready to accept uploads (Direct upload - no FFmpeg processing)`);
});
