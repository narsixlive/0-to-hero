# Learnings — [Workspace name]

<!-- Workspace rule register (Durcir lifecycle). Kept separate from CONTEXT.md so the
     situational context stays pure and the rule lifecycle has its own surface.
     Two levels: L1 Active (here, injected) → L3 root CLAUDE.md `## Gotchas` (cross-workspace doctrine, via /gotcha).
     Only `## Active Learnings` is auto-injected at SessionStart. -->

## Active Learnings
<!-- Workspace rules, injected every session. Keep lean (~5). -->
<!-- Format: `- ALWAYS/NEVER [action] ([why]) (since YYYY-MM-DD) [evidence ids]` — no counter: repetition is not authority. -->
<!-- Written only by the owner (/memorise) or by the scribe when it quotes the owner's own correction in session. -->
<!-- Cross-workspace or high-criticality (security, personal data, money, legal) → /gotcha into root CLAUDE.md `## Gotchas`, then REMOVE it from here. -->

## Candidates
<!-- Written by the background memory scribe (Stop/SessionEnd hook), at most one per run, NOT injected. -->
<!-- Format: `- ALWAYS/NEVER [action] ([why]) (YYYY-MM-DD) [evidence id] (last seen YYYY-MM-DD)` -->
<!-- Promoted into Active Learnings by the owner (/memorise) or by the owner's correction in session. Unreviewed 30 days → Archived Learnings (expired). -->

## Archived Learnings
<!-- Declined, expired or no-longer-needed rules (the code now enforces it). Kept for reference, NOT injected. -->
<!-- The scribe dedups against this section: an archived rule does not come back as a fresh candidate. Never delete to "lighten" — only sort. -->

## Drift log
<!-- Audit trail: one line per rule that was ignored despite being capitalized. NOT injected. -->
<!-- Format: `- [rule] | captured YYYY-MM-DD | drift YYYY-MM-DD | delay Nd | note` -->
<!-- A rule that drifts repeatedly is in the wrong layer → /gotcha, or a fix at the seam instead of a rule. -->
