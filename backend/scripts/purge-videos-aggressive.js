require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function aggressivePurge() {
    console.log('--- FETCHING ALL CURRENT VIDEOS ---');
    const { data: videos, error } = await supabase
        .from('videos')
        .select('id, video_url, processing_status');

    if (error) { console.error('Fetch Error:', error); return; }

    const targetId = '06d2dd31-9785-4be5-8357-62662619b34d'; // The 9s video we want to keep

    for (const video of videos) {
        if (video.id === targetId) {
            console.log(`Keeping target video: ${video.id}`);
            continue;
        }

        console.log(`Force deleting zombie video: ${video.id} (${video.processing_status})`);
        const { error: rpcError } = await supabase.rpc('force_delete_video', { vid: video.id });

        if (rpcError) {
            console.error(`   ❌ Failed to delete ${video.id}:`, rpcError.message);
        } else {
            console.log(`   ✅ Success.`);
        }
    }
    console.log('Aggressive purge finished.');
}

aggressivePurge();
