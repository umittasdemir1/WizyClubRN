require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const OLD_DOMAIN = 'pub-b21c779a5e31422e98dba3aad6f253eb.r2.dev';
const NEW_DOMAIN = 'wizy-r2-proxy.tasdemir-umit.workers.dev';

async function migrateUrls() {
    console.log('🔄 Fetching videos from Supabase...');

    const { data: videos, error } = await supabase
        .from('videos')
        .select('id, video_url, thumbnail_url');

    if (error) {
        console.error('❌ Error fetching videos:', error);
        return;
    }

    console.log(`📹 Found ${videos.length} videos\n`);

    let updatedCount = 0;
    for (const video of videos) {
        const newVideoUrl = video.video_url.replace(OLD_DOMAIN, NEW_DOMAIN);
        const newThumbUrl = video.thumbnail_url.replace(OLD_DOMAIN, NEW_DOMAIN);

        if (newVideoUrl !== video.video_url) {
            console.log(`Updating ${video.id}...`);
            console.log(`  Old: ${video.video_url}`);
            console.log(`  New: ${newVideoUrl}`);

            const { error: updateError } = await supabase
                .from('videos')
                .update({
                    video_url: newVideoUrl,
                    thumbnail_url: newThumbUrl
                })
                .eq('id', video.id);

            if (updateError) {
                console.error(`  ❌ Error:`, updateError);
            } else {
                console.log('  ✅ Done');
                updatedCount++;
            }
        }
    }

    console.log(`\n✅ Updated ${updatedCount}/${videos.length} videos`);
    console.log('🔗 New URL format: https://wizy-r2-proxy.tasdemir-umit.workers.dev/videos/xxx.mp4');
}

migrateUrls();
