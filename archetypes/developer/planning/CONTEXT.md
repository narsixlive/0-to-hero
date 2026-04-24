# Planning — TaskFlow

<!-- BRIEF — stable zone, regenerated only at bootstrap or major pivot -->

## Project
Planning workspace for TaskFlow, a task management app.
We work here on feature specs, architecture decisions,
and technical choices. Everything that needs to be decided before coding.

## Constraints
- Solo dev: specs must be clear enough to pick up after a break
- No over-engineering: YAGNI, we specify only what we'll code in the next 2 weeks

## What makes a good deliverable here
- A spec fits on one screen, with clear acceptance criteria
- An architecture decision includes the "why" in 1 line
- You can read the spec and estimate effort without asking for clarifications

<!-- END BRIEF — zone below is maintained by /memorise -->

---

## Learnings
<!-- Durable workspace rules. Append-only via /memorise (auto-proposed, user validates). Format: `- ALWAYS/NEVER [action] ([why])` -->
- ALWAYS end specs with an "Accepted when: [list]" section (prevents ambiguous sign-off)
- NEVER decide architecture in /src — all structural decisions go through /planning first (keeps decisions discoverable)

## Current state
- User auth: specified ✅, in development
- Tag system: to be specified
- REST API: architecture defined, not yet formally documented
Updated: 2026-04-01

## Thread
<!-- Appended by /memorise, pruned to the 5 most recent entries. -->
<!-- Older entries live in claude-mem (retrievable via mem-search). -->
