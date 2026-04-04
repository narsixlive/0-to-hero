# 0 to Hero — Bootstrap

Tu vas m'aider a creer la structure de mon projet avec le systeme
0-to-Hero (architecture 4 couches : CLAUDE.md + Workspaces avec
CONTEXT.md, AGENT.md, GOTCHA.md + memoire + skills).

---

## Phase 0 : Detection

Avant de poser la moindre question, detecte la situation.

### Etape 1 — Scan rapide (commandes en parallele, cout quasi nul)

```bash
ls racine + 1 niveau          # structure du projet
git log --oneline -10          # activite recente (si repo git)
cat package.json / Cargo.toml / pyproject.toml / go.mod  # stack (si existant)
```

Cherche aussi : CLAUDE.md existant, README, docs/, .planning/, ROADMAP.md

**Detection de structures non-standard :**
```bash
ls **/*.ipynb 2>/dev/null | head -5     # notebooks Jupyter
ls packages/ apps/ services/ 2>/dev/null # patterns monorepo
```

Si des notebooks sont detectes → noter "projet data/notebooks" dans la synthese.
Si une structure monorepo est detectee → demander :
> "Je detecte une structure monorepo (packages/, apps/, ...).
> On bootstrappe le projet entier ou un sous-projet en particulier ?"

Si l'utilisateur choisit un sous-projet : re-scanner uniquement le sous-dossier
choisi. Ignorer les resultats du scan initial hors de ce scope pour la suite
(workspaces, outillage, recommandations).

### Etape 2 — Evaluer la taille

- **Petit projet** (< ~20 fichiers) : lecture complementaire possible
- **Gros projet** : stop, ne pas scanner plus. Demander :
  > "C'est un gros repo, dis-moi en 2 phrases ce qui compte et ou t'en es."

Principe : le scan ne doit jamais couter plus de tokens que les questions qu'il remplace.

### Etape 2.5 — Classifier le profil

A partir du scan (ou de son absence), deduire le profil utilisateur.
Pas de question posee — c'est une deduction silencieuse.

| Signal | Profil deduit |
|--------|---------------|
| package.json, Cargo.toml, go.mod, Dockerfile, src/ avec du code | **Technique** |
| .md uniquement, pas de code, pas de config | **Creatif / Redactionnel** |
| Rien detecte + description non-technique en Q1 | **Non-technique** |
| Stack detectee + git log fourni + patterns avances | **Technique confirme** |

Le profil se raffine au fil des reponses (Q1 peut faire basculer de non-technique a technique).

Ce profil conditionne silencieusement :
- Le vocabulaire utilise dans les questions (voir Phase 2)
- La profondeur des recommandations outillage
- Les token reducers proposes (ou non)
- La zone du catalog consultee (dev vs transversal)

### Etape 2.7 — Classifier le projet

A partir de Q1 (ou du scan), deduire silencieusement les caracteristiques du projet.

| Signal | Classification | Impact |
|--------|---------------|--------|
| Livrable unique, deadline courte, pas d'iteration previsible | **Ephemere** | Mode leger : 1 seul CLAUDE.md (routing + contexte + regles), pas de workspaces, pas de .memory/, pas de .skills/ |
| "patients", "eleves", contexte medical/juridique/coaching, donnees de personnes reelles, activites impliquant structurellement des donnees personnelles (e-commerce, facturation, CRM, recrutement) | **Donnees sensibles** | Barrieres techniques : `.claudeignore` + `.gitignore` + `_private/` |
| "on est X a travailler", "notre equipe", "les benevoles", nombre de personnes contribuant au projet | **Equipe** | AGENT.md enrichi (coordination, handoff entre membres), ROADMAP format structure |

**Faux positif equipe :** "mes clients", "pour mes clients", "relation client",
"mes patients" ne declenchent PAS le mode equipe. C'est une relation prestataire/client —
pas une equipe qui contribue au meme projet. Le signal equipe = plusieurs personnes
travaillent ensemble SUR le projet, pas "j'ai une clientele".

