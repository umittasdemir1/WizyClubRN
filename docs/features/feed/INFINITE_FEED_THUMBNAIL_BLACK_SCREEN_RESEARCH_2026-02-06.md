# Infinite Feed Thumbnail -> Black Screen Research (February 6, 2026)

## Problem
- User-visible behavior: thumbnail is visible, then screen goes black briefly, then video starts.

## Deep Investigation Summary

### 1. Local code-path analysis (infinite feed)
- Active card rendering path was switching media tree between `Image` and `Video` branches.
- During branch swap, the thumbnail layer could be unmounted before video first frame was reliably visible, creating a black gap.
- Related file: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx`

### 2. External source verification (react-native-video v6)
- `onReadyForDisplay` is documented as a readiness event for the first video frame pipeline.
  - Source: https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/events/#onreadyfordisplay
- Android has a shutter view behavior and explicit props for black-flash mitigation:
  - `hideShutterView` (Android): https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/props/#hideshutterview
  - `shutterColor` (Android): https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/props/#shuttercolor

## Applied Fix Strategy

### A. Keep thumbnail mounted as persistent base layer
- Thumbnail remains rendered underneath the video layer.
- This removes unmount/remount gaps between thumbnail and video layers.

### B. Delay video visibility until frame is actually progressing
- Video starts with `opacity: 0`.
- Video becomes visible on first `onProgress` event (with ready fallback timer from `onReadyForDisplay`).
- This avoids exposing black shader/shutter frames.

### C. Android shutter mitigation
- Enabled `hideShutterView={true}` and `shutterColor="transparent"`.

## Code Changes
- Main implementation: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx`
  - persistent thumbnail base layer
  - video opacity gating (`videoHidden`)
  - frame reveal logic (`onProgress` + ready fallback)
  - Android shutter props

## Verification
- TypeScript check passed:
  - `cd mobile && npx tsc --noEmit`

## Recommended Runtime Validation
1. Test fast scroll on Android physical device (mid-tier and low-tier if possible).
2. Validate transition on poor network (3G/slow Wi-Fi throttling).
3. Confirm no regression when `INF_DISABLE_THUMBNAIL` flag is enabled.
