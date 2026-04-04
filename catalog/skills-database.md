# Skills & Tools — Catalog curatée

Dernière mise à jour : 2026-04-03
Politique : curatée par usage. La richesse est dans la base, la simplicité dans la recommandation bootstrap.

---

## Comment utiliser ce catalog

Pendant le bootstrap, on détecte le profil → on recommande une shortlist ciblée.
L'utilisateur part avec des skills/agents déjà solides à façonner, pas de zéro.

**Phase 1** : skills + agents existants adaptés au profil
**Phase 2** : l'agent crée du custom si un pattern se répète 3+ fois

---

## Recommandations par profil (vue transversale)

Le bootstrap consulte cette section pour cibler ses recommandations
selon le profil deduit (etape 2.5). Ce n'est pas un nouveau catalog
— c'est une vue filtree de l'existant, reorganisee par usage.

### Profil creatif / redactionnel

| Skill / Agent | Source | Pertinence |
|---------------|--------|------------|
| `pdf` | Anthropic | Creer, fusionner, extraire des PDFs |
| `docx` | Anthropic | Creer et editer des fichiers Word |
| `pptx` | Anthropic | Creer des presentations |
| `internal-comms` | Anthropic | Rapports, newsletters, FAQs |
| `brand-guidelines` | Anthropic | Appliquer une charte graphique |
| `canvas-design` | Anthropic | Art visuel en PNG/PDF |
| `brainstorming` | Superpowers | Questions socratiques pour raffiner des idees |
| `writing-plans` | Superpowers | Structurer un projet en etapes |
| `research-analyst` | VoltAgent | Recherche approfondie et synthese |
| `content-marketing` | VoltAgent | Contenu et strategie marketing |
| `technical-writer` | VoltAgent | Documentation structuree |

### Profil education

| Skill / Agent | Source | Pertinence |
|---------------|--------|------------|
| `pptx` | Anthropic | Creer des supports de cours |
| `xlsx` | Anthropic | Tableurs pour evaluations, suivi |
| `pdf` | Anthropic | Creer des fiches, exercices |
| `brainstorming` | Superpowers | Construire des sequences pedagogiques |
| `writing-plans` | Superpowers | Planifier un programme |
| `research-analyst` | VoltAgent | Recherche documentaire |

### Profil business / gestion

| Skill / Agent | Source | Pertinence |
|---------------|--------|------------|
| `xlsx` | Anthropic | Tableurs, budgets, suivi |
| `pdf` | Anthropic | Documents formels |
| `docx` | Anthropic | Rapports, contrats |
| `internal-comms` | Anthropic | Communication interne |
| `product-manager` | VoltAgent | Specs, roadmaps, priorisation |
| `business-analyst` | VoltAgent | Analyse metier et processus |
| `competitive-analyst` | VoltAgent | Analyse concurrentielle |

### Profil technique

Consulter les sections detaillees ci-dessous (Skills officiels,
Superpowers, Antigravity, Agents specialises) — le bootstrap
selectionne selon la stack detectee.

---

## Skills officiels Anthropic

| Skill | Catégorie | Ce qu'il fait |
|-------|-----------|---------------|
| `pdf` | Documents | Extraire, créer, fusionner des PDFs |
| `docx` | Documents | Créer et éditer des fichiers Word |
| `pptx` | Documents | Créer des présentations PowerPoint |
| `xlsx` | Documents | Créer des tableurs Excel avec formules |
| `internal-comms` | Communication | Rédiger rapports, newsletters, FAQs |
| `brand-guidelines` | Communication | Appliquer couleurs et typos d'une marque |
| `frontend-design` | Dev / Design | UI distinctives React/Tailwind, décisions fortes |
| `web-artifacts-builder` | Dev | HTML complexes avec React et shadcn/ui |
| `mcp-builder` | Dev | Créer des serveurs MCP de qualité |
| `webapp-testing` | Dev | Tester des apps web locales avec Playwright |
| `canvas-design` | Créatif | Art visuel en PNG/PDF |
| `algorithmic-art` | Créatif | Génération d'art avec p5.js |
| `slack-gif-creator` | Créatif | GIFs animés pour Slack |
| `skill-creator` | Meta | Guider la création d'un nouveau skill |

