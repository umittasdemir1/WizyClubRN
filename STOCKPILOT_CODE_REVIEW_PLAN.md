# StockPilot Code Review & Improvement Plan

> Generated: 2026-03-17
> Scope: Full-stack audit — frontend (Vite+React+TS) + backend (Express+TS)
> Includes: Bug/vulnerability scan + God Code anti-pattern audit
> Every step ends with `npx tsc --noEmit` verification.

---

## Phase 0 — GOD CODE DECOMPOSITION (Architecture Debt)

> These are structural anti-patterns that make all other fixes harder.
> Tackle these first to unlock clean refactoring in later phases.

### God Files

- [x] **0.1 Split canvasModel.ts (1,471 lines, 128 exports)**
  - File: `frontend/src/components/canvas/canvasModel.ts`
  - Anti-pattern: GOD FILE — 9 unrelated domains in 1 file
  - Responsibilities: types, pivot computation, custom metric parser/evaluator, filter logic, field definitions, aggregation, constants, column overrides, formatting
  - Fix: Split into submodule directory `canvas/model/`:
    - `model/types.ts` — all type/interface definitions (~200 lines)
    - `model/pivot.ts` — `buildPivotResult`, aggregation, combos (~300 lines)
    - `model/customMetrics.ts` — tokenizer, evaluator, RPN (~250 lines)
    - `model/fields.ts` — `getFieldDefinition`, `getAvailablePivotFields`, fast lookups (~150 lines)
    - `model/formatting.ts` — `formatAggregatedValue`, number/date formatting (~100 lines)
    - `model/index.ts` — barrel re-exports (unchanged public API)
  - Verify: `npx tsc --noEmit` — zero import breaks

### God Components

- [x] **0.2 Decompose CanvasStudio.tsx (1,431 lines, 20 useState)**
  - File: `frontend/src/components/canvas/CanvasStudio.tsx`
  - Anti-pattern: GOD COMPONENT — 8 unrelated features in 1 component
  - Current responsibilities: file explorer, project name, activity bar, canvas viewport, toolbar, table list, header filters, panel layout
  - Fix: Extract to focused components:
    - `DatasetPanel.tsx` — files, folders, renaming, drag-drop (~450 lines)
    - `CanvasHeader.tsx` — project/table name editing, filters (~150 lines)
    - `ActivityBar.tsx` — panel toggle icons (~50 lines)
    - `CanvasToolbar.tsx` — zoom, pointer/hand tools, table menu (~200 lines)
    - `CanvasEmptyState.tsx` — empty canvas placeholder (~50 lines)
    - `CanvasStudio.tsx` — composition root only (~200 lines)
  - Verify: `npx tsc --noEmit` after each extraction

- [x] **0.3 Decompose CanvasSidebar.tsx (1,369 lines, 18 useState, 18 props)**
  - File: `frontend/src/components/canvas/CanvasSidebar.tsx`
  - Anti-pattern: GOD COMPONENT + EXCESSIVE PROPS — 6 features, 18 props (14 callbacks)
  - Fix: Extract to focused components:
    - `PivotFieldBrowser.tsx` — field list, pinning, drag-drop (~400 lines)
    - `CustomMetricEditor.tsx` — metric builder, tokenizer UI (~450 lines)
    - `FieldFormatPanel.tsx` — column override editing (~200 lines)
    - `CanvasSidebar.tsx` — layout shell + section orchestration (~150 lines)
  - Verify: `npx tsc --noEmit` after each extraction
### God Hooks

- [x] **0.4 Decompose usePivotOrchestration.ts (586 lines, 17 useState)**
  - File: `frontend/src/components/canvas/usePivotOrchestration.ts`
  - Anti-pattern: GOD HOOK — 8 unrelated state domains, 50+ exported setters
  - Fix: Split into focused hooks:
    - `useTableManagement.ts` — tables, activeTableId, CRUD (~100 lines)
    - `useCustomMetrics.ts` — customMetrics state + mutations (~80 lines)
    - `useHeaderFilters.ts` — openHeaderFilter, selections, sort directions (~120 lines)
    - `useDragDropState.ts` — dragZone, activeDrag, dropIndicator (~80 lines)
    - `useStorageSync.ts` — debounced localStorage persistence (~60 lines)
    - `usePivotOrchestration.ts` — composition hook combining above (~100 lines)
  - Verify: `npx tsc --noEmit` after each extraction

