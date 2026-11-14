#!/usr/bin/env node
// scribe-trigger.js — Stop hook (async). Queues the turn for the memory scribe and spawns the
// worker when none is running. Never blocks the session: fail-open everywhere.
// Registered a second time on Stop as `scribe-trigger.js --inbox` (synchronous): that mode only checks the
// memory inbox and, over the threshold, has the session drain it (see --inbox below).
//
// Scope: 0-to-Hero projects under SCRIBE_ROOTS only (pilot). Main agent only (no agent_id).
// Visibility: the previous worker run leaves <state>/report.txt; this hook prints it once as a
// systemMessage ("scribe: web state updated · +1 candidate") and deletes it.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// SCRIBE_ROOTS: ';'-separated folders whose projects the scribe watches. Unset = every Durcir project.
const SCRIBE_ROOTS = (process.env.SCRIBE_ROOTS || '').split(';').filter(Boolean)
  .map(r => path.resolve(r).toLowerCase());
const STATE_ROOT = path.join(os.homedir(), '.claude', 'scribe');
const MIN_GAP_MS = 5 * 60 * 1000;   // batch: one worker run per project per 5 min
const LOCK_STALE_MS = 10 * 60 * 1000;
const INBOX_MIN = 5, INBOX_DAYS = 3;   // --inbox fires at 5 waiting items, or when the oldest has waited 3 days

// State dir per project. The cwd's drive-letter case varies between hosts (D:\ vs d:\), the slug must not:
// reuse an existing dir that matches case-insensitively, else create it lowercase.
const slugify = p => {
  const raw = p.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '');
  let existing; try { existing = fs.readdirSync(STATE_ROOT).find(d => d.toLowerCase() === raw.toLowerCase()); } catch {}
  return existing || raw.toLowerCase();
};

// Project root = nearest folder at or above `dir` holding CLAUDE.md + DECISIONS.md (the Durcir opt-in marker).
// Same rule as inject-learnings.sh; root.check.js asserts both agree.
function projectRoot(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'CLAUDE.md')) && fs.existsSync(path.join(d, 'DECISIONS.md'))) return d;
    if (path.dirname(d) === d) return null;
  }
}
module.exports = { projectRoot };
if (require.main !== module) return;

