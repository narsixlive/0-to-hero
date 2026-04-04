# TaskFlow — App de gestion de taches

App web TypeScript / React / Node.js. Solo dev.

## Structure
- /planning → Specs, architecture, decisions techniques
- /src → Code, tests, review
- /docs → Documentation technique et guides
- /.memory → Memoire projet
- /.skills → Competences disponibles

## Routing
| Intention | Workspace | Lire dans l'ordre |
|-----------|-----------|-------------------|
| Nouvelle feature, refacto, architecture | /planning | CONTEXT.md → AGENT.md → GOTCHA.md |
| Coder, tester, reviewer | /src | CONTEXT.md → AGENT.md → GOTCHA.md |
| Rediger ou mettre a jour la doc | /docs | CONTEXT.md → AGENT.md → GOTCHA.md |

## Ordre de lecture (toujours le meme)
1. CONTEXT.md (sur quoi je travaille)
2. AGENT.md (qui je suis, quoi charger)
3. GOTCHA.md section Critiques (ce que je ne dois pas faire)
4. Skills seulement si AGENT.md les demande
5. .memory/NOTES.md seulement si la tache le necessite

## Conventions de nommage
- Composants React : PascalCase
- Fichiers de test : [nom].test.ts
- Branches git : feat/[nom], fix/[nom], chore/[nom]

## Regles globales
- Jamais de code sans test
- Les decisions d'architecture passent par /planning avant /src