- [x] **0.5 Decompose useCanvasPointer.ts (479 lines)**
  - File: `frontend/src/components/canvas/useCanvasPointer.ts`
  - Anti-pattern: GOD HOOK — zoom, selection, move, resize, tool switching all in 1 hook
  - Fix: Split into focused hooks:
    - `useCanvasZoom.ts` — zoom/pan state and handlers (~100 lines)
    - `useTableInteraction.ts` — selection, move, resize (~250 lines)
    - `useCanvasTool.ts` — pointer/hand tool state (~50 lines)
    - `useCanvasPointer.ts` — composition hook (~80 lines)
  - Verify: `npx tsc --noEmit`

### God Types

- [x] **0.6 Decompose PivotTableView and PivotTableInstance**
  - File: `canvasModel.ts` (to be split per 0.1)
  - Anti-pattern: GOD TYPE — PivotTableView (12 fields mixing domain+UI+config), PivotTableInstance (11 fields mixing config+rendering+runtime)
  - Fix:
    ```
    PivotTableInstance → PivotTableConfig (id, name, layout)
                       + PivotTableUIState (headerColor, scale, position, size)
                       + PivotTableRuntime (filterSelections)

    PivotTableView → PivotViewData (filteredRecords, pivotResult)
                   + PivotViewFlags (hasColumnGroups, showSecondaryHeaderRow)
                   + PivotViewConfig (table, columns, columnOverrides, customMetrics)
    ```
  - Verify: `npx tsc --noEmit`

### Prop Drilling

- [x] **0.7 Eliminate 3+ level prop drilling with Context**
  - Chain: `LabsModule` → `CanvasStudio` → `CanvasSidebar` → child components
  - Anti-pattern: 12 upload-related props drilled through CanvasStudio without use
  - Fix: Create `PivotStudioContext` providing:
    - `uploadState` (progress, stage, error, currentFile)
    - `headerFilterState` (selections, sort directions)
    - Reduce CanvasStudio props from 12 to ~4
  - Verify: `npx tsc --noEmit`

---

## Phase 1 — CRITICAL (Production Blockers)

### Backend — Security & Stability

- [x] **1.1 Fix HTTP status codes in global error handler**
  - File: `backend/src/index.ts:30-35`
  - Problem: All errors return 400, even server-side crashes
  - Fix: Create `ValidationError` class, return 400 for validation / 500 for server errors
  - Verify: `npx tsc --noEmit && npm run test`

- [x] **1.2 Fix CORS — open to all origins when env missing**
  - File: `backend/src/index.ts:10-14`
  - Problem: `origin: true` allows any domain when `CORS_ORIGIN` not set
  - Fix: Default to `["http://localhost:5173"]` instead of `true`
  - Verify: `npx tsc --noEmit`

- [x] **1.3 Add input validation to analysis & transfer routes**
  - Files: `backend/src/routes/analysis.ts:8`, `transfer.ts:8`
  - Problem: No `req.body` null check, no content-type validation
  - Fix: Guard `if (!req.body)`, return 400 with clear message
  - Verify: `npx tsc --noEmit && npm run test`

- [x] **1.4 Add array bounds validation**
  - File: `backend/src/utils/validators.ts:26-58`
  - Problem: No max records limit — 1M records crashes server
  - Fix: Add `MAX_RECORDS = 10_000` guard
  - Verify: `npx tsc --noEmit && npm run test`

- [x] **1.5 Add MIME type whitelist on upload**
  - File: `backend/src/routes/upload.ts`
  - Problem: Accepts any file type, relies only on extension
  - Fix: Whitelist `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`
  - Verify: `npx tsc --noEmit`

- [x] **1.6 Switch to disk storage for large uploads — prevent OOM**
  - File: `backend/src/routes/upload.ts:5-10`
  - Problem: `multer.memoryStorage()` loads 10MB file into RAM; XLSX expands to ~100MB
  - Fix: Switch to `multer.diskStorage()` with temp dir, read from disk, cleanup after
  - Verify: `npx tsc --noEmit && npm run test`

### Frontend — Crash Prevention

- [x] **1.7 Add Error Boundaries around major sections**
  - Files: New `src/components/ErrorBoundary.tsx`; wrap in `CanvasStudio`, `CanvasSidebar`, `StudioApp`
  - Problem: Any component crash kills the entire app
  - Fix: Create generic ErrorBoundary with fallback UI
  - Verify: `npx tsc --noEmit`

---

## Phase 2 — HIGH (Performance & Stability)

### Backend

- [x] **2.1 Fix parseLocaleNumber logic order**
  - File: `shared/normalization.ts:19-34`
  - Problem: Parses `cleaned` before `normalized`, correct result is accidental
  - Fix: Parse normalized version first
  - Verify: `npx tsc --noEmit && npm run test`

