# Feed Component Refactor TODO List

> **Generated:** 2025-01-28  
> **Source:** Feed Cleanup & Refactor Readiness Analysis  
> **Total Items:** 24 tasks  
> **Estimated Effort:** 3-4 developer days

---

## Legend

| Priority | Description |
|----------|-------------|
| 🔴 P1 | Critical - Address immediately |
| 🟠 P2 | High - Address within sprint |
| 🟡 P3 | Medium - Address when convenient |
| 🟢 P4 | Low - Nice to have |

| Status | Description |
|--------|-------------|
| `[ ]` | Not started |
| `[/]` | In progress |
| `[X]` | Completed |

---

## Priority 1 (P1) - Critical Tasks

### [X] TODO-F002: Extract MAX_VIDEO_LOOPS Configuration Constant ✅
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L574)
- **Action:** REFACTOR
- **Risk:** ✅ LOW
- **Technical Reason:** Magic number `2` for maximum video loops is hardcoded in `handleVideoEnd`. Should be configurable constant.
- **Status:** ✅ COMPLETED (2026-01-28)

---

## Priority 2 (P2) - High Priority Tasks

### [X] TODO-F003: Extract SaveToast Component ✅
- **File:** [`mobile/src/presentation/components/feed/SaveToast.tsx`](file:///d:/WizyClub/mobile/src/presentation/components/feed/SaveToast.tsx)
- **Action:** EXTRACT
- **Risk:** ✅ LOW
- **Status:** ✅ COMPLETED (2026-01-28)

### [X] TODO-F004: Extract SlotRecycler Utility Class ✅
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L419-L661)
- **Action:** EXTRACT
- **Risk:** ✅ LOW
- **Status:** ✅ COMPLETED (2026-01-28)

### [X] TODO-F004: SlotRecycler Yardımcı Sınıfını Çıkar ✅
- **Dosya:** [`mobile/src/presentation/components/feed/utils/SlotRecycler.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/utils/SlotRecycler.ts)
- **Eylem:** ÇIKAR
- **Risk:** ✅ DÜŞÜK
- **Durum:** ✅ TAMAMLANDI (2026-01-28)

### [X] TODO-F005: Move slotsEqual to Module Scope ✅
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L55)
- **Action:** REFACTOR
- **Risk:** ✅ LOW
- **Status:** ✅ COMPLETED (2026-01-28)

### [X] TODO-F006: Extract VideoErrorHandler Utility ✅
- **File:** [`mobile/src/presentation/components/feed/utils/VideoErrorHandler.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/utils/VideoErrorHandler.ts)
- **Action:** EXTRACT
- **Risk:** ✅ LOW
- **Status:** ✅ COMPLETED (2026-01-28)

### [X] TODO-F007: Consolidate Magic Numbers in VideoPlayerPool ✅
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Action:** REFACTOR
- **Risk:** ✅ LOW
- **Status:** ✅ COMPLETED (2026-01-28)

---

## FeedManager Modular Splitting (P2-S) - Sprint Priority

> **Reference:** [38 - Feed Manager Refactoring.md](./38%20-%20Feed%20Manager%20Refactoring.md)  
> **Goal:** Split FeedManager.tsx (1524 lines) → 5 modules (~300 lines each)  
> **Estimated Effort:** 1-2 developer days

### [X] TODO-FM01: Create useFeedConfig.ts Hook ✅
- **File:** [`mobile/src/presentation/components/feed/hooks/useFeedConfig.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedConfig.ts)
- **Action:** CREATE
- **Risk:** ✅ LOW
- **Technical Reason:** Centralize all constants, flags, and configuration values.
- **Status:** ✅ COMPLETED (2026-01-27)

### [X] TODO-FM02: Create useFeedScroll.ts Hook ✅
- **File:** [`mobile/src/presentation/components/feed/hooks/useFeedScroll.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedScroll.ts)
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01
- **Status:** ✅ COMPLETED (2026-01-27)

