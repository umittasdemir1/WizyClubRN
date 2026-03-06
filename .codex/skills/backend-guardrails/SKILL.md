---
name: backend-guardrails
description: Use for backend refactors and API changes in backend/. Enforces route-layer boundaries, bootstrap thinness, and mandatory backend test execution before merge.
---

# Backend Guardrails

## When to use
- Route changes in `backend/routes/`
- Use case/repository/service refactors
- Any backend API behavior change

## Workflow
1. Validate architecture boundaries (no direct DB calls in routes).
2. Run backend regression suite.
3. Report failing tests and likely root cause before changing guardrails.

## Commands
- `bash scripts/run-backend-checks.sh`

## Success criteria
- `npm --prefix backend run test:all` passes.
- Architecture guardrails remain active and passing.
