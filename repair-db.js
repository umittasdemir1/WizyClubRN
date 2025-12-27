const SUPABASE_URL = 'https://snpckjrjmwxwgqcqghkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGNranJqbXd4d2dxY3FnaGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODQyMjQsImV4cCI6MjA4MDY2MDIyNH0.Dz-NNN4M_fZePf9EqefUkTITv6yec8KUdKNSEzv3Rw4';
const PROXY_URL = 'https://wizy-r2-proxy.tasdemir-umit.workers.dev';

async function repair() {
    console.log('--- Database Repair Starting ---');

    // 1. Fetch current corrupted videos
    const response = await fetch(`${SUPABASE_URL}/rest/v1/videos?select=id,video_url,thumbnail_url,sprite_url&video_url=like.undefined*`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    const videos = await response.json();
    console.log(`Found ${videos.length} corrupted videos.`);

    for (const video of videos) {
        console.log(`Fixing Video ID: ${video.id}`);

        const updates = {
            video_url: video.video_url.replace('undefined', PROXY_URL),
            thumbnail_url: (video.thumbnail_url || '').replace('undefined', PROXY_URL),
            sprite_url: (video.sprite_url || '').replace('undefined', PROXY_URL)
        };

        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/videos?id=eq.${video.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updates)
        });

        if (patchRes.ok) {
            console.log(`✅ Fixed: ${video.id}`);
        } else {
            console.error(`❌ Failed to fix ${video.id}:`, await patchRes.text());
        }
    }

    console.log('--- Repair Complete ---');
}

repair();
