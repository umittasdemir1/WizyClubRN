require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkTables() {
    console.log('Checking videos table...');
    const { data: vData, error: vError } = await supabase.from('videos').select('*').limit(1);
    if (vError) console.error('Videos Error:', vError);
    else console.log('Videos Columns:', Object.keys(vData[0] || {}));

    console.log('\nChecking stories table...');
    const { data: sData, error: sError } = await supabase.from('stories').select('*').limit(1);
    if (sError) console.error('Stories Error:', sError);
    else console.log('Stories Columns:', Object.keys(sData[0] || {}));

    process.exit();
}

checkTables();
