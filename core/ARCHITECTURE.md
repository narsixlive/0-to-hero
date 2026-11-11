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
- **CONTEXT.md** (situational): Brief zone (stable: work, project, audience, constraints) + Current state (one block per recent session, written by the scribe; injected by `inject-journal.sh`) + Thread (legacy, no longer appended: `JOURNAL.md` is the history)
- **LEARNINGS.md** (the workspace rule register, Durcir lifecycle): `## Active Learnings` (`ALWAYS/NEVER [action] ([why]) (since date) [evidence]`, auto-injected, no counter) + `## Candidates` (scribe inbox, not injected, expires at 30 days) + `## Archived Learnings` + `## Drift log`. Two levels: L1 here → L3 root Gotchas via `/gotcha`
- The essentials fit on one screen; 80% work description / 20% behavior max

### Layer 3: AGENT.md — The specialist
Brain of the workspace. Transforms Claude into a specialist.
- Pre-work checklist (header): forces reading `LEARNINGS.md` `## Active Learnings` + this file's `## Rules` and applying every rule before any task
- `## Rules` is the owner's hand-written doctrine for the role (process steps, hard limits); validated workspace rules live in `LEARNINGS.md`, cross-workspace ones in the root Gotchas
- Role, capabilities, skills, process, limits
- Invocation scope: when to call this agent, when NOT to
- Dense and actionable (no prose, only instructions)
- Skills in `always` or `on-demand` mode

## Facts of record + archives

- **DECISIONS.md** (project root) — three zones since durcir-v2. `## Facts (current)`: the project as it stands (domain, app name, prod host, accounts, pricing, commitments), **one line per key** `- **Key**: value (since date)`, replaced in place by `/memorise` when the value changes (the scribe only marks a line `⚠ disputed → new`), so the section is bounded by the number of keys and **injected whole at every SessionStart**. `## Ledger (facts of record)`: the dated log of decisions and irreversible events, newest first, append-only; only the 5 newest are injected, the rest is the searchable trace. `## ADR archive`: structural rationale (tool choices, workspace split, naming) — NOT injected, consulted on demand. Why the split: states and events age differently — a recency window is right for events and wrong for states (a host chosen in June must still be in context in December, whatever happened since). Every injected surface must be bounded by construction, not by a window; before v2 the Ledger was the only unbounded one. The injected sections exist because an empty, on-demand-only file is invisible and stays unused — that's how important facts get lost.
- **Memory scribe** — background sorter that writes the history (`JOURNAL.md`, `## Current state`) from the transcript while the session runs, marks a changed Facts value as disputed, and queues every judgement in `## Proposals` / `## Candidates` for the owner (see Transversal: Memory scribe). **claude-mem** stays as the read-only archive of sessions before 2026-11-09 (`mem-search`).

## Optional: Workspace map — a parent `CLAUDE.md` above several projects

When several bootstrapped projects live under one folder (`~/work/*`), Claude Code loads a `CLAUDE.md` placed in that parent folder in **every** session below it, by walking up the directory tree. That file is the cross-project map — the answer to "has another project already built this?", which no per-project file can give and which grep cannot either (you only search for what you already suspect exists).

- **Three sections, nothing else**: `## Projects` (one table row each: role, stack, one note, plus which projects orbit which), `## Reusable bricks` (hooks, skills, utilities another project can call as-is — path + who else could use it), `## Machine conventions` (facts shared by 2+ projects: where secrets live, the alert channel, the scheduler, the global hooks).
- **Hard cap ~80 lines.** It is a tax on every turn of every project. A line stays only if it saves a rewrite or a search.
- **Never holds** progress, session state or behavioral rules — the Ledger, `CONTEXT.md` and Learnings own those. A map that carries state rots within a week.
- **Fed by `/memorise`** (step "Workspace map"): proposes a line only on four triggers — new reusable brick, brick moved/removed or endpoint dead, new project or changed role, convention now shared by 2+ projects. User validates.
- **Machine-local by nature** (paths, bots, local services): keep it out of any published repo. Scaffold from `core/templates/WORKSPACE-MAP.template.md`.
- Why a flat file and not a knowledge graph: see the ADR archive (2026-11-10).

