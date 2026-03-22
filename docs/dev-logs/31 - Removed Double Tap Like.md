# DoubleTapLike Feature - Removal Documentation

## Overview
DoubleTapLike is a TikTok/Instagram-style feature that shows an animated heart when user double-taps on a video to like it.

## Component Location
`/home/user/WizyClubRN/mobile/src/presentation/components/feed/DoubleTapLike.tsx`

## How It Works

### 1. Component Structure
```tsx
<DoubleTapLike
    ref={doubleTapRef}
    onDoubleTap={handleDoubleTap}
    onSingleTap={onFeedTap}
    onLongPress={onLongPress}
    onPressOut={onPressOut}
    onPressIn={onPressIn}
>
    {children}
</DoubleTapLike>
```

### 2. Animation Details
- **Heart Icon**: Red heart (color: #FF2146, size: 100px)
- **Animation**: Spring animation with scale from 0 → 1.2, then fade out
- **Position**: Appears at tap location with slight random rotation (-15° to +15°)
- **Duration**: ~500ms total (spring in + fade out)
- **Asset**: `/assets/icons/doubletablike.svg`

### 3. Tap Detection Logic
- **Single Tap**: 350ms delay, triggers `onSingleTap` (pause/play video)
- **Double Tap**: Within 350ms, triggers `onDoubleTap` (like video + animation)
- **Long Press**: Triggers `onLongPress` (opens MoreOptions menu)

### 4. Usage in FeedItem.tsx

**Props:**
```tsx
interface FeedItemProps {
    onDoubleTapLike: (videoId: string) => void;
    // ... other props
}
```

**Implementation:**
```tsx
// Ref for programmatic animation trigger
const doubleTapRef = useRef<DoubleTapLikeRef>(null);

// Double tap handler
const handleDoubleTap = useCallback(() => {
    // Trigger button animation
    actionButtonsRef.current?.animateLike();

    // Update state after 16ms delay
    setTimeout(() => {
        onDoubleTapLike(video.id);
    }, 16);
}, [video.id, onDoubleTapLike]);

// Like button press handler (also triggers center animation)
const handleLikePress = useCallback(() => {
    if (!video.isLiked) {
        doubleTapRef.current?.animateLike(); // Trigger center heart
    }
    onToggleLike(video.id); // Immediate state update
}, [video.isLiked, video.id, onToggleLike]);
```

### 5. Integration Points

**FeedItem.tsx (Line 94-131):**
- Wraps video content in `<DoubleTapLike>` component
- Handles double-tap → like logic
- Coordinates with ActionButtons for synchronized animation

**ActionButtons.tsx (Line 217):**
- Has `animateLike()` method to animate the like button
- Called when double-tap occurs on video

**FeedManager.tsx:**
- Passes `handleDoubleTapLike` callback to FeedItem
- Manages like state via `toggleLike` from useVideoFeed

### 6. Files Using DoubleTapLike
1. `/src/presentation/components/feed/DoubleTapLike.tsx` - Main component
2. `/src/presentation/components/feed/FeedItem.tsx` - Primary usage
3. `/src/presentation/components/feed/index.ts` - Export
4. `/src/presentation/components/feed/FeedItem.backup.tsx` - Backup file
5. `/src/presentation/components/feed/FeedItemOverlay.tsx` - Alternative implementation

### 7. Dependencies
```tsx
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import LikeIcon from '../../../../assets/icons/doubletablike.svg';
```

## Removal Impact

### What Will Break:
1. ❌ Double-tap to like functionality
2. ❌ Center heart animation on double-tap
3. ❌ Center heart animation on like button press

### What Will Still Work:
1. ✅ Single tap to pause/play
2. ✅ Long press for options menu
3. ✅ Like button functionality (just without center animation)
4. ✅ ActionButtons like button animation
5. ✅ All other touch interactions

### Files to Modify:
1. `FeedItem.tsx` - Remove DoubleTapLike wrapper, replace with View or TouchableWithoutFeedback
2. `ActionButtons.tsx` - Remove animateLike call from like button handler
3. `FeedManager.tsx` - Remove handleDoubleTapLike callback
4. `index.ts` - Remove DoubleTapLike export

### Files to Delete:
1. `DoubleTapLike.tsx` - Main component
2. `/assets/icons/doubletablike.svg` - Heart icon asset

## Alternative Implementation After Removal

Replace `<DoubleTapLike>` with:

```tsx
<TouchableWithoutFeedback
    onPress={onFeedTap} // Single tap for pause/play
    onLongPress={onLongPress} // Long press for menu
    onPressOut={onPressOut}
    onPressIn={onPressIn}
>
    <View style={StyleSheet.absoluteFill}>
        {children}
    </View>
</TouchableWithoutFeedback>
```

## User Experience Change

**Before:**
- Double-tap anywhere on video → Big heart animation + like
- Tap like button → Small button animation + big heart animation

**After:**
- Double-tap → Same as single tap (pause/play)
- Tap like button → Only small button animation
- To like: Must use like button on right side

---

*Documented on: 2026-01-22*
*Reason for removal: User preference - feature not needed*
