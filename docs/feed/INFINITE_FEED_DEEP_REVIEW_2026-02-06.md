# Infinite Feed Deep Code Review (February 6, 2026)

## Scope
- Screen entry and data flow: `mobile/app/(tabs)/index.tsx`
- Infinite feed orchestrator: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx`
- Card/media rendering: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx`
- Carousel behavior: `mobile/src/presentation/components/infiniteFeed/InfiniteCarouselLayer.tsx`
- Feed data identity/perf: `mobile/src/presentation/hooks/useVideoFeed.ts`

## Findings And Solutions

### 1. Critical: Inline video was not truly limited to active item
- Symptom match: wrong thumbnail/video pairing, heavy stutter during fast scroll, black frames under load.
- Root cause: cards were allowed to render video components too aggressively, so multiple visible cells competed for decode/render resources.
- Evidence: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:130`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:308`

#### Solution
- Enforced strict active-only render condition with pause-awareness and measurement-awareness.
- Added `isPaused` and `isMeasurement` gates to prevent unnecessary `VideoPlayer` mount.
- Added a poster overlay until `onReadyForDisplay` to avoid thumbnail->video flicker.
- Implementation points: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:130`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:320`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:324`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:583`

### 2. High: Aggressive clipping in FlashList could produce black cells on fast scroll
- Symptom match: screen turning black while rapid scrolling.
- Root cause: clipping + rapid recycle with media surfaces is fragile in RN video-heavy lists.
- Evidence: list behavior now hardened in `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:205`

#### Solution
- Switched `removeClippedSubviews` to `false` for safer video rendering lifecycle.
- Re-tuned estimated item size to reduce layout churn.
- Implementation points: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:204`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:205`

### 3. High: Active item selection strategy could drift from top-most visible card
- Symptom match: wrong video marked active (wrong poster/video transitions).
- Root cause: selecting first playable item can desync from actual top-most visible card in mixed (video+carousel) feeds.
- Evidence: stabilized logic in `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:158`

#### Solution
- Replaced strategy with top-most viewable token (sorted by visible index).
- Added active-id ref guard to prevent redundant state churn.
- Implementation points: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:66`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:158`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:167`

### 4. High: Recycling state leakage in card/carousel
- Symptom match: UI state carrying over between recycled cells (wrong expanded text state, wrong carousel index/load state).
- Root cause: local state not reset on recycled item identity change.
- Evidence: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:109`, `mobile/src/presentation/components/infiniteFeed/InfiniteCarouselLayer.tsx:71`

#### Solution
- Reset local card state (`description`, `videoReady`) on `item.id`/render-mode transitions.
- Reset carousel `activeIndex`/loaded cache when media identity changes.
- Implementation points: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:109`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:113`, `mobile/src/presentation/components/infiniteFeed/InfiniteCarouselLayer.tsx:76`

### 5. Medium: Thumbnail fallback could pick wrong media source
- Symptom match: poster mismatches or blank poster when fallback resolves to a non-image URL.
- Root cause: fallback chain was too permissive.
- Evidence: hardened resolver in `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:116`

#### Solution
- Introduced strict non-empty string checks.
- Prefer explicit thumbnail, then image media URL, then media thumbnail.
- Implementation points: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:25`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:116`

### 6. Medium: Object identity churn increased re-render pressure
- Symptom match: unnecessary card updates while scrolling.
- Root cause: `syncedVideos` recreated every item object on each render.
- Evidence: improved identity-preserving mapping in `mobile/src/presentation/hooks/useVideoFeed.ts:361`

#### Solution
- Keep original video object when `isFollowing` value is unchanged.
- Clone only affected items.
- Implementation points: `mobile/src/presentation/hooks/useVideoFeed.ts:361`

### 7. Medium: Per-item layout animation in recycled list increased jitter risk
- Symptom match: card shaking/tremble while scrolling.
- Root cause: per-cell layout transitions inside a highly recycled list.
- Evidence: card container no longer uses layout transition (see render container in `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:475`).

#### Solution
- Removed layout transition from the card wrapper.
- Kept static container rendering for stable scroll.

## External Validation Notes (Web)
- FlashList v2 recycling guidance explicitly requires resetting local state when a different item is rendered in the same recycled component.
  - Source: https://shopify.github.io/flash-list/docs/recycling/
- FlashList known behavior/constraints used to avoid unsupported or risky list assumptions.
  - Source: https://shopify.github.io/flash-list/docs/known-issues/

## Verification
- TypeScript/TSX check executed successfully:
  - Command: `npx tsc --noEmit`
  - Status: pass

## Remaining Manual Smoke Checks
1. Open feed and swipe quickly down/up for at least 20-30 items; verify no full-black viewport.
2. Confirm each card shows correct thumbnail before video ready.
3. Validate smooth poster->video transition on active card.
4. Test mixed content (video + carousel) to ensure active card selection is stable.
