# Decisions — [Project name]

Two zones, two purposes. Do not mix them.

- **Facts (current)** — the project as it stands: domain, app name, prod host, accounts,
  pricing, commitments. **One line per key**, upserted when the value changes, so the
  section is bounded by the number of keys and **injected whole at every SessionStart**.
  Fed by the memory scribe and `/memorise` (user validates).
- **Proposals** — the scribe's inbox, NOT injected: facts and decisions it found but may not
  write alone (a new key, your words as the only evidence, a dated event). `/memorise` drains
  it: `y` → Facts or Ledger, `n` → archive. Never deleted by the scribe.
- **Ledger** — dated log of decisions and irreversible events (a commitment made, a launch,
  a migration done, a key's value changed). Append-only, newest first; only the 5 newest are
  injected, the rest is the searchable trace.
- **ADR archive** — narrative rationale ("why did we choose X?"). NOT injected,
  consulted on demand when context is missing. One H2 per decision, dated.

A state goes in **Facts**; a dated event in the **Ledger**; the reasoning behind a structural
choice in the **ADR archive**. A behavioral rule is none of these — a cross-workspace one goes
via `/gotcha` (root CLAUDE.md), a workspace one is a Learning in `<workspace>/LEARNINGS.md`.

## Facts (current)
<!-- One line per key, upserted by the scribe and /memorise. Injected whole at SessionStart: only what is true now. -->
<!-- Format: `- **Key**: value (since YYYY-MM-DD)` — reuse a key when the same thing changes; a change is also logged in ## Ledger. -->

## Proposals
<!-- Written by the memory scribe, NOT injected: what it found but may not write on its own (new key, owner statement as evidence, dated decision). -->
<!-- /memorise drains this section: y → Facts / Ledger, n → ## Proposals archive. Format: `- [fact|log] … (date) [evidence] why: … · seen ×N` -->

## Ledger (facts of record)
<!-- Dated log, newest first. 5 newest injected at SessionStart; grep the rest. -->
<!-- Format: `- YYYY-MM-DD — [decision or event]` — one line, factual, no rationale. Routine work is not a ledger line. -->
<!-- Append-only via the scribe and /memorise (user validates). -->

---

## ADR archive
<!-- On-demand only. One H2 per decision, dated, with the rationale and the alternative considered. -->
