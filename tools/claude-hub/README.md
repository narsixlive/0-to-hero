# Claude Hub — VS Code sidebar for the memory stack

For people who never open a terminal. A small panel at the top of the Explorer shows:

- **Claude usage** (5h and 7-day limits), same data as `/usage`.
- **Your recent projects** under one root folder (the parent of the opened workspace by default, or `claudeHub.root`). Click to open, Ctrl+click for a new window, type to filter.
- Per project, the **memory scribe** state: `✍ ✓` up to date (`/clear` is safe), `✍ ↻` behind (click ✍ to run the scribe now), `✍ ⏳` running.
- Per project, the **memory inbox**: `✉ N` when N facts or rules wait for review (a count; with the scribe's `--inbox` hook the session drains the inbox by itself at 5 items). Click it to open `DECISIONS.md ## Proposals`; `/memorise` in that project empties the queue at any time.

No model call. Reads `~/.claude/projects` (session activity) and `~/.claude/scribe/<project>/` (cursor, lock, `pending.json`). For the Claude usage panel it also reads the Claude Code OAuth access token from `~/.claude/.credentials.json` and sends it to `https://api.anthropic.com/api/oauth/usage` (the endpoint behind `/usage`) — read only, never refreshed or stored, sent nowhere else; the numbers are cached in `<tmp>/claude-hub-usage.json`.

## Install

```
cd tools/claude-hub
npx @vscode/vsce package          # produces claude-hub-1.0.0.vsix
code --install-extension claude-hub-1.0.0.vsix
```

Then reload the window. The panel appears in the Explorer as "Claude". Requires the memory scribe installed globally (`core/hooks/scribe/README.md`); without it the panel still lists projects and usage, without badges.

## How it fits

The scribe writes directly only history (`JOURNAL.md`, `CONTEXT.md ## Current state`) and a rule quoting the owner's own correction. Everything else it finds (a new or changed fact, a fix hypothesis, a rule candidate) goes to `DECISIONS.md ## Proposals` and `LEARNINGS.md ## Candidates`, never injected; unreviewed items archive themselves (60 / 30 days). `/memorise` is the only door from there to durable memory: it decides from reading the code and asks only about what it cannot settle. The hub and the terminal statusline show the same `✉ N`; with the `--inbox` hook the session runs `/memorise` by itself when the inbox fills.
