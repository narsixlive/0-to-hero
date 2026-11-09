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

**Independent review (Astra, 2026-11-08) folded in:** inferred rules are never auto-doctrine (the
gates run by the same model that generalised the incident are not a second look); no Jev
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

**Independent review (Astra, 2026-11-09) folded in:** seven scribe defects fixed before the freeze
(legacy usage rows counted against the session budget, deltas dropped at the cap instead of held,
silent daily-budget hit, future-dated facts accepted, no fuzzy dedup of candidates, main() not
guarded for `require`, lock/queue durability); cost estimates corrected; the freeze ordered as
backup → disable capture → extend transcript retention to 365 days → verify next day.

**Decisions bundled here:** Jev compaction stays out of the publishable stack (owner's call);
SQLite FTS over transcripts is deferred, not cancelled — `rg` + the existing claude-mem MCP serve
every real search today, FTS comes back when one measurably fails; `PreCompact` is not hooked —
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
