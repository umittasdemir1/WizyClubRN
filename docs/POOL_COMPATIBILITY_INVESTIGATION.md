# Pool Compatibility Investigation (Specified Files Only)

> Scope: This report is restricted to the files explicitly listed in the request. Any behavior that depends on code outside those files is marked **EXTERNAL DEPENDENCY**. Missing files from the allowed list are marked **VERIFY**.

## 1. System Responsibility Map (File → Role)

- `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`
  - Slot pool owner (3 slots), video lifecycle execution, slot recycling, active slot gating, playback surface rendering.
  - Owns active slot selection and playback gating (`paused={!shouldPlay}`), retry, and seek via imperative ref.
  - **EXTERNAL DEPENDENCY**: video URL shaping (`getVideoUrl`), cache APIs (`VideoCacheService`), buffering config (`getBufferConfig`), logging/metrics.
- `mobile/src/presentation/components/feed/FeedManager.tsx`
  - Feed orchestration: active index selection, UI events, overlay coordination, prefetch/cache decisions, app-state pause/resume.
  - Owns active video identity (`setActiveVideo`) and passes scroll sync to pool/overlay.
  - **EXTERNAL DEPENDENCY**: data sources (Supabase fetch), prefetch/cache services, Story UI, sheets, router, auth/user info.
- `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`
  - UI overlay for active item: status icons, action buttons, metadata, seek bar.
  - Uses shared values for time/scroll and playback controller for seek/retry.
  - **EXTERNAL DEPENDENCY**: `ActionButtons`, `MetadataLayer`, `VideoSeekBar` implementation details.
- `mobile/src/presentation/hooks/useVideoFeed.ts`
  - Data fetching, optimistic interactions, cache initialization, and initial prefetch selection.
  - Syncs social follow state and handles delete/reorder behavior.
  - **EXTERNAL DEPENDENCY**: repositories/use cases, cache/prefetch services, `getVideoUrl`.
- `mobile/src/presentation/store/useActiveVideoStore.ts`
  - Single source of truth for feed playback state (active index/id, pause/mute, playbackRate, app state).
  - Provides app state sync and mute control hooks.
- `mobile/src/presentation/store/useAuthStore.ts`
  - Auth/session management; feed uses this for user id and auth-gated actions.
- **VERIFY (missing files)**
  - `mobile/src/presentation/components/feed/FeedItemOverlay.tsx` (missing)
  - `mobile/src/presentation/components/feed/VideoOverlays.tsx` (missing)
  - `mobile/src/presentation/hooks/useVideoPlayback.ts` (missing)
  - `mobile/src/presentation/hooks/useVideoSource.ts` (missing)

## 2. Pool / Slot / Index Model (Current Design Deconstruction)

**Slot model (VideoPlayerPool)**
- Fixed pool size of 3 slots (`createEmptySlot` initial state, 3 refs). Slot structure includes feed index, videoId, source, thumbnail, readiness flags, retry state.
- Slot reuse uses a recycle pipeline triggered on `activeIndex` changes (100ms delay + `recycleCounterRef` to ignore stale runs). The pool avoids destroying players; it mutates slot assignment instead.
- `slotsRef` provides synchronous access to last-known slot state in async handlers (retry, progress, error).

**Index model**
- Feed active index (`activeIndex`) is sourced from `useActiveVideoStore` and is set by `FeedManager` (`setActiveFromIndex`), driven by viewability and scroll-end callbacks.
- Pool derives `activeVideoIndex` from `activeIndex` **only if** the feed item is playable (`!postType === 'carousel'` and `getVideoUrl` truthy). If not playable, `activeVideoIndex = null`.
- Pool builds a `playableIndices` list from `videos` for mapping adjacent slots (next/prev) even when the active item is non-playable.

**Slot-to-index mapping**
- `resolveActiveSlotIndex()` tries to keep the slot already holding `currentIdx`; falls back to an empty slot or slot 0.
- Target slot indices are filled with `currentIdx`, then next/prev playable indices, then leftover targets. This mapping is deterministic but depends on `playableIndices` order and `activeIndex` input.
- Empty slots are produced if target index is invalid or non-playable.

