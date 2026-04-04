# Skills & Tools — Curated Catalog

Last updated: 2026-04-03
Policy: curated by usage. The value is in the depth, the simplicity is in the bootstrap recommendation.

---

## How to use this catalog

During bootstrap, we detect the profile → we recommend a targeted shortlist.
The user starts with solid, ready-to-shape skills/agents, not from scratch.

**Phase 1**: existing skills + agents adapted to the profile
**Phase 2**: the agent creates custom skills if a pattern repeats 3+ times

---

## Recommendations by profile (cross-cutting view)

The bootstrap consults this section to target its recommendations
based on the inferred profile (step 2.5). This is not a new catalog
— it's a filtered view of the existing one, reorganized by use.

### Creative / editorial profile

| Skill / Agent | Source | Relevance |
|---------------|--------|-----------|
| `pdf` | Anthropic | Create, merge, extract PDFs |
| `docx` | Anthropic | Create and edit Word files |
| `pptx` | Anthropic | Create presentations |
| `internal-comms` | Anthropic | Reports, newsletters, FAQs |
| `brand-guidelines` | Anthropic | Apply brand guidelines |
| `canvas-design` | Anthropic | Visual art in PNG/PDF |
| `brainstorming` | Superpowers | Socratic questions to refine ideas |
| `writing-plans` | Superpowers | Structure a project into steps |
| `research-analyst` | VoltAgent | Deep research and synthesis |
| `content-marketing` | VoltAgent | Content and marketing strategy |
| `technical-writer` | VoltAgent | Structured documentation |

### Education profile

| Skill / Agent | Source | Relevance |
|---------------|--------|-----------|
| `pptx` | Anthropic | Create course materials |
| `xlsx` | Anthropic | Spreadsheets for assessments, tracking |
| `pdf` | Anthropic | Create worksheets, exercises |
| `brainstorming` | Superpowers | Build pedagogical sequences |
| `writing-plans` | Superpowers | Plan a curriculum |
| `research-analyst` | VoltAgent | Documentary research |

### Business / management profile

| Skill / Agent | Source | Relevance |
|---------------|--------|-----------|
| `xlsx` | Anthropic | Spreadsheets, budgets, tracking |
| `pdf` | Anthropic | Formal documents |
| `docx` | Anthropic | Reports, contracts |
| `internal-comms` | Anthropic | Internal communication |
| `product-manager` | VoltAgent | Specs, roadmaps, prioritization |
| `business-analyst` | VoltAgent | Business and process analysis |
| `competitive-analyst` | VoltAgent | Competitive analysis |

### Technical profile

Consult the detailed sections below (Official skills, Superpowers,
Antigravity, Specialized agents) — the bootstrap selects based on the detected stack.

---

## Official Anthropic skills

| Skill | Category | What it does |
|-------|----------|-------------|
| `pdf` | Documents | Extract, create, merge PDFs |
| `docx` | Documents | Create and edit Word files |
| `pptx` | Documents | Create PowerPoint presentations |
| `xlsx` | Documents | Create Excel spreadsheets with formulas |
| `internal-comms` | Communication | Write reports, newsletters, FAQs |
| `brand-guidelines` | Communication | Apply brand colors and typography |
| `frontend-design` | Dev / Design | Distinctive React/Tailwind UIs, strong decisions |
| `web-artifacts-builder` | Dev | Complex HTML with React and shadcn/ui |
| `mcp-builder` | Dev | Create quality MCP servers |
| `webapp-testing` | Dev | Test local web apps with Playwright |
| `canvas-design` | Creative | Visual art in PNG/PDF |
| `algorithmic-art` | Creative | Art generation with p5.js |
| `slack-gif-creator` | Creative | Animated GIFs for Slack |
| `skill-creator` | Meta | Guide the creation of a new skill |

---

## Community skills — Superpowers (obra/superpowers)

Reference collection, 20+ battle-tested skills. Source: `obra/superpowers`

| Skill | Category | What it does |
|-------|----------|-------------|
| `test-driven-development` | Testing | RED-GREEN-REFACTOR cycle, anti-patterns |
| `systematic-debugging` | Debugging | Root cause in 4 phases, tracing, defense in depth |
| `verification-before-completion` | Debugging | Validates the fix actually works |
| `brainstorming` | Collaboration | Design refinement through Socratic questions |
| `writing-plans` | Collaboration | Creating detailed implementation plans |
| `executing-plans` | Collaboration | Batch execution with checkpoints |
| `dispatching-parallel-agents` | Collaboration | Concurrent subagent workflows |
| `requesting-code-review` | Collaboration | Pre-review checklist |
| `receiving-code-review` | Collaboration | Responding to review feedback |
| `using-git-worktrees` | Git | Isolated parallel development branches |
| `finishing-a-development-branch` | Git | Merge/PR decisions |
| `subagent-driven-development` | Meta | Fast iteration with two-step review |
| `writing-skills` | Meta | Create new skills following best practices |
| `using-superpowers` | Meta | Introduction to the skills system |

