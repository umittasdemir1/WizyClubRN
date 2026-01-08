const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'wizy-backend', '.env');
let content = fs.readFileSync(envPath, 'utf8');

const updates = {
    R2_ACCOUNT_ID: '952ab1046bdcb041ec23ef25f74d33a5',
    R2_ACCESS_KEY_ID: '83698d552e80464187972e34ebd99fec',
    R2_SECRET_ACCESS_KEY: '568611ad81e89caa08be658c80f4afd83818a5dcfc260e778123d5b667efbfa7',
    R2_BUCKET_NAME: 'wizy-club-staging',
    R2_PUBLIC_URL: 'http://pub-426c6d2d3e914041a80d464249339e3c.r2.dev'
};

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
