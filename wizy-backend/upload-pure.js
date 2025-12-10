const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Download.mp4';
const fileStat = fs.statSync(filePath);
const boundary = '--------------------------' + Date.now().toString(16);

// Construct the header and footer of the multipart/form-data request
const header = `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="video"; filename="Download.mp4"\r\n` +
    `Content-Type: video/mp4\r\n\r\n`;
const footer = `\r\n--${boundary}--`;

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/upload-hls',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(header) + fileStat.size + Buffer.byteLength(footer),
    },
};

console.log('🚀 Starting upload...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('✅ Upload completed.');
    });
});

req.on('error', (e) => {
    console.error(`❌ Example upload problem: ${e.message}`);
});

// Write header
req.write(header);

// Stream file
const fileStream = fs.createReadStream(filePath);
fileStream.pipe(req, { end: false });

fileStream.on('end', () => {
    req.write(footer);
    req.end();
    console.log('📤 File stream sent.');
});