Ces classifications se combinent (un projet peut etre equipe + donnees sensibles).
Elles se raffinent au fil des reponses — Q1 peut reveler un projet ephemere,
Q4 peut reveler des donnees sensibles.

**Mode leger (projets ephemeres) :**
```
mon-projet/
├── CLAUDE.md    ← routing + contexte + regles, tout en un
└── (pas de workspaces, pas de .memory/, pas de .skills/)
```
Ne pas proposer de plan mode pour un projet ephemere.

**Donnees sensibles — barrieres techniques :**

Generer automatiquement a la racine du projet :

1. **`_private/`** — dossier dedie aux fichiers contenant des donnees personnelles
2. **`_private/README.md`** — explique le principe :
   > Ce dossier est exclu de Claude et de git.
   > Mettez ici les fichiers contenant des donnees personnelles
   > (dossiers clients, patients, factures, etc).
   > Claude ne pourra ni les lire ni les committer.
3. **`.claudeignore`** — ajouter `_private/` (creer le fichier s'il n'existe pas)
4. **`.gitignore`** — ajouter `_private/` (creer ou completer)

Expliquer le systeme a l'utilisateur au moment de la generation :
> "J'ai cree un dossier `_private/` pour tes donnees sensibles.
> Claude ne peut pas lire ce dossier et git ne le committera pas.
> Mets-y tout ce qui contient des donnees personnelles."

Pas de GOTCHA dedie — les barrieres techniques suffisent.

Si les donnees sensibles sont revelees apres la generation (en Q4 ou plus tard) :
generer retroactivement les memes barrieres et expliquer le systeme.

### Etape 2.9 — Scan leger des .md (si pas de repo git)

Si aucun repo git n'est detecte mais que des fichiers existent dans le dossier,
chercher un `.md` qui decrit le projet avant de poser Q1 a l'aveugle.

1. Candidats prioritaires : `README.md`, `spec.md`, `*-spec.md`, `projet.md`,
   ou le plus gros `.md` a la racine
2. Lire les 30 premieres lignes du meilleur candidat — pas plus
3. Si le contenu decrit le projet (objectif, contexte, stack) → pre-remplir Q1
   et passer en Cas A' (synthese legere + confirmation)
4. Si rien de parlant → Cas A normal

Cout : une lecture de 30 lignes max. Gain : potentiellement Q1 entiere sautee.

### Etape 3 — Classifier la situation

| Detecte | Cas | Action suivante |
|---------|-----|-----------------|
| Ni repo ni plan, pas de .md parlant | A | → Phase 1 (plan mode) |
| Pas de repo mais .md descriptif trouve | A' | → Synthese legere + Q1 pre-remplie + Phase 2 |
| Plan mais pas de repo | B | → Phase 1.5 (analyse plan) puis Phase 2 |
| Repo mais pas de plan | C | → Presenter synthese, puis Phase 1 (plan mode) |
| Repo + plan | D | → Presenter synthese + analyse plan, puis Phase 2 |

**Cas A' — synthese legere (fichiers sans git) :**
> "Je vois : [fichiers detectes], [type de contenu]. Pas de repo git.
> D'apres [fichier.md], ton projet c'est : [resume en 1 ligne]."
> "C'est bien ca ?"

L'utilisateur confirme ou corrige. Puis continuer avec Q2.

**Cas C et D — synthese repo :**
Si un repo est detecte, presenter la synthese en 3 lignes max :
> "Je detecte : [type de projet], [X commits], derniere activite [date].
> Stack : [langages/frameworks detectes]."

Puis poser une seule question :
> "Tu en es ou ? (debut / milieu / bloque / refonte)"

---

## Phase 1 : Plan Mode (Opus) — optionnel

**Propose, ne force jamais.** Si l'utilisateur sait deja ce qu'il veut faire, skip.

### Filtre de complexite — ne PAS proposer le plan mode si :

- Le projet est classe **ephemere**
- Le projet est un **usage personnel simple** : Q1 mentionne "gerer", "organiser",
  "suivre", "trier" sans notion de construction ("construire", "lancer", "livrer",
  "deployer", "publier", "developper")
- Moins de 3 modes de travail distincts identifies en Q2

