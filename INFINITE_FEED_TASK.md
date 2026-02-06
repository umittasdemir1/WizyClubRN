# InfiniteFeed Düzeltme Görev Planı

## Adım 1: `resolvedVideoSources`'u renderItem'dan çıkar
- **Hedef:** renderItem'ın her cache resolve'da yeniden oluşmasını engelle
- **Yöntem:** Ref üzerinden okuma, sadece aktif video source'u extraData'ya eklendi
- **Dosya:** InfiniteFeedManager.tsx
- **Durum:** [x] TAMAMLANDI

## Adım 2: `isFeedScrolling`'i extraData'dan çıkar
- **Hedef:** Scroll başla/bitir'de gereksiz tam liste re-render'ı engelle
- **Yöntem:** isFeedScrolling state'den ref'e çevrildi, extraData'dan kaldırıldı
- **Dosya:** InfiniteFeedManager.tsx
- **Durum:** [x] TAMAMLANDI

## Adım 3: commitPendingActive'deki 4 setState'i birleştir
- **Hedef:** Her viewability değişiminde 4 ayrı render cycle yerine tek batch
- **Durum:** [~] ATLANDI - React 18 automatic batching zaten tek render cycle yapıyor

## Adım 4: Video mount penceresini genişlet
- **Hedef:** Hızlı scroll sonrası siyah ekranı azalt
- **Yöntem:** isPendingWindow ±1 → ±2'ye genişletildi
- **Dosya:** InfiniteFeedManager.tsx
- **Durum:** [x] TAMAMLANDI

## Adım 5: FIRST_FRAME_FALLBACK_MS'i düşür
- **Hedef:** Video visibility gating süresini kısalt
- **Yöntem:** 1200ms → 600ms'ye düşürüldü
- **Dosya:** InfiniteFeedCard.tsx
- **Durum:** [x] TAMAMLANDI

## Adım 6: playbackSource'u unmount'ta sıfırlamayı kaldır
- **Hedef:** Tekrar mount'ta source'dan başlamayı engelle
- **Yöntem:** shouldMountVideo=false durumunda setPlaybackSource(null) kaldırıldı, sadece item.id değişiminde reset
- **Dosya:** InfiniteFeedCard.tsx
- **Durum:** [x] TAMAMLANDI

## Adım 7: PREFETCH_AHEAD_COUNT'u artır
- **Hedef:** Hızlı scroll'da cache miss'i azalt
- **Yöntem:** 3 → 5'e çıkarıldı
- **Dosya:** useInfiniteFeedConfig.ts
- **Durum:** [x] TAMAMLANDI

---

## TSX Diagnostik Sonuçları
- InfiniteFeedManager.tsx: 0 hata
- InfiniteFeedCard.tsx: 0 hata
- useInfiniteFeedConfig.ts: 0 hata
