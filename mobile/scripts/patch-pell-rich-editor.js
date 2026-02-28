const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-pell-rich-editor',
  'src',
  'editor.js'
);

const patchMarker = 'WIZY_PATCH: fix window is not defined';

try {
  if (!fs.existsSync(targetPath)) {
    console.log('[patch-pell-rich-editor] File not found, skipping.');
    process.exit(0);
  }

  let content = fs.readFileSync(targetPath, 'utf8');

  if (content.includes(patchMarker)) {
    console.log('[patch-pell-rich-editor] Already patched, skipping.');
    process.exit(0);
  }

  // Replace `window.__DEV__` with `false` since window is not available in RN context
  // The template literal is building HTML for WebView, so __DEV__ just needs a boolean value
  content = content.replace(
    'var __DEV__ = !!${window.__DEV__};',
    'var __DEV__ = !!${typeof window !== "undefined" && window.__DEV__}; // ' + patchMarker
  );

  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('[patch-pell-rich-editor] Patched successfully.');
} catch (err) {
  console.error('[patch-pell-rich-editor] Error:', err.message);
  process.exit(1);
}