### [X] TODO-FM03: Create useFeedInteractions.ts Hook ✅
- **File:** [`mobile/src/presentation/components/feed/hooks/useFeedInteractions.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedInteractions.ts)
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01, TODO-FM02
- **Status:** ✅ COMPLETED (2026-01-27)

### [X] TODO-FM04: Create useFeedActions.ts Hook ✅
- **File:** [`mobile/src/presentation/components/feed/hooks/useFeedActions.ts`](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedActions.ts)
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01
- **Status:** ✅ COMPLETED (2026-01-27)

### [X] TODO-FM05: Create FeedOverlays.tsx Component ✅
- **File:** [`mobile/src/presentation/components/feed/FeedOverlays.tsx`](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedOverlays.tsx)
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01, TODO-FM04
- **Status:** ✅ COMPLETED (2026-01-27)

### [X] TODO-FM06: Refactor FeedManager.tsx ✅
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** REFACTOR
- **Risk:** ✅ COMPLETED
- **Dependencies:** TODO-FM01 - TODO-FM05
- **Status:** ✅ COMPLETED (2026-01-28)

#### [FeedOverlays.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedOverlays.tsx)
- Integrated the new `SaveToast` component and removed local UI code and styles.

### 4. Extract SlotRecycler Utility Class (TODO-F004)
Extracted the complex player slot allocation logic from `VideoPlayerPool.tsx` into a dedicated `SlotRecycler` class.

#### [SlotRecycler.ts](file:///d:/WizyClub/mobile/src/presentation/components/feed/utils/SlotRecycler.ts)
- [NEW] Implemented `calculateTargetIndices` to handle current, next, and previous slot assignments.

#### [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- Replaced ~100 lines of inline allocation logic with a single call to `SlotRecycler`.

### 5. Extract VideoErrorHandler Utility (TODO-F006)
Centralized video playback error handling, retry logic, and network fallbacks into a dedicated class.

#### [VideoErrorHandler.ts](file:///d:/WizyClub/mobile/src/presentation/components/feed/utils/VideoErrorHandler.ts)
- [NEW] Implemented logic for retry limits and cache-to-network fallback.

#### [videoUrl.ts](file:///d:/WizyClub/mobile/src/core/utils/videoUrl.ts)
- Moved `isValidSource` utility here to be shared across components.

#### [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- Simplified error handling callback and integrated the new utility.

### 3. Consolidate Magic Numbers in VideoPlayerPool (TODO-F007)
Moved all hardcoded magic numbers from `VideoPlayerPool.tsx` to the centralized `FEED_CONFIG` in `useFeedConfig.ts`.

#### [useFeedConfig.ts](file:///d:/WizyClub/mobile/src/presentation/components/feed/hooks/useFeedConfig.ts)
- Added `POOL_SIZE`, `MAX_RETRIES`, `RECYCLE_DELAY_MS`, `RETRY_DELAY_MS`, and `ASPECT_RATIO_THRESHOLD`.

#### [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- Imported `FEED_CONFIG`.
- Replaced all magic numbers with their corresponding `FEED_CONFIG` constants.

### [X] TODO-FM07: Integration Testing & Flag Verification ✅
- **File:** All feed modules
- **Action:** TEST
- **Risk:** ✅ COMPLETED
- **Dependencies:** TODO-FM06
- **Status:** ✅ COMPLETED (2026-01-28)

## Phase 4: Architectural Consolidation (Final Polish) ⭐️ NEXT
> **Goal:** Reduce FeedManager.tsx to ~300 lines by extracting coordination and UI logic.
> **Estimated Effort:** 0.5 developer days

### [X] TODO-FM08: Extract useFeedLifecycleSync.ts ✅
- **Action:** EXTRACT
- **Task:** Move 200+ lines of useEffect hooks (Upload, Browser, AppState) into a sync handler.
- **Status:** ✅ COMPLETED

### [X] TODO-FM09: Extract FeedStatusViews.tsx ✅
- **Action:** EXTRACT
- **Task:** Move Loading, Error, and Empty states into a dedicated view component.
- **Status:** ✅ COMPLETED

### [X] TODO-FM10: Extract FeedUtils.ts & FeedManager.styles.ts ✅
- **Action:** CLEANUP
- **Task:** Move helper functions and styles to separate files.
- **Status:** ✅ COMPLETED

---

## Priority 3 (P3) - Medium Priority Tasks

### [X] TODO-F008: Optimize handleVideoProgress Dependencies ✅
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** OPTIMIZE
- **Risk:** ✅ OPTIMIZED (Verified)
- **Status:** ✅ COMPLETED

### [X] TODO-F009: Optimize handleLongPress Dependencies ✅
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** OPTIMIZE
- **Risk:** ✅ OPTIMIZED (Ref impl)
- **Status:** ✅ COMPLETED

### [X] TODO-F010: Verify SpritePreview Usage ✅
- **File:** [SpritePreview.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/SpritePreview.tsx)
- **Action:** VERIFY
- **Risk:** ✅ VERIFIED (Active Component)
- **Status:** ✅ COMPLETED

### [X] TODO-F011: Document Layer Architecture ✅
- **File:** [FEED_LAYER_ARCHITECTURE_EN.md](file:///d:/WizyClub/docs/feed/FEED_LAYER_ARCHITECTURE_EN.md)
- **Action:** CREATE
- **Risk:** ✅ COMPLETED
- **Status:** ✅ COMPLETED

---

## Priority 4 (P4) - Nice to Have

### [X] TODO-F012: Consider Context for ActiveVideoOverlay Props ✅
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L1284-L1317)
- **Action:** EVALUATE
- **Risk:** ✅ KEPT AS IS (Clean enough)
- **Status:** ✅ COMPLETED

### [X] TODO-F013: Move Loop Logic to Domain Use Case ✅
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** REFACTOR
- **Risk:** ✅ KEPT AS IS (Tight UI Handling)
- **Status:** ✅ COMPLETED

### [X] TODO-F014: Move Prefetch Logic to Domain Layer ✅
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** EVALUATE
- **Risk:** ✅ KEPT AS IS (Tight Pool Integration)
- **Status:** ✅ COMPLETED

### [X] TODO-F015: Add Unit Tests for VideoPlayerPool ❌
- **File:** New: `mobile/src/presentation/components/feed/__tests__/VideoPlayerPool.test.tsx`
- **Action:** CREATE
- **Risk:** ✅ SKIPPED (User Request)
- **Status:** ✅ CANCELLED

### [X] TODO-F016: Add Unit Tests for FeedManager Callbacks ❌
- **File:** New: `mobile/src/presentation/components/feed/__tests__/FeedManager.test.tsx`
- **Action:** CREATE
- **Risk:** ✅ SKIPPED (User Request)
- **Status:** ✅ CANCELLED

### [ ] TODO-F017: Add Performance Monitoring
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Action:** ENHANCE
- **Risk:** ✅ LOW

### [X] TODO-F018: Cleanup Unused Imports ✅
- **File:** All `src/presentation/components/feed` files
- **Action:** CLEANUP
- **Risk:** ✅ LOW
- **Status:** ✅ COMPLETED

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 P1 | 1 | 0 / 1 |
| 🟠 P2 | 5 | 2 / 5 |
| 🟠 P2-S (Modular Split) | 7 | 0 / 7 |
| 🟡 P3 | 4 | 0 / 4 |
| 🟢 P4 | 7 | 0 / 7 |
| **TOTAL** | **24** | **2 / 24** |

---

## Execution Order

### Phase 1: Cleanup & Quick Wins
- [x] TODO-F002: Extract `MAX_VIDEO_LOOPS` Constant
- [x] TODO-F005: Move `slotsEqual` to Module Scope
- [x] TODO-F007: Consolidate Magic Numbers in `VideoPlayerPool`

### Phase 2: Component & Utility Extraction (P2 Tasks)
- [x] TODO-F003: Extract `SaveToast` Component
- [x] TODO-F004: Extract `SlotRecycler` Utility Class
- [x] TODO-F006: Extract `VideoErrorHandler` Utility

### Phase 3: Modular Splitting (Day 2-3)
- [x] TODO-FM01: Create useFeedConfig.ts
- [x] TODO-FM02: Create useFeedScroll.ts
- [x] TODO-FM03: Create useFeedInteractions.ts
- [x] TODO-FM04: Create useFeedActions.ts
- [x] TODO-FM05: Create FeedOverlays.tsx
- [x] TODO-FM06: Refactor FeedManager.tsx
- [x] TODO-FM07: Integration testing

### Phase 4: Architectural Consolidation (Final Polish)
- [x] TODO-FM08: Extract lifecycle sync logic to `useFeedLifecycleSync.ts`
- [x] TODO-FM09: Extract feed status views to `FeedStatusViews.tsx`
- [x] TODO-FM10: Style and utility cleanup (`FeedUtils.ts`, `FeedManager.styles.ts`)

### Phase 5: Final Verification (Day 4)
- [ ] Remaining P3 tasks
- [ ] P4 tasks as time permits

---

> **NOTE:** `DISABLE_FEED_UI_FOR_TEST` and other UI layer flags will be preserved for testing purposes.