## Repo layout — workspaces vs support

- **A workspace = a folder containing `AGENT.md`, listed in the Routing table.** That marker file is the single source of truth — enumerate workspaces with `find AGENT.md`, never by guessing folder names. The number of non-workspace folders is then irrelevant to routing: clutter can never be mistaken for a workspace.
- **Everything else at the root is support** — `.claude/` (config), `.github/` (CI), `_private/` (sensitive data), local data/output, and `docs/`. Declared in CLAUDE.md `## Structure`, never routed.
- **All meta-docs live in `docs/`** — roadmap, construction/reference plan, audits, readiness, research. Never at the root. Routing points to the *living* ones (`docs/ROADMAP.md`, `docs/PLAN.md`); finished/snapshot docs sit in `docs/` unreferenced. A doc is findable because something **points** to it, not because of its location.
- **`docs/` is reserved for meta-docs — never name a workspace `docs/`** (a documentation workspace takes a role name like `documentation/`). The SessionStart hook flags any folder with `AGENT.md` that CLAUDE.md doesn't reference, so the Routing table can't silently drift from reality.

## Workspace + existing code

The rule applies to **any workspace folder that contains code** — not only `src/`.
The folder name reflects the domain: `src/` for apps, `scripts/` for runnables,
`app/`, `backend/`, `notebooks/`, `services/`, etc. Whichever name the project
naturally uses, the same separation applies:

**Never mix agent files with the code.** The workspace files (CONTEXT.md, AGENT.md)
live at the workspace root. Code goes into a named sub-folder.

Convention: `<workspace>/code_<descriptor>/`

`<descriptor>` is a short label that distinguishes this code from other code that could live in the same workspace — typically the **language** (`code_python/`, `code_rust/`), the **target** (`code_linkedin/`, `code_indeed/` for scrapers), the **role** (`code_api/`, `code_worker/`), or `code_common/` for shared helpers. It is NOT derived from the workspace name.

**Commands run from the project root.** Code in `code_*/` folders means the build tool's manifest is nested, and every `uv run` / `pytest` / `npm test` then makes Claude `cd` into it. Declare the code folders in a root-level workspace manifest instead — a virtual root `pyproject.toml` with `[tool.uv.workspace] members = ["*/code_python"]`, a `pnpm-workspace.yaml`, a Cargo `[workspace]` — and write in `CLAUDE.md` that commands run from the root (`uv run --package <name> …`, `pnpm --filter <name> …`). The memory hooks resolve the project root from where the session started, so a `cd` does not lose memory; the manifest keeps sessions simple anyway.

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

## Transversal: Memory scribe

Continuous memory capture — a background scribe writes the memory files while the session runs,
so nothing depends on a ritual at the worst moment (owner leaving, context full).

```
turn ends ──Stop / SessionEnd hook──▶ scribe-trigger.js ──queue + spawn──▶ scribe-worker.js
                                       (async, fail-open)                   │ transcript delta from a durable cursor,
                                                                            │ deterministic trim, no call without signal
                                                                            ▼ one lean `claude -p` call per project (≤ 5 min batch)
JOURNAL.md                       ◀── scribe-writer.js ◀── proposal, every evidence id verified against the delta
                                        (one block per session: did / next / dated events; re-written at each run of that session; 3 newest injected)
<ws>/CONTEXT.md ## Current state        (one block per recent session; a parallel session's block is kept, not erased)
DECISIONS.md ## Facts (current)         (NEVER overwritten: a changed value marks the line `⚠ disputed → new (date)` and queues a proposal)
DECISIONS.md ## Proposals               (new key, changed value, [fix] hypothesis — NOT injected, /memorise: y → Facts, n → archive; 60 days → archive)
<ws>/LEARNINGS.md ## Candidates         (at most one rule per run — NOT injected, reaches ## Active Learnings only through the owner; 30 days → archive)
```

