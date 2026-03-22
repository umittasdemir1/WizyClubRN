require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUrls() {
    const { data: videos, error } = await supabase
        .from('videos')
        .select('id, video_url')
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Sample video URLs in Supabase:\n');
    videos.forEach((v, i) => {
        console.log(`${i + 1}. ${v.video_url}`);
    });
}

checkUrls();
