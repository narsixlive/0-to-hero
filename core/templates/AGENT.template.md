# [Workspace Name] — [Professional Role]
<!-- Example: "Api — Senior Backend Engineer (REST design, auth, observability)"
     Always embed the workspace name. Never generic ("Assistant", "Helper"). -->

Last updated: [date]

## Pre-work checklist (MANDATORY before any task)
1. Read this workspace's `LEARNINGS.md` `## Active Learnings` + this file's `## Rules` + `CONTEXT.md` `## Current state`
2. Apply every ALWAYS/NEVER rule (Active Learnings + this file's Rules + root CLAUDE.md Gotchas) as a binding constraint
3. At end of work, propose new Learnings via `/memorise` if a reusable pattern emerged
4. If no `LEARNINGS.md` / `CONTEXT.md` exists yet, proceed normally and flag it to the user

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
<!-- L2 (Contract) of the Durcir ladder: hardened doctrine for THIS role. Stable rules graduate
     here from LEARNINGS.md `## Active Learnings` (at ×3 / cross-task / high-criticality):
     copy the rule verbatim with its (why), then remove it from Active. -->

- Consult the Gotchas section of the root CLAUDE.md at startup (L3 — cross-workspace doctrine)
- Consult this workspace's `LEARNINGS.md` `## Active Learnings` (L1 — in-flight rules, also auto-injected)
- A workspace rule that recurs/stabilises graduates here (L2); a cross-workspace one graduates via `/gotcha` to root CLAUDE.md (L3)
- `/memorise` auto-proposes new L1 Learnings and the graduations
- Format in all cases: `NEVER/ALWAYS [action] ([why])`
