require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 14 farklı kullanıcı - Türkçe isimler
const USERS = [
    { user_id: 'ece_yilmaz', display_name: 'Ece Yılmaz' },
    { user_id: 'ali_kaya', display_name: 'Ali Kaya' },
    { user_id: 'zeynep_demir', display_name: 'Zeynep Demir' },
    { user_id: 'mert_aksoy', display_name: 'Mert Aksoy' },
    { user_id: 'defne_ozturk', display_name: 'Defne Öztürk' },
    { user_id: 'can_sahin', display_name: 'Can Şahin' },
    { user_id: 'elif_celik', display_name: 'Elif Çelik' },
    { user_id: 'burak_yildiz', display_name: 'Burak Yıldız' },
    { user_id: 'selin_aydin', display_name: 'Selin Aydın' },
    { user_id: 'emre_koc', display_name: 'Emre Koç' },
    { user_id: 'ayse_tas', display_name: 'Ayşe Taş' },
    { user_id: 'deniz_arslan', display_name: 'Deniz Arslan' },
    { user_id: 'ceren_polat', display_name: 'Ceren Polat' },
    { user_id: 'kaan_erdogan', display_name: 'Kaan Erdoğan' },
];

async function assignUsers() {
    console.log('🔄 Fetching videos...');

    const { data: videos, error } = await supabase
        .from('videos')
        .select('id')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📹 Found ${videos.length} videos\n`);

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const user = USERS[i % USERS.length];

        console.log(`Updating video ${i + 1}/${videos.length}: ${user.user_id}`);

        const { error: updateError } = await supabase
            .from('videos')
            .update({ user_id: user.user_id })
            .eq('id', video.id);

        if (updateError) {
            console.error(`  ❌ Error:`, updateError.message);
        } else {
            console.log(`  ✅ Assigned to @${user.user_id}`);
        }
    }

    console.log('\n✅ All videos updated with unique users!');
}

assignUsers();
