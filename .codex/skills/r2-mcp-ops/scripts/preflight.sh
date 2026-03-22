#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

required=(
  "R2_ACCOUNT_ID"
  "R2_ACCESS_KEY_ID"
  "R2_SECRET_ACCESS_KEY"
)

echo "[r2-mcp-ops] checking required env vars"
missing=0
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing env var: $key" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "[r2-mcp-ops] syntax check"
node -c r2-mcp/custom-r2-server.js
