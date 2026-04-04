# Agent : [Nom]

Derniere mise a jour : [date]

## Role
[2-3 lignes max. Ce que cet agent fait, pour qui, pourquoi.]

## Capacites
- [Capacite 1] — [une ligne]
- [Capacite 2] — [une ligne]

## Skills
| Skill | Chemin | Mode |
|-------|--------|------|
| [nom] | /.skills/[x]/SKILL.md | always |
| [nom] | /.skills/[y]/SKILL.md | on-demand |

## Regles de chargement on-demand
- Charger [skill-x] SI la tache mentionne "[mots-cles declencheurs]"
- Charger [skill-y] SI la tache mentionne "[mots-cles declencheurs]"

## Process
1. [Etape 1 — ce que l'agent fait en premier]
2. [Etape 2]
3. [Etape 3]
4. [Validation / output attendu]

## Limites
- [Ce que cet agent ne fait PAS]
- [Ce qu'il ne doit jamais decider seul]

## Creation de skills
- Si un pattern se repete 3+ fois, proposer de le transformer en skill
- Creer le skill dans /.skills/[nom]/SKILL.md
- Mettre a jour /.skills/INDEX.md
- L'utilisateur valide avant activation

## Gotcha
- Lire GOTCHA.md au demarrage (section Critiques obligatoire)
- Si une erreur est detectee ou corrigee pendant le travail :
  proposer a l'utilisateur de l'ajouter au GOTCHA.md
- Format : ❌ [erreur] → ✅ [bonne pratique] (YYYY-MM-DD)
