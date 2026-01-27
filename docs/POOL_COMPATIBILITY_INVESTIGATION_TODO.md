# Havuz Uyumluluk İncelemesi TODO

Rapor: `docs/POOL_COMPATIBILITY_INVESTIGATION_TR.md`

- [x] **HIGH** Candidate→Active readiness gating ekle (UI/video mismatch’i önle). İlgili dosyalar: `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`, `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`.
- [x] **HIGH** Aktif index güncellemelerini tek kaynağa indir (viewability *veya* scroll-end). İlgili dosya: `mobile/src/presentation/components/feed/FeedManager.tsx`.
- [x] **HIGH** `DISABLE_FEED_UI_FOR_TEST` için karar ver (kaldır veya env-gated). İlgili dosya: `mobile/src/presentation/components/feed/FeedManager.tsx`.
- [x] **MEDIUM** Carousel aktifken overlay/pool davranışını netleştir (overlay gizle veya tutarlı placeholder). İlgili dosyalar: `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`, `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`.
- [x] **MEDIUM** Non-carousel için `getVideoUrl` null dönerse UX davranışını netleştir. İlgili dosyalar: `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`, `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/hooks/useVideoFeed.ts` (**EXTERNAL DEPENDENCY**: `getVideoUrl`).
- [x] **MEDIUM** `isScreenFocused` için pause/resume davranışı uygula veya kaldır. İlgili dosyalar: `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/store/useActiveVideoStore.ts`.
- [x] **LOW** `useVideoFeed` içindeki kullanılmayan `activeVideoId` aboneliğini kaldır. İlgili dosya: `mobile/src/presentation/hooks/useVideoFeed.ts`.
- [x] **LOW** `ActiveVideoOverlay` memo comparator’ı render-kritik alanlarla genişlet (**VERIFY**). İlgili dosya: `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`.
- [x] **VERIFY** Kapsamda olup bulunamayan dosyaları doğrula: `mobile/src/presentation/components/feed/FeedItemOverlay.tsx`, `mobile/src/presentation/components/feed/VideoOverlays.tsx`, `mobile/src/presentation/hooks/useVideoPlayback.ts`, `mobile/src/presentation/hooks/useVideoSource.ts` (repo içinde bulunamadı).
- [x] **VERIFY** `VideoCacheService`, `FeedPrefetchService`, `getVideoUrl` davranışlarını slot model varsayımlarıyla doğrula (**EXTERNAL DEPENDENCY**). İlgili dış bağımlılıklar: `VideoCacheService`, `FeedPrefetchService`, `getVideoUrl` (repo içi doğrulandı; `FeedPrefetchService` doğrudan `video.videoUrl` kullanıyor).
- [ ] **MANUAL** Hızlı scroll test: active slot doğruluğu ve audio leakage. İlgili dosyalar: `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`, `mobile/src/presentation/components/feed/FeedManager.tsx`.
- [ ] **MANUAL** Background/foreground test: pause/resume doğrulama. İlgili dosyalar: `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/store/useActiveVideoStore.ts`.
- [ ] **MANUAL** Carousel aktif test: overlay davranışı ve pool playback olmaması. İlgili dosyalar: `mobile/src/presentation/components/feed/FeedManager.tsx`, `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`, `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`.
