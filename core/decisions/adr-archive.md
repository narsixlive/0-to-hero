# ADR archive — 0 to Hero

Structural decisions of this repo: what changed, why, and the alternative considered. One H2 per decision, dated, oldest first. Consulted on demand, never injected.

---

## 2026-04-14 — Memory architecture: no separate GOTCHA.md

Gotchas moved from a dedicated `GOTCHA.md` per workspace into a single `Gotchas`
section inside the root `CLAUDE.md`. Fed by the `/gotcha` slash command.

**Why:** every token of CLAUDE.md loads for free at every session. A separate
GOTCHA.md required a Read call at startup — wasted tokens. Integrated into
CLAUDE.md, gotchas cost nothing extra.

**Alternative considered:** keep GOTCHA.md per workspace for scoping. Rejected
because gotchas are rarely workspace-specific (they're usually cross-cutting
mistakes like "never commit secrets", "always use rtk").

Reference: `core/decisions/memory-architecture.md`.

---

## 2026-04-14 — No `.memory/NOTES.md`, use claude-mem instead

The `.memory/NOTES.md` file per project was eliminated. Session memory is now
handled by claude-mem (automatic capture via hooks, queryable via `mem-search`).

**Why:** NOTES.md required manual upkeep and duplicated what claude-mem already
captures automatically. Claude-mem stores raw observations in SQLite and offers
progressive disclosure (search → timeline → get_observations) — strictly better
than a single markdown file.

**What about structural decisions?** Those are not session history — they go
here, in `DECISIONS.md` (archive, not auto-loaded, consulted on demand).

---

## 2026-04-15 — Workspace `src/` + existing code: `src/code_<descriptor>/` convention

When a workspace maps to `src/` and `src/` already contains code, never merge
agent files (CONTEXT.md, AGENT.md) with the code. Code moves into
`src/code_<descriptor>/`; agent files stay at `src/` root.

**Why:** mixing agent files and code clutters imports, breaks language tooling
(Python picks up CONTEXT.md as a stray file), and makes the workspace hard to
navigate. A named sub-folder keeps the code isolated while letting the agent
scope span all `code_*/` sub-folders.

**How to apply:** the `<descriptor>` is a short label that distinguishes this
code from other code that could live in the same workspace — typically the
language (`code_python/`), target (`code_linkedin/`), role (`code_api/`), or
`code_common/` for shared helpers. Used to disambiguate when multiple code
bases live under the same workspace.

---

## 2026-04-25 — Renamed `<firstword>` → `<descriptor>` in the workspace code-folder convention

The placeholder name `<firstword>` (and `<firstword_of_workspace>`) was misleading:
it suggested deriving the label from the workspace folder name, but examples
like `src/code_python/` and `scripts/code_linkedin/` have no such relationship.
Renamed to `<descriptor>` everywhere, with an explicit glose at first occurrence
in `core/ARCHITECTURE.md` and `core/bootstrap/bootstrap-prompt.md`.

**Why:** during a bootstrap-upgrade test, Claude tried to mechanically derive
the label from the workspace name, got stuck, and produced inconsistent
sub-folder names. Renaming + gloss eliminates the ambiguity.

**How to apply:** any reference to the rule (templates, archetypes, agent docs)
must use `<descriptor>` and refer to the language/target/role/common dimensions.

---

## 2026-06-14 — Durcir: rule-hardening lifecycle + LEARNINGS.md split

Workspace rules moved out of `CONTEXT.md` into a dedicated `LEARNINGS.md` per workspace, and gained a 3-level hardening lifecycle ("Durcir"): L1 `LEARNINGS.md ## Active Learnings` → L2 `AGENT.md ## Rules` → L3 root `CLAUDE.md ## Gotchas`. `/memorise` now bumps a `×N` counter on recurrence instead of skipping duplicates, proposes graduation at ×3 / stable / blocking / high-criticality (copy verbatim up a level, then remove from Active so the list drains upward), archives non-recurrent rules, and logs drift. A `## Drift log` measures the delay before a rule hardens. A `<!-- learning-stack: durcir-v1 -->` marker in CLAUDE.md lets `/memorise` detect stale projects and offer `/bootstrap-upgrade`.

