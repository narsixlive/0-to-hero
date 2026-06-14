Migrate an existing 0-to-Hero-patterned project to the latest architecture. Safe, read-only audit first — then patch section-by-section after user validation.

## Scope

Only projects already following the 0-to-Hero pattern (have a `CLAUDE.md` at root, and likely workspaces with `CONTEXT.md` / `AGENT.md`). Target dir = `$CWD` unless user specifies otherwise.

## Sources of truth (read from the 0-to-Hero repo)

**Resolve the repo root first (`$REPO`).** The canonical sources live in a clone of the 0-to-Hero repo, whose location varies per machine — never hardcode it. Resolve `$REPO` once, in this order, and use it for every path below (all paths are relative to `$REPO/`):

1. **Env var** — if `$ZERO_TO_HERO_HOME` is set and contains `core/templates/CLAUDE.template.md`, use it.
2. **Inside the repo** — if `$CWD` (or an ancestor) contains `core/templates/CLAUDE.template.md` and `core/bootstrap/bootstrap-upgrade.md`, that's the repo root.
3. **Locate the clone** — search the user's usual code roots for a `0-to-hero` / `0 to Hero` checkout (`git remote get-url origin` matching `0-to-hero`), e.g. `find ~ -maxdepth 4 -name CLAUDE.template.md -path '*core/templates*'`.
4. **Ask** — if still unresolved, ask the user for the repo path.

Abort if `$REPO` can't be resolved (the skill can't migrate without the canonical templates).

- `core/templates/CLAUDE.template.md` — canonical CLAUDE.md sections (Shell, Navigation, Modifications, Startup, Memory, Learning mode, Gotchas)
- `core/templates/AGENT.template.md` — agent template (Pre-work checklist + pro role + Invocation scope + Rules)
- `core/templates/CONTEXT.template.md` — workspace context template (Brief / Current state / Thread — purely situational)
- `core/templates/LEARNINGS.template.md` — workspace rule register (`## Active Learnings` / `## Archived Learnings` / `## Drift log`), Durcir lifecycle
- `core/templates/DECISIONS.template.md` — DECISIONS.md dual-zone template (`## Ledger (facts of record)` injected + `## ADR archive` on-demand)
- `core/templates/commands/memorise.md` — `/memorise` command with Durcir Learnings (bump / graduate / archive / drift) + facts-of-record proposal + stack-freshness check
- `core/hooks/inject-learnings.sh` — SessionStart hook that auto-injects workspace `## Active Learnings` (from `LEARNINGS.md`, legacy `CONTEXT.md`) and the DECISIONS.md `## Ledger`
- `core/ARCHITECTURE.md` — 3-layer model + Learning layer, DECISIONS.md as dual-zone (Ledger injected / ADR archive on-demand), `<workspace>/code_<descriptor>/` rule

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

1. **CLAUDE.md structure** — compare section headers against `CLAUDE.template.md`. Required sections: `## Shell`, `## Navigation`, `## Modifications`, `## Startup`, `## Memory`, `## Gotchas`. Flag missing or extra sections.

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

3. **Stale `MEMORY.md` obligatory reads** — grep for `Always read.*MEMORY` or `read /MEMORY` in CLAUDE.md. These should be gone (claude-mem auto-injects).

4. **Architecture layer count** — if `core/ARCHITECTURE.md` exists in target, check it says "3 layers" not "4".

