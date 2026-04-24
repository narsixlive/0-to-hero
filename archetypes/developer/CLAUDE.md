# TaskFlow — Task management app

Web app in TypeScript / React / Node.js. Solo dev.

## Structure
- /planning → Specs, architecture, technical decisions
- /src → Code, tests, review
- /docs → Technical documentation and guides
- /.memory → Project memory
- /.skills → Available skills

## Routing
| Intent | Workspace | Read in order |
|--------|-----------|---------------|
| New feature, refactor, architecture | /planning | CONTEXT.md (inc. Learnings) → AGENT.md |
| Code, test, review | /src | CONTEXT.md (inc. Learnings) → AGENT.md |
| Write or update documentation | /docs | CONTEXT.md (inc. Learnings) → AGENT.md |

## Reading order (always the same)
1. CONTEXT.md (brief + `## Learnings` = what I'm working on + the binding rules)
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
