# 0 to Hero — Repo

Open-source tool to structure your Claude workflow into efficient workspaces with specialized agents.

## Structure
- /core → Architecture + bootstrap prompt
- /archetypes → Complete examples (developer, creative)
- /catalog → Curated base of skills and tools
- /docs → Development plans and specs for this repo
- /tools → Reserved for future use

## Routing
| Intent | Resources |
|--------|-----------|
| Modify architecture or bootstrap | core/ARCHITECTURE.md → core/bootstrap/bootstrap-prompt.md |
| Work on an archetype | archetypes/INDEX.md → archetypes/[name]/ |
| Update the catalog | catalog/skills-database.md |
| Plan / execute a step | docs/plans/ |

## Reading order
1. This CLAUDE.md
2. The target resource based on routing
3. core/ARCHITECTURE.md or core/templates/ if a format/architecture detail is needed

## Global rules
- Archetypes are illustrations, not templates to copy
- `0-to-hero-spec.md` is a historical build doc (deprecated) — for current formats use core/ARCHITECTURE.md + core/templates/
- Language: conversations in French, all written content (files, commits, code, comments) in English

## Shell

`rtk` wraps shell commands: `rtk git`, `rtk ls`, `rtk find`, `rtk grep` in Bash. Harness tools (Grep/Glob/Read) are not shell commands — use them directly.

## Navigation (route by target, no strict order)

- **Code symbols** (source files) → `jcodemunch search_symbols` → `get_file_outline` → `get_symbol_source`. Full-file Read only if the outline is not enough.
- **Markdown / docs / config** → Read directly, no restriction.
- **"Which API should I use?"** → Context7 MCP (use `/org/project` format if the lib is known)
- **"Find this text"** → Grep tool (shell fallback: `rtk grep`)
- **"What did we do before?"** → `mem-search "…"`

## Before acting
- State assumptions explicitly. If uncertain, ask — don't guess.
- If several interpretations exist, surface them; never pick silently.
- Turn the task into a verifiable goal, then loop until met ("fix bug" → write a failing test, make it pass).
- Multi-workspace: state the active workspace at task start ("working in `scripts` as <role>"). If the task shifts workspace, say so.

## Modifications

Surgical. Summarize first, confirm if > 3 files. Diff if > 20 lines. Do not fix adjacent problems without asking. No unsolicited suggestions.

## Startup

claude-mem injects the compressed context automatically. Use it to resume without redoing work.
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

This project has the learning layer enabled (Durcir stack — rules harden through 3 levels).
- **L1 — in-flight workspace rules** → `<workspace>/LEARNINGS.md` → `## Active Learnings` (fed by `/memorise`, auto-injected)
- **L2 — role doctrine** → `<workspace>/AGENT.md` → `## Rules` (graduated from L1 at ×3 / stable / blocking)
- **L3 — cross-workspace doctrine** → Gotchas section below (fed by `/gotcha`, or graduated up)
- Demotions, archival and the drift log live in `LEARNINGS.md` (`## Archived Learnings`, `## Drift log`) — kept, not injected
- Agents apply all rule layers at task start via the Pre-work checklist in their `AGENT.md`
- A `SessionStart` hook auto-injects `## Active Learnings` at every new session

## Gotchas

<!-- /gotcha appends rules here -->
