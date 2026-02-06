# InfiniteFeed Improvement Roadmap

> **Goal**: Achieve Instagram/X-level scroll smoothness  
> **Approach**: Prioritized by impact vs effort  
> **Date**: 2026-02-06

---

## Task Overview

### Phase 1: Quick Wins (1-2 days)
Low-effort changes with measurable impact.

### Phase 2: State Optimization (2-3 days)
Reduce re-renders and JS thread contention.

### Phase 3: Architectural Refactor (1-2 weeks)
Fundamental changes to video lifecycle management.

---

## Phase 1: Quick Wins

### 1.1 Enable removeClippedSubviews
**Files**: `InfiniteFeedManager.tsx`, `PoolFeedManager.tsx`

```tsx
// Before
removeClippedSubviews={false}

// After
removeClippedSubviews={true}
```

**Expected Impact**: 15-20% memory reduction, faster scroll  
**Risk**: Possible visual glitches on fast scroll (test thoroughly)  
**Dependencies**: None

---

### 1.2 Reduce Recycle Delay
**File**: `usePoolFeedConfig.ts:166`

```tsx
// Before
RECYCLE_DELAY_MS: 100,

// After
RECYCLE_DELAY_MS: 50,  // or even 16 (one frame)
```

**Expected Impact**: Faster content appearance on scroll  
**Risk**: May increase CPU usage slightly  
**Dependencies**: None

---

### 1.3 Optimize renderItem Dependencies
**File**: `InfiniteFeedManager.tsx:420-450`

**Goal**: Extract stable callbacks into refs, reduce dependency count from 17 to ~5.

```tsx
// Before: 17 dependencies
}, [activeInlineId, currentUserId, handleCarouselTouchEnd, ...17 more]);

// After: Use refs for stable callbacks
const callbacksRef = useRef({ toggleLike, toggleSave, ... });
useEffect(() => {
    callbacksRef.current = { toggleLike, toggleSave, ... };
});

const renderItem = useCallback(({ item, index }) => {
    // Use callbacksRef.current instead of direct deps
}, [activeInlineId, pendingInlineId, pendingInlineIndex]); // Only 3 deps
```

**Expected Impact**: Fewer renderItem recreations → better FlashList memoization  
**Risk**: Low  
**Dependencies**: None

---

### 1.4 Add FlashList windowSize to InfiniteFeedManager
**File**: `InfiniteFeedManager.tsx:553-599`

```tsx
<FlashList
    data={videos}
    renderItem={renderItem}
    estimatedItemSize={ESTIMATED_CARD_HEIGHT}
    removeClippedSubviews={true}
    windowSize={5}              // ← Add this
    maxToRenderPerBatch={2}     // ← Add this
    initialNumToRender={2}      // ← Add this
    // ...rest
/>
```

**Expected Impact**: Controlled render budget  
**Risk**: None  
**Dependencies**: None

---

## Phase 2: State Optimization

### 2.1 Batch State Updates
**File**: `InfiniteFeedManager.tsx:178-214`

Replace multiple `setState` calls with single batched update:

```tsx
// Before: 4 separate setState calls
setActiveInlineId(nextId);
setPendingInlineId(nextId);
setPendingInlineIndex(nextIndex);
setActiveInlineIndex(nextIndex);

// After: Single combined state
const [feedState, setFeedState] = useState({
    activeId: null,
    pendingId: null,
    activeIndex: 0,
    pendingIndex: 0,
});

setFeedState(prev => ({
    activeId: nextId,
    pendingId: nextId,
    activeIndex: nextIndex,
    pendingIndex: nextIndex,
}));
```

**Expected Impact**: 4 re-renders → 1 re-render per scroll stop  
**Risk**: Medium (requires careful refactoring)  
**Dependencies**: None

---

### 2.2 Move Viewability Logic to Worklet
**File**: `usePoolFeedScroll.ts`

Current: Viewability callback runs on JS thread.

```tsx
// Current
const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
        // JS thread work
    }, []
);

// Target: Move calculation to worklet
const onViewableItemsChanged = useAnimatedScrollHandler({
    onScroll: (event) => {
        'worklet';
        const targetIndex = Math.floor(event.contentOffset.y / ITEM_HEIGHT);
        runOnJS(setActiveFromIndex)(targetIndex);
    },
});
```

**Expected Impact**: Removes viewability calculation from JS thread  
**Risk**: Medium (FlashList viewability API limitations)  
**Dependencies**: May require custom viewability implementation

---

### 2.3 Decouple Cache from Render
**File**: `InfiniteFeedManager.tsx:281-405`

Move cache resolution out of `useEffect` that triggers on `activeInlineIndex`:

```tsx
// Current: Cache resolution triggers state updates
useEffect(() => {
    // ... cache resolution that calls setResolvedSourceForId
}, [activeInlineIndex, videos]);

// Target: Background prefetch only, no state updates
// Use memo pattern for resolved source lookup
const resolvedSource = useMemo(() => {
    const video = videos[activeInlineIndex];
    if (!video) return null;
    return VideoCacheService.getMemoryCachedPath(getVideoUrl(video)) || getVideoUrl(video);
}, [activeInlineIndex, videos]);
```

**Expected Impact**: Removes async state updates from render path  
**Risk**: Low  
**Dependencies**: None

