---
name: telegram-progress-reporter
description: Use when a user wants Codex session progress, code-change summaries, test outcomes, or blocker updates sent to a Telegram bot during terminal work. Also use when setting up, debugging, or operating the repo's Telegram notifier wrapper for Codex sessions.
---

# Telegram Progress Reporter

Prefer short checkpoint-style Telegram updates over raw terminal streaming.
- Never send `.env` contents, secrets, tokens, credentials, or full diffs.
- Keep messages concise and outcome-first.
- Treat Telegram as optional; missing config must not block the coding task.

## Setup
1. Fill root `.env` with:
   - `CODEX_TELEGRAM_ENABLED=1`
   - `CODEX_TELEGRAM_BOT_TOKEN=...`
   - `CODEX_TELEGRAM_CHAT_ID=...`
2. Start Codex with:
   - `bash scripts/codex-with-telegram.sh`
   - On Windows: `scripts\codex-with-telegram.cmd`
3. The wrapper sends automatic start/end messages. The bash wrapper also starts a periodic workspace watcher.

## Workflow
1. Let the wrapper handle automatic session start/end.
2. After meaningful progress, send a checkpoint with the bundled notifier:
   - research/discovery batch completed
   - edit batch completed
   - test/typecheck/build finished
   - blocker or failure discovered
3. Use the current session id from `CODEX_TELEGRAM_SESSION_ID` when present.
4. Continue working even if Telegram is disabled; the notifier should degrade to local logging.

## Checkpoint command
- `node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js checkpoint --summary "<short outcome>" --scope "<backend|mobile|docs|repo>" --status "<ok|fail|info>"`
- Add `--command "<cmd>"` for tests, typechecks, builds, or deploy checks.
- Add repeated `--file <path>` when specific files matter.
- Add `--duration-seconds <n>` when elapsed time is useful.

## Message rules
- Lead with the user-visible outcome.
- Mention the affected scope or package.
- Mention command/result only when it changes confidence.
- Prefer `ok`, `fail`, and `info`.
- Write Telegram summaries in Turkish.
- Use Turkey time for any explicit time reference.
- Do not paste source code into Telegram by default.

## Commands
- `node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js start --print-session-id`
- `node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js watch --session-id "$CODEX_TELEGRAM_SESSION_ID"`
- `node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js checkpoint --summary "..."`
- `node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js finish --session-id "$CODEX_TELEGRAM_SESSION_ID"`
- `bash scripts/codex-with-telegram.sh`

## Success criteria
- Session start/end notifications work with no manual Telegram step after setup.
- Periodic auto updates stay short and safe.
- Checkpoint messages summarize progress without dumping raw terminal output.
- Disabled or incomplete Telegram config never blocks Codex usage.
