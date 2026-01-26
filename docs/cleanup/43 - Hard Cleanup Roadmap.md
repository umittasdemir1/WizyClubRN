# HARD CLEANUP + REFACTOR ROADMAP (WizyClubRN)

## Executive Summary
- The repo contains multiple runtime domains (mobile, backend, tools) plus a large archive of historical docs and scripts; cleanup should focus on deleting unused code and tracked artifacts first, then consolidating ownership boundaries.
- Several modules are clearly unused (hooks, store, feed UI components, discovery components) and can be removed with low risk after reference checks.
- Video/feed lifecycle logic is split across multiple layers; the next refactor should centralize playback, cache, and prefetch ownership with clear APIs.
- Backend has a large monolithic `server.js` and a wide spread of one-off scripts and SQL files; they should be organized and deduplicated to reduce operational risk.

## Cleanup Principles and Guardrails
- Prefer deletion over preservation when a file has zero references and a defined verification step.
- Keep a single source of truth per domain (theme, feed lifecycle, cache/prefetch, scripts).
- Always capture a baseline (build, smoke tests, performance checkpoints) before deleting or refactoring.
- Do not remove anything without a verification path and a rollback plan.

## Inventory: What Exists (High-level Map)
- Root: `backend/`, `mobile/`, `r2-mcp/`, archived docs under `docs/archive/`, tool binaries (`ngrok`, `ngrok-v3-stable-linux-amd64.tgz.1`), and multiple feed audit/refactor docs.
- Backend: `server.js` monolith, `services/HlsService.js`, `docs/openapi.yaml`, many one-off scripts and SQL files in repo root, and tracked runtime artifacts in `backend/temp_uploads/`.
- Mobile app: Expo app with route screens under `mobile/app/`, architecture split into `core/`, `data/`, `domain/`, `presentation/`, and a large feed/video subsystem.
- Tools: `r2-mcp/` package, `backend/scripts/` CLI for DB/R2 checks, `.idx/` tool config folder.
- Assets: local icons/images under `mobile/assets/` plus some remote references to repo-hosted assets.

## Delete List (Safe Removals)
- `mobile/src/presentation/hooks/useVideoPlayback.ts` and `mobile/src/presentation/hooks/useVideoSource.ts` (no references after VideoLayer removal).
- `mobile/src/presentation/hooks/index.ts` (barrel not imported).
- `mobile/src/presentation/hooks/useDraftCleanup.ts` (no references).
- `mobile/src/presentation/store/useNotificationStore.ts` (no references).
- `mobile/src/presentation/components/feed/FeedItemOverlay.tsx` (no references).
- `mobile/src/presentation/components/feed/VideoOverlays.tsx` (no references).
- `mobile/src/presentation/components/feed/BrightnessController.tsx` (no references).
- `mobile/src/presentation/components/feed/SideOptionsSheet.tsx` (no references).
- `mobile/src/presentation/components/feed/index.ts` (barrel not imported).
- `mobile/src/presentation/components/shared/CustomRefreshScrollView.tsx` (no references).
- `mobile/src/presentation/components/shared/LoadingIndicator.tsx` (no references).
- `mobile/src/presentation/components/shared/RectangularStoryRing.tsx` (no references).
- Tracked runtime artifacts in `backend/temp_uploads/*` (should not be versioned).
- Tracked archive `ngrok-v3-stable-linux-amd64.tgz.1` (downloadable on demand).

## Delete List (Needs Verification)
- `mobile/src/presentation/components/discovery/*` (no imports found outside folder; verify no dynamic or future usage).
- Deals domain stack: `mobile/src/domain/usecases/GetDealsUseCase.ts`, `mobile/src/domain/repositories/IDealRepository.ts`, `mobile/src/data/repositories/DealRepositoryImpl.ts`, `mobile/src/data/datasources/MockDealDataSource.ts`.
- User profile domain stack: `mobile/src/domain/usecases/GetUserProfileUseCase.ts`, `mobile/src/domain/repositories/IUserRepository.ts`, `mobile/src/data/repositories/UserRepositoryImpl.ts`.
- Tooling and archives: `r2-mcp/`, `backend/scripts/`, `.idx/`, and the full `docs/archive/` doc archive.

