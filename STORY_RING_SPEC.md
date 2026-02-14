# Story Ring Design Spec

## Source Of Truth
- Component: `mobile/src/presentation/components/shared/AdvancedStoryRing.tsx`
- Purpose: shared story ring renderer for all avatar contexts.

## Visual Design
- Ring type: continuous circular gradient ring (conic-like appearance).
- Active ring: multi-stop pastel spectrum.
- Viewed ring: single neutral gray.
- Secondary glow layer: none.
- Double-border effect: none (single ring stroke only).

## Active Palette (clockwise, starts from top)
1. `#EDA65D`
2. `#E6CF67`
3. `#BFD576`
4. `#99D3D6`
5. `#A9BCE8`
6. `#B8A4E6`
7. `#DE86B8`
8. `#F26B60`
9. `#D77FBD`
10. `#9FADE6`
11. `#86BFE7`
12. `#A9D776`
13. `#E5CA67`
14. `#EDA65D` (loop close)

## Geometry + Rendering
- Start angle: `-90deg` (top).
- Rendering method: segmented SVG arcs with interpolated colors.
- Segment count: adaptive per size, clamped to `120..240`.
- Segment stroke cap: `square` (prevents dot artifacts and dashed look).
- Inner avatar container: circular clip, background `#0E0F12`.

## States
- `viewed = false`: gradient ring.
- `viewed = true`: `#9A9A9A` solid ring.

## Public API
- `size: number`
- `thickness?: number` (default `1.5`)
- `gap?: number` (default `1.5`)
- `viewed?: boolean` (default `false`)
- `children?: React.ReactNode`

## Recommended Usage
- Infinite/Pool/Profile story avatars: `thickness=1.5`, `gap=1.5`.
- Explore rail (larger avatar): `thickness=2.5`, `gap=2.5`.

## Notes
- All temporary profile test overlays and forced-active test flags were removed.
- For future ring tuning, update only `AdvancedStoryRing.tsx` to keep consistency across app surfaces.
