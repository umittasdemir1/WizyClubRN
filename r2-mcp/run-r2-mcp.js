const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Log file for debugging - stdout belongs to MCP protocol
const logFile = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg) {
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
}

log('Starting CUSTOM R2-MCP wrapper...');

const serverFile = path.join(__dirname, 'custom-r2-server.js');

if (!fs.existsSync(serverFile)) {
    log(`ERROR: Custom server file not found at: ${serverFile}`);
    process.exit(1);
}

// Start the custom server
// stdout must go directly to parent for MCP protocol
// stderr goes to our log file to keep the protocol clean
const child = spawn('node', [serverFile], {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: process.env
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
