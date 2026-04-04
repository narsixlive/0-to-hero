# Agent: [Name]

Last updated: [date]

## Role
[2-3 lines max. What this agent does, for whom, and why.]

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
- Read GOTCHA.md at startup (Critical section is mandatory)
- If an error is detected or corrected during work:
  propose adding it to GOTCHA.md
- Format: ❌ [mistake] → ✅ [best practice] (YYYY-MM-DD)
