Migrate an existing 0-to-Hero-patterned project to the latest architecture. Safe, read-only audit first — then patch section-by-section after user validation.

## Scope

Only projects already following the 0-to-Hero pattern (have a `CLAUDE.md` at root, and likely workspaces with `CONTEXT.md` / `AGENT.md`). Target dir = `$CWD` unless user specifies otherwise.

## Sources of truth (read from the 0-to-Hero repo)

**Resolve the repo root first (`$REPO`).** The canonical sources live in a clone of the 0-to-Hero repo, whose location varies per machine — never hardcode it. Resolve `$REPO` once, in this order, and use it for every path below (all paths are relative to `$REPO/`):

1. **Env var** — if `$ZERO_TO_HERO_HOME` is set and contains `core/templates/CLAUDE.template.md`, use it.
2. **Inside the repo** — if `$CWD` (or an ancestor) contains `core/templates/CLAUDE.template.md` and `core/bootstrap/bootstrap-upgrade.md`, that's the repo root.
3. **Sibling projects** — the repo is usually a sibling of the target project. Search the parent of the target dir: `find "$(dirname "<target>")" -maxdepth 4 -name CLAUDE.template.md -path '*core/templates*'`.
4. **Locate the clone** — broad search of the user's code roots (the repo may live off `$HOME`, e.g. another drive): `find ~ /d /c -maxdepth 5 -name CLAUDE.template.md -path '*core/templates*' 2>/dev/null`; confirm the hit's `git remote get-url origin` matches `0-to-hero`.
5. **Ask** — if still unresolved, ask the user for the repo path.

Abort if `$REPO` can't be resolved (the skill can't migrate without the canonical templates).

- `core/templates/CLAUDE.template.md` — canonical CLAUDE.md sections (Shell, Navigation, Modifications, Startup, Memory, Learning mode, Gotchas)
- `core/templates/AGENT.template.md` — agent template (Pre-work checklist + pro role + Invocation scope + Rules)
- `core/templates/CONTEXT.template.md` — workspace context template (Brief / Current state / Thread — purely situational)
- `core/templates/LEARNINGS.template.md` — workspace rule register (`## Active Learnings` / `## Candidates` / `## Archived Learnings` / `## Drift log`), Durcir lifecycle
- `core/templates/DECISIONS.template.md` — DECISIONS.md four-zone template (`## Facts (current)` injected whole, `## Proposals` scribe inbox, `## Ledger (facts of record)` 5 newest injected, `## ADR archive` on-demand)
- `core/templates/commands/memorise.md` — `/memorise`: one-pass review that empties the scribe inbox (disputed Facts, new facts, fixes, rules; Ledger with `--all`), run by the session itself or by hand + stack-freshness check
- `core/hooks/inject-learnings.sh` — SessionStart hook that auto-injects workspace `## Active Learnings` (from `LEARNINGS.md`, legacy `CONTEXT.md`), the DECISIONS.md `## Facts (current)` whole and the 5 newest `## Ledger` lines
- `core/hooks/inject-journal.sh` — second SessionStart hook (global): coverage line, the 3 newest `JOURNAL.md` blocks and each workspace's `## Current state`, under its own 9k cap
- `core/hooks/handover/` + `core/templates/commands/handover.md` — `PreCompact` writer / `SessionStart` reader of `~/.claude/handovers/<slug>/` and the `/handover` command; `/memorise` reads that folder first (durcir-v2)
- `core/hooks/scribe/` — memory scribe (`scribe-trigger.js`, `scribe-worker.js`, `scribe-writer.js`, `scribe-worker.check.js`, `root.check.js`, `README.md`): global `Stop` + `SessionEnd` hook that writes `JOURNAL.md` and `CONTEXT.md ## Current state`, marks a changed Facts value `⚠ disputed`, and queues the rest in `## Proposals` / `LEARNINGS.md ## Candidates` (self-expiring) while the session runs (durcir-v2, journal since 2026-11-11)
- `core/templates/WORKSPACE-MAP.template.md` — optional parent `CLAUDE.md` above several projects (cross-project map, see ARCHITECTURE "Workspace map")
- `core/ARCHITECTURE.md` — 3-layer model + Learning layer, DECISIONS.md as four zones (Facts injected whole / Proposals inbox / Ledger window / ADR archive on-demand), `<workspace>/code_<descriptor>/` rule

If any source is missing, abort and tell the user.

## Execution flow

### Step 1 — Audit (read-only, no edits)

Scan the target project and produce a report with 3 sections:

**`## À migrer`** — concrete diffs needed. For each, show:
- What's stale
- What the canonical version is
- Estimated impact (lines changed, files touched)

**`## Déjà aligné`** — what's already correct (one line per check).

**`## Ambigu`** — cases where you're not sure (e.g. local customizations that look intentional). Ask the user per item.

### Step 2 — Checks to run

Run these audits. Use `rtk` prefixes on shell commands.

