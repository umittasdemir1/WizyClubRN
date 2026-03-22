const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DEFAULTS_FILE = path.join(__dirname, '../mobile/src/core/constants/theme-colors.defaults.json');
const CONFIG_FILE = path.join(__dirname, '../mobile/src/core/constants/theme-colors.config.json');

const C = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    underline: '\x1b[4m',
    reset: '\x1b[0m',
};

function fatal(message) {
    console.error(`${C.red}${message}${C.reset}`);
    process.exit(1);
}

function readJson(filePath) {
    if (!fs.existsSync(filePath)) {
        fatal(`Hata: Dosya bulunamadı -> ${filePath}`);
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        fatal(`Hata: JSON okunamadı -> ${filePath}\n${error.message}`);
    }
}

function writeConfig(config) {
    fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function normalizeHex(value) {
    if (!value.startsWith('#')) return value;
    return `#${value.slice(1).toUpperCase()}`;
}

function isValidColor(value) {
    const hex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    const rgb = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
    const rgba = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/;

    return hex.test(value) || rgb.test(value) || rgba.test(value);
}

function loadThemeData() {
    const defaults = readJson(DEFAULTS_FILE);
    const config = readJson(CONFIG_FILE);

    const sanitized = {};
    let changed = false;

    for (const key of Object.keys(defaults)) {
        const defaultEntry = defaults[key];
        const current = config[key] || {};

        const light = typeof current.light === 'string' ? current.light : defaultEntry.light;
        const dark = typeof current.dark === 'string' ? current.dark : defaultEntry.dark;

        if (!config[key] || light !== current.light || dark !== current.dark) {
            changed = true;
        }

        sanitized[key] = { light, dark };
    }

    if (changed) {
        writeConfig(sanitized);
    }

    return { defaults, config: sanitized };
}

function valueChanged(key, config, defaults) {
    return (
        config[key].light !== defaults[key].light ||
        config[key].dark !== defaults[key].dark
    );
}

function truncate(value, max = 18) {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
}

function cleanup(rl) {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
    rl.close();
}

function askQuestion(rl, prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => resolve(answer));
    });
}

async function promptColorInput(rl, key, mode, currentValue) {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }

    const answer = await askQuestion(
        rl,
        `\n${key}.${mode} yeni değer (şu an: ${currentValue})\n` +
            'Format: #HEX | rgb(...) | rgba(...)\n' +
            'Boş bırak = iptal\n> '
    );

    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    const value = answer.trim();
    if (!value) {
        return { cancelled: true };
    }

    if (!isValidColor(value)) {
        return { error: 'Geçersiz renk formatı. #HEX, rgb(...) veya rgba(...) girin.' };
    }

    return { value: normalizeHex(value) };
}

function drawThemeMenu(keys, index, defaults, config, message) {
    process.stdout.write('\x1Bc');

    console.log(`${C.blue}${C.underline}${C.bold}WIZYCLUB - TEMA YÖNETİM PANELİ${C.reset}\n`);
    console.log(`${C.cyan}↑/↓: Gezin | L: Light düzenle | D: Dark düzenle | Enter/Space: Light+Dark düzenle${C.reset}`);
    console.log(`${C.cyan}R: Varsayılana sıfırla (seçili) | A: Tümünü sıfırla | Q: Çık${C.reset}`);
    console.log('------------------------------------------------------------------------------------------');

    keys.forEach((key, i) => {
        const item = defaults[key];
        const current = config[key];
        const cursor = i === index ? `${C.yellow}${C.bold}>${C.reset}` : ' ';
        const state = valueChanged(key, config, defaults)
            ? `${C.yellow}${C.bold}[ÖZEL]${C.reset}`
            : `${C.green}${C.bold}[VARSAYILAN]${C.reset}`;

        const title = `${key} (${item.label})`;
        const line = `${cursor} ${title.padEnd(36)} L:${truncate(current.light).padEnd(19)} D:${truncate(current.dark).padEnd(24)} ${state}`;
        console.log(line);
    });

    const selectedKey = keys[index];
    const selectedMeta = defaults[selectedKey];
    const selectedValue = config[selectedKey];

    console.log('------------------------------------------------------------------------------------------');
    console.log(`${C.bold}Seçili Tema:${C.reset} ${selectedKey} - ${selectedMeta.label}`);
    console.log(`${C.bold}Mevcut:${C.reset} light=${selectedValue.light} | dark=${selectedValue.dark}`);
    console.log(`${C.bold}Varsayılan:${C.reset} light=${selectedMeta.light} | dark=${selectedMeta.dark}`);
    console.log(`${C.bold}Kullanım Yerleri:${C.reset}`);

    (selectedMeta.usage || []).forEach((place) => {
        console.log(` - ${place}`);
    });

    console.log('------------------------------------------------------------------------------------------');
    console.log(`[R] Varsayılana Sıfırla  [A] Tümünü Varsayılana Sıfırla`);

    if (message) {
        console.log(`\n${message}`);
    }
}

