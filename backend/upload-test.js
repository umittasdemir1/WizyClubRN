const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const form = new FormData();
form.append('video', fs.createReadStream('D:\\WizyClub\\Download (2).mp4'));
form.append('userId', 'test-user');
form.append('description', 'High Quality Thumbnail Test');

console.log('🚀 Uploading D:\\WizyClub\\Download (2).mp4 to http://localhost:3000/upload-hls ...');

axios.post('http://localhost:3000/upload-hls', form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity
})
    .then(response => {
        console.log('✅ Upload success:', response.data);
    })
    .catch(error => {
        console.error('❌ Upload error:', error.message);
        if (error.response) {
            console.error('Server response:', error.response.data);
        }
    });
