---
name: env-sync-release
description: Use for environment-variable changes, release preparation, and local env sync. Ensures root env is propagated to backend/mobile before verification runs.
---

# Env Sync Release

## When to use
- New env variable added
- Value or naming convention changed
- Pre-release consistency checks

## Workflow
1. Sync root `.env` into app packages.
2. Validate backend env parse.
3. Report missing keys before running smoke.

## Commands
- `bash scripts/sync-and-check.sh`

## Success criteria
- `scripts/sync-env.sh all` completes.
- Backend env checker passes.
