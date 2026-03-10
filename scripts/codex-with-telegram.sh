#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NOTIFIER="node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js"

cd "$REPO_ROOT"
node scripts/prompt-doppler-sync.js
node scripts/bootstrap-codex-mcp.js --no-list

SESSION_ID="$($NOTIFIER start --print-session-id)"
export CODEX_TELEGRAM_SESSION_ID="$SESSION_ID"

WATCH_PID=""
cleanup() {
    local status="$1"
    if [[ -n "$WATCH_PID" ]]; then
        kill "$WATCH_PID" >/dev/null 2>&1 || true
        wait "$WATCH_PID" >/dev/null 2>&1 || true
    fi
    $NOTIFIER finish --session-id "$SESSION_ID" --status "$status" >/dev/null 2>&1 || true
}

$NOTIFIER watch --session-id "$SESSION_ID" >/dev/null 2>&1 &
WATCH_PID=$!

set +e
codex "$@"
EXIT_CODE=$?
set -e

if [[ $EXIT_CODE -eq 0 ]]; then
    cleanup "ok"
else
    cleanup "fail"
fi

exit "$EXIT_CODE"
