# MCP & Skills Guide (WizyClubRN)

Last updated: 2026-03-06

Index: [MCP_SKILLS_INDEX.md](./MCP_SKILLS_INDEX.md) | Turkish version: [MCP_VE_SKILL_REHBERI_TR.md](./MCP_VE_SKILL_REHBERI_TR.md)

This guide explains the MCP integrations and Codex skills currently available in this repository, with practical examples.

## 1) Available MCP Integrations

### OpenAI Developer Docs MCP
Use this when you need current, official OpenAI documentation and API contract details.

- Main tools:
  - `search_openai_docs`: Search OpenAI docs pages.
  - `list_openai_docs`: Browse docs index pages.
  - `fetch_openai_doc`: Pull full markdown for a docs page/section.
  - `list_api_endpoints`: List available OpenAI API endpoint URLs.
  - `get_openapi_spec`: Get endpoint OpenAPI schema and code samples.
- Typical use cases:
  - Find the latest Responses API patterns.
  - Compare model/tooling capabilities.
  - Pull exact request/response fields for implementation.
- Example prompts:
  - "Use OpenAI docs MCP to find the latest Responses API streaming example in Node.js."
  - "Fetch the OpenAPI spec for the Responses endpoint and summarize required fields."

### R2 Local MCP
Use this when working with Cloudflare R2 storage operations in local workflow.

- Main tools:
  - `list_buckets`: List buckets.
  - `list_objects`: List objects in a bucket (optional prefix filter).
- Typical use cases:
  - Verify that upload targets exist.
  - Check object structure before cleanup or migrations.
- Example prompts:
  - "List all R2 buckets and then list objects under prefix `videos/` in `media-prod`."
  - "Check whether `mobile/assets/` keys exist in the configured bucket."

## 2) Available Skills

Skills are reusable workflows. Trigger them by naming the skill directly (for example, `use gh-fix-ci`) or by asking a matching task.

| Skill | What It Is For | Example Request |
|---|---|---|
| `backend-guardrails` | Backend refactors/API changes with route-layer boundaries and mandatory backend test discipline. | "Use backend-guardrails and refactor `backend/routes/feed.js` without breaking layer boundaries." |
| `docs-navigator` | Targeted retrieval from `docs/` for large documentation analysis tasks. | "Use docs-navigator to find all docs related to notification delivery architecture." |
| `env-sync-release` | Environment variable changes, release prep, and env propagation checks across packages. | "Use env-sync-release to add a new env var and sync to backend/mobile/r2-mcp." |
| `gh-address-comments` | Resolve review comments on the open GitHub PR with `gh` workflow. | "Use gh-address-comments to address unresolved PR review comments." |
| `gh-fix-ci` | Investigate failing GitHub Actions checks, summarize failures, then implement fixes after approval. | "Use gh-fix-ci to analyze why backend-ci failed on this branch." |
| `mobile-feed-perf` | Feed scroll/render/prefetch/video performance improvements in `mobile/`. | "Use mobile-feed-perf to reduce dropped frames in the home feed." |
| `openai-docs` | Up-to-date, official guidance for OpenAI API/ChatGPT integrations with citations. | "Use openai-docs to choose the right model and show migration notes for Responses API." |
| `r2-mcp-ops` | Safe Cloudflare R2 MCP operations with env-based preflight checks. | "Use r2-mcp-ops to validate bucket setup before bulk object move." |
| `security-best-practices` | Security-focused best-practice review for JS/TS, Python, or Go code. | "Run security-best-practices on backend auth middleware and suggest hardening." |
| `security-threat-model` | Repository-grounded threat modeling with abuse paths and mitigations. | "Use security-threat-model for `backend/routes` and output a concise threat model." |
| `supabase-rpc-contract` | Verify mobile-to-backend RPC compatibility when RPC usage changes. | "Use supabase-rpc-contract to validate RPC names/params used by mobile feed datasource." |
| `skill-creator` | Create or improve a Codex skill package (`SKILL.md`, structure, guidance). | "Use skill-creator to draft a new skill for Expo release checklist automation." |
| `skill-installer` | Install skills from curated list or GitHub into Codex skills directory. | "Use skill-installer to list installable skills and install one for API documentation QA." |
| `slides` | Build/edit/export presentation decks via artifact tooling. | "Use slides to generate a product architecture deck from docs/ content." |
| `spreadsheets` | Build/edit/recalculate/export spreadsheets via artifact tooling. | "Use spreadsheets to create a test matrix for backend and mobile regression coverage." |

## 3) Recommended Quick Flows

1. CI is failing:
   - Start with `gh-fix-ci`.
   - After fix, run backend/mobile verification commands.
2. You changed RPC endpoints:
   - Use `supabase-rpc-contract`.
   - Then run mobile type-check and backend tests.
3. You need OpenAI integration updates:
   - Use `openai-docs`.
   - Pull exact docs section with `fetch_openai_doc`.
4. You are preparing release env updates:
   - Use `env-sync-release`.
   - Re-sync `.env` and run smoke checks.

## 4) Notes

- Prefer skill workflows when task matches exactly; they encode project-specific guardrails.
- For sensitive operations (env, secrets, storage), always run preflight checks first.
- For backend changes, `npm --prefix backend run test:all` should be the default verification step.
