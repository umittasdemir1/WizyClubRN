# Feed & Video Flow - Hard Cleanup + Refactor Audit (Carousel = Image Only)

## Executive Summary

- P1 architectural violations exist where carousel components mount `react-native-video` and participate in video cache/prefetch and playback state. This breaks the image-only carousel rule and must be corrected first.
- The feed pipeline still routes carousel items through video lifecycle (VideoPlayerPool slots, prefetch, cache). This violates the required isolation boundary and risks incorrect playback behavior.
- Video lifecycle ownership is split between FeedManager, ActiveVideoOverlay, and VideoPlayerPool; overlays can issue direct playback commands. This must be consolidated so VideoPlayerPool is the single playback owner.
- App background gating is incomplete: `isAppActive` is tracked but never used to pause playback.

## System Responsibility Map

- FeedManager (mobile/src/presentation/components/feed/FeedManager.tsx)
  - Owns feed scroll, active index selection, and high-level coordination.
  - Currently also controls prefetch, cache warmup, and some playback decisions.
- VideoPlayerPool (mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
  - Owns video playback rendering and slot recycling.
  - Must be the only component that owns playback lifecycle.
- ActiveVideoOverlay (mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx)
  - Renders UI overlays for the active item.
  - Must not control playback directly (seek/retry should be routed through a controller API).
- CarouselLayer (mobile/src/presentation/components/feed/CarouselLayer.tsx)
  - Must be image-only and fully isolated from video lifecycle.
- FeedPrefetchService (mobile/src/data/services/FeedPrefetchService.ts)
  - Should prefetch only video items (non-carousel).

## Carousel Isolation Audit (Image-Only Enforcement)

Findings:

- TrendingCarousel mounts `react-native-video` inside carousel cards and manages playback state.
  - File: mobile/src/presentation/components/explore/TrendingCarousel.tsx
  - Violates: "Carousel must never mount react-native-video" and "Carousel must never receive isPaused / playbackRate / isActive".
  - Also uses FeedPrefetchService cache for carousel items (forbidden).

- Feed carousel (CarouselLayer) is image-only at render time, but it still receives `isActive` from FeedManager.
  - File: mobile/src/presentation/components/feed/CarouselLayer.tsx
  - File: mobile/src/presentation/components/feed/FeedManager.tsx
  - Violates: "Carousel must never receive isActive". Even if used for image preload, this is a lifecycle prop.

- Carousel items participate in video cache/prefetch and player slot assignment.
  - Files: mobile/src/presentation/components/feed/FeedManager.tsx, mobile/src/data/services/FeedPrefetchService.ts, mobile/src/presentation/components/feed/VideoPlayerPool.tsx
  - Violates: "Carousel must not participate in preload, prefetch, or cache decisions" and "Carousel must not interact with VideoPlayerPool or video slots".

## Video Lifecycle Audit (Non-Carousel Only)

- Playback gating is controlled by FeedManager and store state, not by VideoPlayerPool alone.
  - FeedManager toggles playback, retry, seek, speed boost.
  - ActiveVideoOverlay and VideoSeekBar can directly call onSeek/onRetry.

- App background handling is incomplete.
  - `useAppStateSync` sets `isAppActive` in the store, but no code uses it to pause playback.
  - File: mobile/src/presentation/store/useActiveVideoStore.ts

- Active index selection is driven by multiple sources.
  - `onViewableItemsChanged`, `onScrollEndDrag`, `onMomentumScrollEnd`, and effects can all set active index.
  - Potential for conflicting updates and transient mismatches between active index and slot mapping.

## Cleanup Candidates (Delete / Simplify / Verify)

- Remove carousel video playback entirely from TrendingCarousel.
- Simplify CarouselLayer props and item types to be image-only.
- Remove or replace video lifecycle props passed into carousel components.
- Filter carousel items out of all video cache/prefetch logic.
- Remove unused or misleading flags (e.g., `activeLoadTokenRef`, `isScrollingRef` never set true).
- Enforce `postType`-based gating in `getVideoUrl` or upstream mapping.

## Refactor Requirements (By Ownership)

- Carousel owns layout and gestures for images only.
  - No playback props, no cache decisions, no video prefetch, no video state.

- FeedManager owns index and high-level coordination only.
  - Must not implement video playback policy (seek/retry/playbackRate) directly.

- VideoPlayerPool owns ALL video playback and lifecycle.
  - It should receive a video-only list or an explicit video-only mapping.

- UI overlays must never control video state directly.
  - They should emit intents to FeedManager or a playback controller API.

## Cache / Preload / Prefetch Audit (Video Only)

- FeedPrefetchService queues any item with `videoUrl` without filtering `postType`.
  - File: mobile/src/data/services/FeedPrefetchService.ts

- useVideoFeed prefetches the first 3 items in the feed regardless of postType.
  - File: mobile/src/presentation/hooks/useVideoFeed.ts

- FeedManager caches next item and queues prefetch indices without excluding carousel items.
  - File: mobile/src/presentation/components/feed/FeedManager.tsx

- TrendingCarousel uses FeedPrefetchService and cached paths for carousel items.
  - File: mobile/src/presentation/components/explore/TrendingCarousel.tsx

## Render Boundary & Re-render Analysis

- VideoPlayerPool is isolated behind absolute positioning and uses shared values for scroll sync; this is a good baseline.
- ActiveVideoOverlay uses shared values for timeline and scroll position; it is visually decoupled but still has direct playback control hooks.
- ScrollPlaceholder memo comparator ignores isActive for non-carousel items, which is acceptable for empty placeholders but should be documented.
- TrendingCarousel embeds multiple Video instances in a horizontal list, which is expensive and violates the image-only rule.

## Async & Race Condition Audit

- Multiple active index setters (viewability, scroll end, focus effects) can conflict and cause transient mismatches between active index and player slots.
- VideoPlayerPool recycles slots on a 100ms timeout; during rapid scroll, the active index may not be present in slots, forcing fallback to slot 0.
- `isScrollingRef` is never set to true, so tap guards do not actually guard against scroll state.
- `activeLoadTokenRef` increments but is never read (dead state).

## Architectural Violations (If Any)

P1 Violations (must fix before refactor):

- Carousel mounts `react-native-video` and manages playback state.
  - File: mobile/src/presentation/components/explore/TrendingCarousel.tsx

- Carousel participates in cache/prefetch and playback lifecycle.
  - Files: mobile/src/presentation/components/explore/TrendingCarousel.tsx, mobile/src/data/services/FeedPrefetchService.ts

- Carousel is routed through VideoPlayerPool slots.
  - File: mobile/src/presentation/components/feed/VideoPlayerPool.tsx

- Carousel receives lifecycle prop `isActive`.
  - Files: mobile/src/presentation/components/feed/FeedManager.tsx, mobile/src/presentation/components/feed/CarouselLayer.tsx

## Target Architecture (Clean Separation)

- FeedManager maintains `activeFeedIndex` and a derived `activeVideoIndex` that only counts non-carousel items.
- VideoPlayerPool receives only video items, or a mapping from feed indices to video indices, and owns playback lifecycle.
- CarouselLayer renders images only and receives only UI-gesture props (no playback state).
- FeedPrefetchService accepts only video items (postType != 'carousel').
- Overlay components emit playback intents through a controller API, not direct control.

## Roadmap (Phased Execution)

Phase 0 (Blockers: P1 fixes)
- Remove video playback from TrendingCarousel and remove all carousel cache/prefetch usage.
- Remove lifecycle props (`isActive`, pause flags) from carousel components.

Phase 1 (Isolation)
- Introduce a video-only index map and route VideoPlayerPool through it.
- Filter prefetch/cache logic to exclude carousel items in FeedManager and useVideoFeed.

Phase 2 (Ownership Clean-up)
- Move seek/retry/playbackRate control behind a VideoPlayerPool controller API.
- Remove unused lifecycle flags and dead state in FeedManager.

Phase 3 (Hardening)
- Add regression checklist: no audio leakage, correct active slot mapping, carousel image-only.

## TODO Checklist (File-Referenced)

See: `docs/mobile/57 - Feed Video Hard Cleanup Refactor Todo.md`
