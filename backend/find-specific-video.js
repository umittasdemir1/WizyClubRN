require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findVideo() {
    const id = '7fbde34a-7d03-4a4b-9d7f-202031568c1c';
    console.log(`Searching for ID: ${id}`);

    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('✅ FOUND IN DB:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('❌ NOT FOUND IN DB.');
    }

    // Check total count just in case
    const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true });
    console.log(`Total videos in DB: ${count}`);
}

findVideo();
