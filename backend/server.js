require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os'); // For temp directory in story uploads
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Set FFmpeg and FFprobe paths explicitly using static binaries
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('@ffprobe-installer/ffprobe').path;
console.log('✅ FFmpeg path:', ffmpegStatic);
console.log('✅ FFprobe path:', ffprobeStatic);
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);

// Multer: Temporary uploads
const upload = multer({ dest: 'temp_uploads/' });

console.log('4. Initializing R2 Client...');
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

console.log('5. Initializing Supabase Client...');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Swagger / OpenAPI docs (local)
const openApiPath = path.join(__dirname, 'docs', 'openapi.yaml');
const openApiSpec = yaml.load(fs.readFileSync(openApiPath, 'utf8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

const ADMIN_CONFIG_PATH = path.join(__dirname, 'admin-config.json');
let adminWss = null;
const DEFAULT_ADMIN_CONFIG = {
    version: 1,
    updatedAt: null,
    items: [
        {
            key: 'profile.settings.title.text',
            label: 'Başlık metni',
            description: 'Profil ayarlar menüsü başlığı metni',
            type: 'text',
            value: 'Ayarlar ve kişisel araçlar',
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.color',
            label: 'Renk',
            description: 'Başlık metin rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.fontSize',
            label: 'Font boyutu',
            description: 'Başlık font boyutu',
            type: 'number',
            value: 24,
            min: 12,
            max: 48,
            step: 1,
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.fontWeight',
            label: 'Font ağırlığı',
            description: 'Başlık font ağırlığı',
            type: 'select',
            value: '600',
            options: ['300', '400', '500', '600', '700', '800'],
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.fontStyle',
            label: 'Font stili',
            description: 'Başlık font stili',
            type: 'select',
            value: 'normal',
            options: ['normal', 'italic'],
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.fontFamily',
            label: 'Font ailesi',
            description: 'Başlık font ailesi (cihaza göre değişebilir)',
            type: 'select',
            value: 'system',
            options: ['system', 'sans-serif', 'serif', 'monospace'],
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.letterSpacing',
            label: 'Harf aralığı',
            description: 'Başlık harf aralığı',
            type: 'number',
            value: 0.3,
            min: -1,
            max: 6,
            step: 0.1,
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.lineHeight',
            label: 'Satır yüksekliği',
            description: 'Başlık satır yüksekliği',
            type: 'number',
            value: 28,
            min: 10,
            max: 64,
            step: 1,
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.textAlign',
            label: 'Hizalama',
            description: 'Başlık metin hizası',
            type: 'select',
            value: 'left',
            options: ['left', 'center', 'right'],
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.title.textTransform',
            label: 'Metin dönüşümü',
            description: 'Başlık metin dönüşümü',
            type: 'select',
            value: 'none',
            options: ['none', 'uppercase', 'lowercase', 'capitalize'],
            group: 'Profil > Ayarlar',
        },
        {
            key: 'profile.settings.sectionTitle.color',
            label: 'Alt başlık renk',
            description: 'Alt başlık metin rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.sectionTitle.fontSize',
            label: 'Alt başlık boyutu',
            description: 'Alt başlık font boyutu',
            type: 'number',
            value: 24,
            min: 12,
            max: 48,
            step: 1,
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.sectionTitle.fontWeight',
            label: 'Alt başlık ağırlığı',
            description: 'Alt başlık font ağırlığı',
            type: 'select',
            value: '600',
            options: ['300', '400', '500', '600', '700', '800'],
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.itemLabel.color',
            label: 'Menü metni renk',
            description: 'Ayar item metin rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.itemLabel.fontSize',
            label: 'Menü metni boyutu',
            description: 'Ayar item metin boyutu',
            type: 'number',
            value: 18,
            min: 10,
            max: 30,
            step: 1,
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.itemLabel.fontWeight',
            label: 'Menü metni ağırlığı',
            description: 'Ayar item metin ağırlığı',
            type: 'select',
            value: '400',
            options: ['300', '400', '500', '600', '700'],
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.helperText.color',
            label: 'Açıklama metni renk',
            description: 'Yardımcı metin rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.helperText.fontSize',
            label: 'Açıklama metni boyutu',
            description: 'Yardımcı metin boyutu',
            type: 'number',
            value: 14,
            min: 10,
            max: 24,
            step: 1,
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.icon.color',
            label: 'İkon rengi',
            description: 'Ayar ikon rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.icon.strokeWidth',
            label: 'İkon kalınlığı',
            description: 'Ayar ikon stroke kalınlığı',
            type: 'number',
            value: 1.2,
            min: 0.8,
            max: 2.5,
            step: 0.1,
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.icon.size',
            label: 'İkon boyutu',
            description: 'Ayar ikon boyutu',
            type: 'number',
            value: 24,
            min: 16,
            max: 32,
            step: 1,
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.icon.close.name',
            label: 'İkon - Kapat (X)',
            description: 'Lucide: X',
            type: 'text',
            value: 'X',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.close.color',
            label: 'Kapat renk',
            description: 'Kapat ikon rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.close.size',
            label: 'Kapat boyut',
            description: 'Kapat ikon boyutu',
            type: 'number',
            value: 22,
            min: 16,
            max: 32,
            step: 1,
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.close.strokeWidth',
            label: 'Kapat kalınlık',
            description: 'Kapat ikon stroke kalınlığı',
            type: 'number',
            value: 1.6,
            min: 0.8,
            max: 2.5,
            step: 0.1,
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.back.name',
            label: 'İkon - Geri',
            description: 'Lucide: ArrowLeft',
            type: 'text',
            value: 'ArrowLeft',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.back.color',
            label: 'Geri renk',
            description: 'Geri ikon rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.back.size',
            label: 'Geri boyut',
            description: 'Geri ikon boyutu',
            type: 'number',
            value: 22,
            min: 16,
            max: 32,
            step: 1,
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.back.strokeWidth',
            label: 'Geri kalınlık',
            description: 'Geri ikon stroke kalınlığı',
            type: 'number',
            value: 1.6,
            min: 0.8,
            max: 2.5,
            step: 0.1,
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.theme.name',
            label: 'İkon - Tema',
            description: 'Lucide: SunMoon',
            type: 'text',
            value: 'SunMoon',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.actions.name',
            label: 'İkon - Hareketler',
            description: 'Lucide: SquareActivity',
            type: 'text',
            value: 'SquareActivity',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.likes.name',
            label: 'İkon - Beğenilerin',
            description: 'Lucide: Heart',
            type: 'text',
            value: 'Heart',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.saved.name',
            label: 'İkon - Kaydedilenlerin',
            description: 'Lucide: Bookmark',
            type: 'text',
            value: 'Bookmark',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.archived.name',
            label: 'İkon - Arşivlenenler',
            description: 'Lucide: ClockFading',
            type: 'text',
            value: 'ClockFading',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.notInterested.name',
            label: 'İkon - İlgilenmediklerin',
            description: 'Lucide: EyeOff',
            type: 'text',
            value: 'EyeOff',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.interested.name',
            label: 'İkon - İlgilendiklerin',
            description: 'Lucide: Eye',
            type: 'text',
            value: 'Eye',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.accountHistory.name',
            label: 'İkon - Hesap geçmişi',
            description: 'Lucide: CalendarDays',
            type: 'text',
            value: 'CalendarDays',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.watchHistory.name',
            label: 'İkon - İzleme geçmişi',
            description: 'Lucide: ImagePlay',
            type: 'text',
            value: 'ImagePlay',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.icon.deleted.name',
            label: 'İkon - Yakınlarda Silinenler',
            description: 'Lucide: Trash2',
            type: 'text',
            value: 'Trash2',
            group: 'Profil > İkonlar',
        },
        {
            key: 'profile.settings.chevron.color',
            label: 'Chevron rengi',
            description: 'Sağ ok rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.item.borderColor',
            label: 'Item ayırıcı rengi',
            description: 'Ayar item alt çizgi rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.segment.backgroundColor',
            label: 'Tema seçici arka plan',
            description: 'Segment arka plan rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.segment.activeColor',
            label: 'Tema seçici aktif renk',
            description: 'Segment aktif arka plan rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.segment.activeTextColor',
            label: 'Tema seçici aktif yazı rengi',
            description: 'Segment aktif yazı rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.segment.textColor',
            label: 'Tema seçici yazı rengi',
            description: 'Segment pasif yazı rengi',
            type: 'color',
            value: 'auto',
            group: 'Profil > Stiller',
        },
        {
            key: 'profile.settings.actionsHeader',
            label: 'Profil alt başlık - Hareketler',
            description: 'Profil ayarlar alt menüsü başlığı',
            type: 'text',
            value: 'Hareketler',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.deletedHeader',
            label: 'Profil alt başlık - Yakınlarda Silinenler',
            description: 'Profil ayarlar alt menüsü başlığı (silinenler)',
            type: 'text',
            value: 'Yakınlarda Silinenler',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.themeLabel',
            label: 'Profil ayar etiketi - Tema',
            description: 'Tema seçeneği etiketi',
            type: 'text',
            value: 'Tema',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.themeOptionLight',
            label: 'Tema seçeneği - Açık',
            description: 'Tema seçeneği Açık metni',
            type: 'text',
            value: 'Açık',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.themeOptionDark',
            label: 'Tema seçeneği - Koyu',
            description: 'Tema seçeneği Koyu metni',
            type: 'text',
            value: 'Koyu',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.themeOptionSystem',
            label: 'Tema seçeneği - Cihaz',
            description: 'Tema seçeneği Cihaz metni',
            type: 'text',
            value: 'Cihaz',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.actionsLabel',
            label: 'Profil ayar etiketi - Hareketler',
            description: 'Hareketler seçeneği etiketi',
            type: 'text',
            value: 'Hareketler',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.actionsHeroTitle',
            label: 'Hareketler - Üst başlık',
            description: 'Hareketler sayfası üst başlığı',
            type: 'text',
            value: 'Hesap yönetimini tek bir yerde yapabilirsin',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.actionsHeroText',
            label: 'Hareketler - Alt metin',
            description: 'Hareketler sayfası açıklama metni',
            type: 'text',
            value: 'Tüm hesap hareketlerini incele ve yönet',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsHeroTitle',
            label: 'Hesap ayarları - Üst başlık',
            description: 'Hesap ayarları sayfası üst başlığı',
            type: 'text',
            value: 'Hesap güvenliğin önemli',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsHeroText',
            label: 'Hesap ayarları - Alt metin',
            description: 'Hesap ayarları sayfası açıklama metni',
            type: 'text',
            value: 'Giriş ve güvenlik ayarlarını kontrol edip güncelleyebilirsin',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsNoticeText',
            label: 'Hesap ayarları - Uyarı metni',
            description: 'Hesap ayarları sayfası alt uyarı metni',
            type: 'text',
            value: 'Hesap güvenliğin, sağlığın ve uygulama erişiminde sorun yaşıyorsan, verilerinin izinsiz ele geçirildiğini ve paylaşıldığını düşünüyorsan, engellenen ve ya sessize alınan bir kullanıcıdan bildirimler almaya ve içerikler görmeye devam ediyorsan lütfen Güven Merkezi\'ni ziyaret et',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsNoticeLinkLabel',
            label: 'Hesap ayarları - Güven Merkezi etiket',
            description: 'Hesap ayarları sayfası link metni',
            type: 'text',
            value: 'Güven Merkezi',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.twoFactor',
            label: 'Hesap ayarları - İki adımlı doğrulama',
            description: 'Hesap ayarları menüsü item metni',
            type: 'text',
            value: 'İki adımlı doğrulama',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.twoFactorHelper',
            label: 'Hesap ayarları - İki adımlı doğrulama açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'E-posta adresinizi veya telefon numaranızı iki adımlı doğrulama için kullanın.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.passwordHelper',
            label: 'Hesap ayarları - Şifre açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'Hesap şifreniz size özeldir. Güvenliğiniz için şifrenizi düzenli aralıklarla değiştirmenizi ve İki Adımlı Doğrulama’yı aktif etmenizi öneririz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.emailHelper',
            label: 'Hesap ayarları - E-posta açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'Hesabınızla ilişkili e-posta adresi giriş, bildirim ve güvenlik doğrulamaları için kullanılır. Güncel ve erişiminizin olduğu bir adres kullandığınızdan emin olun.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.phoneHelper',
            label: 'Hesap ayarları - Telefon numarası açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'Telefon numaranız hesap güvenliği, doğrulama ve önemli bilgilendirmeler için kullanılır. Güncel ve size ait bir numara kullandığınızdan emin olun.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.statusHelper',
            label: 'Hesap ayarları - Hesap durumu açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'Hesap durumunuzu buradan görüntüleyebilir ve hesabınızla ilgili önemli bilgilere erişebilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.blockedHelper',
            label: 'Hesap ayarları - Engellenenler açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'Engellediğiniz hesapları buradan görüntüleyebilir ve dilediğiniz zaman engellemeyi kaldırabilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.mutedHelper',
            label: 'Hesap ayarları - Sessize alınanlar açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'Sessize aldığınız hesapları buradan görüntüleyebilir ve dilediğiniz zaman sessize alma işlemini kaldırabilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountSettingsItem.typeHelper',
            label: 'Hesap ayarları - Hesap türü açıklaması',
            description: 'Hesap ayarları menüsü item açıklama metni',
            type: 'text',
            value: 'Hesap türünüzü ve ilgili seçenekleri buradan yönetebilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.pause',
            label: 'Hesap türü - Hesabına ara ver',
            description: 'Hesap türü menüsü item metni',
            type: 'text',
            value: 'Hesabına ara ver',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.creatorHelper',
            label: 'Hesap türü - İçerik üreticisi açıklaması',
            description: 'Hesap türü menüsü item açıklama metni',
            type: 'text',
            value: 'İçerik üreticisi araçlarına erişmek için başvur.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.brandedHelper',
            label: 'Hesap türü - Markalı içerik açıklaması',
            description: 'Hesap türü menüsü item açıklama metni',
            type: 'text',
            value: 'Markalı içerik seçeneklerini ve işbirliklerini yönet.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.verificationHelper',
            label: 'Hesap türü - Doğrulama açıklaması',
            description: 'Hesap türü menüsü item açıklama metni',
            type: 'text',
            value: 'Hesabını doğrulatmak için talep oluştur.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.badgeHelper',
            label: 'Hesap türü - Rozet açıklaması',
            description: 'Hesap türü menüsü item açıklama metni',
            type: 'text',
            value: 'Rozet başvurunu tamamla ve süreci takip et.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.pauseHelper',
            label: 'Hesap türü - Hesabına ara ver açıklaması',
            description: 'Hesap türü menüsü item açıklama metni',
            type: 'text',
            value: 'Hesabını geçici olarak devre dışı bırakır. Dilediğinde tekrar devam edebilirsin.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.terminate',
            label: 'Hesap türü - Hesabını sonlandır',
            description: 'Hesap türü menüsü item metni',
            type: 'text',
            value: 'Hesabını sonlandır',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.accountType.terminateHelper',
            label: 'Hesap türü - Hesabını sonlandır açıklaması',
            description: 'Hesap türü menüsü item açıklama metni',
            type: 'text',
            value: 'Hesabını kalıcı olarak kapatır. Bu işlem geri alınamaz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.notificationsHeroTitle',
            label: 'Bildirimler - Üst başlık',
            description: 'Bildirimler sayfası üst başlığı',
            type: 'text',
            value: 'Tercihlerini önemsiyoruz',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.notificationsHeroText',
            label: 'Bildirimler - Alt metin',
            description: 'Bildirimler sayfası açıklama metni',
            type: 'text',
            value: 'Bildirim tercihlerini istediğin zaman değiştirebilirsin',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.notificationsNoticeText',
            label: 'Bildirimler - Uyarı metni',
            description: 'Bildirimler sayfası alt uyarı metni',
            type: 'text',
            value: 'Tercihlerinize saygı duyar, istemediğiniz bildirimleri size göndermeyiz. Şeffaflık ilkemiz gereği sizi önemli güncellemeler hakkında bilgilendirmeye devam ederiz. Hesap güvenliğinizle ilgili bildirimler, bu tercihlerden bağımsız olarak her zaman size ulaşır.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.notificationsItem.pushHelper',
            label: 'Bildirimler - Anlık bildirimler açıklaması',
            description: 'Bildirimler menüsü item açıklama metni',
            type: 'text',
            value: 'Uygulama bildirimlerini tercihlerinize göre yönetebilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.notificationsItem.emailHelper',
            label: 'Bildirimler - E-posta bildirimleri açıklaması',
            description: 'Bildirimler menüsü item açıklama metni',
            type: 'text',
            value: 'İstenmeyen e-postaları yönetebilir ve iletişim tercihlerinizi güncelleyebilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.notificationsItem.smsHelper',
            label: 'Bildirimler - SMS bildirimleri açıklaması',
            description: 'Bildirimler menüsü item açıklama metni',
            type: 'text',
            value: 'SMS bildirimlerini kontrol edebilir ve almak istemediklerinizi kapatabilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.inAppBrowser.heroTitle',
            label: 'Uygulama içi tarayıcı - Üst başlık',
            description: 'Uygulama içi tarayıcı sayfası üst başlığı',
            type: 'text',
            value: 'Göz atma geçmişi sizin kontrolünüzde',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.inAppBrowser.heroText',
            label: 'Uygulama içi tarayıcı - Alt metin',
            description: 'Uygulama içi tarayıcı sayfası açıklama metni',
            type: 'text',
            value: 'Geçmişinizi inceleyebilir, yönetebilir ve isterseniz temizleyebilirsiniz',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.inAppBrowser.noticeText',
            label: 'Uygulama içi tarayıcı - Uyarı metni',
            description: 'Uygulama içi tarayıcı sayfası alt uyarı metni',
            type: 'text',
            value: 'Göz atma geçmişinizi 90 gün sonra siliyoruz.\nBu verileri size daha uygun içerikler ve reklamlar göstermek için kullanıyoruz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.inAppBrowser.history.toggleHelper',
            label: 'Uygulama içi tarayıcı - Geçmiş seçeneği açıklaması',
            description: 'Tarayıcı geçmişi Açık/Kapalı açıklama metni',
            type: 'text',
            value: 'Tarayıcı geçmişinin kaydedilmesini Açık veya Kapalı olarak yönetebilirsiniz.\nVarsayılan ayar Açık’tır.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.inAppBrowser.history.viewHelper',
            label: 'Uygulama içi tarayıcı - Geçmişi gör açıklaması',
            description: 'Tarayıcı geçmişini gör açıklama metni',
            type: 'text',
            value: 'Göz atma geçmişinizi görüntüleyebilir ve daha sonra tekrar ziyaret edebilirsiniz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.inAppBrowser.history.clearHelper',
            label: 'Uygulama içi tarayıcı - Geçmişi temizle açıklaması',
            description: 'Tarayıcı geçmişini temizle açıklama metni',
            type: 'text',
            value: 'Göz atma geçmişinizi tercihlerinize göre temizleyebilirsiniz.\nBu veriler temizlendikten sonra görüntülenmez ve kullanılmaz.',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.logoutLabel',
            label: 'Profil ayar etiketi - Çıkış Yap',
            description: 'Çıkış yap seçeneği etiketi',
            type: 'text',
            value: 'Çıkış Yap',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.deletedLabel',
            label: 'Profil ayar etiketi - Yakınlarda Silinenler',
            description: 'Silinenler seçeneği etiketi',
            type: 'text',
            value: 'Yakınlarda Silinenler',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.deletedHelper',
            label: 'Profil ayar açıklaması - Yakınlarda Silinenler',
            description: 'Silinenler açıklama metni',
            type: 'text',
            value: 'Son 15 gün içinde silinenleri geri yükle',
            group: 'Profil > Metinler',
        },
        {
            key: 'profile.settings.actionsItem.likes',
            label: 'Hareketler - Beğenilerin',
            description: 'Hareketler menüsü item metni',
            type: 'text',
            value: 'Beğenilerin',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.saved',
            label: 'Hareketler - Kaydedilenlerin',
            description: 'Hareketler menüsü item metni',
            type: 'text',
            value: 'Kaydedilenlerin',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.archived',
            label: 'Hareketler - Arşivlenenler',
            description: 'Hareketler menüsü item metni',
            type: 'text',
            value: 'Arşivlenenler',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.notInterested',
            label: 'Hareketler - İlgilenmediklerin',
            description: 'Hareketler menüsü item metni',
            type: 'text',
            value: 'İlgilenmediklerin',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.notInterestedHelper',
            label: 'Hareketler - İlgilenmediklerin açıklaması',
            description: 'Hareketler menüsü item açıklama metni',
            type: 'text',
            value: 'İlgilenmediğini işaretlediğin içerikleri yönet.',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.interested',
            label: 'Hareketler - İlgilendiklerin',
            description: 'Hareketler menüsü item metni',
            type: 'text',
            value: 'İlgilendiklerin',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.interestedHelper',
            label: 'Hareketler - İlgilendiklerin açıklaması',
            description: 'Hareketler menüsü item açıklama metni',
            type: 'text',
            value: 'İlgilendiğini işaretlediğin içerikleri burada gör.',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.accountHistory',
            label: 'Hareketler - Hesap geçmişi',
            description: 'Hareketler menüsü item metni',
            type: 'text',
            value: 'Hesap geçmişi',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.accountHistoryHelper',
            label: 'Hareketler - Hesap geçmişi açıklaması',
            description: 'Hareketler menüsü item açıklama metni',
            type: 'text',
            value: 'Hesap bilgilerini ve oluşturma tarihini görüntüle.',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.watchHistory',
            label: 'Hareketler - İzleme geçmişi',
            description: 'Hareketler menüsü item metni',
            type: 'text',
            value: 'İzleme geçmişi',
            group: 'Profil > Hareketler',
        },
        {
            key: 'profile.settings.actionsItem.watchHistoryHelper',
            label: 'Hareketler - İzleme geçmişi açıklaması',
            description: 'Hareketler menüsü item açıklama metni',
            type: 'text',
            value: 'İzlediğin içerikleri ve tekrar ziyaret ettiklerini gör.',
            group: 'Profil > Hareketler',
        },
    ],
};

function mergeAdminConfig(storedConfig) {
    const defaultItems = DEFAULT_ADMIN_CONFIG.items;
    const defaultMap = new Map(defaultItems.map((item) => [item.key, item]));
    const storedItems = Array.isArray(storedConfig?.items) ? storedConfig.items : [];
    const storedMap = new Map(storedItems.map((item) => [item.key, item]));

    // Start with all default items, merging values from stored config if they exist
    const mergedItems = defaultItems.map((defaultItem) => {
        const storedItem = storedMap.get(defaultItem.key);
        if (!storedItem) return defaultItem;
        return {
            ...defaultItem,
            value: storedItem.value ?? defaultItem.value,
        };
    });

    // Add items from stored config that ARE NOT in default config
    storedItems.forEach((item) => {
        if (!defaultMap.has(item.key)) {
            mergedItems.push(item);
        }
    });

    return {
        version: typeof storedConfig?.version === 'number' ? storedConfig.version : DEFAULT_ADMIN_CONFIG.version,
        updatedAt: storedConfig?.updatedAt || DEFAULT_ADMIN_CONFIG.updatedAt,
        items: mergedItems,
    };
}

function loadAdminConfig() {
    try {
        if (!fs.existsSync(ADMIN_CONFIG_PATH)) {
            return DEFAULT_ADMIN_CONFIG;
        }
        const raw = fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
            return mergeAdminConfig(parsed);
        }
        return DEFAULT_ADMIN_CONFIG;
    } catch (error) {
        console.error('[ADMIN CONFIG] Load error:', error);
        return DEFAULT_ADMIN_CONFIG;
    }
}

function sanitizeAdminConfig(input) {
    if (!input || !Array.isArray(input.items)) {
        return null;
    }
    const items = input.items
        .map((item) => ({
            key: String(item.key || '').trim(),
            label: String(item.label || '').trim(),
            description: String(item.description || '').trim(),
            type: String(item.type || 'text').trim(),
            value: item.value,
            group: item.group ? String(item.group) : undefined,
            options: Array.isArray(item.options) ? item.options.map((opt) => String(opt)) : undefined,
            min: typeof item.min === 'number' ? item.min : undefined,
            max: typeof item.max === 'number' ? item.max : undefined,
            step: typeof item.step === 'number' ? item.step : undefined,
        }))
        .filter((item) => item.key.length > 0);

    return {
        version: typeof input.version === 'number' ? input.version : DEFAULT_ADMIN_CONFIG.version,
        updatedAt: new Date().toISOString(),
        items,
    };
}

function saveAdminConfig(config) {
    fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(config, null, 2));
}

