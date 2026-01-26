# Video System Audit - Action Plan

Source: VIDEO_SYSTEM_AUDIT.md + current code review
Status: draft (awaiting approval)

## P1 Critical
- [x] P1.1 Add recycleSlots debounce/cancel guard to avoid overlapping async work. (mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- [x] P1.2 Pause player before slot reuse to prevent audio leak. (mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- [x] P1.3 Carousel is image-only (no video path):
  - [x] Enforce image-only rendering; ignore/strip non-image items to avoid ExoPlayer errors. (mobile/src/presentation/components/feed/CarouselLayer.tsx)
  - [x] Add prefetch for nearby carousel images to reduce blank frames. (mobile/src/presentation/components/feed/CarouselLayer.tsx)
  - [x] Ensure placeholder/background behavior avoids black screen during image load. (mobile/src/presentation/components/feed/CarouselLayer.tsx)

## P2 High
- [x] P2.2 Prefetch queue respects active index changes; add generation or cancel logic. (mobile/src/data/services/FeedPrefetchService.ts + mobile/src/presentation/components/feed/FeedManager.tsx)
- [x] P2.3 Validate fast-scroll active index updates; adjust viewability/scroll-end fallback if needed. (mobile/src/presentation/components/feed/FeedManager.tsx)
- [x] P2.4 (Optional) Remove pause-related props from carousel if image-only to reduce confusion. (mobile/src/presentation/components/feed/FeedManager.tsx, mobile/src/presentation/components/feed/CarouselLayer.tsx)

## Cache/Prefetch follow-ups
- [x] Confirm initial prefetch runs after startup; add fallback if startup gating blocks it. (mobile/src/presentation/hooks/useVideoFeed.ts)
- [x] Avoid disk-cache checks blocking queue throughput (consider warmupCache or non-blocking check). (mobile/src/data/services/FeedPrefetchService.ts)

## Lifecycle consistency
- [x] Carousel: ensure image load state is tracked if it affects UI overlays (optional). (mobile/src/presentation/components/feed/CarouselLayer.tsx)

## Cleanup / Refactor (optional)
- [x] Remove or isolate legacy VideoLayer/FeedItem if unused. (mobile/src/presentation/components/feed/VideoLayer.tsx, mobile/src/presentation/components/feed/FeedItem.tsx)
- [ ] Evaluate extracting FeedManager submodules (separate task).

## Verification (run after each fix)
- [ ] Run `npx tsc --noEmit --skipLibCheck` after each change and record result here. (last: OK after cleanup)
- [ ] Smoke test: fast scroll, mute/unmute, carousel image swipe, background/foreground.
