#!/usr/bin/env bash
# inject-learnings.sh — SessionStart hook for 0-to-Hero learning layer.
#
# What it does:
#   1. Finds the project root: nearest folder at or above CLAUDE_PROJECT_DIR holding CLAUDE.md + DECISIONS.md.
#   2. Finds LEARNINGS.md and CONTEXT.md at the root (light project) and in workspace folders (depth 1).
#   3. Extracts each file's `## Active Learnings` section (legacy `## Learnings` too).
#      LEARNINGS.md is the current home (Durcir stack); CONTEXT.md is still scanned for
#      backward compatibility with projects not yet migrated. Same extractor for both,
#      so refreshing this hook never breaks an un-migrated project.
#   4. Extracts the `## Ledger` (facts of record) section from root DECISIONS.md.
#   5. Concatenates and returns JSON per Claude Code hook spec:
#        {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}
#   6. Silently exits 0 if not in a 0-to-Hero project or nothing to inject.
#
# Opt-in per project via .claude/settings.json SessionStart hook entry.
# Safe to run globally: non-0-to-Hero projects produce no output.

set -euo pipefail

# Project root = nearest folder at or above the session's start folder holding CLAUDE.md + DECISIONS.md
# (the Durcir opt-in marker). Same rule as scribe-trigger.js projectRoot(); root.check.js asserts both agree.
# Start folder = CLAUDE_PROJECT_DIR (set by Claude Code for hooks, fixed for the whole session: a Bash `cd`
# into a sub-folder or a sibling project does not move it, so /compact re-injects the right project), else $PWD.
cwd="$(cd "${CLAUDE_PROJECT_DIR:-${PWD}}" 2>/dev/null && pwd)" || exit 0
while [[ ! ( -f "${cwd}/CLAUDE.md" && -f "${cwd}/DECISIONS.md" ) ]]; do
    parent="$(dirname "${cwd}")"
    [[ "${parent}" == "${cwd}" ]] && exit 0
    cwd="${parent}"
done
[[ -n "${INJECT_PRINT_ROOT:-}" ]] && { echo "${cwd}"; exit 0; }   # root.check.js parity probe

# Collect Learnings per workspace.
output=""
while IFS= read -r mem_file; do
    # Workspace name = immediate parent folder of the memory file (e.g., src, planning, docs).
    workspace_dir="$(dirname "${mem_file}")"
    workspace_name="$(basename "${workspace_dir}")"

    # Extract content between the Learnings heading and the next "## " heading.
    # Runs on both LEARNINGS.md (current home) and CONTEXT.md (legacy home), same rules:
    #   - "## Active Learnings" (current template) → user-curated, injected UNCAPPED.
    #   - "## Learnings" (legacy, pre-split)       → uncurated, injected CAPPED AT 5,
    #     so refreshing this hook never blows up the per-session injection of an
    #     un-migrated project (the cap is the safety net; migrate to Active to lift it).
    # Never matches "## Archived Learnings" or "## Drift log" — kept for reference, not injected.
    # Skip HTML comments (<!-- ... -->) — section description, not content.
    # Only keep lines starting with "- " (actual rules).
    learnings="$(awk '
        /^## Active Learnings[[:space:]]*$/ {in_section=1; legacy=0; count=0; next}
        /^## Learnings[[:space:]]*$/        {in_section=1; legacy=1; count=0; next}
        /^## / && in_section {in_section=0}
        in_section && /^-[[:space:]]/ {
            if (legacy) { count++; if (count <= 5) print }
            else print
        }
    ' "${mem_file}")"

    if [[ -n "${learnings}" ]]; then
        output+=$'\n### '"${workspace_name}"$'\n'"${learnings}"$'\n'
    fi
done < <(find "${cwd}" -maxdepth 2 \( -name "LEARNINGS.md" -o -name "CONTEXT.md" \) -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | sort)