function broadcastAdminConfigUpdate() {
    if (!adminWss) return;
    const message = JSON.stringify({ type: 'admin-config-updated', updatedAt: new Date().toISOString() });
    adminWss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

app.get('/admin/config', (req, res) => {
    res.json(loadAdminConfig());
});

app.get('/admin/config/defaults', (req, res) => {
    res.json(DEFAULT_ADMIN_CONFIG);
});

app.post('/admin/config', (req, res) => {
    const sanitized = sanitizeAdminConfig(req.body);
    if (!sanitized) {
        return res.status(400).json({ error: 'Gecersiz config verisi.' });
    }
    try {
        saveAdminConfig(sanitized);
        broadcastAdminConfigUpdate();
        return res.json({ ok: true, config: sanitized });
    } catch (error) {
        console.error('[ADMIN CONFIG] Save error:', error);
        return res.status(500).json({ error: 'Config kaydedilemedi.' });
    }
});

// Helper: Upload to R2 with CDN Cache Headers
async function uploadToR2(filePath, fileName, contentType) {
    const fileStream = fs.readFileSync(filePath);
    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: fileStream,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable', // 1 year CDN cache
    }));
    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
}

console.log('6. Loading HlsService...');
const HlsService = require('./services/HlsService');
console.log('7. Initializing HlsService...');
const hlsService = new HlsService(r2, process.env.R2_BUCKET_NAME);
console.log('8. HlsService READY.');

