#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

echo "[env-sync-release] syncing root env to backend/mobile"
bash scripts/sync-env.sh all

echo "[env-sync-release] checking backend env contract"
node backend/scripts/check-env.js