async function showThemeMenu() {
    const { defaults, config } = loadThemeData();
    const keys = Object.keys(defaults);

    if (!keys.length) {
        fatal('Tema anahtarı bulunamadı. defaults dosyası boş görünüyor.');
    }

    let index = 0;
    let message = '';
    let busy = false;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    drawThemeMenu(keys, index, defaults, config, message);

    process.stdin.on('keypress', async (_, key) => {
        if (!key) return;
        if (busy) return;
        busy = true;

        try {
            if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
                cleanup(rl);
                console.log(`\n${C.green}Tema değişiklikleri kaydedildi.${C.reset}`);
                process.exit(0);
            }

            if (key.name === 'up') {
                index = (index - 1 + keys.length) % keys.length;
                message = '';
            } else if (key.name === 'down') {
                index = (index + 1) % keys.length;
                message = '';
            } else if (key.name === 'r') {
                const currentKey = keys[index];
                config[currentKey] = {
                    light: defaults[currentKey].light,
                    dark: defaults[currentKey].dark,
                };
                writeConfig(config);
                message = `${C.green}${currentKey} varsayılana sıfırlandı.${C.reset}`;
            } else if (key.name === 'a') {
                for (const colorKey of keys) {
                    config[colorKey] = {
                        light: defaults[colorKey].light,
                        dark: defaults[colorKey].dark,
                    };
                }
                writeConfig(config);
                message = `${C.green}Tüm tema renkleri varsayılana sıfırlandı.${C.reset}`;
            } else if (key.name === 'l') {
                const currentKey = keys[index];
                const result = await promptColorInput(rl, currentKey, 'light', config[currentKey].light);
                if (result.cancelled) {
                    message = `${C.yellow}İşlem iptal edildi.${C.reset}`;
                } else if (result.error) {
                    message = `${C.red}${result.error}${C.reset}`;
                } else {
                    config[currentKey].light = result.value;
                    writeConfig(config);
                    message = `${C.green}${currentKey}.light güncellendi -> ${result.value}${C.reset}`;
                }
            } else if (key.name === 'd') {
                const currentKey = keys[index];
                const result = await promptColorInput(rl, currentKey, 'dark', config[currentKey].dark);
                if (result.cancelled) {
                    message = `${C.yellow}İşlem iptal edildi.${C.reset}`;
                } else if (result.error) {
                    message = `${C.red}${result.error}${C.reset}`;
                } else {
                    config[currentKey].dark = result.value;
                    writeConfig(config);
                    message = `${C.green}${currentKey}.dark güncellendi -> ${result.value}${C.reset}`;
                }
            } else if (key.name === 'space' || key.name === 'return') {
                const currentKey = keys[index];

                const lightResult = await promptColorInput(rl, currentKey, 'light', config[currentKey].light);
                if (!lightResult.cancelled && !lightResult.error) {
                    config[currentKey].light = lightResult.value;
                }

                if (lightResult.error) {
                    message = `${C.red}${lightResult.error}${C.reset}`;
                } else {
                    const darkResult = await promptColorInput(rl, currentKey, 'dark', config[currentKey].dark);
                    if (!darkResult.cancelled && !darkResult.error) {
                        config[currentKey].dark = darkResult.value;
                    }

                    if (darkResult.error) {
                        message = `${C.red}${darkResult.error}${C.reset}`;
                    } else {
                        writeConfig(config);
                        message = `${C.green}${currentKey} için light/dark güncellemesi kaydedildi.${C.reset}`;
                    }
                }
            }
        } finally {
            busy = false;
            drawThemeMenu(keys, index, defaults, config, message);
        }
    });
}

function runListCommand() {
    const { defaults, config } = loadThemeData();
    const keys = Object.keys(defaults);

    console.log(`${C.blue}${C.bold}WIZYCLUB TEMA LİSTESİ${C.reset}`);
    console.log('');

    keys.forEach((key) => {
        const meta = defaults[key];
        const current = config[key];
        const changed = valueChanged(key, config, defaults) ? 'ÖZEL' : 'VARSAYILAN';

        console.log(`${key} (${meta.label})`);
        console.log(`  light: ${current.light}`);
        console.log(`  dark : ${current.dark}`);
        console.log(`  durum: ${changed}`);
        (meta.usage || []).forEach((place) => console.log(`  - ${place}`));
        console.log('');
    });
}

function resetKey(key) {
    const { defaults, config } = loadThemeData();
    if (!defaults[key]) {
        fatal(`Hata: '${key}' adında tema anahtarı yok.`);
    }

    config[key] = {
        light: defaults[key].light,
        dark: defaults[key].dark,
    };

    writeConfig(config);
    console.log(`${C.green}${key} varsayılana sıfırlandı.${C.reset}`);
}

function resetAll() {
    const { defaults, config } = loadThemeData();
    for (const key of Object.keys(defaults)) {
        config[key] = {
            light: defaults[key].light,
            dark: defaults[key].dark,
        };
    }

    writeConfig(config);
    console.log(`${C.green}Tüm tema renkleri varsayılana sıfırlandı.${C.reset}`);
}

const args = process.argv.slice(2);

if (args[0] === 'list') {
    runListCommand();
} else if (args[0] === 'reset' && args[1]) {
    resetKey(args[1]);
} else if (args[0] === 'reset') {
    resetAll();
} else {
    showThemeMenu();
}
