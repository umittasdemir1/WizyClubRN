#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptsDir = __dirname;
const argv = process.argv.slice(2);
const command = argv[0];

function listScripts() {
  const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name)
    .filter((name) => name !== 'cli.js')
    .map((name) => ({
      name,
      cmd: path.basename(name, '.js'),
      fullPath: path.join(scriptsDir, name),
    }))
    .sort((a, b) => a.cmd.localeCompare(b.cmd));
}

function printHelp() {
  const scripts = listScripts();
  console.log('Backend Scripts CLI');
  console.log('');
  console.log('Usage:');
  console.log('  node backend/scripts/cli.js list');
  console.log('  node backend/scripts/cli.js <command> [args...]');
  console.log('');
  console.log('Available commands:');
  if (scripts.length === 0) {
    console.log('  (no scripts found)');
  } else {
    for (const script of scripts) {
      console.log(`  ${script.cmd}`);
    }
  }
  console.log('');
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === 'list') {
  const scripts = listScripts();
  for (const script of scripts) {
    console.log(script.cmd);
  }
  process.exit(0);
}

const scripts = listScripts();
const match = scripts.find((script) => script.cmd === command);

if (!match) {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

const result = spawnSync('node', [match.fullPath, ...argv.slice(1)], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);
