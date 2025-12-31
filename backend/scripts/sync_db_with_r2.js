const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

// Initialize Clients
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

console.log(`🔑 Supabase Key (last 5 chars): ...${supabaseKey?.slice(-5)} (Service Role Key recommended for cleanup)`);
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;

async function runSync() {
    console.log('🔄 Starting DB <-> R2 Sync...');

    // 1. Fetch All Videos
    const { data: videos, error } = await supabase
        .from('videos')
        .select('id, video_url');

    if (error) {
        console.error('❌ Supabase Error:', error);
        return;
    }

    console.log(`📋 Found ${videos.length} videos in DB. Checking files...`);

    let deletedCount = 0;

    for (const video of videos) {
        if (!video.video_url) continue;

        const key = extractKey(video.video_url);

        try {
            // Check if file exists in R2
            await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
            // console.log(`   ✅ OK: ${key}`);
        } catch (e) {
            if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
                console.log(`   ❌ MISSING FILE: ${key} (Video ID: ${video.id}) -> DELETING FROM DB`);

                // Delete from DB
                const { error: delError } = await supabase
                    .from('videos')
                    .delete()
                    .eq('id', video.id);

                if (delError) console.error('      ⚠️ DB Delete Failed:', delError.message);
                else deletedCount++;

            } else {
                console.error(`   ⚠️ Error checking ${key}:`, e.message);
            }
        }
    }

    console.log(`\n✨ Sync Complete.`);
    console.log(`🔥 Deleted ${deletedCount} broken records from Supabase.`);
    console.log(`✅ ${videos.length - deletedCount} videos remain healthy.`);
}

function extractKey(url) {
    try {
        const u = new URL(url);
        return decodeURIComponent(u.pathname.substring(1)); // Remove leading /
    } catch (e) {
        // Fallback if it's already a relative path or invalid URL
        return url;
    }
}

runSync().catch(console.error);
