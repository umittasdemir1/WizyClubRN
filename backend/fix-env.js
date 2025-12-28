const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Replace R2_BUCKET_NAME
if (envContent.includes('R2_BUCKET_NAME=')) {
    envContent = envContent.replace(/R2_BUCKET_NAME=.*/g, 'R2_BUCKET_NAME=wizyclub-assets');
} else {
    envContent += '\nR2_BUCKET_NAME=wizyclub-assets';
}

fs.writeFileSync(envPath, envContent);
console.log('✅ Updated .env with R2_BUCKET_NAME=wizyclub-assets');
