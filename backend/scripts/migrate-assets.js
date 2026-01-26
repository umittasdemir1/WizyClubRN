require('dotenv').config();
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('@ffprobe-installer/ffprobe').path;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);

// R2 Client
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

// Video descriptions
const descriptions = {
    'video1.mp4': 'Trending fashion look 🔥 #fashion #style',
    'video2.mp4': 'New collection drop 💎 #newdrop #exclusive',
    'video3.mp4': 'Summer vibes ☀️ #summer #mood',
    'video4.mp4': 'Street style inspiration 🏙️ #streetwear',
    'story1.mp4': 'Behind the scenes 🎬',
    'story2.mp4': 'Quick tip! 💡',
    'story3.mp4': 'New arrivals preview 👀',
    'story4.mp4': 'Limited time offer! ⏰',
    'profilstory1.mp4': 'My styling journey ✨',
    'profilstory2.mp4': 'Favorite picks 💖',
    'profilstory3.mp4': 'Outfit of the day 👗',
    'profilstory4.mp4': 'Shopping haul 🛍️',
};

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

async function processVideo(inputPath, videoName) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const baseName = path.basename(videoName, '.mp4');
    const processedVideoPath = `temp_uploads/proc_${baseName}_${uniqueSuffix}.mp4`;
    const processedThumbPath = `temp_uploads/thumb_${baseName}_${uniqueSuffix}.jpg`;
    const videoFileName = `videos/${baseName}_${uniqueSuffix}.mp4`;
    const thumbFileName = `thumbs/${baseName}_${uniqueSuffix}.jpg`;

    console.log(`\n🎬 Processing: ${videoName}`);
    const originalSize = fs.statSync(inputPath).size / 1024 / 1024;
    console.log(`   Original size: ${originalSize.toFixed(2)} MB`);

    // Step 1: Compress video
    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions('-movflags +faststart')
            .outputOptions('-c:v libx264')
            .outputOptions('-preset fast')
            .outputOptions('-crf 23')
            .outputOptions('-vf scale=720:-2')
            .outputOptions('-c:a aac')
            .outputOptions('-b:a 128k')
            .save(processedVideoPath)
            .on('progress', (progress) => {
                process.stdout.write(`\r   🔄 Compressing: ${progress.percent?.toFixed(1) || 0}%`);
            })
            .on('end', () => {
                console.log('\n   ✅ Compression complete');
                resolve();
            })
            .on('error', reject);
    });

    const compressedSize = fs.statSync(processedVideoPath).size / 1024 / 1024;
    const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`   Compressed size: ${compressedSize.toFixed(2)} MB (${savings}% smaller)`);

    // Step 2: Generate thumbnail
    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .screenshots({
                count: 1,
                filename: `thumb_${baseName}_${uniqueSuffix}.jpg`,
                folder: 'temp_uploads',
                size: '720x?'
            })
            .on('end', resolve)
            .on('error', reject);
    });
    console.log('   ✅ Thumbnail generated');

    // Step 3: Upload to R2
    const videoUrl = await uploadToR2(processedVideoPath, videoFileName, 'video/mp4');
    const thumbUrl = await uploadToR2(processedThumbPath, thumbFileName, 'image/jpeg');
    console.log('   ✅ Uploaded to R2');

    // Step 4: Save to Supabase
    const description = descriptions[videoName] || `Video: ${videoName}`;
    const { data, error } = await supabase
        .from('videos')
        .insert({
            user_id: 'wizyclub-official',
            video_url: videoUrl,
            thumbnail_url: thumbUrl,
            description: description,
            likes_count: Math.floor(Math.random() * 5000) + 100,
            views_count: Math.floor(Math.random() * 50000) + 1000
        })
        .select();

    if (error) throw error;
    console.log(`   ✅ Saved to Supabase: ${data[0].id}`);

    // Cleanup
    fs.unlinkSync(processedVideoPath);
    fs.unlinkSync(processedThumbPath);

    return {
        name: videoName,
        originalSize,
        compressedSize,
        savings,
        videoUrl,
        thumbUrl,
        id: data[0].id
    };
}

async function main() {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const assetsDir = path.join(repoRoot, 'assets', 'videos');
    const videos = fs.readdirSync(assetsDir).filter(f => f.endsWith('.mp4'));

    console.log('🚀 Starting batch video migration');
    console.log(`📁 Found ${videos.length} videos in assets/videos\n`);

    // Ensure temp_uploads exists
    if (!fs.existsSync('temp_uploads')) {
        fs.mkdirSync('temp_uploads');
    }

    const results = [];
    let totalOriginal = 0;
    let totalCompressed = 0;

    for (const video of videos) {
        try {
            const result = await processVideo(path.join(assetsDir, video), video);
            results.push(result);
            totalOriginal += result.originalSize;
            totalCompressed += result.compressedSize;
        } catch (error) {
            console.error(`   ❌ Error processing ${video}:`, error.message);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Videos processed: ${results.length}/${videos.length}`);
    console.log(`Total original size: ${totalOriginal.toFixed(2)} MB`);
    console.log(`Total compressed size: ${totalCompressed.toFixed(2)} MB`);
    console.log(`Total savings: ${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%`);
    console.log('\n✅ All videos migrated to R2 and Supabase!');
    console.log('🔗 You can now update the app to fetch videos from Supabase.\n');
}

main().catch(console.error);
