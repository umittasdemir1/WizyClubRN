# Backend Code Review — Clean Architecture & Refactoring Raporu

**Tarih:** 2 Mart 2026 (Guncelleme: son uncommitted degisiklikler dahil)
**Kapsam:** `/backend` dizini
**Mevcut Durum:** Tum backend tek bir `server.js` dosyasinda (~2992 satir)

---

## Ozet

Backend, ciddi Clean Architecture ihlalleri barindiriyor. Tum route handler'lar, is mantigi, veritabani erisimi, dosya isleme ve altyapi kodu **tek bir dosyada** birlestirilmis. Katmanlar arasi ayrim yok, test yazilabilirlik sifira yakin, kod tekrari yaygin.

### Son Degisikliklerdeki Olumlu Gelismeler

- `PATCH /videos/:id` endpoint'ine subtitle mutation destegi eklendi (satir 1698-1824)
- `normalizeSubtitleMutationInput`, `applySubtitleMutationForVideo`, `normalizeSubtitleStyleInput`, `normalizeSubtitlePresentationInput`, `parseStoredSubtitlePayload`, `createHttpError` gibi yardimci fonksiyonlar eklendi (satir 2478-2771)
- `PUT /videos/:id/subtitles` endpoint'i refactor edilerek yeni helper fonksiyonlari kullanir hale getirildi
- Yeni `DELETE /videos/:id/subtitles` endpoint'i eklendi (satir 2919-2968)
- `POST /videos/:id/subtitles/generate` endpoint'ine auth ve sahiplik kontrolu eklendi (satir 2790-2821)
- Error response'larda `error.statusCode` destegi eklendi (satir 1824, 2915, 2966)

### Son Degisikliklerdeki Yeni Sorunlar

- Auth kod tekrari 7'den **9'a** cikti (2 yeni endpoint daha eklendi)
- Video sahiplik kontrolu tekrari 3'ten **5'e** cikti
- Yeni fonksiyonlar hala `server.js` icinde — dosya 2876'dan **2992 satira** buyudu
- Subtitle helper fonksiyonlari iyi yazilmis ama yanlis katmanda (route dosyasinda)

---

## 1. KRITIK: Monolitik Yapi (server.js — 2992 satir)

