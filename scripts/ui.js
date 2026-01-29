const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * WizyClub UI & Logic Katman Yönetim Aracı
 * 
 * Bu araç, mobil uygulama içerisindeki özellikleri (bayrakları) 
 * terminal üzerinden kolayca açıp kapatmanızı sağlar.
 */

// Yapılandırma dosyasının yolu (useFeedConfig.ts)
const CONFIG_FILE = path.join(__dirname, '../mobile/src/presentation/components/feed/hooks/useFeedConfig.ts');

// Terminal renkleri
const C = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
};

// Özellik açıklamaları (Menüde görünecek olanlar)
const FLAG_DESCRIPTIONS = {
    // --- ÇEKİRDEK MANTIK (Asla Master Switch'ten etkilenmez) ---
    DISABLE_SCROLL_HANDLING: '[CORE] Kaydırma ve Video Değişimi',
    DISABLE_INTERACTION_HANDLING: '[CORE] Global Dokunma Mantığı',

    // --- GENEL ANAHTARLAR ---
    DISABLE_ALL_UI: '[MASTER] Tüm Arayüzü Kapat (Tertemiz Ekran)',
    DISABLE_ACTIVE_VIDEO_OVERLAY: '[MASTER] Video Üstü Katman (Tümü)',

    // --- PARÇALI (GRANÜLER) KONTROLLER ---
    DISABLE_AVATAR: '[PARÇA] Profil Resmi (Avatar)',
    DISABLE_FULL_NAME: '[PARÇA] Kullanıcı Adı / Başlık',
    DISABLE_USERNAME: '[PARÇA] Kullanıcı Etiketi (@handle)',
    DISABLE_DESCRIPTION: '[PARÇA] Video Açıklaması / Metni',
    DISABLE_SEEKBAR: '[PARÇA] Video İlerleme Çubuğu (SeekBar)',
    DISABLE_ACTION_BUTTONS: '[PARÇA] Sağ Butonlar (Beğen, Kaydet vb.)',
    DISABLE_COMMERCIAL_TAG: '[PARÇA] Ticari İş Birliği Etiketi',

    // --- GLOBAL KATMANLAR ---
    DISABLE_HEADER_OVERLAY: '[KATMAN] Tepe Menü (Header)',
    DISABLE_STORY_BAR: '[KATMAN] Hikaye Çubuğu (Stories)',
    DISABLE_SHEETS: '[KATMAN] Alt Pencereler (Sheets)',
    DISABLE_MODALS: '[KATMAN] Onay Kutuları (Modals)',
    DISABLE_TOASTS: '[KATMAN] Bildirimler (Toasts)',

    // --- ESKİ / TEST ---
    DISABLE_FEED_UI_FOR_TEST: '[TEST] Saf Video Modu (Legacy)'
};

/**
 * Mevcut bayrakları dosyadan okur
 */
function readFlags() {
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(`${C.red}Hata: Dosya bulunamadı!${C.reset}`);
        process.exit(1);
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const match = content.match(/export const FEED_FLAGS = \{([\s\S]*?)\} as const;/);
    if (!match) return [];

    return match[1].split('\n')
        .map(line => line.match(/^\s*(\w+):\s*(true|false),/))
        .filter(Boolean)
        .map(m => ({
            key: m[1],
            isActive: m[2] === 'true',
            label: FLAG_DESCRIPTIONS[m[1]] || m[1]
        }));
}

/**
 * Belirli bir bayrağı dosyada günceller
 */
function writeFlag(key, value) {
    let content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const regex = new RegExp(`(${key}:\\s*)(true|false)`, 'g');
    content = content.replace(regex, `$1${value}`);
    fs.writeFileSync(CONFIG_FILE, content, 'utf8');
}

/**
 * Akıllı İnteraktif Menü
 */
function showMenu() {
    const flags = readFlags();
    let index = 0;

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    function draw() {
        process.stdout.write('\x1Bc'); // Ekranı temizle
        console.log(`${C.blue}${C.underline}${C.bold}WIZYCLUB - ARAYÜZ YÖNETİM PANELİ${C.reset}\n`);
        console.log(`${C.cyan}Yön Tuşları: Gezin | Boşluk/Enter: Aç/Kapat | Q: Çık${C.reset}`);
        console.log('-----------------------------------------------------------');

        flags.forEach((f, i) => {
            const cursor = i === index ? `${C.yellow}${C.bold} > ${C.reset}` : '   ';
            const status = f.isActive
                ? `${C.red}${C.bold}[KAPALI]${C.reset}`
                : `${C.green}${C.bold}[AÇIK]${C.reset}`;

            console.log(`${cursor}${f.label.padEnd(45)} ${status}`);
        });

        console.log('-----------------------------------------------------------');
        console.log(`${C.yellow}Not: [CORE] bayrakları Master Switch'ten etkilenmez.${C.reset}`);
    }

    draw();

    process.stdin.on('keypress', (s, key) => {
        if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
            process.stdin.setRawMode(false);
            rl.close();
            console.log(`\n${C.green}Değişiklikler kaydedildi. İyi çalışmalar! 🚀${C.reset}`);
            process.exit(0);
        }
        if (key.name === 'up') index = (index - 1 + flags.length) % flags.length;
        if (key.name === 'down') index = (index + 1) % flags.length;
        if (key.name === 'space' || key.name === 'return') {
            flags[index].isActive = !flags[index].isActive;
            writeFlag(flags[index].key, flags[index].isActive);
        }
        draw();
    });
}

// Komut satırı argümanlarını kontrol et
const args = process.argv.slice(2);
if (args.length === 0) {
    showMenu();
} else if (args[0] === 'hepsini-ac' || args[0] === 'on') {
    readFlags().forEach(f => writeFlag(f.key, false));
    console.log(`${C.green}Tüm özellikler aktif edildi.${C.reset}`);
} else if (args[0] === 'hepsini-kapat' || args[0] === 'off') {
    writeFlag('DISABLE_ALL_UI', true);
    console.log(`${C.red}Tüm görsel arayüz kapatıldı.${C.reset}`);
} else {
    console.log(`Kullanım:\n  ui           : Menüyü açar\n  ui on        : Her şeyi açar\n  ui off       : Her şeyi kapatır`);
}
