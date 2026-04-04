# [Project name]

[One sentence describing the project]

## Structure
- /workspace-a → [short description]
- /workspace-b → [short description]
- /.memory → Project memory
- /.skills → Available skills

## Routing
| Intent | Workspace | Read in order |
|--------|-----------|---------------|
| [task type A] | /workspace-a | CONTEXT.md → AGENT.md → GOTCHA.md |
| [task type B] | /workspace-b | CONTEXT.md → AGENT.md → GOTCHA.md |

## Reading order (always the same)
1. CONTEXT.md first (what I'm working on)
2. AGENT.md next (who I am, what to load)
3. GOTCHA.md next (what I must not do)
4. Skills only if AGENT.md requests them
5. .memory/ only if the task requires it

## Naming conventions
- [file naming rules for produced files]

## Global rules
- [2-3 rules max that apply across all workspaces]
