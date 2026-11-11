Review what the memory scribe queued for this project: short, grouped, skippable. Nothing here is mandatory — the queue lives on disk, an unreviewed proposal archives itself after 60 days and a candidate after 30, and a skipped topic simply comes back next time. Run it when you want, never because a badge says so.

Flags: `/memorise` (default: at most 3 topics) · `/memorise --rules` (also review rule candidates) · `/memorise --all` (no topic cap, plus the Ledger topic).

## 0. Recover handovers

Read every `*.md` directly in `~/.claude/handovers/<cwd-slug>/` (slug = the cwd with every non-alphanumeric character replaced by `-`, e.g. `D--CLAUDE-project-0-to-Hero`). Each is un-memorised work from earlier in this session or from the session it resumed. Blocks overlap: read them oldest first by header time, the newest block's version of an event wins, one event counts once. A `### Unverified` list names what the transcript does not hold verbatim: not found in the transcript or the code → drop it. After **Memorised.**, move the files you read (and their `.consumed` markers) into `done/` in that folder. If the scribe's `JOURNAL.md` block for this session already covers a handover's content, nothing to add: the journal is the history now.

## 1. Collect (read only, no question yet)

- `DECISIONS.md ## Proposals`: `[fact]` lines (a new key, or a changed value) and `[fix]` lines (a code/hook/test change that would make a rule unnecessary — a hypothesis, never applied by the scribe).
- `DECISIONS.md ## Facts (current)`: lines carrying `⚠ disputed → <new> (<date>)` (the scribe saw a different value and did not overwrite).
- With `--rules`: every `<workspace>/LEARNINGS.md ## Candidates` (root `LEARNINGS.md` in a light project).
- With `--all`: the `JOURNAL.md` block(s) of this session — their dated events (`- YYYY-MM-DD — … [toolu_…]`) are Ledger material.

Dedupe first: the same key or the same rule in other words is one item. Nothing in `CONTEXT.md` is edited by this command: the scribe owns `## Current state`, `JOURNAL.md` is the history.

## 2. Ask — one `AskUserQuestion` per topic, three topics at most, by blast radius

Each question is `multiSelect`, each option one line with its evidence id, the recommended option first with `(Recommended)` and a one-line why. Skip a topic with no items. More than three topics with items → take the first three and end with `N topics left: run /memorise again, or --all`.

1. **Disputed Facts** — one question listing every disputed key as `Key: current → proposed (date, evidence)`. Selected = take the proposed value; unselected = keep the current one and archive the proposal. Recommend the value backed by a tool id and the newer date; recommend nothing when both are owner statements.
2. **New facts** — "Which of these become Facts?" Options = `**Key**: value (date) [evidence]`. Unselected → `## Proposals archive`.
3. **Fixes** — "Which of these do you want done now?" A selected fix is applied now if it is surgical (one file, ~10 lines, one command to verify): show the diff, run the check, then archive the proposal with `(done <date>)`. Not surgical → park it as the first line of the journal block's `Next:` and archive the proposal. A fix is never turned into a rule.
4. **Candidates** (with `--rules`, or when fewer than three topics had items) — per workspace, "Which become Active rules?" Before the question, print one verdict line per candidate, from READING, never from memory: `[ws] "<rule>" | enforced: yes <file:line> / no (seams checked) | fix: <one line> / none`. Enforced by code, hook, test or config → recommend archive (a fact of the code, not doctrine). An obvious fix → recommend the fix (it joins topic 3) over the rule. Only a genuinely behavioural rule is recommended Active. Options: each candidate, plus `archive now` is implied for any you explicitly decline; unselected and undeclined simply stay (they expire at 30 days).
5. **Ledger** (with `--all`) — "Which of this session's events are facts of record?" Options from the journal block. Selected → `## Ledger` prepend as `- YYYY-MM-DD — event`. Routine work is never a Ledger line.

## 3. Apply

- **Facts**: replace the key's line in place, `- **Key**: value (since YYYY-MM-DD)`, suffix removed; a new key is appended. A changed value also gets one Ledger line: `- YYYY-MM-DD — **Key** changed: old → new`. One line per key, always.
- **Archive, never delete**: a declined or settled proposal moves verbatim to `## Proposals archive` (create it between `## Ledger` and `## ADR archive` if absent) with `(declined <date>)` or `(done <date>)`; a declined candidate moves verbatim to `## Archived Learnings` with `(declined <date>)`.
- **Active rules**: `- ALWAYS/NEVER [action] ([why]) (since YYYY-MM-DD) [evidence ids]`, provenance kept. No counter anywhere. If a workspace's `## Active Learnings` exceeds 5 lines afterwards, ask once which one to archive — one question, then stop. A selected rule that is cross-workspace or high-criticality (security, personal data, money, legal) is written to Active and named in the report as an L3 candidate for `/gotcha`; this command never writes `## Gotchas`.
- Delete `~/.claude/scribe/<slug>/pending.json` (slug = project root path, non-alphanumerics → `-`, trimmed, lowercased) so the statusline ✉ and the sidebar clear now instead of at the next scribe run.

## 4. Report

One line: `Memorised. facts +N (M disputed settled) · fixes done K · rules +R · archived A · left L` — then, only when it applies, one line each: L3 candidates for `/gotcha`; `⚠️ This project isn't on the current learning stack (durcir-v2). Run /bootstrap-upgrade?` when the root `CLAUDE.md` lacks `<!-- learning-stack: durcir-v2 -->`; `⚠️ Repo layout drift` when a folder with an `AGENT.md` is not referenced in `CLAUDE.md` or meta-docs sit at the root instead of `docs/`. Offer, never migrate or move anything automatically.
