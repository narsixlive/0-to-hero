#!/usr/bin/env node
// scribe-worker.js <project-slug> [--dry-run]
// Background memory scribe: drains the project's queue, builds a TRIMMED transcript delta per
// session from a durable cursor, merges the sessions of the project into ONE lean model call
// (no tools, short system prompt, single turn, delta inline), verifies every evidence id against
// the delta, applies the proposal through scribe-writer.js, logs tokens, leaves a one-line report
// that the next Stop hook prints in the session.
//
// Cost rules: no model call when the delta carries no signal (read-only turn); small deltas wait
// (accumulate) unless the session ended or the wait is over; per-session token cap; daily cap
// across all projects.
//
// Durability rules (v0.3):
//   - exclusive lock (open 'wx'); a stale lock (> 10 min) is removed once, then retried
//   - the queue file is taken by atomic rename; on any failure its entries go back to the queue
//   - cursors advance only over what was actually sent to the model AND applied without error;
//     an oversized delta is cut at a transcript line and the rest is re-queued (nothing skipped)
//   - a trailing unparsable transcript line (still being written) is left for the next run
//   - every run appends one line to journal.jsonl: sessions, cursor ranges, applied, rejected

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const writer = require('./scribe-writer.js');

const slug = process.argv[2];
const DRY = process.argv.includes('--dry-run');
if (!slug) process.exit(1);

const STATE_ROOT = path.join(os.homedir(), '.claude', 'scribe');
const STATE = path.join(STATE_ROOT, slug);
const DAILY_BUDGET = Number(process.env.SCRIBE_DAILY_TOKENS || 2_000_000);   // all projects together (≈ 100 lean runs)
const SESSION_BUDGET = Number(process.env.SCRIBE_SESSION_TOKENS || 300_000); // per session_id
const MAX_DELTA_CHARS = 40_000;   // per session per run, ≈ 10k tokens; the rest waits for the next run
const MAX_PROMPT_DELTA = 80_000;  // all sessions of one run together
const MIN_DELTA_CHARS = 6_000;    // below: wait for more, unless flush or MAX_WAIT_MS elapsed
const MAX_WAIT_MS = 20 * 60 * 1000;
const MIN_USER_CHARS = 40;        // a USER line this long counts as signal
const TOOL_OUT_CAP = 600;         // non-error tool results
const ERR_CAP = 1500;             // errors verbatim up to this
const ASSISTANT_CAP = 1500;
const MAX_APPLY_FAILURES = 3;     // after this many failed applies of the same delta, advance and alert
const MODEL = process.env.SCRIBE_MODEL || 'sonnet';
const WRITE_TOOLS = /^TOOL \S+ (Edit|MultiEdit|Write|NotebookEdit|Bash|PowerShell)\b/m;
// The owner's words count as a correction only when they are imperative/absolute.
const IMPERATIVE = /\b(jamais|toujours|never|always|plus jamais|arr[êe]te|stop|il faut|faut|ne .{1,40} (pas|plus)|don'?t|do not|must)\b/i;

const log = line => { try { fs.appendFileSync(path.join(STATE, 'worker.log'), `${new Date().toISOString()} ${line}\n`); } catch {} };
const report = text => { if (DRY) { console.log(`[dry-run report] ${text}`); return; } try { fs.appendFileSync(path.join(STATE, 'report.txt'), text + '\n', 'utf8'); } catch {} };
const journal = obj => { if (!DRY) try { fs.appendFileSync(path.join(STATE, 'journal.jsonl'), JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n'); } catch {} };
// Budget / failure alerts: systemMessage at the next Stop, plus Discord when configured. Fail-open.
// SCRIBE_DISCORD_WEBHOOK = the webhook URL itself, or SCRIBE_DISCORD_ENV = a KEY=VALUE file holding
// DISCORD_WEBHOOK_AUDIT or DISCORD_WEBHOOK_SESSIONS. Neither set = no Discord.
const ALERT_WEBHOOK = process.env.SCRIBE_DISCORD_WEBHOOK || '';
const ALERT_SECRETS = process.env.SCRIBE_DISCORD_ENV || '';
function alert(text) {
  report(text);
  if (DRY) return;
  try {
    let url = ALERT_WEBHOOK;
    if (!url && ALERT_SECRETS) {
      const kv = Object.fromEntries(fs.readFileSync(ALERT_SECRETS, 'utf8').split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#')).map(l => l.split('=').map(s => s.trim().replace(/^"|"$/g, ''))));
      url = kv.DISCORD_WEBHOOK_AUDIT || kv.DISCORD_WEBHOOK_SESSIONS;
    }
    if (url) fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: `[${slug}] ${text}`.slice(0, 1900) }) }).catch(() => {});
  } catch {}
}
const today = () => new Date().toISOString().slice(0, 10);

const readJsonl = f => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } };
const usage = () => readJsonl(path.join(STATE, 'usage.jsonl'));
// Daily budget is machine-wide: every project's usage counts.
function tokensToday() {
  let n = 0;
  try { for (const d of fs.readdirSync(STATE_ROOT)) n += readJsonl(path.join(STATE_ROOT, d, 'usage.jsonl')).filter(u => u.date === today() && u.sessions).reduce((a, u) => a + u.tokens, 0); } catch {} // v0.1 rows ("session") are legacy
  return n;
}
// A run's tokens are split evenly between the sessions it covered.
const tokensForSession = id => usage().reduce((a, u) => {
  const ss = u.sessions; return ss && ss.includes(id) ? a + u.tokens / ss.length : a; // v0.1 rows ("session") are legacy: not counted
}, 0);
// Per-session budget override: the alert tells the owner to write a higher number into budget-<id>.
function sessionBudget(id) {
  try { const n = Number(fs.readFileSync(path.join(STATE, `budget-${id}`), 'utf8').trim()); if (n > 0) return n; } catch {}
  return SESSION_BUDGET;
}

