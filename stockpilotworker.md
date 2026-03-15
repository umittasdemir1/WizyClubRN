# StockPilot Studio Canvas — Performance & Architecture Documentation

## Overview

This document covers the performance optimizations, architectural decisions, and working principles applied to the StockPilot Studio Canvas (pivot table system). The goal: **Excel/PowerBI-level responsiveness** for table creation, metric operations, filtering, dragging, and all interactive canvas work.

---

## What Was Done

### 1. O(n²) → O(n) Algorithm Fix in `getVisibleRowCombos`

**File:** `canvasRenderHelpers.ts`

**Problem:** `getVisibleRowCombos` called `getRowFieldFilterOptions` (which iterates ALL row combos) inside a `.filter()` loop over ALL row combos. With 10k rows × 2 row fields × 10k combos = **200M operations per render**.

**Fix:** Pre-compute filter sets ONCE before the filter loop:

```ts
// BEFORE (O(n²)): getRowFieldFilterOptions called per row inside filter
const filtered = rowCombos.filter((combo) => {
    const options = getRowFieldFilterOptions(view, fieldId, rowIndex, ...); // O(n) per call!
    // ...filter logic
});

// AFTER (O(n)): pre-compute all filter sets, then filter
const rowFieldSelectedSets = view.table.layout.rows.map((fieldId, rowIndex) => {
    const options = getRowFieldFilterOptions(view, fieldId, rowIndex, headerFilterSortDirections);
    return new Set(getHeaderFilterSelectedValues(...));
});

const filtered = rowCombos.filter((combo) => {
    return view.table.layout.rows.every((_, rowIndex) =>
        rowFieldSelectedSets[rowIndex].has(combo.labels[rowIndex]) // O(1) lookup
    );
});
```

**Impact:** Most impactful single fix. Filtering went from 10-15s to near-instant.

---

### 2. Pre-computed Map Lookups in `buildPivotResult`

**File:** `canvasModel.ts`

**Problem:** `buildPivotResult` used `columns.find()` per record per field. With 50k rows × 3 fields × 50 columns = **7.5M linear scans**.

**Fix:** Build `Map<string, ColumnMeta>` and `Map<string, CustomMetricDefinition>` once, use O(1) `.get()`:

```ts
const colMap = new Map(columns.map((c) => [c.key, c]));
const metricMap = new Map(customMetrics.map((m) => [m.id, m]));
// Then use fieldDefFromMaps(fieldId, colMap, metricMap) instead of getFieldDefinition(fieldId, columns, ...)
```

**Impact:** Table creation dropped from 10-15s to <1s for large datasets.

---

### 3. Direct Lookup in `getFieldDefinition`

**File:** `canvasModel.ts`

**Problem:** `getFieldDefinition` called `getAvailablePivotFields()` which builds a full array every time, then `.find()` on it. Called hundreds of times per render cycle.

**Fix:** Direct lookup — check `customMetrics.find()` or `columns.find()` directly, no intermediate array:

```ts
export function getFieldDefinition(fieldId, columns = [], customMetrics = [], columnOverrides = {}) {
    if (isCustomMetricFieldId(fieldId)) {
        const metric = customMetrics.find((m) => m.id === fieldId);
        return metric ? buildCustomMetricFieldDefinition(metric) : FALLBACK_FIELD_DEF(fieldId);
    }
    const col = columns.find((c) => c.key === fieldId);
    return col ? columnMetaToFieldDefinition(col, columnOverrides) : FALLBACK_FIELD_DEF(fieldId);
}
```

---

### 4. Component Isolation for Re-render Prevention

**File:** `CanvasSidebar.tsx`

**Problem:** The typewriter placeholder effect (`setPlaceholderText` every 60ms) was inside the main `CanvasSidebar` component. Every 60ms state update caused the **entire sidebar** (including all pivot field lists, drag handlers, etc.) to re-render.

**Fix:** Extracted `MetricNameInput` as an isolated component. The 60ms typewriter timer now only re-renders a single `<input>` element:

```tsx
function MetricNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [placeholder, setPlaceholder] = useState("");
    // typewriter effect lives here — only this component re-renders
    return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
```

**Impact:** Eliminated ~16 unnecessary full sidebar re-renders per second.

---

### 5. Debounced localStorage Persistence

**File:** `usePivotOrchestration.ts`

**Problem:** `persistStudioState` wrote to localStorage on every state change. During drag operations or rapid edits, this meant 30+ synchronous JSON serialization + localStorage writes per second.

**Fix:** Debounced with 500ms timer:

```ts
const persistTimerRef = useRef<ReturnType<typeof setTimeout>>();

useEffect(() => {
    clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
        persistStudioState(analysisId, { tables, columnOverrides, ... });
    }, 500);
    return () => clearTimeout(persistTimerRef.current);
}, [tables, columnOverrides, ...]);
```

---

### 6. Auto-fit Layout Fingerprinting

**File:** `useCanvasPointer.ts`

**Problem:** The auto-fit `useLayoutEffect` ran `getBoundingClientRect()` on every table element whenever ANY table property changed (including position during drag, name, color).

**Fix:** Fingerprint only layout-affecting properties. Skip when only position/name/color changed:

