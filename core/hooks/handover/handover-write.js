#!/usr/bin/env node
// handover-write.js — PreCompact hook for the 0-to-Hero handover layer.
//
// Why: /compact explicitly discards "intermediate failed attempts and resolved
// error logs". That is exactly the material /memorise scans to propose fixes.
// In a long session, compaction silently blinds /memorise to everything that
// went wrong before it fired — and it fails silently, which is the worst kind.
//
// What it writes: FACTS ONLY, mechanically extracted from the transcript.
// No model call, no judgment, no cost. The file is a breadcrumb for /memorise,
// never injected back into a session — so it costs zero context too.
//
// The transcript is the real record; this file mostly tells /memorise that a
// compaction happened, where the full transcript lives, and which turn range
// got pruned, so it re-reads instead of trusting a window that lost the middle.
//
// Contract (verified against code.claude.com/docs/en/hooks, CC 2.1.268):
//   stdin: session_id, transcript_path, cwd, hook_event_name, trigger
//   PreCompact receives NO token/context usage. Default timeout 600s.
//   transcript_path is written asynchronously and may lag the current turn.
//
// Known limit: is_error catches commands that exit non-zero, NOT approaches
// that "succeed" while doing the wrong thing. Measured on a real session: 1 of
// at least 3 genuine dead ends. So this file is a POINTER, not a substitute —
// /memorise re-reads the transcript itself and does the judging.
//
// Safety: fail-open everywhere. A broken handover must never break compaction.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HANDOVER_ROOT = path.join(os.homedir(), '.claude', 'handovers');
const MAX_ERRORS = 15;          // keep the file small; transcript has the rest
const MAX_ERR_CHARS = 600;      // per error excerpt

// Mirror Claude Code's own project-slug convention: non-alphanumerics → '-'.
function slugify(cwd) {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '');
}

function extract(transcriptPath) {
  const out = { files: new Set(), errors: [], tools: {}, lines: 0, lastUser: null };
  let raw;
  try { raw = fs.readFileSync(transcriptPath, 'utf8'); } catch { return out; }

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let j;
    try { j = JSON.parse(line); } catch { continue; }
    out.lines++;

    if (j.type === 'assistant' && Array.isArray(j.message?.content)) {
      for (const b of j.message.content) {
        if (b.type !== 'tool_use') continue;
        out.tools[b.name] = (out.tools[b.name] || 0) + 1;
        const fp = b.input?.file_path;
        if (fp) out.files.add(fp);
      }
    }

    if (j.type === 'user') {
      // What the user actually typed arrives as a text BLOCK, not as string
      // content — measured on a real transcript, every string-content user
      // turn was a harness injection (task notifications, local command
      // output, caveats). Filter those out either way: reporting one as
      // "what the user last asked for" would be actively misleading.
      const isInjected = s =>
        /^<(task-notification|system-reminder|local-command|command-name|command-message)/.test(s)
        || s.startsWith('Caveat:');

      if (typeof j.message?.content === 'string') {
        const s = j.message.content.trim();
        if (s && !isInjected(s)) out.lastUser = s.slice(0, 300);
      }

      if (Array.isArray(j.message?.content)) {
        for (const b of j.message.content) {
          if (b.type === 'text' && typeof b.text === 'string') {
            const s = b.text.trim();
            if (s && !isInjected(s)) out.lastUser = s.slice(0, 300);
          }
          if (b.type === 'tool_result' && b.is_error === true) {
            const txt = typeof b.content === 'string'
              ? b.content
              : JSON.stringify(b.content);
            out.errors.push(txt.slice(0, MAX_ERR_CHARS));
          }
        }
      }
    }
  }
  return out;
}

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    const transcript = data.transcript_path;
    const cwd = data.cwd || process.cwd();
    const trigger = data.trigger || 'unknown';

    if (!sessionId || !transcript) process.exit(0);
    if (!fs.existsSync(transcript)) process.exit(0);
    // Only fire inside a 0-to-Hero project (same guard as inject-learnings.sh).
    if (!fs.existsSync(path.join(cwd, 'CLAUDE.md'))) process.exit(0);

    const dir = path.join(HANDOVER_ROOT, slugify(cwd));
    fs.mkdirSync(dir, { recursive: true });

    // session_id is confirmed present on every hook event, so two parallel
    // sessions on the same project cannot collide.
    const outFile = path.join(dir, `${sessionId}.md`);
    const x = extract(transcript);
    const stamp = new Date().toISOString();

    let entry = `\n## Compaction — ${stamp} (trigger: ${trigger})\n\n`;
    entry += `- transcript: \`${transcript}\`\n`;
    entry += `- transcript lines at this point: ${x.lines}\n`;
    if (x.lastUser) entry += `- last user request before compaction: ${JSON.stringify(x.lastUser)}\n`;

    const toolStr = Object.entries(x.tools).map(([k, v]) => `${k}×${v}`).join(', ');
    if (toolStr) entry += `- tools used: ${toolStr}\n`;

    if (x.files.size) {
      entry += `\n### Files touched\n`;
      for (const f of x.files) entry += `- ${f}\n`;
    }

    if (x.errors.length) {
      entry += `\n### Failed tool calls (is_error), verbatim\n`;
      entry += `<!-- Only catches non-zero exits. Approaches that "succeeded"\n`;
      entry += `     while doing the wrong thing are NOT here — read the transcript. -->\n`;
      for (const e of x.errors.slice(-MAX_ERRORS)) {
        entry += '\n```\n' + e.replace(/```/g, '`­``') + '\n```\n';
      }
    } else {
      entry += `\n### Failed tool calls (is_error), verbatim\nnone\n`;
    }

    // Append: several compactions can happen in one session, each pruning a
    // different stretch of work. Overwriting would lose the earlier ones.
    fs.appendFileSync(outFile, entry, 'utf8');

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreCompact',
        additionalContext:
          `[handover] Compaction at ${stamp}. Facts appended to ${outFile}. ` +
          `Run /memorise before /clear — it reads this and re-reads the transcript.`,
      },
    }));
  } catch {
    process.exit(0);
  }
});
