# MCP & Skills Guide (WizyClubRN)

Last updated: 2026-03-10

Index: [MCP_SKILLS_INDEX.md](./MCP_SKILLS_INDEX.md) | Turkish: [MCP_VE_SKILL_REHBERI_TR.md](./MCP_VE_SKILL_REHBERI_TR.md) | Setup: [CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md](./CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md)

This guide documents all MCP integrations and Codex skills available in this repository.
Manifest: `.codex/mcp-servers.json`
Skills directory: `.codex/skills/`

---

## 1) MCP Integrations

### Always Active (3)

#### openaiDeveloperDocs
Official OpenAI developer documentation access.
- Type: URL-based (`https://developers.openai.com/mcp`)
- Tools: `search_openai_docs`, `list_openai_docs`, `fetch_openai_doc`, `list_api_endpoints`, `get_openapi_spec`
- Use for: Model selection, API specs, migration notes, code samples.

#### filesystem
Workspace-scoped file system access.
- Type: Command (`@modelcontextprotocol/server-filesystem`)
- Tools: File read, write, list (workspace-bounded).
- Use for: Safe agent access to repository files.

#### r2-local
Cloudflare R2 storage operations.
- Type: Command (`r2-mcp/custom-r2-server.js`)
- Tools: `list_buckets`, `list_objects`
- Required env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- Use for: Bucket verification, object structure checks, upload target validation.

### Optional (6 - active when env vars are set)

| MCP | Implementation | Required Env | Use For |
|---|---|---|---|
| `github` | Local wrapper (`scripts/mcp/github-wrapper.js`) | `GITHUB_PERSONAL_ACCESS_TOKEN` | PR, issue, repo operations |
| `supabase-mcp-server` | Local wrapper (`scripts/mcp/supabase-wrapper.js`) | `SUPABASE_MCP_ACCESS_TOKEN` | Supabase project management |
| `postgres` | `@modelcontextprotocol/server-postgres` | `POSTGRES_MCP_URL` | Direct SQL queries, schema inspection |
| `netlify` | `@netlify/mcp` | `NETLIFY_MCP_ENABLED` | Deploy status, site management |
| `doppler` | Local wrapper (`scripts/mcp/doppler-wrapper.js`) | `DOPPLER_TOKEN` | Secret listing, project/config management |
| `bookmarks-local` | `bookmarks-mcp/server.js` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Bookmark search, X/Twitter bookmark data access |

---

## 2) Skills (16 total)

Skills are reusable workflows. Trigger with `use <skill-name>` or by requesting a matching task.

### Backend & API

| Skill | Purpose | Example |
|---|---|---|
| `backend-guardrails` | Enforces route-layer boundaries and mandatory test execution for backend changes. Runs `npm --prefix backend run test:all`. | "Use backend-guardrails to refactor feed.js." |
| `supabase-rpc-contract` | Verifies mobile-to-backend RPC contract compatibility. Runs `npm --prefix backend run verify:mobile-rpcs`. | "Use supabase-rpc-contract to validate feed datasource RPC params." |

### CI & GitHub

| Skill | Purpose | Example |
|---|---|---|
| `gh-fix-ci` | Analyzes failing GitHub Actions checks, extracts failure logs, proposes fixes. Uses `scripts/inspect_pr_checks.py`. | "Use gh-fix-ci to analyze why backend-ci failed." |
| `gh-address-comments` | Resolves PR review comments using gh CLI. Uses `scripts/fetch_comments.py`. | "Use gh-address-comments to address unresolved PR comments." |

### Env & Secret Management

| Skill | Purpose | Example |
|---|---|---|
| `env-sync-release` | Syncs root `.env` to backend/mobile/r2-mcp packages. Uses `sync-env.sh` + `check-env.js`. | "Use env-sync-release to propagate a new env var." |
| `doppler-env-sync` | Pulls root `.env` from Doppler and distributes to all packages. Uses `scripts/update-env-from-doppler.js`. Requires `DOPPLER_TOKEN`. | "Use doppler-env-sync to pull env from Doppler." |

### Security

| Skill | Purpose | Example |
|---|---|---|
| `security-threat-model` | Repository-grounded threat modeling with abuse paths and mitigations. Uses reference templates. | "Use security-threat-model for backend/routes threat model." |
| `security-best-practices` | Language/framework-specific security review. 10 reference files covering JS/TS, Python, Go. | "Use security-best-practices to review auth middleware." |

### Performance

