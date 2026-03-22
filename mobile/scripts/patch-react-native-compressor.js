const fs = require('fs');
const path = require('path');

const androidTargetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-compressor',
  'android',
  'src',
  'main',
  'java',
  'com',
  'reactnativecompressor',
  'Utils',
  'createVideoThumbnail.kt'
);

const iosTargetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-compressor',
  'ios',
  'Utils',
  'CreateVideoThumbnail.swift'
);

const dtsTargetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-compressor',
  'lib',
  'typescript',
  'utils',
  'index.d.ts'
);

function patchAndroid() {
  if (!fs.existsSync(androidTargetPath)) {
    console.log('[patch-react-native-compressor] Android target not found, skipping.');
    return;
  }

  const original = fs.readFileSync(androidTargetPath, 'utf8');
  let updated = original;

  if (!updated.includes('val timeMs = if (options.hasKey("time")) options.getInt("time") else 0')) {
    const headersNeedle = '        val headers: Map<String, String> = if (options.hasKey("headers")) options.getMap("headers")!!.toHashMap() as Map<String, String> else HashMap<String, String>()';
    const headersReplacement = `${headersNeedle}\n        val timeMs = if (options.hasKey("time")) options.getInt("time") else 0`;
    updated = updated.replace(headersNeedle, headersReplacement);
  }

  updated = updated.replace(
    '            val image = getBitmapAtTime(context, filePath, 0, headers)',
    '            val image = getBitmapAtTime(context, filePath, timeMs, headers)'
  );

  if (updated === original) {
    console.log('[patch-react-native-compressor] Android already patched.');
    return;
  }

  fs.writeFileSync(androidTargetPath, updated, 'utf8');
  console.log('[patch-react-native-compressor] Android patch applied.');
}

function patchIos() {
  if (!fs.existsSync(iosTargetPath)) {
    console.log('[patch-react-native-compressor] iOS target not found, skipping.');
    return;
  }

  const original = fs.readFileSync(iosTargetPath, 'utf8');
  let updated = original;

  if (!updated.includes('let timeMs = options["time"] as? Int ?? 0')) {
    const headersNeedle = '    let headers = options["headers"] as? [String: Any] ?? [:]';
    const headersReplacement = `${headersNeedle}\n    let timeMs = options["time"] as? Int ?? 0`;
    updated = updated.replace(headersNeedle, headersReplacement);
  }

  updated = updated.replace(
    '      generateThumbImage(asset: asset, atTime: 0, completion: { thumbnail in',
    '      generateThumbImage(asset: asset, atTime: timeMs, completion: { thumbnail in'
  );

  if (updated === original) {
    console.log('[patch-react-native-compressor] iOS already patched.');
    return;
  }

  fs.writeFileSync(iosTargetPath, updated, 'utf8');
  console.log('[patch-react-native-compressor] iOS patch applied.');
}

function patchDts() {
  if (!fs.existsSync(dtsTargetPath)) {
    console.log('[patch-react-native-compressor] DTS target not found, skipping.');
    return;
  }

  const original = fs.readFileSync(dtsTargetPath, 'utf8');
  const needle = `type createVideoThumbnailType = (fileUrl: string, options?: {\n    headers?: {\n        [key: string]: string;\n    };\n}) => Promise<{`;
  const replacement = `type createVideoThumbnailType = (fileUrl: string, options?: {\n    headers?: {\n        [key: string]: string;\n    };\n    cacheName?: string;\n    time?: number;\n}) => Promise<{`;

  if (original.includes(replacement)) {
    console.log('[patch-react-native-compressor] DTS already patched.');
    return;
  }

  if (!original.includes(needle)) {
    console.log('[patch-react-native-compressor] DTS pattern not found, skipping.');
    return;
  }

  const updated = original.replace(needle, replacement);
  fs.writeFileSync(dtsTargetPath, updated, 'utf8');
  console.log('[patch-react-native-compressor] DTS patch applied.');
}

patchAndroid();
patchIos();
patchDts();
