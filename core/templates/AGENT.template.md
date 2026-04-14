# [Workspace Name] — [Professional Role]
<!-- Example: "Api — Senior Backend Engineer (REST design, auth, observability)"
     Always embed the workspace name. Never generic ("Assistant", "Helper"). -->

Last updated: [date]

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

## Gotcha
- Consult the Gotchas section of the root CLAUDE.md at startup
- If an error is detected or corrected during work: propose addition via `/gotcha`
- Format: `NEVER/ALWAYS [action] ([why])`
