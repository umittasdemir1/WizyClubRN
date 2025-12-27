require('dotenv').config();
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

// Config
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

async function deepAudit() {
    console.log('🕵️ DEEP AUDIT of R2 Bucket:', process.env.R2_BUCKET_NAME);

    // List top level 'videos/' to see what folders exist
    try {
        const listCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: 'videos/', // List ALL videos
            MaxKeys: 100 // Just the first batch to see if we spot the stubborn one
        });
        const listRes = await r2.send(listCmd);

        console.log(`\n📂 Found ${listRes.KeyCount} total objects in 'videos/' prefix.`);

        // Filter for our stubborn timestamp
        const stubbornId = '1765387197168';
        const matches = listRes.Contents.filter(c => c.Key.includes(stubbornId));

        if (matches.length > 0) {
            console.log(`\n❌ FOUND STUBBORN FILES (${matches.length}):`);
            matches.forEach(m => console.log(`   - ${m.Key} (${m.Size} bytes)`));

            // DELETE THEM
            console.log('\n🔥 DELETING FOUND FILES...');
            await r2.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: { Objects: matches.map(m => ({ Key: m.Key })) }
            }));
            console.log('✅ Deleted.');
        } else {
            console.log(`\n✅ No files matching '${stubbornId}' were found in the list.`);
            console.log('   (If you still see them in browser, it is CDN CACHE 100%)');
        }

    } catch (e) {
        console.error('Audit Error:', e);
    }
}

deepAudit();
