---
name: r2-mcp-ops
description: Use for Cloudflare R2 MCP operations in r2-mcp/. Enforces env-based credentials, startup preflight checks, and safe handling for destructive object actions.
---

# R2 MCP Ops

## When to use
- R2 bucket/object listing and diagnostics
- MCP server maintenance in `r2-mcp/`
- Credential/config hardening tasks

## Workflow
1. Run credential preflight checks.
2. Start MCP server in non-destructive mode by default.
3. Ask before any delete/purge operation.

## Commands
- `bash scripts/preflight.sh`

## Success criteria
- Required env vars are present.
- Server syntax and startup checks pass.