Tum uygulama tek dosyada:
- 27 endpoint tanimi (onceki: 25 — yeni: `DELETE /videos/:id/subtitles`, subtitle generate'e auth eklendi)
- Express middleware konfigurasyon
- Logging utility fonksiyonlari
- FFmpeg medya isleme
- R2/S3 storage operasyonlari
- Supabase veritabani sorgulari
- Zamanlaicilar (story cleanup, draft cleanup)
- Subtitle normalizasyon/mutation fonksiyonlari (~294 satir yeni eklenen)

**Onerilen klasor yapisi:**
```
/backend/src
  /config              -> Konfigurasyon, environment validasyonu, sabitler
  /entities            -> Domain modelleri (Video, Story, Draft, Subtitle)
  /usecases            -> Is mantigi (UploadVideoUseCase, DeleteStoryUseCase vb.)
  /repositories        -> Veritabani erisim katmani (VideoRepository, StoryRepository, SubtitleRepository)
  /adapters
    /storage           -> R2StorageAdapter
    /media             -> VideoProcessor, ImageProcessor (FFmpeg)
  /services            -> SubtitleMutationService (normalize + apply fonksiyonlari)
  /middleware          -> Auth, validation, error handler, logging
  /routes              -> Route tanimlari (videoRoutes, storyRoutes, draftRoutes, subtitleRoutes)
  /utils               -> Yardimci fonksiyonlar (createHttpError, safeParseJsonArray)
  server.js            -> Sadece app baslatma ve route baglama
```

---

## 2. KRITIK: Katman Ayrimi Yok (Clean Architecture Ihlali)

### 2.1 Is Mantigi Route Handler'larda

**`/upload-hls` endpoint (satir 548-1000, ~450 satir):**
Tek bir endpoint icinde 11 farkli sorumluluk:
1. Dosya validasyonu ve parse etme
2. Query parameter parsing (tags, commercial type vb.)
3. Boyut cikarma ve normalizasyon
4. Video kirpma (trim)
5. Video transcode/optimizasyon
6. Thumbnail olusturma
7. Sprite sheet olusturma
8. R2 upload orchestration
9. Veritabani insert (videos tablosu)
10. Hashtag insert
11. Altyazi tetikleme

**Olmasi gereken:**
```js
// routes/videoRoutes.js
router.post('/upload-hls', authMiddleware, upload.array('video', 10), async (req, res) => {
    const dto = new UploadVideoDTO(req.body, req.files);
    dto.validate();
    const result = await uploadVideoUseCase.execute(dto, req.user);
    res.json({ success: true, data: result });
});
```

### 2.2 Veritabani Sorgulari Dogrudan Route'larda

**Ornek (satir 782-850):**
```js
const { data, error } = await supabase
    .from('videos')
    .insert({ user_id: userId, video_url: mediaUrls[0].url, /* +20 alan */ })
    .select();
```

Bu sorgu bir `VideoRepository.save(video)` cagrisi olmali.

### 2.3 Altyapi Kodu (FFmpeg, R2) Route'larda

- FFmpeg operasyonlari dogrudan route handler'da (satir 660-728)
- R2 upload cagrilari route icinde (satir 703, 724, 756)
- Bunlar `VideoProcessor` ve `R2StorageAdapter` siniflarina tasinmali

### 2.4 YENI: Subtitle Helper Fonksiyonlari Yanlis Katmanda

Son degisikliklerle eklenen fonksiyonlar:
- `normalizeSubtitleMutationInput` (satir 2610-2672)
- `applySubtitleMutationForVideo` (satir 2674-2771)
- `normalizeSubtitleStyleInput` (satir 2540-2578)
- `normalizeSubtitlePresentationInput` (satir 2478-2490)
- `parseStoredSubtitlePayload` (satir 2580-2608)
- `createHttpError` (satir 2536-2540)

Bu fonksiyonlar iyi yapilandirilmis ve tekrar kullanilabilir (ornegin `PATCH /videos/:id` ve `PUT /videos/:id/subtitles` ayni helper'lari kullaniyor). Ancak hala `server.js` icindeler.

**Tasinmasi gereken yerler:**
```
normalizeSubtitleStyleInput      -> /services/SubtitleMutationService.js
normalizeSubtitlePresentationInput -> /services/SubtitleMutationService.js
normalizeSubtitleMutationInput   -> /services/SubtitleMutationService.js
applySubtitleMutationForVideo    -> /repositories/SubtitleRepository.js
parseStoredSubtitlePayload       -> /utils/subtitleParser.js
createHttpError                  -> /utils/httpError.js
```

---

## 3. KRITIK: Kod Tekrari

### 3.1 Authentication — 9 yerde tekrar eden ayni kod

Asagidaki blok **9 farkli endpoint'te** birebir kopyalanmis:

```js
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
}
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
}
```

**Tekrar eden yerler:**
| Endpoint | Satir |
|----------|-------|
| `POST /upload-story` | 1005 |
| `DELETE /stories/:id` | 1378 |
| `POST /stories/:id/restore` | 1458 |
| `GET /stories/recently-deleted` | 1523 |
| `PATCH /videos/:id` | 1657 |
| `DELETE /videos/:id` | 1837 |
| `POST /videos/:id/subtitles/generate` | 2790 |
| `PUT /videos/:id/subtitles` | 2872 |
| `DELETE /videos/:id/subtitles` | 2921 |

**Cozum — Tek bir middleware:**
```js
// middleware/authMiddleware.js
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
}

// Kullanim:
app.patch('/videos/:id', requireAuth, videoController.update);
app.delete('/videos/:id/subtitles', requireAuth, subtitleController.delete);
```

### 3.2 Video Sahiplik Kontrolu — 5 yerde tekrar

```js
const { data: video } = await supabase.from('videos').select('id, user_id').eq('id', videoId).single();
if (!video) return res.status(404).json({ error: 'Video not found' });
if (video.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
```

**Tekrar eden yerler:**
| Endpoint | Satir |
|----------|-------|
| `PATCH /videos/:id` | 1671-1683 |
| `DELETE /videos/:id` | 1850-1862 |
| `POST /videos/:id/subtitles/generate` | 2809-2821 |
| `PUT /videos/:id/subtitles` | 2887-2898 |
| `DELETE /videos/:id/subtitles` | 2941-2953 |

**Cozum — Middleware veya helper:**
```js
// middleware/requireVideoOwnership.js
async function requireVideoOwnership(req, res, next) {
    const videoId = req.params.id;
    const { data: video, error } = await supabase
        .from('videos')
        .select('id, user_id, video_url, post_type')
        .eq('id', videoId)
        .single();
    if (error || !video) return res.status(404).json({ error: 'Video not found' });
    if (video.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    req.video = video;
    next();
}

// Kullanim:
app.put('/videos/:id/subtitles', requireAuth, requireVideoOwnership, subtitleController.update);
```

### 3.3 JSON Parse Validasyonu — 5+ yerde tekrar

Ayni try-catch-parse kalibi:

| Konum | Satir | Ne parse ediliyor |
|-------|-------|-------------------|
| `/upload-hls` | 566-572 | tags |
| `/upload-hls` | 574-582 | taggedPeople |
| `/upload-hls` | 605-615 | manualSubtitles |
| `/upload-story` | 1007-1015 | taggedPeople |
| `POST /drafts` | 2224-2248 | tags |

**Cozum — Utility fonksiyon:**
```js
function safeParseJsonArray(value, fallback = []) {
    if (!value || (typeof value === 'string' && !value.trim())) return fallback;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}
```

### 3.4 Upload Isleme Tekrari — `/upload-hls` vs `/upload-story`

Iki endpoint arasinda ~%40 kod ortaktir:
- Boyut cikarma ve normalizasyon
- Thumbnail olusturma
- MediaURL building
- Dosya cleanup

Bunlar `MediaProcessingService` icinde birlestirilmeli.

---

## 4. YUKSEK: Dependency Injection Yok

### 4.1 Servisler Concrete Implementation'a Bagimli

```js
// satir 219
hlsService = new HlsService(r2, process.env.R2_BUCKET_NAME, ...);
// satir 225
subtitleService = new SubtitleService(supabase, ...);
```

- HlsService dogrudan S3Client'a bagimli
- SubtitleService dogrudan Supabase client'a bagimli
- Mock yapilamiyor, test yazilamiyor

**Cozum:**
```js
// Interface tanimla
class IStorageAdapter {
    async upload(filePath, key, contentType) { throw new Error('Not implemented'); }
    async delete(key) { throw new Error('Not implemented'); }
}

// Concrete implementation
class R2StorageAdapter extends IStorageAdapter {
    constructor(s3Client, bucketName) { ... }
    async upload(filePath, key, contentType) { ... }
}

// Use case'e enjekte et
const uploadUseCase = new UploadVideoUseCase(videoRepo, storageAdapter, mediaProcessor);
```

### 4.2 Global Mutable State

```js
// satir 229-232
const uploadProgress = new Map();
const subtitleGenerationInProgress = new Set();
const subtitleGenerationCooldownMs = 30_000;
const subtitleLastTriggeredAt = new Map();
```

4 farkli concern tek yerde, kapsulleme yok, race condition riski var.

**Cozum — Service sinifina tasi:**
```js
class UploadProgressService {
    #progress = new Map();
    #inProgress = new Set();
    #lastTriggered = new Map();
    #cooldownMs;

    constructor(cooldownMs = 30000) { this.#cooldownMs = cooldownMs; }
    updateProgress(id, stage, percent) { ... }
    canTrigger(videoId) { ... }
}
```

---

## 5. YUKSEK: Error Handling Tutarsizliklari

### 5.1 Farkli Hata Kaliplari

```js
// Kalip 1: throw
if (updateError) throw updateError;

// Kalip 2: return res
if (!video) return res.status(404).json({ error: 'Not found' });

// Kalip 3: log ve devam et (sessiz hata)
if (vhError) logLine('WARN', 'PATCH', 'Failed to insert video_hashtags', ...);
// -> endpoint yine success doner!
```

### 5.2 Sessiz Hatalar (Silent Failures)

**Satir 1746, 1761, 1771:** Hashtag ve tag islemleri basarisiz olsa bile endpoint `{ success: true }` donuyor.

### 5.3 Hata Konteksti Eksik

```js
// Mevcut:
res.status(500).json({ error: error.message });

// Olmasi gereken:
res.status(500).json({
    error: error.message,
    code: 'VIDEO_UPDATE_FAILED',
    requestId: req.id
});
```

### 5.4 Global Error Handler Middleware Yok

**Cozum:**
```js
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    logLine('ERR', 'GLOBAL', err.message, { stack: err.stack, path: req.path });
    res.status(statusCode).json({
        error: err.message,
        code: err.code || 'INTERNAL_ERROR',
    });
}

// server.js — en sonda
app.use(errorHandler);
```

### 5.5 OLUMLU: `createHttpError` Yardimci Fonksiyonu Eklendi

Son degisikliklerle `createHttpError(statusCode, message)` fonksiyonu eklendi (satir 2536-2540). Bu iyi bir adim — hata nesnelerine `statusCode` eklenmesi, catch bloklarinda `error?.statusCode || 500` kullanilmasini sagliyor. Ancak bu fonksiyon henuz sadece subtitle fonksiyonlarinda kullaniliyor, diger endpoint'lere de yayginlastirilmali.

---

## 6. YUKSEK: Validasyon Eksiklikleri

### 6.1 Validasyon Framework'u Yok

Manuel validasyon her yere dagilmis, tutarsiz ve tekrarli.

**Cozum — Joi veya Zod kullan:**
```js
const Joi = require('joi');

const uploadVideoSchema = Joi.object({
    description: Joi.string().max(2000).optional(),
    tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
    commercialType: Joi.string().optional(),
    brandName: Joi.string().optional(),
    brandUrl: Joi.string().uri().optional(),
    taggedPeople: Joi.alternatives().try(Joi.string(), Joi.array()),
});

// Middleware olarak:
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });
        req.validated = value;
        next();
    };
}
```

### 6.2 Multer Dosya Boyutu Limiti Yok

```js
// Mevcut (satir 148):
const upload = multer({ dest: 'temp_uploads/' });
// -> Boyut limiti yok! Saldirgan dev dosya yukleyebilir.

// Olmasi gereken:
const upload = multer({
    dest: 'temp_uploads/',
    limits: { fileSize: 5 * 1024 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) => {
        const allowed = ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png'];
        cb(null, allowed.includes(file.mimetype));
    }
});
```

### 6.3 OLUMLU: Subtitle Input Validasyonu Eklendi

Son degisikliklerle subtitle verisi icin kapsamli validasyon eklendi:
- `normalizeSubtitleStyleInput`: fontSize (12-42 siniri), textAlign, fontFamily, fontWeight, textCase icin whitelist validasyonu
- `normalizeSubtitlePresentationInput`: leftRatio, topRatio, widthRatio, heightRatio icin numerik validasyon
- `normalizeSubtitleMutationInput`: operation, segments, language icin validasyon
- Allowed values icin Set/Map yapilari kullanilmis (`SUBTITLE_ALLOWED_FONT_FAMILIES`, `SUBTITLE_ALLOWED_ALIGNMENTS` vb.)

Bu yaklasim diger endpoint'ler icin de ornek alinmali.

---

## 7. ORTA: Konfigurasyon Yonetimi

### 7.1 Magic Number ve String'ler

| Deger | Satir | Anlami |
|-------|-------|--------|
| `'public, max-age=31536000, immutable'` | 190 | 1 yil cache |
| `30_000` | 231 | Subtitle cooldown ms |
| `3000` | 250 | Segment suresi ms |
| `30 * 60 * 1000` | 2315 | Story cleanup interval |
| `200` | 2317 | Batch silme boyutu |
| `24 * 60 * 60 * 1000` | 2323 | Draft retention suresi |
| `12` ve `42` | 2558 | Subtitle min/max fontSize |
| `18` | 2558 | Subtitle default fontSize |

**Cozum:**
```js
// config/constants.js
module.exports = {
    CDN_CACHE_HEADER: 'public, max-age=31536000, immutable',
    SUBTITLE_COOLDOWN_MS: 30_000,
    SUBTITLE_SEGMENT_DURATION_MS: 3000,
    SUBTITLE_MIN_FONT_SIZE: 12,
    SUBTITLE_MAX_FONT_SIZE: 42,
    SUBTITLE_DEFAULT_FONT_SIZE: 18,
    STORY_CLEANUP_INTERVAL_MS: 30 * 60 * 1000,
    STORY_CLEANUP_BATCH_SIZE: 200,
    DRAFT_RETENTION_MS: 24 * 60 * 60 * 1000,
};
```

### 7.2 Environment Variable Validasyonu Yok

Sunucu, gerekli env variable'lar eksik olsa bile basliyor. Hatalar ancak runtime'da ortaya cikiyor.

**Cozum:**
```js
function validateEnv() {
    const required = [
        'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
        'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET_NAME', 'R2_PUBLIC_URL',
    ];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
}
```

---

## 8. ORTA: Isimlendirme Tutarsizliklari

### 8.1 camelCase vs snake_case Karisimi

- JavaScript degiskenler: `videoUrl`, `thumbnailUrl` (camelCase)
- Veritabani sutunlari: `video_url`, `thumbnail_url` (snake_case)
- API yanitlarinda ikisi karisik kullaniliyor

**Cozum — Mapper katmani:**
```js
class VideoMapper {
    static toDomain(row) {
        return { id: row.id, userId: row.user_id, videoUrl: row.video_url };
    }
    static toDatabase(video) {
        return { id: video.id, user_id: video.userId, video_url: video.videoUrl };
    }
}
```

### 8.2 Fonksiyon Isimlendirmesi Tutarsiz

- `cleanupStoryAssetsFromR2` -> altyapi detayi fonksiyon adinda (R2)
- `buildStoryCleanupTargets` -> daha iyi
- `parseAspectRatioValue` -> iyi
- `applySubtitleMutationForVideo` -> iyi (yeni eklenen)
- `normalizeSubtitleStyleInput` -> iyi (yeni eklenen)

---

## 9. ORTA: Route Organizasyonu

### 9.1 Tum Route'lar Tek Dosyada

27 endpoint sirali olarak tek dosyada tanimli, mantiksal gruplama yok.

**Cozum — Domain bazli ayir:**
```js
// routes/videoRoutes.js     -> /videos/:id (PATCH, DELETE), /upload-hls
// routes/storyRoutes.js     -> /stories/:id, /upload-story, /stories/cleanup
// routes/draftRoutes.js     -> /drafts, /drafts/:id
// routes/subtitleRoutes.js  -> /videos/:id/subtitles (GET, PUT, DELETE), /videos/:id/subtitles/generate, /stt-preview
// routes/systemRoutes.js    -> /health, /docs, /migrate-assets
```

### 9.2 API Versiyonlama Yok

Breaking change'ler tum client'lari etkiler. `/api/v1/...` seklinde versiyonlama eklenmeli.

---

## 10. ORTA: Test Altyapisi Yok

### 10.1 Hic Test Yok

```json
// package.json satir 9:
"test": "echo \"Error: no test specified\" && exit 1"
```

### 10.2 Kod Test Edilebilir Degil

- Global state (Map, Set) test arasi reset edilemiyor
- Hard-coded dependency'ler mock yapilamiyor
- Route handler'lar is mantigi icerdigi icin izole test imkansiz

### 10.3 OLUMLU: Helper Fonksiyonlar Test Edilebilir

Son eklenen `normalizeSubtitleMutationInput`, `normalizeSubtitleStyleInput`, `parseStoredSubtitlePayload` gibi pure fonksiyonlar aslinda test edilebilir yapida. Ancak `server.js` icinde oldugu icin import edilemiyor. Ayri dosyalara cikarilirsa hemen unit test yazilabilir.

---

## 11. DUSUK: Eksik Graceful Shutdown

Sunucu kapanirken:
- Acik baglantilar kapatilmiyor
- Cleanup scheduler'lar durdurulumuyor
- Islemdeki request'ler tamamlanmiyor

---

## 12. DUSUK: Transaction Destegi Yok

Cok adimli islemlerde rollback yok:
1. Video insert (basarili)
2. Hashtag insert (basarisiz) -> video kaydi geri alinmiyor
3. Subtitle tetikleme (basarisiz) -> yukaridakiler geri alinmiyor

Yeni eklenen `PATCH /videos/:id` akisi da ayni sorunu tasiyor:
1. Video metadata guncelleme (basarili)
2. Hashtag guncelleme (basarisiz) -> metadata geri alinmiyor
3. Subtitle mutation (basarisiz) -> yukaridakiler geri alinmiyor

---

## Ozet Tablo

| Kategori | Bulgu Sayisi | Oncelik | Son Degisiklik Etkisi |
|----------|:------------:|---------|-----------------------|
| Monolitik yapi (tek dosya) | 1 | KRITIK | Kotulesli (2876 -> 2992 satir) |
| Katman ayrimi ihlalleri | 4 | KRITIK | Yeni fonksiyonlar iyi ama yanlis katmanda |
| Kod tekrari | 4 | YUKSEK | Kotulesli (auth: 7 -> 9, sahiplik: 3 -> 5) |
| Dependency Injection eksik | 2 | YUKSEK | Degismedi |
| Error handling tutarsizliklari | 5 | YUKSEK | Kismen iyilesti (createHttpError eklendi) |
| Validasyon eksiklikleri | 3 | YUKSEK | Kismen iyilesti (subtitle validasyonu eklendi) |
| Konfigurasyon yonetimi | 2 | ORTA | Yeni magic number'lar eklendi (fontSize 12, 42, 18) |
| Isimlendirme tutarsizliklari | 2 | ORTA | Degismedi |
| Route organizasyonu | 2 | ORTA | Kotulesli (25 -> 27 endpoint) |
| Test altyapisi yok | 3 | ORTA | Yeni fonksiyonlar test edilebilir yapida ama erisilemiyor |
| Graceful shutdown eksik | 1 | DUSUK | Degismedi |
| Transaction destegi yok | 1 | DUSUK | Kotulesli (PATCH akisi da etkileniyor) |
| **TOPLAM** | **30** | — | — |

---

## Onerilen Aksiyon Plani

### Faz 1 — Temel Altyapi (En Yuksek Oncelik)
1. **Auth middleware olustur** — 9 tekrari tek middleware'e indirge
2. **Video sahiplik middleware olustur** — 5 tekrari ortadan kaldir
3. **Global error handler middleware ekle** — `createHttpError` ile uyumlu
4. **Konfigurasyon dosyasi olustur** (constants + env validation)
5. **`safeParseJsonArray` utility fonksiyonunu cikar** — 5+ tekrari gider

### Faz 2 — Katman Ayrimi
6. **Subtitle helper fonksiyonlarini ayir** — `normalizeSubtitleMutationInput`, `applySubtitleMutationForVideo`, `normalizeSubtitleStyleInput`, `parseStoredSubtitlePayload` -> `/services/SubtitleMutationService.js`
7. **Repository katmani olustur** (VideoRepository, StoryRepository, DraftRepository, SubtitleRepository)
8. **Route dosyalarini domain bazli ayir** (videoRoutes, storyRoutes, subtitleRoutes, draftRoutes, systemRoutes)
9. **MediaProcessingService olustur** (FFmpeg operasyonlarini topla)
10. **R2StorageAdapter olustur**

### Faz 3 — Is Mantigi Ayrimi
11. **Use case'ler olustur** (UploadVideoUseCase, DeleteVideoUseCase, EditVideoUseCase vb.)
12. **DTO ve validasyon semalari olustur** (Joi/Zod)
13. **`/upload-hls` ve `/upload-story` ortak kodunu birlestir**
14. **Mapper katmani ekle** (DB <-> Domain)

### Faz 4 — Kalite
15. **Jest test altyapisi kur**
16. **Subtitle helper fonksiyonlari icin unit test yaz** (en kolay baslangic noktasi)
17. **Graceful shutdown ekle**
18. **API versiyonlama ekle**
