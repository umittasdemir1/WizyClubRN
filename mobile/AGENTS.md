# Mobile Agent Guidelines

## Scope
Applies to `mobile/` only (Expo + React Native + TypeScript strict).

## Performance Rules
- For heavy feed/list screens, prefer `FlashList`. Use `FlatList` only with explicit reason.
- Minimize unnecessary renders with `React.memo`, stable callbacks, and state isolation.
- Follow the loop: `Measure -> Optimize -> Re-measure -> Validate`.

## Always
- Run type-check: `npx --prefix mobile tsc --noEmit` after mobile code changes.
- Keep platform parity (Android/iOS behavior and UX).
- Keep alias imports consistent (`@/`, `@core/`, `@domain/`, `@data/`, `@presentation/`).

## Ask First
- Changes under `mobile/android/` or other native configuration-critical files.
- New runtime permissions or background behavior changes.
- Dependency additions that impact binary size or startup performance.

## Never
- Never commit secrets or API keys in source or logs.
- Never patch `node_modules` and commit vendor changes.
- Never merge feed performance changes without before/after evidence when metrics are available.

## Quick Commands
- Dev server: `npm --prefix mobile run start`
- Android: `npm --prefix mobile run android`
- iOS: `npm --prefix mobile run ios`
- Type-check: `npx --prefix mobile tsc --noEmit`
- Baseline perf: `npm --prefix mobile run perf:baseline:android`
