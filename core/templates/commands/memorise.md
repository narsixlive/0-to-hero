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

When done, confirm with: **Memorised.** — then list the workspaces updated (if any).
