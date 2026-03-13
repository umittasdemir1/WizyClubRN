# StockPilot Separation Plan

## Goal

Move `stockpilot/` into its own repository without breaking the existing `WizyClubRN` projects.

## Guardrails

- Only change files under `stockpilot/` unless a root-level change is explicitly required and non-breaking.
- Keep current `backend/`, `mobile/`, and `r2-mcp/` runtime behavior untouched.
- Prefer additive isolation work first: local docs, local env examples, local ignore rules, local build boundaries.

## Current Coupling

1. Root tooling still assumes `backend/`, `mobile/`, and `r2-mcp/` are the only env-sync targets.
2. StockPilot deployment/provider notes live partly in root docs.
3. StockPilot currently depends on root ignore rules instead of having its own repo-ready `.gitignore`.
4. Frontend and backend duplicate parser and analysis rules, so fallback behavior can drift during extraction.

## Execution Phases

### P0: Correctness Before Extraction

- [X] Stop silent API failure fallback for business-logic errors.
- [X] Fix locale-sensitive numeric parsing in frontend/backend normalization.
- [X] Remove synthetic SKU generation for empty rows.
- [X] Tighten Studio message acceptance to trusted origins only.
- [X] Reduce main bundle coupling by splitting workspace and studio entry chunks.

### P1: Repo Isolation

- [X] Add StockPilot-local `.gitignore`.
- [X] Add StockPilot-local env examples for frontend and backend.
- [X] Move separation notes under `stockpilot/`.
- [X] Add StockPilot package-level build and check scripts.
- [ ] Isolate env sync and secret-management workflow from root scripts.
- [ ] Move remaining StockPilot-specific deployment and ops notes under `stockpilot/`.

### P2: Architecture Cleanup

- [X] Move shared stock domain contracts and normalization rules into a StockPilot-only shared module.
- [X] Start splitting `CanvasStudio.tsx` by extracting model, storage, header-filter, and typewriter helpers.
- [ ] Extract pivot domain orchestration from `CanvasStudio.tsx`.
- [ ] Extract persistence and pointer interaction hooks from `CanvasStudio.tsx`.
- [ ] Extract presentation sections/components from `CanvasStudio.tsx`.
- [X] Introduce backend usecase layer for upload, analysis, and transfer flows.
- [ ] Add explicit backend request contracts and DTO boundaries around usecases.
- [X] Add parser and backend normalization regression tests.
- [X] Add backend usecase regression tests.
- [ ] Add dedicated analysis and transfer regression tests for business rules.

### P3: Final Extraction

- [ ] Create new git root from `stockpilot/`.
- [ ] Re-home deployment config, MCP notes, and provider secrets docs.
- [ ] Add standalone CI for frontend build, backend build, and parser/domain tests.
- [ ] Remove root-level StockPilot planning/checklist remnants after extraction is complete.

## Started In This Session

- [X] Review findings captured and prioritized.
- [X] Safe isolation work started inside `stockpilot/`.
- [X] P0 fixes completed before any cross-repo move.
- [X] Backend usecase layer started so route files can stay transport-only during extraction.
- [X] Shared StockPilot normalization/contracts now compile for both frontend and backend.
- [X] `CanvasStudio` helper extraction started with dedicated storage, header-filter, and typewriter modules.