- [x] **2.2 Fix duplicate data scan in analyzeInventory**
  - File: `backend/src/services/analyzer.ts:182-183`
  - Problem: `.filter().length` re-scans array — counts already computed in loop
  - Fix: Use existing `lifecycleCounts` map values
  - Verify: `npx tsc --noEmit && npm run test`

- [x] **2.3 Fix broken test suite — API contract mismatch**
  - Files: `backend/tests/usecases.test.mjs`, `parser.test.mjs`
  - Problem: 3/13 tests failing, tests expect old API shape
  - Fix: Update tests to match current API contract
  - Verify: `npm run test` — all 13 pass

- [x] **2.4 Extract magic numbers to named constants**
  - Files: `analyzer.ts:54-71`, `transfer.ts:25`
  - Problem: Business thresholds hardcoded (90 days, 3x multiplier, etc.)
  - Fix: Create `const STAGNANT_DAYS = 90` etc. at top of file
  - Verify: `npx tsc --noEmit && npm run test`

### Frontend

- [x] **2.5 Fix layout thrashing in useCanvasPointer**
  - File: `frontend/src/components/canvas/useCanvasPointer.ts:95-140`
  - Problem: `useLayoutEffect` calls `getBoundingClientRect()` on all tables when any property changes
  - Fix: Use `ResizeObserver` instead; only measure when `autoFitKey` fingerprint changes
  - Verify: `npx tsc --noEmit`

- [x] **2.6 Cache filter options in useMemo at call sites**
  - Files: `canvasRenderHelpers.ts` — `getRowFieldFilterOptions`, `getColumnGroupFilterOptions`, `getValueFieldFilterOptions`
  - Problem: Called on every render even when inputs haven't changed
  - Fix: Memoize results in PivotCanvasTable and CanvasStudio where called
  - Verify: `npx tsc --noEmit`

- [x] **2.7 Remove duplicate useTypewriter implementation**
  - File: `frontend/src/App.tsx:16-50`
  - Problem: Inline typewriter hook duplicates `useTypewriter.ts`
  - Fix: Import from `./components/canvas/useTypewriter` instead
  - Verify: `npx tsc --noEmit`

- [x] **2.8 Pre-compute renderCell results for value field filter options**
  - File: `canvasRenderHelpers.ts:116-127` — `getValueFieldFilterOptions`
  - Problem: Calls `renderCell()` per row combo per value field to build filter options
  - Fix: Cache total-column rendered values at PivotTableView build time
  - Verify: `npx tsc --noEmit`

---

## Phase 3 — MEDIUM (Maintainability & Hardening)

### Backend

- [x] **3.1 Fix decodeCsvText — dead code branch**
  - File: `backend/src/services/parser.ts:178-187`
  - Problem: `!utf8.includes("")` is always false — TextDecoder never called
  - Fix: Check for BOM bytes or null characters instead
  - Verify: `npx tsc --noEmit && npm run test`

- [x] **3.2 Add structured error responses**
  - File: `backend/src/index.ts`
  - Problem: Error responses lack error codes, only have `message`
  - Fix: Return `{ error: "VALIDATION_ERROR"|"SERVER_ERROR", message, details? }`
  - Verify: `npx tsc --noEmit`

- [x] **3.3 Add request timeout middleware**
  - File: `backend/src/index.ts`
  - Problem: No timeout — large file processing can hang forever
  - Fix: Add 30s request timeout middleware
  - Verify: `npx tsc --noEmit`

- [x] **3.4 Remove unused parseInventoryUpload usecase**
  - File: `backend/src/usecases/parseInventoryUpload.ts`
  - Problem: Wrapper adds no logic, not imported by routes
  - Fix: Delete file, ensure no imports reference it
  - Verify: `npx tsc --noEmit`

### Frontend

- [x] **3.5 Add exhaustive type checks in custom metric evaluator**
  - File: `canvasModel.ts:659-800+`
  - Problem: Missing `never` exhaustiveness checks for token types
  - Fix: Add `default: assertNever(token)` in switch cases
  - Verify: `npx tsc --noEmit`

- [x] **3.6 Validate ColumnOverride format compatibility**
  - File: `canvasModel.ts:139-143`
  - Problem: User can set incompatible format for column type (e.g. "currency" on date column)
  - Fix: Add validation function `isCompatibleFormat(type, format)`
  - Verify: `npx tsc --noEmit`

- [x] **3.7 Add file size validation in FileUploader**
  - File: `frontend/src/components/upload/FileUploader.tsx`
  - Problem: No client-side file size check — poor UX for huge files
  - Fix: Add `maxSize: 10 * 1024 * 1024` to dropzone config, show error message
  - Verify: `npx tsc --noEmit`

