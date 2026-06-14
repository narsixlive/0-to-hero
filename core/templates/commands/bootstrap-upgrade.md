Migrate an existing 0-to-Hero project to the latest architecture. Safe, read-only audit first. This command delegates to the canonical procedure in the 0-to-Hero repo — it holds no logic of its own.

## Why this is a stub

A frozen copy of the full procedure here would silently drift from the repo source `core/bootstrap/bootstrap-upgrade.md` as the architecture evolves — the exact "frozen local copy" bug this system exists to prevent. So this file only resolves the repo and hands off to the live procedure. **Single source of truth = the repo.** This delegation adds no new requirement: the procedure already needs the repo at runtime (it reads the canonical templates), so there is no degraded mode to lose.

## Do this

1. **Resolve the 0-to-Hero repo root `$REPO`**, in order (stop at the first hit):
   - `$ZERO_TO_HERO_HOME` if it contains `core/bootstrap/bootstrap-upgrade.md`
   - `$CWD` or an ancestor, if it contains `core/bootstrap/bootstrap-upgrade.md`
   - **sibling projects** — search the parent of `$CWD` (the shared code root, since the repo is usually a sibling of the project you run this from): `find "$(dirname "$CWD")" -maxdepth 4 -name bootstrap-upgrade.md -path '*core/bootstrap*'`
   - broad search of the user's code roots — `find ~ /d /c -maxdepth 5 -name bootstrap-upgrade.md -path '*core/bootstrap*' 2>/dev/null` (the repo may live off `$HOME`, e.g. another drive); confirm the hit's `git remote` matches `0-to-hero`
   - if still unresolved, ask the user for the repo path
2. **Read `$REPO/core/bootstrap/bootstrap-upgrade.md` in full and follow it exactly**, passing `$ARGUMENTS` through (target project path, `dry-run` / `audit only`, etc.).
3. If `$REPO` can't be resolved, abort and tell the user to set `$ZERO_TO_HERO_HOME` or clone the repo — the migration needs the repo's canonical templates anyway.

Never run a cached or remembered version of the procedure. Always read it fresh from `$REPO` so the live repo stays the single source of truth.
