# Feed Performance Optimization — Implementation Plan

> **Başlangıç:** 2026-03-04  
> **Kaynak:** FEED_PERFORMANCE_AUDIT.md  
> **Strateji:** Faz 1 (Hızlı Kazanımlar) → TSX kontrol → İşaretle → Sıradaki

---

## Faz 1 — Hızlı Kazanımlar (Bugün)

### Adım 1.1 ✅ Stable Callback Map (PoolFeedVideoPlayerPool)
- **Dosya:** `PoolFeedVideoPlayerPool.tsx`
- **Ne:** 5 inline closure → `useMemo` stable callback array
- **Kontrol:** ✅ `npx tsc --noEmit`

### Adım 1.2 ✅ Conditional Progress Interval (PoolFeed)
- **Dosya:** `PoolFeedVideoPlayerPool.tsx`
- **Ne:** `progressUpdateInterval` 33ms → 100ms
- **Kontrol:** ✅ `npx tsc --noEmit`

### Adım 1.3 ✅ Batched Slot Update (PoolFeedVideoPlayerPool)
- **Dosya:** `PoolFeedVideoPlayerPool.tsx`
- **Ne:** `recycleSlots` 2-3 ayrı `setSlots` → tek batched güncelleme
- **Kontrol:** ✅ `npx tsc --noEmit`

### Adım 1.4 ✅ Cache/Prefetch Erteleme (usePoolFeedScroll)
- **Dosya:** `usePoolFeedScroll.ts`
- **Ne:** `setActiveFromIndex` → `InteractionManager.runAfterInteractions`
- **Kontrol:** ✅ `npx tsc --noEmit`

### Adım 1.5 ✅ Incremental Queue Update (FeedPrefetchService)
- **Dosya:** `FeedPrefetchService.ts`
- **Ne:** Full queue reset → incremental pruning
- **Kontrol:** ✅ `npx tsc --noEmit`

---

## Faz 2 — Orta Vadeli Refactor (Bu Sprint)

### Adım 2.3 ✅ InfiniteFeedManager — isFeedScrolling ref-only
- **Ne:** `isFeedScrolling` useState eliminated → 4 re-render/scroll gesture eliminated
- **Kontrol:** ✅ `npx tsc --noEmit`

### Adım 2.4a ✅ InfiniteFeedManager — InteractionManager Prefetch
- **Ne:** Komşu video prefetch → `InteractionManager.runAfterInteractions`
- **Kontrol:** ✅ `npx tsc --noEmit`

### Adım 2.4b ✅ Scroll Throttle (merged with 2.3)

### Adım 2.5 ✅ InfiniteFeedCard — Memo Comparator Optimization
- **Dosya:** `InfiniteFeedCard.tsx`
- **Ne 1:** Fast-path for inactive distant cards (isActive=false, isPendingActive=false, out of mount range) → sadece visual props kontrol edilir → ~90% cart re-render eliminated
- **Ne 2:** Handler callback comparison removed → stable ref'ten geliyor, identity asla değişmez
- **Kontrol:** ✅ `npx tsc --noEmit`

### Adım 2.6 ⬜ InfiniteFeedCard → Inactive Card State Batching (React 19 auto-batches; low priority)
### Adım 2.1 ⬜ InfiniteFeed Player Pool (Gelecek sprint)
### Adım 2.2 ⬜ BaseFeedEngine Abstraction (Gelecek sprint)

---

## Kontrol Komutu
```bash
cd d:\WizyClub\mobile && npx tsc --noEmit
```

## İlerleme Özeti
- [x] Adım 1.1 — Stable Callback Map
- [x] Adım 1.2 — Conditional Progress Interval
- [x] Adım 1.3 — Batched Slot Update
- [x] Adım 1.4 — Cache/Prefetch Erteleme (PoolFeed)
- [x] Adım 1.5 — Incremental Queue Update
- [x] Adım 2.3 — isFeedScrolling ref-only
- [x] Adım 2.4a — InteractionManager (InfiniteFeed)
- [x] Adım 2.4b — Scroll Throttle (merged)
- [x] Adım 2.5 — Memo Comparator Optimization

✅ **9/9 adım tamamlandı!** Tüm değişiklikler `npx tsc --noEmit` ile doğrulandı.

## Beklenen Toplam Performans Etkisi

| Optimizasyon | Tahmini Etki |
|---|---|
| Stable Callback Map | PoolFeed re-render %50↓ |
| Progress Interval 33→100ms | Bridge call %66↓ |
| Batched Slot Update | 3 re-render → 1 |
| InteractionManager (PoolFeed) | ~5-10ms JS yük↓ |
| Incremental Queue | Cache hit %10-15↑ |
| isFeedScrolling ref-only | 4 re-render/gesture eliminated |
| InteractionManager (InfiniteFeed) | ~5-15ms JS yük↓ |
| Memo Comparator Fast-path | ~90% kart re-render eliminated |
| Handler callback skip | 15 comparison/render eliminated |
