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
| `/memorise` (automatic, or by hand) | `DECISIONS.md` (Facts, Ledger) + workspace `LEARNINGS.md` (rules) | Empties the scribe's queue: decides each fact, fix and rule candidate from reading the code, asks only about what it cannot settle; every declined line is archived with its outcome |
| `/gotcha` | Gotchas section below | One-line cross-workspace rule: `NEVER/ALWAYS [action] ([why])` |
| (scribe, automatic) | `JOURNAL.md` + `<workspace>/CONTEXT.md ## Current state` | Session history: did / next / dated events, one block per session, injected at SessionStart |
| `remember forever` | Claude native memory | Permanent preferences, conventions, identity only |

Never put session context in native memory. Never put preferences in claude-mem. Never leave a fact of record only in claude-mem (it gets missed) — it goes to the `DECISIONS.md` ledger.

**Closing**: `/clear` whenever you want — the scribe keeps writing from the transcript (queue on disk, nothing lost). The memory inbox drains itself: at 5 waiting items, or one older than 3 days, the session runs `/memorise` in a background agent at the end of a turn and asks only about what it could not settle. `/memorise` by hand does the same at any time.

## Learning mode
<!-- learning-stack: durcir-v2 -->

This project has the learning layer enabled (Durcir stack v2 — a background scribe writes memory while the session runs, rules enter only through the owner).
- **L1 — workspace rules** → `<workspace>/LEARNINGS.md` → `## Active Learnings` (written by the owner in `/memorise`, or from the owner's own correction quoted in session; auto-injected, ~5 per workspace)
- **L3 — cross-workspace doctrine** → Gotchas section below (fed by `/gotcha` only, cap 12)
- **Durable project facts** → `DECISIONS.md` → `## Facts (current)` (states, injected whole, one value per key, written by `/memorise`; the scribe only marks a line `⚠ disputed → new`) and `## Ledger` (dated decisions, 5 newest injected, written by `/memorise`)
- **History** → `JOURNAL.md` (one block per session written by the scribe: did, next, dated events) and `<workspace>/CONTEXT.md ## Current state` (one block per recent session)
- Archived rules and the drift log live in `LEARNINGS.md` (`## Archived Learnings`, `## Drift log`) — kept, not injected; a candidate unreviewed 30 days and a proposal unreviewed 60 days archive themselves
- Agents apply all rule layers at task start via the Pre-work checklist in their `AGENT.md`
- Two `SessionStart` hooks (each under its own 10k cap): `inject-learnings.sh` → Active rules + Facts + 5 Ledger lines; `inject-journal.sh` → coverage line, the 3 newest journal blocks, each workspace's Current state
- A `Stop` + `SessionEnd` **memory scribe** (global hook) reads the transcript while the session runs. It writes directly: `JOURNAL.md`, `CONTEXT.md ## Current state`, and an `## Active Learnings` rule only when it quotes the owner's own correction. Everything else (a new Facts key, a changed value, a `[fix]` hypothesis, at most one rule candidate per run) goes to `DECISIONS.md ## Proposals` and `LEARNINGS.md ## Candidates`, never injected until reviewed: the statusline `✉ N` and the VS Code sidebar show the count, and the queue drains itself — at 5 items (or one older than 3 days) the session runs `/memorise` in a background agent, which decides from reading the code and asks only about what it cannot settle

## Gotchas

<!-- /gotcha appends rules here -->
