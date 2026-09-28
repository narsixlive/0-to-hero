Add a one-line Gotcha rule to the Gotchas section of the root `CLAUDE.md`, based on the latest mistake or correction in this conversation.

Rules:

1. **Format strictly**: `NEVER/ALWAYS [action] ([short why])`
2. **ONE line only**. No narrative. No date. No bullets within the rule.
3. **Derive** from the user's latest correction, or from a mistake you just made and acknowledged.
4. **Gate first** — a Gotcha is the last rung of the last resort. Before writing, print one verdict line: `"<rule>" | enforced: yes rung N <file:line> / no (checked <seams>) | fix-rung: 1-4 <one-line fix> / none`. Check every rung (shared seam, hook / CI / test / lint config, template or config, `AGENT.md` process) and `mem-search` if the problem smells familiar — it may already be fixed. If a surgical fix exists (one file, ~10 lines, one verification command), propose it instead: `Fix at source instead of Gotcha? (y/n): <edit>`. Only `fix-rung: none` or a declined fix continues.
5. **Check duplicates** — read the existing Gotchas section. If a similar rule exists, refine it in place rather than duplicating.
6. **Append** at the end of the Gotchas section of the root `CLAUDE.md` (not a workspace file).

If unclear what rule to write, ask the user for a 1-sentence description of what went wrong before editing.

When done, confirm with: **Gotcha added.** — then quote the exact new (or refined) rule.
