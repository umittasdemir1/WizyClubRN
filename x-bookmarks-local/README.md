# X Bookmarks Local

Cloud-friendly tool to collect your X bookmarks without the X API and browse them on a single page.

## What it does

- serves a simple viewer at `http://localhost:3888`
- supports browser-side import from your normal logged-in X session
- can still try headless Playwright login/import as an optional fallback
- stores bookmarks locally in `data/bookmarks.json`

## Quick start

```bash
cd x-bookmarks-local
npm install
npm run browser:install
npm start
```

Then open the app through your cloud workspace forwarded URL and use the browser-import flow below.

## Recommended flow for cloud workspaces

1. Open the app URL from your cloud workspace in the browser.
2. Click `Copy Browser Script`.
3. In the same browser, open `https://x.com/i/bookmarks` while logged into your own X account.
4. Open DevTools Console, paste the copied script, and run it.
5. The script scrolls bookmarks and posts them back to this workspace.

This path avoids headless login issues that can happen in cloud environments where X returns `Something went wrong. Try reloading.` before the login form is usable.

## Notes

- Browser import is the default and safest path for cloud use.
- Headless `Login & Save Session` is optional and may fail depending on how X treats the cloud browser.
- If headless session is stored, `Import from X` runs in the cloud workspace with `data/storage-state.json`.
- If X asks for an extra identifier or 2FA code, fill the optional fields in the UI.
- If X behaves oddly with bundled Chromium, the app auto-detects system `chromium`/`chromium-browser`. You can still force an explicit binary with:

```bash
PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium npm start
```

## CLI import

You can also import without the web UI:

```bash
npm run import -- --max-items=300
```

## Data files

- bookmarks: `data/bookmarks.json`
- auth session: `data/storage-state.json`
- auth status: `data/auth-status.json`
- import status: `data/status.json`