---

## Skills communautaires — Superpowers (obra/superpowers)

Collection de référence, 20+ skills battle-tested. Source : `obra/superpowers`

| Skill | Catégorie | Ce qu'il fait |
|-------|-----------|---------------|
| `test-driven-development` | Testing | Cycle RED-GREEN-REFACTOR, anti-patterns |
| `systematic-debugging` | Debugging | Root cause en 4 phases, traçage, défense en profondeur |
| `verification-before-completion` | Debugging | Valide que la correction fonctionne vraiment |
| `brainstorming` | Collaboration | Raffinement design par questions socratiques |
| `writing-plans` | Collaboration | Création de plans d'implémentation détaillés |
| `executing-plans` | Collaboration | Exécution par lots avec points de contrôle |
| `dispatching-parallel-agents` | Collaboration | Flux de travail subagents concurrents |
| `requesting-code-review` | Collaboration | Checklist pré-révision |
| `receiving-code-review` | Collaboration | Répondre aux retours de review |
| `using-git-worktrees` | Git | Branches de développement parallèles isolées |
| `finishing-a-development-branch` | Git | Décisions fusion/PR |
| `subagent-driven-development` | Meta | Itération rapide avec révision deux étapes |
| `writing-skills` | Meta | Créer nouveaux skills selon bonnes pratiques |
| `using-superpowers` | Meta | Introduction au système de skills |

Labs (expérimental) : `obra/superpowers-lab`
Community-editable : `obra/superpowers-skills`

---

## Skills communautaires — Individuels

| Skill | Source | Catégorie | Ce qu'il fait |
|-------|--------|-----------|---------------|
| `ios-simulator-skill` | conorluddy | Mobile | iOS app building, navigation, tests auto |
| `playwright-skill` | lackeyjb | Dev / Test | Automatisation navigateur avancée |
| `ffuf-web-fuzzing` | jthack | Sécurité | Web fuzzing pour pentest avec ffuf |
| `claude-d3js-skill` | chrisvoncsefalvay | Data / Viz | Visualisations de données D3.js |
| `claude-scientific-skills` | K-Dense-AI | Recherche | Research, science, engineering, finance |
| `web-asset-generator` | alonw0 | Dev / Design | Favicons, icônes app, images social media |
| `loki-mode` | asklokesh | Meta / Agents | Système multi-agent orchestrant 37 agents autonomes |
| `Trail of Bits Security` | trailofbits | Sécurité | Audit CodeQL/Semgrep, détection vulnérabilités |
| `frontend-slides` | zarazhangrui | Créatif | Présentations HTML riches en animations |
| `shadcn/ui` | shadcn | Dev / Design | Composants shadcn, enforcement de patterns |
| `Expo Skills` | expo (officiel) | Mobile | Outils pour apps Expo/React Native |
| `fullstack-dev-skills` | communauté | Dev | 65 skills full-stack tous frameworks |
| `read-only-postgres` | communauté | Dev / Data | Requêtes PostgreSQL read-only avec validation |
| `tdd-guard` | communauté | Dev / Test | Hook qui bloque les violations TDD |
| `compound-engineering` | communauté | Meta | Agents qui transforment les erreurs en leçons |
| `context-engineering-kit` | communauté | Meta | Techniques contexte avancées, footprint token minimal |
| `Skill_Seekers` | yusufkaraaslan | Meta | Convertit une doc web en skill réutilisable |

---

## Skills communautaires — Antigravity (1340+ skills)

Source : `sickn33/antigravity-awesome-skills` — installable via `npx antigravity-awesome-skills`

Ne pas lister les 1340 individuellement. Utiliser les **bundles** pendant le bootstrap.

### Bundles disponibles par profil

| Bundle | Catégorie | Contenu |
|--------|-----------|---------|
| `Essentials` | Tous profils | Fondamentaux universels |
| `Full-Stack Developer` | Dev | Frontend + backend + API + testing |
| `Security Developer` | Sécurité | Audit, pentest, cryptographie, AD attacks |
| `DevOps & Cloud` | Infra | CI/CD, Terraform, Kubernetes, AWS/GCP/Azure |
| `QA & Testing` | Qualité | E2E, TDD, agent evaluation, Playwright |
| `OSS Maintainer` | Dev / Open Source | Gestion contributions, reviews, releases |