1. **CLAUDE.md structure** — compare section headers against `CLAUDE.template.md`. Required sections: `## Repo layout`, `## Shell`, `## Navigation`, `## Modifications`, `## Startup`, `## Memory`, `## Gotchas`. Flag missing or extra sections. (A project predating the layout convention won't have `## Repo layout` — propose adding it from the template; cross-ref check 11.)

2. **Stale `GOTCHA.md` references** — grep the whole project for `GOTCHA.md`. Every match is stale (the file was removed; gotchas now live in CLAUDE.md). List occurrences.

2bis. **Structural marker drift (CRITICAL)** — `/memorise`, the `inject-learnings.sh` hook, and several upgrade checks match section headings literally. If the project was bootstrapped in a non-English language, the markers may have been translated and tooling silently breaks.

   On the current stack, `CONTEXT.md` holds `## Current state`, `## Thread`; `LEARNINGS.md` holds `## Active Learnings`, `## Archived Learnings`, `## Drift log`. Check each file has the canonical English headings exactly (on a pre-Durcir project the learnings still sit in `CONTEXT.md` — that's the split, check 10). Common drifts to flag:
   - `## État actuel` / `## Etat actuel` → should be `## Current state`
   - `## Apprentissages` / `## Apprentissages actifs` → should be `## Active Learnings`
   - `## Apprentissages archivés` → should be `## Archived Learnings`
   - `## Learnings` (legacy single-section heading) → should be split into `## Active Learnings` (top-5, injected) + `## Archived Learnings` (rest, not injected). The hook still reads legacy `## Learnings`, so this is a soft drift — flag it, migrate on approval.
   - `## Fil` / `## Historique` → should be `## Thread`
   - Same for AGENT.md: `## Pre-work checklist`, `## Invocation scope`, `## Rules` (FR drifts: `## Avant de commencer`, `## Quand m'invoquer`, `## Règles`).

   When found: rename **the heading only**, keep the prose underneath untouched. One commit per file group: `fix: restore canonical English section markers`.

3. **Stale `MEMORY.md` obligatory reads** — grep for `Always read.*MEMORY` or `read /MEMORY` in CLAUDE.md. These should be gone (the SessionStart hook injects the record; claude-mem is a frozen archive).

4. **Architecture layer count** — if `core/ARCHITECTURE.md` exists in target, check it says "3 layers" not "4".

5. **DECISIONS.md zones** — check `./DECISIONS.md` exists at project root AND has the canonical sections: `## Facts (current)` (durcir-v2: keyed current state, injected whole), `## Ledger (facts of record)` (dated log, 5 newest injected) and `## ADR archive` (on-demand rationale). A file with Ledger + ADR but no `## Facts (current)` **or** no `## Proposals` is **stale v1** → handled by the Durcir v2 migration step 4bis (both sections, always together). Three further cases:
   - **Missing file** → propose creating it from `core/templates/DECISIONS.template.md`.
   - **Exists but archive-only** (has decisions/ADR content but no `## Ledger (facts of record)` section) → flag as stale: the file predates the Ledger feature, so the hook injects nothing. Propose prepending the `## Ledger (facts of record)` section (empty, with its format comments) above the existing archive. Keep all existing ADR content untouched, just relabel its heading to `## ADR archive` if it isn't already.
   - **Pre-v3 wording** (any shape above) — the header or the Ledger comments still say `Treat each line as current ground truth`, `durable project facts`, `A fact goes in the **Ledger**` or `Latest line wins on conflict` → flag `stale DECISIONS wording`: an injected Ledger line would read as current truth against a newer Facts value. Fix = replace the header bullets, the routing sentence and the two Ledger comments with the template's; the lines themselves stay untouched.
   - **Already dual-zone** → ✅ aligned.

6. **Workspace code separation** — for every workspace folder that contains code (any name: `src/`, `scripts/`, `app/`, `backend/`, `services/`, `notebooks/`, …), check whether the code already lives in a `code_*/` sub-folder. The flagging is **conditional** on the workspace's content profile — bootstrap-upgrade is for existing, often working projects, where reorganizing paths has real cost (broken imports, shell scripts, build configs) and marginal benefit.

   First classify the workspace:

   | Profile | Detection | Verdict |
   |---------|-----------|---------|
   | **Empty / agent-only** | 0 code files at workspace root | ✅ No-op. The convention only kicks in once code exists. |
   | **Tiny code** | 1–2 code files at root | ✅ No-op. The separation overhead exceeds the readability gain. Note in audit: *"`<workspace>/` has N code files — convention applies in principle but is overkill at this scale."* |
   | **Content-only** | Files are `.md` / `.yaml` / `.json` / `.txt` deliverables (templates, prompts, configs) — not executable code | ✅ No-op. The rule targets *code*, not content artifacts. Note in audit: *"`<workspace>/` holds content (.md/.yaml/…), not code — convention does not apply."* |
   | **Substantial code** | 3+ executable code files at root (`.js`, `.ts`, `.py`, `.rs`, `.go`, `.gs`, `.sh`, …) | ⚠️ **Flag, but mark as optional.** |

   When the **substantial code** case fires, do NOT auto-migrate. Surface it to the user with the trade-off explicit:

   > "Workspace `<name>/` has N executable files at the root. The convention says they should live in `<name>/code_<descriptor>/`. **This is genuine work** on an existing project: `git mv` of N files, then update any embedded paths in CLAUDE.md (architecture sections), shell scripts, build configs, or imports that reference these files by their current path. **Skip if the project is stable and works.** If you want to apply, what `<descriptor>` should I use? `<descriptor>` is a short label distinguishing this code from other code that could live in the same workspace — typically: language (`python`, `rust`), target (`linkedin`, `indeed`), role (`api`, `worker`), or `common` for shared helpers. List multiple if you want to split (e.g. `main,lang,common`)."

   Decision tree once the user answers:

   | User says | Action |
   |-----------|--------|
   | "skip" / "leave it" | No-op. Mark in summary as deliberately deferred. |
   | Single descriptor (e.g. `python`) | Create `<workspace>/code_python/`. Move all code files into it. Update CLAUDE.md and any path-bearing files (shell scripts, README, docs). One commit. |
   | Multiple descriptors (e.g. `main,lang,common`) | Create one `code_<d>/` per descriptor. Show the file list grouped by your best guess of which descriptor each file belongs to. User confirms or corrects the split. Update path-bearing files. One commit per descriptor or one bundled commit. |

   Never derive the descriptor from the workspace name (it's NOT "first word of the workspace"). Never invent it silently. Never auto-migrate without explicit user agreement, even on `substantial code`.

7. **Agents refactored** — for every `AGENT.md` in the project, check:
   - Heading has a professional role (e.g. "`# Api — Senior Backend Engineer`") — not generic ("Assistant", "Helper", just workspace name)
   - Has an `## Invocation scope` section with "Invoke when" / "Do NOT invoke for"
   - Has a `## Pre-work checklist` section in the header that forces reading `LEARNINGS.md` `## Active Learnings` (legacy: `CONTEXT.md`) before any task
   - No stale `GOTCHA.md` references in the Rules/Gotcha section
   Agents missing any of these = upgrade candidates.

8. **Learning layer installed** — check the opt-in state of the project:
   - Every workspace has a `LEARNINGS.md` with a `## Active Learnings` section (empty is fine — the marker must exist). **Light project** (no folder with an `AGENT.md`): the root is the only workspace, so every per-workspace check in this section and in check 10 applies to `./LEARNINGS.md` (create it from the template if absent, never a `CONTEXT.md`); a light project with no root `LEARNINGS.md` is NOT green, it is `missing`. On a pre-Durcir project the learnings still live in `CONTEXT.md` (`## Active Learnings` or legacy `## Learnings`) — that counts, but flag it for the split per check 10. Do NOT flag a migrated project (rules in LEARNINGS.md, none in CONTEXT.md) as missing the layer.
   - `DECISIONS.md` has a `## Ledger (facts of record)` section (the hook injects it alongside Learnings — without it, half the injection is dead; cross-ref check #5)
   - `.claude/settings.json` contains a `SessionStart` hook entry pointing to `bash ~/.claude/hooks/inject-learnings.sh`, **in the nested form** (`"SessionStart": [{ "hooks": [{ "type": "command", ... }] }]`). A flat entry (`{ "type": "command", ... }` directly in the array) is rejected by Claude Code and has never run → flag as **`inert hook`**, fixed by migration step 2.
   - `~/.claude/hooks/inject-learnings.sh` exists globally and is executable
   - **Hook freshness (CRITICAL — not just existence)** — a stale global hook is worse than a missing one: it exists, the audit looks green, but it silently injects only half. Verify the installed `~/.claude/hooks/inject-learnings.sh` is **byte-identical** to the repo source `core/hooks/inject-learnings.sh`. No grep proxy: a v1 hook carries every v1 keyword, only the byte-diff tells v1 from v2 (`diff --strip-trailing-cr`). If a diff is really unavailable, the v2 markers are `Facts` AND `Proposals` AND `payload over` — all three. If it exists but lacks any → flag as **`stale global infra`**, not aligned. The fix is migration step 1 (re-copy), which must run before DECISIONS.md/Learnings migrations are meaningful.
   - CLAUDE.md has a `## Learning mode` section
   - **Memory scribe installed (global, durcir-v2)** — every `*.js` of `$REPO/core/hooks/scribe/` (trigger, worker, writer and both `.check.js`) plus `~/.claude/hooks/claude-statusline.js` and `~/.claude/hooks/handover-{write,read}.js` exist and are **byte-identical** to the repo (`core/hooks/scribe/`, `core/hooks/`, `core/hooks/handover/`); if `SCRIBE_ROOTS` is set in the global `env`, the project path must be under one of its folders (else the scribe silently never runs here — flag `excluded by SCRIBE_ROOTS`); the global `~/.claude/settings.json` registers `scribe-trigger.js` on **both** `Stop` and `SessionEnd` (nested form, `"async": true`). A third entry, `scribe-trigger.js --inbox` on `Stop` without `async`, makes the memory inbox drain itself; absent, `/memorise` stays a manual command — flag `inbox manual`, an option, not an error. One event only = half the capture (`Stop` alone misses the flush at session end; `SessionEnd` alone writes nothing during the session). Flag `missing` / `stale` / `half-wired` separately. If `claude-mem` is installed, its capture must be off (`CLAUDE_MEM_DISABLE_OBSERVATION` + `CLAUDE_MEM_DISABLE_SUMMARY` in the global `env`), otherwise two writers pay for the same transcript; and `~/.claude-mem/settings.json` `CLAUDE_MEM_EXCLUDED_PROJECTS` must cover the project path, otherwise its SessionStart output (work-state and memory-use instructions, even with `CLAUDE_MEM_CONTEXT_*` = 0) competes with the journal — flag `claude-mem injecting`.
   - **`## Candidates` present** in every workspace `LEARNINGS.md` (root file on a light project; the scribe creates it on first write, but an absent section means the scribe has never reached this project — cross-check `~/.claude/scribe/<slug>/journal.jsonl` exists, slug = project root path with every non-alphanumeric character replaced by `-`, trimmed, lowercased).
   - **`/handover` wired** — global `~/.claude/settings.json` registers `handover-write.js` on `PreCompact` and `handover-read.js` on `SessionStart` (nested form), and `~/.claude/commands/handover.md` is byte-identical to `core/templates/commands/handover.md`. Without them `/memorise`'s first step reads a folder nothing fills.
   - **`/memorise` freshness** — `/memorise` (and `/gotcha`) are now **global-only** commands at `~/.claude/commands/`; a project should carry **no** local `.claude/commands/*.md`. Verify the global `~/.claude/commands/memorise.md` is byte-identical to `core/templates/commands/memorise.md` — the current markers, if a diff is really unavailable, are the `--rules` / `--all` flags and "three topics at most"; a copy that says "Drain … all of it, every time", "clause A0" or "bumps ×N" is the pre-journal v2, a copy with only the Durcir block and "Propose facts of record" is v1. Also verify `inject-journal.sh` is installed byte-identical and registered in the global `SessionStart`. A stale global command = **`stale global infra`** (rules never harden, the Ledger never gets fed). Also flag any leftover **project-local** `.claude/commands/memorise.md` / `gotcha.md`: it is drift — a frozen copy that shadows the global and is exactly what makes a project stop proposing this upgrade. Fix = refresh the global command + delete the local shadow (keep the local copy only, after asking, if it carries genuine project-specific customizations).
   - **`/bootstrap-upgrade` is a delegator stub, not a full copy** — unlike `/memorise` (self-contained generic logic, safe to copy), this command already needs the repo at runtime to read canonical templates, so its global install must be the **thin delegator stub** that resolves `$REPO` and reads `core/bootstrap/bootstrap-upgrade.md` live — never a frozen full copy of the procedure. Verify `~/.claude/commands/bootstrap-upgrade.md` is byte-identical to `core/templates/commands/bootstrap-upgrade.md` (the stub, ~17 lines). If it's a **full copy of the procedure** (long, contains check headings like `## Step 2 — Checks`), it has frozen at install time and silently runs an old architecture (missing later checks) → flag as **`stale global infra`**; fix = re-install the stub (step 6). This is the one command whose own staleness hides every *other* upgrade it should propose.
   Any missing piece = upgrade candidate. Distinguish **`missing`** (never installed) from **`stale`** (installed but pre-dates a feature) in the report — they have different fixes and the stale case is the silent-failure trap.

9. **Stale worktrees** — run `rtk git worktree list` and flag non-master worktrees under `.claude/worktrees/`. Propose cleanup.

10. **Durcir stack — LEARNINGS.md split + memory scribe + stack marker** — the current learning stack (`durcir-v2`) keeps workspace rules in a dedicated `LEARNINGS.md` per workspace (not in `CONTEXT.md`) with `## Active Learnings` / `## Candidates` / `## Archived Learnings` / `## Drift log`, runs the global memory scribe on `Stop` + `SessionEnd`, and stamps the root `CLAUDE.md` `## Learning mode` with `<!-- learning-stack: durcir-v2 -->`. Detect the project's state:
   - **Marker `durcir-v2` present** → ✅ on the current stack (still run the scribe sub-checks of #8: the marker says the project was migrated, not that the machine still has the hook). **Pre-journal v2 wording** (same marker, older text, 2026-11-11 change) — grep CLAUDE.md for `Never /clear without`, `Before closing`, `When 10 proposals wait`, `memory-inbox line`, `×N`, `L2` as a maturity rung, or a `## Memory` row sending `/memorise` to "thread update / bump / graduate": flag as **stale wording**; fix = step 5 (replace the `## Memory` rows, the **Closing** line and the `## Learning mode` bullets from `CLAUDE.template.md`, translated; `AGENT.md ## Rules` bullets and `LEARNINGS.md` header comments from their templates, rules themselves untouched, an existing `×N` tolerated). No marker bump: file formats are compatible.
   - **Marker `durcir-v1` present** → **stale: v1 → v2**. Rules are split already; missing: the scribe wiring on the machine, `## Candidates` in each `LEARNINGS.md`, the refreshed `/memorise` (A0 + workspace map), the `## Learning mode` scribe line, the marker bump. Propose the "Durcir v2 migration" below.
   - **Pre-v2 wording left in `## Startup` / `## Navigation` / `## Memory`** (any stack state) — grep CLAUDE.md for a `## Startup` line starting with `claude-mem inject…` ("claude-mem injects compressed context automatically") and for a Navigation history line (`"What did we do before?"`, `« Qu'a-t-on fait avant ? »`, `Past context`) that routes to `mem-search` with no `DECISIONS.md ## Ledger` first. Same for a `## Memory` row sending the session summary to claude-mem or durable facts to `## Ledger` only (v2: states → `## Facts (current)`). All describe the claude-mem-as-primary-memory era: since v2 the injected Ledger + Learnings are the resume surface and claude-mem is a read-only archive. Flag as stale; fixed by v2 migration step 5 (one-line replacements from `CLAUDE.template.md`, translated).
   - **No marker, learnings still inside `CONTEXT.md`** (`## Active Learnings` / `## Archived Learnings`, or a legacy `## Learnings`, sitting under the brief) → **pre-Durcir**. Propose the split migration (Step 3, learning-layer step 3 below): move the rules verbatim into a new `<workspace>/LEARNINGS.md`, add the `## Drift log`, purify `CONTEXT.md`, stamp the marker. **The hook is already backward-compatible** (it reads both `LEARNINGS.md` and `CONTEXT.md`), so this is a **quality** migration, never a break-fix — nothing stops working if deferred.
   - **No marker, no learnings anywhere** → just add the marker and create an empty `LEARNINGS.md` per workspace.
   Report which workspaces still carry learnings in `CONTEXT.md` (the migration candidates) and whether the marker is present.

11. **Repo layout — workspace law + `docs/` convention** — four sub-checks. Declaration is free and safe; physical moves are opt-in and diff-reviewed only.
   - **Undeclared workspaces** — every folder with an `AGENT.md` must be named in CLAUDE.md (Structure or Routing). Run `rtk find . -maxdepth 2 -name AGENT.md`; for each, grep its folder name in CLAUDE.md. A folder with `AGENT.md` absent from CLAUDE.md = drift (the SessionStart hook flags this live too). Propose adding it to the Routing table + `## Structure`.
   - **Missing `## Repo layout` section** — if CLAUDE.md has no `## Repo layout` section, propose adding it from `CLAUDE.template.md` (the workspace law + `docs/` convention). Cross-ref check 1.
   - **Meta-docs at the root** — list root-level docs other than `CLAUDE.md`, `DECISIONS.md`, `README.md`, `LEARNINGS.md` (a light project's rule file — never move it) (e.g. `ROADMAP.md`, `PLAN*.md`, `AUDIT.md`, `READINESS.md`) and first-party doc folders that are neither workspaces nor framework support (e.g. `legal/`, `.planning/`). These belong in `docs/`. Propose the tidy (Step 3, repo-layout step) — opt-in, diff-reviewed.
   - **`docs/` collision** — if a `docs/` folder has its own `AGENT.md` (it's a workspace), the law keeps it a workspace: do NOT move meta-docs into it, do NOT force-rename it. Flag it — meta-docs go to `_docs/` instead, and note new documentation workspaces should use a role name (`documentation/`).

### Step 3 — Patch, section-by-section, with validation

After the audit, ask the user which sections to migrate. For each approved section:

- If diff > 20 lines: show the diff first, wait for OK
- If touching > 3 files: summarize and confirm
- Apply edits
- Create an atomic commit per section with message: `refactor: upgrade <area> to latest 0-to-Hero architecture`

Do NOT batch-commit everything. One section = one commit.

### Learning layer migration (check #8)

If the user approves migrating the Learning layer, execute in order. **Note on the global hook:**

> **The hook is global but refresh-safe by design.** `~/.claude/hooks/inject-learnings.sh` is shared by **every** 0-to-Hero project on the machine. It injects `## Active Learnings` uncapped (user-curated) but caps a legacy `## Learnings` section at **5 lines** — so refreshing the hook can never blow up the per-session injection of an un-migrated project. The cap is the safety net.
> Curating a fat legacy section into the Active/Archived split (step 3) is therefore a **quality** improvement (the *right* 5 rules get injected instead of an arbitrary first-5, and you can lift the cap), **not a safety prerequisite**. Still nice to show the user the before/after injection size when a section is large, so they see the value of curating.

1. **Install / refresh the hook globally (idempotent)** — if `~/.claude/hooks/inject-learnings.sh` does not exist, copy it from `$REPO/core/hooks/inject-learnings.sh` (see Sources of truth) and `chmod +x` it. If it exists, verify byte-identical with the source; if different, show the diff AND the before/after injection size for each affected project (see caveat above), then ask. Treat "exists but not byte-identical" as `stale global infra`, not "already installed".

2. **Opt the project into the hook** — merge the SessionStart hook entry into the project's `.claude/settings.json`:
   ```json
   {
     "hooks": {
       "SessionStart": [
         { "hooks": [ { "type": "command", "command": "bash ~/.claude/hooks/inject-learnings.sh" } ] }
       ]
     }
   }
   ```
   Preserve any existing hooks. If a SessionStart hook with the same command already exists, skip (idempotent). If it exists in the **flat** form (`{ "type": "command", ... }` directly inside the `SessionStart` array, no `hooks` wrapper), it has never run: rewrite it into the nested form above and tell the user their Learning layer was inert until now.

3. **Create `<workspace>/LEARNINGS.md` and move the rules out of `CONTEXT.md` (Durcir split)** — the current stack keeps workspace rules in a dedicated `LEARNINGS.md` (three sections: `## Active Learnings` / `## Archived Learnings` / `## Drift log`) and keeps `CONTEXT.md` purely situational (brief + Current state + Thread). For each workspace:

   - Create `LEARNINGS.md` from `core/templates/LEARNINGS.template.md` (four empty sections + format comments, `## Candidates` included) if absent.
   - **Move any existing learnings out of `CONTEXT.md` verbatim** into `LEARNINGS.md`:
     - Existing `## Active Learnings` / `## Archived Learnings` in CONTEXT.md → move them as-is into the same sections of LEARNINGS.md.
     - A legacy single `## Learnings` section → move its rules into `## Active Learnings`; if **> 5 rules**, keep the ~5 most load-bearing in `## Active Learnings` and move the rest **verbatim** into `## Archived Learnings` (never delete, never reword — only sort; ask the user to pick the keepers if unsure).
     - Then **remove the learnings sections from `CONTEXT.md`** so it is brief + Current state + Thread only.
   - Never invent rules. Counters (`×N`) are no longer part of the format: leave an existing one alone or drop it, never add one.
   - **Safe by design**: the hook reads both files, so a workspace not yet migrated keeps injecting from `CONTEXT.md` until you get to it.

3bis. **Scaffold DECISIONS.md** — the hook installed in step 1 injects `## Facts (current)` and `## Ledger (facts of record)`, so they must exist or the injection is half-dead.
   - If `./DECISIONS.md` is missing → create it from `core/templates/DECISIONS.template.md` (four zones, empty, with format comments).
   - If it exists archive-only → prepend `## Facts (current)`, `## Proposals` and `## Ledger (facts of record)` (empty, with their format comments) above the existing content and relabel the existing archive heading to `## ADR archive` if needed. Never touch existing ADR prose.
   - If it has Ledger + ADR only → v2 step 4bis adds Facts + Proposals.
   - If already four zones → no-op.
   Never invent ledger facts — the section is added empty; the user fills it later via `/memorise`.

4. **Add Pre-work checklist to every `AGENT.md`** — insert the section right after the `Last updated:` line and before `## Invocation scope`. Content from `core/templates/AGENT.template.md`. Also replace the legacy `## Gotcha` section (if present) with the updated `## Rules` section from the template.

5. **Update CLAUDE.md `## Memory` table and `## Learning mode` section** — merge from `core/templates/CLAUDE.template.md`, including the **`<!-- learning-stack: durcir-v2 -->` marker**, the scribe bullet, the two SessionStart hooks and the two Durcir levels (L1 LEARNINGS.md → L3 Gotchas; no counter, no L2 rung). Preserve any project-specific content elsewhere in CLAUDE.md. The marker is what `/memorise`'s stack-freshness check reads — without it the project keeps proposing the upgrade.

6. **Refresh the global `/memorise` + `/gotcha`, remove local shadows** — these are global-only commands. Refresh `~/.claude/commands/memorise.md` and `~/.claude/commands/gotcha.md` idempotently from `core/templates/commands/` (copy if missing or not byte-identical — same refresh-safe pattern as the hook in step 1). Then, if the project still has a local `.claude/commands/memorise.md` or `gotcha.md`, **delete it** so the project resolves the global command — unless it carries genuine project-specific customizations, in which case flag them and ask before removing. Never write a fresh per-project copy: a frozen local copy is exactly what makes a project stop proposing this upgrade once the template advances.

6bis. **Refresh the global `/bootstrap-upgrade` delegator stub** — install `~/.claude/commands/bootstrap-upgrade.md` from `core/templates/commands/bootstrap-upgrade.md` idempotently (copy if missing or not byte-identical). This is the **stub** (~17 lines that resolve `$REPO` and read this procedure live), never a full copy of this file. If the installed command is a full copy of the procedure (frozen, drifts as the architecture evolves — and worse, hides every later upgrade it should propose), replace it with the stub. Unlike `/memorise`, the stub has no project-specific or generic logic to preserve — always overwrite to match the template.

7. **Verify** — run the hook once in the project root to confirm it produces valid JSON (or exits silently if the `## Active Learnings` sections, `## Facts` and the `## Ledger` are all empty); the payload must carry no `⚠ Memory payload over` line. Show the output to the user.

Commit message: `feat: install 0-to-Hero learning layer (hook + LEARNINGS.md Durcir split + DECISIONS.md Ledger + agent checklist + durcir-v2 marker)`

### Durcir v2 migration (check #10, from `durcir-v1`)

What v2 adds: the background memory scribe (updates existing `## Facts` keys and `CONTEXT.md ## Current state`, queues the rest in `## Proposals` and `LEARNINGS.md ## Candidates` while the session runs), the `## Candidates` section, `/memorise` clause A0 (consume scribe candidates before writing an Active rule) and the workspace-map step, the optional parent `CLAUDE.md`. Rationale and numbers: `core/decisions/adr-archive.md` (2026-11-08, 2026-11-09, 2026-11-10). Execute in order, user validates each step:

1. **Install / refresh the scribe, the injector, the statusline and the handover hooks globally (idempotent, once per machine)** — `mkdir -p ~/.claude/hooks/scribe && cp $REPO/core/hooks/scribe/*.js ~/.claude/hooks/scribe/`, plus `core/hooks/inject-learnings.sh`, `core/hooks/claude-statusline.js` and `core/hooks/handover/*.js` into `~/.claude/hooks/`, and `core/templates/commands/handover.md` into `~/.claude/commands/`, only for files missing or not byte-identical (show the diff when replacing). **The injector is part of this step on purpose**: a v2 scribe with a v1 injector writes `## Facts` that no session ever sees. Run `node ~/.claude/hooks/scribe/scribe-writer.js --selftest` and `node ~/.claude/hooks/scribe/scribe-worker.check.js`; both must pass before wiring.
2. **Wire `Stop` + `SessionEnd` in the global `~/.claude/settings.json`** — merge the entries from `core/hooks/scribe/README.md` (nested form, `"async": true`, `"timeout": 10`; Windows: full `node.exe` path), and offer the synchronous `--inbox` entry on `Stop` (the self-draining inbox). Same for the handover pair: `handover-write.js` on `PreCompact`, `handover-read.js` on `SessionStart` (see `core/hooks/handover/README.md`). Skip an entry already present (same script and same arguments). Preserve every other hook. Optional `env`: `SCRIBE_ROOTS` (restrict to the user's project folders), `SCRIBE_DISCORD_WEBHOOK` or `SCRIBE_DISCORD_ENV` for alerts — ask, never invent values.
3. **Freeze claude-mem capture if present** — if `~/.claude/settings.json` `enabledPlugins` has a `claude-mem@…` key (or `~/.claude-mem/claude-mem.db` exists) and its `env` lacks `CLAUDE_MEM_DISABLE_OBSERVATION=1` or `CLAUDE_MEM_DISABLE_SUMMARY=1`: back up `~/.claude-mem/claude-mem.db` to `claude-mem.db.bak-<date>` beside it (sqlite3 `.backup`, or python `Connection.backup()` when the CLI is absent; `PRAGMA integrity_check` must return `ok`), then add both to the global `env`. Both already present → no-op, no backup. The archive stays searchable (`mem-search`). Explain the why in one line: one model turn per tool use, re-reading the whole context, for a capture the markdown files already carry. **Then mute its SessionStart injection** (same rule as the fresh bootstrap): if `~/.claude-mem/settings.json` `CLAUDE_MEM_EXCLUDED_PROJECTS` does not cover this project, back the file up (`settings.json.bak-<date>`) and add `<root>/**` for each `SCRIBE_ROOTS` folder (else the project path), comma-separated, both drive-letter cases on Windows. Already covered → no-op.
4. **Add `## Candidates` to every workspace `LEARNINGS.md`** (root file on a light project) — insert the section from `core/templates/LEARNINGS.template.md` (with its format comments) between `## Active Learnings` and `## Archived Learnings` when absent. Never move or reword existing rules.
4bis. **Add `## Facts (current)` and `## Proposals` to `DECISIONS.md`** — insert both sections with their format comments (from `core/templates/DECISIONS.template.md`) directly above `## Ledger (facts of record)` when absent (order: Facts, Proposals, Ledger). **Never convert the existing ledger automatically**: it stays as the dated log, untouched. Then run one assisted promotion pass: read the ledger, list the lines that describe a state still true today (host, domain, app name, accounts, pricing, commitments — typically 10-15 lines, never more than 40), and propose each as `- **Key**: value (since <date of the ledger line>)`, one `y/n` per line, exact wording from the ledger line, no inference. The section may stay short: the scribe fills it in the following sessions. Report the count promoted / skipped.
5. **Update CLAUDE.md `## Learning mode`, `## Startup` and the Navigation history line** — merge from `core/templates/CLAUDE.template.md`: the scribe bullet, the "Durcir stack v2 — …" intro and the **`<!-- learning-stack: durcir-v2 -->` marker** (replace `durcir-v1`). Then replace the two pre-v2 sentences flagged by check 10: the `## Startup` line `claude-mem injects compressed context automatically…` → the template's "The SessionStart hook injects `DECISIONS.md ## Ledger` and each workspace's `## Active Learnings`, kept current by the background memory scribe… claude-mem is the read-only archive of past sessions." and the Navigation `"What did we do before?"` line → `DECISIONS.md ## Ledger` (injected) → then `mem-search` for older history. One-line replacements, translated to the project language, nothing else in those sections touched. Preserve everything else.
6. **Refresh the global `/memorise`** — same idempotent copy as learning-layer step 6; the v2 template carries clause **A0**, the **Workspace map** step and the **v2 freshness check**. Remove any local `.claude/commands/memorise.md` shadow (it would keep flagging v1 forever).
7. **Offer the workspace map (optional)** — if the project's parent folder holds other bootstrapped projects and no `CLAUDE.md`, offer once to scaffold `<parent>/CLAUDE.md` from `core/templates/WORKSPACE-MAP.template.md`. Machine-local, never committed to a published repo. On `n`, never ask again for this parent (note it in the audit report).
8. **Verify both directions** — (a) capture: start a short session in the project (or feed the trigger one `SessionEnd` payload on stdin, see README "Seeing where the scribe is"), then check `~/.claude/scribe/<slug>/journal.jsonl` gained a line and the `scribe: …` report appeared; (b) restitution: run `bash ~/.claude/hooks/inject-learnings.sh` from the project root and confirm the payload carries `# Facts (current)` and no `⚠ Memory payload over` line; run `bash ~/.claude/hooks/inject-journal.sh` the same way once the scribe has written a `JOURNAL.md` block and confirm `# Recent history` comes back (and that the hook is registered in the global `SessionStart`). A journal that advances proves activity, not that memory is written **and** seen. Show the user the visible effects: the `scribe:` line after a turn, the `✍` / `✉` statusline segments (passive, no reminder), and the sidebar if installed.
9. **Offer the VS Code sidebar (optional, for users who never open a terminal)** — `tools/claude-hub/README.md`: build the `.vsix` with `npx @vscode/vsce package` and `code --install-extension`. It shows per project the scribe badge, the memory inbox `✉ N` and a "run the scribe now" button; nothing else on the machine changes.

Commit message (project side, steps 4-5 only — the rest is machine-global and not committed): `feat: durcir-v2 — LEARNINGS.md Candidates + scribe wiring documented + marker bump`

### Repo layout tidy (check #11)

Declaration is free and safe; physical moves carry reference-breakage risk, so they are opt-in and diff-reviewed.

1. **Add the `## Repo layout` section** to CLAUDE.md from `CLAUDE.template.md` if absent (the workspace law + `docs/` convention). Translate the prose to the project language; keep the heading English.
2. **Declare undeclared workspaces** — for each folder with `AGENT.md` not referenced in CLAUDE.md, add it to the Routing table + `## Structure`. No file moves.
3. **Tidy meta-docs into `docs/` (opt-in)** — present the list of root meta-docs + non-workspace doc folders. On approval: `git mv` each into `docs/`, then update every reference (CLAUDE.md routing/structure pointers, cross-doc links, any path in scripts/CI). Show the diff first (it crosses the 20-line / 3-file thresholds). **Never move** framework/path-contract folders — `.claude/`, `.github/`, `.git/`, or any data/output dir referenced by code or CI by hardcoded path — declare those in `## Structure` instead. Skip any move that would break a reference the user can't easily update; leave the file and just declare it.
4. **`docs/` collision** — if `docs/` is itself a workspace (`AGENT.md` present), keep it; route meta-docs to `_docs/` and flag it to the user.

Commit message: `refactor: adopt repo-layout convention (workspace law + docs/ for meta-docs)`

### Step 4 — Final summary

After all migrations, report:
- Sections migrated (with commit hashes)
- Sections skipped (with reason)
- Any remaining manual work the user must do
- Confirm with: **Bootstrap upgrade complete.**

## Rules

- **Detect & preserve project language** — before any patch, sniff the dominant language of the existing `CLAUDE.md`, `CONTEXT.md` and `AGENT.md` (look at section bodies, comments, examples — not the structural headings). If the project is non-English (typical: French), translate the **prose** of any new content (template descriptions, gloses, examples, comments) into that language before injection. **Section markers — `## Active Learnings`, `## Archived Learnings`, `## Current state`, `## Thread`, `## Pre-work checklist`, `## Invocation scope`, `## Rules`, `## Memory`, `## Learning mode`, `## Ledger (facts of record)`, `## ADR archive`, etc. — stay in English** because `/memorise`, `inject-learnings.sh` and the upgrade itself match them literally. The 0-to-Hero repo is the only project where prose stays English (because it ships publicly on GitHub); never propagate that English-only rule to a user project.
- **Never overwrite user customizations** without asking. If CLAUDE.md has an extra section not in the template, flag it as ambigu, never delete it.
- **Preserve local content** — the template provides canonical sections, but any project-specific routing table, intro, or rules stay. Translation under the language rule above only applies to **new content being injected**, never to existing prose the user wrote.
- **Agents are not copy-paste** — when upgrading an AGENT.md, keep the existing Role / Capabilities / Skills / Process / Limits content. Only add the `## Pre-work checklist` section (header) + `## Invocation scope` section, replace the legacy `## Gotcha` section with the updated `## Rules` section, and fix the heading to include the professional role. If role is unclear, ask.
- **Learnings and facts are user-grown** — never invent Learnings or ledger content when installing the layer. The `## Active Learnings` / `## Archived Learnings` sections and the DECISIONS.md `## Ledger (facts of record)` section are always added empty (just the section marker + HTML comments describing their purpose). Real content is added later by the user via `/memorise`.
- **No auto-push** — commits stay local. User pushes when ready.
- **Abort cleanly** on uncommitted changes in target repo — ask user to commit or stash first.

## If user says "dry-run" or "audit only"

Do Step 1 only. Produce the report. Exit without touching any files.
