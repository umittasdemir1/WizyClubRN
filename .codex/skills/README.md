# WizyClubRN Local Skills

This directory contains repository-local Codex skills for repeated high-value workflows.

Available skills:
- `backend-guardrails`
- `codex-mcp-cross-env`
- `docs-navigator`
- `env-sync-release`
- `mcp-researcher`
- `mobile-feed-perf`
- `r2-mcp-ops`
- `skills-researcher`
- `supabase-rpc-contract`

Design notes:
- Keep each skill focused on one workflow.
- Prefer scripts for repeatable checks.
- Avoid loading large documentation blindly; use targeted retrieval.
- Review third-party skills before importing them into `.codex/skills/`.
