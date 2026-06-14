#!/usr/bin/env bash
# inject-learnings.sh — SessionStart hook for 0-to-Hero learning layer.
#
# What it does:
#   1. Detects if CWD is a 0-to-Hero project (presence of CLAUDE.md at root).
#   2. Finds all LEARNINGS.md and CONTEXT.md files in workspace folders (depth 1-3).
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

cwd="${PWD}"

# Guard 1: must have a CLAUDE.md at the project root.
if [[ ! -f "${cwd}/CLAUDE.md" ]]; then
    exit 0
fi

# Guard 2: must look like a 0-to-Hero project (has at least one CONTEXT.md in a subdir).
if ! find "${cwd}" -maxdepth 3 -name "CONTEXT.md" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | grep -q .; then
    exit 0
fi

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
done < <(find "${cwd}" -maxdepth 3 \( -name "LEARNINGS.md" -o -name "CONTEXT.md" \) -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | sort)

# Collect facts-of-record Ledger from the project root DECISIONS.md.
# Same contract as Learnings: only "- " lines inside the "## Ledger" section,
# skipping HTML comments. These are durable project facts, injected every session.
ledger=""
if [[ -f "${cwd}/DECISIONS.md" ]]; then
    ledger="$(awk '
        /^## Ledger/ {in_section=1; next}
        /^## / && in_section {in_section=0}
        in_section && /^-[[:space:]]/ {print}
    ' "${cwd}/DECISIONS.md")"
fi

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
if [[ -z "${output}" && -z "${ledger}" && -z "${layout}" ]]; then
    exit 0
fi

# Build the additionalContext payload (Facts of Record first, then Learnings).
context=""
if [[ -n "${ledger}" ]]; then
    context+=$'# Facts of Record\n\nDurable project facts (domain, app name, accounts, commitments). Treat each line as current ground truth.\n'"${ledger}"$'\n'
fi
if [[ -n "${output}" ]]; then
    context+=$'# Workspace Learnings\n\nDurable rules scoped per workspace. Apply every ALWAYS/NEVER as a binding constraint when working in that workspace.\n'"${output}"
fi
if [[ -n "${layout}" ]]; then
    context+=$'\n# Repo Layout Check\n\nWorkspace folders (have AGENT.md) not declared in CLAUDE.md. Surface to the user so Routing/Structure stays honest:\n'"${layout}"$'\n'
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
