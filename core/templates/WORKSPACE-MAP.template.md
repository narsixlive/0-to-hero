# [parent folder] — workspace map

Read automatically by every session under this folder (parent CLAUDE.md). Keep it under 80 lines:
it costs tokens in every project. Facts that change weekly belong in each project's `DECISIONS.md`,
rules in its `LEARNINGS.md`. Here: what exists, where, and what is shared.

## Projects (most active first)

| Project | Role | Stack | Notes |
|---|---|---|---|
| `[folder]` | [one line: what it is for] | [main stack] | [one note: status, constraint, "reads ../x read-only"] |
| Less active | `[folder]`, `[folder]` | | |

[One sentence naming which projects orbit which — "A is the product; B, C, D serve it. Check there before inventing a new brick."]

## Reusable bricks (where it lives → who else could use it)

Hooks and skills (language-agnostic, `.claude/`):
- [brick]: `[project]/.claude/hooks/[file]` → [projects that would need it]

Utilities:
- [brick, one line on what it guarantees]: `[project]/[path]` → [projects that would need it]

## Machine conventions shared by several projects

- Global hooks in `~/.claude/hooks/`: [list]. Do not copy them into a project.
- Memory: `DECISIONS.md ## Facts` + `## Ledger` + per-workspace `LEARNINGS.md`/`CONTEXT.md`, written by the scribe (inbox: `## Proposals` / `## Candidates`), consolidated by `/memorise`.
- Secrets live in `[path convention]`; never read by agents.
- Alerts: [one channel, shared by which projects].
- Scheduled jobs: [scheduler, where the registration pattern lives].
