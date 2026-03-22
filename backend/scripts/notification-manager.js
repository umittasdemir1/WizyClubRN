const path = require('path');
const readline = require('readline');

const envCandidates = [
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
];

for (const envPath of envCandidates) {
    if (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL) break;
    require('dotenv').config({ path: envPath });
}

const { createClient } = require('@supabase/supabase-js');

const C = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    reset: '\x1b[0m',
};

const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;
const DATE_TIME_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/;
const SHIFT_TAB_SEQUENCE = '\u001b[Z';
const MESSAGE_LIMITS = {
    payloadBytes: 4096,
    recommendedTitleChars: 60,
    recommendedBodyChars: 160,
    expoRatePerSecond: 600,
};
const WORLD_CLOCKS = [
    { label: 'Istanbul', timeZone: 'Europe/Istanbul' },
    { label: 'New York', timeZone: 'America/New_York' },
    { label: 'Tokyo', timeZone: 'Asia/Tokyo' },
    { label: 'Berlin', timeZone: 'Europe/Berlin' },
    { label: 'Moscow', timeZone: 'Europe/Moscow' },
    { label: 'Paris', timeZone: 'Europe/Paris' },
    { label: 'Los Angeles', timeZone: 'America/Los_Angeles' },
];

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

function tryExtractJwtRole(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        return typeof payload?.role === 'string' ? payload.role : null;
    } catch {
        return null;
    }
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(`${C.red}HATA: SUPABASE_URL ve service-role key (SUPABASE_SERVICE_ROLE_KEY veya SUPABASE_KEY) bulunamadi.${C.reset}`);
    process.exit(1);
}