Le plan mode se justifie quand il y a des phases sequentielles, des dependances,
ou un scope ambitieux. Pour les projets simples, passer direct au bootstrap.

> "Tu veux qu'on structure ton projet en phases avant de commencer ?
> Pour cette etape je recommande Opus — c'est le modele le plus fort
> en raisonnement strategique. Une seule passe suffit pour structurer
> ton projet. Apres, tu choisis le modele que tu veux pour la suite."

### Si l'utilisateur accepte

Passe en Opus. Le plan mode est une **conversation strategique, pas un formulaire**.

Comportement attendu d'Opus :
- Lire ce que l'utilisateur donne (description libre, pas de format impose)
- Poser LES bonnes questions — pas une liste figee, les questions dependent
  de ce que l'utilisateur a dit ET de ce qu'il n'a PAS dit
- Challenger le plan : "T'as pense a Y qui bloque avant X ?"
- Challenger le scope : "C'est ambitieux pour un solo, on priorise ?"
- S'auto-critiquer : "Je propose 5 phases mais honnetement la 3 et 4
  pourraient fusionner, je les separe que si..."
- Etre honnete sur ses limites : "J'ai pas assez de contexte sur X,
  dis-m'en plus avant que je structure"
- Si un repo a ete scanne, tenir compte de l'existant dans le plan

Iterer jusqu'a ce que les deux parties soient satisfaites.

### Generer ROADMAP.md

Format adapte au profil de l'utilisateur (deduit des reponses, pas demande) :

**Projet solo / perso :**
```markdown
## Phase 1 — Nom clair
Ce qu'on fait et pourquoi.
Done quand : [une phrase concrete]
```

**Projet avec audience / equipe / client :**
```markdown
## Phase 1 — Nom clair
Objectif : ...
Pour qui : ...
Livrable : ...
Done quand : ...
Depend de : Phase X (si applicable)
```

Pas de dates (l'utilisateur les ajoute s'il veut).
Assez leger pour tenir sur un ecran.

### Fin du plan mode

> "Voila la feuille de route. Tu veux quel modele pour la suite ?
> Je recommande Sonnet — c'est de l'execution structuree a partir d'ici."

L'utilisateur choisit. On continue avec le modele choisi.

### Si l'utilisateur refuse le plan mode

Skip direct a la Phase 2 (questions bootstrap).

---

## Phase 1.5 : Analyse plan existant (cas B et D)

Si l'utilisateur fournit un plan deja fait (colle dans le chat, fichier, ROADMAP.md existant) :

1. Extraire : objectif global, phases/etapes, stack implicite, livrables
2. Presenter la synthese : "Voila ce que je comprends de ton plan : ..."
3. L'utilisateur confirme/corrige
4. Utiliser ces infos pour pre-remplir les questions du bootstrap

---

## Phase 2 : Questions bootstrap

Questions adaptees selon le contexte deja collecte.

### Cas A (rien detecte, pas de plan) — 4 questions

Pose-les UNE PAR UNE. Attends la reponse avant de passer a la suivante.
Le wording s'adapte au profil deduit (etape 2.5). La reponse a Q1
peut faire basculer le profil — adapter les questions suivantes en consequence.

1. **Le projet** — C'est quoi ton projet en une phrase ?

2. **Les modes de travail** — adapte selon le profil :

   **Profil technique :**
   > "Quand tu travailles dessus, tu alternes entre quels types de taches ?
   > Pour chacun, decris en 2-3 phrases : tu fais quoi concretement ?
   > C'est pour qui ? Quel est le livrable ?
   > (ex: planifier/coder/documenter, debug/review/deploy)"

   **Profil creatif / non-technique :**
   > "Quand tu travailles dessus, tu fais quoi concretement au quotidien ?
   > Decris chaque activite en 2-3 phrases : c'est quoi, c'est pour qui,
   > ca donne quoi a la fin ?
   > (ex: ecrire des textes, creer des visuels, organiser du contenu,
   > repondre a des messages)"

   → On cherche 2-4 modes max.

