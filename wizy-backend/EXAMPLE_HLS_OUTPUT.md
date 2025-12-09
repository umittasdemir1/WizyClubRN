# FFMpeg HLS Çıktısı Örneği

## 1️⃣ Mevcut Yöntem: Tek MP4

```bash
# Komut
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -vf scale=720:-2 -c:a aac output.mp4

# Çıktı
output.mp4          # 10 MB (tüm video)
```

**Kullanıcı deneyimi:**
- 10 MB tamamen indirilmeden video başlamaz
- Seek (ileri sarma) yavaş
- İnternet yavaşlarsa takılır

---

## 2️⃣ HLS Yöntemi: Segmentler

```bash
# Komut (aynı FFMpeg!)
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 23 -vf scale=720:-2 -c:a aac \
  -f hls -hls_time 6 \
  -hls_segment_filename "segment_%03d.ts" \
  playlist.m3u8

# Çıktı
playlist.m3u8       # 1 KB (index dosyası)
segment_000.ts      # 200 KB (0-6 saniye)
segment_001.ts      # 200 KB (6-12 saniye)
segment_002.ts      # 200 KB (12-18 saniye)
...
segment_049.ts      # 200 KB (son segment)
```

### `playlist.m3u8` İçeriği:

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6.000000,
segment_000.ts
#EXTINF:6.000000,
segment_001.ts
#EXTINF:6.000000,
segment_002.ts
#EXTINF:6.000000,
segment_003.ts
#EXT-X-ENDLIST
```

**Kullanıcı deneyimi:**
- ✅ İlk 400 KB indirildikten sonra video başlar (10 MB yerine!)
- ✅ Seek hızlı: Sadece hedef segment indirilir
- ✅ Buffering akıllı: 2-3 segment önden yüklenir

---

## 3️⃣ Adaptive HLS: Çoklu Kalite

```bash
# Komut
ffmpeg -i input.mp4 \
  -map 0:v -map 0:a -c:v:0 libx264 -b:v:0 2800k -s:v:0 1280x720 \
  -map 0:v -map 0:a -c:v:1 libx264 -b:v:1 1400k -s:v:1 854x480 \
  -map 0:v -map 0:a -c:v:2 libx264 -b:v:2 800k -s:v:2 640x360 \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
  -f hls -hls_time 6 \
  -master_pl_name master.m3u8 \
  stream_%v.m3u8

# Çıktı
master.m3u8         # Ana playlist (tüm kaliteleri listeler)
stream_0.m3u8       # 720p playlist
stream_1.m3u8       # 480p playlist
stream_2.m3u8       # 360p playlist
stream_0_000.ts     # 720p segment 1
stream_0_001.ts     # 720p segment 2
stream_1_000.ts     # 480p segment 1
stream_1_001.ts     # 480p segment 2
stream_2_000.ts     # 360p segment 1
...
```

### `master.m3u8` İçeriği:

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2928000,RESOLUTION=1280x720
stream_0.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1496000,RESOLUTION=854x480
stream_1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=864000,RESOLUTION=640x360
stream_2.m3u8
```

**Kullanıcı deneyimi:**
- ✅ WiFi'de 720p otomatik
- ✅ Mobil data'da 480p otomatik
- ✅ İnternet yavaşlarsa 360p'ye geçer (video durmaz!)
- ✅ Video player otomatik kalite seçer

---

## 📱 React Native Video Kullanımı

### Mevcut (MP4):
```jsx
<Video
  source={{ uri: 'https://r2.dev/videos/abc123.mp4' }}  // 10 MB
/>
```

### HLS:
```jsx
<Video
  source={{ uri: 'https://r2.dev/videos/abc123/playlist.m3u8' }}  // Segmentler
/>
```

### Adaptive HLS:
```jsx
<Video
  source={{ uri: 'https://r2.dev/videos/abc123/master.m3u8' }}  // Çoklu kalite
/>
```

**React Native Video zaten HLS destekliyor!** Sadece URL'yi `.m3u8` ile değiştirmen yeterli.

---

## 🎯 WizyClub İçin Önerim

**Senaryo 1: Basit (Tek kalite HLS)**
- Video süresi: 15-60 saniye
- Segment boyutu: ~200 KB
- Toplam segment: 5-10 adet
- R2 depolama: +10% (segmentasyon overhead)

**Senaryo 2: Profesyonel (Adaptive HLS)**
- Video süresi: 30-120 saniye
- 3 kalite: 720p, 480p, 360p
- Mobil kullanıcılar için optimize
- R2 depolama: +30% (3 kalite × her segment)

---

## 💾 R2 Depolama Karşılaştırması

**Tek video (60 saniye):**

| Yöntem | Dosya Sayısı | Boyut |
|--------|--------------|-------|
| **MP4** | 1 dosya | 10 MB |
| **HLS (tek kalite)** | 11 dosya (10 segment + 1 playlist) | 10.5 MB |
| **Adaptive HLS** | 34 dosya (30 segment + 4 playlist) | 13 MB |

**1000 video için:**
- MP4: 10 GB
- HLS: 10.5 GB (+5%)
- Adaptive HLS: 13 GB (+30%)

**Kazanç:**
- Kullanıcı deneyimi: 10x daha iyi
- Mobil veri tasarrufu: %40-60 (adaptive sayesinde)
- CDN cache hit rate: 3x daha fazla

---

## ✅ Sonuç

**FFMpeg ile HLS yapmak:**
- ✅ Evet, aynı `ffmpeg` komutu
- ✅ Sadece `-f hls` parametresi ekle
- ✅ React Native Video direkt destekliyor
- ✅ Ufak depolama artışı, büyük UX kazancı
