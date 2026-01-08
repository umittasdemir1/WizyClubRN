const https = require('https');

const ACCOUNT_ID = '952ab1046bdcb041ec23ef25f74d33a5';
const API_TOKEN = '2w9izR44qbqBf4Nnlox0BK10_Vh0M6qLcJVryCSA';

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
