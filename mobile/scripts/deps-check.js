const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const outPath = path.join(repoRoot, 'DEPENDENCIES.md');
const pkg = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'package.json'), 'utf8'));
const deps = pkg.dependencies || {};
const devDeps = pkg.devDependencies || {};

const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md']);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (exts.has(path.extname(entry.name))) files.push(p);
  }
}
walk(mobileRoot);

const contentCache = new Map();
function fileHas(file, needle) {
  let text = contentCache.get(file);
  if (text === undefined) {
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      text = '';
    }
    contentCache.set(file, text);
  }
  return text.includes(needle);
}

function findUsage(pkgName) {
  const hits = [];
  for (const file of files) {
    if (fileHas(file, `'${pkgName}'`) || fileHas(file, `"${pkgName}"`)) {
      hits.push(file);
    }
  }
  return hits;
}

const purpose = {
  expo: 'Expo SDK runtime ve modüller',
  'expo-router': 'Dosya tabanlı yönlendirme',
  'expo-status-bar': 'Status bar kontrolü (edge-to-edge ile önerilmez)',
  'expo-navigation-bar': 'Android navigation bar kontrolü',
  'react-native-edge-to-edge': 'SystemBars ile edge-to-edge yönetimi',
  react: 'React çekirdeği',
  'react-native': 'React Native runtime',
  'react-native-reanimated': 'Animasyon ve gesture runtime',
  'react-native-gesture-handler': 'Gesture altyapısı',
  'react-native-screens': 'Native screen optimizasyonu',
  'react-native-safe-area-context': 'Safe area insetleri',
  'react-native-svg': 'SVG render',
  'react-native-video': 'Video oynatma',
  'react-native-vision-camera': 'Kamera erişimi',
  'react-native-mmkv': 'Hızlı key-value storage',
  'react-native-webview': 'WebView',
  'react-native-pager-view': 'Pager View',
  'react-native-toast-message': 'Toast bildirim',
  'react-native-qrcode-svg': 'QR kod render',
  'react-native-purchases': 'RevenueCat purchases',
  'react-native-compressor': 'Medya sıkıştırma',
  'react-native-controlled-mentions': 'Mention input yardımcıları',
  'react-native-color-matrix-image-filters': 'Görsel filtreleri',
  'react-native-keyboard-controller': 'Klavye yönetimi',
  'react-native-worklets': 'Worklets runtime',
  'react-native-worklets-core': 'Worklets core',
  '@expo/vector-icons': 'Expo ikon seti',
  'lucide-react-native': 'Lucide ikon seti',
  'lottie-react-native': 'Lottie animasyonları',
  moti: 'Animasyon ve skeleton',
  nativewind: 'Tailwind benzeri utility sınıfları',
  zustand: 'State yönetimi',
  '@gorhom/bottom-sheet': 'Bottom sheet UI',
  '@shopify/flash-list': 'Performanslı liste',
  '@shopify/react-native-skia': 'Skia grafik',
  '@supabase/supabase-js': 'Supabase istemcisi',
  'expo-av': 'Audio/Video API',
  'expo-image': 'Image component',
  'expo-image-picker': 'Medya seçici',
  'expo-camera': 'Kamera API',
  'expo-notifications': 'Push bildirim',
  'expo-keep-awake': 'Uyumayı engelle',
  'expo-splash-screen': 'Splash kontrolü',
  'expo-secure-store': 'Güvenli storage',
  'expo-device': 'Cihaz bilgisi',
  'expo-constants': 'Uygulama sabitleri',
  'expo-file-system': 'Dosya sistemi',
  'expo-location': 'Konum servisleri',
  'expo-linear-gradient': 'Linear gradient',
  'expo-haptics': 'Haptic feedback',
  'expo-clipboard': 'Clipboard erişimi',
  'expo-media-library': 'Medya kütüphanesi',
  'expo-font': 'Font yükleme',
  'expo-web-browser': 'In-app browser',
  'expo-local-authentication': 'Biyometrik auth',
  'expo-background-fetch': 'Background fetch',
  'expo-task-manager': 'Background task',
  'expo-sharing': 'Paylaşım',
  'expo-tracking-transparency': 'iOS tracking izni',
  'expo-apple-authentication': 'Apple Sign In',
  'expo-contacts': 'Rehber erişimi',
  'expo-screen-orientation': 'Orientation lock',
  'expo-blur': 'Blur view',
  'expo-video': 'Expo video component',
  'expo-dev-client': 'Custom dev client',
  '@react-native-firebase/app': 'Firebase çekirdek',
  '@react-native-firebase/analytics': 'Firebase Analytics',
  '@react-native-firebase/crashlytics': 'Crashlytics',
  '@react-native-firebase/messaging': 'FCM',
  '@react-native-google-signin/google-signin': 'Google Sign-In',
  '@react-native-async-storage/async-storage': 'Async storage',
  '@react-native-community/netinfo': 'Network info',
  '@react-native-community/slider': 'Slider',
  '@react-native-masked-view/masked-view': 'Masked view',
  '@qeepsake/react-native-images-collage': 'Image collage',
  'rn-emoji-keyboard': 'Emoji klavye',
  tailwindcss: 'Tailwind config (nativewind için)',
  'react-native-web': 'Web hedefi',
  'react-dom': 'React DOM (web)',
  'expo-build-properties': 'Native build config',
};

