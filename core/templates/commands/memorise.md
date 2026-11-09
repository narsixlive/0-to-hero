Summarize this session concisely:

- **Decisions**: what we decided and why
- **Changes**: files created or modified and their purpose
- **Blockers**: unresolved problems or open questions
- **Next steps**: what to do first when resuming

Be direct. No filler. No long explanations.

Then identify the dominant workspace(s) touched this session, based on the files you edited. For each touched workspace, update its `CONTEXT.md` following these 4 rules:

1. **Do NOT modify the brief zone** — everything above the `<!-- END BRIEF -->` marker (Project / Constraints / Deliverable) stays untouched.
2. **Overwrite `## Current state`** — 3-5 lines max, with today's date on the `Updated:` line.
3. **Append to `## Thread`** — new entry at the top using format: `### YYYY-MM-DD — [one-line session title]` followed by the summary bullets.
4. **Prune `## Thread`** — keep only the 5 most recent entries; drop older ones. claude-mem keeps the long history (retrievable via `mem-search`).

**Shared repo mode (opt-in).** Only if the project root `CLAUDE.md` contains the marker `<!-- shared-repo -->` (otherwise ignore this paragraph entirely):
- Rule 3: the entry title carries the author — `### YYYY-MM-DD — <author> — [title]`, `<author>` = first token of `git config user.name`, lowercased.
- Rule 4: do not drop the pruned entries — move them verbatim to the top of `docs/THREAD-ARCHIVE.md` under a `## <workspace>` heading (create the file if missing). claude-mem is per-machine; the archive is the only long history the other person has.

`CONTEXT.md` is purely situational now (brief + state + thread). Workspace rules live in `LEARNINGS.md` — handled in the next step. If no workspace was touched, skip the CONTEXT.md updates.

## Workspace Learnings — Durcir lifecycle (after state update)

Workspace rules live in `<workspace>/LEARNINGS.md`, NOT in `CONTEXT.md`. If a touched workspace has no `LEARNINGS.md`, create it first with three empty sections and their format comments: `## Active Learnings`, `## Archived Learnings`, `## Drift log` (see the Learning mode section of the root `CLAUDE.md` for the ladder).

For each touched workspace, scan the session for **reusable patterns specific to that workspace**. A good Learning candidate:

- Is reformulable in one line, format `ALWAYS/NEVER [action] ([why])`
- Generalizes beyond the single file or task that triggered it
- Will likely apply to future sessions in the same workspace

**Default outcome = a fix, not a rule.** A stored Learning is the LAST resort — the fallback for genuinely behavioral patterns no structure can enforce. Treat every candidate as a fix proposal until proven otherwise.

**Mandatory gate verdict — one line per candidate, printed BEFORE any y/n question.** Run both gates below and print their result; a gate with no printed verdict counts as not run:

`[workspace] "<candidate>" | enforced: yes rung N <file:line> / no (checked <seams>) | fix-rung: 1-4 <one-line fix> / none | → fix / archive / rule / skip`

The `enforced` answer comes from READING, never from memory — cite the rung and file:line that enforces it, or name every seam you checked and found bare. "Enforced" means at ANY rung of the ladder below, not just code: the shared seam, a hook / CI check / test / lint config, a template or config file, an `AGENT.md` process line. A problem is often already fixed at a rung you did not expect — find it before proposing anything. If the candidate smells like a problem seen before, `mem-search` it: a past session may have fixed it already (cite the observation). This applies to every candidate, including rules born from a bug fixed THIS session (the most common false Learning: the session fixed the code AND stored the rule — the fix already IS the memory).

**Redundancy gate — kill the candidate BEFORE proposing it** if either applies:

- **The code now enforces it.** The mistake is structurally impossible in the code as it stands — whether the fix landed this session or in a past one (guard in the shared seam, DB constraint, lock, type, CI test). For any candidate born from a bug that got fixed, read the current code at the seam before proposing: if the guard is already there, the candidate is dead. A rule the code enforces is a fact, not doctrine to re-inject — do NOT propose it as Active. If future work must still honor the constraint (e.g. a scaling assumption behind the fix), offer ONE line directly to `## Archived Learnings` (constraint of record, never injected) or to the `DECISIONS.md` ledger instead.
- **It is already written at another layer.** Check the workspace `AGENT.md` `## Rules` (L2), the root `CLAUDE.md` (`## Gotchas` L3 + global rules), and `DECISIONS.md`. Already there → skip silently; a `×N` bump only exists within `LEARNINGS.md`. Close-but-not-identical → propose amending the existing rule in place, never a near-duplicate L1 copy.
**Fix-at-source gate — convert the rule into structure before storing it.** For each candidate that survives the redundancy gate, check whether a surgical fix would make the rule structurally unnecessary. Walk the enforcement ladder, stop at the first rung that applies:

1. **Code guard at the shared seam** — assert, validation, DB constraint, lock, type
2. **Hook or CI check** — PreToolUse block, PostToolUse formatter/checker, existing test
3. **Template / config edit** — when the rule polices generated or configured files
4. **AGENT.md process line** — when the rule is really a step in the role's process

If a rung applies AND the fix is surgical — **one file, ~10 lines max, verifiable with one command** — propose it instead of the rule: `[workspace] Fix at source instead of rule? (y/n): <one-line edit description>`. On `y` → apply the edit, show the diff, run the verification, and do NOT write the Learning (optionally offer ONE constraint-of-record line to `## Archived Learnings` or the `DECISIONS.md` ledger, as in the redundancy gate). On `n` → the candidate continues below.

If a real fix exists but is too big for session end → park it as the FIRST item of **Next steps** in the session summary AND the workspace `## Current state`, and do NOT write the Learning — the parked fix is the memory. Never write both the rule and the parked fix.

Only candidates with no structural fix (genuinely behavioral rules) proceed to the recurrence check.

For each surviving candidate, **check for recurrence** — read the workspace's `LEARNINGS.md` `## Active Learnings`, `## Archived Learnings` AND `## Candidates` (scribe proposals, same rule in other words counts) (and `mem-search` the pattern if unsure):

**A0) Already in `## Candidates` (the scribe saw it first).** Never write a second Active line: move the scribe's line into `## Active Learnings`, keep its `[toolu_…]` provenance, set `×N` = its `seen ×N` + 1, and add the owner quote if this session has one. Then, for the touched workspaces, list every remaining `## Candidates` line and ask once per line: `[workspace] Scribe candidate "<rule>" seen ×N — y (→ Active ×N) / n (delete) / fix (rewrite then Active)`. Both gates above apply to a promoted candidate like to any rule.

**A) Already present (recurrence) — do NOT skip. The duplicate IS the signal.**
- First re-run BOTH gates on the existing rule as written (older rules predate the gates):
  - **Code now enforces it** (a fix landed since it was captured — read the seam to confirm) → do NOT bump; propose archiving instead: `[workspace] Code now enforces "<rule>" — move to Archived? (y/n)`. This is how pre-gate rules drain out.
  - **A surgical fix-at-source exists** → a rule that keeps recurring is the best proof a structural fix pays. Propose the fix (same format as the gate); on `y` apply it and move the rule to `## Archived Learnings` as constraint of record instead of bumping.
- Otherwise bump its `×N` counter by 1. If it was in `## Archived Learnings`, move it back into `## Active Learnings`.
- If the recurrence happened because the rule was *not followed* this session (you had to re-learn or re-apply it the hard way), add a line to `## Drift log`: `- [rule] | captured <date if known, else ?> | drift <today> | delay <Nd or ?> | L1→? | <short note>`.
- If you are not confident it is the same rule, ask: `[workspace] Same as existing "<rule>" (×N)? bump / new (b/n)`.

**B) New — ask before writing.** `[workspace] Add learning? (y/n): ALWAYS/NEVER [action] ([why])`. On `y` → append to `## Active Learnings` as `- <rule> ×1`. On `n` → skip.

**Graduation (the list drains upward, never just grows).** After bumping/adding, for any Active rule that now meets a threshold, propose promotion — ask per rule, never auto-apply:

- **×3 reached, OR stable (applied cleanly across ~3 sessions), OR it blocked work** → propose graduating to this workspace's `AGENT.md` `## Rules` (L2 — role doctrine): `[workspace] Graduate to AGENT.md Rules (L2)? (y/n): <rule>`
- **Cross-workspace in nature, OR high-criticality (security / personal data / money / legal)** → L3 candidate. **L3 is the last rung of the last resort.** Print the gate verdict line FIRST, before any graduation question: a rule that recurs across workspaces is the strongest proof a fix at a shared seam pays (root hook, shared lib, CI, template) — propose that fix before the Gotcha. Only `fix-rung: none` (or a declined fix) proceeds to `/gotcha` → root `CLAUDE.md` `## Gotchas` (L3 — cross-workspace doctrine). A high-criticality rule may jump to L3 on first sight, but never skips the gate.

On `y` for a graduation → into `AGENT.md` `## Rules` (L2), copy the rule **verbatim, with its `(why)`**. Into `## Gotchas` (L3), write it **compressed to ONE line**, strict format `NEVER/ALWAYS [action] ([short why])` — no narrative, no dates; overflowing rationale goes to the `DECISIONS.md` ADR archive, never into the Gotcha. In both cases, **remove it from `## Active Learnings`**. On `n` → leave it in Active. Drift diagnostic: if a rule's `## Drift log` lines show it drifts in **< 7 days repeatedly**, it is in the wrong layer — recommend graduating it straight to L3.

