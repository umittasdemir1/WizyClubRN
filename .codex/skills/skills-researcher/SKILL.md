---
name: skills-researcher
description: Use when the user asks to discover, evaluate, import, or vendor third-party agent skills into `.codex/skills/`, especially from `https://github.com/VoltAgent/awesome-agent-skills`; also use when a task would benefit from a specialized external skill that is not already installed locally.
---

# Skills Researcher

## When to use
- The user asks to find, compare, import, or vendor external skills.
- The current task needs a specialized workflow that is not covered by existing local skills.
- You want to use `awesome-agent-skills` as a discovery catalog before installing a skill into this repo.

## Safety rules
- Treat `awesome-agent-skills` as a discovery index, not a trust boundary.
- Prefer official team or vendor skills before community skills when both fit.
- Review `SKILL.md`, bundled scripts, and executable assets before importing.
- Never overwrite an existing local skill without explicit user approval.
- If a few ideas or commands are enough, summarize them instead of vendoring the full skill.

## Workflow
1. Check `.codex/skills/` first to avoid duplicating a local skill.
2. Search the VoltAgent catalog and shortlist the smallest set of relevant candidates.
3. Prefer entries that point directly to a skill folder or `SKILL.md`.
4. If an entry points to a repo root, run discovery first to find importable skill directories.
5. Inspect the candidate before install. Use `install --dry-run` if you only need a file tree and metadata preview.
6. Import into `.codex/skills/<dest-name>` with a provenance-preserving name such as `<owner>-<skill-name>` unless there is a better repo-local convention.
7. Update `.codex/skills/README.md` after adding a local skill.
8. Report what was installed, why it was chosen, and any security or maintenance caveats.

If a command fails because of sandboxing or network restrictions, retry the same command with escalated permissions before asking the user to run it.

## Commands
- `node scripts/awesome_skill_tool.js search <keywords...>`
- `node scripts/awesome_skill_tool.js discover <github-url>`
- `node scripts/awesome_skill_tool.js install <github-url> --dest <local-skill-name> --dry-run`
- `node scripts/awesome_skill_tool.js install <github-url> --dest <local-skill-name>`

## Success criteria
- The selected skill fills a real gap that is not already covered locally.
- Imported files land under `.codex/skills/<dest-name>/` and include `SKILL.md`.
- Existing local skills are not overwritten accidentally.
- `.codex/skills/README.md` remains in sync with the directory contents.
