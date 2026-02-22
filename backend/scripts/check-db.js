const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkVideos() {
    console.log('--- Checking Supabase Videos ---');
    const { data, error } = await supabase
        .from('videos')
        .select('id, video_url, thumbnail_url, hls_url')
        .limit(5);

    if (error) {
        console.error('Error fetching videos:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkVideos();
