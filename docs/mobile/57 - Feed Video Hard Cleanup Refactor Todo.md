# Feed & Video Flow - Hard Cleanup + Refactor TODO

Ilgili raporlar:
- [docs/mobile/55 - Feed Video Hard Cleanup Refactor.md](docs/mobile/55 - Feed Video Hard Cleanup Refactor.md)
- [docs/mobile/56 - Feed Video Hard Cleanup Refactor Tr.md](docs/mobile/56 - Feed Video Hard Cleanup Refactor Tr.md)

## TODO Checklist (File-Referenced)

- [ARCH_VIOLATION] `mobile/src/presentation/components/explore/TrendingCarousel.tsx`: `react-native-video` kullanimini kaldir ve carousel kartlarini image-only yap. Gerekce: carousel video mount etmemeli. Risk: high. Verify: carousel icinde `Video` yok; scroll ve thumbnail calisiyor. Bagimlilik: Phase 0.
- [ARCH_VIOLATION] `mobile/src/presentation/components/explore/TrendingCarousel.tsx`, `mobile/src/data/services/FeedPrefetchService.ts`: Carousel icin cache/prefetch kullanimini kaldir. Gerekce: carousel cache/prefetch'e katilmamali. Risk: high. Verify: carousel icinde FeedPrefetchService kullanimi yok; video download tetiklenmiyor. Bagimlilik: Phase 0.
- [ARCH_VIOLATION] `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/components/feed/CarouselLayer.tsx`: Carousel'e `isActive` ve lifecycle prop gonderimini kaldir. Gerekce: carousel lifecycle prop almamali. Risk: medium. Verify: carousel render + gesture calisir; prop arayuzu sade. Bagimlilik: Phase 0.
- [ARCH_VIOLATION] `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`: Carousel itemlarini player slotlarindan cikar; video-only liste veya mapping kullan. Gerekce: carousel pool'a girmemeli. Risk: high. Verify: carousel itemlari slotta gorunmez; aktif video dogru slotta. Bagimlilik: Phase 1.
- [SIMPLIFY] `mobile/src/presentation/components/feed/CarouselLayer.tsx`: `CarouselItem` tipini image-only yap, `type: 'video' | 'image'` kaldir. Gerekce: image-only contract. Risk: low. Verify: TS tipi net, runtime ayni. Bagimlilik: Phase 0.
- [SIMPLIFY] `mobile/src/presentation/hooks/useVideoFeed.ts`: prefetch ve queueVideos icin video-only filtre (postType != 'carousel', videoUrl valid). Gerekce: carousel prefetch'e katilmamali. Risk: medium. Verify: queue carousel indexleri icermiyor. Bagimlilik: Phase 1.
- [SIMPLIFY] `mobile/src/presentation/components/feed/FeedManager.tsx`: Carousel itemlari icin VideoCacheService/FeedPrefetchService cagrilarini atla. Gerekce: carousel cache kararina katilmamali. Risk: medium. Verify: aktif item carousel iken cache/prefetch yok. Bagimlilik: Phase 1.
- [SIMPLIFY] `mobile/src/core/utils/videoUrl.ts`: carousel icin null don veya upstream mapping'te engelle. Gerekce: carousel icin video URL resolv edilmemeli. Risk: low. Verify: carousel post videoUrl non-playable. Bagimlilik: Phase 1.
- [REFACTOR] `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`, `mobile/src/presentation/components/feed/VideoSeekBar.tsx`, `mobile/src/presentation/components/feed/FeedManager.tsx`: seek/retry/playbackRate kontrolunu VideoPlayerPool controller API altina tasi. Gerekce: overlay playback kontrol etmemeli. Risk: high. Verify: overlay direct playback cagrisi yok; playback calisiyor. Bagimlilik: Phase 2.
- [VERIFY] `mobile/src/presentation/store/useActiveVideoStore.ts`: `isAppActive` ile background pause uygula veya kullanilmayan state'i kaldir. Gerekce: background playback riski. Risk: medium. Verify: background -> pause, foreground -> resume. Bagimlilik: Phase 2.
- [SIMPLIFY] `mobile/src/presentation/components/feed/FeedManager.tsx`: `isScrollingRef` (hic true set edilmiyor) ve `activeLoadTokenRef` (kullanilmiyor) temizle/duzelt. Gerekce: dead state. Risk: low. Verify: tap guard ve scroll davranisi degismez. Bagimlilik: Phase 2.
- [VERIFY] `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`: hizli scroll'da active slot dogrulugu ve audio leakage yokligini test et. Gerekce: playback desync riski. Risk: medium. Verify: manual hizli scroll testi. Bagimlilik: Phase 2.
