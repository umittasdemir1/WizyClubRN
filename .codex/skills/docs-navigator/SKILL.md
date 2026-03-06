---
name: docs-navigator
description: Use for large-scope analysis tasks requiring targeted retrieval from docs/. Prevents loading unnecessary files and keeps context focused.
---

# Docs Navigator

## When to use
- Architecture audits
- Feature planning across many documents
- Onboarding summaries grounded in repo docs

## Workflow
1. Start from `docs/DOCUMENTATION_INDEX.md`.
2. Select only relevant doc paths for the task.
3. Summarize findings with concrete file references.

## Commands
- `bash scripts/find-docs.sh "<keyword>"`

## Success criteria
- Minimal docs loaded for the objective.
- Summary includes traceable references.
