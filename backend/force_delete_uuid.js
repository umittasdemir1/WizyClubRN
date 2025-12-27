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

const UUID_TO_DELETE = 'bfc020c6-1346-4702-8f03-21bac7ae62db'; // FROM SCREENSHOT
const TIMESTAMP_FOLDER = 'videos/1765387197168/'; // FROM SCREENSHOT

async function forceDelete() {
    console.log(`🚨 FORCE DELETING UUID: ${UUID_TO_DELETE}`);

    // 1. Delete from Supabase
    const { error, count } = await supabase
        .from('videos')
        .delete()
        .eq('id', UUID_TO_DELETE); // This is UUID, so no 22P02 error.

    if (error) {
        console.error('❌ Supabase Force Delete Failed:', error);
    } else {
        console.log('✅ Supabase Record DELETED indefinitely.');
    }

    // 2. Delete from R2 (Just to be sure)
    console.log(`🧹 Cleaning R2 Folder: ${TIMESTAMP_FOLDER}`);
    try {
        const listCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: TIMESTAMP_FOLDER
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
            console.log('ℹ️ R2 Folder Empty');
        }

        // Thumb
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: `thumbs/1765387197168.jpg`
        }));
        console.log('✅ R2 Thumb Deleted');

    } catch (e) {
        console.error('R2 Error:', e);
    }
}

forceDelete();
