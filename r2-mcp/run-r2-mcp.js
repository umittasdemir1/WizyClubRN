const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Log file for debugging - stdout belongs to MCP protocol
const logFile = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg) {
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function parseDotEnv(filePath) {
    const out = {};
    if (!fs.existsSync(filePath)) {
        return out;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const idx = trimmed.indexOf('=');
        if (idx <= 0) {
            continue;
        }
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

log('Starting CUSTOM R2-MCP wrapper...');

const serverFile = path.join(__dirname, 'custom-r2-server.js');
const envFile = path.join(__dirname, '.env');

if (!fs.existsSync(serverFile)) {
    log(`ERROR: Custom server file not found at: ${serverFile}`);
    process.exit(1);
}

const fileEnv = parseDotEnv(envFile);
const mergedEnv = { ...fileEnv, ...process.env };
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
const missing = required.filter((key) => !mergedEnv[key] || !String(mergedEnv[key]).trim());

if (missing.length > 0) {
    log(`ERROR: Missing required env vars (${missing.join(', ')}). Generate r2-mcp/.env via: bash scripts/sync-env.sh r2-mcp`);
    process.exit(1);
}

// Start the custom server
// stdout must go directly to parent for MCP protocol
// stderr goes to our log file to keep the protocol clean
const child = spawn('node', [serverFile], {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: mergedEnv
});

child.stderr.on('data', (data) => {
    log(`STDERR: ${data.toString()}`);
});

child.on('error', (err) => {
    log(`FAILED to start: ${err.message}`);
});

child.on('exit', (code) => {
    log(`Exited with code ${code}`);
});