const detectedRole = tryExtractJwtRole(SUPABASE_KEY);
if (detectedRole && detectedRole !== 'service_role') {
    console.error(`${C.red}HATA: Bildirim paneli service-role key ile calismalidir. Mevcut key role: ${detectedRole}.${C.reset}`);
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

class NavigationSignal extends Error {
    constructor(action) {
        super(action);
        this.name = 'NavigationSignal';
        this.action = action;
    }
}

function askQuestion(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

function isNavigationSignal(error, action) {
    return error instanceof NavigationSignal && (!action || error.action === action);
}

function isExitShortcut(value) {
    const normalized = value.trim().toLowerCase();
    return normalized === 'q' || normalized === 'quit' || normalized === 'exit';
}

function isBackShortcut(value) {
    const normalized = value.trim().toLowerCase();
    return value === SHIFT_TAB_SEQUENCE || normalized === 'b' || normalized === 'back' || normalized === 'geri' || normalized === 'shift+tab';
}

function getPromptShortcuts({ allowBack = false, allowEmpty = false } = {}) {
    const parts = ['Q: Cikis'];
    if (allowBack) parts.push('B: Geri');
    if (allowEmpty) parts.push('ENTER: Devam');
    return `${C.dim}[${parts.join(' | ')}]${C.reset}`;
}

async function askInput(label, options = {}) {
    const {
        allowBack = false,
        allowEmpty = false,
        required = true,
    } = options;

    while (true) {
        const answer = await askQuestion(`${C.yellow}${label} ${getPromptShortcuts({ allowBack, allowEmpty })}: ${C.reset}`);

        if (isExitShortcut(answer)) {
            throw new NavigationSignal('exit');
        }

        if (allowBack && isBackShortcut(answer)) {
            throw new NavigationSignal('back');
        }

        const trimmed = answer.trim();
        if (!trimmed) {
            if (allowEmpty || !required) return '';
            console.log(`${C.red}Bu alan bos gecilemez.${C.reset}`);
            continue;
        }

        return trimmed;
    }
}

function pad2(value) {
    return String(value).padStart(2, '0');
}

function toTurkeyDate(dateLike) {
    const date = new Date(dateLike);
    const shifted = new Date(date.getTime() + TURKEY_OFFSET_MS);

    return {
        day: pad2(shifted.getUTCDate()),
        month: pad2(shifted.getUTCMonth() + 1),
        year: shifted.getUTCFullYear(),
        hour: pad2(shifted.getUTCHours()),
        minute: pad2(shifted.getUTCMinutes()),
    };
}

function formatTurkeyDateTime(dateLike) {
    const parts = toTurkeyDate(dateLike);
    return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

function formatUtcDateTime(dateLike) {
    const date = new Date(dateLike);
    return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function formatWorldClock(timeZone) {
    try {
        return new Intl.DateTimeFormat('tr-TR', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(new Date());
    } catch {
        return '--:--:--';
    }
}

function parseTurkeyDateTime(input) {
    const trimmed = input.trim();
    const match = trimmed.match(DATE_TIME_PATTERN);

    if (!match) return null;

    const [, dayText, monthText, yearText, hourText, minuteText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;

    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 3, minute));
    if (Number.isNaN(utcDate.getTime())) return null;

    const normalized = `${dayText}.${monthText}.${yearText} ${hourText}:${minuteText}`;
    if (formatTurkeyDateTime(utcDate) !== normalized) {
        return null;
    }

    return utcDate.toISOString();
}

function drawLine() {
    console.log(`${C.magenta}${'-'.repeat(72)}${C.reset}`);
}

function drawWorldClocks() {
    console.log(`${C.bold}Dunya Saatleri${C.reset}`);

    for (let index = 0; index < WORLD_CLOCKS.length; index += 2) {
        const pair = WORLD_CLOCKS.slice(index, index + 2).map((entry) => {
            const time = formatWorldClock(entry.timeZone);
            const paddedLabel = entry.label.padEnd(11, ' ');
            return `${C.cyan}${paddedLabel}${C.reset} ${C.magenta}${time}${C.reset}`;
        });

        console.log(`  ${pair.join('   ')}`);
    }
}

function drawHeader() {
    console.clear();
    drawLine();
    console.log(`${C.cyan}${C.bold}WIZYCLUB NOTIFICATION CONTROL PANEL${C.reset}`);
    console.log(`${C.dim}Queue tabanli push ve in-app bildirim yonetimi${C.reset}`);
    drawLine();
    drawWorldClocks();
    drawLine();
    console.log(`${C.dim}Kisayollar: Q = Cikis | B = Geri (desteklenen ekranlarda)${C.reset}`);
    console.log('');
}

async function fetchDashboardStats() {
    const now = new Date().toISOString();

    const [
        pendingResult,
        dueResult,
        profileCountResult,
        pushReadyResult,
    ] = await Promise.all([
        supabase.from('notification_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('notification_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending').lte('scheduled_at', now),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).not('expo_push_token', 'is', null),
    ]);

    const errors = [
        pendingResult.error,
        dueResult.error,
        profileCountResult.error,
        pushReadyResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
        throw new Error(errors.map((error) => error.message).join(' | '));
    }

    return {
        pending: pendingResult.count ?? 0,
        dueNow: dueResult.count ?? 0,
        totalProfiles: profileCountResult.count ?? 0,
        pushReady: pushReadyResult.count ?? 0,
    };
}

function printDashboard(stats) {
    console.log(`${C.bold}Sistem Durumu${C.reset}`);
    console.log(`  Pending Queue : ${C.yellow}${stats.pending}${C.reset}`);
    console.log(`  Due Now       : ${C.yellow}${stats.dueNow}${C.reset}`);
    console.log(`  Profiles      : ${C.cyan}${stats.totalProfiles}${C.reset}`);
    console.log(`  Push Ready    : ${C.green}${stats.pushReady}${C.reset}`);
    console.log(`  TR Tarih      : ${C.magenta}${formatTurkeyDateTime(new Date())}${C.reset}`);
    console.log('');
}

async function askRequired(label, options = {}) {
    return askInput(label, { ...options, required: true });
}

function normalizeSearchTerm(value) {
    return value
        .trim()
        .replace(/^@+/, '')
        .replace(/[%(),]/g, '')
        .replace(/\s+/g, ' ');
}

function formatUserSummary(profile) {
    const username = profile.username ? `@${profile.username}` : '@kullanici';
    const fullName = profile.full_name ? ` (${profile.full_name})` : '';
    const pushState = profile.expo_push_token ? `${C.green}push hazir${C.reset}` : `${C.yellow}push yok${C.reset}`;
    return `${C.cyan}${username}${C.reset}${fullName}  ${pushState}`;
}

function getCharacterCount(value) {
    return Array.from(value).length;
}

function getUtf8ByteCount(value) {
    return Buffer.byteLength(value, 'utf8');
}

function estimateNotificationPayloadBytes(title, body) {
    return Buffer.byteLength(
        JSON.stringify({
            title,
            body,
            sound: 'default',
        }),
        'utf8',
    );
}

function printNotificationGuardrails() {
    console.log(`${C.bold}Teslimat Notlari${C.reset}`);
    console.log(`  Payload      : ${C.cyan}Toplam push payload en fazla ${MESSAGE_LIMITS.payloadBytes} byte${C.reset}`);
    console.log(`  Rate Limit   : ${C.cyan}Expo proje limiti ${MESSAGE_LIMITS.expoRatePerSecond} bildirim/sn${C.reset}`);
    console.log(`  UI Onerisi   : ${C.cyan}Baslik <= ${MESSAGE_LIMITS.recommendedTitleChars}, icerik <= ${MESSAGE_LIMITS.recommendedBodyChars} karakter${C.reset}`);
    console.log(`  Not          : ${C.dim}iOS ve Android uzun metni cihaza gore kirpabilir.${C.reset}`);
    console.log('');
}

function printTextMetrics(label, value, recommendedChars) {
    const charCount = getCharacterCount(value);
    const byteCount = getUtf8ByteCount(value);
    const counterColor = charCount > recommendedChars ? C.yellow : C.green;

    console.log(`  ${label} Sayaci : ${counterColor}${charCount}${C.reset}/${recommendedChars} karakter  |  ${C.cyan}${byteCount}${C.reset} byte`);

    if (charCount > recommendedChars) {
        console.log(`  ${C.yellow}Uyari: ${label} onerilen gorunum sinirini asti; cihaz arayuzu kirpabilir.${C.reset}`);
    }
}

async function askMessageField(label, options = {}) {
    const {
        allowBack = false,
        recommendedChars = MESSAGE_LIMITS.recommendedBodyChars,
    } = options;

    const value = await askRequired(label, { allowBack });
    printTextMetrics(label, value, recommendedChars);
    return value;
}

async function searchProfiles(term) {
    const query = normalizeSearchTerm(term);
    if (!query) return [];

    const pattern = `%${query}%`;
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, expo_push_token')
        .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
        .order('username', { ascending: true })
        .limit(8);

    if (error) throw error;
    return data ?? [];
}

async function askProfileSelection(label, options = {}) {
    const { allowAll = false } = options;

    while (true) {
        console.log(`${C.bold}${label}${C.reset}`);
        console.log(`${C.dim}Kullanici adi veya isim yazin. Ornek: eda / @eda.tasdemir${C.reset}`);
        if (allowAll) {
            console.log(`${C.dim}Hizli kisayol: A veya 0 = tum kullanicilar${C.reset}`);
        }
        console.log(`${C.dim}B = geri | Q = cikis${C.reset}`);

        const searchTerm = await askRequired('Arama', { allowBack: true });
        if (allowAll && (searchTerm === '0' || searchTerm.toLowerCase() === 'a' || searchTerm.toLowerCase() === 'all')) {
            return { scope: 'all' };
        }
        const matches = await searchProfiles(searchTerm);

        if (!matches.length) {
            console.log(`${C.red}Eslesen kullanici bulunamadi. Farkli bir arama deneyin.${C.reset}\n`);
            continue;
        }

        console.log('');
        console.log(`${C.bold}Eslesen Kullanici Listesi${C.reset}`);
        if (allowAll) {
            console.log(`  ${C.blue}0${C.reset}  ${C.cyan}Tum kullanicilar${C.reset}`);
        }
        matches.forEach((profile, index) => {
            console.log(`  ${C.cyan}${index + 1}${C.reset}  ${formatUserSummary(profile)}`);
        });
        console.log('');
        console.log(`${C.bold}Hizli Eylemler${C.reset}`);
        console.log(`  ${C.red}Y${C.reset}  Yeni arama yap`);
        if (allowAll) {
            console.log(`  ${C.blue}A${C.reset}  Tum kullanicilara gonder`);
        }
        console.log(`  ${C.yellow}B${C.reset}  Geri`);
        console.log(`  ${C.red}Q${C.reset}  Cikis`);
        console.log('');

        while (true) {
            const answer = (await askInput('Secim', { allowBack: true })).trim().toLowerCase();

            if (answer === 'y') {
                console.log('');
                break;
            }

            if (allowAll && (answer === '0' || answer === 'a' || answer === 'all')) {
                return { scope: 'all' };
            }

            const selectedIndex = Number(answer);
            if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= matches.length) {
                return matches[selectedIndex - 1];
            }

            console.log(`${C.red}Listeden bir numara secin, Y ile yeni arama yapin${allowAll ? ', A ile herkese gonderin' : ''}.${C.reset}`);
        }
    }
}

async function askScheduledAt() {
    while (true) {
        console.log(`${C.bold}Gonderim Zamani${C.reset}`);
        console.log(`  Simdi gondermek icin ${C.cyan}ENTER${C.reset}`);
        console.log(`  Planlamak icin ${C.cyan}GG.AA.YYYY HH:MM${C.reset}`);
        console.log(`  Ornek: ${C.cyan}05.03.2026 21:30${C.reset}`);

        const trimmed = await askInput('Zaman', { allowBack: true, allowEmpty: true });

        if (!trimmed) {
            return new Date().toISOString();
        }

        const parsed = parseTurkeyDateTime(trimmed);
        if (!parsed) {
            console.log(`${C.red}Gecersiz format. Lutfen GG.AA.YYYY HH:MM formatini kullanin.${C.reset}\n`);
            continue;
        }

        return parsed;
    }
}

async function askConfirmation(lines) {
    console.log('');
    drawLine();
    console.log(`${C.bold}Onay Ozeti${C.reset}`);
    lines.forEach((line) => console.log(`  ${line}`));
    drawLine();

    while (true) {
        const answer = (await askInput('Onayliyor musunuz? (E/H)', { allowBack: true })).trim().toLowerCase();
        if (answer === 'e' || answer === 'evet') return true;
        if (answer === 'h' || answer === 'hayir') return false;
        console.log(`${C.red}Lutfen E veya H girin.${C.reset}`);
    }
}

async function waitForEnter() {
    await askInput('\nMenuye donmek icin ENTER', { allowEmpty: true, required: false });
}

async function handleSendToAll() {
    try {
        drawHeader();
        console.log(`${C.bold}Toplu Kampanya Bildirimi${C.reset}\n`);
        printNotificationGuardrails();

        const title = await askMessageField('Baslik', {
            allowBack: true,
            recommendedChars: MESSAGE_LIMITS.recommendedTitleChars,
        });
        const body = await askMessageField('Icerik', {
            allowBack: true,
            recommendedChars: MESSAGE_LIMITS.recommendedBodyChars,
        });
        const scheduledAt = await askScheduledAt();
        const payloadBytes = estimateNotificationPayloadBytes(title, body);

        if (payloadBytes > MESSAGE_LIMITS.payloadBytes) {
            console.log(`\n${C.red}Mesaj payload tahmini ${payloadBytes} byte. Teknik limit ${MESSAGE_LIMITS.payloadBytes} byte oldugu icin metni kisaltin.${C.reset}`);
            await waitForEnter();
            return;
        }

        const confirmed = await askConfirmation([
            `Tip         : ${C.cyan}Toplu Push + In-App${C.reset}`,
            `Hedef       : ${C.cyan}Tum kullanicilar${C.reset}`,
            `Baslik      : ${C.cyan}${title}${C.reset}`,
            `Icerik      : ${C.cyan}${body}${C.reset}`,
            `Payload     : ${C.cyan}${payloadBytes}${C.reset}/${MESSAGE_LIMITS.payloadBytes} byte`,
            `TR Zaman    : ${C.magenta}${formatTurkeyDateTime(scheduledAt)}${C.reset}`,
            `UTC Zaman   : ${C.magenta}${formatUtcDateTime(scheduledAt)}${C.reset}`,
        ]);

        if (!confirmed) {
            console.log(`\n${C.yellow}Islem iptal edildi.${C.reset}`);
            await waitForEnter();
            return;
        }

        const { error } = await supabase
            .from('notification_queue')
            .insert({
                title,
                body,
                scheduled_at: scheduledAt,
                status: 'pending',
            });

        if (error) throw error;

        console.log(`\n${C.green}${C.bold}Basarili:${C.reset} Bildirim queue'ya eklendi.`);
        console.log(`  TR Zaman  : ${C.magenta}${formatTurkeyDateTime(scheduledAt)}${C.reset}`);
        console.log(`  UTC Zaman : ${C.magenta}${formatUtcDateTime(scheduledAt)}${C.reset}`);
    } catch (error) {
        if (isNavigationSignal(error, 'back')) {
            console.log(`\n${C.yellow}Bir onceki ekrana donuldu.${C.reset}`);
            await waitForEnter();
            return;
        }
        if (isNavigationSignal(error, 'exit')) {
            throw error;
        }
        console.error(`\n${C.red}Hata: ${error.message}${C.reset}`);
    }

    await waitForEnter();
}

async function handleSendToUser() {
    try {
        drawHeader();
        console.log(`${C.bold}Tekil Kullanici Bildirimi${C.reset}\n`);
        printNotificationGuardrails();

        const target = await askProfileSelection('Hedef Kullanici Secimi', { allowAll: true });
        const isAllTarget = target && target.scope === 'all';
        const title = await askMessageField('Baslik', {
            allowBack: true,
            recommendedChars: MESSAGE_LIMITS.recommendedTitleChars,
        });
        const body = await askMessageField('Icerik', {
            allowBack: true,
            recommendedChars: MESSAGE_LIMITS.recommendedBodyChars,
        });
        const scheduledAt = await askScheduledAt();
        const payloadBytes = estimateNotificationPayloadBytes(title, body);

        if (payloadBytes > MESSAGE_LIMITS.payloadBytes) {
            console.log(`\n${C.red}Mesaj payload tahmini ${payloadBytes} byte. Teknik limit ${MESSAGE_LIMITS.payloadBytes} byte oldugu icin metni kisaltin.${C.reset}`);
            await waitForEnter();
            return;
        }

        const confirmed = await askConfirmation([
            `Tip         : ${C.cyan}${isAllTarget ? 'Toplu Push + In-App' : 'Tekil Push + In-App'}${C.reset}`,
            `Hedef       : ${isAllTarget ? `${C.cyan}Tum kullanicilar${C.reset}` : formatUserSummary(target)}`,
            `Baslik      : ${C.cyan}${title}${C.reset}`,
            `Icerik      : ${C.cyan}${body}${C.reset}`,
            `Payload     : ${C.cyan}${payloadBytes}${C.reset}/${MESSAGE_LIMITS.payloadBytes} byte`,
            `TR Zaman    : ${C.magenta}${formatTurkeyDateTime(scheduledAt)}${C.reset}`,
            `UTC Zaman   : ${C.magenta}${formatUtcDateTime(scheduledAt)}${C.reset}`,
        ]);

        if (!confirmed) {
            console.log(`\n${C.yellow}Islem iptal edildi.${C.reset}`);
            await waitForEnter();
            return;
        }

        const { error } = await supabase
            .from('notification_queue')
            .insert(isAllTarget
                ? {
                    title,
                    body,
                    scheduled_at: scheduledAt,
                    status: 'pending',
                }
                : {
                    user_id: target.id,
                    title,
                    body,
                    scheduled_at: scheduledAt,
                    status: 'pending',
                });

        if (error) throw error;

        console.log(`\n${C.green}${C.bold}Basarili:${C.reset} Bildirim queue'ya eklendi.`);
        console.log(`  Hedef      : ${isAllTarget ? `${C.cyan}Tum kullanicilar${C.reset}` : formatUserSummary(target)}`);
        console.log(`  TR Zaman   : ${C.magenta}${formatTurkeyDateTime(scheduledAt)}${C.reset}`);
    } catch (error) {
        if (isNavigationSignal(error, 'back')) {
            console.log(`\n${C.yellow}Bir onceki ekrana donuldu.${C.reset}`);
            await waitForEnter();
            return;
        }
        if (isNavigationSignal(error, 'exit')) {
            throw error;
        }
        console.error(`\n${C.red}Hata: ${error.message}${C.reset}`);
    }

    await waitForEnter();
}

async function handleLocalAppTest() {
    try {
        drawHeader();
        console.log(`${C.bold}App Ici Canli Test (Realtime)${C.reset}`);
        console.log(`${C.dim}Bu mod scheduler beklemeden dogrudan notifications tablosuna yazar.${C.reset}\n`);
        printNotificationGuardrails();

        const profile = await askProfileSelection('Test Kullanici Secimi');
        const title = await askMessageField('Baslik', {
            allowBack: true,
            recommendedChars: MESSAGE_LIMITS.recommendedTitleChars,
        });
        const body = await askMessageField('Icerik', {
            allowBack: true,
            recommendedChars: MESSAGE_LIMITS.recommendedBodyChars,
        });
        const payloadBytes = estimateNotificationPayloadBytes(title, body);

        if (payloadBytes > MESSAGE_LIMITS.payloadBytes) {
            console.log(`\n${C.red}Mesaj payload tahmini ${payloadBytes} byte. Teknik limit ${MESSAGE_LIMITS.payloadBytes} byte oldugu icin metni kisaltin.${C.reset}`);
            await waitForEnter();
            return;
        }

        const confirmed = await askConfirmation([
            `Tip         : ${C.blue}Realtime In-App Test${C.reset}`,
            `Hedef       : ${formatUserSummary(profile)}`,
            `Baslik      : ${C.cyan}${title}${C.reset}`,
            `Icerik      : ${C.cyan}${body}${C.reset}`,
            `Payload     : ${C.cyan}${payloadBytes}${C.reset}/${MESSAGE_LIMITS.payloadBytes} byte`,
            `Teslimat    : ${C.blue}Anlik / Scheduler yok${C.reset}`,
        ]);

        if (!confirmed) {
            console.log(`\n${C.yellow}Islem iptal edildi.${C.reset}`);
            await waitForEnter();
            return;
        }

        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: profile.id,
                title,
                message: body,
                type: 'system',
            });

        if (error) throw error;

        console.log(`\n${C.green}${C.bold}Basarili:${C.reset} Realtime test bildirimi olusturuldu.`);
        console.log(`  Hedef      : ${formatUserSummary(profile)}`);
    } catch (error) {
        if (isNavigationSignal(error, 'back')) {
            console.log(`\n${C.yellow}Bir onceki ekrana donuldu.${C.reset}`);
            await waitForEnter();
            return;
        }
        if (isNavigationSignal(error, 'exit')) {
            throw error;
        }
        console.error(`\n${C.red}Hata: ${error.message}${C.reset}`);
    }

    await waitForEnter();
}

async function showMenu() {
    drawHeader();

    try {
        const stats = await fetchDashboardStats();
        printDashboard(stats);
    } catch (error) {
        console.log(`${C.red}Uyari: Dashboard bilgileri okunamadi (${error.message}).${C.reset}\n`);
    }

    console.log(`${C.bold}Islem Secin${C.reset}`);
    console.log(`  ${C.cyan}1${C.reset}  Toplu gonderim planla`);
    console.log(`  ${C.cyan}2${C.reset}  Kullanici secerek gonder (${C.blue}A/0${C.reset} ile herkese)`);
    console.log(`  ${C.blue}3${C.reset}  App ici anlik test (tek kullanici)`);
    console.log(`  ${C.yellow}Y${C.reset}  Paneli yenile`);
    console.log(`  ${C.red}4${C.reset}  Cikis`);
    console.log(`  ${C.red}Q${C.reset}  Her yerden guvenli cikis`);
    console.log('');

    const choice = (await askInput('Secim')).trim().toLowerCase();

    switch (choice) {
        case '1':
            await handleSendToAll();
            return false;
        case '2':
            await handleSendToUser();
            return false;
        case '3':
            await handleLocalAppTest();
            return false;
        case 'y':
            return false;
        case '4':
            return true;
        default:
            console.log(`\n${C.red}Gecersiz secim.${C.reset}`);
            await waitForEnter();
            return false;
    }
}

async function run() {
    try {
        let shouldExit = false;

        while (!shouldExit) {
            try {
                shouldExit = await showMenu();
            } catch (error) {
                if (isNavigationSignal(error, 'exit')) {
                    shouldExit = true;
                    continue;
                }

                throw error;
            }
        }

        drawHeader();
        console.log(`${C.green}${C.bold}Cikis yapildi.${C.reset}`);
    } catch (error) {
        if (error && typeof error.message === 'string' && error.message.includes('readline was closed')) {
            drawHeader();
            console.log(`${C.yellow}Girdi akisi kapandi, panel sonlandirildi.${C.reset}`);
            process.exitCode = 0;
            return;
        }
        console.error(`\n${C.red}Beklenmeyen hata: ${error.message}${C.reset}`);
        process.exitCode = 1;
    } finally {
        rl.close();
    }
}

void run();
