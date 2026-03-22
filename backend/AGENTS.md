# Backend Agent Guidelines

## Scope
Applies to `backend/` only (Express + Supabase + R2).

## Architecture Rules
- Keep `routes/` thin. Route layer must not include direct `.from(` or `.rpc(` calls.
- Put orchestration in `usecases/`, data access in `repositories/`, integrations in `services/`.
- Keep `server.js` and `bootstrap/createServerContext.js` small; preserve bootstrap split.

## Always
- Run: `npm --prefix backend run test:all` after backend code changes.
- Use `node backend/scripts/cli.js list` to discover operational scripts before creating new one-off scripts.
- Preserve CommonJS style (`require/module.exports`) and semicolon-terminated statements.

## Ask First
- Any DB schema/migration change in `migrations/`.
- Any RPC contract change that affects mobile clients.
- Any env contract change (`backend/.env.example`, required secrets, credential files).

## Never
- Never hardcode credentials, tokens, or keys in source.
- Never bypass ownership/auth middleware checks for convenience.
- Never weaken architecture guardrails in tests to pass a change quickly.

## Quick Commands
- Start: `npm --prefix backend run start`
- Full tests: `npm --prefix backend run test:all`
- Smoke checks: `npm --prefix backend run smoke`
- RPC contract check: `npm --prefix backend run verify:mobile-rpcs`