The scribe is a sorter, not a writer of record: it writes history directly (journal, current state) and queues every judgement for the owner. The queue is on disk, never in anyone's head, so a `/clear` or a month without `/memorise` loses nothing: unreviewed items expire to their archive sections, nothing injected changes without the owner. **The stack never nags**: no line in the session, no threshold; the terminal statusline `✉ N` and the VS Code sidebar (`tools/claude-hub/`) show the count passively. `/memorise` is a short popup (three grouped `AskUserQuestion`s at most: disputed Facts, new facts, fixes; rules with `--rules`), skippable without consequence.

**History at session start.** A second SessionStart hook, `inject-journal.sh`, injects under its own 10k cap: a coverage line ("history covered up to <date>; N turns not yet read"), the 3 newest `JOURNAL.md` blocks and each workspace's Current state. This is the part claude-mem used to provide (20 observation titles + the last session summary), now produced by the scribe at no extra model cost, and bounded.

**Evidence rules the model cannot bend.** A tool id that is a Read of a memory file (LEARNINGS / DECISIONS / CONTEXT / JOURNAL / handovers) is never evidence: memory cannot be its own proof. A candidate rule whose wording appears inside a tool RESULT (a README, a web page, a mail) is dropped: data mirrored as an instruction. One candidate per run at most; an obvious code/hook/test fix is queued as `[fix]` instead of a rule.

- **Writes evidence or nothing.** A fact or state line without a `toolu_…` id (or an owner quote) found in the delta is rejected. Candidates are deduped fuzzily against Active / Archived / Candidates.
- **Bounded cost.** Per-session and machine-wide daily token caps hold the delta instead of dropping it; a cap hit prints at the next Stop and, if configured, posts to Discord. One run ≈ 25-30k tokens (≈ $0.15-0.20 list).
- **Durable, never loses a line silently.** A missing destination (no `CONTEXT.md`, no `## Ledger`, unknown workspace) is an apply error, never a quiet skip; a delta that errors 3 times is dropped and the alert names it (`MAX_APPLY_FAILURES`). Cursors advance only over what was sent *and* applied; oversized deltas are cut at a line and re-queued; `/clear` or a crash leaves the queue intact for the next run. `journal.jsonl` records every run.
- **Visible.** `✍` segment in the terminal statusline (`✍✓` safe to `/clear`, `✍ N` lines pending, `✍⏳` running), the Stop hook's one-line report in any host, optional sidebar badge per project. Files, install, env and state: `core/hooks/scribe/README.md`.

**Project root — one rule for every hook.** The project root is the nearest folder at or above the session's start folder (`CLAUDE_PROJECT_DIR`, fixed by Claude Code for the whole session) that holds both `CLAUDE.md` and `DECISIONS.md`. The injector, the scribe and the statusline all use it, so a Bash `cd` into `<ws>/code_python/` or into a sibling project never moves memory, and a sub-folder with its own CLAUDE.md (instructions for a code folder) still belongs to its project. A parent folder with only a `CLAUDE.md` (a workspace map) is never a project. `DECISIONS.md` is the opt-in marker: no `DECISIONS.md`, no memory. Optionally restricted to folders listed in `SCRIBE_ROOTS`.

**Light projects** (no folder with an `AGENT.md`): the root is the only workspace, written as `.` — the scribe puts rule candidates in the root `LEARNINGS.md`, never state (there is no `CONTEXT.md`); the resume point is the root `JOURNAL.md`, written and injected like everywhere else. Once a first workspace exists, `.` is refused and the root file's candidates are moved by the owner (`/memorise --rules`).

