const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME;

async function cleanup() {
    console.log(`🚨 STARTING EMERGENCY MASS CLEANUP (LAST 10 VIDEOS)`);

    // 1. Fetch last 10 videos
    const { data: videos, error: findError } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (findError) {
        console.error('Error fetching videos:', findError);
        return;
    }

    if (!videos || videos.length === 0) {
        console.log('No videos found.');
        return;
    }

    console.log(`Found ${videos.length} videos. DELETING ALL OF THEM TO CLEAR CRASH LOOPS.`);

    for (const v of videos) {
        console.log(`---------------------------------------------------`);
        console.log(`🗑️ Processing Video: ${v.id}`);
        console.log(`   URL: ${v.video_url}`);
        console.log(`   Created: ${v.created_at}`);

        // Extract Timestamp ID from URL
        let timestampId = '';
        if (v.video_url) {
            const match = v.video_url.match(/videos\/(\d+)\//);
            if (match && match[1]) {
                timestampId = match[1];
                console.log(`   Found R2 Timestamp: ${timestampId}`);
            } else {
                console.log(`   ⚠️ Could not extract timestamp from URL.`);
            }
        }

        // DELETE FROM SUPABASE
        const { error: delError } = await supabase.from('videos').delete().eq('id', v.id);
        if (delError) console.error('   ❌ DB Delete Error:', delError);
        else console.log('   ✅ DB Record deleted.');

        // DELETE FROM R2
        if (timestampId) {
            const prefix = `videos/${timestampId}`;
            try {
                const listCmd = new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix });
                const listRes = await r2.send(listCmd);

                if (listRes.Contents && listRes.Contents.length > 0) {
                    const objectsToDelete = listRes.Contents.map(obj => ({ Key: obj.Key }));
                    const delCmd = new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: objectsToDelete } });
                    await r2.send(delCmd);
                    console.log(`   ✅ R2 Files deleted (${objectsToDelete.length} files).`);
                } else {
                    console.log('   ℹ️ No R2 files found.');
                }
            } catch (e) {
                console.error('   Error cleaning R2:', e);
            }
        }
    }

    console.log('🏁 MASS CLEANUP COMPLETE.');
}

cleanup();
