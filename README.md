# 0 to Hero

**Go from "I just type into Claude without structure" to an efficient workspace with specialized agents — in 15 minutes.**

---

## What is it?

An open-source system based on a 3-layer architecture + a transversal learning layer:

- **CLAUDE.md** — The map: routing to workspaces, short and scannable, hosts the cross-workspace Gotchas section
- **CONTEXT.md** — The room: the work brief + current state (situational context)
- **AGENT.md** — The specialist: role, skills, process, Pre-work checklist that binds the rules at task start
- **LEARNINGS.md** *(learning layer)* — workspace rules that *harden* through 3 levels (Durcir): Active (auto-injected) → `AGENT.md` Rules → Gotchas

A `SessionStart` hook auto-injects each workspace's Active Learnings into every new session. Each workspace is isolated. Claude knows exactly who it is when it enters a room.

---

## Requirements

- [Claude Code](https://claude.ai/code) (CLI or VS Code extension) — this is not for claude.ai

---

## Quickstart — 15 minutes

Works on a **new project** (empty folder) or an **existing one** — the bootstrap adapts either way.

**Step 1** — Open Claude Code in your project directory

**Step 2** — Start a new conversation and paste the full content of [`core/bootstrap/bootstrap-prompt.md`](core/bootstrap/bootstrap-prompt.md)

**Step 3** — Answer the questions (project, work modes, tools, rules)

**Step 4** — Claude generates your complete custom structure:
- A `CLAUDE.md` at the root
- One or more workspaces, each with `CONTEXT.md` (brief + state), `LEARNINGS.md` (rules), and `AGENT.md` — a workspace is exactly a folder with an `AGENT.md`; everything else at the root is support
- A `docs/` folder for all meta-docs (roadmap, plan, audits, research) — never scattered at the root
- A `.claude/settings.json` wiring the `SessionStart` hook to auto-inject Learnings
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
