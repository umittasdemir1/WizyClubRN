require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function purgeVideos() {
    console.log('--- PURGING OLD PENDING VIDEOS ---');

    // We keep the new one (06d2dd31-9785-4be5-8357-62662619b34d)
    const { data, error } = await supabase
        .from('videos')
        .delete()
        .neq('id', '06d2dd31-9785-4be5-8357-62662619b34d')
        .eq('processing_status', 'pending');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Purge successful.');
    }

    // Also delete any completed ones that are older than today
    const { data: data2, error: error2 } = await supabase
        .from('videos')
        .delete()
        .neq('id', '06d2dd31-9785-4be5-8357-62662619b34d')
        .lt('created_at', '2025-12-17T00:00:00Z');

    if (error2) {
        console.error('Error 2:', error2);
    } else {
        console.log('Old completed videos purge successful.');
    }
}

purgeVideos();
