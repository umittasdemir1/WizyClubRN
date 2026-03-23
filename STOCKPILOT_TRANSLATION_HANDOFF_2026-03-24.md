# StockPilot Translation Handoff - March 24, 2026

## Today

Today the `stockpilot` transcript translation system was brought into a working state on the local Windows machine.

Completed work:

- Confirmed `stockpilot/backend` builds successfully.
- Confirmed `stockpilot/frontend` builds successfully.
- Confirmed backend tests pass.
- Confirmed the translation worker returns real Turkish output.
- Confirmed `faster-whisper` can load on Windows.
- Confirmed the backend can start and respond to `/api/health`.
- Fixed the backend so `stockpilot/backend/.env` is loaded at startup.
- Fixed the Python worker setup flow so it does not accidentally select unsupported Python 3.14 on Windows.
- Updated Python requirements to support the current Windows runtime path.
- Hardened the worker setup script with a clean venv recreate path and retry-friendly pip install flow.
- Added Turkish-character repair on translated transcript text in the backend.
- Added frontend-side translation cache sanitization and bumped the translation cache key version so old broken cached translations are not reused.
- Cleaned the visible loading copy from broken punctuation variants to plain ASCII `...`.

## Current State

As of March 24, 2026, the local Windows machine is in a good state for `stockpilot` transcript translation.

Verified locally:

- Backend build: passes
- Frontend build: passes
- Backend tests: pass
- Translation worker: works
- `faster-whisper`: loads
- API runtime: works

Translation example that worked locally:

- Input: `Welcome to StockPilot.`
- Output: `StockPilot'a hoş geldiniz.`

## Firebase Studio Impact For March 25, 2026

The Firebase Studio environment is Linux-based, so it is affected differently from Windows.

What changes matter there:

- The new backend `.env` loader means `stockpilot/backend/.env` values will now actually be used by the backend process.
- The backend translation service now auto-repairs likely mojibake text before returning translated cues.
- The frontend translation cache version changed from `v1` to `v2`, so old broken translation cache entries from previous runs will no longer be used.
- The worker setup script is now stricter about supported Python versions and recreates the venv cleanly.

What this means in Firebase Studio:

- Existing old broken translated transcript cache in the browser should effectively be bypassed because the cache prefix changed.
- Backend Python worker setup may need to be rerun in the Linux workspace so the environment matches the updated script and requirements.
- If the Linux workspace still has the earlier `/tmp`-based venv and model-cache workaround, that can continue to work, but it should be rechecked because `/tmp` may be cleared between sessions.

## What To Do Tomorrow In Firebase Studio

Recommended steps on March 25, 2026:

1. Open the latest repo state after this push.
2. Go to `stockpilot/backend`.
3. Ensure `backend/.env` exists if you rely on local worker env overrides.
4. Run `npm run academia:setup`.
5. Run `npm run build`.
6. Run `npm test`.
7. Go to `stockpilot/frontend`.
8. Run `npm run build`.
9. Start backend and frontend normally.
10. Upload one English media file and verify both transcript and Turkish translation in the UI.

## Linux Notes

If Firebase Studio still has the low-disk `/home` problem:

- Keep using a non-home cache location such as `/tmp/stockpilot-model-cache`.
- If needed, set `STOCKPILOT_MODEL_CACHE_DIR` in `stockpilot/backend/.env`.
- If needed, keep `.venv` on a larger writable volume or recreate the previous symlink-based workaround.

If Python discovery needs to be forced:

- Set `STOCKPILOT_PYTHON_BOOTSTRAP_BIN` in `stockpilot/backend/.env`.

Good Linux candidate examples:

- `/home/user/.nix-profile/bin/python3`
- a valid Python 3.11, 3.12, or 3.13 interpreter path

## Expected Outcome Tomorrow

If the Firebase Studio environment can install Python dependencies and has enough disk for the model cache, it should work after rerunning the worker setup.

The most likely Linux-specific failure points tomorrow are:

- low disk space
- cleared `/tmp`
- missing or wrong Python bootstrap path
- model cache download delay on first run

## Important Reminder

The browser-side translation cache was intentionally version-bumped. This is expected and correct. The first translation request after opening the updated frontend may fetch again instead of using an older cached Turkish result.
