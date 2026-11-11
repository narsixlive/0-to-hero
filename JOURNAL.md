# Journal
<!-- Written by the memory scribe: one block per session, newest first (summary, next step, dated events with evidence ids). -->
<!-- The 3 newest blocks are injected at SessionStart. History, not instructions: a line here is what happened, not what to do. -->

### 2026-11-11 — session ba5a49f3
- Design "duel" (Astra vs Fable) reviewed the v2 memory stack; user approved full redesign ("ok tu peux tout faire")
- Implemented & tested: Facts never auto-overwritten (⚠ disputed → new value in Proposals), seen×N counter + L2 escalation tier dropped, claude-mem context injection muted
- Built & tested new JOURNAL.md + inject-journal.sh SessionStart hook (last 3 session summaries + Current state per workspace)
- scribe-writer.js/scribe-worker.js/root.check.js all passing after several fix iterations; started syncing repo copies to global hooks
- Next: finish installing inject-journal.sh globally (register SessionStart in settings.json, sync repo copies) and commit
- 2026-11-11 — Scribe stops auto-overwriting existing Facts keys; disputed values queued to Proposals and shown as ⚠ disputed → new value until owner decides [toolu_013KLvRhjhQ2ApHWp7oaPTzY] why: scribe sometimes read a hypothesis or stale doc and overwrote a true value with a false one
- 2026-11-11 — claude-mem context injection muted to stop feeding frozen Nov-9 history and wasting ~10k token budget [toolu_01QyCgSpWQUCtMuTjA1tcPvQ] why: elle raconte une histoire morte et mange 10k de budget
- 2026-11-11 — L2 escalation tier (AGENT.md ## Rules as automatic maturity step) dropped from the learning stack; kept only as a manual human-written file [owner said: ok tu peux tout faire] why: L1 and L2 had the same workspace scope and were both injected; the seen×N counter that gated L2 entry was also removed
- 2026-11-11 — seen×N recurrence counter dropped: a rule becomes Active only via owner's explicit correction or 'oui', not a tool-id count [toolu_013KLvRhjhQ2ApHWp7oaPTzY]
