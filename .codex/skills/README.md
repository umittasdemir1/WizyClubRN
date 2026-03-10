# WizyClubRN Local Skills

This directory contains repository-local Codex skills for repeated high-value workflows.

Available skills (16):
- `backend-guardrails` - Backend route-layer boundaries and test enforcement
- `codex-mcp-cross-env` - Cross-platform MCP bootstrap and repair
- `docs-navigator` - Targeted retrieval from docs/ directory
- `doppler-env-sync` - Doppler-based env pull and package distribution
- `env-sync-release` - Root .env sync to backend/mobile/r2-mcp
- `gh-address-comments` - GitHub PR review comment resolution
- `gh-fix-ci` - GitHub Actions CI failure analysis
- `mcp-researcher` - MCP server discovery and registration
- `mobile-feed-perf` - Mobile feed performance monitoring
- `openai-docs` - OpenAI developer docs guidance
- `r2-mcp-ops` - Cloudflare R2 MCP preflight and operations
- `security-best-practices` - Language/framework security review
- `security-threat-model` - Repository-grounded threat modeling
- `skills-researcher` - Third-party skill discovery and import
- `supabase-rpc-contract` - Mobile-backend RPC contract verification
- `telegram-progress-reporter` - Telegram session progress and backup

Design notes:
- Keep each skill focused on one workflow.
- Prefer scripts for repeatable checks.
- Avoid loading large documentation blindly; use targeted retrieval.
- Review third-party skills before importing them into `.codex/skills/`.
