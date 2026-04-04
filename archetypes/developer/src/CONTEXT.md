# Src — TaskFlow

Derniere mise a jour : 2026-04-01

## Projet
Workspace de developpement pour TaskFlow.
On code ici : features, corrections de bugs, refacto, tests.
Toujours a partir d'une spec validee dans /planning.

## Etat actuel
- Stack : TypeScript, React 18, Node.js, SQLite, Vitest
- Auth : en cours (branche feat/auth)
- CI : GitHub Actions, lint + tests a chaque push

## Contraintes
- Pas de code sans test (regle globale)
- Pas de decision d'architecture dans ce workspace — aller dans /planning
- Les PR restent petites : une feature = une PR

## Ce qui fait un bon livrable ici
- Tests passent (unit + integration)
- Pas de regression sur les tests existants
- Code lisible sans commentaire (si besoin d'un commentaire, c'est que le code est trop complexe)
