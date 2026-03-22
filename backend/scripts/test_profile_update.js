const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testUpdate() {
    const userId = 'wizyclub-official'; // The test user ID from profile.tsx

    console.log(`=== Testing Profile Update for: ${userId} ===\n`);

    // 1. First, check if the profile exists
    const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.log('Profile NOT FOUND. Error:', fetchError.message);
        console.log('\n--- Creating a test profile ---');
        const { error: insertError } = await supabase.from('profiles').insert({
            id: userId,
            username: 'wizyclub_official',
            full_name: 'WizyClub Test',
            bio: 'Test bio',
        });
        if (insertError) {
            console.log('Insert Error:', insertError.message);
        } else {
            console.log('Profile created successfully!');
        }
        return;
    }

    console.log('Current Profile:', existing);

    // 2. Try an update
    console.log('\n--- Attempting Update ---');
    const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
            full_name: 'WizyClub Updated ' + Date.now(),
            username: 'wizyclub_updated',
            bio: 'Bio Updated at ' + new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) {
        console.log('❌ Update FAILED:', updateError.message);
        console.log('Error Details:', JSON.stringify(updateError, null, 2));
    } else {
        console.log('✅ Update SUCCESS:', updated);
    }
}

testUpdate();
