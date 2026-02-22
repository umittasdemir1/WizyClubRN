require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;
const R2_PROXY = 'https://wizy-r2-proxy.tasdemir-umit.workers.dev';

// Mapping based on creation times:
// DB created_at -> R2 LastModified (from list_objects)
// 027fffc0: 2025-12-17T22:14:52 -> 1766009656643 (R2: 22:14:48)
// 42c5ed0a: 2025-12-17T22:38:50 -> 1766011111754 (R2: 22:38:48)
// 91550dc8: 2025-12-17T23:03:21 -> 1766012583186 (R2: 23:03:20)

const FIXES = [
    {
        id: '027fffc0-3b0c-461f-84fb-a3b47fbbd652',
        video_url: `${R2_PROXY}/videos/1766009656643/master.mp4`,
        thumbnail_url: `${R2_PROXY}/thumbs/1766009656643.jpg`,
        sprite_url: `${R2_PROXY}/videos/1766009656643/sprite_1766009656643_0.jpg`
    },
    {
        id: '42c5ed0a-7d54-4f2a-a641-c79333403c0e',
        video_url: `${R2_PROXY}/videos/1766011111754/master.mp4`,
        thumbnail_url: `${R2_PROXY}/thumbs/1766011111754.jpg`,
        sprite_url: `${R2_PROXY}/videos/1766011111754/sprite_1766011111754_0.jpg`
    },
    {
        id: '91550dc8-3f5f-4b42-894f-ef2a667f6106',
        video_url: `${R2_PROXY}/videos/1766012583186/master.mp4`,
        thumbnail_url: `${R2_PROXY}/thumbs/1766012583186.jpg`,
        sprite_url: `${R2_PROXY}/videos/1766012583186/sprite_1766012583186_0.jpg`
    }
];

async function fixVideos() {
    console.log('--- FIXING VIDEO URLS ---');

    for (const fix of FIXES) {
        console.log(`\nFixing ${fix.id}...`);
        console.log(`  New URL: ${fix.video_url}`);

        const res = await fetch(`${SUPABASE_URL}/rest/v1/videos?id=eq.${fix.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                video_url: fix.video_url,
                thumbnail_url: fix.thumbnail_url,
                sprite_url: fix.sprite_url
            })
        });

        if (res.ok) {
            console.log(`  ✅ Fixed!`);
        } else {
            console.error(`  ❌ Failed:`, await res.text());
        }
    }

    console.log('\n--- ALL FIXES APPLIED ---');
}

fixVideos();
