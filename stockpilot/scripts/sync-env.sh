#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_ENV_FILE="$ROOT_DIR/backend/.env"
FRONTEND_ENV_FILE="$ROOT_DIR/frontend/.env"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
    echo "[env] WARNING: root .env not found at $ROOT_DIR/.env" >&2
    if [[ -f "$ROOT_DIR/.env.example" ]]; then
        echo "[env] Copying from .env.example..."
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    else
        echo "[env] ERROR: .env.example is also missing." >&2
        exit 1
    fi
fi

cp "$ROOT_DIR/.env" "$BACKEND_ENV_FILE"
cp "$ROOT_DIR/.env" "$FRONTEND_ENV_FILE"

echo "[env] backend/.env generated from stockpilot/.env"
echo "[env] frontend/.env generated from stockpilot/.env"
echo "[env] stockpilot environment variables synchronized."