---

## Phase 3: Architectural Refactor

### 3.1 Pre-Mount Video Components
**Files**: `InfiniteFeedCard.tsx`, `PoolFeedVideoPlayerPool.tsx`

**Current**: Video mounts when `shouldMountVideo` becomes true.

**Target**: Always mount video, control via `paused` prop only.

```tsx
// Current
{shouldMountVideo && videoSource ? (
    <VideoPlayer ... />
) : null}

// Target
<VideoPlayer
    source={videoSource}
    paused={!shouldPlayVideo}  // Only control via paused
    style={[
        styles.video,
        !isActive && styles.invisible  // Use opacity instead of unmount
    ]}
/>
```

**Expected Impact**: Eliminates mount/unmount overhead completely  
**Risk**: High memory usage, needs careful pool management  
**Dependencies**: Pool size increase (3 → 5+)

---

### 3.2 Increase Player Pool Size
**File**: `usePoolFeedConfig.ts:160`

```tsx
// Current
POOL_SIZE: 3,

// Target
POOL_SIZE: 5,  // Or dynamic based on device memory
```

**Expected Impact**: More buffer for fast scrolling  
**Risk**: Memory pressure on low-end devices  
**Dependencies**: Device memory detection

---

### 3.3 Implement Predictive Slot Assignment
**File**: `PoolFeedVideoPlayerPool.tsx`

**Current**: Reactive slot assignment based on current position.

**Target**: Predictive assignment based on scroll velocity.

```tsx
// Add scroll velocity tracking
const velocitySV = useSharedValue(0);
const lastScrollY = useSharedValue(0);

// In scroll handler
onScroll: (event) => {
    'worklet';
    const currentY = event.contentOffset.y;
    velocitySV.value = currentY - lastScrollY.value;
    lastScrollY.value = currentY;
},

// Use velocity to predict next slots
const predictedIndex = activeIndex + Math.sign(velocitySV.value) * 2;
```

**Expected Impact**: Content ready before user arrives  
**Risk**: Medium (prediction can be wrong)  
**Dependencies**: 3.2 (needs larger pool)

---

### 3.4 Single Overlay Component Pattern
**File**: `PoolFeedOverlays.tsx`

**Current**: Maps over `overlayDataList` to create multiple components.

**Target**: Single overlay component that binds to active item via ref.

```tsx
// Current
{overlayDataList.map((overlay) => (
    <PoolFeedActiveVideoOverlay key={overlay.key} ... />
))}

// Target: Single overlay with data binding
const activeDataRef = useRef(overlayDataList.find(o => o.key === activeVideoId));
<PoolFeedActiveVideoOverlay ref={overlayRef} data={activeDataRef.current} />
```

**Expected Impact**: Fewer components, fewer renders  
**Risk**: Low  
**Dependencies**: None

---

## Verification Plan

### Automated Testing
```bash
# Run existing tests to ensure no regressions
cd mobile
npm test

# Run TypeScript checks
npx tsc --noEmit
```

### Performance Measurement
1. Enable Flipper/React DevTools performance monitor
2. Record scroll FPS during:
   - Slow scroll (1 item per second)
   - Fast scroll (fling gesture)
   - Direction change mid-scroll
3. Target: 60fps maintained in all scenarios

### Manual Testing Checklist
- [ ] Slow scroll: Videos play/pause correctly
- [ ] Fast scroll: No black screens, content appears quickly
- [ ] Scroll direction change: No visual glitches
- [ ] Network switch: Cache fallback works
- [ ] App background/foreground: Video resumes correctly

---

## Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| 1.1 removeClippedSubviews | Medium | Low | P1 |
| 1.2 Reduce recycle delay | Medium | Low | P1 |
| 1.3 Optimize renderItem deps | Medium | Low | P1 |
| 1.4 FlashList windowSize | Medium | Low | P1 |
| 2.1 Batch state updates | High | Medium | P2 |
| 2.2 Worklet viewability | High | Medium | P2 |
| 2.3 Decouple cache | Medium | Low | P2 |
| 3.1 Pre-mount videos | Very High | High | P3 |
| 3.2 Increase pool size | High | Low | P3 |
| 3.3 Predictive slots | High | High | P3 |
| 3.4 Single overlay | Medium | Medium | P3 |

---

## Recommended Execution Order

1. **Day 1**: Tasks 1.1, 1.2, 1.3, 1.4 (Quick Wins)
2. **Day 2-3**: Task 2.1 (Batch State), Task 2.3 (Decouple Cache)
3. **Day 4-5**: Task 2.2 (Worklet Viewability)
4. **Week 2**: Task 3.2 (Pool Size), then 3.1 (Pre-Mount)
5. **Week 3**: Task 3.3 (Predictive), Task 3.4 (Single Overlay)

---

## Success Criteria

| Metric | Current (est.) | Target |
|--------|----------------|--------|
| Scroll FPS | 45-55 | 58-60 |
| Time to first frame | 200-400ms | <100ms |
| Re-renders per scroll | 4+ | 1 |
| Video mount time | 150-300ms | 0ms (pre-mounted) |

---

## Notes

- Always test on real devices (both iOS and Android)
- Low-end device testing is critical for pool size changes
- Consider A/B testing Phase 3 changes
- Document any behavioral changes for QA