3. **Les outils** — adapte selon le profil :

   **Profil technique :**
   > "Tu utilises quoi ? (langages, frameworks, outils CLI, services)"

   **Profil creatif / non-technique :**
   > "Tu utilises quoi comme outils ? (apps, sites, logiciels)
   > Meme les trucs basiques comptent : Word, Notion, Canva, Google Docs..."

4. **Les regles et les pieges** — Choses a toujours respecter ?
   Erreurs ou galeres passees a ne pas repeter ?

### Cas B (plan fourni, pas de repo) — 2 questions

Q1 et Q2 pre-remplies depuis le plan, presentees pour confirmation.
Poser Q3 et Q4 normalement.

### Cas C (repo scanne, avec ou sans plan mode) — adaptatif

Q1 pre-remplie depuis le scan. Q3 pre-remplie (stack detectee).
Q2 proposee depuis les modes detectes dans le code/git.
Poser Q4 normalement (le scan ne detecte pas les pieges humains).

### Cas D (repo + plan) — validation

Quasi tout est pre-rempli. Presenter la synthese complete.
L'utilisateur valide ou ajuste. Poser Q4.

---

## Ou generer (expliquer a l'utilisateur)

Avant de generer, confirme avec l'utilisateur le dossier cible.
La structure 0-to-Hero se cree **a la racine du projet existant** :

```
mon-projet/              ← le repo/dossier de l'utilisateur
├── CLAUDE.md            ← routing (cree ou enrichi)
├── ROADMAP.md           ← feuille de route (si plan mode utilise)
├── planning/            ← workspace 1
│   ├── CONTEXT.md
│   ├── AGENT.md
│   └── GOTCHA.md
├── src/                 ← workspace 2 (peut etre un dossier existant)
│   ├── CONTEXT.md
│   ├── AGENT.md
│   └── GOTCHA.md
├── .memory/
│   └── NOTES.md
└── .skills/
    └── INDEX.md
```

