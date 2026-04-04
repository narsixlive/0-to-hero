# Gotchas — Src

Derniere mise a jour : 2026-04-01

## Critiques (toujours lire)
- ❌ Tester les migrations SQLite sur une BDD existante → ✅ Toujours tester sur une BDD vierge (2026-03-28)
- ❌ Mock de la BDD dans les tests d'integration → ✅ Tests d'integration sur vraie BDD en memoire (SQLite :memory:) (2026-03-15)

## Importants (lire si pertinent)
- ⚠️ React Query cache agressif en test — reset le QueryClient entre chaque test (2026-03-20)
