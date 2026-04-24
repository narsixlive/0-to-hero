# Src — TaskFlow

Last updated: 2026-04-01

## Project
Development workspace for TaskFlow.
We code here: features, bug fixes, refactoring, tests.
Always based on a validated spec from /planning.

## Current state
- Stack: TypeScript, React 18, Node.js, SQLite, Vitest
- Auth: in progress (branch feat/auth)
- CI: GitHub Actions, lint + tests on every push

## Constraints
- No code without a test (global rule)
- No architecture decisions in this workspace — go to /planning
- PRs stay small: one feature = one PR

## What makes a good deliverable here
- Tests pass (unit + integration)
- No regression on existing tests
- Code readable without comments (if a comment is needed, the code is too complex)

## Learnings
<!-- Durable workspace rules. Append-only via /memorise (auto-proposed, user validates). Format: `- ALWAYS/NEVER [action] ([why])` -->
- ALWAYS test SQLite migrations on a fresh empty DB (past bug: existing DB hid a schema drift)
- NEVER mock the DB in integration tests — use SQLite `:memory:` for realism (mocks let broken migrations pass)
- ALWAYS reset the React Query `QueryClient` between tests (aggressive cache leaks state across tests)
