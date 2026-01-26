require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkVideos() {
    const { data, error } = await supabase
        .from('videos')
        .select('id, video_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('\n=== SON 10 VİDEO ===\n');
        data.forEach((v, i) => {
            const isPub = v.video_url.includes('pub-');
            const isWorker = v.video_url.includes('wizy-r2-proxy');
            const type = isPub ? '❌ PUB (Broken)' : isWorker ? '✅ WORKER' : '❓ Unknown';
            console.log(`${i + 1}. ${type}`);
            console.log(`   ID: ${v.id}`);
            console.log(`   URL: ${v.video_url.substring(0, 80)}...`);
            console.log(`   Date: ${v.created_at}\n`);
        });
    }
}

checkVideos();