5. **DECISIONS.md dual-zone** — check `./DECISIONS.md` exists at project root AND has both canonical sections: `## Ledger (facts of record)` (injected at SessionStart, durable project facts) and `## ADR archive` (on-demand rationale). Three cases:
   - **Missing file** → propose creating it from `core/templates/DECISIONS.template.md`.
   - **Exists but archive-only** (has decisions/ADR content but no `## Ledger (facts of record)` section) → flag as stale: the file predates the Ledger feature, so the hook injects nothing. Propose prepending the `## Ledger (facts of record)` section (empty, with its format comments) above the existing archive. Keep all existing ADR content untouched, just relabel its heading to `## ADR archive` if it isn't already.
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
   - Every workspace has a `LEARNINGS.md` with a `## Active Learnings` section (empty is fine — the marker must exist). On a pre-Durcir project the learnings still live in `CONTEXT.md` (`## Active Learnings` or legacy `## Learnings`) — that counts, but flag it for the split per check 10. Do NOT flag a migrated project (rules in LEARNINGS.md, none in CONTEXT.md) as missing the layer.
   - `DECISIONS.md` has a `## Ledger (facts of record)` section (the hook injects it alongside Learnings — without it, half the injection is dead; cross-ref check #5)
   - `.claude/settings.json` contains a `SessionStart` hook entry pointing to `bash ~/.claude/hooks/inject-learnings.sh`
   - `~/.claude/hooks/inject-learnings.sh` exists globally and is executable
   - **Hook freshness (CRITICAL — not just existence)** — a stale global hook is worse than a missing one: it exists, the audit looks green, but it silently injects only half. Verify the installed `~/.claude/hooks/inject-learnings.sh` is **byte-identical** to the repo source `core/hooks/inject-learnings.sh`. Cheap proxy if a full diff is overkill: grep the installed hook for `Ledger`, `Active`, and `LEARNINGS` — all three must be present (Ledger extraction + Active/Archived awareness + LEARNINGS.md scanning are the latest-architecture markers). If it exists but lacks any → flag as **`stale global infra`**, not aligned. The fix is migration step 1 (re-copy), which must run before DECISIONS.md/Learnings migrations are meaningful.
   - CLAUDE.md has a `## Learning mode` section
   - **`/memorise` freshness** — `/memorise` (and `/gotcha`) are now **global-only** commands at `~/.claude/commands/`; a project should carry **no** local `.claude/commands/*.md`. Verify the global `~/.claude/commands/memorise.md` is byte-identical to `core/templates/commands/memorise.md` — it must include the **Durcir Learnings block** (bump-not-skip / ×N / graduation / drift log), the **"Propose facts of record"** block, and the **"Stack freshness check"**. A stale global command = **`stale global infra`** (rules never harden, the Ledger never gets fed). Also flag any leftover **project-local** `.claude/commands/memorise.md` / `gotcha.md`: it is drift — a frozen copy that shadows the global and is exactly what makes a project stop proposing this upgrade. Fix = refresh the global command + delete the local shadow (keep the local copy only, after asking, if it carries genuine project-specific customizations).
   Any missing piece = upgrade candidate. Distinguish **`missing`** (never installed) from **`stale`** (installed but pre-dates a feature) in the report — they have different fixes and the stale case is the silent-failure trap.

9. **Stale worktrees** — run `rtk git worktree list` and flag non-master worktrees under `.claude/worktrees/`. Propose cleanup.

10. **Durcir stack — LEARNINGS.md split + stack marker** — the current learning stack (`durcir-v1`) keeps workspace rules in a dedicated `LEARNINGS.md` per workspace (not in `CONTEXT.md`), adds a `## Drift log`, and stamps the root `CLAUDE.md` `## Learning mode` with `<!-- learning-stack: durcir-v1 -->`. Detect the project's state:
   - **Marker `durcir-v1` present** → ✅ on the current stack.
   - **No marker, learnings still inside `CONTEXT.md`** (`## Active Learnings` / `## Archived Learnings`, or a legacy `## Learnings`, sitting under the brief) → **pre-Durcir**. Propose the split migration (Step 3, learning-layer step 3 below): move the rules verbatim into a new `<workspace>/LEARNINGS.md`, add the `## Drift log`, purify `CONTEXT.md`, stamp the marker. **The hook is already backward-compatible** (it reads both `LEARNINGS.md` and `CONTEXT.md`), so this is a **quality** migration, never a break-fix — nothing stops working if deferred.
   - **No marker, no learnings anywhere** → just add the marker and create an empty `LEARNINGS.md` per workspace.
   Report which workspaces still carry learnings in `CONTEXT.md` (the migration candidates) and whether the marker is present.

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
         { "type": "command", "command": "bash ~/.claude/hooks/inject-learnings.sh" }
       ]
     }
   }
   ```
   Preserve any existing hooks. If a SessionStart hook with the same command already exists, skip (idempotent).

3. **Create `<workspace>/LEARNINGS.md` and move the rules out of `CONTEXT.md` (Durcir split)** — the current stack keeps workspace rules in a dedicated `LEARNINGS.md` (three sections: `## Active Learnings` / `## Archived Learnings` / `## Drift log`) and keeps `CONTEXT.md` purely situational (brief + Current state + Thread). For each workspace:

   - Create `LEARNINGS.md` from `core/templates/LEARNINGS.template.md` (empty sections + format comments) if absent.
   - **Move any existing learnings out of `CONTEXT.md` verbatim** into `LEARNINGS.md`:
     - Existing `## Active Learnings` / `## Archived Learnings` in CONTEXT.md → move them as-is into the same sections of LEARNINGS.md.
     - A legacy single `## Learnings` section → move its rules into `## Active Learnings`; if **> 5 rules**, keep the ~5 most load-bearing in `## Active Learnings` and move the rest **verbatim** into `## Archived Learnings` (never delete, never reword — only sort; ask the user to pick the keepers if unsure).
     - Then **remove the learnings sections from `CONTEXT.md`** so it is brief + Current state + Thread only.
   - Never invent rules or `×N` counts. A migrated Active rule with no counter is fine (the hook tolerates a missing `×N`); add `×1` only if you want.
   - **Safe by design**: the hook reads both files, so a workspace not yet migrated keeps injecting from `CONTEXT.md` until you get to it.