Regles :
- Si un CLAUDE.md existe deja, appliquer la regle selon son etat :

  **Cas 1 — Court et structure** (sections/tableau reconnaissables) :
  Fusionner directement — ajouter le routing 0-to-Hero comme section supplementaire.

  **Cas 2 — Long ou prose libre** :
  Proposer un remaniement. Montrer a l'utilisateur ce qu'on garderait vs ce qu'on
  restructurerait, et proposer une version condensee qui integre le routing.
  L'utilisateur valide ou ajuste. Un seul CLAUDE.md au final — pas de fichier satellite
  (un deuxieme fichier serait soit pas auto-charge, soit doublerait les tokens au demarrage).

  **Cas 3 — Contradictions fondamentales** (le CLAUDE.md existant contredit le
  fonctionnement de 0-to-Hero : pas de sous-dossiers, pas d'agents, etc.) :
  Signaler le conflit et laisser l'utilisateur decider :
  > "Ton CLAUDE.md actuel fonctionne differemment de 0-to-Hero sur [points precis].
  > Tu as deux options :
  > 1. On adapte ton CLAUDE.md pour integrer le systeme de workspaces
  > 2. Tu gardes ta structure — je t'explique comment 0-to-Hero fonctionne
  >    et tu pioches ce qui t'interesse"
  Ne rien ecrire tant que l'utilisateur n'a pas tranche.
- Les noms de workspaces viennent des reponses a la question 2 — pas de noms generiques
- Les workspaces peuvent reutiliser des dossiers existants du projet (ex: `src/`, `docs/`)
- `.memory/` et `.skills/` sont toujours en dotfiles (caches par defaut dans les explorateurs)
- On ne cree PAS de sous-dossier `0-to-hero/` ou similaire — tout est a plat a la racine
- Si ROADMAP.md existe (du plan mode), le CLAUDE.md pointe dessus dans son routing

Si l'utilisateur n'a pas encore de projet, on lui demande de creer le dossier d'abord.

## Outillage existant (avant de coder)

Avant de generer les workspaces, cherche pour chaque mode de travail
identifie s'il existe un outil qui fait deja le job : MCP server, CLI,
lib, API. L'objectif est d'eviter de coder ce qui existe deja.

**Cette recherche s'applique a TOUS les outils cites en Q3, quel que soit
le profil.** Un outil non-technique (Canva, Scrivener, Teachable, SPSS...)
peut avoir un MCP server ou une API exploitable. Pour chaque outil cite :
1. Chercher s'il existe un MCP server (mcp.so, GitHub `topic:mcp-server [nom]`)
2. Chercher s'il existe une API/integration utilisable
3. Verifier que l'usage est autorise par les CGU du service —
   certains services interdisent explicitement les bots et intégrations non-officielles
   (Instagram/Meta, LinkedIn, WhatsApp...). Un MCP non-officiel peut exister
   mais exposer l'utilisateur a un ban de compte. Dans ce cas : ne pas le proposer.
   Mentionner l'API officielle si elle existe.
4. Si oui et autorise → le mentionner dans l'AGENT.md du workspace concerne
5. Si non → ne rien faire (pas de mention "pas d'integration")

### Adapter la profondeur selon le profil

**Profil technique** → tableau comparatif complet (voir ci-dessous)
**Profil creatif / non-technique** → skip le tableau, proposer directement :
> "Pour [ce mode de travail], je recommande [outil X] — ca fait [Y]
> sans avoir a coder. Tu veux qu'on l'installe ?"
Ne presenter qu'une seule option par mode sauf si le choix est reellement ouvert.

### Ou chercher
- MCP servers : mcp.so, mcpmarket.com, GitHub `topic:mcp-server`
- CLI / libs : GitHub, PyPI, npm selon le langage
- APIs : services SaaS avec free tier

### Comment presenter les options (profil technique)

Pour chaque workspace, presente un tableau comparatif :

| Option | Type | Avantages | Inconvenients | Tokens estimes |
|--------|------|-----------|---------------|----------------|

Remplir les colonnes :
- **Avantages** : pret a l'emploi, maintenance par d'autres, fiabilite, rapidite
- **Inconvenients** : dependance externe, limites, configuration, cout eventuel
- **Tokens estimes** : estimation relative de la consommation Claude pour arriver au resultat
  - Outil existant → faible (config + usage)
  - Lib existante + code glue → moyen (integration + debug)
  - Code from scratch → eleve (dev + debug + maintenance)

### Regle de decision

```
Outil existant qui fait 80%+ du job → l'utiliser
Lib existante + code glue           → si aucun outil complet
Code from scratch                   → dernier recours, justifier pourquoi
```

Le code custom se justifie quand :
- Aucun outil ne couvre le besoin
- L'outil existant est abandonne ou instable
- Le besoin est trop specifique pour un outil generique
- L'utilisateur veut apprendre en codant (le demander)

L'utilisateur valide le choix d'outillage avant de passer a la generation.
Ce choix impacte les AGENT.md (un agent qui utilise un MCP server ≠ un agent qui code un scraper).

## Generation

Une fois les reponses collectees, genere la structure complete :

### CLAUDE.md (routing pur)
- Identite du projet en 1 ligne
- Tableau de routing : intention → workspace → ordre de lecture
- Pointer vers ROADMAP.md si existant
- Conventions de nommage si pertinent
- 2-3 regles globales max
- Court et scannable — si tu scrolles, c'est trop long

### Un workspace par mode identifie, chacun avec :

**CONTEXT.md** (le brief — l'essentiel sur un ecran)
- Ce qu'on fait ici, pour qui, pourquoi
- Etat actuel (meme si c'est "rien encore")
- Contraintes connues
- Ce qui fait un bon livrable
- 80% description du travail / 20% comportement max

**AGENT.md** (le specialiste — dense et actionnable)
- Role en 2-3 lignes
- Capacites concretes
- Process numerote (ce que l'agent fait dans l'ordre)
- Limites (ce qu'il ne fait PAS, ce qu'il ne decide pas seul)
- Section Skills (vide pour l'instant, remplie a l'etape Catalog)
- Section Gotcha : lire GOTCHA.md au demarrage, proposer des ajouts

**GOTCHA.md** (le bouclier — quasi vide au debut)
- Section Critiques avec les erreurs de Q4, format ❌ → ✅ (date)
- Section Importants vide
- Section Resolus vide

### Fichiers transversaux
- `.memory/NOTES.md` — structure (Decisions / Preferences / Lecons) mais vide
- `.skills/INDEX.md` — tableau vide, pret a recevoir

## Recommandations (skills + token reducers)

Apres la generation des workspaces, presente toutes les recommandations
en un seul bloc pour que l'utilisateur valide d'un coup.

### Skills

1. Consulte `catalog/skills-database.md` en interne
2. Pour chaque workspace genere, identifie les skills qui correspondent
3. Propose une shortlist avec pour chaque skill :
   - Le workspace concerne
   - Pourquoi ce skill est pertinent pour CE profil specifiquement
   - Mode recommande (always ou on-demand) et pourquoi

### Token Reducers

Outils qui compressent la sortie des commandes CLI avant qu'elle
n'atteigne le contexte — economie typique de 60-90% des tokens.

| Outil | Ce qu'il fait | Installation |
|-------|---------------|-------------|
| **RTK** | CLI proxy Rust, 34 modules de filtrage, zero dependance. Compresse git, cargo, npm, docker, etc. 60-90% d'economie. | `curl -fsSL https://rtk.sh \| sh` |
| **ContextZip** | Etend RTK : compression de stacktraces (Node/Python/Rust/Go/Java), nettoyage ANSI, extraction web. +10-20% au-dela de RTK. | `curl -fsSL https://raw.githubusercontent.com/jee599/contextzip/main/install.sh \| bash` |
| **ccusage** | Monitoring : lit les JSONL locaux de Claude Code et affiche les metriques de consommation par session. Indispensable pour mesurer les gains. | `npx ccusage@latest` |

### Recommandation selon le profil

RTK et ccusage sont installes automatiquement pour tous les profils.
RTK compresse toute sortie CLI (git, ls, etc.) — ca beneficie a tout
le monde, pas seulement aux devs. ccusage monitore la consommation
de tokens — indispensable quel que soit le profil.

- **RTK** → toujours, tous profils
- **ccusage** → toujours, tous profils
- **ContextZip** → uniquement profil technique avec debugging ou stacktraces frequentes

### Validation

Presente skills et token reducers ensemble dans un seul tableau recapitulatif.
L'utilisateur valide ou ajuste le tout avant de passer au feedback.
Les skills valides sont ajoutes dans les AGENT.md et .skills/INDEX.md.

## Installation (automatique apres validation)

Une fois que l'utilisateur a valide les recommandations, propose
d'installer directement les outils qui ne sont pas encore presents.

### Process
1. Verifier ce qui est deja installe (`rtk --version`, `ccusage --version`, etc.)
2. Lister ce qui manque avec la commande d'installation
3. Demander confirmation a l'utilisateur
4. Installer et verifier que tout fonctionne
5. Signaler les incompatibilites (ex: ContextZip hooks sur Windows)

### Ce qu'on installe
- **Token reducers** valides (RTK, ContextZip, ccusage)
- **MCP servers** valides a l'etape Outillage (ex: linkedin-mcp-server)
- **Skills** qui necessitent une installation (ex: npx pour certains skills)

Ne pas installer sans accord explicite. Presenter la liste complete
et laisser l'utilisateur choisir ce qu'il veut installer maintenant
vs plus tard.

## Feedback

Apres l'installation, demande :
> "Quelque chose a ajuster ? Un workspace pas clair, un mode de travail
> qui manque, un agent qui ne correspond pas ?"

Iterate tant que l'utilisateur n'a pas valide.

## Regles de generation
- Chaque fichier a UN job. Pas de contenu duplique entre fichiers.
- Ordre de lecture standardise : CONTEXT.md → AGENT.md → GOTCHA.md
- Skills en mode always ou on-demand, jamais globalement
- L'agent propose les ajouts au GOTCHA.md, l'utilisateur valide
- Memoire accessible sur demande, jamais chargee par defaut
- Token-efficient : pas de prose, pas de remplissage
- Genere du sur-mesure selon les reponses — pas de contenu generique
- Le contenu doit etre realiste et specifique au profil, pas des placeholders