## Consolidation Plan (Duplicates to Merge)
- Theme ownership: `mobile/src/presentation/contexts/ThemeContext.tsx` vs `mobile/src/presentation/store/useThemeStore.ts` (choose one and unify consumption).
- Feed overlays and UI state: reduce overlapping overlay logic between `ActiveVideoOverlay`, `MetadataLayer`, and related components.
- Cache/prefetch ownership: align `FeedPrefetchService` with `TrendingCarousel` ad-hoc cache usage.
- Script sprawl: consolidate backend root scripts and maintenance tasks into a single `backend/scripts/` CLI with consistent inputs and logs.
- Doc sprawl: consolidate `LOGGING_GUIDE.md` and `LOGLAMA_KILAVUZU.md`, move legacy notes to `docs/archive/` with an index.

## Props and Public API Surface Reduction
- `mobile/src/presentation/components/feed/FeedManager.tsx` has many props and passes through many callbacks; move shared actions into hooks or store to reduce prop surface.
- `ScrollPlaceholder` in `FeedManager.tsx` receives `topInset` but does not use it; remove unused props and tighten memo comparisons.
- `ActiveVideoOverlay` and `UploadModal` expose wide props; prefer grouping into domain-specific config objects.

## State/Store Hygiene (Remove/Reduce Fields)
- Remove unused fields and helpers in `mobile/src/presentation/store/useActiveVideoStore.ts` (`customFeed`, `preloadIndices`, `setPreloadIndices`, `useVideoPreloader`, `useShouldVideoPlay`) after confirming no usage.
- Re-evaluate the need for `useNotificationStore.ts` (unused) or connect it to real notification state.
- Avoid duplicating theme state across `ThemeContext` and `useThemeStore`.

## Effects/Listeners/Subscriptions Cleanup
- Centralize `AppState` and `Appearance` listeners in a single lifecycle owner; avoid listeners in modules that may mount more than once.
- Audit timers in `FeedManager.tsx` and `useVideoFeed.ts` to ensure all are cleared on unmount or dependency change.
- Ensure prefetch/service loops do not continue after navigation or feed change.

## Architectural Refactor Targets (By Area)
- Mobile feed: `FeedManager.tsx` is a god component and should be split into focused modules for scroll, overlays, interactions, and lifecycle ownership.
- Video lifecycle: clarify ownership between `VideoPlayerPool`, store state, and feed overlays.
- Backend: split `backend/server.js` into route modules, services, and middleware; isolate R2/HLS logic into `services/`.
- Tooling: move maintenance scripts out of repo root and add consistent documentation and inputs.

## Video/Feed Specific Hygiene (Cache/Preload/Prefetch/Lifecycle)
- Keep a single owner for prefetch decisions (avoid competing logic in `FeedManager` and feature components).
- Remove obsolete playback hooks now that pool-based playback is used everywhere.
- Normalize carousel image-only behavior and keep a single lifecycle contract for active/paused state.

## Dependency Hygiene (Packages, Imports, Build Artifacts)
- Backend: `aws-sdk` (v2) appears unused; verify and remove if confirmed.
- Mobile: verify and remove unused deps such as `react-native-vision-camera`, `react-native-compressor`, `react-native-controlled-mentions`, `react-native-qrcode-svg`, `react-native-color-matrix-image-filters`, `react-native-mmkv`, `react-native-keyboard-controller`, `react-native-worklets`, `react-native-worklets-core`, `@qeepsake/react-native-images-collage`, `@react-native-google-signin/google-signin`, `expo-audio`, `expo-contacts`, `expo-location`, `expo-clipboard`, `expo-local-authentication`, `expo-background-fetch`, `expo-task-manager`, `expo-secure-store`, `expo-sharing`, `expo-tracking-transparency`, `expo-device`.
- Artifacts: remove tracked binaries and runtime output (`ngrok-v3-stable-linux-amd64.tgz.1`, `backend/temp_uploads/*`), and add missing ignore rules.