// 🔥 Upload Progress Tracking
const uploadProgress = new Map(); // { uniqueId: { stage: string, percent: number } }

// Endpoint: Get Upload Progress
app.get('/upload-progress/:id', (req, res) => {
    const progress = uploadProgress.get(req.params.id);
    if (!progress) {
        return res.json({ stage: 'unknown', percent: 0 });
    }
    res.json(progress);
});

// Helper: Update progress
function setUploadProgress(id, stage, percent) {
    uploadProgress.set(id, { stage, percent });
    console.log(`📊 [PROGRESS] ${id}: ${stage} - ${percent}%`);
}

function parseAspectRatioValue(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.includes(':')) {
        const [left, right] = trimmed.split(':');
        const num = parseFloat(left);
        const den = parseFloat(right);
        if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
            return num / den;
        }
        return null;
    }

    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseRotationCandidate(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function extractRotationFromStream(stream) {
    if (!stream || typeof stream !== 'object') return 0;

    const tagRotation = parseRotationCandidate(stream?.tags?.rotate);
    if (tagRotation != null) return tagRotation;

    const sideDataList = Array.isArray(stream?.side_data_list) ? stream.side_data_list : [];
    for (const sideData of sideDataList) {
        if (!sideData || typeof sideData !== 'object') continue;

        const directRotation = parseRotationCandidate(sideData.rotation);
        if (directRotation != null) return directRotation;

        const displayMatrix = typeof sideData.displaymatrix === 'string' ? sideData.displaymatrix : '';
        if (displayMatrix) {
            const match = displayMatrix.match(/rotation of\s*(-?\d+(?:\.\d+)?)\s*degrees/i);
            if (match) {
                const parsed = parseFloat(match[1]);
                if (Number.isFinite(parsed)) return parsed;
            }
        }
    }

    return 0;
}

function extractDimensionsFromProbe(metadata) {
    if (!metadata || !Array.isArray(metadata.streams)) {
        return { width: 0, height: 0 };
    }
    const stream =
        metadata.streams.find(s => s.codec_type === 'video' && s.width && s.height) ||
        metadata.streams.find(s => s.width && s.height);
    let width = stream?.width || 0;
    let height = stream?.height || 0;

    const rotation = extractRotationFromStream(stream);
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isQuarterTurn = Math.abs(normalizedRotation - 90) < 1 || Math.abs(normalizedRotation - 270) < 1;

    const displayAspectRatio = parseAspectRatioValue(stream?.display_aspect_ratio);
    const shouldSwapByDisplayAspect =
        displayAspectRatio != null &&
        ((displayAspectRatio < 1 && width > height) || (displayAspectRatio > 1 && width < height));

    if (isQuarterTurn || shouldSwapByDisplayAspect) {
        [width, height] = [height, width];
    }
    return { width, height };
}

function getOrientation(width, height) {
    if (!width || !height) return 'unknown';
    if (Math.abs(width - height) <= 1) return 'square';
    return width > height ? 'landscape' : 'portrait';
}

function normalizeDimensionsWithReference(primary, reference) {
    const primaryWidth = Number(primary?.width) || 0;
    const primaryHeight = Number(primary?.height) || 0;
    const referenceWidth = Number(reference?.width) || 0;
    const referenceHeight = Number(reference?.height) || 0;

    if (!primaryWidth || !primaryHeight) {
        if (referenceWidth && referenceHeight) {
            return { width: referenceWidth, height: referenceHeight };
        }
        return { width: primaryWidth, height: primaryHeight };
    }

    if (!referenceWidth || !referenceHeight) {
        return { width: primaryWidth, height: primaryHeight };
    }

    const primaryOrientation = getOrientation(primaryWidth, primaryHeight);
    const referenceOrientation = getOrientation(referenceWidth, referenceHeight);
    const isOppositeOrientation =
        (primaryOrientation === 'landscape' && referenceOrientation === 'portrait') ||
        (primaryOrientation === 'portrait' && referenceOrientation === 'landscape');

    if (isOppositeOrientation) {
        return { width: primaryHeight, height: primaryWidth };
    }

    return { width: primaryWidth, height: primaryHeight };
}

function pickMostPortrait(current, candidate) {
    if (!candidate?.width || !candidate?.height) return current;
    if (!current?.width || !current?.height) return candidate;
    const currentRatio = current.width / current.height;
    const candidateRatio = candidate.width / candidate.height;
    return candidateRatio < currentRatio ? candidate : current;
}

async function safeProbeDimensions(inputPath) {
    try {
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg(inputPath).ffprobe((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return extractDimensionsFromProbe(metadata);
    } catch (error) {
        console.warn('⚠️ [PROBE] Failed to read media dimensions:', error?.message || error);
        return { width: 0, height: 0 };
    }
}

// Endpoint: HLS Video Upload (Supports Carousels)
app.post('/upload-hls', upload.array('video', 10), async (req, res) => {
    const files = req.files;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
    }

    // Determine is_commercial flag
    // 'İş Birliği İçermiyor' means is_commercial = false
    const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';

    const uniqueId = uuidv4();
    const tempOutputDir = path.join(__dirname, 'temp_uploads');
    const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');

    console.log(`\n🎬 [UPLOAD] --- NEW UPLOAD START ---`);
    console.log(`🎬 [UPLOAD] Count: ${files.length}, Type: ${isCarousel ? 'carousel' : 'video'}`);
    console.log(`🎬 [UPLOAD] ID: ${uniqueId}`);
    console.log(`🎬 [UPLOAD] UserID: ${userId}`);

    try {
        const mediaUrls = [];
        let firstThumbUrl = '';
        let firstSpriteUrl = '';
        let finalWidth = 1080;
        let finalHeight = 1920;
        let portraitBase = { width: 0, height: 0 };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isVideo = file.mimetype.startsWith('video/');
            const indexLabel = files.length > 1 ? `_${i}` : '';
            const baseKey = `media/${userId || 'test-user'}/posts/${uniqueId}${indexLabel}`;
            const inputPath = file.path;

            setUploadProgress(uniqueId, `item_${i}`, 10 + Math.floor((i / files.length) * 80));

            if (isVideo) {
                const metadata = await new Promise((resolve, reject) => {
                    ffmpeg(inputPath).ffprobe((err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });

                const { width, height } = extractDimensionsFromProbe(metadata);
                const duration = parseFloat(metadata.format.duration || 0);

                const processedThumbPath = path.join(tempOutputDir, `thumb_${uniqueId}_${i}.jpg`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .outputOptions(['-q:v 2'])
                        .screenshots({
                            count: 1,
                            filename: `thumb_${uniqueId}_${i}.jpg`,
                            folder: tempOutputDir,
                            size: '1080x?'
                        })
                        .on('end', resolve)
                        .on('error', reject);
                });

                const thumbDims = await safeProbeDimensions(processedThumbPath);
                const normalizedSourceDims = normalizeDimensionsWithReference({ width, height }, thumbDims);
                const safeWidth = normalizedSourceDims.width || thumbDims.width || width || 1080;
                const safeHeight = normalizedSourceDims.height || thumbDims.height || height || 1920;

                const thumbUrl = await uploadToR2(processedThumbPath, `${baseKey}/thumb.jpg`, 'image/jpeg');
                if (i === 0) firstThumbUrl = thumbUrl;

                const optimizedPath = path.join(tempOutputDir, `optimized_${uniqueId}_${i}.mp4`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .videoCodec('libx264')
                        .size(safeWidth > 1080 ? '1080x?' : `${safeWidth}x${safeHeight}`)
                        .outputOptions(['-crf 26', '-preset veryfast', '-movflags +faststart', '-pix_fmt yuv420p'])
                        .on('end', resolve)
                        .on('error', reject)
                        .save(optimizedPath);
                });

                const videoUrl = await uploadToR2(optimizedPath, `${baseKey}/master.mp4`, 'video/mp4');
                const optimizedDims = await safeProbeDimensions(optimizedPath);
                const outputWidth = optimizedDims.width || safeWidth;
                const outputHeight = optimizedDims.height || safeHeight;
                portraitBase = pickMostPortrait(portraitBase, { width: outputWidth, height: outputHeight });
                console.log(`   📐 [DIM][POST] source=${width}x${height}, thumb=${thumbDims.width}x${thumbDims.height}, normalized=${safeWidth}x${safeHeight}, output=${outputWidth}x${outputHeight}`);

                let spriteUrl = '';
                if (i === 0) {
                    spriteUrl = await hlsService.generateSpriteSheet(inputPath, tempOutputDir, uniqueId, baseKey, duration);
                    firstSpriteUrl = spriteUrl;
                }

                mediaUrls.push({ url: videoUrl, type: 'video', thumbnail: thumbUrl, sprite: spriteUrl, width: outputWidth, height: outputHeight });

                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(processedThumbPath)) fs.unlinkSync(processedThumbPath);
                if (fs.existsSync(optimizedPath)) fs.unlinkSync(optimizedPath);
            } else {
                const { width, height } = await safeProbeDimensions(inputPath);
                portraitBase = pickMostPortrait(portraitBase, { width, height });
                const imageKey = `${baseKey}/image.jpg`;
                const imageUrl = await uploadToR2(inputPath, imageKey, file.mimetype);

                if (i === 0) {
                    firstThumbUrl = imageUrl;
                }

                mediaUrls.push({ url: imageUrl, type: 'image', width, height });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        }

        if (portraitBase.width && portraitBase.height) {
            finalWidth = portraitBase.width;
            finalHeight = portraitBase.height;
        }

        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: userId || 'test-user',
                video_url: mediaUrls[0].url,
                thumbnail_url: firstThumbUrl,
                sprite_url: firstSpriteUrl,
                media_urls: mediaUrls,
                post_type: isCarousel ? 'carousel' : 'video',
                description: description || '',
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                commercial_type: commercialType || null,
                is_commercial: isCommercial,
                width: finalWidth,
                height: finalHeight,
                processing_status: 'completed'
            })
            .select();

        if (error) throw error;

        setUploadProgress(uniqueId, 'done', 100);
        res.json({ success: true, data: data[0] });

    } catch (error) {
        console.error('❌ [UPLOAD] Error:', error);
        res.status(500).json({ error: error.message });
        if (files) files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
});


