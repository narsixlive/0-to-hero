# CLAUDE.md

## Repo layout

- **A workspace = a folder containing `AGENT.md`, listed in the Routing table.** Nothing else at the root is a workspace, ever. Enumerate workspaces with `rtk find AGENT.md` — never by guessing from folder names.
- **Everything else at the root is support, never a workspace** — config (`.claude/`), CI (`.github/`), local data/output, `_private/` (sensitive data), and `docs/`. Each is declared in `## Structure`; none is routed as a workspace.
- **All meta-docs live in `docs/`** — roadmap, construction/reference plan, audits, readiness reports, research notes. Never create them at the root. Routing points to the *living* ones (`docs/ROADMAP.md`, `docs/PLAN.md`); finished or snapshot docs stay in `docs/` unreferenced (consulted on demand). A doc stays findable because something **points** to it, not because of where it sits.
- **`docs/` is reserved for meta-docs — never name a workspace `docs/`.** A documentation workspace takes a role name (`documentation/`, `writing/`).

## Shell

`rtk` wraps shell commands: `rtk git`, `rtk ls`, `rtk find`, `rtk grep` in Bash. Harness tools (Grep/Glob/Read) are not shell commands — use them directly.

## Navigation (route by target, no strict order)

- **Code symbols** (source files) → `jcodemunch search_symbols` → `get_file_outline` → `get_symbol_source`. Full-file Read only if the outline is not enough.
- **Markdown / docs / config** → Read directly, no restriction.
- **"Which API should I use?"** → Context7 MCP (use `/org/project` format if the lib is known)
- **"Find this text"** → Grep tool (shell fallback: `rtk grep`)
- **"What did we do before?"** → `mem-search "…"`

## Modifications

Surgical. Summarize first, confirm if > 3 files. Diff if > 20 lines. Do not fix adjacent problems without asking. No unsolicited suggestions.

## Startup

claude-mem injects the compressed context automatically. Use it to resume without redoing work.
If more detail is needed → `mem-search "…"` → then `get_observations` on the relevant IDs only. Never load everything at once.

## Memory

| I say | Destination | Content |
|---|---|---|
| `/memorise` | claude-mem + workspace `LEARNINGS.md` (rules) + `CONTEXT.md` (state) + `DECISIONS.md` ledger | Global session summary (claude-mem) + per-workspace thread update + auto-proposed / graduated `Learnings` + auto-proposed facts of record |
| `/gotcha` | Gotchas section below | One-line cross-workspace rule: `NEVER/ALWAYS [action] ([why])` |
| (via `/memorise`) | `DECISIONS.md` → `## Ledger` (injected at SessionStart) | Durable project facts: domain, app name, accounts, commitments. One dated line each. |
| `remember forever` | Claude native memory | Permanent preferences, conventions, identity only |

Never put session context in native memory. Never put preferences in claude-mem. Never leave a fact of record only in claude-mem (it gets missed) — it goes to the `DECISIONS.md` ledger.

**Before closing**: `/memorise` → "Memorised." → `/clear`. Never `/clear` without `/memorise`.

## Learning mode
<!-- learning-stack: durcir-v1 -->

This project has the learning layer enabled (Durcir stack — rules harden through 3 levels).
- **L1 — in-flight workspace rules** → `<workspace>/LEARNINGS.md` → `## Active Learnings` (fed by `/memorise`, auto-injected)
- **L2 — role doctrine** → `<workspace>/AGENT.md` → `## Rules` (graduated from L1 at ×3 / cross-task / high-criticality)
- **L3 — cross-workspace doctrine** → Gotchas section below (fed by `/gotcha`, or graduated from L1/L2)
- **Durable project facts** → `DECISIONS.md` → `## Ledger` (fed by `/memorise`)
- Demotions, archival and the drift log live in `LEARNINGS.md` (`## Archived Learnings`, `## Drift log`) — kept, not injected
- Agents apply all rule layers at task start via the Pre-work checklist in their `AGENT.md`
- A `SessionStart` hook auto-injects `## Active Learnings` **and the `DECISIONS.md` ledger** at every new session

## Gotchas

<!-- /gotcha appends rules here -->