**Why:** the previous single accumulating `## Learnings` list grew unbounded on long projects. The fix is a *flow* (graduation up, archival down) rather than a *cap*: rules earn their place by recurrence, the hot/injected surface stays lean, and the lifecycle machinery (counters, drift, archive) lives on its own surface so `CONTEXT.md` stays purely situational.

**Alternatives considered:**
- *Keep learnings in CONTEXT.md, graduation only* — rejected for the heavy variant: the drift log + counters pollute the situational context. The split gives the lifecycle its own file.
- *Arbitrary cap (top-5 injected)* — kept as a fallback for legacy `## Learnings`, but superseded by recurrence-weighted graduation (×3 is a semantic threshold, the cap was arbitrary).

**Backward compatibility:** the `inject-learnings.sh` hook is global and now reads **both** `LEARNINGS.md` and legacy `CONTEXT.md` — un-migrated projects keep injecting from CONTEXT.md unchanged (verified byte-identical on a live project). Migration is opt-in via `/bootstrap-upgrade`.

**Lineage:** Jake Van Clief's "durcir tes règles capitalisées" (edit-source principle, 3-level promotion, drift log) applied to the folder-based system; aligned with Anthropic context-engineering ("keep the hot context lean, scoped files loaded as needed") and Karpathy's RAM/disk context model.

References: `core/ARCHITECTURE.md` (Learning layer — Durcir), `core/decisions/memory-architecture.md`.

---

## 2026-11-08 — Streaming memory v2: continuous scribe replaces the end-of-session ritual

Memory capture moves from one manual distillation at session end (`/memorise` with y/n gates,
plus an auto-handover fork at 60 % context) to a continuous background **scribe**: a `Stop`
command hook queues each turn, a background worker trims the transcript delta deterministically,
asks Sonnet (`claude -p`, Read/Grep only, lean settings, prompt via stdin) for one JSON proposal,
and a bounded writer applies it. Auto-written: `CONTEXT.md ## Current state` (evidence required)
and `DECISIONS.md ## Ledger` one-liners (≤ 200 chars, evidence required, same-key facts marked
superseded). Inferred rules go to `LEARNINGS.md ## Candidates` (not injected) and reach
`## Active Learnings` only through the owner's explicit correction quoted from the transcript or an
in-session y/n. `/memorise` stays as an optional audit; `/handover` only for worktree forks.

**Why:** what the stack lost, it lost because distillation happened once, at the worst moment
(owner leaving, context full). Each memorable item has a signal in the turn where it is born.

**Independent review (external model, 2026-11-08) folded in:** inferred rules are never auto-doctrine (the
gates run by the same model that generalised the incident are not a second look); no extra
classifier before the scribe in the pilot (three interpreters of the same work before any
measurement); "zero loss on brutal exit" dropped from the goals — durable cursor + catch-up at the
next start instead; Stop hook (public API) rather than early-access function hooks; claude-mem
stays the "what happened" journal, off the scribe's critical path.

**Measured constraints that shaped it:** Claude Code caps each hook `additionalContext` string at
10,000 chars (over → file + 2k preview, never read) — the learnings hook had silently exceeded it
for weeks, so payloads are now bounded before emission; claude-mem capture had been dead since
2026-10-25 (npm global shadowing the plugin launcher) — the markdown files carried the stack alone;
a one-turn scribe run costs ~100k tokens → batch 1 run / 5 min / project, hard cap 1M tokens/day.

**Alternatives considered:** migrate to `claude-mem-lite` (2k-token budget, no Chroma) — rejected
for now: one maintainer, Windows not CI-covered; borrow its pattern (deterministic pre-filter →
batched cheap extraction → dedup → project file) instead. Native Auto Memory — overlaps the
Learnings layer, kept disabled.

**Status:** pilot v0 installed on the owner's machine for every 0-to-Hero project under one
folder; framework integration (templates, bootstrap, `.claude/rules` projection, health line)
follows the pilot. Spec: `docs/plans/2026-11-08-streaming-memory-v2.md` (local).