const isInjected = s => /^<(task-notification|system-reminder|local-command|command-name|command-message)/.test(s) || s.startsWith('Caveat:');

// Deterministic trim of one JSONL entry → short text, or null.
function render(j) {
  const m = j.message || {};
  const c = m.content;
  if (j.type === 'user') {
    const out = [];
    const blocks = typeof c === 'string' ? [{ type: 'text', text: c }] : Array.isArray(c) ? c : [];
    for (const b of blocks) {
      if (b.type === 'text' && b.text && !isInjected(b.text.trim())) out.push(`USER: ${b.text.trim()}`);
      if (b.type === 'tool_result') {
        let t = typeof b.content === 'string' ? b.content : Array.isArray(b.content) ? b.content.map(x => x.text || '').join('\n') : '';
        t = t.replace(/\s+/g, ' ').trim();
        const cap = b.is_error ? ERR_CAP : TOOL_OUT_CAP;
        if (t.length > cap) t = t.slice(0, cap) + ` …[${t.length} chars]`;
        out.push(`RESULT${b.is_error ? ' ERROR' : ''} ${b.tool_use_id}: ${t}`);
      }
    }
    return out.length ? out.join('\n') : null;
  }
  if (j.type === 'assistant' && Array.isArray(c)) {
    const out = [];
    for (const b of c) {
      if (b.type === 'text' && b.text) { let t = b.text.trim(); if (t.length > ASSISTANT_CAP) t = t.slice(0, ASSISTANT_CAP) + ' …'; out.push(`ASSISTANT: ${t}`); }
      if (b.type === 'tool_use') {
        const i = b.input || {};
        const arg = i.file_path || i.command || i.pattern || i.description || JSON.stringify(i);
        out.push(`TOOL ${b.id} ${b.name}: ${String(arg).replace(/\s+/g, ' ').slice(0, 200)}`);
      }
    }
    return out.length ? out.join('\n') : null;
  }
  return null;
}

// Something memorable can only come from: an error, a write/command, or the owner saying something.
function hasSignal(text) {
  if (/^RESULT ERROR /m.test(text) || WRITE_TOOLS.test(text)) return true;
  return text.split('\n').some(l => l.startsWith('USER: ') && l.length - 6 >= MIN_USER_CHARS);
}

