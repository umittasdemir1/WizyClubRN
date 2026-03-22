require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

async function run() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/videos?select=id,created_at,video_url`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    const data = await response.json();
    console.log('--- ALL VIDEOS ---');
    data.forEach(v => {
        console.log(`ID: ${v.id}`);
        console.log(`URL: ${v.video_url}`);
        console.log(`Created: ${v.created_at}`);
        console.log('------------------');
    });
}

run();