### Catégories principales (pour référence)

| Catégorie | Nb skills | Exemples notables |
|-----------|-----------|-------------------|
| Architecture | ~88 | DDD, event-sourcing, monorepo, CQRS |
| Business | ~69 | SEO, pricing, product marketing, growth |
| Data & AI | ~252 | LLM, RAG, LangGraph, ML, analytics, Azure AI |
| Dev | ~180 | Code audit, refactoring, testing patterns, error handling |
| DevOps | ~120 | GitHub Actions, CloudFormation, Temporal, FinOps |
| Security | ~95 | Active Directory, binary analysis, WCAG, cryptography |
| QA | ~65 | E2E, Playwright, web3 testing, agent evaluation |
| Frontend | ~140 | Angular, SwiftUI, shadcn, Tailwind, Radix UI |
| Mobile | ~75 | iOS/Swift, Expo, Kotlin, Electron, game dev |
| Design | ~12 | Apple HIG, Figma, design systems, accessibilité |
| Growth | ~15 | SEO, ASO, viral loops, email marketing |

---

## Agents spécialisés

Source principale : `VoltAgent/awesome-claude-code-subagents` (130+ agents)

### Dev & Code
| Agent | Ce qu'il fait |
|-------|---------------|
| `frontend-developer` | UI/UX React, Vue, Angular |
| `backend-developer` | APIs scalables côté serveur |
| `fullstack-developer` | Développement end-to-end |
| `api-designer` | Architecture REST et GraphQL |
| `mobile-developer` | Mobile multiplateforme |
| `ui-designer` | Design visuel et interactions |
| `websocket-engineer` | Communications temps réel |
| `electron-pro` | Applications desktop |
| `graphql-architect` | Schéma et fédération GraphQL |
| `microservices-architect` | Systèmes distribués |

### Langages (31 agents disponibles)
TypeScript · Python · JavaScript · React · Next.js · Vue · Go · Rust · Java · Swift · PHP · Laravel · Django · FastAPI · Flutter · Expo · Rails · Kotlin · C++ · C# · .NET · Elixir · Spring Boot · Symfony · Angular · SQL · PowerShell · C# · Go · Rust

### Infrastructure & DevOps
| Agent | Ce qu'il fait |
|-------|---------------|
| `devops` | CI/CD, pipelines, automatisation |
| `docker` | Conteneurisation et orchestration |
| `kubernetes` | Gestion clusters |
| `terraform` | Infrastructure as code |
| `terragrunt` | Terraform à grande échelle |
| `security` | Sécurité infrastructure |
| `sre` | Fiabilité et incidents |
| `cloud-architect` | Architecture cloud généraliste |
| `azure` | Spécialiste Azure |
| `network-engineer` | Réseau et connectivité |

### Qualité & Sécurité
| Agent | Ce qu'il fait |
|-------|---------------|
| `code-reviewer` | Revue de code systématique |
| `debugger` | Débogage avancé |
| `qa-automation` | Automatisation des tests |
| `security-auditor` | Audit sécurité |
| `performance` | Optimisation performances |
| `accessibility` | Conformité accessibilité |
| `chaos-engineer` | Tests de résilience |
| `compliance` | Conformité réglementaire |
| `ai-auditor` | Audit de systèmes IA |
| `penetration-tester` | Tests de pénétration |

### Data & IA
| Agent | Ce qu'il fait |
|-------|---------------|
| `data-analyst` | Analyse et visualisation données |
| `data-engineer` | Pipelines et architecture données |
| `data-scientist` | Modélisation statistique |
| `ml-engineer` | Machine learning, entraînement |
| `llm-architect` | Architecture systèmes LLM |
| `prompt-engineer` | Optimisation prompts |
| `mlops` | Déploiement et monitoring ML |
| `nlp-specialist` | Traitement langage naturel |
| `reinforcement-learning` | RL et agents adaptatifs |
| `postgresql-expert` | Optimisation BDD PostgreSQL |