## Risk Register (What Can Break + Mitigations)
- Feed playback regressions after removing legacy hooks or overlays. Mitigation: feed smoke tests and playback lifecycle validation.
- Theme regressions if ThemeContext and useThemeStore are consolidated. Mitigation: UI snapshot checks across tabs.
- Backend operational scripts removed without replacement. Mitigation: migrate into a documented CLI and keep a backup tag until verified.
- Deleting tracked artifacts without ignore updates could reintroduce noise. Mitigation: update .gitignore and re-run `git status` checks.
- Removing unused dependencies could break dynamic imports or native configuration. Mitigation: build on Android/iOS and run critical flows.

## Test/Verification Plan (What to Validate After Each Phase)
- Build/install: `mobile` (Expo start, Android build), `backend` (node server.js).
- Feed/video smoke: open feed, first video loads, fast scroll, background/foreground, mute/unmute, carousel image swipe.
- Performance checkpoints: app start -> first frame, first video ready, scroll transitions with pool active.
- Regression checks: upload flow, profile screen, notifications screen, explore/deals screens.

## Roadmap (Phased Plan With Sequencing)
### Phase 0 — Safety & Baseline (Complexity: S)
- Prerequisites/Blockers: none.
- Stop condition: baseline build/run steps documented and smoke tests defined.

### Phase 1 — Safe Deletions + Obvious Dead Code (Complexity: M)
- Prerequisites/Blockers: Phase 0 complete.
- Stop condition: unused files removed, tracked artifacts cleaned, and `tsc` passes.

### Phase 2 — Consolidation + Surface Area Reduction (Complexity: M)
- Prerequisites/Blockers: Phase 1 complete, tests passing.
- Stop condition: duplicate owners removed and docs/scripts consolidated.

### Phase 3 — Structural Refactors (Ownership Boundaries) (Complexity: L)
- Prerequisites/Blockers: Phase 2 complete, baseline metrics captured.
- Stop condition: major god components split and ownership boundaries documented.

### Phase 4 — Hardening (Risk + Regression Control) (Complexity: M)
- Prerequisites/Blockers: Phase 3 complete, major regressions resolved.
- Stop condition: verification suite covers feed/video and critical user flows with stable performance.

## TODO Checklist (Exhaustive, File-Referenced)
### Phase 0 — Safety & Baseline
- [DOC] `BACKEND_SETUP_GUIDE.md`, `mobile/` run docs: Document baseline run/build commands for backend and mobile. Why: cleanup must be anchored to repeatable runs. Risk: low. Verify: run documented steps on a clean machine. Dependencies: none.
- [TEST] `mobile/src/presentation/components/feed/FeedManager.tsx`, `VideoPlayerPool.tsx`: Define a minimal feed/video smoke checklist (first play, fast scroll, mute/unmute, carousel image swipe). Why: prevents silent regressions. Risk: low. Verify: manual run + screen capture of expected behavior. Dependencies: none.
- [VERIFY] `mobile/src/core/services/PerformanceLogger.ts`, `mobile/app/_layout.tsx`: Capture baseline performance checkpoints (startup, first video ready). Why: refactor without perf regression data is risky. Risk: medium. Verify: log entries captured and stored in a doc. Dependencies: none.

