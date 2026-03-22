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

const TARGET_ID = '1765387197168';

async function cleanup() {
    console.log(`🧹 Manual Cleanup for Video: ${TARGET_ID}`);

    // 1. R2 Cleanup
    console.log('--- Cleaning R2 ---');
    try {
        const folderPrefix = `videos/${TARGET_ID}/`;
        const listCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: folderPrefix
        });
        const listRes = await r2.send(listCmd);

        if (listRes.Contents && listRes.Contents.length > 0) {
            console.log(`Found ${listRes.Contents.length} files. Deleting...`);
            await r2.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: { Objects: listRes.Contents.map(c => ({ Key: c.Key })) }
            }));
            console.log('✅ R2 Folder Deleted');
        } else {
            console.log('ℹ️ R2 Folder Empty/Not Found');
        }

        const thumbKey = `thumbs/${TARGET_ID}.jpg`;
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: thumbKey
        }));
        console.log('✅ R2 Thumbnail Deleted');

    } catch (e) {
        console.error('❌ R2 Cleanup Failed:', e);
    }

    // 2. Supabase Cleanup
    console.log('--- Cleaning Supabase ---');
    const { error } = await supabase.from('videos').delete().eq('id', TARGET_ID);
    if (error) {
        console.error('❌ Supabase Delete Failed:', error);
    } else {
        console.log('✅ Supabase Record Deleted');
    }
}

cleanup();
