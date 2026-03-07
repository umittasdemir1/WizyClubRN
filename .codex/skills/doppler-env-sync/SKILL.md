---
name: doppler-env-sync
description: Use when root .env must be refreshed from Doppler and immediately propagated to backend/mobile/r2-mcp across machines.
---

# Doppler Env Sync

## When to use
- You switch between two machines and want the same env quickly.
- Root `.env` drifted and should be replaced from Doppler as source of truth.
- You need one command that both updates root `.env` and runs package env sync.

## Preconditions
- `DOPPLER_TOKEN` is available in root `.env` or passed with `--token`.
- Project and config are known.

## Workflow
1. Pull root `.env` from Doppler with the helper command.
2. Automatically regenerate `backend/.env`, `mobile/.env`, and `r2-mcp/.env` unless `--no-sync` is requested.
3. Validate the generated package env files before running app/test commands.

## Commands
- `node scripts/update-env-from-doppler.js --project <project> --config <config>`
- `node scripts/update-env-from-doppler.js --project <project> --config <config> --token <dp...>`
- `node scripts/update-env-from-doppler.js --project <project> --config <config> --no-sync`
- Linux/macOS wrapper: `bash .codex/skills/doppler-env-sync/scripts/doppler_env_sync.sh --project <project> --config <config>`
- Windows wrapper: `.codex\skills\doppler-env-sync\scripts\doppler_env_sync.cmd --project <project> --config <config>`

## Success criteria
- Root `.env` is refreshed from Doppler.
- `backend/.env`, `mobile/.env`, and `r2-mcp/.env` are regenerated from root `.env`.
- No manual per-package `.env` editing is needed.