// Delta from the cursor, oldest first, cut at a transcript line once MAX_DELTA_CHARS is reached.
// Returns { text, from, line, partial } — `line` is the cursor to set once this delta is applied.
function deltaFor(transcript, cursorFile, max = MAX_DELTA_CHARS) {
  let lines;
  try { lines = fs.readFileSync(transcript, 'utf8').split('\n'); } catch { return null; }
  let from = 0;
  try { from = JSON.parse(fs.readFileSync(cursorFile, 'utf8')).line || 0; } catch {}
  if (lines[lines.length - 1] === '') lines.pop();
  if (from >= lines.length) return null;
  const parts = []; let size = 0; let i = from; let partial = false;
  for (; i < lines.length; i++) {
    let j;
    try { j = JSON.parse(lines[i]); } catch {
      if (i === lines.length - 1) break;   // last line still being written: leave it for the next run
      continue;                             // corrupt line in the middle: skip
    }
    const r = render(j); if (!r) continue;
    if (size && size + r.length + 1 > max) { partial = true; break; }
    parts.push(r); size += r.length + 1;
  }
  if (i === from) return null;              // only an unfinished trailing line
  const text = parts.join('\n');
  if (!hasSignal(text)) return { text: null, from, line: i, partial };
  return { text, from, line: i, partial };
}

function workspaces(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'AGENT.md'))).map(d => d.name);
}

// Only the workspaces the delta touches (fallback: all) — the snapshot is paid on every run.
function memorySnapshot(root, wss, delta) {
  const touched = wss.filter(ws => delta.includes(ws + '/') || delta.includes(ws + '\\'));
  let s = '';
  for (const ws of (touched.length ? touched : wss)) {
    const ctx = path.join(root, ws, 'CONTEXT.md'); const lrn = path.join(root, ws, 'LEARNINGS.md');
    if (fs.existsSync(ctx)) { const b = writer.sectionBody(fs.readFileSync(ctx, 'utf8'), 'Current state'); if (b) s += `\n### ${ws}/CONTEXT.md ## Current state\n${b.trim()}\n`; }
    if (fs.existsSync(lrn)) {
      const t = fs.readFileSync(lrn, 'utf8');
      for (const h of ['Active Learnings', 'Candidates']) { const b = writer.sectionBody(t, h); if (b && b.trim()) s += `\n### ${ws}/LEARNINGS.md ## ${h}\n${b.trim()}\n`; }
    }
  }
  return s;
}

const SYSTEM = 'You are the memory scribe of a software project. You read a trimmed transcript and answer with ONE JSON object and nothing else: no prose, no code fence, no tool use.';

// Stable parts first (cache prefix), delta last.
const PROMPT = (root, wss, snapshot, delta) => `Project cwd = ${root}. Below is a TRIMMED transcript delta of one or more Claude Code sessions in this project (USER / ASSISTANT / TOOL id name: args / RESULT id: output; sessions separated by === SESSION === lines). Extract what deserves to be remembered.

Rules:
- Evidence or nothing. "state" only when a successful RESULT or an explicit USER statement supports it; "evidence" = the tool ids (copied verbatim from the delta) whose RESULT proves the line. State lines are facts about where the work stands now, not a narrative.
- "facts": durable project-level facts (deploy to prod, acquisition, rename, commitment) proven by a successful RESULT or stated by the USER; ≤ 200 chars; "evidence" = tool id or "owner said: <exact quote>". Nothing else is a fact.
- "candidates": behavioral ALWAYS/NEVER rules suggested by an incident in THIS delta (RESULT ERROR then a fix, the USER correcting the assistant, a rule relearned the hard way). "incident" = the tool id, or "owner said: <exact quote>" when the incident is the user's words alone. "owner_correction" = the USER's exact words ONLY if the user explicitly told the assistant to always/never do something; else null. "seam" is always null. If the existing memory below already holds the rule, reuse its wording verbatim so it can be counted, do not rephrase.
- Workspaces of this project: ${wss.join(', ')}. Route by the files touched (a path like web/... → web). Any other workspace name is dropped.
- Never invent an id or a quote: anything not present verbatim in the delta is dropped by the writer.
- Empty arrays are fine. If nothing is worth keeping, return {"state":[],"facts":[],"candidates":[],"skipped_reason":"<why>"}.

Schema:
{"state":[{"workspace":"","lines":["≤5 short lines"],"next":"one line","evidence":["tool ids"]}],
 "facts":[{"date":"YYYY-MM-DD","text":"","evidence":""}],
 "candidates":[{"workspace":"","rule":"ALWAYS/NEVER … (…)","incident":"tool id or owner said: …","owner_correction":null,"seam":null}],
 "skipped_reason":null}

Current memory (for dedup and continuity):
${snapshot || '(none)'}

Today: ${today()}.

Transcript delta:
${delta}`;