Labs (experimental): `obra/superpowers-lab`
Community-editable: `obra/superpowers-skills`

---

## Community skills — Individual

| Skill | Source | Category | What it does |
|-------|--------|----------|-------------|
| `ios-simulator-skill` | conorluddy | Mobile | iOS app building, navigation, automated tests |
| `playwright-skill` | lackeyjb | Dev / Test | Advanced browser automation |
| `ffuf-web-fuzzing` | jthack | Security | Web fuzzing for pentest with ffuf |
| `claude-d3js-skill` | chrisvoncsefalvay | Data / Viz | D3.js data visualizations |
| `claude-scientific-skills` | K-Dense-AI | Research | Research, science, engineering, finance |
| `web-asset-generator` | alonw0 | Dev / Design | Favicons, app icons, social media images |
| `loki-mode` | asklokesh | Meta / Agents | Multi-agent system orchestrating 37 autonomous agents |
| `Trail of Bits Security` | trailofbits | Security | CodeQL/Semgrep audit, vulnerability detection |
| `frontend-slides` | zarazhangrui | Creative | Rich HTML presentations with animations |
| `shadcn/ui` | shadcn | Dev / Design | shadcn components, pattern enforcement |
| `Expo Skills` | expo (official) | Mobile | Tools for Expo/React Native apps |
| `fullstack-dev-skills` | community | Dev | 65 full-stack skills across all frameworks |
| `read-only-postgres` | community | Dev / Data | Read-only PostgreSQL queries with validation |
| `tdd-guard` | community | Dev / Test | Hook that blocks TDD violations |
| `compound-engineering` | community | Meta | Agents that turn errors into lessons |
| `context-engineering-kit` | community | Meta | Advanced context techniques, minimal token footprint |
| `Skill_Seekers` | yusufkaraaslan | Meta | Converts web docs into reusable skills |

---

## Community skills — Antigravity (1340+ skills)

Source: `sickn33/antigravity-awesome-skills` — installable via `npx antigravity-awesome-skills`

Do not list all 1340 individually. Use **bundles** during bootstrap.

### Available bundles by profile

| Bundle | Category | Contents |
|--------|----------|---------|
| `Essentials` | All profiles | Universal fundamentals |
| `Full-Stack Developer` | Dev | Frontend + backend + API + testing |
| `Security Developer` | Security | Audit, pentest, cryptography, AD attacks |
| `DevOps & Cloud` | Infra | CI/CD, Terraform, Kubernetes, AWS/GCP/Azure |
| `QA & Testing` | Quality | E2E, TDD, agent evaluation, Playwright |
| `OSS Maintainer` | Dev / Open Source | Contribution management, reviews, releases |

### Main categories (for reference)

| Category | # skills | Notable examples |
|----------|----------|-----------------|
| Architecture | ~88 | DDD, event-sourcing, monorepo, CQRS |
| Business | ~69 | SEO, pricing, product marketing, growth |
| Data & AI | ~252 | LLM, RAG, LangGraph, ML, analytics, Azure AI |
| Dev | ~180 | Code audit, refactoring, testing patterns, error handling |
| DevOps | ~120 | GitHub Actions, CloudFormation, Temporal, FinOps |
| Security | ~95 | Active Directory, binary analysis, WCAG, cryptography |
| QA | ~65 | E2E, Playwright, web3 testing, agent evaluation |
| Frontend | ~140 | Angular, SwiftUI, shadcn, Tailwind, Radix UI |
| Mobile | ~75 | iOS/Swift, Expo, Kotlin, Electron, game dev |
| Design | ~12 | Apple HIG, Figma, design systems, accessibility |
| Growth | ~15 | SEO, ASO, viral loops, email marketing |

---

## Specialized agents

Main source: `VoltAgent/awesome-claude-code-subagents` (130+ agents)

### Dev & Code
| Agent | What it does |
|-------|-------------|
| `frontend-developer` | React, Vue, Angular UI/UX |
| `backend-developer` | Scalable server-side APIs |
| `fullstack-developer` | End-to-end development |
| `api-designer` | REST and GraphQL architecture |
| `mobile-developer` | Cross-platform mobile |
| `ui-designer` | Visual design and interactions |
| `websocket-engineer` | Real-time communications |
| `electron-pro` | Desktop applications |
| `graphql-architect` | GraphQL schema and federation |
| `microservices-architect` | Distributed systems |

### Languages (31 agents available)
TypeScript · Python · JavaScript · React · Next.js · Vue · Go · Rust · Java · Swift · PHP · Laravel · Django · FastAPI · Flutter · Expo · Rails · Kotlin · C++ · C# · .NET · Elixir · Spring Boot · Symfony · Angular · SQL · PowerShell · C# · Go · Rust

