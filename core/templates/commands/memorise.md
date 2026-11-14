Review what the memory scribe queued for this project: short, grouped, skippable. Nothing here is mandatory — the queue lives on disk, an unreviewed proposal archives itself after 60 days and a candidate after 30, and a skipped topic simply comes back next time. Run it when you want, never because a badge says so.

One run empties the queue: every proposal and every candidate ends kept, done or archived. Flags: `/memorise` (default) · `/memorise --all` (plus the Ledger topic). `--rules` is still accepted and changes nothing: candidates are always reviewed.

## 0. Recover handovers

Read every `*.md` directly in `~/.claude/handovers/<cwd-slug>/` (slug = the cwd with every non-alphanumeric character replaced by `-`, e.g. `D--CLAUDE-project-0-to-Hero`). Each is un-memorised work from earlier in this session or from the session it resumed. Blocks overlap: read them oldest first by header time, the newest block's version of an event wins, one event counts once. A `### Unverified` list names what the transcript does not hold verbatim: not found in the transcript or the code → drop it. After **Memorised.**, move the files you read (and their `.consumed` markers) into `done/` in that folder. If the scribe's `JOURNAL.md` block for this session already covers a handover's content, nothing to add: the journal is the history now.

## 1. Collect (read only, no question yet)

- `DECISIONS.md ## Proposals`: `[fact]` lines (a new key, or a changed value) and `[fix]` lines (a code/hook/test change that would make a rule unnecessary — a hypothesis, never applied by the scribe).
- `DECISIONS.md ## Facts (current)`: lines carrying `⚠ disputed → <new> (<date>)` (the scribe saw a different value and did not overwrite).
- Every `<workspace>/LEARNINGS.md ## Candidates` (root `LEARNINGS.md` in a light project).
- With `--all`: the `JOURNAL.md` block(s) of this session — their dated events (`- YYYY-MM-DD — … [toolu_…]`) are Ledger material.

Dedupe first: the same key or the same rule in other words is one item. Nothing in `CONTEXT.md` is edited by this command: the scribe owns `## Current state`, `JOURNAL.md` is the history.

## 2. Decide — from reading, a question only when you cannot decide

The recommendation is the decision (in practice the owner follows it almost every time, and every decision is archived, never deleted): for each item reach a verdict from READING (the code, the hooks, `## Facts`, `CLAUDE.md`), never from memory, and apply it. Most items end archived; a few are kept. Ask only about the items you genuinely cannot settle: one `AskUserQuestion` per topic that has such items, `multiSelect`, one line per item with its evidence id and what makes it undecided; selected = keep, unselected = archive. No undecided item → no question at all.

1. **Disputed Facts** — per key, `Key: current → proposed (date, evidence)`. Check the value where it lives (config, code, a command) when it can be checked, and take what is true now; otherwise take the value backed by a tool id and the newer date. Both values are owner statements and nothing can be checked → undecided, ask. The losing proposal is archived.
2. **New facts** — keep a fact only if it is a durable setting of the project that a future session would get wrong without it, still true when checked, and not already in `## Facts` or `CLAUDE.md`. A passing status, a version, a count, a draft's path, a design in progress → archive.
3. **Fixes** — no question: decide each one from READING the code and act. Already in the code → archive `(done <date>: already applied)`. Still valid and surgical (one file, ~10 lines, one command to verify) → apply it now, show the diff, run the check, archive `(done <date>)`. Still valid but not surgical → park it as the first line of the journal block's `Next:` and archive `(parked <date>)`. Wrong, obsolete or risky (data loss, security, money, anything outward-facing) → do not apply, archive `(declined <date>: <why>)`. List every fix and its outcome in the report so the owner can undo one. A fix is never turned into a rule.
4. **Candidates** — per workspace, print one verdict line per candidate, from READING, never from memory: `[ws] "<rule>" | enforced: yes <file:line> / no (seams checked) | fix: <one line> / none`. Enforced by code, hook, test or config → archive (a fact of the code, not doctrine). Already an Active rule or a Gotcha in other words → archive. An obvious fix → the fix (it joins topic 3), not the rule. A one-off incident that will not recur → archive. Only a genuinely behavioural rule a future session would break again becomes Active. Everything else → `## Archived Learnings` with `(declined <date>: <why>)`: nothing stays in the queue after a run.
5. **Ledger** (with `--all`) — "Which of this session's events are facts of record?" Options from the journal block. Selected → `## Ledger` prepend as `- YYYY-MM-DD — event`. Routine work is never a Ledger line.

## 3. Apply

- **Facts**: replace the key's line in place, `- **Key**: value (since YYYY-MM-DD)`, suffix removed; a new key is appended. A changed value also gets one Ledger line: `- YYYY-MM-DD — **Key** changed: old → new`. One line per key, always.
- **Archive, never delete, always with the outcome**: every reviewed proposal MOVES verbatim out of `## Proposals` into `## Proposals archive` (create it between `## Ledger` and `## ADR archive` if absent) ending with its outcome: `(accepted <date>)` for a fact written to Facts, `(declined <date>)`, `(done <date>)` or `(parked <date>)`. A declined candidate moves verbatim to `## Archived Learnings` with `(declined <date>)`. Tagging a line in place is not archiving: a line left under `## Proposals` or `## Candidates` still counts in the ✉ badge. The outcomes are the data that will later tell which kinds the scribe can settle alone. When done, `## Proposals` and every `## Candidates` hold no item.
- **Active rules**: `- ALWAYS/NEVER [action] ([why]) (since YYYY-MM-DD) [evidence ids]`, provenance kept. No counter anywhere. If a workspace's `## Active Learnings` exceeds 5 lines afterwards, ask once which one to archive — one question, then stop. A selected rule that is cross-workspace or high-criticality (security, personal data, money, legal) is written to Active and named in the report as an L3 candidate for `/gotcha`; this command never writes `## Gotchas`.
- Delete `~/.claude/scribe/<slug>/pending.json` (slug = project root path, non-alphanumerics → `-`, trimmed, lowercased) so the statusline ✉ and the sidebar clear now instead of at the next scribe run.

## 4. Report

First the decisions, kept ones on top, one line each: `kept | archived | done | parked — <item in a few words> — <why in a few words>`, so the owner can reverse any of them by naming it (a reversed line moves back out of the archive or out of Facts/Active). Then one line: `Memorised. facts +N (M disputed settled) · fixes done K · rules +R · archived A · left L` — then, only when it applies, one line each: L3 candidates for `/gotcha`; `⚠️ This project isn't on the current learning stack (durcir-v2). Run /bootstrap-upgrade?` when the root `CLAUDE.md` lacks `<!-- learning-stack: durcir-v2 -->`; `⚠️ Repo layout drift` when a folder with an `AGENT.md` is not referenced in `CLAUDE.md` or meta-docs sit at the root instead of `docs/`. Offer, never migrate or move anything automatically.
