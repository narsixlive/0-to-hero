#!/usr/bin/env node
// handover-read.js — SessionStart hook, matcher "clear".
//
// Why only "clear": after /compact, Claude Code already re-injects a summary of
// the pruned session, so the thread survives on its own and adding our file on
// top would be a duplicate paid every turn. After /clear nothing survives — and
// that is the case the user deliberately chooses to escape a heavy window.
// So this is the one moment re-injection earns its tokens.
//
// Size policy — deliberately NOT capped tight. A handover is a map for
// rebuilding context from the codebase, and the expensive failure is a thin one
// that makes the next session re-investigate. On a 1M window a 600-line
// handover is a fraction of a percent. The only ceiling here is a sanity limit
// against a runaway file.
//
// The injected preamble tells Claude to RE-READ the key files rather than treat
// the handover as a replacement for having read them — the handover records
// what the last session focused on, not everything that matters.
//
// Contract: SessionStart receives session_id, transcript_path, cwd, source.
// source ∈ startup | resume | clear | compact | fork. Cannot block.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HANDOVER_ROOT = path.join(os.homedir(), '.claude', 'handovers');
const SANITY_LIMIT = 120000; // ~30k tokens. A runaway guard, not a budget.

// Only a handover written moments ago belongs to the session being cleared.
// /clear appears to mint a new session_id (thepushkarp's plugin breaks on
// exactly this), so the id cannot be compared — recency is the only honest
// signal. A /clear that follows a /handover happens within seconds; anything
// older belongs to a session the user has already walked away from, and
// injecting it would hand the new session someone else's context.
// Override for a slow workflow: ZTH_HANDOVER_WINDOW_MIN.
const WINDOW_MIN = parseInt(process.env.ZTH_HANDOVER_WINDOW_MIN || '15', 10);
const AGE_LIMIT_MS = WINDOW_MIN * 60 * 1000;

function slugify(cwd) {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '');
}

// The "## Manual handover" blocks of a file, oldest first. A block ends at the
// next top-level block (another handover or a PreCompact "## Compaction").
function handoverBlocks(text) {
  return text.split(/^(?=## (?:Manual handover|Compaction) )/m)
    .filter(b => b.startsWith('## Manual handover'))
    .map(b => b.trim());
}

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);

    // Belt and braces: settings.json scopes this to "clear", but a mis-wire
    // would otherwise silently double-inject after every compaction.
    if (data.source && data.source !== 'clear') process.exit(0);

    const cwd = data.cwd || process.cwd();
    const dir = path.join(HANDOVER_ROOT, slugify(cwd));
    if (!fs.existsSync(dir)) process.exit(0);

    // Only a file holding a written handover is a resume point: a file with
    // nothing but PreCompact breadcrumbs is evidence for /memorise, not state.
    const file = fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const full = path.join(dir, f);
        try { return { full, mtime: fs.statSync(full).mtimeMs }; } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)
      // Stale handovers describe work the user has moved on from.
      .filter(f => Date.now() - f.mtime <= AGE_LIMIT_MS)
      .map(f => ({ ...f, blocks: handoverBlocks(fs.readFileSync(f.full, 'utf8')) }))
      .find(f => f.blocks.length);
    if (!file) process.exit(0);

    // Inject once. A second /clear in the same window would otherwise re-inject
    // a handover the running session has already absorbed — and re-reading a
    // stale state as if it were current is worse than injecting nothing.
    // The marker is a sibling file so the handover itself stays untouched for
    // /memorise, which reads it later and does the purging.
    const consumed = file.full + '.consumed';
    try {
      if (fs.existsSync(consumed) && fs.statSync(consumed).mtimeMs >= file.mtime) process.exit(0);
    } catch { /* unreadable marker: inject */ }

    // Only the newest block: it is the current state, and each block stands on
    // its own. Earlier blocks stay in the file for /memorise.
    let body = file.blocks[file.blocks.length - 1];
    if (body.length > SANITY_LIMIT) {
      body = body.slice(0, SANITY_LIMIT) + `\n\n[cut at ${SANITY_LIMIT} chars — full block: ${file.full}]`;
    }
    const earlier = file.blocks.length - 1;

    const context =
      '# Handover from the previous session\n\n' +
      'The session was cleared. Below is the last handover the previous session ' +
      'wrote: its own account of what it did, tried and decided, and what comes next. ' +
      'Nothing in it was re-checked against the code when it was written, and the ' +
      'code may have changed since: before relying on a detail, read the file it ' +
      'points to, starting with the ones its Quick start names.\n\n' +
      'Do NOT summarize this back to the user and do NOT ask whether to resume or ' +
      'start fresh. Answer their next request directly — that request is ' +
      'authoritative, and it may have nothing to do with this handover.\n\n' +
      '---\n\n' +
      body + '\n\n---\n\n' +
      `Handover file: ${file.full}` +
      (earlier ? ` (${earlier} earlier block${earlier > 1 ? 's' : ''}, kept for /memorise)` : '') + '\n';

    // The marker goes down only once the context is out.
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: context,
      },
    }), () => {
      try { fs.writeFileSync(consumed, new Date().toISOString(), 'utf8'); } catch { /* non-fatal */ }
    });
  } catch {
    process.exit(0);
  }
});
