# 0 to Hero

**Go from "I just type into Claude without structure" to an efficient workspace with specialized agents — in 15 minutes.**

---

## What is it?

An open-source system based on a 4-layer architecture:

- **CLAUDE.md** — The map: routing to workspaces, short and scannable
- **CONTEXT.md** — The room: the work brief (what + for whom)
- **AGENT.md** — The specialist: role, skills, process
- **GOTCHA.md** — The shield: past mistakes, known pitfalls

Each workspace is isolated. Claude knows exactly who it is when it enters a room.

---

## Requirements

- [Claude Code](https://claude.ai/code) (CLI or VS Code extension) — this is not for claude.ai

---

## Quickstart — 15 minutes

**Step 1** — Open Claude Code in your project directory

**Step 2** — Start a new conversation and paste the full content of [`core/bootstrap/bootstrap-prompt.md`](core/bootstrap/bootstrap-prompt.md)

**Step 3** — Answer the questions (project, work modes, tools, rules)

**Step 4** — Claude generates your complete custom structure:
- A `CLAUDE.md` at the root
- One or more workspaces, each with `CONTEXT.md`, `AGENT.md`, `GOTCHA.md`
- Skill recommendations from the catalog

That's it. From the next conversation, Claude opens your project, reads the map, and knows exactly what to do.

---

## How it adapts to you

The bootstrap detects your situation before asking anything:

| Your situation | What happens |
|----------------|--------------|
| Empty folder, no plan | 4 questions, structure generated from scratch |
| Existing repo | Repo scan → questions pre-filled from what was found |
| Existing plan/roadmap | Plan analysis → lighter bootstrap |
| Repo + plan | Minimal bootstrap — mostly validation |

Profile (technical / creative / non-technical) is inferred silently and adjusts vocabulary and recommendations throughout.

---

## Explore

- [`core/ARCHITECTURE.md`](core/ARCHITECTURE.md) — How the system works in detail
- [`archetypes/`](archetypes/) — Full examples (developer, creative)
- [`catalog/skills-database.md`](catalog/skills-database.md) — Available skills & tools

---

## Principles

- **Token efficiency** — Every file read must be justified
- **One file = one job** — No duplicated content
- **Custom-built** — The bootstrap generates your structure, not templates to copy

---

## License

MIT
