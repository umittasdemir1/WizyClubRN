---
name: codex-mcp-cross-env
description: Use when OpenAI Codex CLI MCPs must be bootstrapped, repaired, or validated across Windows VSCode local environments and Linux cloud workspaces such as Firebase Studio. Detects the runtime, writes the managed MCP block, and verifies r2-local readiness.
---

# Codex MCP Cross Environment

## When to use
- Moving between Firebase Studio and a local Windows VSCode machine
- Repairing missing or stale Codex MCP registrations
- Validating that `r2-local` and the managed Codex MCP block are healthy

## Workflow
1. Run `node scripts/bootstrap-codex-mcp.js`.
2. If the script fails on missing root `.env`, create it from `.env.example` and fill real secrets.
3. Treat missing `github`, `supabase-mcp-server`, or `postgres` as optional unless their tokens are expected in the current environment.
4. Install shell integration once per machine with `node scripts/install-codex-shell-integration.js`.
5. Shell integration writes a `codex` launcher function that auto-selects the wrapper:
   - if `CODEX_TELEGRAM_ENABLED=1`, plain `codex` uses `scripts/codex-with-telegram.*`
   - otherwise plain `codex` uses `scripts/codex-with-mcp.*`
6. If the user wants bootstrap to happen before every Codex CLI launch without relying on shell integration, use the repo wrapper directly:
   - Linux/Firebase Studio: `bash scripts/codex-with-mcp.sh`
   - Windows: `scripts\\codex-with-mcp.cmd`
7. If the user wants automatic Telegram session start/end notifications and periodic workspace summaries, use the Telegram wrapper:
   - Linux/Firebase Studio: `bash scripts/codex-with-telegram.sh`
   - Windows: `scripts\\codex-with-telegram.cmd`
   - Requires `CODEX_TELEGRAM_ENABLED=1`, `CODEX_TELEGRAM_BOT_TOKEN`, and `CODEX_TELEGRAM_CHAT_ID` in root `.env`.
   - After shell integration is installed, plain `codex` also starts the Telegram watcher when the env flag is enabled.
8. If the user asks for inspection only, run `node scripts/bootstrap-codex-mcp.js --check-only` and `node scripts/install-codex-shell-integration.js --check-only`.

## Commands
- `node scripts/bootstrap-codex-mcp.js`
- `node scripts/bootstrap-codex-mcp.js --check-only`
- `node scripts/bootstrap-codex-mcp.js --force-install`
- `node scripts/bootstrap-codex-mcp.js --full-env-sync`
- `node scripts/install-codex-shell-integration.js`
- `node scripts/install-codex-shell-integration.js --check-only`
- `bash scripts/codex-launch.sh`
- `scripts\\codex-launch.cmd`
- `bash scripts/codex-with-mcp.sh`
- `scripts\\codex-with-mcp.cmd`
- `bash scripts/codex-with-telegram.sh`
- `scripts\\codex-with-telegram.cmd`

## Success criteria
- `node scripts/doctor-codex-mcp.js` passes.
- `codex mcp list` shows `openaiDeveloperDocs`, `filesystem`, `r2-local`, and `netlify`.
- `r2-local` points at `r2-mcp/custom-r2-server.js`.
- `codex` launches through the managed launcher on each machine after one-time shell integration.
- When Telegram env keys are present, `codex-with-telegram` also sends automatic session notifications.
- The flow works without copying `~/.codex/config.toml` between machines.
