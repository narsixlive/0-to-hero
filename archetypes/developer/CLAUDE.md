# TaskFlow — Task management app

> **Archetype — illustration only.** Not a runnable project. Base sections (Shell / Navigation / Modifications / Startup / Memory / Learning mode / Gotchas) come from `core/templates/CLAUDE.template.md` at bootstrap.

Web app in TypeScript / React / Node.js. Solo dev.

## Structure
- /planning → Specs, architecture, technical decisions
- /src → Code, tests, review
- /documentation → Technical documentation and guides
- /.skills → Available skills (loaded on-demand via AGENT.md)

## Routing
| Intent | Workspace | Read in order |
|--------|-----------|---------------|
| New feature, refactor, architecture | /planning | LEARNINGS.md + CONTEXT.md → AGENT.md |
| Code, test, review | /src | LEARNINGS.md + CONTEXT.md → AGENT.md |
| Write or update documentation | /documentation | LEARNINGS.md + CONTEXT.md → AGENT.md |

## Reading order (always the same)
1. LEARNINGS.md (`## Active Learnings` = the binding rules) + CONTEXT.md (brief + state = what I'm working on)
2. AGENT.md (who I am, what to load)
3. Root CLAUDE.md Gotchas section (cross-workspace rules)
4. Skills only if AGENT.md requests them

## Naming conventions
- React components: PascalCase
- Test files: [name].test.ts
- Git branches: feat/[name], fix/[name], chore/[name]

## Global rules
- No code without a test
- Architecture decisions go through /planning before /src
