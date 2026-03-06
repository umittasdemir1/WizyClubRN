---
name: supabase-rpc-contract
description: Use when mobile data-source RPC usage or backend RPC endpoints change. Verifies mobile-to-backend RPC contract compatibility before merge.
---

# Supabase RPC Contract

## When to use
- RPC name/signature changes
- Mobile data-source query refactors
- Backend script changes that affect mobile RPCs

## Workflow
1. Run RPC verification script.
2. List missing or renamed RPC references.
3. Propose migration-safe mapping for old/new names.

## Commands
- `bash scripts/verify-rpc-contract.sh`

## Success criteria
- `npm --prefix backend run verify:mobile-rpcs` passes.
