# Video Sistemi Teknik Denetim Raporu

**Denetçi Perspektifi:** Kıdemli Kısa Video Feed Mühendisi (8+ yıl TikTok/Reels ölçeği)
**Tarih:** 25 Ocak 2026
**İncelenen Dosyalar:** 10+ bileşen (~3.800 satır)

---

## Üst Düzey Mimari Değerlendirme

### ✅ İyi Yapılan Şeyler

| Konu | Değerlendirme |
|------|---------------|
| **Katmanlı Mimari** | Temiz ayrım: `VideoPlayerPool` → `FeedManager` → `ActiveVideoOverlay`. Video render işlemi UI overlay'lerden bağımsız. |
| **Havuz Tabanlı Geri Dönüşüm** | 3 slotlu player havuzu, her öğe için ayrı player oluşturmayı önler. prev/current/next slotlarıyla iyi geri dönüşüm stratejisi. |
| **SharedValue Senkronizasyonu** | `scrollY`, `currentTime`, `duration` için Reanimated SharedValues kullanımı yaklaşık sıfır gecikme sağlar. |
| **Önbellek Stratejisi** | İki kademeli önbellekleme (bellek + disk), TTL ve LRU tahliyesi. Ertelenmiş budama başlangıcı engellemiyor. |
| **Prefetch Önceliği** | Aktif indexten uzaklık hesaplamalı öncelik tabanlı kuyruk. Ağ durumuna duyarlı paralel indirmeler. |

### ⚠️ Mimari Endişeler

| Endişe | Etki |
|--------|------|
| **Çift Video Sistemi** | Hem `VideoPlayerPool` hem de eski `VideoLayer.tsx` mevcut. Bakım yükü ve potansiyel çakışmalar yaratıyor. |
| **Carousel Yaşam Döngüsü Sapması** | `CarouselLayer.tsx` içindeki carousel videoları havuzu kullanmıyor. Ayrı yaşam döngüsü tutarsızlık yaratıyor. |
| **FeedManager Boyutu** | 1.491 satır tek sorumluluk ilkesini ihlal ediyor. Scroll mantığı, UI state, prefetch, toast, sheet'ler ve daha fazlasını karıştırıyor. |

---

## 🔴 Kritik Sorunlar (P1 – Mutlaka Düzeltilmeli)

### P1.1: `recycleSlots` Asenkron Akışında Race Condition

**Dosya:** `VideoPlayerPool.tsx` (satır 383-602)