# Collect facts-of-record Ledger from the project root DECISIONS.md.
# Same contract as Learnings: only "- " lines inside the "## Ledger" section,
# skipping HTML comments. These are durable project facts, injected every session.
# Injection is capped to the LEDGER_CAP most recent entries (default 10): the file is the
# full record and never trimmed, but reading 100+ dated milestones at every session start
# cost ~17k tokens on a large project (2026-09-12) for facts a session almost never needs. Older
# entries stay reachable by Grep / mem-search; a fact every session must know belongs in
# CLAUDE.md ## Gotchas, which is injected whole. Override per shell: LEDGER_CAP=0 = no cap.
# 30 → 10 on 2026-11-08: with ~500-char entries, 30 of them pushed the payload to 16.9k chars,
# over Claude Code's 10,000-char additionalContext cap — the whole payload was then written to
# a file and only a 2k preview reached the session (Learnings silently lost for weeks).
# durcir-v2: `## Facts (current)` (one upserted line per key, bounded by construction) is injected whole,
# capped at FACTS_CAP lines as a safety net; the dated `## Ledger` becomes a log and its window drops to 5.
facts=""
ledger=""
if [[ -f "${cwd}/DECISIONS.md" ]]; then
    # Keys are appended at the bottom, so the LAST cap lines are the newest: a new key is never the one left out.
    facts="$(awk -v cap="${FACTS_CAP:-40}" '
        /^## Facts/ {in_section=1; next}
        /^## / && in_section {in_section=0}
        in_section && /^-[[:space:]]/ {n++; lines[n]=$0}
        END {
            start = (n > cap) ? n - cap + 1 : 1
            if (n > cap) print "- (" n - cap " older facts not injected - DECISIONS.md ## Facts is over " cap " keys: merge or drop keys with /memorise)"
            for (i = start; i <= n; i++) print lines[i]
        }
    ' "${cwd}/DECISIONS.md")"
    ledger="$(awk -v cap="${LEDGER_CAP:-5}" '
        /^## Ledger/ {in_section=1; next}
        /^## / && in_section {in_section=0}
        # "**Key** changed: old → new" lines are skipped: the Facts line already carries the value and its date.
        in_section && /^-[[:space:]]/ && !/\*\*[^*]+\*\* changed:/ {n++; lines[n]=$0}
        END {
            # Ledger is newest-first: keep the first `cap` entries.
            last = (cap > 0 && n > cap) ? cap : n
            for (i = 1; i <= last; i++) print lines[i]
            if (last < n) print "- (" n - last " older entries not injected - full ledger in DECISIONS.md ## Ledger; grep it before asserting a fact of record)"
        }
    ' "${cwd}/DECISIONS.md")"
fi

# The memory inbox (Proposals + Candidates) is never mentioned here: draining it is the Stop hook's job (scribe-trigger.js --inbox).
# The statusline ✉ and the VS Code sidebar show the count passively; /memorise is run when the owner wants.

# Workspace layout drift check.
# A workspace is, by definition, a folder containing AGENT.md (depth 1 — workspaces always
# live at the project root). If CLAUDE.md never names such a folder, the Routing/Structure
# has drifted from reality and the undeclared workspace gets missed. Surface it; stays
# silent when every workspace is referenced. Folder name matched as a path token (word
# boundaries) to avoid colliding with prose mentions.
layout=""
if [[ -f "${cwd}/CLAUDE.md" ]]; then
    while IFS= read -r agent_file; do
        ws_name="$(basename "$(dirname "${agent_file}")")"
        if ! grep -qE "(^|[^[:alnum:]_-])${ws_name}([^[:alnum:]_-]|$)" "${cwd}/CLAUDE.md"; then
            layout+=$'\n- ⚠ workspace `'"${ws_name}"$'` has an AGENT.md but is not referenced in CLAUDE.md — add it to ## Structure / Routing, or it gets missed.'
        fi
    done < <(find "${cwd}" -maxdepth 2 -name "AGENT.md" -type f -not -path "*/node_modules/*" -not -path "*/.git/*")
fi

# If nothing collected (Learnings, Ledger, or layout drift), exit silently.
if [[ -z "${output}" && -z "${facts}" && -z "${ledger}" && -z "${layout}" ]]; then
    exit 0
fi

