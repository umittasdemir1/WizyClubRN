#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ROOT_ENV_FILE="$ROOT_DIR/.env"
SYNC_ENV_SCRIPT="$SCRIPT_DIR/sync-env.sh"

if [[ ! -f "$ROOT_ENV_FILE" ]]; then
    echo "ERROR: root .env missing at $ROOT_ENV_FILE. Create it from .env.example first."
    exit 1
fi

if [[ ! -x "$SYNC_ENV_SCRIPT" ]]; then
    echo "ERROR: sync script missing or not executable: $SYNC_ENV_SCRIPT"
    exit 1
fi

"$SYNC_ENV_SCRIPT" backend

cd "$BACKEND_DIR"

if [[ ! -f .env ]]; then
    echo "ERROR: backend/.env could not be generated from root .env."
    exit 1
fi

needs_install=0

if [[ ! -d node_modules ]]; then
    echo "Installing backend dependencies (node_modules missing)..."
    needs_install=1
elif [[ -f package-lock.json && ( ! -f node_modules/.package-lock.json || package-lock.json -nt node_modules/.package-lock.json ) ]]; then
    echo "Installing backend dependencies (package-lock is newer than node_modules)..."
    needs_install=1
elif ! node -e "require.resolve('@google-cloud/speech')" >/dev/null 2>&1; then
    echo "Installing backend dependencies (missing @google-cloud/speech)..."
    needs_install=1
fi

if [[ "$needs_install" -eq 1 ]]; then
    npm install
fi

npm start
