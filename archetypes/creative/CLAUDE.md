# Indie Studio — Freelance music

> **Archetype — illustration only.** Not a runnable project. Base sections (Shell / Navigation / Modifications / Startup / Memory / Learning mode / Gotchas) come from `core/templates/CLAUDE.template.md` at bootstrap.

Music composition and production for sync, video games, and direct clients.

## Structure
- /creation → Composition, writing, track development
- /production → Mix, mastering, client file delivery
- /.skills → Available skills (loaded on-demand via AGENT.md)

## Routing
| Intent | Workspace | Read in order |
|--------|-----------|---------------|
| Compose, write, iterate on a track | /creation | CONTEXT.md (inc. Learnings) → AGENT.md |
| Mix, master, deliver to client | /production | CONTEXT.md (inc. Learnings) → AGENT.md |

## Reading order (always the same)
1. CONTEXT.md (brief + `## Learnings` = what I'm working on + the binding rules)
2. AGENT.md (who I am, what to load)
3. Root CLAUDE.md Gotchas section (cross-workspace rules)
4. Skills only if AGENT.md requests them

## Naming conventions
- Project files: [client]_[title]_v[n].[ext]
- Final exports: [client]_[title]_FINAL_[date].[ext]

## Global rules
- Every track goes through /creation before /production
- Never deliver without the delivery checklist (in production CONTEXT.md `## Learnings`)
