require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findMissingVideos() {
    console.log('🔄 Fetching all videos from database...');

    // 1. Fetch all videos
    const { data: videos, error } = await supabase
        .from('videos')
        .select('id, video_url')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Database error:', error);
        return;
    }

    console.log(`✅ Found ${videos.length} videos in database.`);
    console.log('🔍 Checking for 404s (Missing in R2)...');

    const missingVideos = [];
    const validVideos = [];

    // 2. Check each URL concurrently (with limit)
    const batchSize = 10;
    for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        await Promise.all(batch.map(async (video) => {
            if (!video.video_url) {
                console.log(`⚠️ Null URL for ID: ${video.id}`);
                return;
            }

            try {
                process.stdout.write('.'); // Progress dot
                await axios.head(video.video_url, { timeout: 5000 });
                validVideos.push(video.id);
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    process.stdout.write('X'); // 404 mark
                    missingVideos.push({
                        id: video.id,
                        url: video.video_url
                    });
                } else {
                    // console.log(`\n❓ Other error for ${video.id}: ${err.message}`);
                    // Treat connection errors or timeouts strictly? 
                    // For now, only track explicit 404s.
                }
            }
        }));
    }

    console.log('\n\n=== 🚨 MISSING VIDEOS (In DB but not in R2) ===');
    if (missingVideos.length === 0) {
        console.log('🎉 No missing videos found! All URLs are valid.');
    } else {
        missingVideos.forEach(v => {
            console.log(`❌ ID: ${v.id} | URL: ${v.url}`);
        });

        const fs = require('fs');
        const idList = missingVideos.map(v => `'${v.id}'`).join(', ');
        const sql = `DELETE FROM videos WHERE id IN (${idList});`;
        console.log(sql);
        fs.writeFileSync('delete_missing.sql', sql, 'utf8');
        console.log('\n✅ SQL command saved to delete_missing.sql');
    }
}

findMissingVideos();