// ============================================
// Endpoint: STORY Upload (Simple, no HLS)
// ============================================
// Endpoint: STORY Upload (Supports Carousels)
app.post('/upload-story', upload.array('video', 10), async (req, res) => {
    const files = req.files;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const uniqueId = uuidv4();
    const tempOutputDir = path.join(__dirname, 'temp_uploads');
    const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');

    console.log(`📖 [STORY] Upload started: ${uniqueId}, Count: ${files.length}`);

    try {
        const mediaUrls = [];
        let firstThumbUrl = '';
        let finalWidth = 1080;
        let finalHeight = 1920;
        let portraitBase = { width: 0, height: 0 };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isVideo = file.mimetype.startsWith('video/');
            const indexLabel = files.length > 1 ? `_${i}` : '';
            const baseKey = `media/${userId}/stories/${uniqueId}${indexLabel}`;
            const inputPath = file.path;

            if (isVideo) {
                const metadata = await new Promise((resolve, reject) => {
                    ffmpeg(inputPath).ffprobe((err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });

                const { width, height } = extractDimensionsFromProbe(metadata);

                const videoKey = `${baseKey}/story.mp4`;
                await uploadToR2(inputPath, videoKey, file.mimetype);
                const storyUrl = `${process.env.R2_PUBLIC_URL}/${videoKey}`;

                // Process Thumb
                const thumbPath = path.join(os.tmpdir(), `${uniqueId}_${i}_thumb.jpg`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .screenshots({
                            count: 1,
                            folder: os.tmpdir(),
                            filename: `${uniqueId}_${i}_thumb.jpg`,
                            size: '?x480'
                        })
                        .on('end', resolve)
                        .on('error', reject);
                });

                const thumbKey = `${baseKey}/thumb.jpg`;
                const thumbnailUrl = await uploadToR2(thumbPath, thumbKey, 'image/jpeg');
                const thumbDims = await safeProbeDimensions(thumbPath);
                const normalizedSourceDims = normalizeDimensionsWithReference({ width, height }, thumbDims);
                const safeWidth = normalizedSourceDims.width || thumbDims.width || width || 1080;
                const safeHeight = normalizedSourceDims.height || thumbDims.height || height || 1920;
                portraitBase = pickMostPortrait(portraitBase, { width: safeWidth, height: safeHeight });
                console.log(`   📐 [DIM][STORY] source=${width}x${height}, thumb=${thumbDims.width}x${thumbDims.height}, normalized=${safeWidth}x${safeHeight}`);

                if (i === 0) {
                    firstThumbUrl = thumbnailUrl;
                }

                mediaUrls.push({ url: storyUrl, type: 'video', thumbnail: thumbnailUrl, width: safeWidth, height: safeHeight });
                if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            } else {
                const { width, height } = await safeProbeDimensions(inputPath);
                portraitBase = pickMostPortrait(portraitBase, { width, height });
                const imageKey = `${baseKey}/story.jpg`;
                const imageUrl = await uploadToR2(inputPath, imageKey, file.mimetype);

                if (i === 0) firstThumbUrl = imageUrl;
                mediaUrls.push({ url: imageUrl, type: 'image', width, height });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        }

        if (portraitBase.width && portraitBase.height) {
            finalWidth = portraitBase.width;
            finalHeight = portraitBase.height;
        }

        const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { data, error } = await supabase.from('stories').insert({
            user_id: userId,
            video_url: mediaUrls[0].url,
            thumbnail_url: firstThumbUrl,
            media_urls: mediaUrls,
            post_type: isCarousel ? 'carousel' : 'video',
            width: finalWidth,
            height: finalHeight,
            is_commercial: isCommercial,
            brand_name: brandName || null,
            brand_url: brandUrl || null,
            commercial_type: commercialType || null,
            expires_at: expiresAt.toISOString()
        }).select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });

    } catch (error) {
        console.error('❌ [STORY] Error:', error);
        res.status(500).json({ error: error.message });
        if (files) files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
});