# Build the additionalContext payload: Learnings first (the rules), then the Ledger (history).
# Claude Code caps each additionalContext string at 10,000 chars and, over that, replaces it
# with a file path + 2k preview that Claude is never asked to read. So the payload is bounded
# BEFORE emission: the ledger (newest-first, least critical tail) is trimmed entry by entry
# until the whole payload fits, and the trim is stated in the payload itself.
MAX_CHARS=9000   # leaves room for the trim note under the 10,000 cap
# The moment a rule is cheapest to capture is the correction itself: the session has the whole context, the scribe only a trimmed transcript.
context=$'# When the owner corrects you\n\nIf the owner corrects HOW you work (not a one-off fix of content), ask right then with AskUserQuestion whether to make it a rule. On yes, append `- ALWAYS/NEVER [action] ([why]) (owner YYYY-MM-DD: « their words »)` under `## Active Learnings` of that workspace LEARNINGS.md (the root LEARNINGS.md when the project has no workspace). Ask once per correction, never for a rule already listed below.\n\n'
if [[ -n "${output}" ]]; then
    context+=$'# Workspace Learnings\n\nDurable rules scoped per workspace. Apply every ALWAYS/NEVER as a binding constraint when working in that workspace.\n'"${output}"$'\n'
fi
if [[ -n "${facts}" ]]; then
    context+=$'# Facts (current)\n\nThe project as it stands: one line per key, current ground truth until the key is updated. Full history and the why in DECISIONS.md.\n'"${facts}"$'\n\n'
fi
if [[ -n "${ledger}" ]]; then
    header=$'# Ledger (recent)\n\nNewest dated decisions and events. Older ones in DECISIONS.md ## Ledger; grep it before asserting a fact of record.\n'
    trimmed=0
    while [[ $(( ${#context} + ${#header} + ${#ledger} )) -gt ${MAX_CHARS} && -n "${ledger}" ]]; do
        # Drop the last ledger entry (oldest of the injected window). Entries are "- " lines; a
        # continuation line is dropped with the entry it belongs to.
        ledger="$(printf '%s\n' "${ledger}" | awk '/^- /{n++} {l[NR]=$0; e[NR]=n} END{for(i=1;i<=NR;i++) if(e[i]<n) print l[i]}')"
        trimmed=$((trimmed + 1))
    done
    if [[ ${trimmed} -gt 0 ]]; then
        ledger+=$'\n- ('"${trimmed}"$' older entries of the injected window trimmed to fit the 10k-char hook cap - full ledger in DECISIONS.md ## Ledger; grep it before asserting a fact of record)'
    fi
    [[ -n "${ledger}" ]] && context+="${header}${ledger}"$'\n'
fi
if [[ -n "${layout}" ]]; then
    context+=$'\n# Repo Layout Check\n\nWorkspace folders (have AGENT.md) not declared in CLAUDE.md. Surface to the user so Routing/Structure stays honest:\n'"${layout}"$'\n'
fi
# Final guard on the WHOLE payload (durcir-v2): Learnings + Facts alone can exceed the cap with perfectly valid data
# (40 keys × 200 chars). Over the cap, the payload is cut and the cut is the FIRST line, never a silent partial view.
if [[ ${#context} -gt 9800 ]]; then
    context=$'# ⚠ Memory payload over the 10k-char hook cap ('"${#context}"$' chars): truncated below. Read LEARNINGS.md ## Active Learnings and DECISIONS.md ## Facts directly before relying on them.\n\n'"${context:0:9500}"
fi

# Emit JSON per Claude Code hook schema.
# jq is preferred when available; fallback to sed escaping for portability.
if command -v jq >/dev/null 2>&1; then
    jq -n --arg ctx "${context}" '{
        hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: $ctx
        }
    }'
else
    # Escape for JSON manually: backslashes, quotes, newlines, CRs, tabs.
    escaped="${context//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    escaped="${escaped//$'\n'/\\n}"
    escaped="${escaped//$'\r'/\\r}"
    escaped="${escaped//$'\t'/\\t}"
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "${escaped}"
fi
