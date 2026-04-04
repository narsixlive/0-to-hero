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

## Etat du projet
| Etape | Statut | Description |
|-------|--------|-------------|
| Etape 0 | ✅ Fait | Catalog curatee → catalog/skills-database.md |
| Etape 1 | ✅ Fait | Structure repo + README + bootstrap + archetypes |
| Etape 1.5 | ✅ Fait | Plan mode Opus + detection repo + scan adaptatif + flow unifie |
| Etape 1.6 | ✅ Fait | Detection profil + adaptation vocabulaire + catalog non-dev + scan enrichi |
| Etape 1.7 | ✅ Fait | Classification projet (ephemere/sensible/equipe) + outillage universel + reset monorepo |
| Etape 1.8 | ✅ Fait | Barrieres techniques donnees sensibles + faux positif equipe + seuil plan mode |
| Etape 1.9 | ✅ Fait | Scan leger .md sans git (cas A') + resolution CLAUDE.md existant (3 cas) |
| Etape 2 | ⬜ A faire | Test sur projet reel NarSix |
| Etape 3 | ⬜ Differe | Docs + communaute |

## Regles globales
- Les archetypes sont des illustrations, pas des templates a copier
- Consulter 0-to-hero-spec.md uniquement si necessaire
- Langue : conversation en francais, tout le contenu ecrit (fichiers, commits, code, commentaires) en anglais