**Cap (hard, keep Active lean).** `## Active Learnings` must end this step at **5 rules or fewer** per workspace. While over the cap, propose — oldest / least-recently-relevant first — archiving to `## Archived Learnings` (kept, NOT injected — never deleted) or merging near-siblings into one rule: `[workspace] Archive stale learning? (y/n): <rule>`. Each proposal still asks y/n, but proposing until the cap is reached (or the user has declined every remaining rule) is not optional.

**Stale ×1 sweep (drain the graveyard).** Once per touched workspace, take the OLDEST rule still at ×1 in `## Active Learnings` and re-run both gates on it, same verdict line as above (older rules predate the gates; a ×1 that never recurs is usually a constraint of record, not doctrine — its home is `## Archived Learnings` or the fix itself). One rule per workspace per /memorise — the list drains even when nothing recurs.

Never propose a Learning not grounded in what actually happened this session (no generic best-practice noise). Never invent `×N` counts or drift entries.

## Propose facts of record (after Learnings)

Scan the session for **durable, project-level facts** — the kind that must survive every future session and are easy to lose in the observation stream. Trigger categories:

- **Acquisitions** — domain bought, paid license/account, infrastructure provisioned
- **Renames** — app, product, repo, or brand name changed
- **Committing external choices** — host, imposed stack, key vendor/provider
- **Low-reversibility commitments** — contractual deadline, hard dependency, pricing tier

A good fact-of-record candidate:

- Is a one-line statement of fact, NOT a rationale and NOT a behavioral rule
- Is project-level — not workspace-scoped (those are Learnings), not NEVER/ALWAYS (those go via `/gotcha`)
- Would be expensive or risky to rediscover if forgotten

For each candidate (0 to 3 per session max):

1. State it as a dated one-liner: `YYYY-MM-DD — [fact]`
2. Ask the user: `Add to DECISIONS.md ledger? (y/n): YYYY-MM-DD — [fact]`
3. On `y` → append the line under the `## Ledger (facts of record)` section of the project root `DECISIONS.md` (create the file from `DECISIONS.template.md` if missing)
4. On `n` → skip, do not write

Never invent a fact not grounded in this session. Never write narrative in the ledger — rationale belongs in the ADR archive below it, not the ledger.

## Stack freshness check (before confirming)

Read the project root `CLAUDE.md`. If it does **not** contain the marker `<!-- learning-stack: durcir-v1 -->` (missing, or an older version like `durcir-v0` / no marker at all), the project predates the current learning stack — its rules are probably still inside `CONTEXT.md` with no graduation or drift log. Print exactly one line and do nothing else automatic:

`⚠️ This project isn't on the current learning stack (durcir-v1). Run /bootstrap-upgrade to migrate (splits rules into LEARNINGS.md + adds graduation/drift log). Want me to run it now?`

Do NOT migrate automatically — only offer. If the marker is present and current, say nothing.

**Repo-layout freshness (independent of the stack marker).** Also check the layout convention — a project can be on `durcir-v1` yet predate it. Flag (one line, only when something is off; otherwise say nothing) if **either**:
- a folder with an `AGENT.md` is **not referenced** in CLAUDE.md (undeclared workspace — the SessionStart hook surfaces this too), or
- CLAUDE.md has **no `## Repo layout` section**, or meta-docs (`ROADMAP.md`, `PLAN*.md`, `AUDIT.md`, … any `.md` beyond `CLAUDE.md`/`DECISIONS.md`/`README.md`) sit **at the project root** instead of in `docs/`.

`⚠️ Repo layout drift (undeclared workspace and/or meta-docs at root). Run /bootstrap-upgrade to adopt the layout convention (docs/ for meta-docs + workspace law). Want me to run it now?`

Only offer — never move files or rename folders automatically.

**L3 health (Gotchas bloat).** Count the rules under the root `CLAUDE.md` `## Gotchas`. If there are more than ~12, or any rule spans multiple lines, print exactly one line and do nothing else automatic:

`⚠️ Gotchas bloat: <N> rules, <M> multi-line. Worth a consolidation pass? (merge siblings, one line each, demote workspace-scoped ones to their AGENT.md ## Rules)`

When done, confirm with: **Memorised.** — then list the workspaces updated, learnings added/bumped, any graduations (→ L2 / L3), any facts of record added, and whether a stack upgrade was suggested (e.g., `scrapers: +1 learning, app: ×3→L2 graduation, +1 fact of record`).
