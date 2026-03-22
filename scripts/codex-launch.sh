#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"
MODE="$(node scripts/lib/codex-launch-mode.js)"

if [[ "$MODE" == "telegram" ]]; then
    exec bash scripts/codex-with-telegram.sh "$@"
fi

exec bash scripts/codex-with-mcp.sh "$@"