function parseMediaUrlsField(mediaUrlsField) {
    if (Array.isArray(mediaUrlsField)) return mediaUrlsField;
    if (typeof mediaUrlsField !== 'string') return [];

    try {
        const parsed = JSON.parse(mediaUrlsField);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function extractR2KeyFromValue(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        return (parsed.pathname || '').replace(/^\/+/, '') || null;
    } catch {
        const withoutQuery = trimmed.split('?')[0].split('#')[0];
        return withoutQuery.replace(/^\/+/, '') || null;
    }
}

function deriveScopedR2Prefix(key) {
    if (typeof key !== 'string' || key.length === 0) return null;

    const segments = key.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    // Legacy video layout: videos/<id>/...
    if (segments[0] === 'videos') {
        return `videos/${segments[1]}`;
    }

    // Current post layout: media/<userId>/(posts|videos)/<postId>/...
    if (
        segments[0] === 'media' &&
        segments.length >= 4 &&
        (segments[2] === 'posts' || segments[2] === 'videos')
    ) {
        return `media/${segments[1]}/${segments[2]}/${segments[3]}`;
    }

    return null;
}

function deriveLegacyVideoIdFromKey(key) {
    if (typeof key !== 'string' || key.length === 0) return null;
    const segments = key.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    if (segments[0] === 'videos') {
        return segments[1];
    }

    if (segments[0] === 'media' && segments.length >= 4 && segments[2] === 'videos') {
        return segments[3];
    }

    return null;
}


// Endpoint: DELETE Video (Soft Delete by default)
app.delete('/videos/:id', async (req, res) => {
    const videoId = req.params.id;
    const force = req.query.force === 'true'; // ?force=true for permanent delete

    console.log(`\n\n🗑️ [DELETE REQUEST START]`);
    console.log(`   📝 Video ID: ${videoId}`);
    console.log(`   ❓ Force Query Param: "${req.query.force}"`);
    console.log(`   🛡️ Parsed Force Mode: ${force}`);
    console.log(`   👉 Decision: ${force ? 'HARD DELETE (Permanent)' : 'SOFT DELETE (Trash)'}`);

    // 🔐 JWT Authentication
    const authHeader = req.headers.authorization;
    console.log(`   🔑 Auth Header: ${authHeader ? 'Present' : 'MISSING'}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`   ❌ No valid Authorization header`);
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated Supabase client (respects RLS)
    const dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log(`   👤 Auth User: ${user?.id || 'NONE'} | Error: ${authError?.message || 'NONE'}`);

    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        if (force) {
            // ============================================
            // HARD DELETE (Permanent)
            // ============================================

            // 1. Get video info (using authenticated client)
            const { data: video, error: fetchError } = await dbClient
                .from('videos')
                .select('*')
                .eq('id', videoId)
                .single();

            if (fetchError || !video) {
                console.warn(`   ⚠️ Video not found during HARD delete search. Error: ${fetchError?.message}`);
                return res.status(404).json({ error: 'Video not found' });
            }

            // 1. Fetch Video Details (Already done above as 'video')
            // Using 'video' object which contains video_url, sprite_url, thumbnail_url since we selected '*'

            // 2. R2 Cleanup - Covers legacy URLs + current media_urls carousel structure
            const objectKeysToDelete = new Set();
            const folderPrefixesToClean = new Set();
            const legacyVideoIds = new Set();

            const registerCleanupTarget = (value) => {
                const key = extractR2KeyFromValue(value);
                if (!key) return;
                objectKeysToDelete.add(key);

                const prefix = deriveScopedR2Prefix(key);
                if (prefix) {
                    folderPrefixesToClean.add(prefix);
                }

                const legacyVideoId = deriveLegacyVideoIdFromKey(key);
                if (legacyVideoId) {
                    legacyVideoIds.add(legacyVideoId);
                }
            };

            // Main URL fields
            registerCleanupTarget(video.video_url);
            registerCleanupTarget(video.thumbnail_url);
            registerCleanupTarget(video.sprite_url);

            // Carousel/media-specific URLs
            const mediaUrls = parseMediaUrlsField(video.media_urls);
            for (const mediaItem of mediaUrls) {
                if (!mediaItem || typeof mediaItem !== 'object') continue;
                registerCleanupTarget(mediaItem.url);
                registerCleanupTarget(mediaItem.thumbnail);
                registerCleanupTarget(mediaItem.sprite);
            }

            // Fallback cleanup candidates for thumbnails to handle legacy + mixed records
            for (const folderPrefix of folderPrefixesToClean) {
                objectKeysToDelete.add(`${folderPrefix}/thumb.jpg`);
                objectKeysToDelete.add(`${folderPrefix}/thumb.jpeg`);
                objectKeysToDelete.add(`${folderPrefix}/thumb.png`);
                objectKeysToDelete.add(`${folderPrefix}/thumbnail.jpg`);
                objectKeysToDelete.add(`${folderPrefix}/thumbnail.jpeg`);
                objectKeysToDelete.add(`${folderPrefix}/thumbnail.png`);
            }
            for (const legacyVideoId of legacyVideoIds) {
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.jpg`);
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.jpeg`);
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.png`);
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.webp`);
            }

            console.log(`   🧹 R2 cleanup targets: ${objectKeysToDelete.size} key(s), ${folderPrefixesToClean.size} folder prefix(es)`);

            // 2A. Prefix cleanup for scoped folders
            for (const folderPrefix of folderPrefixesToClean) {
                try {
                    const prefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
                    console.log(`   👉 [HARD] Cleaning R2 Folder: ${prefix}`);
                    const listCmd = new ListObjectsV2Command({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Prefix: prefix
                    });
                    const listRes = await r2.send(listCmd);

                    if (listRes.Contents && listRes.Contents.length > 0) {
                        const deleteParams = {
                            Bucket: process.env.R2_BUCKET_NAME,
                            Delete: {
                                Objects: listRes.Contents.map(obj => ({ Key: obj.Key }))
                            }
                        };
                        await r2.send(new DeleteObjectsCommand(deleteParams));
                        console.log(`   ✅ R2 Folder Deleted (${listRes.Contents.length} files) from: ${prefix}`);
                    } else {
                        console.log(`   ⚠️ No files found in R2 folder: ${prefix}`);
                    }
                } catch (r2Error) {
                    console.error(`   ⚠️ R2 Cleanup Error for ${folderPrefix}:`, r2Error.message);
                }
            }

            // 2B. Direct key cleanup (covers standalone keys like thumbs/<id>.jpg)
            if (objectKeysToDelete.size > 0) {
                try {
                    const keys = Array.from(objectKeysToDelete).map((Key) => ({ Key }));
                    const chunkSize = 1000;
                    for (let i = 0; i < keys.length; i += chunkSize) {
                        const chunk = keys.slice(i, i + chunkSize);
                        await r2.send(new DeleteObjectsCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Delete: { Objects: chunk },
                        }));
                    }
                    console.log(`   ✅ R2 Direct Key Cleanup Sent (${objectKeysToDelete.size} keys)`);
                } catch (r2Error) {
                    console.error('   ⚠️ R2 Direct Key Cleanup Error:', r2Error.message);
                }
            }

            // 3. DB Delete (using authenticated client for RLS)
            const { error: deleteError, count } = await dbClient
                .from('videos')
                .delete()
                .eq('id', videoId);

            console.log(`   📊 Delete Result: count=${count}, error=${deleteError?.message || 'NONE'}`);

            if (deleteError) throw deleteError;

            console.log('✅ [HARD DELETE] Completed.');
            return res.json({ success: true, message: 'Video permanently deleted' });

        } else {
            // ============================================
            // SOFT DELETE
            // ============================================
            console.log(`   👉 Attempting Soft Delete via RPC for ${videoId}`);
            const { error } = await dbClient.rpc('soft_delete_video', { video_id: videoId });

            if (error) {
                console.error('   ❌ Soft Delete RPC Error:', error);
                throw error;
            }

            // Verify if it was actually deleted (optional but good for feedback)
            // Just assume success if no error, as RPC handles it.
            // If the ID didn't exist, the update inside RPC just does nothing.
            // We can check if we want to return 404, but for now Success is fine.

            console.log('✅ [SOFT DELETE] Video marked as deleted.');
            return res.json({ success: true, message: 'Video moved to trash' });
        }

    } catch (error) {
        console.error('❌ [DELETE] Unexpected Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Endpoint: RESTORE Video
app.post('/videos/:id/restore', async (req, res) => {
    const videoId = req.params.id;
    console.log(`♻️ [RESTORE] Request for video: ${videoId}`);

    try {
        console.log(`   👉 Attempting Restore via RPC for ${videoId}`);
        const { error } = await supabase.rpc('restore_video', { video_id: videoId });

        if (error) {
            console.error('   ❌ Restore RPC Error:', error);
            throw error;
        }

        console.log('✅ [RESTORE] Video restored successfully.');
        res.json({ success: true, message: 'Video restored' });

    } catch (error) {
        console.error('❌ [RESTORE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Avatar Upload
app.post('/upload-avatar', upload.single('image'), async (req, res) => {
    const file = req.file;
    const { userId } = req.body;

    if (!file || !userId) {
        return res.status(400).json({ error: 'Missing image or userId' });
    }

    try {
        console.log(`👤 [AVATAR] Process starting for user: ${userId}`);
        const extension = path.extname(file.originalname) || '.jpg';

        const fileName = `users/${userId}/profile/avatar${extension}`;

        // 1. Upload to R2
        const rawAvatarUrl = await uploadToR2(file.path, fileName, file.mimetype);

        // 2. Add Cache Buster (important for CDNs and apps)

        const avatarUrl = `${rawAvatarUrl}?t=${Date.now()}`;

        // 3. Update Supabase Profile Record
        console.log(`   👉 Syncing to Supabase Profiles...`);
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId);

        if (dbError) {
            console.error('   ❌ Supabase Update Error:', dbError.message);
            throw dbError;
        }

        // Cleanup temp file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        console.log(`✅ [AVATAR] Success: ${avatarUrl}`);
        res.json({ success: true, avatarUrl });

    } catch (error) {
        console.error('❌ [AVATAR] Fatal Error:', error);
        res.status(500).json({ error: error.message });
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// Health check
// Temporary Migration Endpoint
app.get('/migrate-assets', async (req, res) => {
    try {
        console.log("🚀 Starting R2 Migration via Endpoint...");
        const mainUserId = "687c8079-e94c-42c2-9442-8a4a6b63dec6";

        // 1. Migrate Avatar
        try {
            const oldAvatarKey = "avatars/wizyclub-official.jpg";
            const newAvatarKey = `users/${mainUserId}/profile/avatar.jpg`;
            await r2.send(new CopyObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                CopySource: `${process.env.R2_BUCKET_NAME}/${oldAvatarKey}`,
                Key: newAvatarKey
            }));
            await supabase.from('profiles').update({ avatar_url: `${process.env.R2_PUBLIC_URL}/${newAvatarKey}` }).eq('id', mainUserId);
            console.log("✅ Avatar migrated.");
        } catch (e) {
            console.log("⚠️ Avatar migration skipped.");
        }

        // 2. Migrate Videos
        const { data: videos } = await supabase.from('videos').select('*').order('created_at', { ascending: true });
        const r2Videos = ["1766009656643", "1766011111754", "1766012583186"];

        if (videos) {
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                const timestamp = r2Videos[i];
                if (!timestamp) continue;

                const newBase = `media/${mainUserId}/videos/${video.id}`;

                // Copy Video
                try {
                    await r2.send(new CopyObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        CopySource: `${process.env.R2_BUCKET_NAME}/videos/${timestamp}/master.mp4`,
                        Key: `${newBase}/master.mp4`
                    }));
                    await r2.send(new CopyObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        CopySource: `${process.env.R2_BUCKET_NAME}/thumbs/${timestamp}.jpg`,
                        Key: `${newBase}/thumb.jpg`
                    }));
                    // Optional sprite
                    try {
                        await r2.send(new CopyObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            CopySource: `${process.env.R2_BUCKET_NAME}/videos/${timestamp}/sprite_${timestamp}_0.jpg`,
                            Key: `${newBase}/sprite.jpg`
                        }));
                    } catch (e) { }

                    await supabase.from('videos').update({
                        video_url: `${process.env.R2_PUBLIC_URL}/${newBase}/master.mp4`,
                        thumbnail_url: `${process.env.R2_PUBLIC_URL}/${newBase}/thumb.jpg`,
                        sprite_url: `${process.env.R2_PUBLIC_URL}/${newBase}/sprite.jpg`
                    }).eq('id', video.id);
                    console.log(`✅ Video ${video.id} migrated.`);
                } catch (err) {
                    console.error(`❌ Video ${i} error:`, err.message);
                }
            }
        }

        // 3. Migrate Stories
        const { data: stories } = await supabase.from('stories').select('*');
        if (stories && videos) {
            for (const story of stories) {
                const matchingVideo = videos.find(v => v.id === story.id);
                if (matchingVideo) {
                    const newBase = `media/${mainUserId}/videos/${matchingVideo.id}`;
                    await supabase.from('stories').update({
                        video_url: `${process.env.R2_PUBLIC_URL}/${newBase}/master.mp4`,
                        thumbnail_url: `${process.env.R2_PUBLIC_URL}/${newBase}/thumb.jpg`
                    }).eq('id', story.id);
                }
            }
        }

        res.json({ success: true, message: "Migration triggered successfully. Check logs." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================================
// DRAFTS ENDPOINTS
// ========================================

// Get all drafts for current user
app.get('/drafts', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const { data, error } = await supabase
            .from('drafts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error fetching drafts:', error);
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// Get single draft by ID
app.get('/drafts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('drafts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error fetching draft:', error);
        res.status(500).json({ error: 'Failed to fetch draft' });
    }
});

// Create new draft
app.post('/drafts', async (req, res) => {
    const {
        userId,
        mediaUri,
        mediaType,
        thumbnailUri,
        description,
        commercialType,
        brandName,
        brandUrl,
        tags,
        useAILabel,
        uploadMode
    } = req.body;

    if (!userId || !mediaUri || !mediaType) {
        return res.status(400).json({ error: 'userId, mediaUri, and mediaType are required' });
    }

    try {
        const { data, error } = await supabase
            .from('drafts')
            .insert({
                user_id: userId,
                media_uri: mediaUri,
                media_type: mediaType,
                thumbnail_uri: thumbnailUri,
                description: description || null,
                commercial_type: commercialType || null,
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                tags: tags || [],
                use_ai_label: useAILabel || false,
                upload_mode: uploadMode || 'video',
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ [DRAFTS] Created draft ${data.id} for user ${userId}`);
        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error creating draft:', error);
        res.status(500).json({ error: 'Failed to create draft' });
    }
});

