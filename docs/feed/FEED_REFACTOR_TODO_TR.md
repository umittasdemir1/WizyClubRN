# Feed Bileşeni Refaktör YAPILACAKLAR Listesi

> **Oluşturulma:** 2025-01-28  
> **Kaynak:** Feed Temizlik & Refaktör Hazırlık Analizi  
> **Toplam Öğe:** 24 görev  
> **Tahmini Efor:** 3-4 geliştirici günü

---

## Gösterim

| Öncelik | Açıklama |
|---------|----------|
| 🔴 P1 | Kritik - Hemen ele alınmalı |
| 🟠 P2 | Yüksek - Sprint içinde ele alınmalı |
| 🟡 P3 | Orta - Uygun olduğunda ele alınmalı |
| 🟢 P4 | Düşük - Olursa iyi olur |

| Durum | Açıklama |
|-------|----------|
| `[ ]` | Yapılmadı |
| `[/]` | Devam ediyor |
| `[X]` | Tamamlandı |

---

## Öncelik 1 (P1) - Kritik Görevler

### [ ] TODO-F002: MAX_VIDEO_LOOPS Konfigürasyon Sabiti Çıkar
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L676)
- **Eylem:** REFAKTÖR
- **Risk:** ✅ DÜŞÜK
- **Teknik Neden:** Maksimum video döngüleri için sihirli sayı `2` `handleVideoEnd`'de hardcoded. Yapılandırılabilir sabit olmalı.

---

## Öncelik 2 (P2) - Yüksek Öncelikli Görevler

### [ ] TODO-F003: SaveToast Bileşenini Çıkar
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L1326-L1351)
- **Eylem:** ÇIKAR
- **Risk:** ✅ DÜŞÜK

### [ ] TODO-F004: SlotRecycler Yardımcı Sınıfını Çıkar
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L419-L661)
- **Eylem:** ÇIKAR
- **Risk:** ⚡ ORTA

### [ ] TODO-F005: slotsEqual'ı Modül Kapsamına Taşı
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L476-L488)
- **Eylem:** REFAKTÖR
- **Risk:** ✅ DÜŞÜK

### [ ] TODO-F006: VideoErrorHandler Yardımcı Programını Çıkar
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L683-L745)
- **Eylem:** ÇIKAR
- **Risk:** ⚡ ORTA

### [ ] TODO-F007: VideoPlayerPool'da Sihirli Sayıları Birleştir
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Eylem:** REFAKTÖR
- **Risk:** ✅ DÜŞÜK

---

## FeedManager Modüler Bölme (P2-S) - Sprint Önceliği

> **Referans:** [38 - Feed Manager Refactoring.md](./38%20-%20Feed%20Manager%20Refactoring.md)  
> **Hedef:** FeedManager.tsx (1524 satır) → 5 modül (~300 satır her biri)  
> **Tahmini Efor:** 1-2 geliştirici günü

### [X] TODO-FM01: useFeedConfig.ts Hook Oluştur ✅
- **Dosya:** `mobile/src/presentation/components/feed/hooks/useFeedConfig.ts`
- **Eylem:** OLUŞTUR
- **Risk:** ✅ DÜŞÜK
- **Teknik Neden:** Tüm sabitleri, flag'leri ve konfigürasyon değerlerini merkezileştir.
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM02: useFeedScroll.ts Hook Oluştur ✅
- **Dosya:** `mobile/src/presentation/components/feed/hooks/useFeedScroll.ts`
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM03: useFeedInteractions.ts Hook Oluştur ✅
- **Dosya:** `mobile/src/presentation/components/feed/hooks/useFeedInteractions.ts`
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01, TODO-FM02
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM04: useFeedActions.ts Hook Oluştur ✅
- **Dosya:** `mobile/src/presentation/components/feed/hooks/useFeedActions.ts`
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM05: FeedOverlays.tsx Bileşeni Oluştur ✅
- **Dosya:** `mobile/src/presentation/components/feed/FeedOverlays.tsx`
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01 ~ FM04
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [/] TODO-FM06: FeedManager.tsx'i Refaktör Et 🔄
- **Dosya:** `mobile/src/presentation/components/feed/FeedManager.tsx`
- **Eylem:** GÜNCELLE
- **Risk:** ⚠️ YÜKSEK
- **Bağımlılıklar:** TODO-FM01 ~ FM05
- **Durum:** 🔄 DEVAM EDİYOR - useFeedConfig entegre edildi

