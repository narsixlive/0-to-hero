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

If no workspace was touched, skip the CONTEXT.md updates.

## Propose workspace Learnings (after state update)

For each touched workspace, scan the session for **reusable patterns specific to that workspace**. A good Learning candidate:

- Is reformulable in one line, format `ALWAYS/NEVER [action] ([why])`
- Generalizes beyond the single file or task that triggered it
- Will likely apply to future sessions in the same workspace
- Is NOT a cross-workspace rule (those go via `/gotcha` to the root CLAUDE.md)
- Is NOT already present in the workspace's existing `## Learnings` section (check first)

For each candidate (0 to 3 per workspace max):

1. State it in `/gotcha` format
2. Ask the user: `[workspace] Add this learning? (y/n): ALWAYS/NEVER [action] ([why])`
3. On `y` → append to the `## Learnings` section of that workspace's `CONTEXT.md`
4. On `n` → skip, do not write

If the workspace has more than 20 entries in `## Learnings`, include a one-line suggestion at the end: `[workspace] has 20+ Learnings — consider consolidating duplicates or promoting stable patterns to a skill.`

Never propose a Learning that is not grounded in what actually happened this session (no generic best-practice noise).

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

When done, confirm with: **Memorised.** — then list the workspaces updated, the number of Learnings added, and any facts of record added (e.g., `scrapperSite: +2 learnings`, `+1 fact of record`).
