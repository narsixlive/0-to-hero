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
- **"What did we do before?"** → `DECISIONS.md ## Ledger` (injected) → then `mem-search "…"` for older history

## Modifications

Surgical. Summarize first, confirm if > 3 files. Diff if > 20 lines. Do not fix adjacent problems without asking. No unsolicited suggestions.

## Startup

The SessionStart hook injects `DECISIONS.md ## Facts (current)` whole, the 5 newest `## Ledger` lines and each workspace's `## Active Learnings`, kept current by the background memory scribe. Use them to resume without redoing work. claude-mem is the read-only archive of sessions before the scribe (2026-11).
If more detail is needed → `mem-search "…"` → then `get_observations` on the relevant IDs only. Never load everything at once.

## Memory

| I say | Destination | Content |
|---|---|---|
| `/memorise` | workspace `LEARNINGS.md` (rules) + `CONTEXT.md` (state) + `DECISIONS.md` (Facts, Ledger) | Drains the scribe inbox (`## Proposals`, `## Candidates`) + per-workspace thread update + auto-proposed / graduated `Learnings` + auto-proposed facts of record |
| `/gotcha` | Gotchas section below | One-line cross-workspace rule: `NEVER/ALWAYS [action] ([why])` |
| (via `/memorise`) | `DECISIONS.md` → `## Facts (current)` (a state, one line per key, injected whole) or `## Ledger` (a dated event, 5 newest injected) | Durable project facts: domain, app name, accounts, commitments, decisions. |
| `remember forever` | Claude native memory | Permanent preferences, conventions, identity only |

Never put session context in native memory. Never put preferences in claude-mem. Never leave a fact of record only in claude-mem (it gets missed) — it goes to the `DECISIONS.md` ledger.

**Before closing**: `/memorise` → "Memorised." → `/clear`. Never `/clear` without `/memorise`.

## Learning mode
<!-- learning-stack: durcir-v2 -->

This project has the learning layer enabled (Durcir stack v2 — rules harden through 3 levels, a background scribe writes memory while the session runs).
- **L1 — in-flight workspace rules** → `<workspace>/LEARNINGS.md` → `## Active Learnings` (fed by `/memorise`, auto-injected)
- **L2 — role doctrine** → `<workspace>/AGENT.md` → `## Rules` (graduated from L1 at ×3 / cross-task / high-criticality)
- **L3 — cross-workspace doctrine** → Gotchas section below (fed by `/gotcha`, or graduated from L1/L2)
- **Durable project facts** → `DECISIONS.md` → `## Facts (current)` (states, injected whole) and `## Ledger` (dated events, 5 newest injected) — fed by the scribe and `/memorise`
- Demotions, archival and the drift log live in `LEARNINGS.md` (`## Archived Learnings`, `## Drift log`) — kept, not injected
- Agents apply all rule layers at task start via the Pre-work checklist in their `AGENT.md`
- A `SessionStart` hook auto-injects `## Active Learnings` **and `DECISIONS.md` Facts + Ledger** at every new session, plus the memory-inbox line (`✉ N`) when the scribe backlog needs `/memorise`
- A `Stop` + `SessionEnd` **memory scribe** (global hook) reads the transcript while the session runs. It writes directly only what is deterministic and tool-proven: `CONTEXT.md ## Current state`, the update of an existing `DECISIONS.md ## Facts` key, and an `## Active Learnings` rule when it quotes the owner's own correction. Everything else it finds (new facts, decisions, rules) lands in `DECISIONS.md ## Proposals` and `LEARNINGS.md ## Candidates`, not injected, for `/memorise` to validate. When 10 proposals wait, or one has waited 7 days, every surface (session line, statusline, SessionStart) says so

## Gotchas

<!-- /gotcha appends rules here -->
