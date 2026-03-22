const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function verify() {
    console.log('🔍 WizyClub Setup Audit Starting...\n');

    // 1. R2 Audit
    console.log('--- R2 Storage ---');
    try {
        const { Buckets } = await r2.send(new ListBucketsCommand({}));
        console.log(`✅ Connection OK. Found ${Buckets.length} buckets.`);
        const bucketExists = Buckets.some(b => b.Name === process.env.R2_BUCKET_NAME);
        if (bucketExists) {
            console.log(`✅ Bucket "${process.env.R2_BUCKET_NAME}" is ACTIVE.`);
            const { Contents } = await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, MaxKeys: 5 }));
            console.log(`✅ Samples in bucket: ${Contents ? Contents.map(c => c.Key).join(', ') : 'Empty'}`);
        } else {
            console.log(`❌ Bucket "${process.env.R2_BUCKET_NAME}" NOT FOUND!`);
        }
    } catch (e) {
        console.log(`❌ R2 Error: ${e.message}`);
    }

    // 2. Supabase Tables Audit
    console.log('\n--- Supabase Tables ---');
    const tables = [
        'profiles', 'videos', 'social_links', 'stories', 'likes',
        'follows', 'saves', 'brands', 'brand_deals', 'user_sessions'
    ];

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('id').limit(1);
            if (error) throw error;
            console.log(`✅ Table "${table}" exists.`);
        } catch (e) {
            console.log(`❌ Table "${table}" MISSING or inaccessible: ${e.message}`);
        }
    }

    // 3. New Columns Audit (Profiles)
    console.log('\n--- Profile Columns Audit ---');
    try {
        const { data, error } = await supabase.from('profiles').select('website, is_verified, followers_count').limit(1);
        if (error) throw error;
        console.log('✅ Profiles table has new columns (website, is_verified, etc.).');
    } catch (e) {
        console.log(`❌ Profiles table MISSING new columns: ${e.message}`);
    }

    console.log('\n--- Video Columns Audit ---');
    try {
        const { data, error } = await supabase.from('videos').select('shares_count, saves_count, shops_count').limit(1);
        if (error) throw error;
        console.log('✅ Videos table has new columns (shares_count, saves_count, etc.).');
    } catch (e) {
        console.log(`❌ Videos table MISSING new columns: ${e.message}`);
    }

    console.log('\n🚀 Audit Complete.');
}

verify();
