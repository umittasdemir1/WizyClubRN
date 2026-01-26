const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listProfiles() {
    console.log('=== ALL PROFILES IN DATABASE ===\n');
    const { data, error } = await supabase.from('profiles').select('id, username, full_name, bio').order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} profiles:\n`);
        data.forEach((p, i) => {
            console.log(`${i + 1}. ID: "${p.id}"`);
            console.log(`   Username: ${p.username}`);
            console.log(`   Name: ${p.full_name}`);
            console.log(`   Bio: ${p.bio ? p.bio.substring(0, 50) + '...' : 'null'}`);
            console.log('');
        });
    } else {
        console.log('No profiles found.');
    }
}

listProfiles();
