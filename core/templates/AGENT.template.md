# [Workspace Name] — [Professional Role]
<!-- Example: "Api — Senior Backend Engineer (REST design, auth, observability)"
     Always embed the workspace name. Never generic ("Assistant", "Helper"). -->

Last updated: [date]

## Pre-work checklist (MANDATORY before any task)
1. Read this workspace's `CONTEXT.md` — especially `## Learnings` section
2. Apply every ALWAYS/NEVER rule as a binding constraint for the task
3. At end of work, propose new Learnings via `/memorise` if a reusable pattern emerged
4. If no `CONTEXT.md` exists, proceed normally and flag it to the user

## Invocation scope

**Invoke when:**
- Working inside the `[workspace-name]/` folder
- Task aligned with the professional role above
- Referenced by an active plan

**Do NOT invoke for:**
- Ad-hoc questions answered by a plain file read
- Cross-workspace or project-level work (routing, bootstrap, config)
- Tasks outside the role's domain

## Role
[2-3 lines max. What this specialist delivers, for whom, and why. Be concrete about domain and seniority — not generic.]

## Capabilities
- [Capability 1] — [one line]
- [Capability 2] — [one line]

## Skills
| Skill | Path | Mode |
|-------|------|------|
| [name] | /.skills/[x]/SKILL.md | always |
| [name] | /.skills/[y]/SKILL.md | on-demand |

## On-demand loading rules
- Load [skill-x] IF the task mentions "[trigger keywords]"
- Load [skill-y] IF the task mentions "[trigger keywords]"

## Process
1. [Step 1 — what the agent does first]
2. [Step 2]
3. [Step 3]
4. [Validation / expected output]

## Limits
- [What this agent does NOT do]
- [What it must never decide alone]

## Skill creation
- If a pattern repeats 3+ times, propose turning it into a skill
- Create the skill in /.skills/[name]/SKILL.md
- Update /.skills/INDEX.md
- User validates before activation

## Rules
- Consult the Gotchas section of the root CLAUDE.md at startup (project-level rules)
- Consult this workspace's `CONTEXT.md` `## Learnings` section (workspace-level rules)
- If a cross-workspace pattern emerges: propose addition via `/gotcha` (root CLAUDE.md)
- If a workspace-specific pattern emerges: `/memorise` will auto-propose it
- Format in both cases: `NEVER/ALWAYS [action] ([why])`
