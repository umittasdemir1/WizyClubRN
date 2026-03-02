# Infinite Feed Performance Analysis

Date: 2026-02-08  
Scope: `mobile` feed stack, static code-path analysis (no runtime trace in this pass)

## Executive Summary

Current home feed runs `InfiniteFeedManager` (`FEED_MODE_FLAGS.USE_INFINITE_FEED: true` in `mobile/src/presentation/config/feedModeConfig.ts:8`).  
Main smoothness gap vs Instagram/X/TikTok is not a single setting; it is the combination of:

1. Frequent active-item commits during scroll (`minimumViewTime: 0`, immediate commit enabled).
2. Card-level video lifecycle (no player reuse pool in Infinite path).
3. Aggressive prefetch + cache resolution updates on the same JS path as active-index transitions.
4. Decode contention (active playback + decode prewarm) during fast swipes.

Highest-risk bottlenecks are JS-thread churn and decode/network contention around active item switching.

## Observed Symptoms

Likely user-visible symptoms from current code path:

1. Fast swipe during video-heavy sequences can stutter while active item changes repeatedly.
2. Active video switch may feel inconsistent when cache path resolves late and source updates asynchronously.
3. Timeline smoothness degrades on long sessions due repeated map/object cloning in source-resolution state and increasing in-memory metadata.

Positive note: Infinite feed already has reasonable virtualization knobs (`windowSize`, `maxToRenderPerBatch`, `drawDistance`) in `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:678-680`.

## Root Cause Analysis

### Mandatory Checks

| Check | Current Behavior | Evidence | Impact |
|---|---|---|---|
| Scroll event frequency and throttling | `onScroll` at `32ms`; direction updates on JS | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:573-582`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:675` | Moderate JS cost; not main issue alone |
| Viewability and active item calculation | `minimumViewTime: 0`, threshold 30%, immediate commit enabled | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:506-509`, `mobile/src/presentation/components/infiniteFeed/hooks/useInfiniteFeedConfig.ts:26`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:565-567` | High active-switch frequency under fast scroll |
| Video player lifecycle (mount/unmount/reuse) | Infinite path mounts player per card conditionally; no pool reuse | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:216`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:748` | High decoder/setup churn vs pooled architecture |
| Preload and buffer strategy | Prefetch ahead=6, immediate cache attempts, parallel downloads up to 3 on Wi-Fi | `mobile/src/presentation/components/infiniteFeed/hooks/useInfiniteFeedConfig.ts:33`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:359-447`, `mobile/src/data/services/FeedPrefetchService.ts:47-49` | Network/IO contention during fast navigation |
| Synchronous work on JS thread | Frequent file metadata checks in cache service path | `mobile/src/data/services/VideoCacheService.ts:70-75`, `mobile/src/data/services/VideoCacheService.ts:158-166` | Can add JS stalls under heavy cache lookup |
| State update density | Multiple active/pending state writes per candidate change | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:225-234`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:563-570` | Re-render pressure around active switch |
| Re-render triggers | `resolvedVideoSources` object cloning and list-level state changes | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:188-197`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:627-635` | GC churn + manager re-renders |
| Memory pressure and GC | Growing source map + frequent spread copies; variable card heights vs fixed estimate | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:118`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:57`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:232-237` | GC spikes, possible layout remeasure overhead |

### Thread-Isolated Bottlenecks

1. JS thread bottleneck:
- `onViewableItemsChanged` + immediate commit path updates refs + React state often.
- Active-index effect does prefetch orchestration and source-map updates (`setResolvedSourceForId`).
- Cache service path can perform repeated file checks.

2. UI thread bottleneck:
- Infinite path does not separate video texture layer from feed layer like pooled path.
- Card heights vary by media aspect ratio while list uses fixed estimate; mismatch can increase layout correction work.

3. Decode bottleneck:
- `shouldPauseForScroll = false` keeps playback running while scrolling.
- `allowDecodePrewarm` can decode a second near-active item (`DECODE_PREWARM_PLAY_COUNT: 1`), increasing decoder contention.

4. Network/IO bottleneck:
- Active item flow can trigger `cacheVideoNow`/`queueVideos` repeatedly.
- Queue generation resets on index change, causing churn in prefetch intent while downloads may still be in flight.

## Critical Bottlenecks

Severity order:

1. P0: Active item commit frequency + multi-state updates on scroll
- Evidence: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:506-570`
- Why critical: drives repeated React work exactly while user is swiping.

2. P0: No player reuse pool in Infinite path
- Evidence: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:216`, `mobile/src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx:4-10`
- Why critical: repeated mount/decode/first-frame readiness is expensive compared to pooled slots.

3. P1: Aggressive prefetch/cache resolution coupled to active-index effect
- Evidence: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:359-447`, `mobile/src/data/services/FeedPrefetchService.ts:57-99`
- Why critical: competes with active playback transitions for JS, IO, and bandwidth.

4. P1: Decode prewarm + active playback overlap during scroll
- Evidence: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:460`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:217-227`
- Why critical: can cause dropped frames on mid/low-end devices.

5. P2: Source map cloning / memory churn
- Evidence: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:188-197`
- Why critical: long-session GC pressure, especially with large feeds.