**Out-of-range and empty state**
- `buildSlotForIndex()` returns `createEmptySlot(-1)` if index invalid or non-playable, preventing render (`isValidSource` fails).
- `VideoPlayerPool` does not explicitly clear slots when `videos.length === 0`, but `FeedManager` does not render the pool when feed is empty, preventing stale slots from rendering.

## 3. Candidate vs Active Index Analysis (With Evidence)

**Explicit candidate index**
- There is **no explicit candidate index** in any of the specified files. `activeIndex` becomes active immediately on viewability or scroll-end events.

**Implicit candidate handling**
- Pool uses readiness state and `lastActiveSlotIndexRef` to show the previous slot when the new active slot is not ready (`isActiveReady` false). This creates an implicit “candidate → active” buffer in the video layer.

**Potential mismatch**
- `ActiveVideoOverlay` positions itself using `activeIndex` immediately and draws active metadata from `activeVideoId` in `FeedManager` (active identity is set immediately). Meanwhile, the pool may still render the **previous slot** (last active) if the new slot is not ready. This can produce a **UI/video mismatch window**: UI shows new metadata while the video texture is still the previous clip (paused or still frame). This is a candidate-vs-active consistency risk.

**Carousel edge case**
- When `activeIndex` points to a carousel item, `activeVideoIndex` becomes `null`. The pool still builds slots for adjacent playable indices, but `hasActiveVideo` is false. The video layer becomes non-active while the UI layer may still show overlay metadata for the carousel item (if overlays are enabled). This is a legitimate intentional decoupling but should be validated.

## 4. Playback Lifecycle Flow

**Play / Pause**
- Single source of truth for playback is `useActiveVideoStore.isPaused` (updated by `togglePause`, `setPaused`).
- Pool computes `shouldPlay = isActiveSlot && !isPaused`. Only the active slot can play.

**Background / Foreground**
- `useAppStateSync()` updates `isAppActive` in the store. `FeedManager` listens to `isAppActive` and pauses/resumes via `setPaused` unless `ignoreAppState` or in-app browser is visible.
- **EXTERNAL DEPENDENCY**: No evidence here for background audio behavior beyond `react-native-video` config (`playInBackground={false}`, `playWhenInactive={false}`), which is correct but still depends on native behavior.

**Screen focus / blur**
- `FeedManager` sets `isScreenFocused` in focus effects, but there is no pause/resume action in these files when the screen blurs. If other files do this, it is **EXTERNAL DEPENDENCY**. Otherwise, the state is write-only within this scope (see Findings).

**Audio leakage scenarios**
- The pool pauses all non-active slots (`paused={!shouldPlay}`) and uses `playInBackground={false}`. This should prevent audio leakage during scroll.
- However, if `activeIndex` changes rapidly, the pool can keep non-active slots mounted (opacity 0) while paused. Verify whether mounted-but-paused video components can still emit audio on certain devices (**VERIFY**).

**PlaybackRate ownership**
- Playback rate is stored in `useActiveVideoStore` and passed to the pool. Controller API (`VideoPlayerPoolRef.setPlaybackRate`) simply proxies to `onPlaybackRateChange`, so final authority remains in the store.

## 5. UI Overlay vs Video Layer Separation

- Video layer (pool) is absolutely positioned and uses `scrollY` shared value for transforms, minimizing UI-induced re-renders.
- `ActiveVideoOverlay` uses the same `scrollY` shared value to sync visual position.
- **Hard decoupling**: overlay sends seek/retry through a controller object (no direct player calls). This aligns with separation requirements.
- **Risk**: Overlay logic currently uses `activeIndex` to position and `activeVideo` to render UI. If the pool still shows the previous slot while new video is not ready, UI can drift from actual video content (see Section 3).
- **Feature flag**: `DISABLE_FEED_UI_FOR_TEST` is set to `true`, disabling overlays and interactions across the feed. If this is not a test-only override, it effectively disables UI/video integration in production.

## 6. State Flow (Store → Hooks → Components)

**Single source of truth**
- `useActiveVideoStore` holds active video identity, playback pause/mute, app state, and playback rate.
- `FeedManager` writes `setActiveVideo` and reads `activeIndex/activeVideoId/isPaused/...` to orchestrate pool and overlay.

