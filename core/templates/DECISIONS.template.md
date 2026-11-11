# Decisions — [Project name]

Two zones, two purposes. Do not mix them.

- **Facts (current)** — the project as it stands: domain, app name, prod host, accounts,
  pricing, commitments. **One line per key**, replaced in place when the value changes, so the
  section is bounded by the number of keys and **injected whole at every SessionStart**.
  Written by `/memorise` (you validate). The scribe never overwrites a value: it marks the line
  `⚠ disputed → new (date)` and queues a proposal.
- **Proposals** — the scribe's inbox, NOT injected: a new key, a changed value, a `[fix]`
  hypothesis. `/memorise` reviews it in grouped questions: `y` → Facts, `n` → archive;
  unreviewed 60 days → archive. Never deleted.
- **Ledger** — dated log of decisions and irreversible events (a commitment made, a launch,
  a migration done, a key's value changed). Append-only, newest first; only the 5 newest are
  injected, the rest is the searchable trace. Written by `/memorise` only; routine events live
  in the root `JOURNAL.md` (written by the scribe).
- **ADR archive** — narrative rationale ("why did we choose X?"). NOT injected,
  consulted on demand when context is missing. One H2 per decision, dated.

A state goes in **Facts**; a dated event in the **Ledger**; the reasoning behind a structural
choice in the **ADR archive**. A behavioral rule is none of these — a cross-workspace one goes
via `/gotcha` (root CLAUDE.md), a workspace one is a Learning in `<workspace>/LEARNINGS.md`.

## Facts (current)
<!-- One line per key, written by /memorise. Injected whole at SessionStart: only what is true now. -->
<!-- Format: `- **Key**: value (since YYYY-MM-DD)` — reuse a key when the same thing changes. The scribe never overwrites a value: it marks the line `⚠ disputed → new (date)` and queues a proposal. -->

## Proposals
<!-- Written by the memory scribe, NOT injected: a new Facts key, a changed value (the Facts line is marked ⚠ disputed), or a [fix] hypothesis. -->
<!-- /memorise drains this section: y → Facts, n → ## Proposals archive; unreviewed 60 days → archive. Format: `- [fact|fix] … (date) [evidence] why: …` -->

## Ledger (facts of record)
<!-- Dated log, newest first. 5 newest injected at SessionStart; grep the rest. -->
<!-- Format: `- YYYY-MM-DD — [decision or event]` — one line, factual, no rationale. Routine work is not a ledger line (it lives in JOURNAL.md, written by the scribe). -->
<!-- Written by /memorise only (the owner validates); the scribe never writes here. -->

---

## ADR archive
<!-- On-demand only. One H2 per decision, dated, with the rationale and the alternative considered. -->
