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

### [ ] TODO-F002: Extract MAX_VIDEO_LOOPS Configuration Constant
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L676)
- **Action:** REFACTOR
- **Risk:** ✅ LOW
- **Technical Reason:** Magic number `2` for maximum video loops is hardcoded in `handleVideoEnd`. Should be configurable constant.

---

## Priority 2 (P2) - High Priority Tasks

### [ ] TODO-F003: Extract SaveToast Component
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L1326-L1351)
- **Action:** EXTRACT
- **Risk:** ✅ LOW

### [ ] TODO-F004: Extract SlotRecycler Utility Class
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L419-L661)
- **Action:** EXTRACT
- **Risk:** ⚡ MEDIUM

### [ ] TODO-F005: Move slotsEqual to Module Scope
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L476-L488)
- **Action:** REFACTOR
- **Risk:** ✅ LOW

### [ ] TODO-F006: Extract VideoErrorHandler Utility
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx#L683-L745)
- **Action:** EXTRACT
- **Risk:** ⚡ MEDIUM

### [ ] TODO-F007: Consolidate Magic Numbers in VideoPlayerPool
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Action:** REFACTOR
- **Risk:** ✅ LOW

---

## FeedManager Modular Splitting (P2-S) - Sprint Priority

> **Reference:** [38 - Feed Manager Refactoring.md](./38%20-%20Feed%20Manager%20Refactoring.md)  
> **Goal:** Split FeedManager.tsx (1524 lines) → 5 modules (~300 lines each)  
> **Estimated Effort:** 1-2 developer days

### [ ] TODO-FM01: Create useFeedConfig.ts Hook
- **File:** NEW: `mobile/src/presentation/components/feed/hooks/useFeedConfig.ts`
- **Action:** CREATE
- **Risk:** ✅ LOW
- **Technical Reason:** Centralize all constants, flags, and configuration values.

### [ ] TODO-FM02: Create useFeedScroll.ts Hook
- **File:** NEW: `mobile/src/presentation/components/feed/hooks/useFeedScroll.ts`
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01

### [ ] TODO-FM03: Create useFeedInteractions.ts Hook
- **File:** NEW: `mobile/src/presentation/components/feed/hooks/useFeedInteractions.ts`
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01, TODO-FM02

### [ ] TODO-FM04: Create useFeedActions.ts Hook
- **File:** NEW: `mobile/src/presentation/components/feed/hooks/useFeedActions.ts`
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01

### [ ] TODO-FM05: Create FeedOverlays.tsx Component
- **File:** NEW: `mobile/src/presentation/components/feed/FeedOverlays.tsx`
- **Action:** CREATE
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM01, TODO-FM04

### [ ] TODO-FM06: Refactor FeedManager.tsx
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** REFACTOR
- **Risk:** ⚠️ HIGH
- **Dependencies:** TODO-FM01 - TODO-FM05

### [ ] TODO-FM07: Integration Testing & Flag Verification
- **File:** All feed modules
- **Action:** TEST
- **Risk:** ⚡ MEDIUM
- **Dependencies:** TODO-FM06

---

## Priority 3 (P3) - Medium Priority Tasks

### [ ] TODO-F008: Optimize handleVideoProgress Dependencies
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** OPTIMIZE
- **Risk:** ⚡ MEDIUM

### [ ] TODO-F009: Optimize handleLongPress Dependencies
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** OPTIMIZE
- **Risk:** ⚡ MEDIUM

### [ ] TODO-F010: Verify SpritePreview Usage
- **File:** [SpritePreview.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/SpritePreview.tsx)
- **Action:** VERIFY
- **Risk:** ✅ LOW

### [ ] TODO-F011: Document Layer Architecture
- **File:** New: `docs/feed/FEED_LAYER_ARCHITECTURE.md`
- **Action:** CREATE
- **Risk:** ✅ LOW

---

## Priority 4 (P4) - Nice to Have

### [ ] TODO-F012: Consider Context for ActiveVideoOverlay Props
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx#L1284-L1317)
- **Action:** EVALUATE
- **Risk:** ⚠️ HIGH

### [ ] TODO-F013: Move Loop Logic to Domain Use Case
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** REFACTOR
- **Risk:** ⚠️ HIGH

### [ ] TODO-F014: Move Prefetch Logic to Domain Layer
- **File:** [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx)
- **Action:** EVALUATE
- **Risk:** ⚠️ HIGH

### [ ] TODO-F015: Add Unit Tests for VideoPlayerPool
- **File:** New: `mobile/src/presentation/components/feed/__tests__/VideoPlayerPool.test.tsx`
- **Action:** CREATE
- **Risk:** ✅ LOW

### [ ] TODO-F016: Add Unit Tests for FeedManager Callbacks
- **File:** New: `mobile/src/presentation/components/feed/__tests__/FeedManager.test.tsx`
- **Action:** CREATE
- **Risk:** ✅ LOW

### [ ] TODO-F017: Add Performance Monitoring
- **File:** [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx)
- **Action:** ENHANCE
- **Risk:** ✅ LOW

### [ ] TODO-F018: Cleanup Unused Imports
- **File:** All feed components
- **Action:** CLEANUP
- **Risk:** ✅ LOW

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 P1 | 1 | 0 / 1 |
| 🟠 P2 | 5 | 0 / 5 |
| 🟠 P2-S (Modular Split) | 7 | 0 / 7 |
| 🟡 P3 | 4 | 0 / 4 |
| 🟢 P4 | 7 | 0 / 7 |
| **TOTAL** | **24** | **0 / 24** |

---

## Execution Order

### Phase 1: Cleanup (Day 1 AM)
- [ ] TODO-F002: Extract MAX_VIDEO_LOOPS

### Phase 2: Quick Wins (Day 1 PM)
- [ ] TODO-F005: Move slotsEqual to module scope
- [ ] TODO-F007: Consolidate magic numbers

### Phase 3: Modular Splitting (Day 2-3)
- [ ] TODO-FM01: Create useFeedConfig.ts ⭐ START HERE
- [ ] TODO-FM02: Create useFeedScroll.ts
- [ ] TODO-FM03: Create useFeedInteractions.ts
- [ ] TODO-FM04: Create useFeedActions.ts
- [ ] TODO-FM05: Create FeedOverlays.tsx
- [ ] TODO-FM06: Refactor FeedManager.tsx
- [ ] TODO-FM07: Integration testing

### Phase 4: Polish (Day 4)
- [ ] Remaining P3 tasks
- [ ] P4 tasks as time permits

---

> **NOTE:** `DISABLE_FEED_UI_FOR_TEST` and other UI layer flags will be preserved for testing purposes.
