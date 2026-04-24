#!/usr/bin/env bash
# inject-learnings.sh — SessionStart hook for 0-to-Hero learning layer.
#
# What it does:
#   1. Detects if CWD is a 0-to-Hero project (presence of CLAUDE.md at root).
#   2. Finds all CONTEXT.md files in workspace folders (depth 1-3).
#   3. Extracts each file's `## Learnings` section.
#   4. Concatenates and returns JSON per Claude Code hook spec:
#        {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}
#   5. Silently exits 0 if not in a 0-to-Hero project or no Learnings found.
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
while IFS= read -r context_file; do
    # Workspace name = immediate parent folder of CONTEXT.md (e.g., src, planning, docs).
    workspace_dir="$(dirname "${context_file}")"
    workspace_name="$(basename "${workspace_dir}")"

    # Extract content between "## Learnings" and the next "## " heading.
    # Skip HTML comments (<!-- ... -->) — they're section description, not content.
    # Only keep lines starting with "- " (actual rules).
    learnings="$(awk '
        /^## Learnings[[:space:]]*$/ {in_section=1; next}
        /^## / && in_section {in_section=0}
        in_section && /^-[[:space:]]/ {print}
    ' "${context_file}")"

    if [[ -n "${learnings}" ]]; then
        output+=$'\n### '"${workspace_name}"$'\n'"${learnings}"$'\n'
    fi
done < <(find "${cwd}" -maxdepth 3 -name "CONTEXT.md" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | sort)

# If no Learnings collected across any workspace, exit silently.
if [[ -z "${output}" ]]; then
    exit 0
fi

# Build the additionalContext payload.
context=$'# Workspace Learnings\n\nDurable rules scoped per workspace. Apply every ALWAYS/NEVER as a binding constraint when working in that workspace.\n'"${output}"

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