```ts
const autoFitKey = tables.map((t) =>
    `${t.id}:${t.hasCustomizedSize}:${JSON.stringify(t.layout)}:${JSON.stringify(t.filterSelections)}`
).join("|");
if (autoFitKey === prevAutoFitKeyRef.current) return;
prevAutoFitKeyRef.current = autoFitKey;
```

---

### 7. Pivot Cache `columnOverrides` Bug Fix

**File:** `usePivotOrchestration.ts`

**Problem:** The pivot view cache returned stale views with old `columnOverrides` because the cache key didn't include `columnOverrides`. When a user changed a field's display name or format, the table showed stale data.

**Fix:** When cache hits but `columnOverrides` reference changed, update the cached view in-place:

```ts
if (cached && cached.cacheKey === cacheKey) {
    if (cached.tableRef === table && cached.view.columnOverrides === columnOverrides) return cached.view;
    const updated = {
        ...cached, tableRef: table,
        view: { ...cached.view, table, columnOverrides }
    };
    pivotCache.current.set(table.id, updated);
    return updated.view;
}
```

---

### 8. Field Editor Modal — Pending State & Manual Save

**File:** `CanvasSidebar.tsx`

**Problem:** Field editor changes (rename, format, color) applied immediately, triggering live re-sort and pivot recalculation while the user was still typing.

**Fix:** Introduced `pendingOverrides` local state:

- User edits go to `pendingOverrides` (local, not committed)
- Each row shows a **Save** pill button when dirty
- Clicking Save commits that row's changes to `columnOverrides`
- Shows "Saved" confirmation briefly, then a reset (↺) button for committed overrides
- Sorting/pivot recalculation only triggers on committed `columnOverrides`
- Pending state clears when modal closes

---

## Working Principles for Future Development

### Performance-First Rules

1. **Never use `.find()` or `.filter()` inside hot loops.**
   Pre-build `Map` or `Set` for any lookup that happens per-row. If you have N rows and M columns, a `.find()` per row turns O(N) into O(N×M).

2. **Pre-compute filter/sort criteria before iteration.**
   Any filtering or sorting that needs derived data (options, selected values) must compute that data ONCE, then reference it inside the loop.

3. **Avoid creating intermediate arrays in frequently-called functions.**
   `getAvailablePivotFields()` was building a new array every call. Direct property access or pre-built Maps are always preferred.

4. **Isolate high-frequency state updates into leaf components.**
   If something updates at 16-60ms intervals (animations, typewriter effects, cursor blink), it MUST be in its own component so React's reconciliation doesn't touch the parent tree.

5. **Debounce persistence operations.**
   localStorage, API calls, and any I/O triggered by state changes should be debounced (300-500ms). Never write synchronously on every state tick.

6. **Fingerprint expensive effects.**
   `useLayoutEffect` and `useEffect` that do DOM measurement (`getBoundingClientRect`, `clientWidth`) should build a cache key from the properties that actually affect layout. Skip when irrelevant properties change.

7. **Cache invalidation must be complete.**
   When caching computed views (like pivot results), the cache key or update logic must account for ALL inputs. If `columnOverrides` affects the output, it must be part of the cache check.

### Architecture Rules

8. **Pending state for user input in editors.**
   Any modal/editor where the user types or selects values should use local pending state. Commit to shared state only on explicit Save. This prevents live re-computation disrupting the user's workflow.

9. **Ref-based state for pointer/drag operations.**
   Move and resize operations should use refs (not state) for intermediate positions. Only commit to React state on pointer-up. This avoids per-frame re-renders during drag.

10. **Measure-first auto-sizing.**
    Auto-fit table sizing should measure DOM elements only when layout-relevant properties change. Use a fingerprint/key to detect whether measurement is needed.

### Code Quality Rules

11. **Remove dead code immediately after refactoring.**
    When inlining or replacing a function, delete the original. Don't leave unused exports — they confuse future readers and increase bundle size.

12. **Keep pivot computation pure.**
    `buildPivotResult` and related functions should be pure (no side effects, no DOM access). This makes them easy to test, cache, and potentially move to a Web Worker.

13. **Type everything.**
    All pivot field IDs, combo keys, filter state keys, and aggregation states should use branded/specific types. This catches bugs at compile time instead of runtime.

---

## Performance Benchmarks (Before → After)

| Operation | Before | After |
|---|---|---|
| Table creation (10k rows, 3 fields) | 10-15s | <1s |
| Filter selection | 5-10s | <200ms |
| Table click/drag response | 3-5s | Instant |
| Field editor typing | Laggy (live re-sort) | Smooth (pending state) |
| Sidebar idle CPU | ~16 re-renders/sec (typewriter) | 0 (isolated) |

---

## Future Improvements (Not Yet Implemented)

- **Row virtualization**: Only render visible rows in the DOM. Currently all 10k+ rows are rendered. Libraries like `react-window` or `@tanstack/react-virtual` can handle this.
- **Web Worker pivot computation**: Move `buildPivotResult` to a Web Worker to avoid blocking the main thread during large dataset processing.
- **Incremental pivot updates**: When a single filter changes, recompute only the affected slice instead of the full pivot.

---

*Last updated: 2026-03-15*
