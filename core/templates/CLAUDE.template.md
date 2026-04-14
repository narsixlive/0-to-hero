# CLAUDE.md

## Shell

Everything goes through `rtk`: `rtk grep`, `rtk ls`, `rtk find`, `rtk git …`. Never call directly.

## Navigation (strict order, follow 1 to 6)

1. **"How is X linked to Y?"** → `graphify-out/GRAPH_REPORT.md`, then `graphify query "…" --budget 1500`
2. **"Show me the code for X"** → `jcodemunch search_symbols` → `get_file_outline` → `get_symbol_source`
3. **"Which API should I use?"** → Context7 MCP (use `/org/project` format if the lib is known)
4. **"Find this text"** → `rtk grep "…" .`
5. **"What did we do before?"** → `mem-search "…"`
6. **Read a whole file** → last resort, prefer `get_file_outline`

No Read > 150 lines without jCodeMunch. No architecture answers without GRAPH_REPORT.md.

## Modifications

Surgical. Summarize first, confirm if > 3 files. Diff if > 20 lines. Do not fix adjacent problems without asking. No unsolicited suggestions.

## Startup

claude-mem injects the compressed context automatically. Use it to resume without redoing work.
If more detail is needed → `mem-search "…"` → then `get_observations` on the relevant IDs only. Never load everything at once.

## Memory

| I say | Destination | Content |
|---|---|---|
| `/memorise` | claude-mem + workspace `CONTEXT.md` | Global session summary (claude-mem) + per-workspace thread update (`CONTEXT.md` of touched workspaces) |
| `/gotcha` | Gotchas section below | One-line rule: `NEVER/ALWAYS [action] ([why])` |
| `remember forever` | Claude native memory | Permanent preferences, conventions, identity only |

Never put session context in native memory. Never put preferences in claude-mem.

**Before closing**: `/memorise` → "Memorised." → `/clear`. Never `/clear` without `/memorise`.

## Gotchas

<!-- /gotcha appends rules here -->