**Sorun:** Kullanıcı hızlı kaydırırsa (<500ms'de 3+ video), birden fazla `recycleSlots()` çağrısı eşzamanlı çalışır. Her biri asenkron önbellek aramalarını başlatır. Ara durum güncellemeleri şunlara neden olabilir:
- İndeks için yanlış video görüntülenmesi
- Yanlış videodan ses çalması
- Terk edilmiş indirmelerden bellek baskısı

**Çözüm:** AbortController deseni ekleyin veya 100ms eşikle recycling'i debounce edin.

---

### P1.2: Hızlı Kaydırmada Ses Sızıntısı

**Dosya:** `VideoPlayerPool.tsx` (satır 199-202)

**Sorun:** Hızlı kaydırma sırasında, `shouldPlay` hesaplaması `resolvedActiveSlotIndex`'e bağlıdır. Slot geri dönüşümü ve durum güncellemesi arasında, aktif olmayan bir slot kısa süreliğine `shouldPlay=true` olabilir. `isMuted=false` ise yanlış videodan ses çalar.

**Çözüm:** Bir slotu farklı bir videoya geri dönüştürürken, durum güncellemesinden ÖNCE hemen `playerRefs[slotIndex].current?.pause()` çağrısı yapın.

---

### P1.3: CarouselLayer Video Yaşam Döngüsü İzolasyonu

**Dosya:** `CarouselLayer.tsx` (satır 219-232)

**Sorunlar:**
1. Carousel videoları `VideoCacheService`'i tamamen atlar
2. Buffer config yok = varsayılan (yavaş) arabellek
3. Hata işleme yok = sessiz hatalar
4. Yeniden deneme mekanizması yok
5. Videolar ön önbelleğe alınmıyor, takılmaya neden oluyor

**Etki:** Carousel gönderileri standart videolara göre belirgin şekilde daha kötü oynatma kalitesine sahip.

---

## 🟠 Yüksek Etkili Riskler (P2)

### P2.1: `useVideoPlayback` Temizliğinde Bellek Sızıntısı
**Dosya:** `useVideoPlayback.ts` (satır 141-164)
- Cleanup native video kaynaklarını düzgün serbest bırakmayabilir

### P2.2: Prefetch Kuyruğu Aktif Video Değişikliğine Saygı Göstermiyor
**Dosya:** `FeedPrefetchService.ts` (satır 107-143)
- Kuyruk alakasız videoları indirmeye devam eder

### P2.3: Görünürlük Yapılandırması Hızlı Kaydırmaları Kaçırabilir
**Dosya:** `FeedManager.tsx` (satır 92-95)
- Aktif indeks atlayabilir (1→5 olmadan 2,3,4)

### P2.4: Global Pause Carousel Videolarına Yayılmıyor
**Dosya:** `CarouselLayer.tsx` (satır 224)
- Prop drilling eksik olabilir

### P2.5: Döngü Sayısı Tutarsızlığı
- Carousel: sonsuz döngü (`repeat={true}`)
- Standart: 2 döngü sonra durur

---

## 📦 Önbellek / Prefetch Bulguları

| Metrik | Mevcut Değer | TikTok Standardı | Değerlendirme |
|--------|--------------|------------------|---------------|
| Bellek Önbellek Boyutu | 100 giriş | 50-100 | ✅ İyi |
| Bellek Önbellek TTL | 60 dakika | 30-60 dk | ✅ İyi |
| Disk Önbellek Limiti | 500 MB | 300-500 MB | ✅ İyi |
| Paralel İndirmeler | 2-3 | 2-4 | ✅ İyi |
| Prefetch İleri Bakış | 2-3 video | 3-5 video | ⚠️ Muhafazakar |

### Prefetch Sorunları
1. İlk yüklemede prefetch yok
2. Prefetch iptali yok
3. Disk önbellek kontrolü engelliyor

---

## 🎬 Yaşam Döngüsü Tutarsızlıkları

| Geçiş | VideoPlayerPool | VideoLayer | CarouselLayer |
|-------|-----------------|------------|---------------|
| Aktif Ol | ✅ 0'a seek | ✅ 0'a seek | ❌ Seek yok |
| Blur'da Duraklat | ✅ shouldPlay | ✅ shouldPlay | ⚠️ Sadece isActive |
| Hata Yeniden Deneme | ✅ 3 deneme | ✅ 3 deneme | ❌ Hiç yok |
| Döngü Sayısı | ✅ 2 döngü | ✅ 2 döngü | ❌ Sonsuz |

---

## 🛠️ Yeniden Düzenleme Önerileri

1. **Birleşik Video Yaşam Döngüsü Kontrolcüsü** - `useVideoLifecycle.ts` hook'u oluştur
2. **Eski VideoLayer Silme** - `VideoLayer.tsx` ve `useVideoPlayback.ts` sil
3. **FeedManager Bölme** - 1.491 satırı 5 modüle ayır
4. **Carousel Havuz Entegrasyonu** - Carousel medyasını havuz mimarisi içinde render et

---

## ✅ Gerekli Eylemler Özeti

### Kritik (Merge Engeller)
1. Slot geri dönüşümünden önce pause çağrısı ekle
2. recycleSlots race condition için abort deseni uygula
3. CarouselLayer videolarına hata işleme + yeniden deneme ekle

### Yüksek Öncelik (Sonraki Sprint)
4. Hızlı kaydırmada alakasız prefetch indirmelerini iptal et
5. Döngü sayısı davranışını birleştir (tüm video türleri için 2 döngü)
6. Global pause'un CarouselLayer'a yayıldığını doğrula

### Önerilen Refactoring
7. Eski VideoLayer + useVideoPlayback sil
8. FeedManager'ı odaklanmış modüllere böl
9. Birleşik VideoLifecycleController çıkar

---

> **Denetim Güveni:** Yüksek. Tüm bulgular statik kod analizine dayalı.
