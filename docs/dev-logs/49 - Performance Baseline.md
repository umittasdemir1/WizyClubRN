# Performance Baseline

## Checkpoints
- `app_start`: set in `RootLayout` via `PerformanceLogger.markAppStart()`.
- `app_ready`: set after auth init + splash hide via `PerformanceLogger.markAppReady()`.
- `first_video_ready`: set on first active video render via `PerformanceLogger.markFirstVideoReady()`.

## How To Capture
1) Clear Metro/device logs.
2) Launch the app and navigate to the feed.
3) Filter logs for:
   - `Baseline start`
   - `Baseline checkpoint`
4) Record durations from log payload:
   - `durationMs`

## Automated (Android)
Run from `mobile/`:
- `npm run perf:baseline:android`

Then open the app, navigate to feed, and scroll a bit. The script writes a new row to the table.
If `adb` is not on PATH, set `ADB_PATH` or ensure it exists at `~/.nix-profile/bin/adb`.

## One-Command Start + Capture (Android)
If you normally run `npx expo start --dev-client`, use:
- `npm run start:devclient:baseline -- --clear`
- `npm run start:devclient:baseline -- --tunnel --clear`

This runs Expo and captures baseline logs in one step (no adb required).
Optional metadata:
- `--device "Pixel 7"`
- `--build dev`
- `--notes "tunnel + clear"`
If the QR is not shown, use the printed `Connect URL` in the Dev Client.

## Record
| Date | Device | Build | app_ready_ms | first_video_ready_ms | Notes |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | device model | dev/prod |  |  |  |
