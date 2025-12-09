# HLS Segmentleri: Depolama, Yaşam Döngüsü ve Erişim Stratejisi

## 🎯 Senin Sorduğun 4 Kritik Soru

> "Ahmet'e bu küçük dosyalar ile video gösterdik. Şimdi bunu tut Hasan buraya gelirse bunu göster diyebilecek miyiz?"

1. **HLS segmentleri ne kadar süre tutulacak?**
2. **Nerede tutulacak?**
3. **Her kullanıcı görebilecek mi?**
4. **Kullanıcıya özel gösterebilir miyiz?**

---

## 📦 MEVCUT MİMARİ (Şu Anki)

### 1. Depolama Yeri: Cloudflare R2 (Kalıcı)

```
┌─────────────────────────────────────────────────────┐
│  Cloudflare R2 (S3 Benzeri, Kalıcı Depolama)       │
├─────────────────────────────────────────────────────┤
│  Bucket: wizyclub-assets                            │
│  Public URL: https://pub-...r2.dev                  │
│                                                      │
│  /videos/                                           │
│    ├── video_abc123.mp4              (MP4 yöntemi) │
│    │                                                │
│    ├── video_xyz456/                 (HLS yöntemi) │
│    │   ├── playlist.m3u8                           │
│    │   ├── segment_000.ts                          │
│    │   ├── segment_001.ts                          │
│    │   └── ...                                     │
│                                                      │
│  /thumbs/                                           │
│    ├── thumb_abc123.jpg                            │
│    └── thumb_xyz456.jpg                            │
└─────────────────────────────────────────────────────┘
```

### 2. Metadata: Supabase (Veritabanı)

```sql
-- videos tablosu
CREATE TABLE videos (
    id UUID PRIMARY KEY,
    user_id TEXT,                    -- Video sahibi
    video_url TEXT,                  -- R2 URL (playlist.m3u8 veya video.mp4)
    thumbnail_url TEXT,              -- R2 thumbnail URL
    description TEXT,
    likes_count INT,
    views_count INT,
    created_at TIMESTAMP
);
```

### 3. Erişim: Public (Herkes)

```javascript
// Ahmet ve Hasan AYNI video URL'ini görür
const videoUrl = 'https://pub-...r2.dev/videos/abc123/playlist.m3u8';
```

**Sorun:**
- ❌ Ahmet'e özel içerik gösteremezsin
- ❌ Hasan farklı kalite göremez
- ❌ Kullanıcı bazlı optimizasyon yok

---

## 🎯 İSTENEN MİMARİ: Kullanıcı Bazlı Content Delivery

### Senaryo 1: "Ahmet ve Hasan Aynı Videoyu Görür (Public Feed)"

**TikTok/Instagram gibi:** Herkes aynı videoları görür.

```
┌──────────────────────────────────────────────────┐
│  Supabase: videos tablosu                        │
├──────────────────────────────────────────────────┤
│  id        video_url              visibility     │
│  abc123    r2.dev/video1/...      public        │
│  xyz456    r2.dev/video2/...      public        │
└──────────────────────────────────────────────────┘
         ↓
   Ahmet ve Hasan ikisi de bu listeyi görür
```

**Uygulama:**
```typescript
// SupabaseVideoDataSource.ts (Mevcut)
async getVideos(page: number, limit: number): Promise<Video[]> {
    const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('visibility', 'public')  // Herkese açık
        .order('created_at', { ascending: false });
    return data;
}
```

