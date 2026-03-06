# Video URL Incident Report
**Tarih:** 28 Aralık 2025  
**Durum:** ✅ Çözüldü

---

## 🔴 Sorun Özeti

Mobil uygulamada videolar yüklenemiyordu. Telefonda "current source: uri" hatası alınıyordu.

---

## 🔍 Kök Neden Analizi

### 1. Backend `.env` Dosyası Eksikti

Backend sunucusu (`d:\WizyClub\backend\server.js`) çalışırken `.env` dosyası bulunamadı. Bu dosya `.gitignore` tarafından ignore edildiği için Git'e commit edilmemişti ve bir noktada kaybolmuştu.

**Sonuç:** Sunucu başlatıldığında environment variable'lar `undefined` olarak yüklendi:
```
R2_PUBLIC_URL = undefined
R2_BUCKET_NAME = undefined
SUPABASE_KEY = undefined
```

### 2. Video Upload Sırasında URL'ler Bozuldu

Yeni video yüklendiğinde `server.js` şu şekilde URL oluşturuyordu:
```javascript
videoUrl = `${process.env.R2_PUBLIC_URL}/${mp4Key}`;
// Beklenen: https://wizy-r2-proxy.tasdemir-umit.workers.dev/videos/123/master.mp4
// Gerçek:   undefined/videos/123/master.mp4
```

Bu bozuk URL'ler Supabase `videos` tablosuna kaydedildi.

### 3. Mobil Uygulama Crash

`VideoLayer.tsx` bu URL'leri alıp `react-native-video` componentine gönderdiğinde:
```javascript
source={{ uri: "undefined/videos/..." }}
```

Player geçersiz URI'yi parse edemedi ve crash oluştu.

---

## ❌ Başarısız Düzeltme Girişimleri

### Girişim 1: `repair-db.js` Script'i
**Ne yapıldı:** `undefined` içeren URL'leri `REPLACE()` ile düzeltmeye çalışıldı.  
**Neden başarısız:** Script doğru çalıştı ama yanlış path yapısı kullanıldı (`/media/{userId}/videos/{uuid}/` vs `/videos/{timestamp}/`).

### Girişim 2: REST API PATCH
**Ne yapıldı:** Supabase REST API üzerinden `PATCH` request'leri gönderildi.  
**Neden başarısız:** `videos` tablosunda RLS (Row Level Security) aktifti ve anonim kullanıcı güncelleme yapamıyordu. Request'ler sessizce başarısız oldu (204 No Content döndü ama veri değişmedi).

### Girişim 3: Yanlış R2 Path Mapping
**Ne yapıldı:** URL'ler `/media/{userId}/videos/{uuid}/master.mp4` formatına güncellendi.  
**Neden başarısız:** R2 bucket'ta dosyalar bu yapıda değildi. Gerçek yapı `/videos/{timestamp}/master.mp4` idi.

---

## ✅ Başarılı Çözüm

### Adım 1: R2 Bucket İçeriği Keşfedildi
```
Bucket: wizyclub-assets
├── videos/1766009656643/master.mp4
├── videos/1766011111754/master.mp4
├── videos/1766012583186/master.mp4
├── thumbs/1766009656643.jpg
├── thumbs/1766011111754.jpg
└── thumbs/1766012583186.jpg
```

### Adım 2: Timestamp → UUID Eşleşmesi Yapıldı
| Supabase UUID | created_at | R2 Timestamp |
|---------------|------------|--------------|
| 027fffc0-3b0c-461f-84fb-a3b47fbbd652 | 2025-12-17T22:14:52 | 1766009656643 |
| 42c5ed0a-7d54-4f2a-a641-c79333403c0e | 2025-12-17T22:38:50 | 1766011111754 |
| 91550dc8-3f5f-4b42-894f-ef2a667f6106 | 2025-12-17T23:03:21 | 1766012583186 |

### Adım 3: SQL ile Direkt Güncelleme
RLS'yi bypass etmek için MCP üzerinden direkt SQL çalıştırıldı:
```sql
UPDATE videos SET 
  video_url = 'https://wizy-r2-proxy.tasdemir-umit.workers.dev/videos/1766009656643/master.mp4',
  thumbnail_url = 'https://wizy-r2-proxy.tasdemir-umit.workers.dev/thumbs/1766009656643.jpg'
WHERE id = '027fffc0-3b0c-461f-84fb-a3b47fbbd652';
-- (diğer 2 video için de aynısı)
```

### Adım 4: Backend `.env` Restore Edildi
```env
PORT=3000
SUPABASE_URL=https://snpckjrjmwxwgqcqghkl.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
R2_ACCOUNT_ID=<REDACTED>
R2_ACCESS_KEY_ID=<REDACTED>
R2_SECRET_ACCESS_KEY=<REDACTED>
R2_BUCKET_NAME=<REDACTED_BUCKET>
R2_PUBLIC_URL=<REDACTED_PUBLIC_URL>
```

### Adım 5: Kod Değişiklikleri Geri Alındı
`SupabaseVideoDataSource.ts` ve `VideoLayer.tsx` dosyalarına eklenen debug logları ve fallback mekanizmaları `git checkout` ile geri alındı.

---

## 📋 Öğrenilen Dersler

1. **`.env` dosyasını yedekle:** `.env` gitignore'da olduğu için kaybolabilir. `.env.example` oluştur ve gerçek değerleri güvenli bir yerde sakla.

2. **RLS'yi test et:** Supabase REST API'si RLS'ye tabidir. Admin işlemleri için service role key veya MCP/SQL kullan.

3. **R2 yapısını dokümante et:** Dosya yolları farklı formatlarda olabilir. Bucket yapısını bir yerde belgele.

4. **Hata mesajlarını logla:** `VideoLayer.tsx`'de daha iyi error handling eklenebilir.

---

## 📁 Etkilenen Dosyalar

| Dosya | Ne Yapıldı | Geri Alındı mı? |
|-------|-----------|-----------------|
| `backend/.env` | Yeniden oluşturuldu | ❌ (kalıcı) |
| `backend/server.js` | Debug log eklendi, listen portu güncellendi | ❌ (kalıcı) |
| `mobile/src/data/datasources/SupabaseVideoDataSource.ts` | hlsUrl mapping eklendi | ✅ Geri alındı |
| `mobile/src/presentation/components/feed/VideoLayer.tsx` | Debug log ve fallback eklendi | ✅ Geri alındı |
| Supabase `videos` tablosu | URL'ler düzeltildi | ❌ (kalıcı) |

---

## 🛡️ Önleme Stratejileri

1. **Backend başlangıcında env check:**
```javascript
const required = ['R2_PUBLIC_URL', 'SUPABASE_KEY', 'R2_BUCKET_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} is not defined!`);
    process.exit(1);
  }
}
```

2. **Video URL validation:**
```javascript
if (!video.videoUrl || video.videoUrl.startsWith('undefined')) {
  console.error('Invalid video URL detected:', video.id);
  // Skip or report this video
}
```

3. **`.env.example` oluştur:**
```
PORT=3000
SUPABASE_URL=
SUPABASE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```
