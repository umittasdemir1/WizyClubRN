#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

echo "[mobile-feed-perf] running type checks"
npx --prefix mobile tsc --noEmit

echo "[mobile-feed-perf] trying perf baseline (best effort)"
if npm --prefix mobile run perf:baseline:android; then
  echo "[mobile-feed-perf] perf baseline completed"
else
  echo "[mobile-feed-perf] perf baseline could not complete in this environment; continue with reported limitation" >&2
fi