## 2026-11-09 — claude-mem capture frozen, scribe v0.3 becomes the memory writer

claude-mem's observation and summary capture is disabled (`CLAUDE_MEM_DISABLE_OBSERVATION`,
`CLAUDE_MEM_DISABLE_SUMMARY` in the global `settings.json`); its database stays as a read-only
archive (`mem-search`, `save_memory`). The scribe, hardened to v0.3, is published in
`core/hooks/scribe/` and wired on `Stop` + `SessionEnd` for every Durcir project; `/memorise`
consumes its `## Candidates` first (clause A0) instead of writing a second Active line.

**Why now (measured on the owner's machine, 2026-11-09):** claude-mem had become a hidden drain —
one Sonnet turn per tool use (~72 condense calls/day once repaired), each re-reading ~100k tokens of
context — while its capture had silently been dead for three weeks and nobody noticed: the markdown
files carried the stack alone. The database had grown from 34 MB (May) to 547 MB (42,606 observations,
8,865 summaries), backed up with `.backup` + `integrity_check` before the freeze. The scribe's own
first day: 6 runs on this repo, 25-30k tokens each (≈ $0.15-0.20 list), 481k tokens machine-wide
under a 2M daily cap, 17 ledger facts written with evidence, 0 Active rules written on its own.

**Independent review (external model, 2026-11-09) folded in:** seven scribe defects fixed before the freeze
(legacy usage rows counted against the session budget, deltas dropped at the cap instead of held,
silent daily-budget hit, future-dated facts accepted, no fuzzy dedup of candidates, main() not
guarded for `require`, lock/queue durability); cost estimates corrected; the freeze ordered as
backup → disable capture → extend transcript retention to 365 days → verify next day.

**Decisions bundled here:** third-party compaction tools stay out of the publishable stack;
SQLite FTS over transcripts is deferred, not cancelled — `rg` + the existing claude-mem MCP serve
every real search today, FTS comes back when one measurably fails; `PreCompact` is not hooked (superseded 2026-11-10: the handover layer now ships in the kit) —
`Stop` + `SessionEnd` cover every path because the worker reads from its cursor, whatever happens
to the context window.

**Rollback criterion:** re-enable claude-mem capture if, over the next 14 days, a fact or rule
that the session needed was found in neither the memory files nor `mem-search` of the frozen
archive, AND the journal shows the scribe had the evidence in its delta and did not write it.
A cost regression (daily cap hit on normal use) is tuned, not rolled back. Verification step one:
`type=observation` count in claude-mem's log for 2026-11-10 must be 0.

**Visibility added the same day:** `✍` statusline segment, Stop-hook report line, and a per-project
badge + "run now" button in the owner's VS Code sidebar — all read the scribe's cursor and lock files,
none calls a model. The pane-mod variant was built, loaded, and deleted: the sidebar already existed.

## 2026-11-10 — Workspace map: a parent `CLAUDE.md` instead of a knowledge-graph memory

With claude-mem capture frozen (ADR 2026-11-09), the question came up: should a graph "brain"
(Graphify, Graphiti, Cognee, Supermemory, mem0, Basic Memory) replace the lost semantic layer and
keep multi-project work from losing track of what exists where? Answer: no. A flat parent
`CLAUDE.md` above the projects, loaded by Claude Code's directory walk, is adopted instead.

**Why a graph was rejected (surveyed 2026-11-10):**
- Graphify is a *code* graph (AST + LLM pass over docs); it indexes no session history, goes stale
  at every refactor, and reviewers report the assistant bypassing it on small/medium repos.
- Graphiti, Cognee, Supermemory and mem0 all pay an LLM extraction pass per write — the very cost
  the scribe freeze just removed — plus a database to run (Neo4j/FalkorDB, Python-only, or a hosted
  account). Basic Memory is the only one with zero-LLM ingestion (markdown + SQLite index), but it
  wants its own `- [category]` / `[[wikilink]]` syntax; on plain ledgers it adds nothing over grep.
- The corpus is small: ~13 ledgers, ~1,200 lines total. Users of these tools report the same
  threshold — below a few thousand entries, grep wins.

**What the map actually solves:** not search but *discoverability*. A survey of the 9 most active
projects found a dozen bricks written 2–4 times (LLM wrapper ×4, private-data guard ×3, owner alert
×2, Reddit reader ×2, geocoder ×2 with one on a dead endpoint, a skill and a hook copied byte for
byte). Nobody searched for them because nobody suspected they existed. A 60-line table seen at
every session start fixes that; a graph would not.

**Format chosen:** three sections (projects + orbits, reusable bricks with paths, machine
conventions), hard cap ~80 lines, no state/progress/rules, fed by a `/memorise` step with four
explicit triggers, scaffolded from `core/templates/WORKSPACE-MAP.template.md`. Verified: two
headless sessions started two and one levels below the parent both had the file in context.

**Reopen criterion:** same as SQLite FTS — three documented searches that `rg` + `mem-search`
failed and that needed a *relation* rather than a keyword. Basic Memory is then the candidate,
triggered by ledgers starting to cross-link each other.

## 2026-11-10 — Learning stack bumped to `durcir-v2`: the memory change becomes a migration, not a rumour

The three memory changes of 2026-11-08/10 (continuous scribe, claude-mem capture frozen, workspace
map) were live on the owner's machine but invisible to the stack's own versioning: every project
still carried `<!-- learning-stack: durcir-v1 -->`, so `/memorise` had nothing to flag and
`/bootstrap-upgrade` nothing to migrate. The same mechanism that moved projects from
`CONTEXT.md` rules to `LEARNINGS.md` in June is reused: a new marker value, a freshness check that
names it, and a step-by-step migration section.

**What `durcir-v2` means for a project:** `LEARNINGS.md` has a `## Candidates` section (the scribe's
only write surface for rules — never injected, promoted by `/memorise` A0 or by the owner in
session); `CLAUDE.md ## Learning mode` names the scribe and carries the v2 marker; the machine runs
`scribe-trigger.js` on both `Stop` and `SessionEnd` with the files byte-identical to
`core/hooks/scribe/`; claude-mem capture, if the plugin is installed, is disabled; the global
`/memorise` carries A0, the workspace-map step and the v2 freshness line.

**Why a marker bump rather than silent drift:** the audit of 2026-11-09 found claude-mem capture had
been dead for three weeks with nobody noticing, because nothing versioned the stack it belonged
to. A marker makes the state of each project checkable in one grep and gives `/memorise` a single
line to print. Half-wired states are named explicitly in the upgrade checks (`Stop` without
`SessionEnd`, scribe files present but stale, `## Candidates` absent while the journal shows runs)
because each one is a silent capture loss, the same failure class as the dead claude-mem hooks.

**Scope of the migration:** machine-global steps (scribe files, two hooks, claude-mem env) run once
and are never committed; project steps (`## Candidates`, `## Learning mode`, marker) are committed
per project. The workspace map is offered, not imposed, and stays out of published repos.

**Addendum, same day — `DECISIONS.md` gains `## Facts (current)`.** Measured after one scribe day:
~1 ledger line per run, ~10 per day on an active project (the owner's three busiest projects: 266,
77 and 31 ledger lines), mostly session events ("email sent", "mod built", "commit …") and reworded duplicates,
because the worker never saw the existing ledger. The injection window (10 newest) kept the token
cost flat but pushed every durable state out of context within a day. Root cause: one list holding
two time semantics — events that decay and states that hold until replaced. Fix: states live in
`## Facts (current)`, one line per key, upserted (first spelling of the key wins, a change is traced
in the ledger), injected whole and bounded by the key count (safety cap 40); the ledger becomes the
dated log with a 5-line window; the worker's prompt defines "facts" as keyed state true in three
months and "log" as decisions and irreversible events, with routine work explicitly excluded, and
now receives the Facts section and the 10 newest ledger lines for key reuse and dedup. Existing
ledgers are not converted: the migration adds the empty section and runs one assisted promotion
pass. Kill criterion for the prompt change: after 7 days, if more than a third of new ledger lines
are still routine work, the log channel is closed to the scribe (owner-only through `/memorise`).

**Second addendum, same day — the scribe becomes a sorter; the memory inbox.** An independent review
(external model, 2026-11-10) of the Facts/Ledger split found the real risk: "evidence verified" meant "a
reference exists", not "the reference proves the claim" — a question from the owner had become a
decision in the ledger — and a keyed Facts section labelled "current ground truth" would turn such
errors into permanent, self-reinforcing memory. It also found a payload cap that bounded only the
ledger, a value equality that dropped punctuation (`1.5` = `15`), no chronology check, a state/trace
pair written in two steps, and writer rejections the worker acknowledged as success. Decision: the
scribe writes directly only what is deterministic and tool-proven (`Current state`, the update of an
EXISTING Facts key by tool id — strict equality, never an older date, state and trace in one write,
rejections counted as errors); everything else it finds — new keys, owner words as evidence, dated
decisions — is queued on disk in `DECISIONS.md ## Proposals` (and rules in `## Candidates`), never
injected, with its evidence and a one-line "why". `/memorise` is the only door to durable memory: it
drains the whole backlog every time (a cap would turn a delay into a loss), grouped by evidence
strength, one answer per group; `n` archives, never deletes. The injector bounds the complete payload
and states the cut as its first line; Facts keeps the newest 40 keys. The inbox is made visible
everywhere, per project, at 10 items or 7 days (`SCRIBE_PENDING_MAX` / `_DAYS`): `scribe:` line,
statusline `✉ N`, SessionStart line, and the VS Code sidebar published in `tools/claude-hub/` for
users who never open a terminal — no Discord, by the owner's choice. Migration of existing ledgers
stays assisted: full read, contradictions surfaced, each promoted fact with its source line and a
confirmed / historical / to-verify status. Measured for 7 days on 3 projects: proposals made /
accepted / refused, share of routine noise (kill at 10 %), new keys and synonyms, payload size.

## 2026-11-10 — Alignment audit: the kit's prose caught up with its code, four logic holes closed

**Context.** A three-way read (docs ↔ templates ↔ bootstrap; /memorise ↔ upgrade ↔ gotcha; hook code ↔ contract) after the v2 migration of 17 projects. The code was v2; most of the prose describing it still told the claude-mem-as-primary-memory story, and the bootstrap prompt produced a project that `/bootstrap-upgrade` flagged on day one.

**Decision.** One source of truth per fact, and the kit ships what its own commands depend on:
- `/memorise` reads `~/.claude/handovers/`, so the handover layer (`PreCompact` writer, `SessionStart` reader on `clear`, `/handover`) joins the kit under `core/hooks/handover/` — this supersedes the 2026-11-09 line "`PreCompact` is not hooked".
- The scribe writer treats a missing destination as an error (blocks the cursor, reaches the alert) instead of a silent `null`; the owner's quoted correction promotes a rule even when the scribe had already queued it; Drift log lines are never bumped; `## Candidates` sits before `## Archived Learnings` like the template.
- The injector no longer counts `## Proposals archive` as pending (the `✉ N` badge never cleared after a `n`); `/memorise` deletes `pending.json` after a drain since the worker only rewrites it at its next run.
- A fix too big for session end is parked in `## Thread`, never in `## Current state` (the scribe overwrites it). A refused candidate is archived, never deleted (the scribe dedups against the whole file, so it cannot come back at ×1).
- `/gotcha` enforces the 12-line cap itself. `/bootstrap-upgrade` audits light projects (root `LEARNINGS.md` as workspace `.`), drops the grep proxies that passed a v1 hook or command, and refreshes `## Startup` / `## Navigation` / `## Memory` wording.
- claude-mem leaves the bootstrap's install list: optional archive, never the memory base.

**Not done.** The in-session "y / n / fix" on a candidate still has no owner beyond the quoted correction and `/memorise` A0; the hub applies no project-root walk-up (a session started in a sub-folder is invisible to its lag badge). Both are noted, not fixed.
