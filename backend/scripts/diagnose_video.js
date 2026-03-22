require('dotenv').config();
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

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

const TARGET_ID = '1765387197168'; // The ID complaining user provided

async function diagnose() {
    console.log(`🕵️ Diagnosing Video ID: ${TARGET_ID}`);

    // 1. Check Supabase
    console.log('\n--- SUPABASE CHECK ---');
    const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', TARGET_ID)
        .maybeSingle();

    if (error) console.error('Supabase Error:', error);
    if (!video) {
        console.log('❌ Video NOT FOUND in Supabase. (It is deleted from DB)');
    } else {
        console.log('✅ Video FOUND in Supabase:', video.id);
        console.log('   Title:', video.description);
    }

    // 2. Check R2 Files
    console.log('\n--- R2 CHECK (HLS Folder) ---');
    const folderPrefix = `videos/${TARGET_ID}/`;
    try {
        const listCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: folderPrefix
        });
        const listRes = await r2.send(listCmd);

        if (!listRes.Contents || listRes.Contents.length === 0) {
            console.log('❌ No files found in R2 folder:', folderPrefix);
        } else {
            console.log(`✅ Found ${listRes.Contents.length} files in R2:`);
            listRes.Contents.forEach(c => console.log('   -', c.Key));
        }
    } catch (e) {
        console.error('R2 List Error:', e);
    }

    // 3. Check R2 Thumbnail
    console.log('\n--- R2 CHECK (Thumbnail) ---');
    const thumbKey = `thumbs/${TARGET_ID}.jpg`;
    try {
        // List specific key to verify existence (HeadObject is better but List is reliable)
        const listThumbCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: thumbKey,
            MaxKeys: 1
        });
        const thumbRes = await r2.send(listThumbCmd);
        if (thumbRes.Contents && thumbRes.Contents.length > 0) {
            console.log('✅ Thumbnail FOUND:', thumbKey);
        } else {
            console.log('❌ Thumbnail NOT FOUND:', thumbKey);
        }
    } catch (e) {
        console.error('R2 Thumb Check Error:', e);
    }
}

diagnose();
