# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

### Most Common Commands

```bash
# Environment Setup
bash scripts/sync-env.sh all                    # Generate all package .env files
node scripts/update-env-from-doppler.js         # Pull from Doppler and sync

# Backend Development
npm --prefix backend run start                  # Start backend server
npm --prefix backend run test:all               # Run all tests (REQUIRED before commit)
npm --prefix backend run verify:mobile-rpcs     # Verify RPC contract with mobile

# Mobile Development
npm --prefix mobile run start                   # Start Expo dev server
npx --prefix mobile tsc --noEmit                # Type check (strict mode)

# StockPilot
cd stockpilot/frontend && npm run dev           # Frontend (port 5173)
cd stockpilot/backend && npm run dev            # Backend (port 8787)

# MCP & Skills
node scripts/bootstrap-codex-mcp.js             # Setup all MCP servers
node scripts/doctor-codex-mcp.js                # Diagnose MCP issues
```

### Key Workflows

**Backend Changes:**
1. Make changes in routes/usecases/repositories/services
2. Run `npm --prefix backend run test:all`
3. If RPC changes, run `npm --prefix backend run verify:mobile-rpcs`
4. Commit with conventional commit message

**Environment Updates:**
1. Update Doppler secrets (if multi-machine)
2. Run `node scripts/update-env-from-doppler.js`
3. Or manually edit root `.env` and run `bash scripts/sync-env.sh all`

**StockPilot Performance Work:**
1. Review `stockpilotworker.md` for performance patterns
2. Avoid O(n²) loops - pre-compute lookups with Map/Set
3. Isolate high-frequency state updates in leaf components
4. Debounce persistence operations (500ms)

### Available Skills (16)

Skills automate common workflows. See Skills section for details.

- **backend-guardrails** - Backend architecture enforcement
- **doppler-env-sync** - Doppler → root .env → package .env
- **env-sync-release** - Environment variable sync for releases
- **supabase-rpc-contract** - Mobile-backend RPC verification
- **mobile-feed-perf** - Mobile performance monitoring
- **r2-mcp-ops** - Cloudflare R2 operations
- **docs-navigator** - Documentation search
- **gh-fix-ci** - GitHub Actions CI debugging
- **gh-address-comments** - PR comment resolution
- **security-best-practices** - Security review & fixes
- **telegram-progress-reporter** - Progress updates via Telegram
- **codex-mcp-cross-env** - MCP setup across environments
- **openai-docs** - OpenAI API documentation
- **mcp-researcher** - MCP server discovery
- **skills-researcher** - Skill repository search
- **security-threat-model** - Threat modeling

### Available MCP Servers (11)

MCP servers provide specialized capabilities:

- **filesystem** - Workspace file operations
- **r2-local** - Cloudflare R2 storage (requires env vars)
- **bookmarks-local** - Supabase bookmarks (optional)
- **github** - GitHub operations (optional, requires token)
- **supabase-mcp-server** - Supabase database (optional)
- **postgres** - Direct PostgreSQL (optional)
- **doppler** - Secret management (optional)
- **netlify** - Netlify deployments (optional)
- **render** - Render deployments (optional)
- **openaiDeveloperDocs** - OpenAI docs

## Repository Overview

WizyClub is a multi-package monorepo for a social media platform with video content capabilities. The repository contains:

- **backend/**: Node.js API server (Express + Supabase + Cloudflare R2)
- **mobile/**: Expo React Native mobile application
- **stockpilot/**: Standalone stock analysis workspace (Vite + React frontend, Express backend)
- **bookmarks/**: Bookmark management system with Supabase integration
- **bookmarks-mcp/**: MCP server for bookmark operations
- **r2-mcp/**: MCP server for Cloudflare R2 storage operations

## Environment & Configuration

### Environment File Management

The root `.env` file is the **source of truth** for all environment variables. Package-specific `.env` files are auto-generated.

**Sync environment files:**
```bash
# Generate all package .env files from root .env
bash scripts/sync-env.sh all

# Generate specific package .env
bash scripts/sync-env.sh backend
bash scripts/sync-env.sh mobile
bash scripts/sync-env.sh r2-mcp
```

**Update from Doppler (multi-machine sync):**
```bash
node scripts/update-env-from-doppler.js
```

If the user mentions creating, rotating, or updating a key/token/API secret in Doppler during chat, ask one short confirmation question and, on confirmation, run `node scripts/update-env-from-doppler.js`.

### Initial Setup

```bash
# 1. Copy example and configure
cp .env.example .env

# 2. Generate package-specific env files
bash scripts/sync-env.sh all

# 3. Install dependencies
npm --prefix backend ci
npm --prefix mobile install
```

## Backend Development

### Architecture

Backend follows a layered architecture:
- **routes/**: Thin route handlers (NO direct `.from()` or `.rpc()` calls)
- **usecases/**: Business logic orchestration
- **repositories/**: Data access layer (Supabase queries)
- **services/**: External integrations (R2, Google Cloud, etc.)
- **dto/**: Data transfer objects
- **middleware/**: Express middleware
- **bootstrap/**: Server context initialization
- **server.js**: Entry point (keep minimal)

**Critical Architecture Rules:**
- Routes MUST stay thin - orchestration goes in usecases
- Never put direct database calls in routes
- Preserve CommonJS style (`require`/`module.exports`)
- Use 4-space indentation and semicolons
- Keep `server.js` and `bootstrap/createServerContext.js` minimal

### Commands

```bash
# Start server
npm --prefix backend run start

# Run all tests (REQUIRED before committing backend changes)
npm --prefix backend run test:all

# Run Node test runner only
npm --prefix backend run test

# Run Jest tests only
npm --prefix backend run test:jest

# Smoke tests (requires secrets)
npm --prefix backend run smoke

# Verify RPC contract compatibility with mobile
npm --prefix backend run verify:mobile-rpcs

# CLI operations
node backend/scripts/cli.js list

# Send notifications
npm --prefix backend run notify
```

### Testing Requirements

**ALWAYS run `npm --prefix backend run test:all` after backend code changes.**

Tests are in:
- `backend/tests/` (Node `--test` runner)
- `backend/tests-jest/` (Jest)

### Backend Change Guidelines

**Ask First:**
- DB schema/migration changes in `migrations/`
- RPC contract changes affecting mobile clients
- Environment variable contract changes (`.env.example`, required secrets)

**Never:**
- Hardcode credentials, tokens, or keys
- Bypass ownership/auth middleware checks
- Weaken architecture guardrails in tests

## Mobile Development

### Architecture

Mobile app uses Expo Router (file-based routing) with clean architecture layers:

- **app/**: Expo Router routes (file-based routing)
  - **app/(tabs)/**: Main tab navigation screens
  - **app/paywall/**: Subscription/paywall screens
  - **app/story/**: Story-related screens
- **src/core/**: Core utilities, constants, types
- **src/domain/**: Domain entities and business logic
- **src/data/**: Data layer (repositories, API clients)
- **src/presentation/**: UI components, hooks, view models
- **assets/**: Images, fonts, animations

**Path Aliases:**
- `@/`: Root src directory
- `@core/`: src/core
- `@domain/`: src/domain
- `@data/`: src/data
- `@presentation/`: src/presentation

### Commands

```bash
# Start Expo dev server
npm --prefix mobile run start

# Platform-specific runs
npm --prefix mobile run android
npm --prefix mobile run ios
npm --prefix mobile run web

# Type check (strict mode)
npx --prefix mobile tsc --noEmit

# Check dependencies
npm --prefix mobile run deps:check

# Performance baseline (Android)
npm --prefix mobile run perf:baseline:android
```

### Mobile Code Style

- TypeScript with strict mode enabled
- Use React hooks (`useXxx` naming)
- Components in PascalCase
- Prefer functional components
- Use path aliases for imports

### Postinstall Patches

The mobile package automatically applies patches during `npm install`:
- react-native-video
- react-native-compressor
- tslib
- expo-ngrok
- pell-rich-editor

## StockPilot

Standalone stock analysis workspace with pivot table/Excel-like functionality.

### Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript
- **Input**: Excel/CSV file upload
- **Output**: KPI dashboard, pivot tables, transfer recommendations

### Commands

```bash
# Frontend (runs on http://localhost:5173)
cd stockpilot/frontend
npm install
npm run dev

# Backend (runs on http://localhost:8787)
cd stockpilot/backend
npm install
npm run dev

# Build
npm run build

# Test
npm run test
```

Frontend expects backend on `http://localhost:8787` (configured via Vite proxy).

### Performance Optimization

StockPilot implements Excel/PowerBI-level responsiveness with critical optimizations:

**Key Performance Patterns (see `stockpilotworker.md` for details):**
1. **Pre-compute lookups** - Use `Map`/`Set` instead of `.find()` in hot loops
2. **Algorithm complexity** - O(n²) loops are unacceptable; pre-compute filter sets
3. **Component isolation** - High-frequency state updates must be in leaf components
4. **Debounce persistence** - localStorage writes debounced to 500ms
5. **Layout fingerprinting** - Only measure DOM when layout-affecting properties change
6. **Cache invalidation** - Pivot result cache must include ALL inputs (including `columnOverrides`)
7. **Pending state** - User input editors use local pending state, commit on explicit Save

**Before making StockPilot changes, review `stockpilotworker.md` for architecture patterns.**

## MCP Servers

This repository has pre-configured MCP (Model Context Protocol) servers for various operations. Configuration is in `.codex/mcp-servers.json`.

### Core MCP Servers (Always Available)

**filesystem**
- Workspace-scoped filesystem operations rooted at the repo
- Command: `npx -y @modelcontextprotocol/server-filesystem {workspace}`
- No additional setup required

**openaiDeveloperDocs**
- Official OpenAI developer documentation via MCP
- URL-based MCP server
- Useful for AI/ML integration questions

### Repository-Specific MCP Servers

**r2-local** (Cloudflare R2 Storage)
- Custom R2 MCP server for object storage operations
- Script: `r2-mcp/custom-r2-server.js`
- Required env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- Use for: Listing buckets, uploading/downloading objects, managing R2 storage
- Wrapper: `scripts/mcp/r2-wrapper.js` (auto-loads root .env)

**bookmarks-local** (Supabase Bookmarks)
- Supabase-backed bookmarks MCP for search and lookup
- Script: `bookmarks-mcp/server.js`
- Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional server (enabled when env vars exist)
- Use for: Bookmark management, search operations

### Optional MCP Servers (Require Tokens)

**github**
- GitHub operations (issues, PRs, repos, workflows)
- Wrapper: `scripts/mcp/github-wrapper.js`
- Required env: `GITHUB_PERSONAL_ACCESS_TOKEN`
- Use for: Creating/managing PRs, issues, checking CI status

**supabase-mcp-server**
- Official Supabase MCP for database operations
- Wrapper: `scripts/mcp/supabase-wrapper.js`
- Required env: `SUPABASE_MCP_ACCESS_TOKEN`
- Use for: Database queries, schema inspection

**postgres**
- Direct PostgreSQL database access
- Command: `npx -y @modelcontextprotocol/server-postgres {env:POSTGRES_MCP_URL}`
- Required env: `POSTGRES_MCP_URL`

**doppler**
- Secret management via Doppler
- Wrapper: `scripts/mcp/doppler-wrapper.js`
- Required env: `DOPPLER_TOKEN`
- Source: https://github.com/DopplerHQ/mcp-server
- Use for: Reading/updating secrets in Doppler

**netlify**
- Netlify deployment management
- Command: `npx -y @netlify/mcp`
- Required env: `NETLIFY_MCP_ENABLED`, `NETLIFY_PERSONAL_ACCESS_TOKEN`

**render**
- Render deployment management
- URL: https://mcp.render.com/mcp
- Required env: `RENDER_API_KEY`

### MCP Server Setup

```bash
# Bootstrap all MCP servers
node scripts/bootstrap-codex-mcp.js

# Verify MCP setup and diagnose issues
node scripts/doctor-codex-mcp.js

# Setup shell integration
node scripts/install-codex-shell-integration.js
```

All MCP wrapper scripts in `scripts/mcp/` automatically load environment variables from root `.env` using `load-root-env.js`.

## Skills

Skills are specialized workflows in `.codex/skills/` for common repository tasks. Each skill enforces best practices and automates repetitive workflows.

### Backend & Testing Skills

**backend-guardrails**
- **When to use**: Route changes, use case/repository/service refactors, any backend API behavior change
- **What it does**: Validates architecture boundaries (no direct DB calls in routes), runs regression suite
- **Commands**: `bash scripts/run-backend-checks.sh`
- **Success criteria**: `npm --prefix backend run test:all` passes, architecture guardrails active

**supabase-rpc-contract**
- **When to use**: RPC name/signature changes, mobile data-source query refactors, backend RPC endpoint changes
- **What it does**: Verifies mobile-to-backend RPC contract compatibility before merge
- **Commands**: `npm --prefix backend run verify:mobile-rpcs`
- **Success criteria**: RPC verification passes, no missing/renamed RPC references

### Environment & Configuration Skills

**doppler-env-sync**
- **When to use**: Switching machines, root .env drifted, user added/rotated/edited secrets in Doppler
- **Confirmation rule**: Ask only one short question: "Doppler'a yazdın mı? Evetse şimdi sync çalıştırayım."
- **What it does**: Pulls root .env from Doppler and auto-regenerates backend/mobile/r2-mcp .env files
- **Commands**:
  - `node scripts/update-env-from-doppler.js --project <project> --config <config>`
  - `node scripts/update-env-from-doppler.js --no-sync` (skip package env regeneration)
- **Success criteria**: Root .env refreshed, all package .env files regenerated

**env-sync-release**
- **When to use**: New env variable added, value/naming changed, pre-release consistency checks
- **What it does**: Syncs root .env to app packages, validates backend env parse
- **Commands**: `bash scripts/sync-and-check.sh`
- **Success criteria**: `scripts/sync-env.sh all` completes, backend env checker passes

### Mobile Performance Skills

**mobile-feed-perf**
- **When to use**: Feed scrolling/rendering/prefetching changes, FlashList/FlatList virtualization, cache/concurrency tuning
- **What it does**: Runs type checks and perf baseline, applies optimization, re-runs baseline for comparison
- **Commands**: `bash scripts/run-mobile-perf-checks.sh`
- **Success criteria**: `npx --prefix mobile tsc --noEmit` passes, no perf regression

### Documentation & Research Skills

**docs-navigator**
- **When to use**: Architecture audits, feature planning across many documents, onboarding summaries
- **What it does**: Starts from `docs/DOCUMENTATION_INDEX.md`, selects only relevant doc paths
- **Commands**: `bash scripts/find-docs.sh "<keyword>"`
- **Success criteria**: Minimal docs loaded, summary includes traceable references

**openai-docs**
- **When to use**: OpenAI API integration questions, AI/ML feature development
- **What it does**: Queries official OpenAI developer documentation
- Uses the openaiDeveloperDocs MCP server

### Storage & Infrastructure Skills

**r2-mcp-ops**
- **When to use**: R2 bucket/object listing, MCP server maintenance, credential/config hardening
- **What it does**: Runs credential preflight checks, starts MCP server in non-destructive mode, asks before delete/purge
- **Commands**: `bash scripts/preflight.sh`
- **Success criteria**: Required env vars present, server syntax and startup checks pass

### Git & CI/CD Skills

**gh-fix-ci**
- **When to use**: Debugging/fixing failing GitHub PR checks in GitHub Actions
- **What it does**: Uses `gh` to inspect checks/logs, summarizes failure context, drafts fix plan
- **Prereq**: `gh auth login` with repo + workflow scopes
- **Commands**:
  - `python .codex/skills/gh-fix-ci/scripts/inspect_pr_checks.py --repo "." --pr "<number>"`
  - Add `--json` for machine-friendly output
- **Workflow**: Verify gh auth → Resolve PR → Inspect failing checks → Summarize → Create plan → Implement after approval
- **Note**: External providers (Buildkite) are out of scope, only report details URL

**gh-address-comments**
- **When to use**: Addressing review/issue comments on open GitHub PR for current branch
- **Prereq**: `gh auth login` with workflow/repo scopes
- **What it does**: Fetches PR comments/review threads, numbers them with summaries, applies fixes for selected comments
- **Commands**: `python scripts/fetch_comments.py`
- **Workflow**: Verify gh auth → Fetch comments → Number and summarize → Ask user which to address → Apply fixes

**gh-address-comments**
- **When to use**: Addressing PR review comments
- **What it does**: Fetches PR review comments, organizes by file/line, helps implement fixes systematically

### Security Skills

**security-best-practices**
- **When to use**: User explicitly requests security review, secure-by-default coding help, vulnerability report
- **Supported languages**: Python, JavaScript/TypeScript, Go
- **Modes**:
  1. Write secure-by-default code from this point forward
  2. Passively detect critical vulnerabilities while working
  3. Generate full security report on request
- **Report format**: Markdown file with severity sections, numeric IDs, line number references
- **Workflow**: Identify language/framework → Load matching guidance from `references/` → Apply security patterns
- **Important**: Only triggers on explicit security request, not general code review

**security-threat-model**
- **When to use**: Threat modeling exercises, security architecture planning
- **What it does**: Helps identify security threats and mitigation strategies

### Progress Reporting Skills

**telegram-progress-reporter**
- **When to use**: User wants session progress, code-change summaries, test outcomes, blocker updates sent to Telegram
- **Setup**: Set `CODEX_TELEGRAM_ENABLED=1`, `CODEX_TELEGRAM_BOT_TOKEN`, `CODEX_TELEGRAM_CHAT_ID` in root .env
- **Launch**: `bash scripts/codex-with-telegram.sh` (or `.cmd` on Windows)
- **Message rules**:
  - Lead with user-visible outcome
  - Write summaries in Turkish
  - Use Turkey time for timestamps
  - Never send .env contents, secrets, tokens, full diffs
  - Keep messages concise and outcome-first
- **Checkpoint command**:
  ```bash
  node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js checkpoint \
    --summary "<short outcome>" \
    --scope "<backend|mobile|docs|repo>" \
    --status "<ok|fail|info>" \
    --command "<cmd>" \
    --file <path>
  ```
- **Success criteria**: Session start/end notifications work, disabled config never blocks usage

### Research Skills

**mcp-researcher**
- **When to use**: Researching available MCP servers for new integrations
- **What it does**: Queries MCP catalog, suggests relevant servers
- **Script**: `.codex/skills/mcp-researcher/scripts/mcp_catalog_tool.js`

**skills-researcher**
- **When to use**: Finding existing skills or patterns from skill repositories
- **What it does**: Searches awesome skill repositories
- **Script**: `.codex/skills/skills-researcher/scripts/awesome_skill_tool.js`

### MCP & Infrastructure Skills

**codex-mcp-cross-env**
- **When to use**: Moving between environments (Firebase Studio ↔ Windows VSCode), repairing MCP registrations, validating MCP setup
- **What it does**: Bootstraps, repairs, validates Codex MCP across Windows/Linux environments
- **Commands**:
  - `node scripts/bootstrap-codex-mcp.js` - Bootstrap all MCP servers
  - `node scripts/bootstrap-codex-mcp.js --check-only` - Inspection only
  - `node scripts/bootstrap-codex-mcp.js --force-install` - Force reinstall
  - `node scripts/bootstrap-codex-mcp.js --full-env-sync` - With env sync
  - `node scripts/install-codex-shell-integration.js` - One-time shell integration setup
  - `node scripts/doctor-codex-mcp.js` - Verify MCP health
- **Workflow**:
  1. Run bootstrap script
  2. Create root .env from .env.example if missing
  3. Install shell integration once per machine
  4. Use wrapper scripts for launching Codex
- **Success criteria**:
  - `node scripts/doctor-codex-mcp.js` passes
  - `codex mcp list` shows openaiDeveloperDocs, filesystem, r2-local, netlify
  - Works without copying ~/.codex/config.toml between machines

## Using Skills & MCP Servers

### Quick Skill Usage Examples

```bash
# Backend changes - enforce architecture and run tests
# Uses backend-guardrails skill
npm --prefix backend run test:all

# Sync environment after Doppler update
# Uses doppler-env-sync skill
node scripts/update-env-from-doppler.js --project wizyclub --config dev

# Verify mobile-backend RPC contract
# Uses supabase-rpc-contract skill
npm --prefix backend run verify:mobile-rpcs

# Navigate documentation
# Uses docs-navigator skill
bash scripts/find-docs.sh "authentication"

# Fix failing CI checks
# Uses gh-fix-ci skill
python .codex/skills/gh-fix-ci/scripts/inspect_pr_checks.py --repo "." --pr "123"

# Send Telegram progress update
# Uses telegram-progress-reporter skill
node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js checkpoint \
  --summary "Backend testleri başarılı" \
  --scope "backend" \
  --status "ok"
```

### MCP Server Management

```bash
# Setup all MCP servers
node scripts/bootstrap-codex-mcp.js

# Diagnose MCP issues
node scripts/doctor-codex-mcp.js

# Setup shell integration
node scripts/install-codex-shell-integration.js
```

### Launch Options

**Basic Codex Launch:**
```bash
bash scripts/codex-launch.sh        # Linux/macOS
scripts\codex-launch.cmd            # Windows
```

**With MCP Servers:**
```bash
bash scripts/codex-with-mcp.sh      # Linux/macOS
scripts\codex-with-mcp.cmd          # Windows
```

**With Telegram Progress Reporting:**
```bash
bash scripts/codex-with-telegram.sh # Linux/macOS
scripts\codex-with-telegram.cmd     # Windows
```

### Skill Decision Guide

**Use `backend-guardrails` when:**
- Changing routes, usecases, repositories, or services
- Modifying any backend API behavior
- Before committing backend changes

**Use `doppler-env-sync` when:**
- User says "Doppler'a yazdım" or mentions updating secrets
- Switching between development machines
- Root .env needs refreshing from source of truth

**Use `supabase-rpc-contract` when:**
- Changing RPC function names or signatures
- Refactoring mobile data-source queries
- Modifying backend RPC endpoints used by mobile

**Use `mobile-feed-perf` when:**
- Optimizing feed scrolling or rendering
- Changing FlashList/FlatList virtualization
- Tuning prefetch/cache/concurrency

**Use `gh-fix-ci` when:**
- PR checks are failing in GitHub Actions
- Need to debug CI/CD pipeline issues
- Want to understand test failures in CI

**Use `telegram-progress-reporter` when:**
- User wants progress updates during long tasks
- Reporting test outcomes or build results
- Communicating blockers or milestones

## Git & Commit Guidelines

**Commit Message Style:**
Use Conventional Commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `perf:` - Performance improvements
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `chore:` - Maintenance tasks

**Recent commit history examples:**
- `perf: fix O(n²) filter loop, cache bug, and unnecessary auto-fit`
- `perf: eliminate O(n_cols) field lookups from pivot hot loop`
- `docs: add stockpilotworker.md with performance optimization documentation`

**Keep commits focused by package** (`backend`, `mobile`, `stockpilot`, etc.)

## Agent Hierarchy

- **Root**: `AGENTS.md` (repo-wide defaults)
- **Package-specific** (override root when working inside):
  - `backend/AGENTS.md`
  - `mobile/AGENTS.md` (if exists)
  - `r2-mcp/AGENTS.md`
- **Sprint overrides**: `AGENTS.override.md` (short-lived)

## Security Guidelines

- **Never commit** `.env`, credential JSON files, or raw keys
- Credentials in `r2-mcp/` are sensitive local tooling
- Auth middleware checks must never be bypassed
- Validate user input at system boundaries
- Use Doppler as shared secrets source of truth

## Telegram Progress Reporting

If sending Telegram progress/checkpoint messages for this repo:
- Keep message body in Turkish
- Use Turkey time for explicit timestamps

## Common Patterns

### Working with Tests

1. Backend changes → Run `npm --prefix backend run test:all`
2. Keep test filenames as `*.test.js` or `*.test.cjs`
3. New features should include regression tests

### Working with Database

- Schema changes go in `backend/migrations/`
- Use Supabase client from repositories, not routes
- RPC calls in usecases/repositories only

### Working with R2 Storage

- Integration code in `backend/services/`
- R2 credentials via environment variables
- Use MCP server for manual operations

## Documentation

- `docs/architecture/`: Architecture decisions and diagrams
- `docs/archive/`: Historical documentation
- Planning documents in root (e.g., `STOCKPILOT_IMPLEMENTATION_PLAN.md`)
- Performance docs (e.g., `stockpilotworker.md`)

## TypeScript Configuration

- **Backend**: CommonJS, uses `jsconfig.json`
- **Mobile**: Strict TypeScript via `tsconfig.json`
- **StockPilot**: TypeScript for both frontend and backend

## Key File Locations

- Root env: `.env` (source of truth)
- Backend env: `backend/.env` (auto-generated)
- Mobile env: `mobile/.env` (auto-generated)
- Backend entry: `backend/server.js`
- Mobile entry: `mobile/app/_layout.tsx`
- StockPilot frontend: `stockpilot/frontend/src/`
- StockPilot backend: `stockpilot/backend/src/`
- MCP configuration: `.codex/mcp-servers.json`
- Skills directory: `.codex/skills/`

## Troubleshooting

### Environment Issues

**Problem**: Package .env files are missing or outdated
```bash
# Solution: Regenerate from root .env
bash scripts/sync-env.sh all
```

**Problem**: Root .env is outdated (multi-machine development)
```bash
# Solution: Pull from Doppler
node scripts/update-env-from-doppler.js --project wizyclub --config dev
```

**Problem**: Missing environment variables
```bash
# Solution: Check .env.example for required vars
cp .env.example .env
# Edit .env with actual values, then sync
bash scripts/sync-env.sh all
```

### Backend Issues

**Problem**: Tests failing after changes
```bash
# Run full test suite to identify failures
npm --prefix backend run test:all
```

**Problem**: Mobile app can't connect to backend RPC
```bash
# Verify RPC contract compatibility
npm --prefix backend run verify:mobile-rpcs
```

**Problem**: Architecture violations (direct DB calls in routes)
- Review `backend/AGENTS.md` for architecture rules
- Move database logic to repositories
- Move orchestration to usecases
- Keep routes thin

### Mobile Issues

**Problem**: TypeScript errors
```bash
# Run type check
npx --prefix mobile tsc --noEmit
```

**Problem**: Build fails after npm install
```bash
# Postinstall patches may have failed
# Manually run patches
node mobile/scripts/patch-react-native-video.js
node mobile/scripts/patch-react-native-compressor.js
node mobile/scripts/patch-tslib.js
node mobile/scripts/patch-expo-ngrok.js
node mobile/scripts/patch-pell-rich-editor.js
```

### MCP Server Issues

**Problem**: MCP servers not showing up
```bash
# Bootstrap MCP servers
node scripts/bootstrap-codex-mcp.js

# Diagnose issues
node scripts/doctor-codex-mcp.js

# Verify Codex can see them
codex mcp list
```

**Problem**: r2-local MCP failing
```bash
# Check required env vars exist in root .env
# R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY

# Regenerate r2-mcp/.env
bash scripts/sync-env.sh r2-mcp
```

**Problem**: MCP servers work on one machine but not another
```bash
# Bootstrap on new machine
node scripts/bootstrap-codex-mcp.js

# Install shell integration (once per machine)
node scripts/install-codex-shell-integration.js

# Don't copy ~/.codex/config.toml between machines
```

### StockPilot Performance Issues

**Problem**: Table creation is slow (10+ seconds)
- Review `stockpilotworker.md` for optimization patterns
- Check for O(n²) loops using .find() in iterations
- Pre-compute lookups with Map/Set instead of repeated .find()
- Verify pivot cache includes all inputs (columnOverrides)

**Problem**: Filter selection is laggy
- Ensure filter sets are pre-computed before loop
- Avoid calling getRowFieldFilterOptions inside filter loop
- Use Set for O(1) lookups instead of array.includes()

**Problem**: UI freezes during typing in field editor
- Check if pending state is used (not live updates)
- Verify high-frequency state updates are isolated in leaf components
- Ensure localStorage writes are debounced

### Git & CI Issues

**Problem**: GitHub Actions failing
```bash
# Use gh-fix-ci skill to diagnose
python .codex/skills/gh-fix-ci/scripts/inspect_pr_checks.py --repo "." --pr "123"
```

**Problem**: Need to address PR review comments
```bash
# Use gh-address-comments skill
python scripts/fetch_comments.py
```

### Doppler Sync Issues

**Problem**: User says they updated Doppler but local .env unchanged
```bash
# Ask confirmation then sync
# Question: "Doppler'a yazdın mı? Evetse şimdi sync çalıştırayım."
node scripts/update-env-from-doppler.js
```

### Windows Bash Environment (Username Special Characters)

**Problem**: Bash tool fails with `ED~1/AppData/Local/Temp/claude-xxxx-cwd: No such file or directory`
- Cause: Windows username contains non-ASCII/special characters (e.g. `Ümit&Eda`), Windows converts the path to 8.3 short form (`ED~1`) which bash cannot resolve
- Fix: Run the included script once to redirect TEMP/TMP to `C:\Temp`:
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/fix-temp-path.ps1"
```
- Then fully restart VS Code
- This fix has already been applied on the current machine

### Common Error Messages

**"Missing required key(s) in root .env"**
- Check .env.example for required variables
- Ensure all required vars are set in root .env
- Run sync-env.sh to propagate to packages

**"Route layer must not include direct .from( or .rpc( calls"**
- Architecture violation detected
- Move Supabase client calls to repositories
- Keep routes thin, only handle HTTP concerns

**"npm --prefix backend run test:all failed"**
- Review test output for specific failures
- Fix issues before committing
- Architecture guardrails must pass

**"RPC contract verification failed"**
- Mobile and backend RPC contracts don't match
- Check for renamed or removed RPC functions
- Update mobile data sources or backend RPC endpoints
