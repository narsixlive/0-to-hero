# 0 to Hero — Bootstrap

You're going to help me create the structure of my project using the
0-to-Hero system (4-layer architecture: CLAUDE.md with routing + gotchas,
Workspaces with CONTEXT.md + AGENT.md, skills, persistent memory via claude-mem).

---

## Phase 0: Detection

Before asking any question, detect the situation.

### Step 1 — Quick scan (parallel commands, near-zero cost)

```bash
ls root + 1 level          # project structure
git log --oneline -10      # recent activity (if git repo)
cat package.json / Cargo.toml / pyproject.toml / go.mod  # stack (if present)
```

Also look for: existing CLAUDE.md, README, docs/, .planning/, ROADMAP.md

**Non-standard structure detection:**
```bash
ls **/*.ipynb 2>/dev/null | head -5     # Jupyter notebooks
ls packages/ apps/ services/ 2>/dev/null # monorepo patterns
```

If notebooks detected → note "data/notebook project" in the summary.
If a monorepo structure detected → ask:
> "I detect a monorepo structure (packages/, apps/, ...).
> Are we bootstrapping the whole project or a specific sub-project?"

If the user picks a sub-project: re-scan only the chosen sub-folder.
Ignore initial scan results outside that scope for everything that follows
(workspaces, tooling, recommendations).

### Step 2 — Evaluate the size

- **Small project** (< ~20 files): supplementary reading possible
- **Large project**: stop, don't scan further. Ask:
  > "It's a large repo, tell me in 2 sentences what matters and where you're at."

Principle: the scan must never cost more tokens than the questions it replaces.

### Step 2.5 — Classify the profile

From the scan (or its absence), infer the user profile.
No question asked — this is a silent inference.

| Signal | Inferred profile |
|--------|-----------------|
| package.json, Cargo.toml, go.mod, Dockerfile, src/ with code | **Technical** |
| .md only, no code, no config | **Creative / Editorial** |
| Nothing detected + non-technical description in Q1 | **Non-technical** |
| Detected stack + git log provided + advanced patterns | **Confirmed technical** |

The profile refines through the answers (Q1 can shift from non-technical to technical).

This profile silently conditions:
- The vocabulary used in questions (see Phase 2)
- The depth of tooling recommendations
- The token reducers proposed (or not)
- The catalog section consulted (dev vs transversal)

### Step 2.7 — Classify the project

From Q1 (or the scan), silently infer the project characteristics.

| Signal | Classification | Impact |
|--------|---------------|--------|
| Single deliverable, short deadline, no foreseeable iteration | **Ephemeral** | Lightweight mode: 1 CLAUDE.md (routing + context + rules), no workspaces, no .memory/, no .skills/ |
| "patients", "students", medical/legal/coaching context, data about real people, activities structurally involving personal data (e-commerce, billing, CRM, recruitment) | **Sensitive data** | Technical barriers: `.claudeignore` + `.gitignore` + `_private/` |
| "there are X of us working", "our team", "the volunteers", multiple people contributing to the project | **Team** | Enriched AGENT.md (coordination, handoff between members), structured ROADMAP format |

**Team false positive:** "my clients", "for my clients", "client relationship",
"my patients" do NOT trigger team mode. That's a provider/client relationship —
not a team contributing to the same project. Team signal = multiple people
working together ON the project, not "I have a clientele".

These classifications combine (a project can be team + sensitive data).
They refine through the answers — Q1 can reveal an ephemeral project,
Q4 can reveal sensitive data.

**Lightweight mode (ephemeral projects):**
```
my-project/
├── CLAUDE.md    ← routing + context + rules, all in one
└── (no workspaces, no .memory/, no .skills/)
```
Do not propose plan mode for an ephemeral project.

**Sensitive data — technical barriers:**

Automatically generate at the project root:

1. **`_private/`** — folder dedicated to files containing personal data
2. **`_private/README.md`** — explains the principle:
   > This folder is excluded from Claude and from git.
   > Put here any files containing personal data
   > (client records, patients, invoices, etc).
   > Claude cannot read them and git will not commit them.
