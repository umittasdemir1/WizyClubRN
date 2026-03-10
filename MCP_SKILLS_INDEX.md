# MCP & Skills Root Index

Last updated: 2026-03-10

This is the root-level entry point for MCP and skill documentation in this repository.

## Guides

- Turkce: [MCP_VE_SKILL_REHBERI_TR.md](./MCP_VE_SKILL_REHBERI_TR.md)
- English: [MCP_AND_SKILLS_GUIDE_EN.md](./MCP_AND_SKILLS_GUIDE_EN.md)
- Cross-platform setup: [CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md](./CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md)

## What You Can Find

- All 9 MCP integrations (3 always-on + 6 optional) and their tools.
- All 16 skills with trigger conditions, dependencies, and example prompts.
- Practical quick flows for CI, RPC, env sync, security, and performance tasks.
- Doppler env sync and Telegram progress reporting workflows.

## Quick Start

1. Read your preferred language guide above.
2. Run `node scripts/bootstrap-codex-mcp.js` to set up MCPs.
3. Copy an example request and adapt it to your task.

## Source of Truth

- MCP definitions: `.codex/mcp-servers.json`
- Skill definitions: `.codex/skills/<skill-name>/SKILL.md`
- Env template: `.env.example`