**claude-mem** stays installed as the read-only archive of what happened before (`mem-search "…"` over 42k observations) and for `save_memory` notes; its observation and summary capture is disabled (`CLAUDE_MEM_DISABLE_OBSERVATION` / `CLAUDE_MEM_DISABLE_SUMMARY`), which removed one Sonnet call per tool use, and its SessionStart injection is off for the Durcir projects (`CLAUDE_MEM_EXCLUDED_PROJECTS`; this also blocks its work-state and `save_memory` writes there). Rollback criterion and figures: ADR 2026-11-09.

## Transversal: Learning layer (Durcir)

Self-improving agents, folder-based, opt-in per project. A rule enters the injected set only through the owner; everything the machine finds waits, bounded, and expires.

Three moving parts:
1. **`LEARNINGS.md` per workspace** — `## Active Learnings` (`ALWAYS/NEVER [action] ([why]) (since date) [evidence]`, injected, ~5) + `## Candidates` (scribe proposals, at most one per run, not injected, 30-day expiry) + `## Archived Learnings` (declined / expired / code-enforced, kept, not injected) + `## Drift log` (rules ignored despite being capitalized). Kept separate from `CONTEXT.md` so the situational context stays pure.
2. **`/memorise`** — optional, short: three grouped questions at most (disputed Facts, new facts, fixes; rule candidates with `--rules`, Ledger with `--all`). Before a rule is offered, a verdict line from reading the code: enforced already → archive; an obvious fix → the fix, not the rule. Declined → archived, never deleted; skipped → expires on its own.
3. **Two `SessionStart` hooks** — `inject-learnings.sh` (Active rules + `## Facts (current)` whole + 5 newest Ledger lines, `**Key** changed` lines skipped since Facts carries them, ≤ 9.8k chars) and `inject-journal.sh` (coverage line + 3 newest journal blocks + Current state per workspace, ≤ 9k chars). Two hooks because each output has its own 10k cap: history never competes with rules for the budget.

The ladder:
- **L1 — Active Learnings** (`LEARNINGS.md`): workspace-scoped, injected, dated, with evidence. No counter: repetition is not authority (the old `×N` counted tool ids, not independent incidents, and drove graduation by feel).
- **L3 — Cross-workspace doctrine** (root `CLAUDE.md ## Gotchas`, via `/gotcha` only, cap 12): cross-workspace or high-criticality rules. A rule moved here is removed from Active. The former L2 (`AGENT.md ## Rules` as a maturity step) is gone: same scope and injection as L1, no criterion once the counter went; `AGENT.md ## Rules` remains what the owner writes by hand.

Why this shape:
- **Blast radius decides the gate, not who writes**: history (journal, state) is written automatically because it is append-only, dated, not an instruction; facts and rules change what every session believes, so they wait for the owner.
- **Decay instead of review**: what nobody confirms disappears from the inbox on its own, so the inbox is bounded without a human and the stack never needs to interrupt.
- **Two-stage gating**: the LLM proposes, the user validates. Prevents prompt pollution and drift. Confirmed independently (2026-11-11) by two models designing a memory stack from scratch: every other agent auto-writes and measures ~30 % stale facts.
- **Deterministic injection**: the hook guarantees agents see the Active rules; the Pre-work checklist in `AGENT.md` is the belt-and-suspenders backup (covers subagents the hook cannot reach).

Lineage: Jake Van Clief's "durcir tes règles capitalisées" / edit-source principle applied to a folder-based system, aligned with Anthropic's "keep the hot context lean, push detail to scoped files" and Karpathy's RAM/disk context model (Active = RAM injected, Archived/Drift = disk).

