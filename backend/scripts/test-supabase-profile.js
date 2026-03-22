// Quick test to verify Supabase connection and data fetch
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProfile() {
    console.log('🧪 Testing Supabase Profile Fetch...\n');

    const userId = '687c8079-e94c-42c2-9442-8a4a6b63dec6';
    console.log(`🔍 Fetching profile for ID: ${userId}\n`);

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ ERROR:', error);
            console.error('Message:', error.message);
            console.error('Code:', error.code);
            console.error('Details:', error.details);
            console.error('Hint:', error.hint);
            return;
        }

        console.log('✅ SUCCESS! Profile fetched:');
        console.log('─────────────────────────────');
        console.log('ID:', data.id);
        console.log('Username:', data.username);
        console.log('Full Name:', data.full_name);
        console.log('Bio:', data.bio?.substring(0, 50) + '...');
        console.log('Avatar:', data.avatar_url);
        console.log('Country:', data.country);
        console.log('Verified:', data.is_verified);
        console.log('Followers:', data.followers_count);
        console.log('Following:', data.following_count);
        console.log('─────────────────────────────');
        console.log('\n✅ Supabase connection works perfectly!');
        console.log('✅ Data exists in database!');
        console.log('✅ RLS policies allow reading!');
        console.log('\n❓ If mobile app shows fallback data, the issue is in the React Native code or how it loads the hook.');

    } catch (err) {
        console.error('💥 EXCEPTION:', err);
    }
}

testProfile();
