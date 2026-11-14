# [Workspace Name] — [Professional Role]
<!-- Example: "Api — Senior Backend Engineer (REST design, auth, observability)"
     Always embed the workspace name. Never generic ("Assistant", "Helper"). -->

Last updated: [date]

## Pre-work checklist (MANDATORY before any task)
1. Read this workspace's `LEARNINGS.md` `## Active Learnings` + this file's `## Rules` + `CONTEXT.md` `## Current state`
2. Apply every ALWAYS/NEVER rule (Active Learnings + this file's Rules + root CLAUDE.md Gotchas) as a binding constraint
3. Non-trivial task → read the injected `DECISIONS.md` Facts + Ledger first (past decisions live there); `mem-search` only for history older than the scribe (grep only sees the present code)
4. At end of work, propose new Learnings via `/memorise` if a reusable pattern emerged
5. If no `LEARNINGS.md` / `CONTEXT.md` exists yet, proceed normally and flag it to the user

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
<!-- Doctrine for THIS role, written by the owner by hand (process steps, hard limits). Not a maturity
     rung: workspace rules the owner validates live in LEARNINGS.md `## Active Learnings`; cross-workspace
     or high-criticality ones go to the root CLAUDE.md `## Gotchas` via /gotcha. -->

- Consult the Gotchas section of the root CLAUDE.md at startup (L3 — cross-workspace doctrine)
- Consult this workspace's `LEARNINGS.md` `## Active Learnings` (L1 — workspace rules, also auto-injected)
- A cross-workspace or high-criticality rule goes via `/gotcha` to root CLAUDE.md (L3); this section is the owner's hand-written role doctrine
- The scribe queues rule candidates in `LEARNINGS.md ## Candidates`; the owner promotes them with `/memorise`
- Format in all cases: `NEVER/ALWAYS [action] ([why])`
