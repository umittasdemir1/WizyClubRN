---
name: mobile-feed-perf
description: Use when feed scrolling, rendering, prefetching, or video playback performance changes in mobile/. Enforces measure-optimize-validate loop and mobile type safety checks.
---

# Mobile Feed Performance

## When to use
- Changes in feed managers/cards/hooks/services
- FlashList/FlatList virtualization changes
- Prefetch/cache/concurrency tuning

## Workflow
1. Run type checks and perf baseline checks.
2. Apply focused optimization (render count, virtualization, prefetch behavior).
3. Re-run baseline and compare before/after metrics.

## Commands
- `bash scripts/run-mobile-perf-checks.sh`

## Success criteria
- `npx --prefix mobile tsc --noEmit` passes.
- No regression in baseline performance results (if baseline script is runnable).
