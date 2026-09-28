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