3bis. **Scaffold the DECISIONS.md Ledger** — the hook installed in step 1 injects the `## Ledger (facts of record)` section, so it must exist or the injection is half-dead.
   - If `./DECISIONS.md` is missing → create it from `core/templates/DECISIONS.template.md` (both zones, empty, with format comments).
   - If it exists archive-only → prepend the `## Ledger (facts of record)` section (empty, with its format comments) above the existing content and relabel the existing archive heading to `## ADR archive` if needed. Never touch existing ADR prose.
   - If already dual-zone → no-op.
   Never invent ledger facts — the section is added empty; the user fills it later via `/memorise`.

4. **Add Pre-work checklist to every `AGENT.md`** — insert the section right after the `Last updated:` line and before `## Invocation scope`. Content from `core/templates/AGENT.template.md`. Also replace the legacy `## Gotcha` section (if present) with the updated `## Rules` section from the template.

5. **Update CLAUDE.md `## Memory` table and `## Learning mode` section** — merge from `core/templates/CLAUDE.template.md`, including the **`<!-- learning-stack: durcir-v1 -->` marker** and the 3-level Durcir ladder (L1 LEARNINGS.md → L2 AGENT.md Rules → L3 Gotchas). Preserve any project-specific content elsewhere in CLAUDE.md. The marker is what `/memorise`'s stack-freshness check reads — without it the project keeps proposing the upgrade.

6. **Refresh the global `/memorise` + `/gotcha`, remove local shadows** — these are global-only commands. Refresh `~/.claude/commands/memorise.md` and `~/.claude/commands/gotcha.md` idempotently from `core/templates/commands/` (copy if missing or not byte-identical — same refresh-safe pattern as the hook in step 1). Then, if the project still has a local `.claude/commands/memorise.md` or `gotcha.md`, **delete it** so the project resolves the global command — unless it carries genuine project-specific customizations, in which case flag them and ask before removing. Never write a fresh per-project copy: a frozen local copy is exactly what makes a project stop proposing this upgrade once the template advances.

7. **Verify** — run the hook once in the project root to confirm it produces valid JSON (or exits silently if both the `## Active Learnings` sections and the `## Ledger` are empty). Show the output to the user.

Commit message: `feat: install 0-to-Hero learning layer (hook + LEARNINGS.md Durcir split + DECISIONS.md Ledger + agent checklist + durcir-v1 marker)`

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
