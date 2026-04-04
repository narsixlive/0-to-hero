# [Nom du projet]

[Une phrase qui decrit le projet]

## Structure
- /workspace-a → [description courte]
- /workspace-b → [description courte]
- /.memory → Memoire projet
- /.skills → Competences disponibles

## Routing
| Intention | Workspace | Lire dans l'ordre |
|-----------|-----------|-------------------|
| [type de tache A] | /workspace-a | CONTEXT.md → AGENT.md → GOTCHA.md |
| [type de tache B] | /workspace-b | CONTEXT.md → AGENT.md → GOTCHA.md |

## Ordre de lecture (toujours le meme)
1. CONTEXT.md d'abord (sur quoi je travaille)
2. AGENT.md ensuite (qui je suis, quoi charger)
3. GOTCHA.md ensuite (ce que je ne dois pas faire)
4. Skills seulement si AGENT.md les demande
5. .memory/ seulement si la tache le necessite

## Conventions de nommage
- [regles de nommage des fichiers produits]

## Regles globales
- [2-3 regles max qui s'appliquent a tous les workspaces]
