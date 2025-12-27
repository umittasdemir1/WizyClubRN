const SUPABASE_URL = 'https://snpckjrjmwxwgqcqghkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGNranJqbXd4d2dxY3FnaGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODQyMjQsImV4cCI6MjA4MDY2MDIyNH0.Dz-NNN4M_fZePf9EqefUkTITv6yec8KUdKNSEzv3Rw4';

async function run() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/videos?select=id,created_at,video_url`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    const data = await response.json();
    console.log('--- ALL VIDEOS ---');
    data.forEach(v => {
        console.log(`ID: ${v.id}`);
        console.log(`URL: ${v.video_url}`);
        console.log(`Created: ${v.created_at}`);
        console.log('------------------');
    });
}

run();
