# R2 MCP Agent Guidelines

## Scope
Applies to `r2-mcp/` only (local MCP server scripts for Cloudflare R2).

## Transport and Logging
- For stdio MCP servers, write protocol output to `stdout` only.
- Write operational/debug logs to `stderr`.
- Keep tool payloads deterministic and JSON-safe.

## Security Rules
- Read credentials from environment variables only.
- Validate required env vars at startup and fail fast with clear error messages.
- Treat bucket/object paths as untrusted input; validate before use.

## Always
- Keep server behavior read-safe by default.
- Use explicit allowlists for destructive operations.
- Run syntax check after edits: `node -c r2-mcp/custom-r2-server.js`.

## Ask First
- Any bulk delete, recursive cleanup, or irreversible object operation.
- Any change that expands credentials scope or permission level.

## Never
- Never hardcode `ACCOUNT_ID`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, or tokens.
- Never print secrets in logs, error messages, or output files.

## Quick Commands
- Run wrapper: `node r2-mcp/run-r2-mcp.js`
- Direct server: `node r2-mcp/custom-r2-server.js`
