# Feed & Video Flow - Hard Cleanup + Refactor Audit (Carousel = Image Only)

## Executive Summary

- P1 mimari ihlaller var: carousel bilesenleri `react-native-video` mount ediyor ve video cache/prefetch/playback durumuna katiliyor. Bu, image-only kuralini ihlal eder ve once duzeltilmelidir.
- Feed pipeline hala carousel itemlarini video lifecycle icine sokuyor (VideoPlayerPool slotlari, prefetch, cache). Bu, izolasyon sinirini bozar ve hatali playback davranisi riski dogurur.
- Video lifecycle sahipligi FeedManager, ActiveVideoOverlay ve VideoPlayerPool arasinda parcalanmis. Playback tek sahibi VideoPlayerPool olmali.
- App background gating eksik: `isAppActive` store'a yaziliyor ama playback'i durdurmak icin kullanilmiyor.

## System Responsibility Map

- FeedManager (mobile/src/presentation/components/feed/FeedManager.tsx)
  - Feed scroll, aktif index secimi, yuksek seviye koordinasyon.
  - Su anda prefetch/cache ve playback kararlarina da karisiyor.
- VideoPlayerPool (mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
  - Video playback ve slot recycle sahibi.
  - Playback lifecycle icin tek sahip olmalidir.
- ActiveVideoOverlay (mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx)
  - Aktif video UI overlay.
  - Playback kontrolu dogrudan yapmamalidir (seek/retry intent ile gitmeli).
- CarouselLayer (mobile/src/presentation/components/feed/CarouselLayer.tsx)
  - Image-only ve video lifecycle'dan tamamen izole.
- FeedPrefetchService (mobile/src/data/services/FeedPrefetchService.ts)
  - Sadece video itemlari (non-carousel) icin prefetch.

## Carousel Isolation Audit (Image-Only Enforcement)

Bulgu ozeti:

- TrendingCarousel carousel icinde `react-native-video` mount ediyor ve playback state yonetiyor.
  - Dosya: mobile/src/presentation/components/explore/TrendingCarousel.tsx
  - Ihlal: "Carousel must never mount react-native-video" ve "Carousel must never receive isPaused / playbackRate / isActive".
  - Ayrica FeedPrefetchService cache kullaniyor (yasak).

- Feed carousel (CarouselLayer) render tarafinda image-only, fakat FeedManager'dan `isActive` aliyor.
  - Dosyalar: mobile/src/presentation/components/feed/CarouselLayer.tsx, mobile/src/presentation/components/feed/FeedManager.tsx
  - Ihlal: "Carousel must never receive isActive". Bu bir lifecycle prop.

- Carousel itemlari video cache/prefetch ve player slot atamasina katiliyor.
  - Dosyalar: mobile/src/presentation/components/feed/FeedManager.tsx, mobile/src/data/services/FeedPrefetchService.ts, mobile/src/presentation/components/feed/VideoPlayerPool.tsx
  - Ihlal: "Carousel must not participate in preload/prefetch/cache" ve "Carousel must not interact with VideoPlayerPool".

## Video Lifecycle Audit (Non-Carousel Only)

- Playback gating FeedManager ve store tarafindan kontrol ediliyor; VideoPlayerPool tek sahip degil.
  - FeedManager pause/retry/seek/speed kontrol ediyor.
  - ActiveVideoOverlay ve VideoSeekBar direkt seek/retry cagirabiliyor.

- App background handling eksik.
  - `useAppStateSync` `isAppActive` set ediyor ama playback durdurmak icin kullanilmiyor.
  - Dosya: mobile/src/presentation/store/useActiveVideoStore.ts

- Active index birden fazla kaynaktan set ediliyor.
  - `onViewableItemsChanged`, `onScrollEndDrag`, `onMomentumScrollEnd` ve effect'ler.
  - Active index - slot eslesmesinde gecici mismatch riski.

## Cleanup Candidates (Delete / Simplify / Verify)

- TrendingCarousel icindeki video playback'i tamamen kaldir.
- CarouselLayer props ve item tiplerini image-only yap.
- Carousel'e giden lifecycle prop'lari kaldir.
- Carousel'i video cache/prefetch akislarindan filtrele.
- Kullanilmayan/mislabeled state'leri temizle (ornegin `activeLoadTokenRef`, `isScrollingRef`).
- `getVideoUrl` veya upstream mapping'te `postType` bazli koruma uygula.

## Refactor Requirements (By Ownership)

- Carousel sadece image layout ve gesture sahibi.
  - Playback prop yok, cache/prefetch yok, video state yok.

- FeedManager sadece index ve yuksek seviye koordinasyon sahibi.
  - Playback policy (seek/retry/playbackRate) yonetmemeli.

- VideoPlayerPool playback lifecycle'in tek sahibi.
  - Video-only liste veya feed->video index mapping almali.

- UI overlay playback state'i dogrudan kontrol etmemeli.
  - Intent tabanli bir controller API ile iletmeli.

## Cache / Preload / Prefetch Audit (Video Only)

- FeedPrefetchService `videoUrl` olan her item'i kuyruga atiyor; `postType` filtre yok.
  - Dosya: mobile/src/data/services/FeedPrefetchService.ts

- useVideoFeed ilk 3 item'i prefetch ediyor, `postType` filtre yok.
  - Dosya: mobile/src/presentation/hooks/useVideoFeed.ts

- FeedManager next item cache ve prefetch queue icin carousel filtrelemiyor.
  - Dosya: mobile/src/presentation/components/feed/FeedManager.tsx

- TrendingCarousel FeedPrefetchService ve cache path kullaniyor.
  - Dosya: mobile/src/presentation/components/explore/TrendingCarousel.tsx

## Render Boundary & Re-render Analysis

- VideoPlayerPool absolute layer ve shared values ile izolasyonda (iyi).
- ActiveVideoOverlay shared values ile sync, fakat playback kontrolu dogrudan.
- ScrollPlaceholder comparator non-carousel icin isActive ignore ediyor; placeholder icin kabul edilebilir ama acik dokumante edilmeli.
- TrendingCarousel coklu Video instance kullaniyor; pahali ve image-only kuralina aykiri.

## Async & Race Condition Audit

- Active index birden fazla yerden set ediliyor; gecici mismatch riski.
- VideoPlayerPool recycle 100ms timeout ile yapiliyor; hizli scroll'da active index slotta olmayabilir.
- `isScrollingRef` hic true set edilmiyor, tap guard gercek guard degil.
- `activeLoadTokenRef` artiyor ama okunmuyor (dead state).

## Architectural Violations (If Any)

P1 Ihllaller (refactor oncesi zorunlu):

- Carousel `react-native-video` mount ediyor ve playback state yonetiyor.
  - Dosya: mobile/src/presentation/components/explore/TrendingCarousel.tsx

- Carousel cache/prefetch'e katiliyor.
  - Dosyalar: mobile/src/presentation/components/explore/TrendingCarousel.tsx, mobile/src/data/services/FeedPrefetchService.ts

- Carousel itemlari VideoPlayerPool slotlarina giriyor.
  - Dosya: mobile/src/presentation/components/feed/VideoPlayerPool.tsx

- Carousel `isActive` gibi lifecycle prop aliyor.
  - Dosyalar: mobile/src/presentation/components/feed/FeedManager.tsx, mobile/src/presentation/components/feed/CarouselLayer.tsx

## Target Architecture (Clean Separation)

- FeedManager `activeFeedIndex` ve sadece video itemlar icin `activeVideoIndex` hesaplar.
- VideoPlayerPool sadece video itemlari alir (veya feed->video index mapping).
- CarouselLayer image-only render eder ve sadece gesture/UI prop alir.
- FeedPrefetchService sadece video itemlari icin kullanilir.
- Overlay'ler playback kontrolunu direkt yapmaz; controller API ile intent gonderir.

## Roadmap (Phased Execution)

Phase 0 (Blockers: P1 fixes)
- TrendingCarousel icinden video playback'i kaldir, cache/prefetch baglantilarini sil.
- Carousel'e giden lifecycle prop'lari (`isActive`, pause vb.) kaldir.

Phase 1 (Isolation)
- Video-only index map tanimla ve VideoPlayerPool'u bu map ile besle.
- FeedManager ve useVideoFeed icinde carousel prefetch/cache filtresi uygula.

Phase 2 (Ownership Clean-up)
- Seek/retry/playbackRate kontrolunu VideoPlayerPool controller API altinda topla.
- FeedManager icindeki gereksiz/donuk state'leri temizle.

Phase 3 (Hardening)
- Regresyon checklist: audio leakage yok, active slot dogru, carousel image-only.

## TODO Checklist (File-Referenced)

See: `docs/mobile/57 - Feed Video Hard Cleanup Refactor Todo.md`