### Phase 1 — Safe Deletions + Obvious Dead Code
- [DELETE] `backend/temp_uploads/*`: Remove tracked runtime artifacts and add ignore rules for temp uploads. Why: versioning runtime output is noise and a security risk. Risk: low. Verify: `git status` clean, server recreates temp files at runtime. Dependencies: update root `.gitignore` or add `backend/.gitignore`.
- [DELETE] `ngrok-v3-stable-linux-amd64.tgz.1`: Remove tracked archive and add ignore for `*.tgz.*` if needed. Why: binaries should not live in repo; doc already instructs download. Risk: low. Verify: `git ls-files` shows no ngrok archives. Dependencies: update `.gitignore`.
- [DELETE] `mobile/src/presentation/hooks/useVideoPlayback.ts`, `mobile/src/presentation/hooks/useVideoSource.ts`: Remove unused legacy playback hooks. Why: pool-based playback replaced these; keeping them creates confusion. Risk: low. Verify: `rg -n "useVideoPlayback|useVideoSource"` returns none; `npx tsc --noEmit` passes. Dependencies: ensure VideoLayer removal is complete.
- [DELETE] `mobile/src/presentation/hooks/index.ts`: Remove unused hooks barrel. Why: no imports; keeping it hides dead exports. Risk: low. Verify: `rg -n "presentation/hooks"` returns none. Dependencies: none.
- [DELETE] `mobile/src/presentation/hooks/useDraftCleanup.ts`: Remove unused hook. Why: unused logic adds maintenance surface. Risk: low. Verify: `rg -n "useDraftCleanup"` returns none; `tsc` passes. Dependencies: none.
- [DELETE] `mobile/src/presentation/store/useNotificationStore.ts`: Remove unused store. Why: dead state container is a long-term liability. Risk: low. Verify: `rg -n "useNotificationStore"` returns none; `tsc` passes. Dependencies: none.
- [DELETE] `mobile/src/presentation/components/feed/FeedItemOverlay.tsx`: Remove unused overlay component. Why: no references; eliminates legacy UI. Risk: low. Verify: `rg -n "FeedItemOverlay"` returns none; `tsc` passes. Dependencies: none.
- [DELETE] `mobile/src/presentation/components/feed/VideoOverlays.tsx`: Remove unused overlay component. Why: no references after VideoLayer removal. Risk: low. Verify: `rg -n "VideoOverlays"` returns none; `tsc` passes. Dependencies: none.
- [DELETE] `mobile/src/presentation/components/feed/BrightnessController.tsx`: Remove unused controller. Why: no references; brightness handled elsewhere. Risk: low. Verify: `rg -n "BrightnessController"` returns none. Dependencies: none.
- [DELETE] `mobile/src/presentation/components/feed/SideOptionsSheet.tsx`: Remove unused sheet. Why: no references; reduce UI surface. Risk: low. Verify: `rg -n "SideOptionsSheet"` returns none. Dependencies: none.
- [DELETE] `mobile/src/presentation/components/feed/index.ts`: Remove unused feed barrel. Why: direct imports are used; barrel adds dead entry point. Risk: low. Verify: `rg -n "components/feed"` shows no barrel imports. Dependencies: none.
- [DELETE] `mobile/src/presentation/components/shared/CustomRefreshScrollView.tsx`, `LoadingIndicator.tsx`, `RectangularStoryRing.tsx`: Remove unused shared components. Why: no references. Risk: low. Verify: `rg -n "CustomRefreshScrollView|LoadingIndicator|RectangularStoryRing"` returns none. Dependencies: none.
- [SIMPLIFY] `mobile/src/presentation/store/useActiveVideoStore.ts`: Remove unused fields and helpers (`customFeed`, `preloadIndices`, `setPreloadIndices`, `useVideoPreloader`, `useShouldVideoPlay`). Why: reduces store surface and prevents stale logic. Risk: low. Verify: `rg -n "customFeed|preloadIndices|useVideoPreloader|useShouldVideoPlay"` returns only in removed code; `tsc` passes. Dependencies: none.
- [SIMPLIFY] `mobile/src/presentation/components/feed/FeedManager.tsx`: Remove unused `topInset` prop in `ScrollPlaceholder`. Why: unused props add confusion and churn. Risk: low. Verify: TypeScript and runtime render unchanged. Dependencies: none.

