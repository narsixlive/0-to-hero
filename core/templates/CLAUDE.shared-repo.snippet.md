## Shared repo
<!-- shared-repo -->

Several people work on this repo, each with their own Claude Code. claude-mem only knows the sessions run on **this machine** — the handoff is the versioned memory files.

- **Resume**: before working in a workspace, read its `CONTEXT.md` (`## Current state` + `## Thread`, entries carry the author) and say in one line what the other person last did there.
- **Close**: `/memorise` → commit the memory files (`CONTEXT.md`, `LEARNINGS.md`, `DECISIONS.md`, `docs/THREAD-ARCHIVE.md`) with the session's work → push. Pull before starting.
- **Thread conflict on merge**: keep both entries newest-first; rewrite `## Current state` from both.