✅ **HLS segmentleri bir kez oluşturulur, herkes kullanır**
✅ **R2 depolama ekonomik** (tek kopya)
✅ **CDN cache verimli** (aynı dosya herkes için cache'lenir)

---

### Senaryo 2: "Ahmet'e Story Göster, Hasan Görmesin (Private)"

**Instagram Story gibi:** Kullanıcıya özel içerik.

```sql
-- stories tablosu
CREATE TABLE stories (
    id UUID PRIMARY KEY,
    user_id TEXT,                    -- Story sahibi
    video_url TEXT,                  -- HLS playlist URL
    visibility TEXT,                 -- 'public', 'followers', 'private'
    expires_at TIMESTAMP,            -- 24 saat sonra silinecek
    viewers JSONB                    -- Kimin gördüğü [user_ids]
);

-- story_views tablosu (Kimin gördüğünü takip et)
CREATE TABLE story_views (
    id UUID PRIMARY KEY,
    story_id UUID REFERENCES stories(id),
    viewer_id TEXT,                  -- Ahmet, Hasan, vb.
    viewed_at TIMESTAMP
);
```

**Uygulama:**
```typescript
// Ahmet story yükler
async uploadStory(userId: string, videoUrl: string) {
    await supabase.from('stories').insert({
        user_id: userId,
        video_url: videoUrl,
        visibility: 'followers',         // Sadece takipçiler
        expires_at: Date.now() + 24 * 3600 * 1000  // 24 saat
    });
}

// Hasan feed'e bakar
async getStoriesForUser(viewerId: string): Promise<Story[]> {
    const { data } = await supabase
        .from('stories')
        .select('*, story_views!left(*)')
        .or(`visibility.eq.public,user_id.in.(${followedUserIds})`)  // Public veya takip ettikleri
        .gt('expires_at', new Date().toISOString())  // Süresi dolmamış
        .is('story_views.viewer_id', null);  // Henüz izlememiş

    return data;
}
```

✅ **HLS segmentleri yine paylaşımlı** (aynı dosyalar)
✅ **Metadata ile erişim kontrolü** (Supabase)
✅ **24 saat sonra otomatik silinir** (Supabase RLS policy veya cron job)

---

### Senaryo 3: "Ahmet'e 480p, Hasan'a 720p Göster (Adaptive per User)"

**Netflix gibi:** Kullanıcı profiline göre kalite.

```sql
-- user_preferences tablosu
CREATE TABLE user_preferences (
    user_id TEXT PRIMARY KEY,
    preferred_quality TEXT,          -- 'auto', '720p', '480p', '360p'
    data_saver_mode BOOLEAN,         -- Mobil veri tasarrufu
    auto_play BOOLEAN
);
```

**R2'de Adaptive HLS:**
```
/videos/abc123/
  ├── master.m3u8               ← Ahmet ve Hasan ikisi de bunu çeker
  ├── 720p/
  │   ├── playlist.m3u8
  │   └── segment_000.ts...
  ├── 480p/
  │   ├── playlist.m3u8
  │   └── segment_000.ts...
  └── 360p/
      ├── playlist.m3u8
      └── segment_000.ts...
```

**Akıllı URL Routing (Backend):**
```javascript
// API endpoint: /api/video/:id/stream
app.get('/api/video/:id/stream', async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];  // Ahmet veya Hasan

    // Kullanıcı tercihi
    const { data: prefs } = await supabase
        .from('user_preferences')
        .select('preferred_quality')
        .eq('user_id', userId)
        .single();

    // Video URL
    const { data: video } = await supabase
        .from('videos')
        .select('video_url')
        .eq('id', id)
        .single();

    // Kalite seçimi
    let playlistUrl = video.video_url;  // master.m3u8
    if (prefs.preferred_quality !== 'auto') {
        playlistUrl = playlistUrl.replace('master.m3u8', `${prefs.preferred_quality}/playlist.m3u8`);
    }

    res.json({ url: playlistUrl });
});
```

**React Native (Frontend):**
```typescript
// Ahmet için
const response = await fetch(`/api/video/abc123/stream`, {
    headers: { 'x-user-id': 'ahmet' }
});
const { url } = await response.json();
// → https://r2.dev/videos/abc123/480p/playlist.m3u8

// Hasan için
const response = await fetch(`/api/video/abc123/stream`, {
    headers: { 'x-user-id': 'hasan' }
});
const { url } = await response.json();
// → https://r2.dev/videos/abc123/720p/playlist.m3u8
```

✅ **Segmentler yine paylaşımlı** (480p segmentleri tüm 480p kullanıcılar kullanır)
✅ **CDN cache maksimum verimli**
✅ **Kullanıcıya özel kalite kontrolü**

---

## ⏱️ YAŞAM DÖNGÜSÜ: Ne Kadar Süre Tutulur?

### Option 1: Kalıcı Depolama (Feed Videoları)

```javascript
// Upload edilen videolar kalıcı
await uploadToR2(videoPath, 'videos/abc123/playlist.m3u8');
// ↓
// Süresiz kalır (manuel silinmediği sürece)
// Kullanıcı silerse R2'den de silinir
```

**Lifecycle policy (R2 otomatik temizlik):**
```javascript
// R2 Bucket Lifecycle Rules
{
  "rules": [
    {
      "id": "delete-old-segments",
      "filter": { "prefix": "temp/" },
      "status": "Enabled",
      "expiration": { "days": 7 }  // 7 gün sonra sil
    }
  ]
}
```

### Option 2: Geçici Depolama (Stories)

```javascript
// Story yükle (24 saat)
await supabase.from('stories').insert({
    video_url: 'r2.dev/stories/xyz/playlist.m3u8',
    expires_at: Date.now() + 24 * 3600 * 1000
});

// Cron job: Her saat çalışır
async function cleanupExpiredStories() {
    const { data } = await supabase
        .from('stories')
        .select('video_url')
        .lt('expires_at', new Date().toISOString());

    // R2'den sil
    for (const story of data) {
        await deleteFromR2(story.video_url);  // Segmentleri temizle
        await supabase.from('stories').delete().eq('id', story.id);
    }
}
```

**Supabase Edge Function (Otomatik):**
```typescript
// supabase/functions/cleanup-stories.ts
Deno.cron("cleanup-stories", "0 * * * *", async () => {  // Her saat
    const { data: expiredStories } = await supabase
        .from('stories')
        .select('id, video_url')
        .lt('expires_at', new Date().toISOString());

    // R2'den sil ve Supabase'den kaldır
    await Promise.all(expiredStories.map(async (story) => {
        await deleteR2Object(story.video_url);
        await supabase.from('stories').delete().eq('id', story.id);
    }));
});
```

---

## 🔐 ERİŞİM KONTROLÜ: Kim Görebilir?

### 1. Public (Herkes)
```javascript
// R2 URL direkt erişilebilir
videoUrl: 'https://pub-...r2.dev/videos/abc123/playlist.m3u8'
```

### 2. Private (Signed URLs)
```javascript
// Backend oluşturur, 1 saat geçerli
const signedUrl = await generateSignedUrl('videos/abc123/playlist.m3u8', {
    expiresIn: 3600,  // 1 saat
    userId: 'ahmet'   // Sadece Ahmet erişebilir
});

// Frontend kullanır
<Video source={{ uri: signedUrl }} />
```

**R2 Signed URL:**
```javascript
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function generateSignedUrl(key, userId) {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    });

    const url = await getSignedUrl(r2, command, { expiresIn: 3600 });

    // Supabase'e log
    await supabase.from('video_access_logs').insert({
        video_key: key,
        user_id: userId,
        accessed_at: new Date()
    });

    return url;
}
```

### 3. Followers Only
```sql
-- Video sahibinin takipçileri
SELECT v.*
FROM videos v
JOIN follows f ON f.following_id = v.user_id
WHERE f.follower_id = 'hasan'
  AND v.visibility = 'followers';
```

---

## 💰 MALIYET ANALİZİ

### Senaryo: 10,000 kullanıcı, 1000 video, her biri 60 saniye

| Yöntem | Depolama | Egress (Transfer) | Maliyet/Ay |
|--------|----------|-------------------|------------|
| **MP4 Only** | 10 GB | 500 GB | $5 |
| **HLS (Single)** | 11 GB | 200 GB (cache sayesinde) | $3 |
| **Adaptive HLS** | 13 GB | 150 GB (kullanıcı bazlı) | $4 |

**Cloudflare R2 Fiyatlandırması:**
- Depolama: $0.015/GB/ay
- Egress: **$0** (ücretsiz! 🎉)
- İşlem: $0.36/milyon istek

---

## 🎯 ÖNERİM: WizyClub İçin En İyi Strateji

```javascript
// 1. FEED VİDEOLARI: Adaptive HLS (Public)
{
    type: 'feed',
    storage: 'R2 (kalıcı)',
    format: 'Adaptive HLS (720p/480p/360p)',
    access: 'Public + CDN cache',
    lifecycle: 'Sınırsız'
}

// 2. STORIES: Simple HLS (Followers Only)
{
    type: 'story',
    storage: 'R2 (geçici)',
    format: 'Simple HLS (480p)',
    access: 'Followers + Signed URLs',
    lifecycle: '24 saat sonra otomatik sil'
}

// 3. PRİVATE VİDEO: No HLS (Direct MP4)
{
    type: 'private',
    storage: 'R2 (kalıcı)',
    format: 'MP4 (tek dosya)',
    access: 'Signed URL (1 saat)',
    lifecycle: 'Kullanıcı silinceye kadar'
}
```

---

## ✅ CEVAPLAR

**1. Ne kadar süre tutulacak?**
- Feed videoları: **Sınırsız** (kullanıcı silinceye kadar)
- Stories: **24 saat** (otomatik temizlik)

**2. Nerede tutulacak?**
- **R2** (video segmentleri) + **Supabase** (metadata)

**3. Her kullanıcı görebilecek mi?**
- **Public**: Evet, herkes
- **Private**: Hayır, sadece signed URL ile
- **Followers**: Sadece takipçiler

**4. Ahmet'e X, Hasan'a Y gösterebilir miyiz?**
- **Evet!** Supabase metadata ile kontrol edilir
- Segmentler paylaşımlı (ekonomik)
- Kullanıcı bazlı playlist routing
