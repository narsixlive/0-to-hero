# Gotchas — Src

Last updated: 2026-04-01

## Critical (always read)
- ❌ Testing SQLite migrations on an existing DB → ✅ Always test on a fresh empty DB (2026-03-28)
- ❌ Mocking the DB in integration tests → ✅ Integration tests on real in-memory DB (SQLite :memory:) (2026-03-15)

## Important (read if relevant)
- ⚠️ React Query aggressive cache in tests — reset the QueryClient between each test (2026-03-20)
