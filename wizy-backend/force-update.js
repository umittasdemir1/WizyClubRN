require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const OLD_DOMAIN = 'pub-b21c779a5e31422e98dba3aad6f253eb.r2.dev';
const NEW_DOMAIN = 'wizy-r2-proxy.tasdemir-umit.workers.dev';

async function forceUpdateUrls() {
    console.log('🔄 Force updating ALL video URLs...\n');

    const { data: videos, error } = await supabase
        .from('videos')
        .select('*');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`Found ${videos.length} videos\n`);

    for (const video of videos) {
        const newVideoUrl = video.video_url.replace(OLD_DOMAIN, NEW_DOMAIN);
        const newThumbUrl = video.thumbnail_url.replace(OLD_DOMAIN, NEW_DOMAIN);

        console.log(`Updating ${video.id}...`);
        console.log(`  video_url: ${newVideoUrl.substring(0, 60)}...`);

        const { error: updateError } = await supabase
            .from('videos')
            .update({
                video_url: newVideoUrl,
                thumbnail_url: newThumbUrl
            })
            .eq('id', video.id);

        if (updateError) {
            console.error(`  ❌ Error:`, updateError.message);
        } else {
            console.log('  ✅ Updated');
        }
    }

    // Verify
    console.log('\n📋 Verification:');
    const { data: check } = await supabase
        .from('videos')
        .select('video_url')
        .limit(3);

    check.forEach((v, i) => {
        console.log(`${i + 1}. ${v.video_url}`);
    });
}

forceUpdateUrls();
