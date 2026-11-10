Write a handover for the current session, so the next session — after a `/clear` or a compaction — resumes without re-investigating anything.

You are running with the session in context. You can see *why* an approach failed, not just that it did. That judgment is the whole value of this command: the automatic `PreCompact` hook can only extract mechanical facts (files touched, commands that exited non-zero), never the reasoning.

## Target the ceiling, not the floor

**Too long is cheap. Too short costs hours of re-investigation.** A 600-line handover is a fraction of a percent of the context window; a thin one means the next session re-derives what this one already knew.

- **Minimum 150 lines.** Below that, you skimmed — go back and mine deeper.
- **Aim for 300-600 lines** on a substantial session.
- **Over 800 lines** → split into `<name>-part1.md` / `-part2.md` with cross-references. Never truncate.

If you catch yourself summarizing instead of extracting, stop. Abstract summaries ("improved performance", "fixed the bug") are worth nothing to the next session. **Never write "improved" — write "improved from X to Y".**

There is no exclusion list. The only thing forbidden is vagueness.

## Where it goes

Append to `~/.claude/handovers/<cwd-slugified>/<session_id>.md` — the same file the `PreCompact` hook writes, so `/memorise` finds everything in one place. The slug is the project cwd with every non-alphanumeric character replaced by `-` (e.g. `D:/CLAUDE/project 0 to Hero` → `D--CLAUDE-project-0-to-Hero`). Create the directory if missing.

Never write into the repo: these are scratch files, and one committed by accident is noise in someone else's diff. If you cannot determine the session id, use the transcript filename (it IS the session id), else `manual-<YYYY-MM-DD-HHMM>.md`.

## Structure

Append one block. Follow these section names exactly — the resume step relies on them.

```markdown
## Manual handover — <ISO timestamp>

**Status:** IN PROGRESS | BLOCKED | COMPLETED

### The goal
3-5 sentences. What this session set out to do, and why it matters.

### Where we are
15-25 bullets. Every file and function changed, every measurement with real
numbers, test counts, what currently works and what currently does not.
Under 10 bullets means you skimmed.

### What we tried (chronological)
5-15 entries, one per approach — including the ones that worked. This is the
most expensive section to re-discover, and the one compaction deletes first.
Each entry: hypothesis → what was changed → result with real numbers → why it
worked or did not.

- workspace: <workspace folder name, or "root". REQUIRED — /memorise routes
    by this field and an entry without it cannot reach a LEARNINGS.md.>
  tried: <the approach>
  result: <what actually happened, with numbers>
  why: <the mechanism — the part only you can supply>
  error: |
    <verbatim error text, unedited. Never paraphrase.>
  seam: <file:line where the problem lives — a POINTER, not a verdict>
  fixed_this_session: yes | unknown
  relearned_the_hard_way: yes | no
  phrasing: <suggested rule "ALWAYS/NEVER <action> (<why>)", or empty>
  verify: <one command that would prove a fix works, if one exists>

### Key decisions
5-10 bullets. Every non-obvious decision AND why. Include the alternatives that
were rejected and the reason — a decision reversed next session is pure waste.

### Evidence & data
Real numbers, never characterizations. Comparison tables, before/after
measurements, cost figures, iteration histories. Embed raw blocks UNDER 20
LINES when they are the primary evidence (a config that matters, a key JSON
fragment, a measured output). Anything larger becomes a file path instead.
"error rate: 28.6%", never "high error rate".

### Files changed
Grouped: source / tests / config / data. One line each on what changed and why.

### User feedback & preferences
REQUIRED — never omit. The user's own words, quoted: corrections, rejected
approaches, stated preferences, frustrations. This calibrates how the next
session works, not just what it works on.

### Where we're going
3-7 ordered next steps. The first one must be concrete enough to execute.

### Risks & open questions
2-5 risks, 1-5 unresolved questions the next session needs answered.

### Quick start for the next session
The exact commands and the files to read first:

- key files to read: <3-5 paths — not exhaustive>
- verify current state: <the command that proves where things stand>
- FIRST ACTION: <THE single most important thing to do next — concrete,
    never "continue working">
```

## Rules

- **Facts, never verdicts.** Do NOT judge whether something is already enforced in the code, and do NOT propose a fix or a rung. `/memorise` re-reads each seam when it runs, because the code may have moved. `phrasing` is a suggestion to evaluate, not a candidate that skips a gate.
- **`fixed_this_session` is `yes` or `unknown`, never `no`.** Write `yes` only if you saw the fix land. Absence of evidence is `unknown`.
- **`relearned_the_hard_way`** is the one judgment you may legitimately make: you were there when the rule drifted. It feeds the `## Drift log`. `yes` only for a new incident this session that an earlier rule or lesson should have prevented — never for restating an incident.
- **An event already in an earlier block** (this session's, or the handover this session resumed from) keeps that block's fields as written. Change a field only if this session proved it wrong, and then start `result:` with `Correction (<that block's header time>):` and what proved it.
- **Never write to `LEARNINGS.md`, `CONTEXT.md`, `DECISIONS.md`, `AGENT.md` or any project file.** Those have gates and a y/n ritual. You write one file, nothing else.
- **Nothing invented.** Every entry must be something that actually happened this session. Numbers, paths, identifiers, errors and the user's words are copied from the transcript character for character; put in backticks or quotes only what you copied. What you infer (a cause, an estimate, a figure you computed) says so: `(inferred)`. What you do not know is `unknown`, never a guess. The auto-handover lists every backticked, quoted or numeric span it cannot find in the transcript under `### Unverified`.
- **Append, never overwrite** — several handovers can stack up in one session.

Before writing, re-read the session rather than working from what you remember of it — the details ARE the value.

When done, confirm in one line: `Handover written — <N> lines, <M> approaches, <K> files. → <path>`
