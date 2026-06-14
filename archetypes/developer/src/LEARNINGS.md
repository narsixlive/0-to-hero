# Learnings — Src

<!-- Workspace rule register (Durcir). L1 Active → L2 AGENT.md `## Rules` → L3 root `CLAUDE.md ## Gotchas`. Only Active is injected. -->

## Active Learnings
<!-- Format: `- ALWAYS/NEVER [action] ([why]) ×N`. /memorise bumps ×N on recurrence; graduate at ×3. -->
- ALWAYS test SQLite migrations on a fresh empty DB (past bug: existing DB hid a schema drift)
- NEVER mock the DB in integration tests — use SQLite `:memory:` for realism (mocks let broken migrations pass)
- ALWAYS reset the React Query `QueryClient` between tests (aggressive cache leaks state across tests)

## Archived Learnings
<!-- Demoted / non-recurrent rules. Kept, NOT injected. -->

## Drift log
<!-- `- [rule] | captured DATE | drift DATE | delay Nd | L?→L? | note`. Drifts <7d repeatedly → graduate straight to L3. -->
