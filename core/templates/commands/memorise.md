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

When done, confirm with: **Memorised.** — then list the workspaces updated and the number of Learnings added (e.g., `scrapperSite: +2 learnings`).
