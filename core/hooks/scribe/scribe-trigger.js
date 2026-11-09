#!/usr/bin/env node
// scribe-trigger.js — Stop hook (async). Queues the turn for the memory scribe and spawns the
// worker when none is running. Never blocks the session: fail-open everywhere.
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

// State dir per project. The cwd's drive-letter case varies between hosts (D:\ vs d:\), the slug must not:
// reuse an existing dir that matches case-insensitively, else create it lowercase.
const slugify = p => {
  const raw = p.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '');
  let existing; try { existing = fs.readdirSync(STATE_ROOT).find(d => d.toLowerCase() === raw.toLowerCase()); } catch {}
  return existing || raw.toLowerCase();
};

let input = '';
const t = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  clearTimeout(t);
  try {
    const j = JSON.parse(input);
    if (j.agent_id) process.exit(0);
    const cwd = j.cwd || process.cwd();
    const low = path.resolve(cwd).toLowerCase();
    if (SCRIBE_ROOTS.length && !SCRIBE_ROOTS.some(r => low === r || low.startsWith(r + path.sep))) process.exit(0);
    if (!fs.existsSync(path.join(cwd, 'CLAUDE.md'))) process.exit(0);
    // Durcir layout only: a root DECISIONS.md or at least one <workspace>/AGENT.md, otherwise the writer has nowhere to write.
    const durcir = fs.existsSync(path.join(cwd, 'DECISIONS.md')) || fs.readdirSync(cwd, { withFileTypes: true }).some(d => d.isDirectory() && !d.name.startsWith('.') && fs.existsSync(path.join(cwd, d.name, 'AGENT.md')));
    if (!durcir) process.exit(0);
    if (!j.transcript_path || !j.session_id) process.exit(0);

    const slug = slugify(cwd);
    const dir = path.join(STATE_ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });

    // 1. queue this turn (SessionEnd = flush: the worker processes the session's delta now,
    //    whatever its size, and the batch gap does not apply)
    const flush = j.hook_event_name === 'SessionEnd';
    fs.appendFileSync(path.join(dir, 'queue.jsonl'), JSON.stringify({
      session_id: j.session_id, transcript_path: j.transcript_path, cwd, ts: Date.now(), flush,
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