let input = '';
const t = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  clearTimeout(t);
  try {
    const j = JSON.parse(input);
    if (j.agent_id) process.exit(0);
    if (!j.transcript_path || !j.session_id) process.exit(0);
    // Anchor on CLAUDE_PROJECT_DIR (the folder the session started in, fixed by Claude Code), not the hook's cwd:
    // a Bash `cd` drifts the cwd into sub-folders or a sibling project, and a sibling would then re-read this
    // session from line 0. The cwd fallback only serves hosts that do not set the variable.
    const cwd = projectRoot(process.env.CLAUDE_PROJECT_DIR || j.cwd || process.cwd());
    if (!cwd) process.exit(0);
    const low = cwd.toLowerCase();
    if (SCRIBE_ROOTS.length && !SCRIBE_ROOTS.some(r => low === r || low.startsWith(r + path.sep))) process.exit(0);

    const slug = slugify(cwd);
    const dir = path.join(STATE_ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });

    // --inbox: the second Stop registration, synchronous (an async hook cannot hold the turn). When the memory
    // inbox is over the threshold, the session drains it itself: once per session, attended sessions only
    // (a headless run has no owner to answer a question), never from a turn a Stop hook already continued.
    if (process.argv.includes('--inbox')) {
      if (j.hook_event_name !== 'Stop' || j.stop_hook_active || process.env.CLAUDE_CODE_SESSION_ATTENDED !== '1') process.exit(0);
      const mark = path.join(dir, `inbox-${j.session_id}`);
      if (fs.existsSync(mark)) process.exit(0);
      const p = JSON.parse(fs.readFileSync(path.join(dir, 'pending.json'), 'utf8'));   // absent (just drained) → catch → exit 0
      const age = p.oldest ? Math.floor((Date.now() - Date.parse(p.oldest)) / 86400000) : 0;
      if (!(p.total >= INBOX_MIN || (p.total > 0 && age >= INBOX_DAYS))) process.exit(0);
      fs.writeFileSync(mark, '');
      process.stdout.write(JSON.stringify({ decision: 'block', reason:
        `Memory inbox: ${p.total} item(s) waiting in ${cwd} (oldest ${age} d). Drain it before stopping, without asking the owner to type anything. ` +
        `If your last message asked the owner something, or left their request unfinished, do nothing and stop: that comes first. ` +
        `Otherwise launch ONE background subagent briefed to follow ~/.claude/commands/memorise.md for the project root ${cwd}, with two changes: it asks no question and applies no fix. ` +
        `It applies every decision it can reach from reading, and returns (a) one line per decision, (b) the items it could not settle, (c) the fixes it would apply (file, size of the change). ` +
        `Tell the owner in one line that the memory inbox is being processed, then end your turn. When the subagent reports: print (a) in a few lines; ` +
        `if (b) or (c) is not empty, ask ONE AskUserQuestion (multiSelect) covering them and apply the answer as memorise.md says; then delete ${path.join(dir, 'pending.json')}.` }));
      process.exit(0);
    }

    // 1. queue this turn (SessionEnd = flush: the worker processes the session's delta now,
    //    whatever its size, and the batch gap does not apply)
    const flush = j.hook_event_name === 'SessionEnd';
    fs.appendFileSync(path.join(dir, 'queue.jsonl'), JSON.stringify({
      session_id: j.session_id, transcript_path: j.transcript_path, cwd, from: process.env.CLAUDE_PROJECT_DIR ? 'project_dir' : 'cwd', ts: Date.now(), flush,
    }) + '\n');

    // 2. surface the previous run's report, once
    let msg = '';
    const report = path.join(dir, 'report.txt');
    if (fs.existsSync(report)) {
      try { msg = fs.readFileSync(report, 'utf8').trim(); fs.unlinkSync(report); } catch { /* keep going */ }
    }

    // 3. spawn the worker if none runs and the batch gap has passed
    const lock = path.join(dir, 'worker.lock');
    const last = path.join(dir, 'last-run');
    let locked = false;
    try { locked = Date.now() - fs.statSync(lock).mtimeMs < LOCK_STALE_MS; } catch { locked = false; }
    let recent = false;
    try { recent = Date.now() - fs.statSync(last).mtimeMs < MIN_GAP_MS; } catch { recent = false; }
    const launch = (s, wd) => { const child = spawn(process.execPath, [path.join(__dirname, 'scribe-worker.js'), s], { detached: true, stdio: 'ignore', windowsHide: true, cwd: wd }); child.unref(); };
    if (!locked && (!recent || flush)) launch(slug, cwd);

    // 4. catch-up: another project whose queue has waited longer than the worker's max wait and
    //    has no running worker gets its worker launched too (its own session may never Stop again).
    try {
      for (const other of fs.readdirSync(STATE_ROOT)) {
        if (other === slug) continue;
        const od = path.join(STATE_ROOT, other); const oq = path.join(od, 'queue.jsonl');
        let age = 0; try { age = Date.now() - fs.statSync(oq).mtimeMs; } catch { continue; }
        let olocked = false; try { olocked = Date.now() - fs.statSync(path.join(od, 'worker.lock')).mtimeMs < LOCK_STALE_MS; } catch {}
        if (age > 20 * 60 * 1000 && !olocked) {
          let ocwd = null; try { ocwd = JSON.parse(fs.readFileSync(oq, 'utf8').split('\n').filter(Boolean)[0]).cwd; } catch {}
          if (ocwd && fs.existsSync(ocwd)) launch(other, ocwd);
        }
      }
    } catch { /* fail-open */ }

    if (msg) process.stdout.write(JSON.stringify({ systemMessage: msg }));
  } catch {
    process.exit(0);
  }
});
