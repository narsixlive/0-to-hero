#!/usr/bin/env node
// claude-statusline.js — neutral statusline with memory health signal.
//
// Shows: model | current task (in-progress todo) | dir | context bar | memory | scribe
// Memory section shows: cmem worker (🧠 green/red), active learnings count,
// !auto warning if CLAUDE_CODE_DISABLE_AUTO_MEMORY=1.
// Scribe section (projects watched by the memory scribe only): ✍✓ up to date (safe to /clear),
// ✍ N = N transcript lines not yet read, ✍⏳ = worker running.
//
// Project-agnostic. Reads stdin JSON from Claude Code statusLine spec.

const fs = require('fs');
const path = require('path');
const os = require('os');

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;
    const homeDir = os.homedir();
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(homeDir, '.claude');

    // Context bar (auto-compact buffer at 16.5%)
    const AUTO_COMPACT_BUFFER_PCT = 16.5;
    let ctx = '';
    if (remaining != null) {
      const usableRemaining = Math.max(0, ((remaining - AUTO_COMPACT_BUFFER_PCT) / (100 - AUTO_COMPACT_BUFFER_PCT)) * 100);
      const used = Math.max(0, Math.min(100, Math.round(100 - usableRemaining)));
      const filled = Math.floor(used / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      if (used < 50)      ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      else if (used < 65) ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      else if (used < 80) ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      else                ctx = ` \x1b[5;31m💀 ${bar} ${used}%\x1b[0m`;
    }

    // Current task from todos file (matches the active session)
    let task = '';
    const todosDir = path.join(claudeDir, 'todos');
    if (session && fs.existsSync(todosDir)) {
      try {
        const files = fs.readdirSync(todosDir)
          .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
          .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length > 0) {
          const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
          const inProgress = todos.find(t => t.status === 'in_progress');
          if (inProgress) task = inProgress.activeForm || '';
        }
      } catch (e) { /* silent */ }
    }

    // Memory health: worker process + active learnings count + auto-mem flag
    let mem = '';
    try {
      const supervisorPath = path.join(homeDir, '.claude-mem', 'supervisor.json');
      if (fs.existsSync(supervisorPath)) {
        const sup = JSON.parse(fs.readFileSync(supervisorPath, 'utf8'));
        const workerAlive = sup?.processes?.worker?.pid != null;

        const globalSettings = path.join(claudeDir, 'settings.json');
        let autoMemKilled = false;
        if (fs.existsSync(globalSettings)) {
          const gs = JSON.parse(fs.readFileSync(globalSettings, 'utf8'));
          autoMemKilled = gs?.env?.CLAUDE_CODE_DISABLE_AUTO_MEMORY === '1';
        }

        // Find nearest CONTEXT.md (cwd, then parent up to 2 levels)
        let learningsCount = 0;
        const candidates = [
          path.join(dir, 'CONTEXT.md'),
          path.join(dir, '..', 'CONTEXT.md'),
          path.join(dir, '..', '..', 'CONTEXT.md'),
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            const txt = fs.readFileSync(p, 'utf8');
            const active = txt.match(/^## Active Learnings[\s\S]*?(?=^## |\Z)/m);
            const fallback = txt.match(/^## Learnings[\s\S]*?(?=^## |\Z)/m);
            const section = active || fallback;
            if (section) learningsCount = (section[0].match(/^- /gm) || []).length;
            break;
          }
        }

        const brain = workerAlive ? '\x1b[32m🧠\x1b[0m' : '\x1b[31m🧠✗\x1b[0m';
        const learn = `\x1b[2m${learningsCount}L\x1b[0m`;
        const warn = autoMemKilled ? ' \x1b[31m!auto\x1b[0m' : '';
        mem = ` │ ${brain} ${learn}${warn}`;
      } else {
        // No claude-mem at all — show neutral indicator
        mem = ' │ \x1b[2m🧠—\x1b[0m';
      }
    } catch (e) { /* silent */ }

    // Scribe lag: transcript lines of this session not yet read by the memory scribe.
    // ✍✓ = up to date (safe to /clear) · ✍ N = N lines pending · ✍⏳ = worker running.
    // Only shown for projects the scribe watches (a state dir exists for this cwd).
    let scribe = '';
    try {
      const stateRoot = path.join(claudeDir, 'scribe');
      const slug = dir.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
      const stateDir = fs.readdirSync(stateRoot).find(d => d.toLowerCase() === slug); // slugs are case-sensitive on disk, cwd case is not
      // Some hosts (VS Code extension) omit transcript_path: locate the transcript by session id.
      let transcript = data.transcript_path;
      if (!transcript && session) {
        const projects = path.join(claudeDir, 'projects');
        for (const d of fs.readdirSync(projects)) {
          const p = path.join(projects, d, `${session}.jsonl`);
          if (fs.existsSync(p)) { transcript = p; break; }
        }
      }
      if (stateDir && session && transcript) {
        const st = path.join(stateRoot, stateDir);
        let cursor = 0;
        try { cursor = JSON.parse(fs.readFileSync(path.join(st, 'cursors', `${session}.json`), 'utf8')).line || 0; } catch {}
        const txt = fs.readFileSync(transcript, 'utf8'); // ponytail: full read per tick, fine up to a few MB
        const lines = (txt.match(/\n/g) || []).length + (txt.endsWith('\n') || !txt ? 0 : 1);
        const lag = Math.max(0, lines - cursor);
        let running = false;
        try { running = Date.now() - fs.statSync(path.join(st, 'worker.lock')).mtimeMs < 10 * 60 * 1000; } catch {}
        // Memory inbox: proposals + candidates waiting for /memorise, written by the worker as pending.json.
        let inbox = '';
        try { const p = JSON.parse(fs.readFileSync(path.join(st, 'pending.json'), 'utf8')); if (p.alert) inbox = ` \x1b[33m✉${p.total}\x1b[0m`; } catch {}
        scribe = (running ? ' │ \x1b[33m✍⏳\x1b[0m'
          : lag === 0 ? ' │ \x1b[32m✍✓\x1b[0m'
          : ` │ \x1b[33m✍ ${lag}\x1b[0m`) + inbox;
      }
    } catch (e) { /* silent */ }

    const dirname = path.basename(dir);
    if (task) {
      process.stdout.write(`\x1b[2m${model}\x1b[0m │ \x1b[1m${task}\x1b[0m │ \x1b[2m${dirname}\x1b[0m${ctx}${mem}${scribe}`);
    } else {
      process.stdout.write(`\x1b[2m${model}\x1b[0m │ \x1b[2m${dirname}\x1b[0m${ctx}${mem}${scribe}`);
    }
  } catch (e) {
    // Silent fail — never break the statusline
    if (process.env.STATUSLINE_DEBUG) console.error(e);
  }
});