function fmtPath(p) {
  return p.replace(mobileRoot + path.sep, '');
}

function makeRows(depMap) {
  const rows = [];
  for (const [name, version] of Object.entries(depMap)) {
    const hits = findUsage(name).map(fmtPath);
    const where = hits.length > 0 ? hits.slice(0, 5).map((h) => `\`${h}\``).join(', ') : 'bulunamadı';
    const desc = purpose[name] || 'Amaç net değil';
    rows.push({ name, version, desc, where });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function table(rows) {
  const lines = [];
  lines.push('| Paket | Versiyon | Ne işe yarar | Nerede kullanılıyor |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of rows) {
    lines.push(`| ${r.name} | ${r.version} | ${r.desc} | ${r.where} |`);
  }
  return lines;
}

const md = [
  '# Paket Kullanım Raporu',
  '',
  'Bu rapor, /mobile projesindeki paketleri, amaçlarını ve nerede kullanıldıklarını listeler.',
  '',
  '## Dependencies',
  '',
  ...table(makeRows(deps)),
  '',
  '## Dev Dependencies',
  '',
  ...table(makeRows(devDeps)),
  '',
  'Notlar:',
  '- \"Nerede kullanılıyor\" alanı dosyalardaki metin eşleşmesine dayanır.',
  '- Bazı paketlerde kullanım dinamik olabilir ve listede görünmeyebilir.',
];

fs.writeFileSync(outPath, md.join('\n'));

console.log('Rapor guncellendi:', outPath);

const outdated = spawnSync('npm', ['outdated', '--json'], {
  cwd: mobileRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});

if (outdated.status === 0 && outdated.stdout) {
  const data = JSON.parse(outdated.stdout);
  const names = Object.keys(data);
  if (names.length === 0) {
    console.log('Outdated paket yok.');
  } else {
    console.log('Outdated paketler:');
    for (const name of names) {
      const item = data[name];
      console.log(`- ${name}: ${item.current} -> ${item.latest}`);
    }
  }
} else {
  console.log('npm outdated calisamadi veya bos sonuc dondu.');
}

const ls = spawnSync('npm', ['ls', '--json'], {
  cwd: mobileRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});

if (ls.stdout) {
  try {
    const data = JSON.parse(ls.stdout);
    if (data.problems && data.problems.length > 0) {
      console.log('Dependency problemleri:');
      for (const problem of data.problems) {
        console.log(`- ${problem}`);
      }
    } else {
      console.log('Dependency problemi gorunmedi.');
    }
  } catch {
    console.log('npm ls sonucu okunamadi.');
  }
}
