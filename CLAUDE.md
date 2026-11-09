# 0 to Hero — Repo

Open-source tool to structure your Claude workflow into efficient workspaces with specialized agents.

## Structure
- /core → Architecture, bootstrap prompts, templates, hooks (core/hooks/: SessionStart injector, memory scribe, statusline), ADR archive (core/decisions/)
- /archetypes → Complete examples (developer, creative)
- /catalog → Curated base of skills and tools
- /docs → Development plans and specs — local only, gitignored
- /tools → Reserved for future use

## Routing
| Intent | Resources |
|--------|-----------|
| Modify architecture or bootstrap | core/ARCHITECTURE.md → core/bootstrap/bootstrap-prompt.md |
| Why was X decided this way | core/decisions/adr-archive.md |
| Work on an archetype | archetypes/INDEX.md → archetypes/[name]/ |
| Update the catalog | catalog/skills-database.md |
| Plan / execute a step | docs/plans/ (local only) |

## Reading order
1. This CLAUDE.md
2. The target resource based on routing
3. core/ARCHITECTURE.md or core/templates/ if a format/architecture detail is needed

## Global rules
- Archetypes are illustrations, not templates to copy
- `0-to-hero-spec.md` (local only, gitignored) is a historical build doc (deprecated) — for current formats use core/ARCHITECTURE.md + core/templates/
- `DECISIONS.md` is gitignored on purpose: its ledger holds machine-local facts. Project decisions worth publishing go to core/decisions/adr-archive.md
- Language: conversations in French, all written content (files, commits, code, comments) in English

## Shell

`rtk` wraps shell commands: `rtk git`, `rtk ls`, `rtk find`, `rtk grep` in Bash. Harness tools (Grep/Glob/Read) are not shell commands — use them directly. A Bash `grep` is rewritten to ripgrep, so a BRE pattern with `\|` and a literal `(` fails (`unclosed group`): search with the Grep tool.

## Navigation (route by target, no strict order)

- **Code symbols** (source files) → `jcodemunch search_symbols` → `get_file_outline` → `get_symbol_source`. Full-file Read only if the outline is not enough.
- **Markdown / docs / config** → Read directly, no restriction.
- **"Which API should I use?"** → Context7 MCP (use `/org/project` format if the lib is known)
- **"Find this text"** → Grep tool (shell fallback: `rtk grep`)
- **"What did we do before?"** → `DECISIONS.md ## Ledger` (injected) → then `mem-search "…"` for older history

## Before acting
- State assumptions explicitly. If uncertain, ask — don't guess.
- If several interpretations exist, surface them; never pick silently.
- Turn the task into a verifiable goal, then loop until met ("fix bug" → write a failing test, make it pass).
- Multi-workspace: state the active workspace at task start ("working in `scripts` as <role>"). If the task shifts workspace, say so.

## Modifications

Surgical. Summarize first, confirm if > 3 files. Diff if > 20 lines. Do not fix adjacent problems without asking. No unsolicited suggestions.

## Startup

The SessionStart hook injects `DECISIONS.md ## Ledger` and each workspace's `## Active Learnings`, kept current by the background memory scribe. Use them to resume without redoing work. claude-mem is the read-only archive of past sessions.
If more detail is needed → `mem-search "…"` → then `get_observations` on the relevant IDs only. Never load everything at once.

## Memory

| I say | Destination | Content |
|---|---|---|
| `/memorise` | claude-mem + workspace `LEARNINGS.md` (rules) + `CONTEXT.md` (state) | Session summary + per-workspace thread update + Durcir Learnings (bump / graduate / archive) + stack-freshness check |
| `/gotcha` | Gotchas section below | One-line cross-workspace rule: `NEVER/ALWAYS [action] ([why])` |
| `remember forever` | Claude native memory | Permanent preferences, conventions, identity only |

Never put session context in native memory. Never put preferences in claude-mem.

**Before closing**: `/memorise` → "Memorised." → `/clear`. Never `/clear` without `/memorise`.

## Learning mode
<!-- learning-stack: durcir-v1 -->

This repo defines the Durcir stack (see core/ARCHITECTURE.md) but does not run it on itself: no workspaces, so L1/L2 do not exist here. The `SessionStart` hook in `.claude/settings.json` is kept as the reference wiring and exits silently. Rules for this repo go straight to `## Gotchas` below (L3).

## Gotchas

<!-- /gotcha appends rules here -->
- NEVER patch source containing backslashes or `\n` via a heredoc, `node -e` or Python `str.replace` (escaping layers collapse, a no-match is silent) — use the Edit tool
