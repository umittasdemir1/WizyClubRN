#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

echo "[supabase-rpc-contract] verifying mobile RPC contracts against backend expectations"
npm --prefix backend run verify:mobile-rpcs
