require('dotenv').config();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function listR2() {
    console.log('--- R2 OBJECT DUMP ---');
    const response = await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME }));
    if (response.Contents) {
        console.log(`Total Objects: ${response.Contents.length}`);
        response.Contents.forEach(obj => {
            console.log(` - ${obj.Key} (${obj.Size} bytes)`);
        });
    } else {
        console.log('R2 is EMPTY.');
    }
}

listR2();
