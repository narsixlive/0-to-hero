# Decisions — 0 to Hero

Two zones, two purposes. Do not mix them.

- **Ledger** — durable project facts. Terse, dated one-liners. Injected at every
  SessionStart by the learning hook. Fed by `/memorise` (user validates).
- **ADR archive** — narrative rationale ("why did we choose X?"). NOT injected,
  consulted on demand. One H2 per decision, dated.

## Ledger (facts of record)
<!-- Injected at SessionStart. Treat each line as current ground truth. -->
<!-- Format: `- YYYY-MM-DD — [fact]` — one line, factual, no rationale. -->

- 2026-06-11 — Windows hook flash = CC regression ≥ ~2.1.128 (sandbox child spawned without CREATE_NO_WINDOW). Fixed locally with TWO registry keys (both required): `HKCU\Console\WindowPosition = 0x75307530` (off-screen at 30000,30000) AND `HKCU\Console\%%Startup\DelegationConsole/DelegationTerminal = {B23D10C0-E52E-411E-9D5B-C09FDF709C7D}` (force conhost; "Let Windows decide" on Win11 22H2+ delegates to Windows Terminal which ignores WindowPosition). Cosmetic patch: flash still fires, just invisible. Version-independent.

---

## ADR archive
<!-- On-demand only. One H2 per decision, dated, with the rationale. -->

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

## 2026-06-11 — Windows console flash: registry off-screen as the only working fix

**Symptom:** From ~2026-06-09, every Claude Code tool call flashed a transient console
window on Windows (VS Code native extension host). Disabling claude-mem eliminated it,
which initially pointed at the plugin.

**Real cause:** A CC regression. Issue [#61051](https://github.com/anthropics/claude-code/issues/61051)
documents that CC's new hook-execution architecture spawns a child `claude.exe`
sandbox process **without `CREATE_NO_WINDOW`** on Windows. Because the extension host
has no parent console, Windows allocates a fresh visible conhost for each child →
flash. The regression is broader than #61051 claims: #58606 confirms the same flash
in 2.1.128/2.1.140. claude-mem is only the *trigger*: its PostToolUse-matcher-`*` hook
fires on every tool, exercising the bug constantly. The flash is identical for any
frequent hook (command-string or args-array).

**What failed (the 2-day loop):**
- Patching `windowsHide:true` across claude-mem JS (worker-wrapper, bun-runner,
  version-check, worker-service). All downstream of the actual flash source.
- Routing hooks through `cc-hidden.exe` (custom GUI-subsystem Rust launcher,
  CREATE_NO_WINDOW for children). cc-hidden runs *inside* the already-spawned
  flashing `claude.exe` sandbox — too late.
- Downgrade to CC 2.1.142 (pre-#61051-cited 2.1.143). Still flashed: the regression
  pre-dates 2.1.143. And going to 2.1.123 (the only known-clean version) would
  break claude-mem 13.5.5's args-array hooks (added in CC 2.1.139).
- The `sandbox.enabled:false` setting is N/A on native Windows.
- Anthropic closed [#17230](https://github.com/anthropics/claude-code/issues/17230)
  (add `windowsHide` for hooks) as "not planned." All shell-wrapper workarounds in
  the issue (`-WindowStyle Hidden`, VBScript, `start /b`) failed.

**The fix that worked (TWO registry changes, both required):**
```powershell
# 1. Off-screen default position for any console host using conhost
Set-ItemProperty -Path 'HKCU:\Console' -Name 'WindowPosition' -Value 0x75307530 -Type DWord

# 2. Force Windows Console Host as the terminal delegate (NOT Windows Terminal)
$conhost = '{B23D10C0-E52E-411E-9D5B-C09FDF709C7D}'
Set-ItemProperty -Path 'HKCU:\Console\%%Startup' -Name 'DelegationConsole'  -Value $conhost
Set-ItemProperty -Path 'HKCU:\Console\%%Startup' -Name 'DelegationTerminal' -Value $conhost
```

WindowPosition encoded as low-word X = 0x7530 = 30000, high-word Y = 0x7530 = 30000.
Tells conhost to open new console windows at (30000, 30000) — off any monitor. The
flash still occurs; the user just never sees it. CC apparently does NOT pass
`STARTF_USEPOSITION`, so the registry default applies.

**Gotcha** (cost the team another iteration after the initial fix): on Windows 11
22H2+, "Let Windows decide" for Default Terminal Application (and the
`DelegationConsole/Terminal = {00000000-...}` registry state that backs it) **delegates
to Windows Terminal, not conhost**. WT has its own window placement logic and
**ignores** `HKCU\Console\WindowPosition`. So `WindowPosition` alone is insufficient
on Win11 — you must also pin the delegate to conhost.

**Trade-offs accepted:**
- *Cosmetic*, not root-cause. CPU/GDI work for the spawn still happens.
- Affects **every** conhost that uses default position — a manually-launched `cmd.exe`
  also opens off-screen. Workaround: temporarily delete the registry key with
  `Remove-ItemProperty HKCU:\Console WindowPosition`, then re-set after.
- Survives CC upgrades (it's a Windows user setting, not a CC setting). Auto-update
  can be re-enabled.

**Status of mitigations now redundant but kept for hygiene:**
- `cc-hidden.exe` and the patch scripts in `~/.claude/hooks/` remain — they correctly
  hide the *downstream* chain (bash → node → bun) for any hook we control. They just
  don't address the CC-level sandbox layer that flashes upstream of them.

**Rollback (full):**
```powershell
Remove-ItemProperty -Path 'HKCU:\Console' -Name 'WindowPosition'
$zero = '{00000000-0000-0000-0000-000000000000}'
Set-ItemProperty -Path 'HKCU:\Console\%%Startup' -Name 'DelegationConsole'  -Value $zero
Set-ItemProperty -Path 'HKCU:\Console\%%Startup' -Name 'DelegationTerminal' -Value $zero
```
Original delegation backup saved at `~/.claude/conhost-delegation-backup.txt`.

References: GitHub issues
[#61051](https://github.com/anthropics/claude-code/issues/61051),
[#58606](https://github.com/anthropics/claude-code/issues/58606),
[#17230](https://github.com/anthropics/claude-code/issues/17230),
[#15572](https://github.com/anthropics/claude-code/issues/15572).

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
