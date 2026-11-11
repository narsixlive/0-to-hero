# Memory scribe (v0.5 — sorter, journal, no nag)

Background scribe that reads each session's transcript delta and writes the memory files while the session runs.
It writes **history** directly — `JOURNAL.md` (one block per session: did, next, dated events), `<ws>/CONTEXT.md ## Current state`
(one block per recent session) and an `## Active Learnings` rule only when it quotes the owner's own correction — and queues
**every judgement** for the owner: a new `Facts` key or a changed value → `DECISIONS.md ## Proposals` (the Facts line gets
`⚠ disputed → new (date)`, never overwritten), a `[fix]` hypothesis → `## Proposals`, at most one rule candidate per run →
`<ws>/LEARNINGS.md ## Candidates`. Unreviewed proposals expire to `## Proposals archive` after 60 days, candidates to
`## Archived Learnings` after 30: the inbox is bounded without a human, and nothing in the session ever asks for `/memorise`.
Rationale and measured numbers: `core/decisions/adr-archive.md` (2026-11-08, 2026-11-09, 2026-11-11).

| File | Role |
|------|------|
| `scribe-trigger.js` | `Stop` + `SessionEnd` hook. Queues the turn, prints the previous run's report, spawns the worker (one run per project per 5 min; `SessionEnd` = flush). Fail-open, never blocks. |
| `scribe-worker.js` | Background worker. Trims the transcript delta from a durable cursor, one lean `claude -p` call per project, verifies every evidence id (a Read of a memory file is never evidence; a rule worded like a tool RESULT is dropped; one candidate per run), applies through the writer, runs the expiry pass, logs tokens, journals the run. |
| `scribe-writer.js` | Bounded, deterministic writes. Only the destinations above, atomic temp+rename, fuzzy dedup of candidates, `expire()`. `node scribe-writer.js --selftest`. |
| `scribe-worker.check.js` | Offline check of verify / signal filter / cursor / lock. `node scribe-worker.check.js`. |
| `root.check.js` | Offline check of project-root resolution (JS and the bash injector agree, a `cd` does not move it) and of the light-project `.` workspace. `node root.check.js`. |
| `../inject-journal.sh` | Second `SessionStart` hook: coverage line, 3 newest journal blocks, Current state per workspace, under its own 9k cap. |

## Install (once per machine)

The injectors, the statusline and the scribe share one project-root rule, so install them together, same layout (the statusline loads `scribe/scribe-trigger.js` next to itself):

```
mkdir -p ~/.claude/hooks/scribe
cp core/hooks/scribe/*.js ~/.claude/hooks/scribe/
cp core/hooks/inject-learnings.sh core/hooks/inject-journal.sh core/hooks/claude-statusline.js ~/.claude/hooks/
```

The repo's `.claude/settings.json` calls `~/.claude/hooks/inject-learnings.sh`: it does nothing until this step is done.

`~/.claude/settings.json`: the trigger on both events (`async: true` so the session never waits), the journal injector on `SessionStart` (global: silent outside Durcir projects):

```json
"SessionStart": [{ "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/inject-journal.sh", "timeout": 10 }] }],
"Stop":         [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/scribe/scribe-trigger.js", "timeout": 10, "async": true }] }],
"SessionEnd":   [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/scribe/scribe-trigger.js", "timeout": 10, "async": true }] }]
```

On Windows use the full `node.exe` path (and a hidden-console launcher if the Stop hook flashes a window).

## Environment (all optional, `env` block of `settings.json`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `SCRIBE_ROOTS` | unset = every Durcir project | `;`-separated folders whose projects are watched |
| `SCRIBE_MODEL` | `sonnet` | model for the one call per run |
| `SCRIBE_DAILY_TOKENS` | 2 000 000 | machine-wide daily cap, all projects |
| `SCRIBE_SESSION_TOKENS` | 300 000 | per-session cap; raise one session by writing a number into `~/.claude/scribe/<slug>/budget-<session_id>` |
| `MAX_APPLY_FAILURES` (constant) | 3 | a delta whose apply reports an error (missing destination, race) is re-sent up to 3 times, then dropped with an alert naming the loss |
| `CANDIDATE_DAYS` / `PROPOSAL_DAYS` (constants) | 30 / 60 | expiry of an unreviewed candidate / proposal to its archive section |
| `JOURNAL_BLOCKS`, `JOURNAL_BLOCK_CAP`, `JOURNAL_STATE_CAP`, `JOURNAL_MAX_CHARS` | 3, 900, 500, 9000 | `inject-journal.sh` budgets (chars, whole lines only) |
| `SCRIBE_DISCORD_WEBHOOK` | unset | webhook URL for budget / failure alerts |
| `SCRIBE_DISCORD_ENV` | unset | alternative: a `KEY=VALUE` file holding `DISCORD_WEBHOOK_AUDIT` or `DISCORD_WEBHOOK_SESSIONS` |

Project root = the nearest folder at or above `CLAUDE_PROJECT_DIR` (the session's start folder, set by Claude Code, unaffected by `cd`) holding both `CLAUDE.md` and `DECISIONS.md`; none → the turn is ignored. State, slug and writes all use that root. A project with no `<workspace>/AGENT.md` is a light project: its rule candidates go to the root `LEARNINGS.md` (workspace `.`), no Current state is written, the journal still is.

## State (`~/.claude/scribe/<slug>/`)

`queue.jsonl` turns waiting · `cursors/<session>.json` last transcript line read · `journal.jsonl` one line per run (sessions, cursor ranges, applied, rejected) · `usage.jsonl` tokens per run · `report.txt` one-line report printed at the next Stop · `worker.lock` while a run is in progress · `pending.json` memory inbox (`proposals`, `candidates`, `oldest`, `alert` = any pending) read by the statusline and the hub — rewritten at each worker run, deleted by `/memorise` after a review.

## Seeing where the scribe is

The question the owner asks is "can I `/clear` without losing anything?". The answer is always yes (the queue keeps the old session, the next run drains it). Three passive surfaces read the same state, none calls a model, none asks for anything:

- `claude-statusline.js` (terminal): `✍✓` up to date · `✍ N` N transcript lines not yet read · `✍⏳` running · `✉ N` items waiting for review, whenever you feel like `/memorise`.
- `tools/claude-hub/` (VS Code sidebar, for people who never open a terminal): the same badge per project, the inbox count, a "run the scribe now" button, and a click on `✉` that opens `DECISIONS.md ## Proposals`.
- Stop hook `systemMessage` (every host, VS Code included): `scribe: journal +1 block · web state updated · … · 446k tokens today` after each run.
- SessionStart (`inject-journal.sh`): "History covered up to <date>; N turn(s) queued, not yet read" — a dead or late worker is visible as a gap, never mistaken for silence.
