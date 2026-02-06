# InfiniteFeed Performance Analysis

> **Target**: Instagram/X-level scroll smoothness  
> **Status**: Critical architectural issues identified  
> **Date**: 2026-02-06

---

## Executive Summary

The WizyClub InfiniteFeed does not achieve Instagram/X-level smoothness due to **fundamental architectural decisions** that create render/video lifecycle conflicts. While the codebase shows awareness of performance patterns (memoization, useCallback, player pooling), the **coupling between scroll state and video lifecycle** creates unavoidable JS thread contention during rapid scrolling.

### Key Findings

| Category | Severity | Impact |
|----------|----------|--------|
| Video mount/unmount on scroll | 🔴 High | Frame drops during scroll |
| State updates triggering re-renders | 🔴 High | JS thread blocking |
| Overlay layer complexity | 🟡 Medium | Extra render passes |
| Cache resolution async in render path | 🟡 Medium | First-frame delays |

---

## Architecture Overview

### Two Parallel Feed Systems

WizyClub maintains **two separate feed implementations**:

1. **InfiniteFeedManager** (610 lines) - Card-based, Instagram-style grid
   - Each card embeds its own `VideoPlayer` component
   - Video mounts/unmounts based on `isActive || isPendingActive`
   - FlashList with `estimatedItemSize` of screen height × 0.82

2. **PoolFeedManager** (406 lines) - TikTok-style full-screen vertical feed
   - Uses a 3-player video pool (`PoolFeedVideoPlayerPool`)
   - Separates scroll layer from video layer
   - Uses Reanimated SharedValues for scroll sync

> [!WARNING]
> Having two feed systems doubles maintenance burden and prevents unified optimization.

---

## Detailed Technical Findings

### 1. InfiniteFeedCard Video Lifecycle (Critical)

**Location**: `InfiniteFeedCard.tsx:165-166`

```tsx
const shouldMountVideo = isVideo && (isActive || isPendingActive) && !disableInlineVideo && !isMeasurement;
const shouldPlayVideo = isVideo && isActive && !isPaused && !disableInlineVideo && !isMeasurement;
```

**Problem**: Every scroll that changes `isActive` triggers:
1. Video component mount/unmount (expensive)
2. VideoPlayer initialization
3. Source loading
4. First frame decode

**Instagram/X Behavior**: Pre-mount videos invisibly, only toggle play/pause state.

---

### 2. State Cascade on Viewability Change

**Location**: `InfiniteFeedManager.tsx:458-478`

```tsx
const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    // ... filtering logic ...
    pendingActiveIdRef.current = nextId;
    pendingActiveIndexRef.current = resolvedNextIndex;
    setPendingInlineId(nextId);           // ← State update
    setPendingInlineIndex(resolvedNextIndex); // ← State update
    if (immediateActiveCommit) {
        commitPendingActive('viewable-immediate');  // ← More state updates
    }
}, [commitPendingActive, immediateActiveCommit]);
```

**Problem**: Each viewability callback triggers multiple state updates:
- `setPendingInlineId` → re-render
- `setPendingInlineIndex` → re-render
- `setActiveInlineId` (inside commit) → re-render
- `setActiveInlineIndex` (inside commit) → re-render

This creates **4+ re-renders per scroll stop**.

**Instagram/X Behavior**: Single atomic state update, or use refs with forced re-render only when necessary.

---

### 3. Pool Feed Recycle Delay

**Location**: `PoolFeedVideoPlayerPool.tsx:604-607`

```tsx
recycleTimeoutRef.current = setTimeout(() => {
    recycleSlots();
}, FEED_CONFIG.RECYCLE_DELAY_MS);  // 100ms
```

**Problem**: 100ms delay before slot recycling means:
- User can scroll past 2-3 items before recycling starts
- Creates visible content flash
- Async cache resolution adds more latency

**Instagram/X Behavior**: Predictive slot assignment based on scroll velocity.

---

### 4. FlashList Configuration Issues

**InfiniteFeedManager**:
```tsx
<FlashList
    estimatedItemSize={ESTIMATED_CARD_HEIGHT}  // screen × 0.82
    removeClippedSubviews={false}  // ← Keeps all views in memory
    // Missing: windowSize, maxToRenderPerBatch
/>
```

**PoolFeedManager**:
```tsx
<AnimatedFlashList
    maxToRenderPerBatch={1}
    windowSize={3}
    drawDistance={ITEM_HEIGHT * 1.5}
    removeClippedSubviews={false}  // ← Still disabled
/>
```

**Problem**: `removeClippedSubviews={false}` keeps off-screen views mounted. Combined with inline video players, this means multiple video components exist simultaneously.

---

### 5. Overlay Layer Complexity

