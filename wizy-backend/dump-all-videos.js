require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function dumpAll() {
    const { data, error } = await supabase
        .from('videos')
        .select('*');

    let output = '';
    if (error) {
        output = JSON.stringify(error, null, 2);
    } else {
        output = `TOTAL COUNT: ${data.length}\n`;
        data.forEach((v, i) => {
            output += `[${i}] ID: ${v.id} | USER: ${v.user_id} | CREATED: ${v.created_at}\n`;
            output += `    URL: ${v.video_url}\n`;
            output += `    DESC: ${v.description.substring(0, 40)}...\n`;
            output += '-------------------\n';
        });
    }
    fs.writeFileSync('dump-output.log', output);
    console.log('Written to dump-output.log');
}

dumpAll();
