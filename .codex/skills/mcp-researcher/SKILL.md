---
name: mcp-researcher
description: Use when the user asks to discover, evaluate, propose, register, or finalize new Codex CLI MCP servers for this repo, especially from `https://github.com/modelcontextprotocol/servers` and `https://github.com/punkpeye/awesome-mcp-servers`; also use when a task would benefit from an MCP that is not already configured locally.
---

# MCP Researcher

## When to use
- The user asks to find or install a new MCP for Codex CLI.
- The current task would benefit from an MCP that is not already configured in `.codex/mcp-servers.json`.
- You need to research official/community MCP servers and wire one into this repo's managed Codex bootstrap flow.

## Approval rules
- Prefer `modelcontextprotocol/servers` before `awesome-mcp-servers` when both cover the need.
- Always present a proposal before editing files or installing anything.
- The proposal must explain:
  - what the MCP unlocks
  - why it fits this repo/workflow
  - whether it is official or community
  - what files will change
  - what secrets, login, API key, or OAuth step is required
- Do not edit `.codex/mcp-servers.json`, `.env`, or `.env.example` until the user explicitly approves.

## Workflow
1. Check existing MCPs in `.codex/mcp-servers.json` first so you do not duplicate an installed capability.
2. Search the two source catalogs with the bundled script at `.codex/skills/mcp-researcher/scripts/mcp_catalog_tool.js`.
3. Inspect the best candidate to extract command hints, auth hints, README summary, and likely env keys.
4. Present a short approval request in plain language:
   - "`<name>` MCP kurarsak şunları yapabilirim..."
   - "`source`, `command/runtime`, `auth`, `env` ve `dosya değişiklikleri`..."
5. After approval, register the MCP in `.codex/mcp-servers.json`.
6. If env keys are needed, upsert placeholders into `.env.example` and blank entries into root `.env` when the file already exists.
7. Tell the user exactly what they must do next:
   - fill root `.env`
   - complete OAuth/login
   - restart Codex if required
8. Wait for the user's confirmation such as `Tamam yaptım`.
9. After confirmation, run:
   - `node scripts/setup-codex-mcp.js`
   - `node scripts/doctor-codex-mcp.js`
   - `node scripts/bootstrap-codex-mcp.js --check-only`
   - `codex mcp list` when available
10. Report final status, active/skipped MCPs, and any remaining manual step.

Use `optional: true` for new MCP entries unless there is a very strong reason to make a missing secret fatal. That keeps bootstrap healthy while credentials are still pending.

If network or sandbox restrictions block research or installation commands, retry with escalated permissions before asking the user to do it themselves.

## Path notes
- Commands using `.codex/skills/mcp-researcher/scripts/...` are skill-local helpers and should be run from the repo root.
- Commands using `scripts/...` refer to repo-root Codex bootstrap helpers.

## Commands
- `node .codex/skills/mcp-researcher/scripts/mcp_catalog_tool.js search <keywords...>`
- `node .codex/skills/mcp-researcher/scripts/mcp_catalog_tool.js inspect <github-url-or-owner/repo>`
- `node .codex/skills/mcp-researcher/scripts/mcp_catalog_tool.js register --name <server-name> --command <command> --arg <arg> --description <text> --optional --dry-run`
- `node scripts/setup-codex-mcp.js`
- `node scripts/doctor-codex-mcp.js`
- `node scripts/bootstrap-codex-mcp.js --check-only`

## Success criteria
- The proposed MCP clearly improves a real repo workflow and does not duplicate an existing MCP.
- The user explicitly approves before any config/env edit.
- `.codex/mcp-servers.json` stays compatible with the managed Codex bootstrap scripts.
- Required env keys are centralized in root `.env` and documented in `.env.example`.
- After the user finishes secrets/login, the managed MCP block renders cleanly and validation passes.