### Phase 2 — Consolidation + Surface Area Reduction
- [REFACTOR] `mobile/src/presentation/contexts/ThemeContext.tsx`, `mobile/src/presentation/store/useThemeStore.ts`, all consumers: Consolidate theme ownership into a single provider or store. Why: dual ownership risks drift and bugs. Risk: medium. Verify: theme toggles and dark/light UI remain consistent across tabs. Dependencies: Phase 1 complete.
- [REFACTOR] `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`, `MetadataLayer.tsx`, `ActionButtons.tsx`: Reduce prop surface by grouping actions/state into one hook or context. Why: excessive props increase coupling and regressions. Risk: medium. Verify: overlay actions still work and UI updates correctly. Dependencies: Phase 1 complete.
- [REFACTOR] `mobile/src/presentation/components/explore/TrendingCarousel.tsx`, `mobile/src/data/services/FeedPrefetchService.ts`: Consolidate cache/prefetch ownership (single service). Why: duplicate caching rules cause inconsistent UX. Risk: medium. Verify: prefetch behavior matches feed and cache hits remain. Dependencies: Phase 1 complete.
- [DOC] `LOGGING_GUIDE.md`, `LOGLAMA_KILAVUZU.md`: Merge into a single canonical logging doc and keep translations in one place. Why: duplicated docs drift over time. Risk: low. Verify: new doc referenced from README or root index. Dependencies: Phase 1 complete.
- [DOC] `docs/archive/`: Move archive docs to `docs/archive/` with an index file. Why: large doc archive clutters repo root. Risk: low. Verify: docs still accessible via index. Dependencies: Phase 1 complete.
- [SIMPLIFY] `backend/` root scripts and maintenance tasks (formerly `maintenance_scripts/`): Consolidate into `backend/scripts/` with a single CLI entry. Why: scripts are duplicated and hard to discover. Risk: medium. Verify: key maintenance tasks still run. Dependencies: Phase 1 complete.
- [SIMPLIFY] `backend/*.sql`: Move migrations to `backend/migrations/` with consistent naming and README. Why: root-level SQL sprawl is hard to manage. Risk: medium. Verify: migration instructions updated and paths referenced correctly. Dependencies: Phase 1 complete.

### Phase 3 — Structural Refactors (Ownership Boundaries)
- [REFACTOR] `mobile/src/presentation/components/feed/FeedManager.tsx`: Split into modules (scroll, overlay, interactions, prefetch) with clear ownership boundaries. Why: current size hides bugs and blocks iteration. Risk: high. Verify: full feed smoke test passes; no scroll regressions. Dependencies: Phase 2 complete.
- [REFACTOR] `mobile/src/presentation/components/feed/VideoPlayerPool.tsx` + store: Create a single lifecycle owner for playback and state sync. Why: multiple sources of truth risk desync. Risk: high. Verify: no audio leakage or wrong-video playback in fast scroll. Dependencies: Phase 2 complete.
- [REFACTOR] `backend/server.js`: Split into route modules, middleware, and services. Why: single-file backend is hard to test and audit. Risk: high. Verify: API endpoints and HLS processing still work. Dependencies: Phase 2 complete.
- [REFACTOR] `backend/services/HlsService.js` and R2 scripts: Centralize R2 operations into one module used by scripts and server. Why: duplicated logic increases data integrity risk. Risk: medium. Verify: HLS upload and cleanup scripts still operate correctly. Dependencies: Phase 2 complete.

### Phase 4 — Hardening (Risk + Regression Control)
- [TEST] `mobile/` feed and video flows: Add a repeatable smoke test script (manual or automated) and include in CI. Why: refactors are risky without validation. Risk: medium. Verify: test suite runs on CI or local with consistent results. Dependencies: Phase 3 complete.
- [TEST] `backend/`: Add basic integration checks for upload endpoints and HLS pipeline. Why: cleanup of backend modules can break video pipeline. Risk: medium. Verify: upload and HLS endpoints succeed. Dependencies: Phase 3 complete.
- [DEPENDENCY] `backend/package.json`: Remove `aws-sdk` (v2) if unused after verification. Why: reduces dependency surface and audit load. Risk: low. Verify: `rg -n "aws-sdk"` shows no usage; server runs. Dependencies: Phase 1 complete.
- [DEPENDENCY] `mobile/package.json`: Remove unused dependencies (see Dependency Hygiene list) after `depcheck` and import scan. Why: reduces build size and native config risk. Risk: medium. Verify: `npx expo-doctor`, `npx tsc --noEmit`, and app boot. Dependencies: Phase 1 complete.
- [VERIFY] `mobile/src/presentation/store/useThemeStore.ts`: Move `Appearance.addChangeListener` into a controlled lifecycle with cleanup. Why: unmanaged listeners can leak. Risk: low. Verify: theme changes still propagate. Dependencies: Phase 2 complete.
