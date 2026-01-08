const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://snpckjrjmwxwgqcqghkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGNranJqbXd4d2dxY3FnaGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODQyMjQsImV4cCI6MjA4MDY2MDIyNH0.Dz-NNN4M_fZePf9EqefUkTITv6yec8KUdKNSEzv3Rw4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkVideos() {
    console.log('--- Checking Supabase Videos ---');
    const { data, error } = await supabase
        .from('videos')
        .select('id, video_url, thumbnail_url, hls_url')
        .limit(5);

    if (error) {
        console.error('Error fetching videos:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkVideos();
