# Feed & Video Flow - Hard Cleanup + Refactor TODO

Ilgili raporlar:
- [docs/mobile/55 - Feed Video Hard Cleanup Refactor.md](docs/mobile/55 - Feed Video Hard Cleanup Refactor.md)
- [docs/mobile/56 - Feed Video Hard Cleanup Refactor Tr.md](docs/mobile/56 - Feed Video Hard Cleanup Refactor Tr.md)

## Scope Note (2026-01-27)

- Feed carousel **image-only** olmalı.
- Keşfet (Explore) carousel **video kullanabilir**.
- Bu listede "carousel" geçiyorsa aksi belirtilmedikçe **feed carousel** kapsamdadır.

## TODO Checklist (File-Referenced)

- [SCOPE_UPDATE / N-A] `mobile/src/presentation/components/explore/TrendingCarousel.tsx`: `react-native-video` kaldirma **yapilmayacak**. Gerekce: Explore carousel video destekli. Risk: none. Verify: N/A. Bagimlilik: Phase 0.
- [SCOPE_UPDATE / N-A] `mobile/src/presentation/components/explore/TrendingCarousel.tsx`, `mobile/src/data/services/FeedPrefetchService.ts`: Explore carousel icin cache/prefetch kaldirma **yapilmayacak**. Gerekce: Explore carousel video destekli; feed kurallari explore'a uygulanmaz. Risk: none. Verify: N/A. Bagimlilik: Phase 0.
- [DONE][ARCH_VIOLATION] `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/components/feed/CarouselLayer.tsx`: **Feed** carousel'e `isActive` ve lifecycle prop gonderimini kaldir. Gerekce: feed carousel lifecycle prop almamali. Risk: medium. Verify: carousel render + gesture calisir; prop arayuzu sade. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 0.
- [DONE][ARCH_VIOLATION] `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`: **Feed** carousel itemlarini player slotlarindan cikar; video-only liste veya mapping kullan. Gerekce: feed carousel pool'a girmemeli. Risk: high. Verify: carousel itemlari slotta gorunmez; aktif video dogru slotta. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 1.
- [DONE][SIMPLIFY] `mobile/src/presentation/components/feed/CarouselLayer.tsx`: **Feed** `CarouselItem` tipini image-only yap, `type: 'video' | 'image'` kaldir. Gerekce: feed image-only contract. Risk: low. Verify: TS tipi net, runtime ayni. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 0.
- [DONE][SIMPLIFY] `mobile/src/presentation/hooks/useVideoFeed.ts`: **Feed** prefetch ve queueVideos icin video-only filtre (postType != 'carousel', videoUrl valid). Gerekce: feed carousel prefetch'e katilmamali. Risk: medium. Verify: queue carousel indexleri icermiyor. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 1.
- [DONE][SIMPLIFY] `mobile/src/presentation/components/feed/FeedManager.tsx`: **Feed** carousel itemlari icin VideoCacheService/FeedPrefetchService cagrilarini atla. Gerekce: feed carousel cache kararina katilmamali. Risk: medium. Verify: aktif item carousel iken cache/prefetch yok. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 1.
- [SCOPE_UPDATE / BLOCKED] `mobile/src/core/utils/videoUrl.ts`: carousel icin **global** null donme explore videolari bozabilir. Gerekce: explore carousel video destekli. Aksiyon: feed-only mapping/filtre ile cozulmeli. Risk: medium. Verify: feed carousel videoUrl resolve edilmez, explore video bozulmaz. Bagimlilik: Phase 1 (revize).
- [DONE][REFACTOR] `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`, `mobile/src/presentation/components/feed/VideoSeekBar.tsx`, `mobile/src/presentation/components/feed/FeedManager.tsx`: seek/retry/playbackRate kontrolunu VideoPlayerPool controller API altina tasi. Gerekce: overlay playback kontrol etmemeli. Risk: high. Verify: overlay direct playback cagrisi yok; playback calisiyor. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 2.
- [DONE][VERIFY] `mobile/src/presentation/store/useActiveVideoStore.ts`: `isAppActive` ile background pause uygula veya kullanilmayan state'i kaldir. Gerekce: background playback riski. Risk: medium. Verify: background -> pause, foreground -> resume. Not: Uygulama FeedManager icinde isAppActive bazli pause/resume ile yapildi. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 2.
- [DONE][SIMPLIFY] `mobile/src/presentation/components/feed/FeedManager.tsx`: `isScrollingRef` (hic true set edilmiyor) ve `activeLoadTokenRef` (kullanilmiyor) temizle/duzelt. Gerekce: dead state. Risk: low. Verify: tap guard ve scroll davranisi degismez. TSX kontrolu: OK (2026-01-27). Bagimlilik: Phase 2.
- [MANUAL][VERIFY] `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`: hizli scroll'da active slot dogrulugu ve audio leakage yokligini test et. Gerekce: playback desync riski. Risk: medium. Verify: manual hizli scroll testi. Bagimlilik: Phase 2.
