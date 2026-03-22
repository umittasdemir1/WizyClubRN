#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const mobileRoot = path.resolve(__dirname, '..');
const docPath = path.join(mobileRoot, 'docs', 'PERFORMANCE_BASELINE.md');

const args = process.argv.slice(2);
const options = {
  timeoutMs: 120000,
  build: 'dev',
  notes: '',
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--timeout' && args[i + 1]) {
    options.timeoutMs = Number(args[i + 1]) * 1000;
    i += 1;
    continue;
  }
  if (arg.startsWith('--timeout=')) {
    options.timeoutMs = Number(arg.split('=')[1]) * 1000;
    continue;
  }
  if (arg === '--build' && args[i + 1]) {
    options.build = args[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith('--build=')) {
    options.build = arg.split('=')[1];
    continue;
  }
  if (arg === '--notes' && args[i + 1]) {
    options.notes = args[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith('--notes=')) {
    options.notes = arg.split('=')[1];
    continue;
  }
}

function run(cmd, argsList) {
  return spawnSync(cmd, argsList, { encoding: 'utf8' });
}

function resolveAdbPath() {
  const home = os.homedir();
  const candidates = [
    process.env.ADB_PATH,
    'adb',
    path.join(home, 'Android', 'Sdk', 'platform-tools', 'adb'),
    path.join(home, '.nix-profile', 'bin', 'adb'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = run(candidate, ['version']);
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
}

function requireAdb() {
  const adbPath = resolveAdbPath();
  if (!adbPath) {
    console.error('adb not found. Install Android platform tools or set ADB_PATH.');
    process.exit(1);
  }
  return adbPath;
}

function getDeviceInfo(adbPath) {
  const devices = run(adbPath, ['devices']);
  if (devices.status !== 0 || !devices.stdout) {
    console.error('adb devices failed. Ensure a device or emulator is connected.');
    process.exit(1);
  }
  const lines = devices.stdout.split('\n').filter((line) => line.trim().endsWith('\tdevice'));
  if (lines.length === 0) {
    console.error('No adb devices detected. Connect a device or start an emulator.');
    process.exit(1);
  }
  const manufacturer = run(adbPath, ['shell', 'getprop', 'ro.product.manufacturer']).stdout.trim();
  const model = run(adbPath, ['shell', 'getprop', 'ro.product.model']).stdout.trim();
  const deviceName = [manufacturer, model].filter(Boolean).join(' ').trim() || 'android';
  return deviceName;
}

function stripAnsi(input) {
  return input.replace(/\x1b\[[0-9;]*m/g, '');
}

function parseJsonFromLine(line) {
  const start = line.indexOf('{');
  const end = line.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return null;
  const jsonText = line.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function updateDoc(row) {
  if (!fs.existsSync(docPath)) {
    console.error('Performance baseline doc not found:', docPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(docPath, 'utf8').split('\n');
  const headerIndex = lines.findIndex((line) => line.startsWith('| Date | Device | Build |'));
  if (headerIndex < 0) {
    console.error('Baseline table header not found in doc.');
    process.exit(1);
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

const adbPath = requireAdb();
const deviceName = getDeviceInfo(adbPath);

console.log('Capturing baseline logs from adb...');
console.log('Open the app, navigate to feed, and scroll a bit.');

run(adbPath, ['logcat', '-c']);

const logcat = spawn(adbPath, ['logcat', '-v', 'time', 'ReactNativeJS:V', '*:S'], {
  stdio: ['ignore', 'pipe', 'inherit'],
});

const checkpoints = {
  appReady: null,
  firstVideoReady: null,
};

const timeout = setTimeout(() => {
  console.error('Timeout waiting for baseline logs. Try again.');
  logcat.kill();
  process.exit(1);
}, options.timeoutMs);

function finish() {
  clearTimeout(timeout);
  logcat.kill();
  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | ${deviceName} | ${options.build} | ${checkpoints.appReady} | ${checkpoints.firstVideoReady} | ${options.notes} |`;
  updateDoc(row);
  console.log('Baseline captured and recorded in:', docPath);
  process.exit(0);
}

let buffer = '';
logcat.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const rawLine of lines) {
    const line = stripAnsi(rawLine);
    if (!line.includes('Baseline start') && !line.includes('Baseline checkpoint')) {
      continue;
    }
    const data = parseJsonFromLine(line);
    if (!data || typeof data !== 'object') continue;
    if (data.checkpoint === 'app_ready' && typeof data.durationMs === 'number') {
      checkpoints.appReady = data.durationMs;
    }
    if (data.checkpoint === 'first_video_ready' && typeof data.durationMs === 'number') {
      checkpoints.firstVideoReady = data.durationMs;
    }
    if (checkpoints.appReady !== null && checkpoints.firstVideoReady !== null) {
      finish();
      return;
    }
  }
});

logcat.on('exit', (code) => {
  if (code !== 0) {
    console.error('adb logcat exited unexpectedly.');
  }
});
