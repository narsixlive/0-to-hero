# Architecture — 0 to Hero

## The 3 layers

### Layer 1: CLAUDE.md — The map (+ Gotchas)
GPS of the project. Read first, always. Loaded at every session for free.
- Project identity + routing to workspaces
- Gotchas section: NEVER/ALWAYS rules, fed by `/gotcha`
- Short and scannable (if you scroll, it's too long)
- Does NOT describe the work, does NOT describe the agents

### Layer 2: CONTEXT.md + LEARNINGS.md — The room
What you'd give a new colleague — split by lifetime into two files.
- **CONTEXT.md** (situational): Brief zone (stable: work, project, audience, constraints) + Current state + Thread (volatile, updated by `/memorise`)
- **LEARNINGS.md** (the workspace rule register, Durcir lifecycle): `## Active Learnings` (`ALWAYS/NEVER [action] ([why]) ×N`, auto-injected) + `## Archived Learnings` + `## Drift log`. Rules harden through 3 levels (L1 here → L2 `AGENT.md ## Rules` → L3 root Gotchas)
- The essentials fit on one screen; 80% work description / 20% behavior max

### Layer 3: AGENT.md — The specialist
Brain of the workspace. Transforms Claude into a specialist.
- Pre-work checklist (header): forces reading `LEARNINGS.md` `## Active Learnings` + this file's `## Rules` and applying every rule before any task
- `## Rules` is the L2 (Contract) rung of the Durcir ladder — stable workspace rules graduate here from `LEARNINGS.md`
- Role, capabilities, skills, process, limits
- Invocation scope: when to call this agent, when NOT to
- Dense and actionable (no prose, only instructions)
- Skills in `always` or `on-demand` mode

## Facts of record + archives

- **DECISIONS.md** (project root) — two zones. `## Ledger (facts of record)`: durable project facts (domain, app name, accounts, commitments), terse dated one-liners, **injected at every SessionStart** and fed by `/memorise`. `## ADR archive`: structural rationale (tool choices, workspace split, naming) — NOT injected, consulted on demand. The injected ledger exists because an empty, on-demand-only file is invisible and stays unused — that's how important facts get lost.
- **claude-mem** — persistent session memory, captured automatically via hooks.

## Workspace + existing code

The rule applies to **any workspace folder that contains code** — not only `src/`.
The folder name reflects the domain: `src/` for apps, `scripts/` for runnables,
`app/`, `backend/`, `notebooks/`, `services/`, etc. Whichever name the project
naturally uses, the same separation applies:

**Never mix agent files with the code.** The workspace files (CONTEXT.md, AGENT.md)
live at the workspace root. Code goes into a named sub-folder.

Convention: `<workspace>/code_<descriptor>/`

`<descriptor>` is a short label that distinguishes this code from other code that could live in the same workspace — typically the **language** (`code_python/`, `code_rust/`), the **target** (`code_linkedin/`, `code_indeed/` for scrapers), the **role** (`code_api/`, `code_worker/`), or `code_common/` for shared helpers. It is NOT derived from the workspace name.

### Example 1 — app code in `src/`

```
my-app/
├── CLAUDE.md
├── src/                        ← workspace root (agent files here)
│   ├── CONTEXT.md
│   ├── AGENT.md
│   └── code_python/            ← existing code, untouched
│       ├── main.py
│       └── utils.py
└── planning/                   ← other workspace, unaffected
```

### Example 2 — standalone scrapers in `scripts/`

When a project uses a domain-specific name instead of `src/`, keep the name.
The `code_*/` sub-folder pattern still applies — and can split by target when
the workspace holds several independent runnables.

```
scraper-project/
├── CLAUDE.md
├── scripts/                    ← workspace root — domain-appropriate name
│   ├── CONTEXT.md
│   ├── AGENT.md
│   ├── code_linkedin/          ← one runnable scraper
│   ├── code_indeed/            ← another
│   └── code_common/            ← shared helpers
└── data/                       ← other workspace
```

Rules:
- Workspaces always stay at the project root — never nest them inside another folder
- The workspace folder name follows the domain (`src/`, `scripts/`, `app/`, `notebooks/`, …). Do not rename an existing folder just to match `src/`
- If the workspace folder is empty: place agent files directly, no sub-folder needed yet
- If the workspace folder has code: move it into `<workspace>/code_<descriptor>/`, then place agent files at the workspace root
- The agent's scope covers everything under the workspace folder, across all `code_*/` sub-folders if there are several
- Never put CONTEXT.md or AGENT.md inside a code sub-folder

### Post-bootstrap: adding code to an already-bootstrapped workspace

After the bootstrap, the workspace folder exists with its agent files (CONTEXT.md, AGENT.md).
When the user wants to start coding or bring in existing code — **do not reorganize the workspace**.
Only create `<workspace>/code_<descriptor>/` inside the existing workspace and put the code there.

```
src/                  ← workspace already in place — DO NOT TOUCH
├── CONTEXT.md        ← stays here
├── AGENT.md          ← stays here
└── code_python/      ← just add this with the code inside
    ├── main.py
    └── utils.py
```

Same applies to non-`src/` workspaces:

```
scripts/              ← any domain-named workspace — DO NOT TOUCH
├── CONTEXT.md
├── AGENT.md
└── code_scraper/     ← add the code here
    └── run.py
```

Never propose to reorganize or restructure the workspace folder itself when adding code.
The only permitted action is adding the `code_*/` sub-folder.

## Transversal: claude-mem

Persistent memory — fully automatic, zero user action.

Installed via `npx claude-mem install`. Captures tool-usage observations across sessions
via hooks, stores in SQLite + Chroma vector DB. Query with `mem-search "…"`.

No `.memory/` folder. No MEMORY.md index to maintain. No agent writes at session end.
Hooks handle capture automatically — nothing required from the user or the agent.

## Transversal: Learning layer (Durcir)

Self-improving agents, folder-based, opt-in per project. Workspace rules **harden** through three levels instead of piling up in one list.

Three moving parts:
1. **`LEARNINGS.md` per workspace** — `## Active Learnings` (in-flight `ALWAYS/NEVER [action] ([why]) ×N` rules, injected) + `## Archived Learnings` (demoted / non-recurrent, kept, not injected) + `## Drift log` (rules ignored despite being capitalized). Kept separate from `CONTEXT.md` so the situational context stays pure.
2. **`/memorise` (Durcir lifecycle)** — at session end it proposes Learnings, **bumps `×N` on recurrence instead of skipping a duplicate** (the duplicate is the signal), proposes **graduation** at the thresholds, archives stale ones, logs drift. The user validates each write.
3. **`SessionStart` hook** (`~/.claude/hooks/inject-learnings.sh`) — scans `LEARNINGS.md` (and legacy `CONTEXT.md`) files, injects each `## Active Learnings` section + the `DECISIONS.md ## Ledger` as `additionalContext`.

The ladder:
- **L1 — Active Learnings** (`LEARNINGS.md`): in-flight, injected, counted (`×N`).
- **L2 — Role doctrine** (`AGENT.md ## Rules`): a rule graduates here at ×3 / when it stabilises / when it blocks work. Workspace-scoped.
- **L3 — Cross-workspace doctrine** (root `CLAUDE.md ## Gotchas`, via `/gotcha`): cross-workspace or high-criticality rules; a critical rule may jump straight to L3.

Graduating copies the rule verbatim (with its `why`) to the higher level and **removes it from Active — the list drains upward instead of growing**. Demotion is possible (never just to lighten a file). The `## Drift log` measures how long a rule takes to harden; a rule that drifts < 7 days repeatedly is in the wrong layer → graduate it straight to L3.

Why this shape:
- **Recurrence over recency**: a rule earns its place by recurring (`×N`), not by being newest. Bump-not-skip turns the old dedup check into the graduation engine.
- **Purity by flow**: `CONTEXT.md` stays clean because winners leave Active (graduate) and losers leave too (archive) — separation by lifetime, not by stuffing everything in one file.
- **Two-stage gating**: the LLM proposes, the user validates. Prevents prompt pollution and drift.
- **Deterministic injection**: the hook guarantees agents see the Active rules; the Pre-work checklist in `AGENT.md` is the belt-and-suspenders backup (covers subagents the hook cannot reach).

Lineage: Jake Van Clief's "durcir tes règles capitalisées" / edit-source principle applied to a folder-based system, aligned with Anthropic's "keep the hot context lean, push detail to scoped files" and Karpathy's RAM/disk context model (Active = RAM injected, Archived/Drift = disk).

Installation: opt-in per project via `.claude/settings.json` pointing to the globally-installed hook. `/bootstrap-upgrade` migrates existing projects (splits `CONTEXT.md` rules into `LEARNINGS.md`, stamps the `<!-- learning-stack: durcir-v1 -->` marker). `/memorise` reads that marker and offers the upgrade when a project is behind.

Limits:
- Proposed Learnings can be noisy; the two-stage gating filters them.
- Recurrence detection depends on matching a candidate against existing Active/Archived rules (read at `/memorise` time) — a re-phrased rule can under-count; the human disambiguates at the gate, `mem-search` is the backstop.
- Patterns that apply only "sometimes" don't fit the ALWAYS/NEVER format — don't force them.

## Transversal: Token Efficiency stack

Installed at bootstrap, not per workspace. Transparent to the user.

| Tool | Profile | What it does |
|------|---------|-------------|
| RTK | All | CLI proxy, 60-90% output compression (`rtk git`, `rtk grep`, `rtk ls`, …) |
| ccusage | All | Session token monitoring from local JSONL files |
| claude-mem | All | Zero-touch persistent memory via hooks |
| graphify | Technical | Code knowledge graph — read before any architecture question |
| jCodeMunch | Technical | Symbol-level code retrieval via AST — replaces full-file reads |
| context7 | Technical | Current library/framework docs — replaces web search |

Navigation order enforced in project CLAUDE.md (technical profiles):
1. Architecture question → `graphify-out/GRAPH_REPORT.md` → `graphify query`
2. Code symbol → `jcodemunch search_symbols` → `get_symbol`
3. Text search → `rtk grep`
4. Past context → `mem-search`
5. Full file read → last resort, prefer `get_file_outline`

## Transversal: .skills/
Available skills — never loaded globally, always via AGENT.md.
- Installed from the catalog or custom-built (if pattern repeats 3+)

## Transversal: ROADMAP.md (optional)
Project roadmap, generated by plan mode.
- Lives at the project root (not inside a workspace)
- Format adapted to profile: lean (solo) or structured (team/client)
- Referenced in CLAUDE.md via routing

## Standard reading flow

```
CLAUDE.md (routing + gotchas) → LEARNINGS.md (Active) + CONTEXT.md (brief + state) → AGENT.md (Rules) → [skills on-demand] → [mem-search if needed] → [DECISIONS.md if context missing]
```

With the Learning layer opt-in, workspace Learnings **and the `DECISIONS.md` ledger** are auto-injected at session start via the `SessionStart` hook — so they're in the agent's context before the first prompt, ahead of the normal reading flow. The Pre-work checklist in `AGENT.md` ensures the same rules are re-read by subagents the hook cannot reach.

Principle: token-efficient. Every file read must be justified.

## Bootstrapping — Unified flow

The bootstrap detects the user's situation and adapts its behavior.
Two adaptation axes: the **situation** (repo/plan) and the **profile** (technical/creative/beginner).

```
User input
    │
    ├── Existing repo detected? ──yes──→ Adaptive scan
    │       │no                              │
    │       ▼                                ▼
    ├── Profile inferred (silent) ◄──────────┘
    │   technical / creative / non-technical
    │       │
    │       ▼
    ├── Existing plan detected? ──yes──→ Plan analysis
    │       │no                              │
    │       ▼                                ▼
    ├── Propose Plan Mode (Opus)              │
    │   optional, user can skip              │
    │       │                                 │
    │       ▼                                 ▼
    └──────────────► Contextual bootstrap
                     (questions adapted to
                      what we already know
                      + vocabulary adapted to profile)
                          │
                          ▼
                     Workspace generation
```

### Profile classification

Silent inference from the scan and first answers.
No question asked — the profile refines through the conversation.

| Signal | Profile |
|--------|---------|
| Source code, config, detected stack | Technical |
| Markdown only, no code | Creative / Editorial |
| Nothing + non-technical description | Non-technical |

Impact: question vocabulary, tooling depth, token reducers proposed, catalog section consulted.

### Project classification

Silent inference after Q1 (or the scan). Combines with profile.

| Signal | Classification | Impact |
|--------|---------------|--------|
| Single deliverable, short deadline | Ephemeral | Lightweight mode (1 CLAUDE.md, no workspaces) |
| Data about real people (patients, students, medical, legal), activities with personal data (e-commerce, billing, CRM) | Sensitive data | Technical barriers: `.claudeignore` + `.gitignore` + `_private/` |
| Multiple people contributing ("there are X of us", "our team", volunteers). Exclude "my clients" = provider relationship, not team | Team | AGENT.md with coordination, structured ROADMAP |

Classifications combine and refine through the conversation.

### The 4 entry cases

| Case | Repo | Plan | Behavior |
|------|------|------|----------|
| A | No | No | Plan mode proposed → classic bootstrap (4 questions) |
| B | No | Yes | Plan analysis → lighter bootstrap (Q1-Q2 pre-filled) |
| C | Yes | No | Repo scan → plan mode proposed → contextual bootstrap |
| D | Yes | Yes | Repo scan + plan analysis → minimal bootstrap (validation) |

### Universal tooling

The search for existing tools (MCP, API, integrations) applies to ALL
tools mentioned by the user, not only technical stacks. Canva,
Scrivener, Teachable — everything goes through the same verification.

### Adaptive scan (cases C and D)

The scan must cost less than the questions it avoids.

```
Always (near-zero cost):
    ├── ls root + 1 level
    ├── git log --oneline -10
    └── Key files (package.json, Cargo.toml, README, CLAUDE.md)

If small project (< ~20 files):
    └── Supplementary reading possible

If large project:
    └── Stop — ask the user
        "It's a large repo, tell me in 2 sentences
         what matters and where you're at"
```

Principle: the scan must never cost more tokens than the questions it replaces.

If monorepo detected and sub-project chosen: re-scan only that sub-folder.
Ignore the rest of the repo going forward.

### Plan mode

- **Model**: Opus (strategic reasoning, one well-done pass)
- **Nature**: strategic conversation, not a form
- **Optional**: proposed, never imposed. Silent skip for ephemeral projects or simple personal use (< 3 modes, no sequential phases)
- **Behavior**: Opus asks the right questions based on what the user gives, challenges the plan AND self-critiques
- **Output**: ROADMAP.md at the root, format adapted to profile
- **End**: user chooses their model for the rest

Why Opus only here: it's the only step requiring deep strategic reasoning. Everything else (scan, bootstrap, generation, installation) is structured execution — Sonnet does the same job for less.

### Model selection

| Step | Model | Reason |
|------|-------|--------|
| Plan mode | Opus | Strategic reasoning, challenge, big picture |
| Repo scan | Sonnet | Reading + synthesis, no deep reasoning |
| Bootstrap (questions + generation) | Sonnet | Structured execution |
| Recommendations (skills, tools) | Sonnet | Pattern matching catalog → profile |
| Installation | Sonnet | CLI commands, verifications |

## Bootstrapping — Generation

→ `core/bootstrap/bootstrap-prompt.md`

The system does not provide templates to fill in.
The bootstrap generates a custom structure from the answers
and detected context (repo, plan, scan).
