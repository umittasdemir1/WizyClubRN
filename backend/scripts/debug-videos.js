require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkVideos() {
    const { data: videos, error } = await supabase
        .from('videos')
        .select('id, video_url, description, created_at, processing_status')
        .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    let output = '--- FINAL DB STATE ---\n';
    videos.forEach((v, i) => {
        output += `[${i}] ID: ${v.id}\n`;
        output += `    CREATED: ${v.created_at}\n`;
        output += `    URL: ${v.video_url}\n`;
        output += `    DESC: ${v.description.substring(0, 40)}...\n`;
        output += '-------------------\n';
    });
    fs.writeFileSync('debug-output.log', output);
}
checkVideos();
