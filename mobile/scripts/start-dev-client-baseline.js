#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mobileRoot = path.resolve(__dirname, '..');
const docPath = path.join(mobileRoot, 'docs', 'PERFORMANCE_BASELINE.md');

const rawArgs = process.argv.slice(2);
const options = {
  build: 'dev',
  notes: '',
  device: 'android (tunnel)',
};

const expoArgs = ['expo', 'start'];
for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === '--build' && rawArgs[i + 1]) {
    options.build = rawArgs[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith('--build=')) {
    options.build = arg.split('=')[1];
    continue;
  }
  if (arg === '--notes' && rawArgs[i + 1]) {
    options.notes = rawArgs[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith('--notes=')) {
    options.notes = arg.split('=')[1];
    continue;
  }
  if (arg === '--device' && rawArgs[i + 1]) {
    options.device = rawArgs[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith('--device=')) {
    options.device = arg.split('=')[1];
    continue;
  }
  expoArgs.push(arg);
}

if (!expoArgs.includes('--dev-client')) {
  expoArgs.push('--dev-client');
}

function stripAnsi(input) {
  return input.replace(/\x1b\[[0-9;]*m/g, '');
}

function parseCheckpoint(line) {
  if (!line.includes('Baseline checkpoint')) {
    return null;
  }

  const start = line.indexOf('{');
  const end = line.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const jsonText = line.slice(start, end + 1);
    try {
      const data = JSON.parse(jsonText);
      if (data && typeof data.checkpoint === 'string' && typeof data.durationMs === 'number') {
        return { checkpoint: data.checkpoint, durationMs: data.durationMs };
      }
    } catch {
      // fall through to regex
    }
  }

  const checkpointMatch = line.match(/checkpoint[^a-zA-Z0-9]*[:=][^a-zA-Z0-9]*['"]?([a-z_]+)['"]?/i);
  const durationMatch = line.match(/durationMs[^0-9]*([0-9]+)/i);
  if (!checkpointMatch || !durationMatch) {
    return null;
  }
  return {
    checkpoint: checkpointMatch[1],
    durationMs: Number(durationMatch[1]),
  };
}

function updateDoc(row) {
  if (!fs.existsSync(docPath)) {
    console.error('Performance baseline doc not found:', docPath);
    return;
  }
  const lines = fs.readFileSync(docPath, 'utf8').split('\n');
  const headerIndex = lines.findIndex((line) => line.startsWith('| Date | Device | Build |'));
  if (headerIndex < 0) {
    console.error('Baseline table header not found in doc.');
    return;
  }
  const separatorIndex = headerIndex + 1;
  let insertIndex = separatorIndex + 1;
  let placeholderIndex = -1;
  while (insertIndex < lines.length && lines[insertIndex].trim().startsWith('|')) {
    if (lines[insertIndex].includes('| YYYY-MM-DD |')) {
      placeholderIndex = insertIndex;
      break;
    }
    insertIndex += 1;
  }
  if (placeholderIndex >= 0) {
    lines[placeholderIndex] = row;
  } else {
    lines.splice(insertIndex, 0, row);
  }
  fs.writeFileSync(docPath, lines.join('\n'));
}

const expo = spawn('npx', expoArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
const checkpoints = {
  appReady: null,
  firstVideoReady: null,
};
let captured = false;
let connectUrlPrinted = false;

function maybeCapture() {
  if (captured) return;
  if (checkpoints.appReady === null || checkpoints.firstVideoReady === null) return;
  captured = true;
  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | ${options.device} | ${options.build} | ${checkpoints.appReady} | ${checkpoints.firstVideoReady} | ${options.notes} |`;
  updateDoc(row);
  console.log('Baseline captured and recorded in:', docPath);
}

function handleOutput(chunk) {
  const text = stripAnsi(chunk.toString());
  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!connectUrlPrinted) {
      const urlMatch = line.match(/(exp|exps):\/\/\S+/) || line.match(/https?:\/\/\S+/);
      if (urlMatch) {
        const url = urlMatch[0].replace(/[),.]+$/, '');
        if (!url.includes('localhost')) {
          connectUrlPrinted = true;
          console.log(`Connect URL: ${url}`);
        }
      }
    }
    const parsed = parseCheckpoint(line);
    if (!parsed) continue;
    if (parsed.checkpoint === 'app_ready') {
      checkpoints.appReady = parsed.durationMs;
    }
    if (parsed.checkpoint === 'first_video_ready') {
      checkpoints.firstVideoReady = parsed.durationMs;
    }
    maybeCapture();
  }
}

expo.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  handleOutput(chunk);
});

expo.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
  handleOutput(chunk);
});

if (expo.stdin && process.stdin.isTTY) {
  process.stdin.pipe(expo.stdin);
}

const shutdown = () => {
  if (!expo.killed) {
    expo.kill('SIGINT');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

expo.on('exit', (code) => {
  if (!captured) {
    console.log('Baseline capture not completed yet.');
  }
  process.exit(typeof code === 'number' ? code : 0);
});