| Skill | Purpose | Example |
|---|---|---|
| `mobile-feed-perf` | Mobile feed scroll/render/prefetch/video performance. Runs TypeScript checks + optional perf baseline. | "Use mobile-feed-perf to reduce dropped frames in home feed." |

### Documentation & Knowledge

| Skill | Purpose | Example |
|---|---|---|
| `openai-docs` | Official OpenAI guidance with MCP integration + 3 reference files (model selection, GPT-5.4 migration). | "Use openai-docs for Responses API migration notes." |
| `docs-navigator` | Targeted retrieval from `docs/` directory using ripgrep. | "Use docs-navigator to find notification architecture docs." |

### Infrastructure & DevOps

| Skill | Purpose | Example |
|---|---|---|
| `r2-mcp-ops` | R2 MCP preflight checks (env validation + syntax check). | "Use r2-mcp-ops to validate bucket setup." |
| `codex-mcp-cross-env` | Cross-platform (Windows/Linux/Firebase Studio) MCP bootstrap, repair, and validation. | "Use codex-mcp-cross-env to verify MCP setup." |

### Communication & Reporting

| Skill | Purpose | Example |
|---|---|---|
| `telegram-progress-reporter` | Sends session progress, test outcomes, blockers to Telegram. Supports backup/restore. Requires `CODEX_TELEGRAM_BOT_TOKEN`, `CODEX_TELEGRAM_CHAT_ID`, `CODEX_TELEGRAM_ENABLED`. | "Send session summary to Telegram." |

### Discovery & Research

| Skill | Purpose | Example |
|---|---|---|
| `skills-researcher` | Discovers and imports third-party skills from `awesome-agent-skills` catalog. | "Use skills-researcher to find new available skills." |
| `mcp-researcher` | Discovers and registers new MCP servers from official + community catalogs. | "Use mcp-researcher to search for a Stripe MCP." |

---

## 3) Quick Flows

### CI is failing
1. `gh-fix-ci` to analyze failure logs.
2. `backend-guardrails` to verify fixes.

### RPC changes made
1. `supabase-rpc-contract` for compatibility check.
2. Run mobile type-check + backend tests.

### Env changes / New machine setup
1. With Doppler: `doppler-env-sync` to pull.
2. Without Doppler: `env-sync-release` to sync.
3. Full setup: see [CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md](./CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md)

### Security review
1. Code-level: `security-best-practices`
2. Architecture-level: `security-threat-model`

### Performance issue
1. `mobile-feed-perf` for measure-optimize-validate loop.

### Discover new skills/MCPs
1. Skills: `skills-researcher`
2. MCPs: `mcp-researcher`

---

## 4) Environment Variables Summary

| Variable | Required | Used By |
|---|---|---|
| `R2_ACCOUNT_ID` | Yes | r2-local MCP, r2-mcp-ops |
| `R2_ACCESS_KEY_ID` | Yes | r2-local MCP, r2-mcp-ops |
| `R2_SECRET_ACCESS_KEY` | Yes | r2-local MCP, r2-mcp-ops |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Optional | github MCP |
| `SUPABASE_MCP_ACCESS_TOKEN` | Optional | supabase-mcp-server MCP |
| `POSTGRES_MCP_URL` | Optional | postgres MCP |
| `NETLIFY_MCP_ENABLED` | Optional | netlify MCP |
| `DOPPLER_TOKEN` | Optional | doppler MCP, doppler-env-sync |
| `DOPPLER_PROJECT` | Optional | doppler-env-sync |
| `DOPPLER_CONFIG` | Optional | doppler-env-sync |
| `CODEX_TELEGRAM_ENABLED` | Optional | telegram-progress-reporter |
| `CODEX_TELEGRAM_BOT_TOKEN` | Optional | telegram-progress-reporter |
| `CODEX_TELEGRAM_CHAT_ID` | Optional | telegram-progress-reporter |
| `SUPABASE_URL` | Optional | bookmarks-local MCP |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | bookmarks-local MCP |

---

## 5) Notes for Agents

- When a task matches a skill, prefer the skill-based workflow - it encodes project-specific guardrails.
- For sensitive operations (env, secrets, storage), always run preflight checks first.
- Default backend verification step: `npm --prefix backend run test:all`.
- MCP change process: update `.codex/mcp-servers.json` > update `.env.example` > verify with `bootstrap-codex-mcp.js`.
- Each skill's `SKILL.md` is the canonical reference; this guide is a summary.
