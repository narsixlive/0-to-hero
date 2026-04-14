# Architecture decisions — NarSix Workflow Template

Reference document. Do not load automatically into context.
Consultable on demand via jCodeMunch or targeted reading.

## The 5 tools and their roles

| Tool | Role | Layer | Activation |
|---|---|---|---|
| RTK | Compresses bash outputs (60-90% token savings) | Transparent | Global PreToolUse hook on Bash — automatic |
| jCodeMunch | Code navigation by symbol instead of full-file reads | On demand | MCP server + PreToolUse hook on Read |
| graphify | Project knowledge graph (architecture, god nodes, connections) | On demand | PreToolUse hook on Glob/Grep |
| Context7 | Up-to-date documentation for external libraries | On demand | MCP server, triggered by lib mention |
| claude-mem | Persistent memory across sessions (observations + summaries) | Automatic | PostToolUse + Stop + SessionStart hooks |

### Why there are no duplicates

RTK compresses bash **outputs**. jCodeMunch **avoids** reading files. These are two complementary strategies, not redundant ones.
graphify gives the project **map** (relations, architecture). jCodeMunch gives the precise **code** of a symbol. Two different zoom levels.

### No hook conflicts

- RTK intercepts **Bash** (PreToolUse)
- jCodeMunch intercepts **Read/file** (PreToolUse)
- graphify intercepts **Glob/Grep** (PreToolUse)
- claude-mem uses **PostToolUse** + **Stop** + **SessionStart/End**

No collision — each tool listens to different events.

## Memory architecture

### The problem

Claude Code has access to several memory systems that do not communicate with each other. Without explicit routing, Claude stores information in the wrong place and memory fragments.

### The 3 destinations

**Claude native memory** — Anthropic servers (claude.ai) or local Session Memory (Claude Code). For what does not change: identity, preferences, conventions. Rarely modified. Triggered by "remember forever".

**claude-mem** — local SQLite + Chroma database (`~/.claude-mem/`). For what happened: work sessions, decisions, episodic context. Captured automatically by the hooks. Summary triggered by `/memorise`.

**CLAUDE.md (Gotchas section)** — file versioned in the project. For mistakes not to repeat. Short NEVER/ALWAYS rules. Triggered by `/gotcha`.

### Why no separate GOTCHA.md

A separate file requires a Read tool call at every session start → wasted tokens. Integrated into CLAUDE.md, gotchas are loaded for free with the rest of the instructions.

### Why CLAUDE.md does not store memory

Every token of CLAUDE.md is loaded at every message, every session, every compact. It is the most expensive space in tokens. It must contain only routing and rules, never context or preferences.

## The /clear problem

### Observation

`/clear` in Claude Code triggers SessionEnd with a 1.5-second timeout. Session compression by claude-mem (agent SDK) takes 30-60 seconds. The session summary does not complete in time.

### What is still saved

PostToolUse observations are sent to the HTTP worker in real time (8ms per send) throughout the session. They are in SQLite BEFORE `/clear`. The compressed summary may be missing, but the raw data is there.

### The solution: /memorise before /clear

When the user types `/memorise`:
1. Claude generates a structured summary (output tokens)
2. The Stop hook fires when Claude finishes responding → processes the transcript
3. Observations for the whole session are already in SQLite
4. The user types `/clear` → SessionStart fires → claude-mem reinjects the context at the next startup

The explicit `/memorise` summary exists in the transcript processed by the Stop hook. Even if async compression does not finish, the raw observations are enough to reconstruct the context.

### Why not /compact then /clear

`/compact` re-reads the entire conversation (same input tokens) and generates a full summary so you can keep working. If the goal is just to save and leave, that is paying the cost of a compact for a summary you will immediately throw away with `/clear`. `/memorise` is more targeted and cheaper.

## Token discipline — progressive disclosure

### Principle

Never load everything at once. Context loads in layers, from lightest to most expensive.

| Layer | Content | Tokens | Activation |
|---|---|---|---|
| 0 | CLAUDE.md (routing + gotchas) | ~200 | Automatic, each session |
| 1 | claude-mem compressed index | ~500-1000 | Automatic, SessionStart |
| 2 | Targeted mem-search | Variable | On demand |
| 3 | Detailed get_observations | ~500-1000/obs | On demand, filtered IDs |

### Navigation order

Codified in CLAUDE.md as a strict numbered list:
1. graphify GRAPH_REPORT.md → for architecture questions
2. jCodeMunch search_symbols → for code
3. Context7 → for library docs
4. rtk grep → for text search
5. mem-search → for session history
6. Full-file read → last resort

### RTK: always prefix with rtk

Decision: tell Claude to always use `rtk grep`, `rtk git`, etc. rather than relying on the transparent hook. Both approaches work (the hook detects the prefix and passes through), but the explicit approach is more readable in CLAUDE.md and guarantees Claude never uses a raw command.

## Slash commands

### /memorise (.claude/commands/memorise.md)

Triggers a structured summary: decisions, changes, blockers, next steps. The summary is captured by claude-mem via the PostToolUse and Stop hooks. The "Memorised." confirmation signals to the user that they can `/clear`.

### /gotcha (.claude/commands/gotcha.md)

After a Claude mistake, appends a ONE-LINE rule to the Gotchas section of CLAUDE.md. NEVER/ALWAYS format. No narrative, no dates. The rule is loaded automatically at every subsequent session.

## Inspirations

### Boris Cherny (creator of Claude Code)

- "After every correction, end with: Update your CLAUDE.md so you don't make that mistake again." → implemented via `/gotcha`
- "If you do something more than once a day, turn it into a skill or slash command." → `/memorise` and `/gotcha` are slash commands
- "Invest in your CLAUDE.md. Ruthlessly edit it over time." → CLAUDE.md is a living file; gotchas accumulate and get pruned

### claude-mem progressive disclosure (3-layer workflow)

- Layer 1: search → compact index (~50-100 tokens/result)
- Layer 2: timeline → chronological context
- Layer 3: get_observations → full detail, only on filtered IDs
- ~10× token savings by filtering before loading detail
