const https = require('https');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('Missing required env vars: R2_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
    process.exit(1);
}

const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path: `/client/v4/accounts/${ACCOUNT_ID}/r2/buckets`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (d) => { data += d; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.end();