**Data flow**
- `useVideoFeed` populates `videos` and handles mutations (like/save/follow/delete). `FeedManager` uses `videos` from its parent (likely hook output).
- `VideoPlayerPool` only receives `videos` + `activeIndex` and does not mutate store directly.

**Store hygiene**
- `useActiveVideoStore.isScreenFocused` is written (`setScreenFocused` in `FeedManager`) but not read in the specified files. If not consumed elsewhere, this is dead state.
- `useVideoFeed` subscribes to `activeVideoId` but never uses it. This creates unnecessary re-renders on every active change.

**Effect dependencies**
- `useVideoFeed` fetch effect depends only on `isInitialized`, not on user id; a sign-in after init does not trigger refetch in this scope.
- `FeedManager` uses multiple triggers for active index (viewability + scroll end). Without coordination, this can cause duplicate `setActiveVideo` calls in fast scroll scenarios.

## 7. Render Performance and Re-render Sources

- Pool renders only 3 players; each uses `Animated.View` and shared scroll values to avoid expensive layout passes.
- `ScrollPlaceholder` is memoized; non-carousel items only re-render if `video.id` changes. This avoids re-renders on active changes and is correct because placeholders are empty views.
- `ActiveVideoOverlay` has a custom memo comparator. It omits some properties used in render (e.g., `video.spriteUrl`) — if those can change, overlay may not update (**VERIFY**).
- `useVideoFeed` subscribes to `activeVideoId` unnecessarily (extra renders under heavy scrolling).

## 8. Race Conditions and Async Safety

- **Index setters compete**: viewability callback, `onScrollEndDrag`, and `onMomentumScrollEnd` all call `setActiveFromIndex`. This can cause active index thrash or repeated state updates in rapid scrolls.
- **Slot recycle concurrency**: `recycleCounterRef` guards against stale async updates, but there is still a 100ms delay where `activeIndex` may advance without a valid active slot; the pool renders the last active slot until new ready.
- **Upload success flow**: on upload, it re-fetches via Supabase and prepends; then scrolls to index 0 and calls `setActiveVideo`. If the feed list changes during this, index/ID mismatch could occur (**VERIFY**).

## 9. Video Source / Cache / Preload / Prefetch Review

- **URL shaping**: `getVideoUrl` is used in both pool and feed. URL logic is centralized externally (**EXTERNAL DEPENDENCY**).
- **Cache decisions** are split:
  - `useVideoFeed` handles initial prefetch of first playable items.
  - `FeedManager` handles cache/prefetch on active index change.
  - `VideoPlayerPool` handles actual source resolution (memory/disk/remote) per slot.
- **Carousel exclusion** is enforced in these files via `postType === 'carousel'` gating and `isFeedVideoItem` checks. This keeps the pool and prefetch logic video-only.
- **Edge cases**: If `getVideoUrl` returns null for a non-carousel, the pool logs error and renders an empty slot; FeedManager still may set it as active (UI could show metadata with no video). This is a valid defensive state but should be verified in product requirements.

## 10. Findings (Prioritized)

1) **Candidate vs Active mismatch window** (High)
   - Overlay advances immediately with `activeIndex` and `activeVideoId`, while pool may continue to display last active slot until new slot is ready.
   - Risk: UI shows metadata for video B while video A is still visible.

2) **Active index updates from multiple sources** (High)
   - `onViewableItemsChanged`, `onScrollEndDrag`, and `onMomentumScrollEnd` all call `setActiveFromIndex`.
   - Risk: active index thrash, extra prefetch, and non-deterministic slot recycling under fast scroll.

3) **Global UI kill switch enabled** (High)
   - `DISABLE_FEED_UI_FOR_TEST = true` disables overlays and interactions.
   - If not a temporary dev flag, the UI/video architecture is effectively bypassed.

4) **`isScreenFocused` is write-only in scope** (Medium)
   - It is set on focus but unused for playback gating within the specified files.
   - If no external consumer, this is dead state and hides a missing lifecycle gate.

