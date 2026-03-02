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

### [X] TODO-F002: MAX_VIDEO_LOOPS Konfigürasyon Sabiti Çıkar ✅
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L574)
- **Eylem:** REFAKTÖR
- **Risk:** ✅ DÜŞÜK
- **Teknik Neden:** Maksimum video döngüleri için sihirli sayı `2` `handleVideoEnd`'de hardcoded. Yapılandırılabilir sabit olmalı.
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

---

## Öncelik 2 (P2) - Yüksek Öncelikli Görevler

### [X] TODO-F003: SaveToast Bileşenini Çıkar ✅
- **Dosya:** [`mobile/src/presentation/components/feed/SaveToast.tsx`](file:///d:/WizyClub/mobile/src/presentation/components/feed/SaveToast.tsx)
- **Eylem:** ÇIKAR
- **Risk:** ✅ DÜŞÜK
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

### [X] TODO-F004: SlotRecycler Yardımcı Sınıfını Çıkar ✅
- **Dosya:** [`mobile/src/presentation/components/feed/utils/SlotRecycler.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/utils/SlotRecycler.ts)
- **Eylem:** ÇIKAR
- **Risk:** ✅ DÜŞÜK
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

### [X] TODO-F005: slotsEqual'ı Modül Kapsamına Taşı ✅
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L55)
- **Eylem:** REFAKTÖR
- **Risk:** ✅ DÜŞÜK
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

### [X] TODO-F006: VideoErrorHandler Yardımcı Programını Çıkar ✅
- **Dosya:** [`mobile/src/presentation/components/feed/utils/VideoErrorHandler.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/utils/VideoErrorHandler.ts)
- **Eylem:** ÇIKAR
- **Risk:** ✅ DÜŞÜK
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

### [X] TODO-F007: VideoPlayerPool'da Sihirli Sayıları Birleştir ✅
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Eylem:** REFAKTÖR
- **Risk:** ✅ DÜŞÜK
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

---

## FeedManager Modüler Bölme (P2-S) - Sprint Önceliği

> **Referans:** [38 - Feed Manager Refactoring.md](./38%20-%20Feed%20Manager%20Refactoring.md)
- [x] **[P1]** `FeedManager.tsx` içindeki Loading, Error, Empty state UI kodlarını `FeedStatusViews.tsx` bileşenine taşı.
- [x] **[P1]** `FeedManager` sadece başarılı (success) durumunu ve liste render işlemini yönetsin.
> **Hedef:** FeedManager.tsx (1524 satır) → 5 modül (~300 satır her biri)
> **Tahmini Efor:** 1-2 geliştirici günü

### [X] TODO-FM01: useFeedConfig.ts Hook Oluştur ✅
- **Dosya:** [`mobile/src/presentation/components/feed/hooks/useFeedConfig.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedConfig.ts)
- **Eylem:** OLUŞTUR
- **Risk:** ✅ DÜŞÜK
- **Teknik Neden:** Tüm sabitleri, flag'leri ve konfigürasyon değerlerini merkezileştir.
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM02: useFeedScroll.ts Hook Oluştur ✅
- **Dosya:** [`mobile/src/presentation/components/feed/hooks/useFeedScroll.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedScroll.ts)
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM03: useFeedInteractions.ts Hook Oluştur ✅
- **Dosya:** [`mobile/src/presentation/components/feed/hooks/useFeedInteractions.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedInteractions.ts)
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01, TODO-FM02
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM04: useFeedActions.ts Hook Oluştur ✅
- **Dosya:** [`mobile/src/presentation/components/feed/hooks/useFeedActions.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedActions.ts)
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM05: FeedOverlays.tsx Bileşeni Oluştur ✅
- **Dosya:** [`mobile/src/presentation/components/feed/FeedOverlays.tsx`](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedOverlays.tsx)
- **Eylem:** OLUŞTUR
- **Risk:** ⚡ ORTA
- **Bağımlılıklar:** TODO-FM01 ~ FM04
- **Durum:** ✅ TAMAMLANDI (2026-01-27)

### [X] TODO-FM06: FeedManager.tsx'i Refaktör Et ✅
- **Dosya:** `mobile/src/presentation/components/feed/FeedManager.tsx`
- **Eylem:** GÜNCELLE
- **Risk:** ✅ TAMAMLANDI
- **Bağımlılıklar:** TODO-FM01 ~ FM05
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

### [X] TODO-FM07: Entegrasyon Testi & Flag Doğrulaması ✅
- **Dosya:** Tüm feed modülleri
- **Eylem:** TEST
- **Risk:** ✅ TAMAMLANDI
- **Bağımlılıklar:** TODO-FM06
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

## Faz 4: Mimari Sadeleştirme (Nihai Cilalama) ⭐️ SIRADAKİ
> **Hedef:** Koordinasyon ve UI mantığını ayıklayarak FeedManager.tsx'i ~300 satıra düşürmek.
> **Tahmini Efor:** 0.5 geliştirici günü

### [X] TODO-FM08: useFeedLifecycleSync.ts Çıkar ✅
- **Eylem:** ÇIKAR
- **Görev:** 200+ satırlık useEffect hook'larını (Upload, Browser, AppState) bir senkronizasyon yöneticisine taşı.
- [x] **[P1]** Uygulama durumu (background/foreground) senkronizasyonunu `useFeedLifecycleSync.ts` içine al.
- [x] **[P1]** In-App Browser durum yönetimini `useFeedLifecycleSync.ts` içine taşı.
- [x] **[P1]** Ekran odaklanma (focus/blur) mantığını `useFeedLifecycleSync.ts` ile yönet.
- **Durum:** ✅ TAMAMLANDI

### [X] TODO-FM09: FeedStatusViews.tsx Çıkar ✅
- **Eylem:** ÇIKAR
- **Görev:** Yükleniyor, Hata ve Boş durum görüntülerini özel bir bileşene taşı.
- **Durum:** ✅ TAMAMLANDI

### [X] TODO-FM10: FeedUtils.ts ve FeedManager.styles.ts Çıkar ✅
- **Eylem:** TEMİZLE
- **Görev:** Yardımcı fonksiyonları ve stilleri ayrı dosyalara taşı.
- [x] **[P2]** Yardımcı fonksiyonları (örn: `isFeedVideoItem`) `FeedUtils.ts` dosyasına taşı.
- [x] **[P2]** `StyleSheet` tanımlarını `FeedManager.styles.ts` dosyasına ayır.
- **Durum:** ✅ TAMAMLANDI

---

## Öncelik 3 (P3) - Orta Öncelikli Görevler

### [X] TODO-F009: handleLongPress Bağımlılıklarını Optimize Et ✅
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Eylem:** OPTİMİZE
- **Risk:** ✅ OPTİMİZE EDİLDİ
- **Durum:** ✅ TAMAMLANDI

### [X] TODO-F010: SpritePreview Kullanımını Doğrula ✅
- **Dosya:** [SpritePreview.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/SpritePreview.tsx)
- **Eylem:** DOĞRULA
- **Risk:** ✅ ONAYLANDI (Aktif Bileşen)
- **Durum:** ✅ TAMAMLANDI

### [X] TODO-F011: Katman Mimarisini Belgele ✅
- **Dosya:** [FEED_LAYER_ARCHITECTURE_TR.md](file:///d:/WizyClub/docs/feed/FEED_LAYER_ARCHITECTURE_TR.md)
- **Eylem:** OLUŞTUR
- **Risk:** ✅ TAMAMLANDI
- **Durum:** ✅ TAMAMLANDI

---

## Öncelik 4 (P4) - Olursa İyi Olur

### [X] TODO-F012: ActiveVideoOverlay Props için Context Düşün ✅
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L1284-L1317)
- **Eylem:** DEĞERLENDİR
- **Risk:** ✅ MEVCUT HALİ KORUNDU
- **Durum:** ✅ TAMAMLANDI

### [X] TODO-F013: Döngü Mantığını Domain Use Case'e Taşı ✅
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Eylem:** REFACTOR
- **Risk:** ✅ MEVCUT HALİ KORUNDU
- **Durum:** ✅ TAMAMLANDI

### [X] TODO-F014: Prefetch Mantığını Domain Katmanına Taşı ✅
- **Dosya:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Eylem:** DEĞERLENDİR
- **Risk:** ✅ MEVCUT HALİ KORUNDU
- **Durum:** ✅ TAMAMLANDI

### [X] TODO-F015: VideoPlayerPool için Unit Testler Ekle ❌
- **Dosya:** Yeni: `mobile/src/presentation/components/feed/__tests__/VideoPlayerPool.test.tsx`
- **Eylem:** OLUŞTUR
- **Risk:** ✅ ATLANDI (Kullanıcı İsteği)
- **Durum:** ✅ İPTAL EDİLDİ

### [X] TODO-F016: FeedManager Callback'leri için Unit Testler Ekle ❌
- **Dosya:** Yeni: `mobile/src/presentation/components/feed/__tests__/FeedManager.test.tsx`
- **Eylem:** OLUŞTUR
- **Risk:** ✅ ATLANDI (Kullanıcı İsteği)
- **Durum:** ✅ İPTAL EDİLDİ

### [ ] TODO-F017: Performans İzleme Ekle
- **Dosya:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Eylem:** GELİŞTİR
- **Risk:** ✅ DÜŞÜK

### [X] TODO-F018: Kullanılmayan Import'ları Temizle ✅
- **Dosya:** Tüm `src/presentation/components/feed` dosyaları
- **Eylem:** TEMİZLE
- **Risk:** ✅ DÜŞÜK
- **Durum:** ✅ TAMAMLANDI

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

### Faz 1 & 2: Temizlik ve Hızlı Kazanımlar (Tamamlandı)
- [x] TODO-F002 - TODO-F007 tamamlandı.

### Faz 3: Modüler Bölme (Gün 2-3)
- [x] TODO-FM01: useFeedConfig.ts oluştur
- [x] TODO-FM02: useFeedScroll.ts oluştur
- [x] TODO-FM03: useFeedInteractions.ts oluştur
- [x] TODO-FM04: useFeedActions.ts oluştur
- [x] TODO-FM05: FeedOverlays.tsx oluştur
- [x] TODO-FM06: FeedManager.tsx refaktör et
- [x] TODO-FM07: Entegrasyon testi

### Faz 4: Mimari Sadeleştirme (Nihai Cilalama)
- [x] TODO-FM08: Lifecycle senkronizasyon mantığını çıkar (`useFeedLifecycleSync.ts`)
- [x] TODO-FM09: Durum görünümlerini (loading/error/empty) çıkar (`FeedStatusViews.tsx`)
- [x] TODO-FM10: Stil ve yardımcı program temizliği (`FeedUtils.ts`, `FeedManager.styles.ts`)

### Faz 5: Nihai Doğrulama (Gün 4)
- [ ] Kalan P3 görevleri
- [ ] Zaman elverdiğince P4 görevleri

---

> **NOT:** `DISABLE_FEED_UI_FOR_TEST` ve diğer UI layer flag'leri test amaçlı korunacaktır.
