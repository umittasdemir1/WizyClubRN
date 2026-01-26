# Backend Scripts CLI

All one-off backend and maintenance scripts live in this folder.
Use the CLI entry to list and run them.

## Usage

List commands:

```
node backend/scripts/cli.js list
```

Run a script:

```
node backend/scripts/cli.js <command> [args...]
```

Via npm:

```
npm run cli -- <command> [args...]
```

Notes:
- Commands map to filenames without the `.js` extension.
- Example: `check-env` runs `backend/scripts/check-env.js`.
- Windows-only helper: `backend/scripts/update-env.bat` (not part of CLI).