// Update draft
app.patch('/drafts/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Map frontend fields to database fields
    const dbUpdates = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.commercialType !== undefined) dbUpdates.commercial_type = updates.commercialType;
    if (updates.brandName !== undefined) dbUpdates.brand_name = updates.brandName;
    if (updates.brandUrl !== undefined) dbUpdates.brand_url = updates.brandUrl;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.useAILabel !== undefined) dbUpdates.use_ai_label = updates.useAILabel;

    try {
        const { data, error } = await supabase
            .from('drafts')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ [DRAFTS] Updated draft ${id}`);
        res.json({ success: true, data });
    } catch (error) {
        console.error('[DRAFTS] Error updating draft:', error);
        res.status(500).json({ error: 'Failed to update draft' });
    }
});

// Delete draft
app.delete('/drafts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('drafts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        console.log(`✅ [DRAFTS] Deleted draft ${id}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[DRAFTS] Error deleting draft:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

const DRAFT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function cleanupExpiredDraftsInternal() {
    const { data, error } = await supabase
        .from('drafts')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

    if (error) throw error;

    const count = data?.length || 0;
    console.log(`🧹 [DRAFTS] Cleaned up ${count} expired drafts`);
    return count;
}

function startDraftCleanupScheduler() {
    // Avoid relying on the client; run periodic cleanup in the backend.
    cleanupExpiredDraftsInternal().catch((error) => {
        console.error('[DRAFTS] Scheduled cleanup failed:', error);
    });
    setInterval(() => {
        cleanupExpiredDraftsInternal().catch((error) => {
            console.error('[DRAFTS] Scheduled cleanup failed:', error);
        });
    }, DRAFT_CLEANUP_INTERVAL_MS);
}

// Cleanup expired drafts (cron job endpoint)
app.post('/drafts/cleanup', async (req, res) => {
    try {
        const count = await cleanupExpiredDraftsInternal();
        res.json({ success: true, deletedCount: count });
    } catch (error) {
        console.error('[DRAFTS] Error cleaning up drafts:', error);
        res.status(500).json({ error: 'Failed to cleanup drafts' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
adminWss = new WebSocketServer({ server, path: '/admin/ws' });
adminWss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'admin-config-connected' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Video Backend running on http://0.0.0.0:${PORT}`);
    console.log(`🏠 Local Access: http://localhost:${PORT}`);
    console.log(`🌐 Network Access: http://192.168.0.138:${PORT}`);
    console.log(`📦 Target Bucket: "${process.env.R2_BUCKET_NAME}"`);
    console.log(`📡 Ready to accept uploads`);
    startDraftCleanupScheduler();
});
