#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP_PYTHON="${STOCKPILOT_PYTHON_BOOTSTRAP_BIN:-}"

if [[ -z "$BOOTSTRAP_PYTHON" ]]; then
    if command -v python3 >/dev/null 2>&1; then
        BOOTSTRAP_PYTHON="$(command -v python3)"
    elif command -v python >/dev/null 2>&1; then
        BOOTSTRAP_PYTHON="$(command -v python)"
    elif [[ -x "$HOME/.nix-profile/bin/python3" ]]; then
        BOOTSTRAP_PYTHON="$HOME/.nix-profile/bin/python3"
    else
        echo "Python runtime not found. Set STOCKPILOT_PYTHON_BOOTSTRAP_BIN or install python3 first." >&2
        exit 1
    fi
fi

"$BOOTSTRAP_PYTHON" -m venv "$ROOT_DIR/.venv"
"$ROOT_DIR/.venv/bin/pip" install --upgrade pip
"$ROOT_DIR/.venv/bin/pip" install -r "$ROOT_DIR/python/requirements.txt"

echo "S+Academia faster-whisper worker ready at $ROOT_DIR/.venv/bin/python"