5) **`useVideoFeed` re-renders on every activeVideoId change** (Low/Perf)
   - Subscribed store value is unused, causing unnecessary hook re-renders.

6) **ActiveVideoOverlay memo comparator omissions** (Low/Correctness)
   - Some fields used in rendering (e.g., `video.spriteUrl`) are not in the comparator.
   - If those fields change at runtime, overlay may not update.

## 11. Cleanup & Refactor Requirements (File-Level)

- `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`
  - Introduce an explicit candidate/active synchronization model or an “active-ready” gating API so UI and video texture can switch together.
  - Ensure clear policy when `activeIndex` is carousel (no active video) — either hide overlay or show a consistent placeholder.
- `mobile/src/presentation/components/feed/FeedManager.tsx`
  - Consolidate active index updates to a single authoritative path to eliminate race between viewability and scroll-end.
  - Decide fate of `DISABLE_FEED_UI_FOR_TEST` and remove or gate behind environment.
  - Validate screen-focus pause behavior (if required here, add; otherwise remove dead state).
- `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`
  - Align overlay switch with pool readiness or add explicit “active-ready” signal.
  - Expand memo comparator to include any render-critical props (e.g., sprite URL) **VERIFY**.
- `mobile/src/presentation/hooks/useVideoFeed.ts`
  - Remove unused `activeVideoId` subscription to prevent feed-wide re-renders on scroll.
  - Confirm whether auth changes should refetch the feed (current effect runs only once after init).

**Report path:** `docs/POOL_COMPATIBILITY_INVESTIGATION.md`

## 12. Execution Roadmap

1) **Stabilize index authority**
   - Choose a single active-index update source (viewability *or* scroll-end) and remove others.
2) **Candidate → Active alignment**
   - Add a pool “ready” signal to gate overlay switch, or delay `setActiveVideo` until the slot is ready.
3) **Lifecycle completion**
   - Decide whether `isScreenFocused` must pause/resume; implement or remove.
4) **Performance hygiene**
   - Remove unused store subscriptions (`activeVideoId` in `useVideoFeed`).
5) **Validation**
   - Run manual fast-scroll + background/foreground tests to confirm no audio leakage and correct UI/video sync.

**Documentation index update status:** Updated (see `DOCUMENTATION_INDEX.md`).

## 13. Exhaustive TODO Checklist

- [ ] **HIGH** Add explicit candidate→active readiness gating between `FeedManager` and `VideoPlayerPool` to prevent UI/video mismatch.
- [ ] **HIGH** De-duplicate active-index updates by selecting one authoritative trigger (viewability *or* scroll-end).
- [ ] **HIGH** Decide and document whether `DISABLE_FEED_UI_FOR_TEST` should be removed or environment-gated; otherwise production UI is disabled.
- [ ] **MEDIUM** Add explicit handling for carousel-active state (overlay suppression or consistent placeholder) to avoid overlay/video null state.
- [ ] **MEDIUM** Confirm expected behavior when `getVideoUrl` returns null for a non-carousel item; document fallback UX.
- [ ] **MEDIUM** Implement or remove screen-focus pause/resume (`isScreenFocused`) within scope; currently write-only.
- [ ] **LOW** Remove unused `activeVideoId` subscription in `useVideoFeed` to reduce render churn.
- [ ] **LOW** Review `ActiveVideoOverlay` comparator for missing props used in render (e.g., sprite URL) **VERIFY**.
- [ ] **VERIFY** Missing files from allowed scope (`FeedItemOverlay.tsx`, `VideoOverlays.tsx`, `useVideoPlayback.ts`, `useVideoSource.ts`): locate or confirm deletion; assess impact on pool architecture.
- [ ] **VERIFY** Confirm `VideoCacheService`, `FeedPrefetchService`, and `getVideoUrl` behaviors (external dependencies) align with slot model assumptions.
- [ ] **MANUAL** Fast scroll test: verify no audio leakage and correct slot activation.
- [ ] **MANUAL** Background/foreground test: verify pause/resume with `isAppActive` and `ignoreAppState`.
- [ ] **MANUAL** Carousel-active test: verify overlay behavior and no pool playback when active item is carousel.
