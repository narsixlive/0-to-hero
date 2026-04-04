# 0 to Hero — Repo

Outil open-source pour structurer son workflow Claude en workspaces efficaces avec agents specialises.

## Structure
- /core → Architecture + bootstrap prompt
- /archetypes → Exemples complets (developer, creative)
- /catalog → Base curatee de skills et tools
- /docs → Plans et specs de developpement du repo
- /tools → Reserve futur

## Routing
| Intention | Ressources |
|-----------|------------|
| Modifier l'architecture ou le bootstrap | core/ARCHITECTURE.md → core/bootstrap/bootstrap-prompt.md |
| Travailler sur un archetype | archetypes/INDEX.md → archetypes/[nom]/ |
| Mettre a jour le catalog | catalog/skills-database.md |
| Planifier / executer une etape | docs/superpowers/plans/ |

## Ordre de lecture
1. Ce CLAUDE.md
2. La ressource cible selon le routing
3. 0-to-hero-spec.md seulement si un detail de format est necessaire

## Regles globales
- Les archetypes sont des illustrations, pas des templates a copier
- Consulter 0-to-hero-spec.md uniquement si necessaire
- Langue : conversation en francais, tout le contenu ecrit (fichiers, commits, code, commentaires) en anglais
