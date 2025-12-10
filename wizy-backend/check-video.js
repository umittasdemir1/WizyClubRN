require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkLastVideo() {
    const { data, error } = await supabase
        .from('videos')
        .select('id, hls_url, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Last uploaded video:');
        console.log(JSON.stringify(data[0], null, 2));
    }
}

checkLastVideo();
