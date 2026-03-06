const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env');
let content = fs.readFileSync(envPath, 'utf8');

const requiredKeys = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL'
];

const updates = {};
for (const key of requiredKeys) {
    const value = process.env[key];
    if (!value || !value.trim()) {
        throw new Error(`Missing required env var: ${key}`);
    }
    updates[key] = value;
}

for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}`;
    }
}

fs.writeFileSync(envPath, content);
console.log('.env updated successfully.');