// Native binary beside the npm shim: no shell, so empty and multi-line arguments survive.
function claudeBin() {
  if (process.platform !== 'win32') return 'claude';
  const exe = path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  return fs.existsSync(exe) ? exe : 'claude.exe';
}

// Returns { proposal | null, tokens, cost, ms, turns, error }. Usage is returned even when the
// proposal is unusable, so a paid call is always recorded.
function runModel(root, prompt) {
  const args = ['-p', '--model', MODEL, '--tools', '', '--system-prompt', SYSTEM, '--output-format', 'json',
    '--no-session-persistence', '--setting-sources', 'local', '--strict-mcp-config', '--max-turns', '1'];
  const r = spawnSync(claudeBin(), args, { cwd: root, input: prompt, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true, timeout: 240_000 });
  if (r.error) throw r.error;
  let d; try { d = JSON.parse(r.stdout); } catch { throw new Error(`non-JSON claude output: ${(r.stderr || r.stdout || '').slice(0, 300)}`); }
  const u = d.usage || {};
  const tokens = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0);
  const meta = { tokens, cost: d.total_cost_usd || 0, ms: d.duration_ms || 0, turns: d.num_turns || 0, usage: { in: u.input_tokens || 0, cc: u.cache_creation_input_tokens || 0, cr: u.cache_read_input_tokens || 0, out: u.output_tokens || 0 } };
  if (d.is_error) return { ...meta, proposal: null, error: `claude error: ${String(d.result).slice(0, 300)}` };
  let text = String(d.result || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{'); if (start > 0) text = text.slice(start);
  try { return { ...meta, proposal: JSON.parse(text), error: null }; } catch { return { ...meta, proposal: null, error: `proposal is not JSON: ${text.slice(0, 300)}` }; }
}

// Drop anything whose evidence is not literally in the delta. state/facts need a SUCCESSFUL result id
// (or a verified owner quote); a candidate's incident may be any id, or a verified owner quote.
// Workspaces outside `wss` are dropped. Returns {proposal, rejected}.
function verify(proposal, delta, wss = null) {
  const allIds = new Set(delta.match(/\btoolu_[A-Za-z0-9_-]+/g) || []);
  const okIds = new Set((delta.match(/^RESULT (toolu_[A-Za-z0-9_-]+):/gm) || []).map(l => l.slice(7, -1)));
  const userText = delta.split('\n').filter(l => l.startsWith('USER: ')).join('\n');
  const quoted = s => typeof s === 'string' && s.trim().length >= 8 && userText.includes(s.trim());
  const ownerQuote = s => /^owner said:/i.test(String(s || '')) && quoted(String(s).replace(/^owner said:\s*/i, '').replace(/^["«“]|["»”]$/g, ''));
  const wsOk = ws => wss === null || wss.includes(ws);
  let rejected = 0;
  const p = { state: [], facts: [], candidates: [], skipped_reason: proposal.skipped_reason ?? null };
  for (const s of proposal.state || []) {
    const ev = (Array.isArray(s.evidence) ? s.evidence : []).filter(id => okIds.has(id));
    if (ev.length && wsOk(s.workspace)) p.state.push({ ...s, evidence: ev }); else rejected++;
  }
  // Dates after today: a fact dated in the future is rejected; a future date inside the text is kept but tagged
  // (a real scheduled event, e.g. "RSS shuts down 2026-11-13", must not read as something that already happened).
  const futureDates = s => (String(s || '').match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b/g) || [])
    .map(d => d.includes('/') ? d.split('/').reverse().join('-') : d).filter(d => d > today());
  for (let f of proposal.facts || []) {
    const ev = String(f.evidence || '');
    if (futureDates(f.date).length) { rejected++; continue; }
    if (futureDates(f.text).length) f = { ...f, text: `${f.text} (future date: scheduled, not yet happened)` };
    if (okIds.has(ev) || ownerQuote(ev)) p.facts.push(f); else rejected++;
  }
  for (const c of proposal.candidates || []) {
    if (!wsOk(c.workspace)) { rejected++; continue; }
    let incident = c.incident;
    if (ownerQuote(incident)) incident = `owner ${today()}`;
    else if (!allIds.has(incident)) { rejected++; continue; }
    // A quoted correction promotes to Active only when the owner's words are imperative/absolute.
    const owner = quoted(c.owner_correction) && IMPERATIVE.test(c.owner_correction) ? c.owner_correction : null;
    p.candidates.push({ ...c, incident, owner_correction: owner, seam: null });
  }
  return { proposal: p, rejected };
}

