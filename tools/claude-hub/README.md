# Claude Hub — VS Code sidebar for the memory stack

For people who never open a terminal. A small panel at the top of the Explorer shows:

- **Claude usage** (5h and 7-day limits), same data as `/usage`.
- **Your recent projects** under one root folder (the parent of the opened workspace by default, or `claudeHub.root`). Click to open, Ctrl+click for a new window, type to filter.
- Per project, the **memory scribe** state: `✍ ✓` up to date (`/clear` is safe), `✍ ↻` behind (click ✍ to run the scribe now), `✍ ⏳` running.
- Per project, the **memory inbox**: `✉ N` when N facts, decisions or rules wait for `/memorise` (threshold: 10 items, or one older than 7 days — `SCRIBE_PENDING_MAX` / `SCRIBE_PENDING_DAYS`). Click it to open `DECISIONS.md ## Proposals`, then run `/memorise` in that project.

No model call. Reads `~/.claude/projects` (session activity) and `~/.claude/scribe/<project>/` (cursor, lock, `pending.json`). For the Claude usage panel it also reads the Claude Code OAuth access token from `~/.claude/.credentials.json` and sends it to `https://api.anthropic.com/api/oauth/usage` (the endpoint behind `/usage`) — read only, never refreshed or stored, sent nowhere else; the numbers are cached in `<tmp>/claude-hub-usage.json`.

## Install

```
cd tools/claude-hub
npx @vscode/vsce package          # produces claude-hub-1.0.0.vsix
code --install-extension claude-hub-1.0.0.vsix
```

Then reload the window. The panel appears in the Explorer as "Claude". Requires the memory scribe installed globally (`core/hooks/scribe/README.md`); without it the panel still lists projects and usage, without badges.

## How it fits

The scribe writes directly only what is deterministic and tool-proven (`CONTEXT.md ## Current state`, the update of an existing `DECISIONS.md ## Facts` key). Everything else it finds goes to `DECISIONS.md ## Proposals` and `LEARNINGS.md ## Candidates`, never injected. `/memorise` is the only door from there to durable memory. The hub is the reminder that the door needs opening: the same `✉ N` is printed after a turn (`scribe: …`), in the terminal statusline and at SessionStart, so a user without the sidebar sees it too.
