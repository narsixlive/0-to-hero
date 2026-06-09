# Decisions — [Project name]

Two zones, two purposes. Do not mix them.

- **Ledger** — durable project facts (domain, app name, accounts, commitments).
  Terse, dated one-liners. **Injected at every SessionStart** by the learning
  hook, so these facts are never lost in the observation stream. Fed by
  `/memorise` (auto-proposed, user validates).
- **ADR archive** — narrative rationale ("why did we choose X?"). NOT injected,
  consulted on demand when context is missing. One H2 per decision, dated.

A fact goes in the **Ledger**; the reasoning behind a structural choice goes in
the **ADR archive**. A behavioral rule is neither — that's `/gotcha`.

## Ledger (facts of record)
<!-- Injected at SessionStart. Treat each line as current ground truth. -->
<!-- Format: `- YYYY-MM-DD — [fact]` — one line, factual, no rationale. -->
<!-- Append-only via /memorise (auto-proposed, user validates). Latest line wins on conflict. -->

---

## ADR archive
<!-- On-demand only. One H2 per decision, dated, with the rationale and the alternative considered. -->
