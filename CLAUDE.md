# 0 to Hero — Repo

Open-source tool to structure your Claude workflow into efficient workspaces with specialized agents.

## Structure
- /core → Architecture + bootstrap prompt
- /archetypes → Complete examples (developer, creative)
- /catalog → Curated base of skills and tools
- /docs → Development plans and specs for this repo
- /tools → Reserved for future use

## Routing
| Intent | Resources |
|--------|-----------|
| Modify architecture or bootstrap | core/ARCHITECTURE.md → core/bootstrap/bootstrap-prompt.md |
| Work on an archetype | archetypes/INDEX.md → archetypes/[name]/ |
| Update the catalog | catalog/skills-database.md |
| Plan / execute a step | docs/superpowers/plans/ |

## Reading order
1. This CLAUDE.md
2. The target resource based on routing
3. 0-to-hero-spec.md only if a format detail is needed

## Global rules
- Archetypes are illustrations, not templates to copy
- Consult 0-to-hero-spec.md only when necessary
- Language: conversations in French, all written content (files, commits, code, comments) in English