### Business & Produit
| Agent | Ce qu'il fait |
|-------|---------------|
| `product-manager` | Specs, roadmaps, priorisation |
| `technical-writer` | Documentation technique |
| `ux-researcher` | Recherche utilisateur |
| `scrum-master` | Gestion agile |
| `content-marketing` | Contenu et stratégie marketing |
| `business-analyst` | Analyse métier et processus |
| `sales-engineer` | Support technique vente |
| `customer-success` | Fidélisation et onboarding |
| `legal-advisor` | Conseils légaux généraux |
| `wordpress-specialist` | Sites WordPress |

### Recherche & Analyse
| Agent | Ce qu'il fait |
|-------|---------------|
| `research-analyst` | Recherche approfondie |
| `competitive-analyst` | Analyse concurrentielle |
| `market-researcher` | Étude de marché |
| `trend-analyst` | Analyse de tendances |
| `scientific-researcher` | Littérature scientifique |
| `data-researcher` | Recherche et collecte données |
| `project-validator` | Validation d'idées de projet |
| `search-specialist` | Recherche et synthèse web |

### Meta & Orchestration
| Agent | Ce qu'il fait |
|-------|---------------|
| `multi-agent-coordinator` | Coordonne plusieurs agents |
| `context-manager` | Gestion contexte inter-sessions |
| `workflow-orchestrator` | Orchestration workflows complexes |
| `knowledge-synthesizer` | Synthèse connaissances distribuées |
| `agent-installer` | Installation et config d'agents |
| `task-distributor` | Distribution tâches entre agents |
| `performance-monitor` | Monitoring performance agents |
| `it-ops` | Opérations IT et support |

---

## Token Reducers

Outils qui compressent la sortie CLI avant qu'elle n'entre dans le contexte. Recommandes systematiquement au bootstrap.

| Outil | Source | Savings | Ce qu'il fait |
|-------|--------|---------|---------------|
| `RTK` | rtk-ai/rtk | 60-90% | CLI proxy Rust, 34 modules (git, cargo, npm, docker, tsc, etc.), zero dependance |
| `ContextZip` | jee599/contextzip | +10-20% vs RTK | Etend RTK : stacktraces, ANSI, extraction web. Herite tous les filtres RTK |
| `ccusage` | — | — | Monitoring : metriques tokens par session depuis les JSONL locaux |

---

## MCP Servers officiels

| Serveur | Ce qu'il fait |
|---------|---------------|
| `fetch` | Récupérer et convertir du contenu web |
| `filesystem` | Opérations fichiers avec contrôle d'accès |
| `git` | Lire, chercher, manipuler des repos Git |
| `memory` | Mémoire persistante par knowledge graph |
| `sequential-thinking` | Résolution de problèmes par séquences |
| `time` | Conversion de temps et fuseaux horaires |

---

## Mémoire

| Outil | Approche | Quand l'utiliser |
|-------|----------|-----------------|
| `claude-mem` (thedotmack) | SQLite + hooks auto + interface web | Besoin d'historique exhaustif inter-sessions |
| `auto-memory` (fichiers .md) | Curatée, semi-auto, zéro dépendance | Projets légers, décisions clés seulement |
| MCP `memory` | Knowledge graph | Mémoire structurée et interrogeable |

---

## Sources complètes

| Source | Contenu | Stars |
|--------|---------|-------|
| hesreallyhim/awesome-claude-code | Skills, hooks, slash-commands, orchestrators | 36k ⭐ |
| sickn33/antigravity-awesome-skills | 1340+ skills par bundles, installable via npx | 30k ⭐ |
| VoltAgent/awesome-claude-code-subagents | 130+ subagents spécialisés | 16k ⭐ |
| travisvn/awesome-claude-skills | Skills curateurs toutes catégories | 10k ⭐ |
| obra/superpowers | 20+ skills process battle-tested | — |
| modelcontextprotocol/servers | Serveurs MCP officiels | — |
| thedotmack/claude-mem | Mémoire persistante SQLite | — |
