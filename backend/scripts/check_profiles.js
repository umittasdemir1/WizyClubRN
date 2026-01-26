// Simple script to check profiles using mobile's Supabase config
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://snpckjrjmwxwgqcqghkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGNranJqbXd4d2dxY3FnaGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODQyMjQsImV4cCI6MjA4MDY2MDIyNH0.Dz-NNN4M_fZePf9EqefUkTITv6yec8KUdKNSEzv3Rw4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkProfiles() {
    console.log('=== CHECKING PROFILES TABLE ===\n');

    try {
        // List all profiles
        const { data: profiles, error: listError } = await supabase
            .from('profiles')
            .select('*')
            .limit(10);

        if (listError) {
            console.error('Error fetching profiles:', listError.message);
            return;
        }

        console.log(`Found ${profiles?.length || 0} profiles:\n`);

        if (profiles && profiles.length > 0) {
            profiles.forEach((profile, i) => {
                console.log(`Profile ${i + 1}:`);
                console.log(`  ID: ${profile.id}`);
                console.log(`  Username: ${profile.username}`);
                console.log(`  Full Name: ${profile.full_name}`);
                console.log(`  Email: ${profile.email || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('No profiles found in the database.');
            console.log('\nThis means you need to:');
            console.log('1. Sign up a user through Supabase Auth');
            console.log('2. Create a profile trigger or manually insert profile data');
        }

        // Check the specific hardcoded ID
        const hardcodedId = '687c8079-e94c-42c2-9442-8a4a6b63dec6';
        console.log(`\nChecking for hardcoded ID: ${hardcodedId}`);

        const { data: specificProfile, error: specificError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', hardcodedId)
            .single();

        if (specificError) {
            console.log('❌ Hardcoded profile NOT found:', specificError.message);
        } else {
            console.log('✅ Hardcoded profile FOUND:');
            console.log(JSON.stringify(specificProfile, null, 2));
        }

        // Check auth users
        console.log('\n=== CHECKING AUTH USERS ===\n');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.log('No active session:', sessionError.message);
        } else if (session) {
            console.log('Active session found:');
            console.log(`  User ID: ${session.user.id}`);
            console.log(`  Email: ${session.user.email}`);
        } else {
            console.log('No active session - user not logged in');
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkProfiles();