### Infrastructure & DevOps
| Agent | What it does |
|-------|-------------|
| `devops` | CI/CD, pipelines, automation |
| `docker` | Containerization and orchestration |
| `kubernetes` | Cluster management |
| `terraform` | Infrastructure as code |
| `terragrunt` | Terraform at scale |
| `security` | Infrastructure security |
| `sre` | Reliability and incidents |
| `cloud-architect` | General cloud architecture |
| `azure` | Azure specialist |
| `network-engineer` | Networking and connectivity |

### Quality & Security
| Agent | What it does |
|-------|-------------|
| `code-reviewer` | Systematic code review |
| `debugger` | Advanced debugging |
| `qa-automation` | Test automation |
| `security-auditor` | Security audit |
| `performance` | Performance optimization |
| `accessibility` | Accessibility compliance |
| `chaos-engineer` | Resilience testing |
| `compliance` | Regulatory compliance |
| `ai-auditor` | AI system audit |
| `penetration-tester` | Penetration testing |

### Data & AI
| Agent | What it does |
|-------|-------------|
| `data-analyst` | Data analysis and visualization |
| `data-engineer` | Data pipelines and architecture |
| `data-scientist` | Statistical modeling |
| `ml-engineer` | Machine learning, training |
| `llm-architect` | LLM system architecture |
| `prompt-engineer` | Prompt optimization |
| `mlops` | ML deployment and monitoring |
| `nlp-specialist` | Natural language processing |
| `reinforcement-learning` | RL and adaptive agents |
| `postgresql-expert` | PostgreSQL DB optimization |

### Business & Product
| Agent | What it does |
|-------|-------------|
| `product-manager` | Specs, roadmaps, prioritization |
| `technical-writer` | Technical documentation |
| `ux-researcher` | User research |
| `scrum-master` | Agile management |
| `content-marketing` | Content and marketing strategy |
| `business-analyst` | Business and process analysis |
| `sales-engineer` | Technical sales support |
| `customer-success` | Retention and onboarding |
| `legal-advisor` | General legal advice |
| `wordpress-specialist` | WordPress sites |

### Research & Analysis
| Agent | What it does |
|-------|-------------|
| `research-analyst` | Deep research |
| `competitive-analyst` | Competitive analysis |
| `market-researcher` | Market study |
| `trend-analyst` | Trend analysis |
| `scientific-researcher` | Scientific literature |
| `data-researcher` | Data research and collection |
| `project-validator` | Project idea validation |
| `search-specialist` | Web search and synthesis |

### Meta & Orchestration
| Agent | What it does |
|-------|-------------|
| `multi-agent-coordinator` | Coordinates multiple agents |
| `context-manager` | Cross-session context management |
| `workflow-orchestrator` | Complex workflow orchestration |
| `knowledge-synthesizer` | Distributed knowledge synthesis |
| `agent-installer` | Agent installation and config |
| `task-distributor` | Task distribution across agents |
| `performance-monitor` | Agent performance monitoring |
| `it-ops` | IT operations and support |

---

## Token Reducers

Tools that compress CLI output before it enters the context. Recommended systematically at bootstrap.

| Tool | Source | Savings | What it does |
|------|--------|---------|-------------|
| `RTK` | rtk-ai/rtk | 60-90% | Rust CLI proxy, 34 filtering modules (git, cargo, npm, docker, tsc, etc.), zero dependencies |
| `ContextZip` | jee599/contextzip | +10-20% vs RTK | Extends RTK: stacktraces, ANSI, web extraction. Inherits all RTK filters |
| `ccusage` | — | — | Monitoring: token metrics per session from local JSONL files |

---

## Official MCP servers

| Server | What it does |
|--------|-------------|
| `fetch` | Fetch and convert web content |
| `filesystem` | File operations with access control |
| `git` | Read, search, manipulate Git repos |
| `memory` | Persistent memory via knowledge graph |
| `sequential-thinking` | Problem solving through sequences |
| `time` | Time conversion and timezone handling |

---

## Memory

| Tool | Approach | When to use |
|------|----------|-------------|
| `claude-mem` (thedotmack) | SQLite + auto hooks + web interface | Need exhaustive cross-session history |
| `auto-memory` (.md files) | Curated, semi-auto, zero dependency | Lightweight projects, key decisions only |
| MCP `memory` | Knowledge graph | Structured and queryable memory |

---

## Full sources

| Source | Contents | Stars |
|--------|---------|-------|
| hesreallyhim/awesome-claude-code | Skills, hooks, slash-commands, orchestrators | 36k ⭐ |
| sickn33/antigravity-awesome-skills | 1340+ skills by bundles, installable via npx | 30k ⭐ |
| VoltAgent/awesome-claude-code-subagents | 130+ specialized subagents | 16k ⭐ |
| travisvn/awesome-claude-skills | Curated skills across all categories | 10k ⭐ |
| obra/superpowers | 20+ battle-tested process skills | — |
| modelcontextprotocol/servers | Official MCP servers | — |
| thedotmack/claude-mem | Persistent SQLite memory | — |
