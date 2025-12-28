// Quick test to verify Supabase connection and data fetch
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://snpckjrjmwxwgqcqghkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGNranJqbXd4d2dxY3FnaGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODQyMjQsImV4cCI6MjA4MDY2MDIyNH0.Dz-NNN4M_fZePf9EqefUkTITv6yec8KUdKNSEzv3Rw4';

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
