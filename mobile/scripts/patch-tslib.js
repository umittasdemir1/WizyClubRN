const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'node_modules', 'tslib', 'modules', 'index.js');

function patchTslibModulesIndex() {
  if (!fs.existsSync(targetPath)) {
    console.log('[patch-tslib] Skipped: target file not found.');
    return;
  }

  const original = fs.readFileSync(targetPath, 'utf8');
  const search = "import tslib from '../tslib.js';";
  const replace = "import * as tslib from '../tslib.js';";

  if (original.includes(replace)) {
    console.log('[patch-tslib] Already patched.');
    return;
  }

  if (!original.includes(search)) {
    console.log('[patch-tslib] Pattern not found, no changes applied.');
    return;
  }

  const updated = original.replace(search, replace);
  fs.writeFileSync(targetPath, updated, 'utf8');
  console.log('[patch-tslib] Patched tslib modules index.');
}

patchTslibModulesIndex();
