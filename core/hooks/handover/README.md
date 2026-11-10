# Handover layer

Scratch memory for what `/compact` and `/clear` throw away, so `/memorise` and the next session still see it. Files live in `~/.claude/handovers/<slug>/<session_id>.md` (slug = the project cwd with every non-alphanumeric character replaced by `-`, e.g. `D--CLAUDE-project-0-to-Hero`), never in the repo.

| File | Role |
|------|------|
| `handover-write.js` | `PreCompact` hook. Appends a `## Compaction` block of mechanical facts (files touched, commands that failed, transcript path) before Claude Code prunes the session. No model call. |
| `handover-read.js` | `SessionStart` hook, matcher `clear` only. Re-injects the unconsumed handovers after a `/clear` (after `/compact` Claude Code already re-injects its own summary). Marks what it injected with a `.consumed` file. |
| `handover-read.check.js` | Offline check. `node handover-read.check.js`. |
| `../../templates/commands/handover.md` | `/handover`: the manual, judgment-carrying block (`## Manual handover`) written by the session itself. |

`/memorise` reads this folder first (its "recover what /clear and compaction removed" step) and moves the files it processed into `done/`.

## Install (once per machine)

```
cp core/hooks/handover/*.js ~/.claude/hooks/
cp core/templates/commands/handover.md ~/.claude/commands/
```

`~/.claude/settings.json` (nested form; Windows: full `node.exe` path, hidden-console launcher if a window flashes):

```json
"PreCompact":   [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/handover-write.js", "timeout": 15 }] }],
"SessionStart": [{ "matcher": "clear", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/handover-read.js", "timeout": 10 }] }]
```

Keep any other `SessionStart` entry (the memory injector has its own, in the project's `.claude/settings.json`).
