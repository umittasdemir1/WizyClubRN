
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, ANON_KEY);

async function checkProfileStructure() {
    console.log('Checking profile structure for: wizyclub-official');

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'wizyclub-official')
        .single();

    if (error) console.error('Error:', error);
    else console.log('Profile Data:', data);
}

checkProfileStructure();