3. **`.claudeignore`** — add `_private/` (create the file if it doesn't exist)
4. **`.gitignore`** — add `_private/` (create or append)

Explain the system to the user at generation time:
> "I created a `_private/` folder for your sensitive data.
> Claude cannot read this folder and git won't commit it.
> Put anything containing personal data there."

No Gotcha rule needed — the technical barriers are enough.

If sensitive data is revealed after generation (in Q4 or later):
retroactively generate the same barriers and explain the system.

### Step 2.9 — Light .md scan (if no git repo)

If no git repo is detected but files exist in the folder,
look for a `.md` that describes the project before asking Q1 blind.

1. Priority candidates: `README.md`, `spec.md`, `*-spec.md`, `project.md`,
   or the largest `.md` at the root
2. Read the first 30 lines of the best candidate — no more
3. If the content describes the project (objective, context, stack) → pre-fill Q1
   and switch to Case A' (light summary + confirmation)
4. If nothing useful → normal Case A

Cost: one read of max 30 lines. Gain: potentially skip Q1 entirely.

### Step 3 — Classify the situation

| Detected | Case | Next action |
|----------|------|-------------|
| No repo, no plan, no descriptive .md | A | → Phase 1 (plan mode) |
| No repo but descriptive .md found | A' | → Light summary + pre-filled Q1 + Phase 2 |
| Plan but no repo | B | → Phase 1.5 (plan analysis) then Phase 2 |
| Repo but no plan | C | → Show summary, then Phase 1 (plan mode) |
| Repo + plan | D | → Show summary + plan analysis, then Phase 2 |

**Case A' — light summary (files without git):**
> "I see: [detected files], [content type]. No git repo.
> Based on [file.md], your project is: [1-line summary]."
> "Is that right?"

The user confirms or corrects. Then continue with Q2.

**Cases C and D — repo summary:**
If a repo is detected, show the summary in 3 lines max:
> "I detect: [project type], [X commits], last activity [date].
> Stack: [detected languages/frameworks]."

Then ask a single question:
> "Where are you at? (beginning / mid-way / stuck / rework)"

---

## Phase 1: Plan Mode (Opus) — optional

**Propose, never force.** If the user already knows what they want to do, skip.

### Complexity filter — do NOT propose plan mode if:

- The project is classified as **ephemeral**
- The project is **simple personal use**: Q1 mentions "manage", "organize",
  "track", "sort" without any building notion ("build", "launch", "deliver",
  "deploy", "publish", "develop")
- Fewer than 3 distinct work modes identified in Q2

Plan mode is justified when there are sequential phases, dependencies,
or an ambitious scope. For simple projects, go straight to bootstrap.

> "Do you want to structure your project into phases before starting?
> For this step I recommend Opus — it's the strongest model
> for strategic reasoning. One pass is enough to structure
> your project. After that, you choose whatever model you want."

### If the user accepts

Switch to Opus. Plan mode is a **strategic conversation, not a form**.

Expected Opus behavior:
- Read what the user gives (free description, no imposed format)
- Ask THE right questions — not a fixed list, questions depend
  on what the user said AND what they didn't say
- Challenge the plan: "Have you thought about Y which blocks before X?"
- Challenge the scope: "That's ambitious for solo work, should we prioritize?"
- Self-critique: "I'm proposing 5 phases but honestly phases 3 and 4
  could merge, I'm only separating them if..."
- Be honest about limits: "I don't have enough context on X,
  tell me more before I structure this"
- If a repo was scanned, account for what already exists in the plan

Iterate until both parties are satisfied.

### Generate ROADMAP.md

Format adapted to the user's profile (inferred from answers, not asked):

**Solo / personal project:**
```markdown
## Phase 1 — Clear name
What we're doing and why.
Done when: [one concrete sentence]
```

**Project with audience / team / client:**
```markdown
## Phase 1 — Clear name
Objective: ...
For whom: ...
Deliverable: ...
Done when: ...
Depends on: Phase X (if applicable)
```

No dates (user adds them if they want).
Light enough to fit on one screen.

### End of plan mode

> "Here's the roadmap. Which model do you want for the rest?
> I recommend Sonnet — this is structured execution from here."

The user chooses. Continue with the chosen model.

### If the user refuses plan mode

Skip directly to Phase 2 (bootstrap questions).

---

## Phase 1.5: Existing plan analysis (cases B and D)

If the user provides an already-made plan (pasted in chat, file, existing ROADMAP.md):

1. Extract: overall objective, phases/steps, implicit stack, deliverables
2. Show the summary: "Here's what I understand from your plan: ..."
3. User confirms/corrects
4. Use this info to pre-fill the bootstrap questions

---

## Phase 2: Bootstrap questions

Questions adapted based on already-collected context.

### Case A (nothing detected, no plan) — 4 questions

Ask them ONE BY ONE. Wait for the answer before moving to the next.
The wording adapts to the inferred profile (step 2.5). The answer to Q1
can shift the profile — adapt subsequent questions accordingly.

1. **The project** — What is your project in one sentence?

2. **Work modes** — adapted to the profile:

   **Technical profile:**
   > "When you work on it, what types of tasks do you alternate between?
   > For each, describe in 2-3 sentences: what do you concretely do?
   > Who is it for? What's the deliverable?
   > (e.g.: plan/code/document, debug/review/deploy)"

   **Creative / non-technical profile:**
   > "When you work on it, what do you concretely do day-to-day?
   > Describe each activity in 2-3 sentences: what is it, who is it for,
   > what does it produce at the end?
   > (e.g.: write texts, create visuals, organize content,
   > respond to messages)"

   → We're looking for 2-4 modes max.

3. **The tools** — adapted to the profile:

   **Technical profile:**
   > "What do you use? (languages, frameworks, CLI tools, services)"

   **Creative / non-technical profile:**
   > "What tools do you use? (apps, websites, software)
   > Even basic stuff counts: Word, Notion, Canva, Google Docs..."

4. **Rules and pitfalls** — Things to always respect?
   Past mistakes or headaches not to repeat?

### Case B (plan provided, no repo) — 2 questions

Q1 and Q2 pre-filled from the plan, shown for confirmation.
Ask Q3 and Q4 normally.

### Case C (repo scanned, with or without plan mode) — adaptive

Q1 pre-filled from the scan. Q3 pre-filled (detected stack).
Q2 proposed from modes detected in the code/git.
Ask Q4 normally (the scan doesn't detect human pitfalls).

### Case D (repo + plan) — validation

Almost everything is pre-filled. Show the complete summary.
User validates or adjusts. Ask Q4.

---

## Where to generate (explain to the user)

Before generating, confirm the target folder with the user.
The 0-to-Hero structure is created **at the root of the existing project**:

```
my-project/                  ← the user's repo/folder
├── CLAUDE.md                ← routing + memory routing + Gotchas section
├── ROADMAP.md               ← roadmap (if plan mode was used)
├── .claude/
│   └── commands/
│       ├── memorise.md      ← session recap + workspace thread update
│       └── gotcha.md        ← one-line rule appender to CLAUDE.md Gotchas
├── planning/                ← workspace 1
│   ├── CONTEXT.md           ← brief + Current state + Thread (updated by /memorise)
│   └── AGENT.md
├── src/                     ← workspace 2 (can be an existing folder)
│   ├── CONTEXT.md           ← brief + Current state + Thread (updated by /memorise)
│   └── AGENT.md
└── .skills/
    └── INDEX.md
```

Rules:
- If a CLAUDE.md already exists, apply the rule based on its state:

  **Case 1 — Short and structured** (recognizable sections/table):
  Merge directly — add the 0-to-Hero routing as an additional section.

  **Case 2 — Long or free prose**:
  Propose a rework. Show the user what we'd keep vs what we'd restructure,
  and propose a condensed version that integrates the routing.
  User validates or adjusts. One CLAUDE.md at the end — no satellite file
  (a second file would either not auto-load, or double the startup tokens).

  **Case 3 — Fundamental contradictions** (the existing CLAUDE.md contradicts
  how 0-to-Hero works: no sub-folders, no agents, etc.):
  Flag the conflict and let the user decide:
  > "Your current CLAUDE.md works differently from 0-to-Hero on [specific points].
  > You have two options:
  > 1. We adapt your CLAUDE.md to integrate the workspace system
  > 2. You keep your structure — I'll explain how 0-to-Hero works
  >    and you pick what interests you"
  Write nothing until the user has decided.
- Workspace names come from the answers to question 2 — no generic names
- Workspaces can reuse existing project folders (e.g.: `src/`, `docs/`)
- `.memory/` and `.skills/` are always dotfiles (hidden by default in file browsers)
- Do NOT create a `0-to-hero/` sub-folder or similar — everything is flat at the root
- If ROADMAP.md exists (from plan mode), CLAUDE.md points to it in its routing

If the user doesn't have a project yet, ask them to create the folder first.

## Existing tooling (before coding)

Before generating the workspaces, check for each identified work mode
whether a tool already exists that does the job: MCP server, CLI,
lib, API. The goal is to avoid building what already exists.

**This search applies to ALL tools mentioned in Q3, regardless of
profile.** A non-technical tool (Canva, Scrivener, Teachable, SPSS...)
may have an MCP server or usable API. For each tool mentioned:
1. Check if an MCP server exists (mcp.so, GitHub `topic:mcp-server [name]`)
2. Check if a usable API/integration exists
3. Verify that usage is allowed by the service's ToS —
   some services explicitly forbid bots and unofficial integrations
   (Instagram/Meta, LinkedIn, WhatsApp...). An unofficial MCP may exist
   but expose the user to a ban. In that case: don't recommend it.
   Mention the official API if one exists.
4. If yes and allowed → mention it in the AGENT.md of the relevant workspace
5. If no → do nothing (no mention of "no integration available")

### Adapt depth based on profile

**Technical profile** → full comparison table (see below)
**Creative / non-technical profile** → skip the table, propose directly:
> "For [this work mode], I recommend [tool X] — it does [Y]
> without any coding. Want to install it?"
Only present one option per mode unless the choice is genuinely open.

### Where to look
- MCP servers: mcp.so, mcpmarket.com, GitHub `topic:mcp-server`
- CLI / libs: GitHub, PyPI, npm depending on the language
- APIs: SaaS services with free tier

### How to present options (technical profile)

For each workspace, present a comparison table:

| Option | Type | Advantages | Disadvantages | Estimated tokens |
|--------|------|------------|---------------|-----------------|

Fill in the columns:
- **Advantages**: ready to use, maintained by others, reliability, speed
- **Disadvantages**: external dependency, limits, configuration, potential cost
- **Estimated tokens**: relative estimate of Claude consumption to reach the result
  - Existing tool → low (config + usage)
  - Existing lib + glue code → medium (integration + debug)
  - Code from scratch → high (dev + debug + maintenance)

### Decision rule

```
Existing tool that does 80%+ of the job → use it
Existing lib + glue code               → if no complete tool
Code from scratch                      → last resort, justify why
```

Custom code is justified when:
- No tool covers the need
- The existing tool is abandoned or unstable
- The need is too specific for a generic tool
- The user wants to learn by coding (ask them)

The user validates the tooling choice before moving to generation.
This choice impacts the AGENT.md files (an agent using an MCP server ≠ an agent coding a scraper).

## Generation

Once the answers are collected, generate the complete structure:

### CLAUDE.md (routing + memory routing + gotchas)

Built on top of the `core/templates/CLAUDE.template.md` base, which provides
the reusable sections: Shell / Navigation / Modifications / Startup / Memory / Gotchas.

Add project-specific sections **above** the base:
- Project identity in 1 line
- Routing table: intent → workspace → reading order
- Pointer to ROADMAP.md if it exists
- Naming conventions if relevant
- 2-3 project-specific rules max

Short and scannable — if you scroll, it's too long.

### One workspace per identified mode, each with:

**CONTEXT.md** (brief + living thread)
- Brief zone (above the `<!-- END BRIEF -->` marker, stable):
  - What we do here, for whom, why
  - Known constraints
  - What makes a good deliverable
  - 80% work description / 20% behavior max
- Living zone (below the marker, maintained by `/memorise`):
  - `## Current state` (overwritten each session, 3-5 lines)
  - `## Thread` (new entry appended on top, pruned to 5 most recent)

**AGENT.md** (the specialist — dense and actionable)
- Role in 2-3 lines
- Concrete capabilities
- Numbered process (what the agent does in order)
- Limits (what it does NOT do, what it never decides alone)
- Skills section (empty for now, filled at the Catalog step)
- Gotcha line: refer to the Gotchas section of the root CLAUDE.md; propose additions via `/gotcha`

Q4 errors (if any) are injected directly into the Gotchas section of the root
CLAUDE.md, format: `NEVER/ALWAYS [action] ([why])`. No separate GOTCHA.md file.

### Transversal files
- `.claude/commands/memorise.md` — copy from `core/templates/commands/memorise.md`. Triggers session summary to claude-mem + per-workspace CONTEXT.md thread update.
- `.claude/commands/gotcha.md` — one-line rule appender to the Gotchas section of the root CLAUDE.md (format: `NEVER/ALWAYS [action] ([why])`).
- `.skills/INDEX.md` — empty table, ready to receive.

## Recommendations (skills + token reducers)

After workspace generation, present all recommendations
in a single block for the user to validate at once.

### Skills

1. Consult `catalog/skills-database.md` internally
2. For each generated workspace, identify matching skills
3. Propose a shortlist with for each skill:
   - The relevant workspace
   - Why this skill is relevant for THIS specific profile
   - Recommended mode (always or on-demand) and why

### Token Reducers

Tools that compress CLI command output before it reaches
the context — typical savings of 60-90% of tokens.

| Tool | What it does | Installation |
|------|-------------|-------------|
| **RTK** | Rust CLI proxy, 34 filtering modules, zero dependencies. Compresses git, cargo, npm, docker, etc. 60-90% savings. | `curl -fsSL https://rtk.sh \| sh` |
| **ContextZip** | Extends RTK: stacktrace compression (Node/Python/Rust/Go/Java), ANSI cleanup, web extraction. +10-20% beyond RTK. | `curl -fsSL https://raw.githubusercontent.com/jee599/contextzip/main/install.sh \| bash` |
| **ccusage** | Monitoring: reads Claude Code's local JSONL files and displays consumption metrics per session. Essential to measure savings. | `npx ccusage@latest` |

### Recommendation by profile

RTK and ccusage are installed automatically for all profiles.
RTK compresses all CLI output (git, ls, etc.) — it benefits everyone,
not just devs. ccusage monitors token consumption — essential for any profile.

- **RTK** → always, all profiles
- **ccusage** → always, all profiles
- **ContextZip** → only technical profile with frequent debugging or stacktraces

### Memory & Navigation Tools

Tools that structure how Claude accesses project memory and navigates code —
complementary to Token Reducers.

| Tool | What it does | Installation |
|------|-------------|-------------|
| **claude-mem** | Persistent cross-session memory (SQLite + Chroma, local). Powers `/memorise` and `mem-search`. Mandatory base of the memory architecture. | `npx claude-mem@latest install` |
| **jCodeMunch** | Code navigation by symbol (`search_symbols`, `get_file_outline`, `get_symbol_source`) instead of full-file reads. | MCP server install |
| **graphify** | Project knowledge graph (architecture map, god nodes, cross-file relations). | See catalog |
| **Context7** | Up-to-date documentation for external libraries (MCP server). | MCP server install |

**Recommendation by profile:**
- **claude-mem** → always, all profiles (base of the memory routing)
- **jCodeMunch** → recommended for any code-heavy project
- **graphify** → recommended for multi-project or large codebases
- **Context7** → recommended when external libs/APIs are used

### Validation

Present skills and token reducers together in a single summary table.
User validates or adjusts everything before moving to feedback.
Validated skills are added to AGENT.md files and .skills/INDEX.md.

## Installation (automatic after validation)

Once the user has validated the recommendations, offer
to install the tools that aren't already present.

### Process
1. Check what's already installed (`rtk --version`, `ccusage --version`, etc.)
2. List what's missing with the installation command
3. Ask for user confirmation
4. Install and verify everything works
5. Flag incompatibilities (e.g.: ContextZip hooks on Windows)

### What we install
- Validated **token reducers** (RTK, ContextZip, ccusage)
- **MCP servers** validated at the Tooling step (e.g.: linkedin-mcp-server)
- **Skills** that require installation (e.g.: npx for some skills)

Never install without explicit agreement. Present the complete list
and let the user choose what to install now vs later.

## Feedback

After installation, ask:
> "Anything to adjust? A workspace that's unclear, a missing work mode,
> an agent that doesn't fit?"

Iterate until the user has validated.

## Generation rules
- Each file has ONE job. No duplicated content between files.
- Standard reading order: CONTEXT.md → AGENT.md → CLAUDE.md (Gotchas section)
- Skills in always or on-demand mode, never globally
- Gotchas live in the root CLAUDE.md; the agent proposes additions via `/gotcha`, the user validates.
- Memory is routed: `/memorise` for session recap (claude-mem + workspace CONTEXT.md), `/gotcha` for mistakes (CLAUDE.md Gotchas), "remember forever" for permanent preferences (Claude native memory).
- Token-efficient: no prose, no filler
- Generate custom content based on the answers — no generic content
- Content must be realistic and specific to the profile, not placeholders

## Workspace memory pattern

Each workspace's `CONTEXT.md` has two zones separated by the `<!-- END BRIEF -->` marker:

- **Brief zone** (above marker, stable): Project / Constraints / Deliverable. Regenerated only at bootstrap or major pivot.
- **Living zone** (below marker): `## Current state` (overwritten each `/memorise`) + `## Thread` (new entry appended on top, pruned to 5 most recent).

The `/memorise` command:
1. Generates the global session summary captured by claude-mem.
2. Identifies the workspace(s) touched in the session (based on files edited).
3. Updates the `CONTEXT.md` of each touched workspace, respecting the 2 zones:
   - Never edits the brief zone.
   - Overwrites `## Current state` with a 3-5 line status.
   - Appends a new entry to `## Thread` and prunes to 5.

Rationale: the agent of a workspace should resume "where we were" without being polluted by other workspaces' context. claude-mem keeps the long history globally; each workspace's CONTEXT.md keeps the last 5 sessions locally.
