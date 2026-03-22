require('dotenv').config();
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function deepCleanup() {
    console.log('🚀 Starting Deep R2 Cleanup...');

    // 1. Get all videos from DB
    const { data: dbVideos, error } = await supabase.from('videos').select('video_url, thumbnail_url, sprite_url');
    if (error) { console.error('DB Fetch Error:', error); return; }

    const activeKeys = new Set();
    dbVideos.forEach(v => {
        if (v.video_url) activeKeys.add(v.video_url.split('.dev/').pop());
        if (v.thumbnail_url) activeKeys.add(v.thumbnail_url.split('.dev/').pop());
        if (v.sprite_url) activeKeys.add(v.sprite_url.split('.dev/').pop());
    });

    console.log(`✅ active items in DB: ${activeKeys.size}`);

    // 2. List ALL objects in R2
    let isTruncated = true;
    let continuationToken = null;
    let allR2Keys = [];

    while (isTruncated) {
        const listParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            ContinuationToken: continuationToken
        };
        const response = await r2.send(new ListObjectsV2Command(listParams));
        if (response.Contents) {
            allR2Keys.push(...response.Contents.map(c => c.Key));
        }
        isTruncated = response.IsTruncated;
        continuationToken = response.NextContinuationToken;
    }

    console.log(`📦 total items in R2: ${allR2Keys.length}`);

    // 3. Identify orphans
    const orphans = allR2Keys.filter(key => {
        // A key is an orphan if it's not directly in activeKeys
        // AND it's not part of an active HLS folder
        if (activeKeys.has(key)) return false;

        // Special check: is it inside a folder that represents an active video?
        // e.g. videos/1766004081689/playlist.m3u8 is active if its folder is in an active URL
        const folder = key.split('/')[0] + '/' + key.split('/')[1];
        const isActiveFolder = Array.from(activeKeys).some(k => k.startsWith(folder));

        return !isActiveFolder;
    });

    console.log(`🧹 Found ${orphans.length} orphaned objects.`);

    if (orphans.length === 0) {
        console.log('✨ R2 is already clean.');
        return;
    }

    // 4. Delete Orphans in batches of 1000
    for (let i = 0; i < orphans.length; i += 1000) {
        const batch = orphans.slice(i, i + 1000);
        await r2.send(new DeleteObjectsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Delete: {
                Objects: batch.map(key => ({ Key: key }))
            }
        }));
        console.log(`   ✅ Deleted batch ${i / 1000 + 1}`);
    }

    console.log('🎉 R2 Deep Cleanup Finished.');
}

deepCleanup();