// Exclusive lock. A lock older than 10 min is stale (crashed worker): removed once, then retried.
function acquireLock(lock) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); return true; } catch {}
    try { if (Date.now() - fs.statSync(lock).mtimeMs > 10 * 60 * 1000) { fs.unlinkSync(lock); continue; } } catch { continue; }
    return false;
  }
  return false;
}

module.exports = { verify, hasSignal, alert, deltaFor, acquireLock, render };
if (require.main === module) main();

function main() {
  fs.mkdirSync(path.join(STATE, 'cursors'), { recursive: true });
  const lock = path.join(STATE, 'worker.lock');
  if (!acquireLock(lock)) { log('skip: locked'); return; }
  const qf = path.join(STATE, 'queue.jsonl');
  const taken = path.join(STATE, `queue.${process.pid}.processing`);
  const requeue = entries => { if (!DRY && entries.length) fs.appendFileSync(qf, entries.map(e => JSON.stringify(e)).join('\n') + '\n'); };
  const setCursor = (id, line) => { if (!DRY) fs.writeFileSync(path.join(STATE, 'cursors', `${id}.json`), JSON.stringify({ line, ts: Date.now() })); };
  const failFile = id => path.join(STATE, `fail-${id}`);
  const failures = id => { try { return Number(fs.readFileSync(failFile(id), 'utf8')) || 0; } catch { return 0; } };
  let batch = [];
  let q = [];
  try {
    // Take the queue by rename (atomic): hooks appending meanwhile start a fresh queue.jsonl.
    // Orphans from a crashed run (queue.<pid>.processing) are folded in.
    if (!DRY) {
      try { fs.renameSync(qf, taken); } catch {}
      for (const f of fs.readdirSync(STATE)) if (/^queue\.\d+\.processing$/.test(f) && f !== path.basename(taken)) { q.push(...readJsonl(path.join(STATE, f))); fs.unlinkSync(path.join(STATE, f)); }
      q.push(...readJsonl(taken));
    } else q = readJsonl(qf);
    // One entry per session: latest transcript path, earliest queue time (since), flush if any entry says so.
    const bySession = new Map();
    for (const e of q) {
      const prev = bySession.get(e.session_id);
      bySession.set(e.session_id, { ...e, since: Math.min(e.since || e.ts || Date.now(), prev?.since ?? Infinity), flush: !!(e.flush || prev?.flush) });
    }
    if (!bySession.size) { log('nothing queued'); return; }

    const used = tokensToday();
    if (used >= DAILY_BUDGET) {
      requeue([...bySession.values()]);
      alert(`scribe: daily budget reached (${(used / 1e6).toFixed(2)}M tokens, all projects) — ${bySession.size} session delta(s) pending, processed tomorrow`);
      log(`budget reached ${used}`); return;
    }

    // Collect the deltas worth a model call.
    const waiting = []; let root = null;
    for (const e of bySession.values()) {
      root = root || e.cwd;
      const d = deltaFor(e.transcript_path, path.join(STATE, 'cursors', `${e.session_id}.json`));
      if (!d) { log(`${e.session_id}: no transcript or nothing new`); continue; }
      if (!d.text) { setCursor(e.session_id, d.line); log(`${e.session_id}: no signal → cursor ${d.line}`); if (d.partial) waiting.push({ ...e, flush: true }); continue; }
      const limit = sessionBudget(e.session_id);
      if (tokensForSession(e.session_id) >= limit) {
        // Hold, never drop: cursor stays, the delta is re-queued; the owner raises the budget by writing a number into budget-<id>.
        waiting.push(e);
        const mark = path.join(STATE, `budget-${e.session_id}`);
        if (!fs.existsSync(mark)) { fs.writeFileSync(mark, ''); alert(`scribe: session ${e.session_id.slice(0, 8)} over its token budget (${(limit / 1e3) | 0}k) — delta HELD, not lost. To resume, write a higher budget (e.g. 600000) into ~/.claude/scribe/${slug}/budget-${e.session_id}`); }
        log(`${e.session_id}: session budget reached, delta held`); continue;
      }
      if (d.text.length < MIN_DELTA_CHARS && !e.flush && Date.now() - e.since < MAX_WAIT_MS) { waiting.push(e); log(`${e.session_id}: ${d.text.length} chars, waiting`); continue; }
      batch.push({ e, d });
    }
    requeue(waiting);
    if (!batch.length) { fs.writeFileSync(path.join(STATE, 'last-run'), String(Date.now())); return; }

    // One call for the whole project. If the per-run cap forces a cut, the cut delta is re-read next run (cursor = cut line).
    const per = Math.floor(MAX_PROMPT_DELTA / batch.length);
    for (const b of batch) if (b.d.text.length > per) { b.d = deltaFor(b.e.transcript_path, path.join(STATE, 'cursors', `${b.e.session_id}.json`), per) || b.d; }
    const delta = batch.map(({ e, d }) => `=== SESSION ${e.session_id} ===\n${d.text}`).join('\n');
    const wss = workspaces(root);
    const t0 = Date.now();
    const res = runModel(root, PROMPT(root, wss, memorySnapshot(root, wss, delta), delta));
    const ids = batch.map(b => b.e.session_id);
    if (!DRY) fs.appendFileSync(path.join(STATE, 'usage.jsonl'), JSON.stringify({ date: today(), ts: Date.now(), sessions: ids, tokens: res.tokens, cost: res.cost, ms: res.ms, turns: res.turns, usage: res.usage, delta_chars: delta.length, ok: !res.error }) + '\n');
    if (res.error) throw new Error(res.error);
    const { proposal: ok, rejected } = verify(res.proposal, delta, wss);
    log(`${ids.map(i => i.slice(0, 8)).join('+')}: delta ${delta.length} chars → ${res.tokens} tokens, $${res.cost.toFixed(3)} list, ${Math.round((Date.now() - t0) / 1000)}s, ${res.turns} turn(s), ${rejected} item(s) rejected (evidence/workspace)`);
    if (DRY) { console.log(JSON.stringify(ok, null, 2)); console.log(`[dry-run] tokens=${res.tokens} cost=$${res.cost.toFixed(3)} ms=${res.ms} rejected=${rejected}`); return; }
    const done = writer.apply(root, ok);
    const errors = done.filter(d => / error: /.test(d));
    journal({ sessions: batch.map(({ e, d }) => ({ id: e.session_id, from: d.from, to: d.line, partial: d.partial })), tokens: res.tokens, rejected, applied: done, proposal: ok });
    if (errors.length) {
      // Writer failed on part of the proposal: do not acknowledge the delta. Retry next run, give up after MAX_APPLY_FAILURES.
      const giveUp = []; const retry = [];
      for (const { e, d } of batch) {
        const n = failures(e.session_id) + 1;
        if (n >= MAX_APPLY_FAILURES) { setCursor(e.session_id, d.line); try { fs.unlinkSync(failFile(e.session_id)); } catch {} giveUp.push(e.session_id.slice(0, 8)); }
        else { fs.writeFileSync(failFile(e.session_id), String(n)); retry.push({ ...e, flush: true }); }
      }
      requeue(retry);
      alert(`scribe: apply errors — ${errors.join(' · ').slice(0, 300)}${giveUp.length ? ` — gave up on ${giveUp.join(', ')} after ${MAX_APPLY_FAILURES} tries` : ' — delta kept for retry'} (see worker.log)`);
    } else {
      for (const { e, d } of batch) { setCursor(e.session_id, d.line); try { fs.unlinkSync(failFile(e.session_id)); } catch {} }
      // A cut delta has more behind it: process the remainder right away.
      requeue(batch.filter(b => b.d.partial).map(b => ({ ...b.e, flush: true })));
    }
    if (done.length) report(`scribe: ${done.join(' · ')} · ${Math.round(tokensToday() / 1000)}k tokens today`);
    else if (ok.skipped_reason) log(`skipped — ${ok.skipped_reason}`);
    log(`applied ${JSON.stringify(done)}`);
    if (!DRY) try { fs.unlinkSync(taken); } catch {}
    fs.writeFileSync(path.join(STATE, 'last-run'), String(Date.now()));
  } catch (err) {
    log(`ERROR ${err.stack || err}`);
    // Nothing acknowledged: put the whole taken queue back so the next run replays it.
    if (!DRY) { try { requeue(q); fs.unlinkSync(taken); } catch {} }
    alert(`scribe: run failed — ${String(err.message || err).slice(0, 160)} — queue kept for retry (see ~/.claude/scribe/${slug}/worker.log)`);
  } finally {
    try { fs.unlinkSync(lock); } catch {}
  }
}
