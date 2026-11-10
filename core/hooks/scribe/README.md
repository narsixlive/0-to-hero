# Memory scribe (v0.3)

Background scribe that reads each session's transcript delta and writes the memory files
(`<ws>/CONTEXT.md ## Current state` and the update of an existing `DECISIONS.md ## Facts (current)` key, written directly; everything else — new facts, decisions, rules — queued in `DECISIONS.md ## Proposals` and `<ws>/LEARNINGS.md ## Candidates` for `/memorise`)
while the session runs. Replaces claude-mem's observation capture. Rationale and measured
numbers: `core/decisions/adr-archive.md` (2026-11-08 and 2026-11-09).

| File | Role |
|------|------|
| `scribe-trigger.js` | `Stop` + `SessionEnd` hook. Queues the turn, prints the previous run's report, spawns the worker (one run per project per 5 min; `SessionEnd` = flush). Fail-open, never blocks. |
| `scribe-worker.js` | Background worker. Trims the transcript delta from a durable cursor, one lean `claude -p` call per project, verifies every evidence id, applies through the writer, logs tokens, journals the run. |
| `scribe-writer.js` | Bounded, deterministic writes. Only the three destinations above, atomic temp+rename, fuzzy dedup of candidates. `node scribe-writer.js --selftest`. |
| `scribe-worker.check.js` | Offline check of verify / signal filter / cursor / lock. `node scribe-worker.check.js`. |

## Install (once per machine)

```
cp core/hooks/scribe/*.js ~/.claude/hooks/scribe/
```

`~/.claude/settings.json`, both events, same command (`async: true` so the session never waits):

```json
"Stop":       [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/scribe/scribe-trigger.js", "timeout": 10, "async": true }] }],
"SessionEnd": [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/scribe/scribe-trigger.js", "timeout": 10, "async": true }] }]
```

On Windows use the full `node.exe` path (and a hidden-console launcher if the Stop hook flashes a window).

## Environment (all optional, `env` block of `settings.json`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `SCRIBE_ROOTS` | unset = every Durcir project | `;`-separated folders whose projects are watched |
| `SCRIBE_MODEL` | `sonnet` | model for the one call per run |
| `SCRIBE_DAILY_TOKENS` | 2 000 000 | machine-wide daily cap, all projects |
| `SCRIBE_SESSION_TOKENS` | 300 000 | per-session cap; raise one session by writing a number into `~/.claude/scribe/<slug>/budget-<session_id>` |
| `SCRIBE_PENDING_MAX` | 10 | proposals + candidates waiting for `/memorise` from which every surface shows `✉ N` |
| `SCRIBE_PENDING_DAYS` | 7 | or the oldest pending item has waited this long |
| `SCRIBE_DISCORD_WEBHOOK` | unset | webhook URL for budget / failure alerts |
| `SCRIBE_DISCORD_ENV` | unset | alternative: a `KEY=VALUE` file holding `DISCORD_WEBHOOK_AUDIT` or `DISCORD_WEBHOOK_SESSIONS` |

A project is watched only if it has a root `CLAUDE.md` and either `DECISIONS.md` or one `<workspace>/AGENT.md` (the writer needs a destination).

## State (`~/.claude/scribe/<slug>/`)

`queue.jsonl` turns waiting · `cursors/<session>.json` last transcript line read · `journal.jsonl` one line per run (sessions, cursor ranges, applied, rejected) · `usage.jsonl` tokens per run · `report.txt` one-line report printed at the next Stop · `worker.lock` while a run is in progress · `pending.json` memory inbox (`proposals`, `candidates`, `oldest`, `alert`) read by the statusline and the hub.

## Seeing where the scribe is

The question the owner asks is "can I `/clear` without losing anything?". Three surfaces read the same state, none calls a model:

- `claude-statusline.js` (terminal): `✍✓` up to date · `✍ N` N transcript lines not yet read · `✍⏳` running · `✉ N` memory inbox over the threshold, run `/memorise`.
- `tools/claude-hub/` (VS Code sidebar, for people who never open a terminal): the same badge per project, the inbox count, a "run the scribe now" button, and a click on `✉` that opens `DECISIONS.md ## Proposals`.
- Stop hook `systemMessage` (every host, VS Code included): `scribe: ledger +1 · … · 446k tokens today` after each run.
- A VS Code sidebar can show the same badge per project by comparing the newest transcript's line count with the cursor (the owner's Claude Hub extension does this, plus a "run the scribe now" button that feeds the trigger a `SessionEnd` payload on stdin).

`/clear` never loses the transcript: the queue keeps the old session and the next run drains it.
