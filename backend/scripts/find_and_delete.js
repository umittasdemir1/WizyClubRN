require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectsCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Config
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const TIMESTAMP_ID = '1765387197168';

async function findAndDelete() {
    console.log(`🔎 Searching for video with timestamp/folder: ${TIMESTAMP_ID}`);

    // 1. Find the UUID first!
    const { data: videos, error } = await supabase
        .from('videos')
        .select('*')
        .ilike('video_url', `%${TIMESTAMP_ID}%`);

    if (error) {
        console.error('❌ DB Search Error:', error);
        return;
    }

    if (!videos || videos.length === 0) {
        console.log('❌ No video found in DB with that timestamp in URL.');
        console.log('   The record might be gone, but R2 files persist?');
    } else {
        console.log(`✅ Found ${videos.length} matching records.`);
        for (const video of videos) {
            console.log(`   👉 Deleting UUID: ${video.id} (URL: ${video.video_url})`);

            // Delete from DB
            const { error: delErr } = await supabase
                .from('videos')
                .delete()
                .eq('id', video.id);

            if (delErr) console.error('   ❌ DB Delete Failed:', delErr);
            else console.log('   ✅ DB Record Deleted.');
        }
    }

    // 2. Blind R2 Cleanup (Force delete the folder)
    console.log('\n--- R2 Manual Cleanup (Blind) ---');
    const folderPrefix = `videos/${TIMESTAMP_ID}/`;
    try {
        const listCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: folderPrefix
        });
        const listRes = await r2.send(listCmd);

        if (listRes.Contents && listRes.Contents.length > 0) {
            console.log(`Found ${listRes.Contents.length} files in R2. Deleting...`);
            await r2.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: { Objects: listRes.Contents.map(c => ({ Key: c.Key })) }
            }));
            console.log('✅ R2 Folder Deleted.');
        } else {
            console.log('ℹ️ R2 path not found (already clean):', folderPrefix);
        }

        // Thumbnail
        const thumbKey = `thumbs/${TIMESTAMP_ID}.jpg`;
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: thumbKey
        }));
        console.log('✅ R2 Thumbnail clean command sent.');

    } catch (e) {
        console.error('❌ R2 Error:', e.message);
    }
}

findAndDelete();
