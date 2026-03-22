# 🎬 Video Delivery Optimizasyon Görev Planı

**Durum:** Planlama aşaması — henüz uygulanmadı  
**Sorun:** Video geçişlerinde ~1-1.6 saniye gecikme (`source: "network"`)  
**Hedef:** Slow video transition oranını %80+ azaltma  

---

## 📊 Mevcut Durum

| Metrik | Değer |
|---|---|
| Slow transition eşiği | >1000ms |
| Gözlemlenen ortalama | ~1.2s |
| Gözlemlenen max | 1.635s |
| Kaynak | %100 `network` (cache miss) |
| Prefetch ahead (infinite) | 6 video |
| Prefetch ahead (data layer) | 3 video |
| Prefetch behind | 0 |
| Max parallel downloads | 2-3 (Wi-Fi'de 3) |
| Max queue size | 15-30 |

**Kök Neden:** Prefetch sistemi videoları önceden indiriyor ama kullanıcı hızlı scroll yaptığında prefetch henüz tamamlanmadan o videoya ulaşıyor. Ayrıca video dosya boyutları büyükse indirme süresi uzuyor.

---

## 🎯 Görev Listesi

### Faz 1: Ölçüm ve Analiz (1 gün)

- [ ] **G1.1** Video dosya boyutlarını ölç (R2'deki tüm videoların ortalama/max boyutunu al)
- [ ] **G1.2** Cache hit/miss oranlarını ölç (PerformanceLogger.getStats() çağır)
- [ ] **G1.3** Ağ türüne göre slow transition dağılımını analiz et (Wi-Fi vs 4G)
- [ ] **G1.4** Prefetch queue tamamlanma oranını logla (kaç video başarıyla prefetch edildi vs queue'da kaldı)

### Faz 2: Prefetch Stratejisi İyileştirmesi (2 gün)

- [x] **G2.1** ✅ Tutarsız prefetch count'ları birleştirildi:
  - `feedDataConfig.ts` artık tek kaynak (PREFETCH_AHEAD: 4, BEHIND: 1)
  - `useInfiniteFeedConfig.ts` ve `usePoolFeedConfig.ts` merkezi config'den import ediyor
  - Eski: infinite=6/0, pool=3/1, data=3 → Yeni: hepsi 4/1
- [x] **G2.2** ✅ Adaptive prefetch zaten implemente edilmiş:
  - Scroll sırasında sadece thumbnail prefetch yapılıyor (satır 862-867)
  - Scroll durduğunda aktif video + sonraki videolar tam prefetch alıyor
  - `generation` mekanizması kuyruk sıfırlaması sağlıyor
- [x] **G2.3** ✅ Bant genişliği yönetimi eklendi:
  - Aktif video cache'te → `resumeAfterActiveVideo()` (tam prefetch hızı)
  - Aktif video ağdan yükleniyor → `pauseForActiveVideo()` (1 concurrent download)
  - Cache tamamlanınca otomatik resume
- [x] **G2.4** ✅ `PREFETCH_BEHIND_COUNT` zaten G2.1'de merkezi config'de 1 olarak ayarlandı

### Faz 3: Video Dosya Optimizasyonu (2 gün)

- [ ] **G3.1** Video encoding analizi:
  - Mevcut codec, bitrate, resolution parametrelerini dökümente et
  - H.264 High Profile / H.265 (HEVC) karşılaştırması
- [ ] **G3.2** Adaptive bitrate (ABR) stratejisi:
  - Her video için 3 kalite seviyesi üret (360p, 720p, 1080p)
  - Ağ hızına göre uygun kaliteyi seç
  - İlk yükleme düşük kalitede, sonra yüksek kaliteye geç
- [ ] **G3.3** Video thumbnail/poster optimizasyonu:
  - İlk frame'i hızlıca göster, video arka planda yüklensin
  - Blur-up tekniği (düşük çözünürlük → yüksek çözünürlük)
- [ ] **G3.4** Video sıkıştırma pipeline'ı:
  - Upload sırasında otomatik transkod (Cloudflare Stream veya FFmpeg worker)
  - Target: mobil için 2-4 Mbps, max 720p

### Faz 4: CDN ve Ağ Optimizasyonu (1 gün)

- [ ] **G4.1** R2 proxy edge location analizi:
  - En yakın Cloudflare edge'den servis edildiğini doğrula
  - Cache-Control header'larını optimize et (max-age, immutable)
- [ ] **G4.2** HTTP/2 veya HTTP/3 multiplexing doğrulama
- [ ] **G4.3** Range request desteği (partial content):
  - Video'nun ilk N saniyesini hızlıca indir, devamını stream et
- [ ] **G4.4** Video preload hint'leri:
  - `<link rel="preload">` benzeri mekanizma native'de

### Faz 5: Cache Katmanı İyileştirmesi (1 gün)

- [ ] **G5.1** Disk cache boyut limiti ve eviction politikası gözden geçir
- [ ] **G5.2** Memory cache → disk cache geçiş stratejisi optimize et
- [ ] **G5.3** App restart sonrası warm cache korunumu:
  - Disk cache'teki videoları startup'ta memory cache'e al
- [ ] **G5.4** Cache invalidation stratejisi (video güncellendiğinde eski cache temizlenmeli)

---

## 📐 Başarı Kriterleri

| Metrik | Mevcut | Hedef |
|---|---|---|
| Slow transition oranı | ~%60-80 | <%15 |
| Cache hit oranı | Bilinmiyor | >%70 |
| Ortalama geçiş süresi | ~1.2s | <500ms |
| P95 geçiş süresi | ~1.6s | <1000ms |
| İlk video ready (cold) | 11.4s | <5s |

---

## 🔗 İlgili Dosyalar

| Dosya | Açıklama |
|---|---|
| `src/data/services/FeedPrefetchService.ts` | Prefetch kuyruğu ve önceliklendirme |
| `src/data/services/VideoCacheService.ts` | Disk/memory cache yönetimi |
| `src/core/services/PerformanceLogger.ts` | Transition ölçümü ve loglama |
| `src/presentation/config/feedDataConfig.ts` | Data layer prefetch config |
| `src/presentation/components/infiniteFeed/hooks/useInfiniteFeedConfig.ts` | Infinite feed config |
| `src/presentation/components/poolFeed/hooks/usePoolFeedConfig.ts` | Pool feed config |
| `src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx` | Prefetch tetikleme mantığı |

---

## ⏱️ Tahmini Süre

| Faz | Süre |
|---|---|
| Faz 1: Ölçüm | 1 gün |
| Faz 2: Prefetch stratejisi | 2 gün |
| Faz 3: Video dosya optimizasyonu | 2 gün |
| Faz 4: CDN/Ağ | 1 gün |
| Faz 5: Cache katmanı | 1 gün |
| **Toplam** | **~7 gün** |

> **Not:** Faz 3 (video encoding/ABR) en büyük etkiyi yapacak ama en fazla altyapı çalışması gerektiren faz. Faz 2 (prefetch stratejisi) en hızlı sonuç veren faz.
