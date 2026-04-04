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
| New feature, refactor, architecture | /planning | CONTEXT.md → AGENT.md → GOTCHA.md |
| Code, test, review | /src | CONTEXT.md → AGENT.md → GOTCHA.md |
| Write or update documentation | /docs | CONTEXT.md → AGENT.md → GOTCHA.md |

## Reading order (always the same)
1. CONTEXT.md (what I'm working on)
2. AGENT.md (who I am, what to load)
3. GOTCHA.md Critical section (what I must not do)
4. Skills only if AGENT.md requests them
5. .memory/NOTES.md only if the task requires it

## Naming conventions
- React components: PascalCase
- Test files: [name].test.ts
- Git branches: feat/[name], fix/[name], chore/[name]

## Global rules
- No code without a test
- Architecture decisions go through /planning before /src