## Instagram/X Comparison Insights

Inference from production feed behavior patterns:

| Dimension | Current Infinite Feed | Instagram / X / TikTok Pattern | Gap |
|---|---|---|---|
| Active video switching strategy | Immediate commit on viewability with low settle guard | Stabilized commit (center/settle/velocity-aware), fewer JS state writes | High |
| Player pooling / reuse | Card-local player lifecycle | Dedicated player pool or long-lived player surfaces | High |
| Prefetch window size | Ahead=6 + cache resolution on active transitions | Adaptive prefetch budgets by velocity/network/device | Medium-High |
| Scroll + video synchronization | JS callback + React state mediated | UI-thread/native-driven switching, minimal JS in hot path | High |
| UI overlay lifecycle | Card-level overlays per item | Shared/decoupled overlay model, active binding only | Medium |

The codebase already has a better blueprint for player reuse in pool feed (`mobile/src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx:304-307` and `mobile/src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx:773-778`).

## Recommended Fixes

### Measure First (mandatory before tuning)

1. Add Infinite-path transition instrumentation parity with pool path.
- Today `PerformanceLogger.markFirstVideoReady` is called in pool path only (`mobile/src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx:713`).
- Add same checkpoint in Infinite path (`onReadyForDisplay`) and record:
  - `active_switch_latency_ms` (viewable candidate -> first frame ready)
  - `rebuffer_events_per_100_swipes`
  - `active_switches_per_swipe` (stability metric)
  - JS frame budget: p95 JS task duration during continuous swipe

2. Define acceptance targets:
- `active_switch_latency_ms p95 < 120ms` (warm path), `< 250ms` (cold path).
- `<1%` dropped UI frames on a 30-second fast-swipe scenario.
- `<1.2` active-switch commits per swipe gesture.

### Core Fix Set

1. Decouple commit from noisy viewability updates.
- Raise settle guard (`minimumViewTime`) and commit on momentum-end when velocity is high.
- Keep immediate commit only for low-velocity drags.

2. Collapse active/pending state into one reducer update.
- Replace multi-`setState` writes with a single transaction.

3. Reduce decode/network contention.
- Lower prefetch window from 6 to adaptive (e.g., 2-3 base, +1 on stable Wi-Fi).
- Avoid `cacheVideoNow` for current active if playback can start from stream; prioritize next item only.
- Suspend decode prewarm while high-velocity scroll is active.

4. Move cache-path updates off critical render path.
- Avoid repeated object spread updates for every neighbor source resolution.
- Use mutable ref/LRU map for non-active items and only publish state for active+next.

5. Align item estimation with real rendered heights.
- Either provide better item-size heuristics per media aspect bucket or precompute layout bands.

### Minimal Targeted Code Pattern (for state batching)

```ts
type FeedState = {
  activeId: string | null;
  activeIndex: number;
  pendingId: string | null;
  pendingIndex: number;
};

const [feedState, setFeedState] = useState<FeedState>({...});

const commitCandidate = (id: string, index: number) => {
  setFeedState((prev) =>
    prev.activeId === id && prev.activeIndex === index
      ? prev
      : { activeId: id, activeIndex: index, pendingId: id, pendingIndex: index }
  );
};
```

## Optional Advanced Optimizations

1. Introduce an Infinite-feed player pool (3 -> 5 dynamic by device class) and keep cards as visual shells only.
2. Shift active-index resolution to UI-thread signal path (Reanimated + minimal `runOnJS` commit).
3. Device-tier policy:
- low-end: disable decode prewarm, smaller prefetch window
- high-end: allow prewarm with strict decode budget
4. Precompute cache keys and avoid per-event URL normalization in hot path.

## Roadmap (Checklist)

### Quick Wins

- [ ] Increase `minimumViewTime` and disable strict immediate commit during high-velocity scroll.
- [ ] Reduce `PREFETCH_AHEAD_COUNT` from 6 to adaptive default 3.
- [ ] Gate decode prewarm while `isFeedScrolling` is true.
- [ ] Add Infinite-path `first_frame_ready` metrics and active-switch latency logging.
- [ ] Limit resolved-source state publishing to active and immediate next item.

### Medium Effort Refactors

- [ ] Replace multi-state writes in active/pending flow with single reducer transaction.
- [ ] Refactor cache resolve pipeline to avoid repeated object cloning per resolved id.
- [ ] Improve item-size estimation strategy for aspect-ratio variance.
- [ ] Add per-device feed config policy (prefetch/decode knobs).

### High Impact Architectural Changes

- [ ] Port player-pool architecture into Infinite path (decouple list item lifecycle from video lifecycle).
- [ ] Move active-item switching closer to UI-thread driven logic.
- [ ] Unify feed playback engine so Infinite and Pool share the same player orchestration core.

## Final Assessment

Current Infinite feed has good intent (memoization, prefetch, decode-prewarm, virtualization limits), but the hot path still couples scroll, state mutation, and media lifecycle too tightly.  
To reach Instagram/X-level smoothness, the first hard requirement is reducing active-switch churn and isolating video lifecycle from card lifecycle.
