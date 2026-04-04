# Architecture — 0 to Hero

## Les 4 couches

### Couche 1 : CLAUDE.md — La carte
GPS du projet. Lu en premier, toujours.
- Identite du projet + routing vers les workspaces
- Court et scannable (si tu scrolles, c'est trop long)
- Ne decrit PAS le travail, ne decrit PAS les agents

### Couche 2 : CONTEXT.md — La piece
Brief du workspace. Ce qu'on donnerait a un nouveau collegue.
- Decrit le travail, le projet, l'audience, les contraintes
- L'essentiel tient sur un ecran
- 80% description du travail / 20% comportement max

### Couche 3 : AGENT.md — Le specialiste
Cerveau du workspace. Transforme Claude en specialiste.
- Role, capacites, skills, process, limites
- Dense et actionnable (pas de prose, que de l'instruction)
- Skills en mode `always` ou `on-demand`

### Couche 4 : GOTCHA.md — Le bouclier
Memoire d'erreur. Auto-alimente par l'agent.
- Erreurs passees, pieges connus, lecons apprises
- Format : ❌ [erreur] → ✅ [bonne pratique] (YYYY-MM-DD)
- L'agent propose des ajouts, l'utilisateur valide

## Transversal : .memory/NOTES.md
Format libre, date. Jamais charge par defaut.
Les agents ecrivent avec validation utilisateur.

## Transversal : .skills/
Skills disponibles — jamais charges globalement, toujours via AGENT.md.
- Installes depuis le catalog ou crees sur mesure (si pattern repete 3+)

## Transversal : ROADMAP.md (optionnel)
Feuille de route du projet, generee par le plan mode.
- Vit a la racine du projet (pas dans un workspace)
- Format adapte au profil : lean (solo) ou structure (equipe/client)
- Reference dans le CLAUDE.md via le routing

## Flux de lecture standard

```
CLAUDE.md → CONTEXT.md → AGENT.md → GOTCHA.md → [skills on-demand] → [.memory/ si necessaire]
```

Principe : token-efficient. Chaque fichier lu doit etre justifie.

## Bootstrapping — Flow unifie

Le bootstrap detecte la situation de l'utilisateur et adapte son comportement.
Deux axes d'adaptation : la **situation** (repo/plan) et le **profil** (technique/creatif/debutant).

```
Entree utilisateur
    │
    ├── Detecte repo existant ? ──oui──→ Scan adaptatif
    │       │non                              │
    │       ▼                                 ▼
    ├── Deduit le profil (silencieux) ◄───────┘
    │   technique / creatif / non-technique
    │       │
    │       ▼
    ├── Detecte plan existant ? ──oui──→ Analyse plan
    │       │non                              │
    │       ▼                                 ▼
    ├── Propose Plan Mode (Opus)              │
    │   optionnel, l'utilisateur              │
    │   peut skip                             │
    │       │                                 │
    │       ▼                                 ▼
    └──────────────► Bootstrap contextuel
                     (questions adaptees selon
                      ce qu'on sait deja
                      + vocabulaire adapte au profil)
                          │
                          ▼
                     Generation workspaces
```

### Classification du profil

Deduction silencieuse a partir du scan et des premieres reponses.
Pas de question posee — le profil se raffine au fil de la conversation.

| Signal | Profil |
|--------|--------|
| Code source, config, stack detectee | Technique |
| Markdown seul, pas de code | Creatif / Redactionnel |
| Rien + description non-technique | Non-technique |

Impact : vocabulaire des questions, profondeur outillage, token reducers proposes, zone du catalog consultee.

### Classification du projet

Deduction silencieuse apres Q1 (ou le scan). Se combine avec le profil.

| Signal | Classification | Impact |
|--------|---------------|--------|
| Livrable unique, deadline courte | Ephemere | Mode leger (1 CLAUDE.md, pas de workspaces) |
| Donnees de personnes reelles (patients, eleves, medical, juridique), activites avec donnees personnelles (e-commerce, facturation, CRM) | Donnees sensibles | Barrieres techniques : `.claudeignore` + `.gitignore` + `_private/` |
| Plusieurs personnes contribuent au projet ("on est X", "notre equipe", benevoles). Exclure "mes clients" = relation prestataire, pas equipe | Equipe | AGENT.md avec coordination, ROADMAP structure |

Les classifications se combinent et se raffinent au fil des reponses.

### Les 4 cas d'entree

| Cas | Repo | Plan | Comportement |
|-----|------|------|--------------|
| A | Non | Non | Plan mode propose → bootstrap classique (4 questions) |
| B | Non | Oui | Analyse plan → bootstrap allege (Q1-Q2 pre-remplies) |
| C | Oui | Non | Scan repo → plan mode propose → bootstrap contextuel |
| D | Oui | Oui | Scan repo + analyse plan → bootstrap minimal (validation) |

### Outillage universel

La recherche d'outils existants (MCP, API, integrations) s'applique a TOUS les
outils cites par l'utilisateur, pas seulement aux stacks techniques. Canva,
Scrivener, Teachable — tout passe par la meme verification.

### Scan adaptatif (cas C et D)

Le scan doit couter moins cher que les questions qu'il evite.

```
Toujours (cout quasi nul) :
    ├── ls racine + 1 niveau
    ├── git log --oneline -10
    └── Fichiers cles (package.json, Cargo.toml, README, CLAUDE.md)

Si petit projet (< ~20 fichiers) :
    └── Lecture complementaire possible

Si gros projet :
    └── Stop — demander a l'utilisateur
        "C'est un gros repo, dis-moi en 2 phrases
         ce qui compte et ou t'en es"
```

Principe : le scan ne doit jamais couter plus de tokens que les questions qu'il remplace.

Si monorepo detecte et sous-projet choisi : re-scanner uniquement le sous-dossier.
Ignorer le reste du repo pour la suite.

### Plan mode

- **Modele** : Opus (raisonnement strategique, une seule passe bien faite)
- **Nature** : conversation strategique, pas un formulaire
- **Optionnel** : propose, jamais impose. Skip silencieux pour projets ephemeres ou usage personnel simple (< 3 modes, pas de phases sequentielles)
- **Comportement** : Opus pose les bonnes questions selon ce que l'utilisateur donne, challenge le plan ET s'auto-critique
- **Sortie** : ROADMAP.md a la racine, format adapte au profil
- **Fin** : l'utilisateur choisit son modele pour la suite

Pourquoi Opus uniquement ici : c'est la seule etape qui demande du raisonnement strategique profond. Tout le reste (scan, bootstrap, generation, installation) est de l'execution structuree — Sonnet fait le meme job pour moins cher.

### Choix des modeles

| Etape | Modele | Raison |
|-------|--------|--------|
| Plan mode | Opus | Raisonnement strategique, challenge, vision d'ensemble |
| Scan repo | Sonnet | Lecture + synthese, pas de raisonnement profond |
| Bootstrap (questions + generation) | Sonnet | Execution structuree |
| Recommandations (skills, outils) | Sonnet | Pattern matching catalog → profil |
| Installation | Sonnet | Commandes CLI, verifications |

## Bootstrapping — Generation

→ `core/bootstrap/bootstrap-prompt.md`

Le systeme ne fournit pas de templates a remplir.
Le bootstrap genere une structure sur-mesure a partir des reponses
et du contexte detecte (repo, plan, scan).