Installation: opt-in per project via `.claude/settings.json` pointing to the globally-installed hook. `/bootstrap-upgrade` migrates existing projects and stamps the stack marker `<!-- learning-stack: durcir-vN -->` in `CLAUDE.md ## Learning mode`. Versions: **v1** (2026-06) split `CONTEXT.md` rules into `LEARNINGS.md` with graduation and drift log; **v2** (2026-11) adds the memory scribe (`Stop` + `SessionEnd`, global), the `LEARNINGS.md ## Candidates` section it writes to, `/memorise` clause A0 and the workspace-map step, and freezes claude-mem capture. A project on an older marker is flagged by `/memorise` and migrated step by step by `/bootstrap-upgrade` (section "Durcir v2 migration"). `/memorise` reads that marker and offers the upgrade when a project is behind.

Limits:
- Proposed Learnings can be noisy; the two-stage gating filters them.
- Recurrence detection depends on matching a candidate against existing Active/Archived rules (read at `/memorise` time) — a re-phrased rule can under-count; the scribe's fuzzy dedup (polarity + 60 % shared words) and the human at the gate disambiguate.
- Patterns that apply only "sometimes" don't fit the ALWAYS/NEVER format — don't force them.

## Transversal: Token Efficiency stack

Installed at bootstrap, not per workspace. Transparent to the user.

| Tool | Profile | What it does |
|------|---------|-------------|
| RTK | All | CLI proxy, 60-90% output compression (`rtk git`, `rtk grep`, `rtk ls`, …) — wraps shell commands only; harness tools (Grep/Glob/Read) are used directly |
| ccusage | All | Session token monitoring from local JSONL files |
| Memory scribe | All | Background memory sorter, one lean model call per project per 5 min at most (`core/hooks/scribe/`) |
| Claude Hub | All (VS Code) | Sidebar: usage, recent projects, scribe badge, passive memory inbox `✉ N`, "run the scribe now" (`tools/claude-hub/`) |
| claude-mem | All | Read-only archive of sessions before 2026-11-09 (`mem-search`); capture and SessionStart injection disabled (a frozen feed was two competing histories) |
| jCodeMunch | Technical | Symbol-level code retrieval via AST — replaces full-file reads of code |
| context7 | Technical | Current library/framework docs — replaces web search |

Navigation routed by target in project CLAUDE.md (technical profiles) — conditional, no strict order:
- Code symbol → `jcodemunch search_symbols` → `get_symbol` (full-file Read only if the outline is not enough)
- Markdown / docs / config → direct Read, no restriction
- Text search → Grep tool (shell fallback: `rtk grep`)
- Past context → injected `DECISIONS.md` Facts + Ledger → `mem-search` for history older than the scribe

## Transversal: .skills/
Available skills — never loaded globally, always via AGENT.md.
- Installed from the catalog or custom-built (if pattern repeats 3+)

## Transversal: ROADMAP.md (optional)
Project roadmap, generated by plan mode.
- Lives in `docs/ROADMAP.md` (a meta-doc, not a workspace and not at the root)
- Format adapted to profile: lean (solo) or structured (team/client)
- Referenced in CLAUDE.md via routing — that pointer is what keeps it findable, not its location

## Standard reading flow

```
CLAUDE.md (routing + gotchas) → LEARNINGS.md (Active) + CONTEXT.md (brief + state) → AGENT.md (Rules) → [skills on-demand] → [DECISIONS.md ## ADR archive if the why is missing] → [mem-search for pre-scribe history]
```

With the Learning layer opt-in, workspace Learnings **and `DECISIONS.md` Facts + Ledger** are auto-injected at session start via the `SessionStart` hook — so they're in the agent's context before the first prompt, ahead of the normal reading flow. The Pre-work checklist in `AGENT.md` ensures the same rules are re-read by subagents the hook cannot reach.

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
| Single deliverable, short deadline | Ephemeral | Lightweight mode (1 CLAUDE.md, no workspaces, no DECISIONS.md → no memory) |
| One role, iterated over months | Light durable | CLAUDE.md + DECISIONS.md + JOURNAL.md, no workspaces; memory on, rules in root LEARNINGS.md |
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
- **Output**: `docs/ROADMAP.md`, format adapted to profile
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