- [x] **3.8 Move scrollbar CSS from inline to stylesheet**
  - File: `MetricFormatSelect.tsx:182-185`
  - Problem: Inline CSS for scrollbar styles
  - Fix: Move to `index.css` as utility class
  - Verify: `npx tsc --noEmit`

---

## Phase 4 — LOW (Quality Polish)

### Backend

- [x] **4.1 Improve health check endpoint**
  - File: `backend/src/index.ts:18-24`
  - Fix: Add memory usage, uptime, version to health response
  - Verify: `npx tsc --noEmit`

- [x] **4.2 Document business rules with named constants**
  - Files: `analyzer.ts`, `transfer.ts`
  - Fix: Inline comments explaining why specific thresholds were chosen
  - Verify: `npx tsc --noEmit`

### Frontend

- [x] **4.3 Consistent error handling — create error reporter utility**
  - Problem: Some errors silently caught, others thrown, no consistent pattern
  - Fix: Create `utils/errorReporter.ts` with `reportError(context, error)` function
  - Verify: `npx tsc --noEmit`

- [x] **4.4 localStorage fallback for private browsing**
  - File: `canvasStorage.ts:18-29`
  - Problem: If localStorage disabled, all state lost silently
  - Fix: Add in-memory fallback Map, log warning to console
  - Verify: `npx tsc --noEmit`

- [x] **4.5 Add accessibility attributes to interactive elements**
  - Files: `PivotCanvasTable.tsx`, `CanvasSidebar.tsx`, `CanvasStudio.tsx`
  - Fix: Add `aria-label` to drag handles, filter buttons, resize handles
  - Verify: `npx tsc --noEmit`

- [~] **4.6 Lazy load framer-motion and recharts** *(atlandı — 7 dosyada initial render'da kullanılıyor, impractical)*
  - File: `package.json` — framer-motion (12.6MB), recharts (2.15MB)
  - Problem: Bundled globally, only used in specific pages
  - Fix: Dynamic imports via `React.lazy()` and `Suspense`
  - Verify: `npx tsc --noEmit && npm run build` — check bundle size reduction

- [x] **4.7 Add debounce to Header scroll listener**
  - File: `frontend/src/components/layout/Header.tsx:37-38`
  - Problem: `getBoundingClientRect()` called on every scroll event
  - Fix: Throttle with `requestAnimationFrame`
  - Verify: `npx tsc --noEmit`

- [x] **4.8 Clean up unused imports and dead code**
  - Files: CanvasStudio.tsx (hasSelection, hasCustomSort), various
  - Fix: Remove all unused variables flagged by TS diagnostics
  - Verify: `npx tsc --noEmit` — zero warnings

---

## God Code Audit Summary

| Anti-pattern | Count | Worst offender |
|---|---|---|
| God Components (>400 lines) | **2** | CanvasStudio (1,431), CanvasSidebar (1,369) |
| God Files (>500 lines, 15+ exports) | **1** | canvasModel.ts (1,471 lines, 128 exports) |
| God Hooks (>200 lines, 5+ useState) | **2** | usePivotOrchestration (586), useCanvasPointer (479) |
| God Types (>10 fields, mixed concerns) | **3** | PivotTableView (12), PivotTableInstance (11) |
| Excessive Props (>10) | **3** | CanvasSidebarProps (18), DatasetPanelProps (10) |
| Prop Drilling (3+ levels) | **2** | LabsModule→CanvasStudio→CanvasSidebar→child |
| Shotgun Surgery risk | **5** | PivotTableView change → 10+ file updates |

**80% of anti-patterns are in `frontend/src/components/canvas/`** — the rest of the codebase is healthy.

---

## Full Plan Summary

| Phase | Items | Focus |
|-------|-------|-------|
| Phase 0 | 7 | God code decomposition (structural debt) |
| Phase 1 | 7 | Security, crashes, data loss (production blockers) |
| Phase 2 | 8 | Performance, stability |
| Phase 3 | 8 | Architecture, hardening |
| Phase 4 | 8 | Quality polish |
| **Total** | **38** | |

### Execution Order
1. **Phase 0** first — decomposition unlocks clean fixes in all later phases
2. **Phase 1** next — security/stability for production
3. **Phase 2** then — user-visible performance
4. **Phase 3-4** — maintainability and polish

### Verification Protocol
After EVERY item:
```bash
# Frontend
cd stockpilot/frontend && npx tsc --noEmit

# Backend (if backend change)
cd stockpilot/backend && npx tsc --noEmit && npm run test
```
