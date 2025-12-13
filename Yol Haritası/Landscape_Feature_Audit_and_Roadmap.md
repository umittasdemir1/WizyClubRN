# Landscape Video Feature - Technical Audit & Roadmap

**Date:** 2025-12-12
**Status:** Deferred / Reverted
**Goal:** Implement a generic "YouTube-style" landscape video player with smooth transitions, custom UI, and persistence.

## 1. Architecture Overview (Attempted)

### A. Orientation Management
- **Config**: Changed `app.json` from `"orientation": "portrait"` to `"default"`.
- **Global Lock**: In `app/_layout.tsx`, we locked the screen to `PORTRAIT_UP` on mount (`ScreenOrientation.lockAsync`) to maintain the portrait feel of the app, unlocking it only when requested.
- **Specific Lock**: In `index.tsx`, toggling fullscreen triggered `ScreenOrientation.unlockAsync()` followed by `ScreenOrientation.lockAsync(Landscape)`.

### B. Z-Index Layering (The "Clickable" Solution)
A major challenge was that landscape controls were not clickable because they were rendered *inside* the Portrait gesture components (like `DoubleTapLike`).
**Solution**:
- We separated the render logic.
- **Portrait**: Wrapped in `DoubleTapLike`.
- **Landscape**: Rendered in a high Z-Index container (`zIndex: 100`) at the root of the item, bypassing all portrait wrappers.

### C. Unified Render (Smooth Transition)
To prevent "black screen" or player reloading during rotation:
- We moved away from `if (isLandscape) return <LandscapeView>`
- We adopted a **Unified Component Tree**:
    - `VideoLayer` is ALWAYS rendered.
    - `DoubleTapLike` is ALWAYS rendered but disabled via prop (`enabled={!isLandscape}`).
    - UI Overlays (`ActionButtons` vs `LandscapeControls`) are conditionally rendered absolutely on top.
- **Constraint**: `VideoLayer` width must effectively switch from `screenWidth` to `screenHeight` (or full width).

## 2. Issues Encountered

### A. "Snap Back" / Race Conditions
- **Issue**: Rotating to landscape would sometimes snap back to portrait immediately.
- **Cause**: React component lifecycle. When the Portrait component unmounted, its cleanup effect triggered `unlockAsync()`, which the OS interpreted as "return to natural orientation (Portrait)".
- **Fix**: Centralized orientation logic in `index.tsx` and removed component-level cleanup in `VideoLayer`.

### B. "Nav Bar Gone" / "Missing"
- **Issue**: `undefined` style in `navigation.setOptions` did not correctly restore the Portrait Tab Bar styling after it was hidden in Landscape.
- **Fix**: Explicitly reconstructing the `tabBarStyle` object in the `else` block using `useColorScheme` and `useSafeAreaInsets`.

### C. Transition Jank (Open/Close)
- **Issue**: Layout jumps, resizing glitches, or black frames during rotation.
- **Causes**:
    - `paddingVertical` differences between Portrait (25px) and Landscape (0px).
    - `Dimensions.get('screen')` vs `useWindowDimensions()` desync during the rotation frame.
- **Partial Fix**: Removed padding and standardized width calculations.

## 3. Future Roadmap (How to Re-Implement)

When this feature is revisited, follow these steps:

### Phase 1: Foundation (Native)
1.  [ ] **Config**: Set `app.json` to `default`. Run `npx expo run:android`.
2.  [ ] **Global Lock**: Implement strict `PORTRAIT_UP` lock in `app/_layout.tsx`.

### Phase 2: Component Architecture
1.  [ ] **Create `LandscapeVideoControls`**: (Code saved below).
2.  [ ] **Modify `VideoLayer`**:
    - Accept `onFullScreenPress`.
    - Accept `isLandscape` prop (optional, or handle inside).
    - ensure no `paddingVertical` causes jumps.

### Phase 3: The "Unified" Render (CRITICAL)
Do NOT wrap the Video component conditionally.
```tsx
<View style={styles.container}>
   <UnifiedVideoPlayer /> {/* Always mounted */}
   
   {isLandscape ? (
      <LandscapeControls style={{zIndex: 100}} />
   ) : (
      <PortraitControls style={{zIndex: 50}} />
   )}
</View>
```

### Phase 4: Persistence
- Listen to `isLandscape`.
- Trigger `listRef.scrollToIndex({ index, animated: false })` to ensure the list snaps to the correct video after the dimension change.

## 4. Archived Code Snippets

### LandscapeVideoControls.tsx (The UI)
*This component provided the top bar (Back button), bottom bar (Seeker, Icons), and clean layout.*
(Please refer to repository history or `brain/` artifacts for the full code of this component).

### Correct Tab Bar Hiding Logic
```tsx
useEffect(() => {
    if (isLandscape) {
        navigation.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
        navigation.setOptions({
            tabBarStyle: {
                backgroundColor: isDark ? '#000' : '#FFF',
                height: 55 + insets.bottom,
                display: 'flex'
                // ... other props
            }
        });
    }
}, [isLandscape]);
```