**Location**: `PoolFeedOverlays.tsx:247-256`

```tsx
{overlayDataList.map((overlay) => (
    <PoolFeedActiveVideoOverlay
        key={overlay.key}
        data={overlay.data}
        playback={activeVideoPlayback}
        timeline={activeVideoTimeline}
        actions={activeVideoActions}
    />
))}
```

**Problem**: Overlays are re-created for each `overlayDataList` item change. With `UI_PRELOAD_AHEAD_COUNT=2` and `UI_PRELOAD_BEHIND_COUNT=0`, this means 3 overlay instances at minimum.

**Instagram/X Behavior**: Single overlay component that re-binds to active item via refs.

---

### 6. Cache Resolution in Render Path

**Location**: `InfiniteFeedManager.tsx:299-354`

```tsx
const memoryCached = VideoCacheService.getMemoryCachedPath(activeVideoUrl);
if (memoryCached) {
    setResolvedSourceForId(activeVideo.id, memoryCached);
} else {
    // Async path that still triggers state updates
    prefetchService.cacheVideoNow(activeVideoUrl).then((cachedPath) => {
        resolveIfCurrent(cachedPath);  // ← State update
    });
}
```

**Problem**: Cache miss triggers async operation → state update → re-render. This happens **during the render cycle** initiated by viewability change.

---

### 7. renderItem Dependency Array Bloat

**Location**: `InfiniteFeedManager.tsx:450`

```tsx
}, [activeInlineId, currentUserId, handleCarouselTouchEnd, handleCarouselTouchStart, 
    handleOpenVideo, isMuted, isPaused, netInfo.type, pendingInlineId, pendingInlineIndex, 
    shouldPauseForScroll, themeColors, toggleFollow, toggleLike, toggleMute, toggleSave, 
    toggleShare, toggleShop]);
```

**Problem**: 17 dependencies mean `renderItem` is recreated frequently. This invalidates FlashList's memoization.

---

## Instagram/X Comparison

| Aspect | WizyClub | Instagram/X |
|--------|----------|-------------|
| Video mounting | On visibility change | Pre-mounted, always exist |
| Play state | Via component mount | Via player.play()/pause() |
| Scroll handler | JS callback with state | Native driver / worklet |
| Active index | Multiple state updates | Single atomic update |
| Overlay binding | Component per item | Single component, ref binding |
| Cache resolution | In render path | Background prefetch only |
| Player pool | 3 slots, 100ms recycle | 5+ slots, predictive |

---

## Why Smoothness Breaks Down

### The Fundamental Problem

The current architecture ties **video component lifecycle** to **scroll position state**. This creates an unavoidable chain:

```
Scroll → ViewabilityCallback (JS) → setState (multiple) → 
→ Re-render → Video unmount/mount → Decoder init → Frame drop
```

Instagram/X break this chain by:
1. Pre-mounting video components (they always exist)
2. Using refs to control playback (no re-renders)
3. Running viewability logic on UI thread (worklets)
4. Batching all state updates into single atomic update

### Thread Contention Pattern

```
JS Thread:
├── onViewableItemsChanged
├── setPendingInlineId (setState)
├── setPendingInlineIndex (setState)  
├── commitPendingActive
│   ├── setActiveInlineId (setState)
│   └── setActiveInlineIndex (setState)
├── FlashList re-render
│   ├── renderItem for item N-1 (unmount video)
│   ├── renderItem for item N (mount video)
│   └── renderItem for item N+1 (prepare)
└── Video initialization callbacks

UI Thread: Waiting for JS...
```

---

## Root Cause Matrix

| Issue | Category | Impact | Effort to Fix |
|-------|----------|--------|---------------|
| Video mount/unmount on visibility | Lifecycle | 🔴 High | 🔴 High (architectural) |
| Multiple setState calls per scroll | State | 🔴 High | 🟡 Medium |
| 100ms recycle delay | Timing | 🟡 Medium | 🟢 Low |
| removeClippedSubviews=false | Config | 🟡 Medium | 🟢 Low |
| 17-dep renderItem | Rendering | 🟡 Medium | 🟢 Low |
| Overlay per item | Rendering | 🟡 Medium | 🟡 Medium |
| Cache in render path | IO/State | 🟡 Medium | 🟡 Medium |
| Two feed systems | Maintenance | 🟢 Low | 🔴 High |

---

## Conclusion

The InfiniteFeed cannot achieve Instagram/X-level smoothness without **architectural changes** that decouple video lifecycle from scroll state. Quick wins exist (config tuning, dependency reduction), but the fundamental mount/unmount pattern must change for true 60fps smoothness.

See `infinite-feed-roadmap.md` for prioritized action plan.