### [ ] TODO-FM07: Entegrasyon Testi & Flag Doğrulaması
- **Dosya:** Tüm feed modülleri
- **Eylem:** TEST
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM06

---

## Öncelik 3 (P3) - Orta Öncelikli Görevler

### [ ] TODO-F008: handleVideoProgress Bağımlılıklarını Optimize Et
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Eylem:** OPTİMİZE
- **Risk:** ⚡ ORTA

### [ ] TODO-F009: handleLongPress Bağımlılıklarını Optimize Et
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Eylem:** OPTİMİZE
- **Risk:** ⚡ ORTA

### [ ] TODO-F010: SpritePreview Kullanımını Doğrula
- **Dosya:** [SpritePreview.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/SpritePreview.tsx)
- **Eylem:** DOĞRULA
- **Risk:** ✅ DÜŞÜK

### [ ] TODO-F011: Katman Mimarisini Belgele
- **Dosya:** Yeni: `docs/feed/FEED_LAYER_ARCHITECTURE.md`
- **Eylem:** OLUŞTUR
- **Risk:** ✅ DÜŞÜK

---

## Öncelik 4 (P4) - Olursa İyi Olur

### [ ] TODO-F012: ActiveVideoOverlay Props için Context Düşün
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L1284-L1317)
- **Eylem:** DEĞERLENDİR
- **Risk:** ⚠️ YÜKSEK

### [ ] TODO-F013: Döngü Mantığını Domain Use Case'e Taşı
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Eylem:** REFAKTÖR
- **Risk:** ⚠️ YÜKSEK

### [ ] TODO-F014: Prefetch Mantığını Domain Katmanına Taşı
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Eylem:** DEĞERLENDİR
- **Risk:** ⚠️ YÜKSEK

### [ ] TODO-F015: VideoPlayerPool için Unit Testler Ekle
- **Dosya:** Yeni: `mobile/src/presentation/components/feed/__tests__/VideoPlayerPool.test.tsx`
- **Eylem:** OLUŞTUR
- **Risk:** ✅ DÜŞÜK

### [ ] TODO-F016: FeedManager Callback'leri için Unit Testler Ekle
- **Dosya:** Yeni: `mobile/src/presentation/components/feed/__tests__/FeedManager.test.tsx`
- **Eylem:** OLUŞTUR
- **Risk:** ✅ DÜŞÜK

### [ ] TODO-F017: Performans İzleme Ekle
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Eylem:** GELİŞTİR
- **Risk:** ✅ DÜŞÜK

### [ ] TODO-F018: Kullanılmayan Import'ları Temizle
- **Dosya:** Tüm feed bileşenleri
- **Eylem:** TEMİZLE
- **Risk:** ✅ DÜŞÜK

---

## Özet

| Öncelik | Sayı | Durum |
|---------|------|-------|
| 🔴 P1 | 1 | 0 / 1 |
| 🟠 P2 | 5 | 0 / 5 |
| 🟠 P2-S (Modüler Bölme) | 7 | 0 / 7 |
| 🟡 P3 | 4 | 0 / 4 |
| 🟢 P4 | 7 | 0 / 7 |
| **TOPLAM** | **24** | **0 / 24** |

---

## Yürütme Sırası

### Faz 1: Temizlik (Gün 1 Sabah)
- [ ] TODO-F002: MAX_VIDEO_LOOPS çıkar

### Faz 2: Hızlı Kazanımlar (Gün 1 Öğleden Sonra)
- [ ] TODO-F005: slotsEqual'ı modül kapsamına taşı
- [ ] TODO-F007: Sihirli sayıları birleştir

### Faz 3: Modüler Bölme (Gün 2-3)
- [ ] TODO-FM01: useFeedConfig.ts oluştur ⭐ BURADAN BAŞLA
- [ ] TODO-FM02: useFeedScroll.ts oluştur
- [ ] TODO-FM03: useFeedInteractions.ts oluştur
- [ ] TODO-FM04: useFeedActions.ts oluştur
- [ ] TODO-FM05: FeedOverlays.tsx oluştur
- [ ] TODO-FM06: FeedManager.tsx refaktör et
- [ ] TODO-FM07: Entegrasyon testi

### Faz 4: Cilalama (Gün 4)
- [ ] Kalan P3 görevleri
- [ ] Zaman elverdiğince P4 görevleri

---

> **NOT:** `DISABLE_FEED_UI_FOR_TEST` ve diğer UI layer flag'leri test amaçlı korunacaktır.
