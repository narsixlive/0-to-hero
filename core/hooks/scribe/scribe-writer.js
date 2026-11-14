// scribe-writer.js — bounded, deterministic application of a scribe proposal to the memory files.
// No model call. Allowed destinations and nothing else:
//   <ws>/CONTEXT.md   ## Current state        (one block per session, the session's own block replaced; others kept 7 days)
//   JOURNAL.md        one block per session    (summary lines + dated events; the block is re-written at every run of that session;
//                                              newest first; the 3 newest are injected at SessionStart by inject-journal.sh)
//   DECISIONS.md      ## Facts (current)      (NEVER overwritten by the scribe: a changed value marks the line `⚠ disputed → new`
//                                              and queues a proposal; the owner settles it)
//   DECISIONS.md      ## Proposals            (new key, changed value, fix hypothesis — NOT injected, drained by /memorise)
//   <ws>/LEARNINGS.md ## Candidates           (append; NOT injected; no counter: evidence ids accumulate) — or ## Active Learnings
//                                              when the owner's own correction is quoted (owner_correction)
//   expire(): candidates untouched 30 days → ## Archived Learnings (expired); proposals 60 days → ## Proposals archive;
//             a line already tagged (declined …)/(done …) and a leftover [log] proposal are moved to the archive too.
// Never: AGENT.md, CLAUDE.md, ## Thread, ## Ledger, anything under _private/. Atomic: temp file + rename.
//
// Run `node scribe-writer.js --selftest` for the one runnable check.

const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_FACT = 200;
const today = () => new Date().toISOString().slice(0, 10);

// Read-modify-write race with the session (an Edit by /memorise between our read and our rename
// would be lost): remember the mtime at read, refuse the write if the file moved, apply() retries once.
const readAt = new Map();
function readText(file) {
  readAt.set(file, fs.statSync(file).mtimeMs);
  return fs.readFileSync(file, 'utf8');
}
class RaceError extends Error { constructor(file) { super(`${path.basename(file)} changed under us`); this.race = true; } }
function atomicWrite(file, text) {
  if (readAt.has(file) && fs.existsSync(file) && fs.statSync(file).mtimeMs !== readAt.get(file)) throw new RaceError(file);
  const tmp = file + '.scribe-tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
  readAt.delete(file);
}

// Replace the body of `## <heading>` (up to the next "## " or EOF). Returns null if the heading is absent.
function replaceSection(text, heading, body) {
  const re = new RegExp(`(^## ${heading}[^\\n]*\\n)([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm');
  if (!re.test(text)) return null;
  return text.replace(re, (_, h) => h + body.replace(/\s*$/, '') + '\n\n');
}
function sectionBody(text, heading) {
  const m = text.match(new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return m ? m[1] : null;
}
// Rule normalisation drops the ×N counter and dates; fact normalisation keeps digits (a changed number is a different fact).
const norm = s => s.toLowerCase().replace(/\s+/g, ' ').replace(/[`«»"'().,;:×x0-9]/g, '').trim();
const normFact = s => s.toLowerCase().replace(/\s+/g, ' ').replace(/[`«»"'().,;:]/g, '').trim();
// Destination guard: a workspace is one plain directory name, never a path, never private.
// "." = the project root itself, used only by light projects (no workspace): the worker offers "." only when none exists.
const safeWorkspace = ws => ws === '.' || (typeof ws === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ws) && !ws.startsWith('_') && ws !== '..');
// Same rule in other words: same polarity (ALWAYS/NEVER) and ≥ 60 % of the shorter rule's content words appear in the other.
// ponytail: lexical only — a paraphrase with disjoint vocabulary still slips through; the prompt's "reuse existing wording" is the first line of defence.
const polarity = s => (String(s).trim().match(/^(ALWAYS|NEVER)\b/i) || [, ''])[1].toUpperCase();
const words = s => new Set(norm(String(s).split(/\s[×(\[]|\sseen\s/)[0]).split(' ').filter(w => w.length > 3));
function similar(a, b) {
  if (polarity(a) !== polarity(b)) return false;
  const A = words(a), B = words(b); if (A.size < 3 || B.size < 3) return false;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size) >= 0.6;
}

const STATE_KEEP_DAYS = 7;
const daysAgo = d => Math.floor((Date.now() - Date.parse(d)) / 86400000);
// ## Current state holds one block per session ("Updated: <date> (scribe, session <id8>)…"). The session being
// applied replaces its own block; blocks of other sessions younger than STATE_KEEP_DAYS stay, so two sessions working
// the same workspace in parallel do not erase each other. A block without a session tag (legacy / written by hand) is dropped.
function applyState(root, s, sessions = []) {
  if (!safeWorkspace(s.workspace) || !Array.isArray(s.lines) || !s.lines.length || !Array.isArray(s.evidence) || !s.evidence.length) return null;
  const file = path.join(root, s.workspace, 'CONTEXT.md');
  // A missing destination is a LOSS, never "nothing to do": an error string blocks the cursor and reaches the alert.
  if (!fs.existsSync(file)) return `state error: ${s.workspace}/CONTEXT.md missing`;
  const text = readText(file);
  const old = sectionBody(text, 'Current state');
  if (old === null) return `state error: no ## Current state in ${s.workspace}/CONTEXT.md`;
  const tag = sessions.map(i => String(i).slice(0, 8)).join('+') || 'manual';
  const lines = s.lines.slice(0, 5).map(l => String(l).replace(/\n/g, ' ').trim()).filter(Boolean);
  const mine = `Updated: ${today()} (scribe, session ${tag}). ${lines.join('\n')}${s.next ? `\nNext: ${String(s.next).replace(/\n/g, ' ').trim()}` : ''}`;
  const kept = old.split(/\n(?=Updated: )/).map(b => b.trim()).filter(b => {
    const m = b.match(/^Updated: (\d{4}-\d{2}-\d{2}) \(scribe, session ([^)]+)\)/);
    return m && m[2] !== tag && daysAgo(m[1]) < STATE_KEEP_DAYS;
  });
  atomicWrite(file, replaceSection(text, 'Current state', `\n${[mine, ...kept].join('\n\n')}\n`));
  return `${s.workspace} state updated`;
}

// JOURNAL.md — the project's history as the scribe saw it: one block per session, newest first, re-written at every run
// of that session (so a missed SessionEnd never loses the summary; the block just stops growing). Events ("log" items:
// decisions, irreversible things) are listed under the block. Never trimmed here: inject-journal.sh reads the 3 newest.
const JOURNAL_HEADER = '# Journal\n<!-- Written by the memory scribe: one block per session, newest first (summary, next step, dated events with evidence ids). -->\n<!-- The 3 newest blocks are injected at SessionStart. History, not instructions: a line here is what happened, not what to do. -->\n\n';
function applyJournal(root, j, sessions = [], events = []) {
  const did = (Array.isArray(j?.did) ? j.did : []).slice(0, 4).map(l => clip(String(l).replace(/\n/g, ' ').trim(), 220)).filter(Boolean);
  const evs = events.map(e => `- ${/^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : today()} — ${clip(String(e.text || '').replace(/\n/g, ' ').trim(), MAX_FACT)} [${clip(String(e.evidence || '').replace(/[\[\]\n]/g, ' ').trim(), 80)}]${e.why ? ` why: ${clip(String(e.why).replace(/\n/g, ' ').trim(), 160)}` : ''}`).filter(l => !l.includes('—  ['));
  if (!did.length && !evs.length) return null;
  const tag = sessions.map(i => String(i).slice(0, 8)).join('+') || 'manual';
  const file = path.join(root, 'JOURNAL.md');
  let text = fs.existsSync(file) ? readText(file) : JOURNAL_HEADER;
  const head = `### ${today()} — session ${tag}`;
  // Blocks start at "### "; the one of this session (any date) is replaced, so a re-run restates rather than duplicates.
  const blocks = text.split(/\n(?=### )/);
  const header = blocks.shift();
  const rest = blocks.filter(b => !b.startsWith(`### `) || !new RegExp(`^### \\d{4}-\\d{2}-\\d{2} — session ${tag.replace(/[+]/g, '\\+')}(\\n|$)`).test(b));
  const prev = blocks.find(b => new RegExp(`^### \\d{4}-\\d{2}-\\d{2} — session ${tag.replace(/[+]/g, '\\+')}(\\n|$)`).test(b)) || '';
  // Events accumulate across the runs of one session (they are dated facts); summary lines are replaced (they restate).
  const oldEvents = prev.split('\n').filter(l => /^- \d{4}-\d{2}-\d{2} — /.test(l) && !evs.some(e => normFact(e) === normFact(l)));
  const block = [head, ...did.map(l => `- ${l}`), ...(j?.next ? [`- Next: ${clip(String(j.next).replace(/\n/g, ' ').trim(), 220)}`] : []), ...oldEvents, ...evs].join('\n');
  atomicWrite(file, [header.replace(/\s*$/, ''), block, ...rest.map(b => b.replace(/\s*$/, ''))].join('\n\n') + '\n');
  return `journal ${prev ? 'updated' : '+1 block'}`;
}

// ## Facts (current): one line per key, written by the owner (/memorise). Bounded by the number of keys, so the hook
// injects it whole. Format: `- **Key**: value (since YYYY-MM-DD)`; a scribe-detected change adds ` ⚠ disputed → new (date)`.
const normKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const FACTS_HEADER = '## Facts (current)\n<!-- One line per key, written by /memorise. Injected whole at SessionStart: only what is true now. -->\n<!-- Format: `- **Key**: value (since YYYY-MM-DD)` — reuse a key when the same thing changes. The scribe never overwrites a value: it marks the line `⚠ disputed → new (date)` and queues a proposal. -->\n\n';
const PROPOSALS_HEADER = '## Proposals\n<!-- Written by the memory scribe, NOT injected: a new Facts key, a changed value (the Facts line is marked ⚠ disputed), or a [fix] hypothesis. -->\n<!-- /memorise drains this section: y → Facts, n → ## Proposals archive; unreviewed 60 days → archive. Format: `- [fact|fix] … (date) [evidence] why: …` -->\n\n';
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const isToolId = s => /^toolu_[A-Za-z0-9_-]+$/.test(String(s || ''));
// Insert `header` (a "## X" section) right before the first heading matching `beforeRe`, unless section `heading` exists.
function ensureSection(text, heading, header, beforeRe) {
  if (sectionBody(text, heading) !== null) return text;
  return beforeRe.test(text) ? text.replace(beforeRe, m => header + m) : null;
}
// Append one line at the end of a section (before trailing blanks).
function appendTo(text, heading, line) {
  const lines = sectionBody(text, heading).split('\n');
  let i = lines.length; while (i > 0 && !lines[i - 1].trim()) i--;
  lines.splice(i, 0, line);
  return replaceSection(text, heading, lines.join('\n'));
}

// Facts are never overwritten by the scribe (Mem0 v3 lesson: automatic UPDATE by a small extractor fails silently, and
// Facts are injected everywhere). A changed value on an EXISTING key: the line gets a `⚠ disputed → new (date)` suffix
// (so every session sees the doubt and both values) and a proposal is queued; the owner settles it in /memorise.
// A new key, or any non-tool evidence, is a proposal only.
const DISPUTE = /\s*⚠ disputed → .*$/;
function applyFactKV(root, f) {
  if (!f.key || !f.value || !f.evidence || !/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) return null;
  const key = String(f.key).replace(/[*\n:]/g, '').trim(), value = clip(String(f.value).replace(/\n/g, ' ').trim(), MAX_FACT);
  if (!key || key.length > 60) return null;
  const file = path.join(root, 'DECISIONS.md');
  if (!fs.existsSync(file)) return 'fact error: DECISIONS.md missing';
  const text = readText(file);
  const lines = (sectionBody(text, 'Facts') || '').split('\n');
  const idx = lines.findIndex(l => normKey((l.match(/^- \*\*([^*]+)\*\*:/) || [])[1]) === normKey(key));
  if (idx < 0 || !isToolId(f.evidence)) return applyProposal(root, 'fact', f);
  const current = lines[idx].replace(DISPUTE, '');
  const old = (current.match(/^- \*\*[^*]+\*\*: (.*?)(?: \(since \d{4}-\d{2}-\d{2}\))?$/) || [, ''])[1].trim();
  if (old === value) return null;                               // strict: `1.5` and `15` are different values
  const queued = applyProposal(root, 'fact', f);                // proposal first (same file, re-read below)
  if (queued === false) return null;                            // the owner already declined this very value: no new dispute
  const text2 = readText(file);
  const lines2 = (sectionBody(text2, 'Facts') || '').split('\n');
  const marked = `${current} ⚠ disputed → ${clip(value, 120)} (${f.date})`;
  if (lines2[idx] === marked) return queued;
  lines2[idx] = marked;
  atomicWrite(file, replaceSection(text2, 'Facts', lines2.join('\n')));
  return `fact disputed: ${key}`;
}

// Proposal for /memorise: `- [fact] **Key**: value (date) [evidence] why: …`, `- [fix] text [evidence]` (a hypothesis
// that a code/hook/test change would make a rule unnecessary — never applied by the scribe), or a legacy `- [log] …`.
// Deduped on content; a repeat with new evidence adds the id to the bracket (no counter: repetition is not authority).
// Creates ## Facts and ## Proposals above ## Ledger if needed.
function applyProposal(root, kind, f) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') ? f.date : today();
  // Over-long text is clipped, not refused: a proposal is reviewed by the owner anyway and its evidence id
  // leads back to the full context. Refusing it made the worker re-run the delta 3× and then drop it.
  const content = kind === 'fact'
    ? (f.key && f.value ? `**${String(f.key).replace(/[*\n:]/g, '').trim()}**: ${clip(String(f.value).replace(/\n/g, ' ').trim(), MAX_FACT)} (${date})` : null)
    : kind === 'fix'
      ? (f.text ? `${f.workspace && f.workspace !== '.' ? `[${f.workspace}] ` : ''}${clip(String(f.text).replace(/\n/g, ' ').trim(), MAX_FACT)} (${date})` : null)
      : (f.text ? `${date} — ${clip(String(f.text).replace(/\n/g, ' ').trim(), MAX_FACT)}` : null);
  if (!content || !f.evidence) return null;                      // verify-filter outcome, not a loss
  const file = path.join(root, 'DECISIONS.md');
  if (!fs.existsSync(file)) return 'proposal error: DECISIONS.md missing';
  let text = readText(file);
  text = ensureSection(text, 'Facts', FACTS_HEADER, /^## Ledger/m);
  text = text && ensureSection(text, 'Proposals', PROPOSALS_HEADER, /^## Ledger/m);
  if (!text) return 'proposal error: no ## Ledger in DECISIONS.md to anchor ## Proposals';
  const ev = clip(String(f.evidence).replace(/[\[\]\n]/g, ' ').trim(), 80);
  const why = f.why ? ` why: ${clip(String(f.why).replace(/\n/g, ' ').trim(), 160)}` : '';
  const head = l => l.slice(0, l.indexOf(' [', 9) > 0 ? l.indexOf(' [', 9) : undefined).replace(/^- \[\w+\] /, '');
  // Already settled by the owner in /memorise (same content, whatever the day it is seen again): never queued twice.
  const undated = s => normFact(s.replace(/ \(\d{4}-\d{2}-\d{2}\)$/, ''));
  if ((sectionBody(text, 'Proposals archive') || '').split('\n').some(l => l.startsWith(`- [${kind}] `) && /\((declined|done|accepted|parked) \d{4}-/.test(l) && undated(head(l)) === undated(content))) return false;
  const lines = sectionBody(text, 'Proposals').split('\n');
  const idx = lines.findIndex(l => l.startsWith(`- [${kind}] `) && normFact(head(l)) === normFact(content));
  if (idx >= 0) {
    if (lines[idx].includes(ev)) return null;                              // same evidence restated
    lines[idx] = lines[idx].replace(/\]( why: |$)/, `, ${ev}]$1`);         // evidence accumulates in the bracket
    atomicWrite(file, replaceSection(text, 'Proposals', lines.join('\n')));
    return `proposal +evidence`;
  }
  atomicWrite(file, appendTo(text, 'Proposals', `- [${kind}] ${content} [${ev}]${why}`));
  return `+1 proposal (${kind})`;
}

// Deterministic hygiene, no model: a candidate nobody touched for CANDIDATE_DAYS → ## Archived Learnings "(expired)";
// a proposal older than PROPOSAL_DAYS → ## Proposals archive. Nothing is deleted, nothing injected changes.
const CANDIDATE_DAYS = 30, PROPOSAL_DAYS = 60;
const ARCHIVE_HEADER = '## Proposals archive\n<!-- Proposals the owner declined or that expired unreviewed (60 days). Kept, never injected. -->\n\n';
// A line the owner already settled in /memorise but that was tagged in place instead of moved: the decision is on the line, so move it.
const SETTLED = /\((declined|done) \d{4}-\d{2}-\d{2}[^)]*\)\s*$/;
const lineDate = l =>(l.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []).sort().pop() || null;   // newest date on the line
function expire(root, wss = []) {
  const done = [];
  for (const ws of [...new Set([...wss, '.'])]) {
    const file = path.join(root, ws, 'LEARNINGS.md');
    if (!fs.existsSync(file)) continue;
    let text = readText(file);
    const cand = sectionBody(text, 'Candidates'); if (cand === null) continue;
    const items = cand.split('\n').filter(l => l.startsWith('- '));
    const settled = items.filter(l => SETTLED.test(l));
    const stale = items.filter(l => !SETTLED.test(l) && lineDate(l) && daysAgo(lineDate(l)) >= CANDIDATE_DAYS);
    if (!settled.length && !stale.length) continue;
    text = replaceSection(text, 'Candidates', cand.split('\n').filter(l => !settled.includes(l) && !stale.includes(l)).join('\n'));
    if (sectionBody(text, 'Archived Learnings') === null) text = text.replace(/\s*$/, '') + '\n\n## Archived Learnings\n<!-- demoted / non-recurrent rules — kept, not injected -->\n';
    for (const l of settled) text = appendTo(text, 'Archived Learnings', l);
    for (const l of stale) text = appendTo(text, 'Archived Learnings', `${l} (expired ${today()})`);
    atomicWrite(file, text);
    if (settled.length) done.push(`${ws} ${settled.length} settled candidate(s) archived`);
    if (stale.length) done.push(`${ws} ${stale.length} candidate(s) expired`);
  }
  const dec = path.join(root, 'DECISIONS.md');
  if (fs.existsSync(dec)) {
    let text = readText(dec);
    const props = sectionBody(text, 'Proposals');
    const items = props === null ? [] : props.split('\n').filter(l => l.startsWith('- '));
    const settled = items.filter(l => SETTLED.test(l));
    // [log] proposals are a pre-journal leftover: /memorise has no topic for them, so they would wait forever.
    const retired = items.filter(l => !SETTLED.test(l) && l.startsWith('- [log] '));
    const stale = items.filter(l => !SETTLED.test(l) && !retired.includes(l) && lineDate(l) && daysAgo(lineDate(l)) >= PROPOSAL_DAYS);
    if (settled.length || retired.length || stale.length) {
      text = replaceSection(text, 'Proposals', props.split('\n').filter(l => !settled.includes(l) && !retired.includes(l) && !stale.includes(l)).join('\n'));
      if (sectionBody(text, 'Proposals archive') === null) text = /^## ADR archive/m.test(text) ? text.replace(/^## ADR archive/m, ARCHIVE_HEADER + '## ADR archive') : text.replace(/\s*$/, '') + '\n\n' + ARCHIVE_HEADER;
      for (const l of settled) text = appendTo(text, 'Proposals archive', l);
      for (const l of retired) text = appendTo(text, 'Proposals archive', `${l} (retired ${today()}: events live in JOURNAL.md)`);
      for (const l of stale) text = appendTo(text, 'Proposals archive', `${l} (expired ${today()})`);
      atomicWrite(dec, text);
      if (settled.length) done.push(`${settled.length} settled proposal(s) archived`);
      if (retired.length) done.push(`${retired.length} [log] proposal(s) retired`);
      if (stale.length) done.push(`${stale.length} proposal(s) expired`);
    }
  }
  return done;
}

// Backlog for the alert surfaces: proposals in DECISIONS.md + candidates in every LEARNINGS.md, and the oldest date seen.
function countPending(root, wss = []) {
  const count = (file, heading) => {
    if (!fs.existsSync(file)) return [];
    const b = sectionBody(fs.readFileSync(file, 'utf8'), heading) || '';
    return b.split('\n').filter(l => l.startsWith('- '));
  };
  const proposals = count(path.join(root, 'DECISIONS.md'), 'Proposals');
  // The root file is counted even once workspaces exist: candidates left there by the light phase still wait for /memorise.
  const candidates = [...new Set([...wss, '.'])].flatMap(ws => count(path.join(root, ws, 'LEARNINGS.md'), 'Candidates'));
  const dates = [...proposals, ...candidates].flatMap(l => l.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []).sort();
  return { proposals: proposals.length, candidates: candidates.length, oldest: dates[0] || null };
}

// Same layout as core/templates/LEARNINGS.template.md: Active → Candidates → Archived → Drift log.
const CANDIDATES_HEADER = '## Candidates\n<!-- scribe proposals, NOT injected — promoted to Active by the owner (/memorise) or by the owner\'s correction in session; unreviewed 30 days → Archived (expired) -->\n';
function ensureLearnings(file, ws) {
  if (fs.existsSync(file)) {
    let t = readText(file);
    if (!/^## Candidates/m.test(t)) {
      t = /^## Archived Learnings/m.test(t)
        ? t.replace(/^## Archived Learnings/m, CANDIDATES_HEADER + '\n## Archived Learnings')
        : t.replace(/\s*$/, '') + '\n\n' + CANDIDATES_HEADER;
      atomicWrite(file, t);
    }
    return t;
  }
  const t = `# ${ws === '.' ? path.basename(path.dirname(file)) : `${ws}/`} — Learnings\n\n## Active Learnings\n<!-- ALWAYS/NEVER [action] ([why]) (since YYYY-MM-DD) — injected at SessionStart; written only by the owner or from the owner's own correction -->\n\n${CANDIDATES_HEADER}\n## Archived Learnings\n<!-- demoted / non-recurrent rules — kept, not injected -->\n\n## Drift log\n<!-- rules ignored despite being capitalized — audit trail -->\n`;
  atomicWrite(file, t);
  return t;
}
// Line index range [start, end) of a `## heading` section, or null.
function sectionRange(lines, heading) {
  const start = lines.findIndex(l => l.startsWith(`## ${heading}`));
  if (start < 0) return null;
  let end = start + 1; while (end < lines.length && !lines[end].startsWith('## ')) end++;
  return [start, end];
}

function applyCandidate(root, c) {
  if (!safeWorkspace(c.workspace) || !c.rule || !/^(ALWAYS|NEVER)\b/.test(String(c.rule).trim()) || !c.incident) return null;
  const dir = path.join(root, c.workspace);
  if (!fs.existsSync(dir)) return `candidate error: workspace ${c.workspace}/ missing`;
  const file = path.join(dir, 'LEARNINGS.md');
  let text = ensureLearnings(file, c.workspace);
  text = readText(file);
  const rule = String(c.rule).replace(/\n/g, ' ').trim();
  const owner = c.owner_correction && String(c.owner_correction).trim().length >= 8 ? String(c.owner_correction).replace(/\n/g, ' ').trim() : null;
  // Already a rule in Active / Archived / Candidates? (Drift log lines are an audit trail, never a rule to bump.)
  const all = text.split('\n');
  const drift = sectionRange(all, 'Drift log'), cand = sectionRange(all, 'Candidates');
  const inRange = (i, r) => r && i >= r[0] && i < r[1];
  const idx = all.findIndex((l, i) => l.startsWith('- ') && !inRange(i, drift) && (norm(l).includes(norm(rule).slice(0, 60)) || similar(l.slice(2), rule)));
  if (idx >= 0 && !(owner && inRange(idx, cand))) {
    if (all[idx].includes(c.incident)) return null;              // same incident restated
    // No counter: a repeat adds its evidence id and the date it was last seen; repetition never changes a rule's authority.
    all[idx] = all[idx].replace(/ \(last seen \d{4}-\d{2}-\d{2}\)/, '') + ` [${c.incident}] (last seen ${today()})`;
    atomicWrite(file, all.join('\n'));
    return `${c.workspace} candidate +evidence`;
  }
  if (owner) {
    // The owner's own imperative is the validation → Active, quote kept as provenance.
    // A rule already queued in ## Candidates moves up: its evidence ids come along, the candidate line goes.
    let carried = '';
    if (idx >= 0) { carried = (all[idx].match(/\[toolu_[^\]]*\]/g) || []).join(' '); all.splice(idx, 1); text = all.join('\n'); }
    const body = sectionBody(text, 'Active Learnings');
    if (body === null) return `candidate error: no ## Active Learnings in ${c.workspace}/LEARNINGS.md`;
    const out = replaceSection(text, 'Active Learnings', body.replace(/\s*$/, '') + `\n- ${rule} (owner ${today()}: « ${owner} ») [${c.incident}]${carried ? ' ' + carried : ''}`);
    atomicWrite(file, out);
    return `${c.workspace} +1 ACTIVE (owner correction${carried ? ', promoted from candidates' : ''})`;
  }
  const body = sectionBody(text, 'Candidates');
  const out = replaceSection(text, 'Candidates', body.replace(/\s*$/, '') + `\n- ${rule} (${today()}) [${c.incident}]`);
  atomicWrite(file, out);
  return `${c.workspace} +1 candidate`;
}

// Each applyX re-reads its file, so a race is retried once from the fresh content.
// `sessions` = the session ids of the delta being applied (tags the state block and the journal block).
const once = fn => { try { return fn(); } catch (e) { if (!e.race) throw e; return fn(); } };
function apply(root, proposal, sessions = []) {
  const done = [];
  for (const s of proposal.state || []) { try { const r = once(() => applyState(root, s, sessions)); if (r) done.push(r); } catch (e) { done.push(`state error: ${e.message}`); } }
  for (const f of proposal.facts || []) { try { const r = once(() => f.key ? applyFactKV(root, f) : null); if (r) done.push(r); } catch (e) { done.push(`fact error: ${e.message}`); } }
  for (const f of proposal.fixes || []) { try { const r = once(() => applyProposal(root, 'fix', f)); if (r) done.push(r); } catch (e) { done.push(`fix error: ${e.message}`); } }
  // log items are dated events: they live in the journal block of the session, never in Proposals or the Ledger.
  try { const r = once(() => applyJournal(root, proposal.summary, sessions, proposal.log || [])); if (r) done.push(r); } catch (e) { done.push(`journal error: ${e.message}`); }
  for (const c of proposal.candidates || []) { try { const r = once(() => applyCandidate(root, c)); if (r) done.push(r); } catch (e) { done.push(`candidate error: ${e.message}`); } }
  return done;
}

module.exports = { apply, expire, replaceSection, sectionBody, countPending };

if (require.main === module && process.argv.includes('--selftest')) {
  const assert = require('assert');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scribe-selftest-'));
  const old = d => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
  fs.mkdirSync(path.join(root, 'web'));
  fs.writeFileSync(path.join(root, 'web', 'CONTEXT.md'), `# web\n\nbrief\n\n<!-- END BRIEF -->\n\n## Current state\n\nUpdated: ${old(1)} (scribe, session other123). parallel work\n\nUpdated: ${old(20)} (scribe, session ancient1). too old\n\nUpdated: 2026-01-01. legacy untagged\n\n## Thread\n\n### 2026-01-01 — x\n- y\n`);
  fs.writeFileSync(path.join(root, 'web', 'LEARNINGS.md'), `# web/ — Learnings\n\n## Active Learnings\n\n## Candidates\n- NEVER do OLD (why) (${old(40)}) [toolu_old]\n- ALWAYS do RECENT (why) (${old(3)}) [toolu_rec]\n\n## Archived Learnings\n\n## Drift log\n`);
  fs.writeFileSync(path.join(root, 'DECISIONS.md'), `# D\n\n## Facts (current)\n<!-- f -->\n- **Prod host**: aaa (since 2026-01-01)\n- **Price**: 1.5 (since 2026-01-01)\n\n## Proposals\n<!-- p -->\n- [fact] **Stale**: s (${old(70)}) [toolu_s]\n\n## Ledger (facts of record)\n<!-- c -->\n- 2026-01-01 — other\n\n## ADR archive\n\n## 2026-01-01 — x\ntext\n`);
  const p = {
    state: [{ workspace: 'web', lines: ['A', 'B'], next: 'C', evidence: ['toolu_1'] }, { workspace: 'web', lines: ['NO'], evidence: [] }],
    facts: [
      { date: `${old(1)}`, key: 'prod-host', value: 'bbb', evidence: 'toolu_2' },                 // existing key, new value → disputed + proposal, never overwritten
      { date: `${old(1)}`, key: 'Price', value: '1.5', evidence: 'toolu_2' },                     // same value → nothing
      { date: `${old(1)}`, key: 'Domain', value: 'example.org', evidence: 'toolu_2' },            // new key → proposal
      { date: `${old(1)}`, key: 'Prod host', value: 'ddd', evidence: 'owner said: on passe sur ddd', why: 'cheaper' },   // owner words → proposal only
    ],
    fixes: [{ workspace: 'web', text: 'guard the empty id in parse()', evidence: 'toolu_3' }, { workspace: 'web', text: 'guard the empty id in parse()', evidence: 'toolu_4' }],
    log: [{ date: `${old(1)}`, text: 'launch decided for March', evidence: 'toolu_2', why: 'owner wants Q1' }, { date: `${old(1)}`, text: 'y'.repeat(346), evidence: 'toolu_8' }],
    summary: { did: ['Shipped the guide hub', 'Fixed the byline'], next: 'deploy' },
    candidates: [
      { workspace: '../web', rule: 'NEVER escape (traversal)', incident: 'toolu_9' },            // unsafe workspace → ignored
      { workspace: '_private', rule: 'NEVER leak (private)', incident: 'toolu_9' },              // private → ignored
      { workspace: 'web', rule: 'NEVER do X (why)', incident: 'toolu_4', owner_correction: null },
      { workspace: 'web', rule: 'ALWAYS do X (why)', incident: 'toolu_8' },                       // opposite polarity → separate rule
      { workspace: 'web', rule: 'NEVER do X (why)', incident: 'toolu_5' },                        // repeat → evidence added, no counter
      { workspace: 'web', rule: 'NEVER do X (why)', incident: 'toolu_5' },                        // restated → ignored
      { workspace: 'web', rule: 'ALWAYS do Y (because)', incident: 'toolu_6', owner_correction: 'non, toujours Y' },
      { workspace: 'web', rule: 'maybe do Z', incident: 'toolu_7' },                              // bad format → ignored
    ],
  };
  const done = apply(root, p, ['abcd1234-x', 'efgh5678-y']);
  const ctx = fs.readFileSync(path.join(root, 'web', 'CONTEXT.md'), 'utf8');
  const dec = fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8');
  const lrn = fs.readFileSync(path.join(root, 'web', 'LEARNINGS.md'), 'utf8');
  const jr = fs.readFileSync(path.join(root, 'JOURNAL.md'), 'utf8');
  const state = sectionBody(ctx, 'Current state');
  assert(state.startsWith('\nUpdated: ') && state.includes('(scribe, session abcd1234+efgh5678). A\nB\nNext: C') && state.includes('session other123). parallel work'), 'own block written, parallel session kept: ' + state);
  assert(!state.includes('too old') && !state.includes('legacy untagged') && !ctx.includes('NO') && ctx.includes('### 2026-01-01 — x') && ctx.includes('<!-- END BRIEF -->'), 'old/untagged blocks dropped, no-evidence refused, thread + brief intact');
  const facts = sectionBody(dec, 'Facts'), props = sectionBody(dec, 'Proposals'), ledger = sectionBody(dec, 'Ledger');
  assert(facts.includes(`- **Prod host**: aaa (since 2026-01-01) ⚠ disputed → bbb (${old(1)})`) && facts.includes('- **Price**: 1.5 (since 2026-01-01)') && (facts.match(/^- /gm) || []).length === 2, 'value never overwritten: disputed marker, no new key: ' + facts);
  assert(ledger.trim() === '<!-- c -->\n- 2026-01-01 — other' && dec.includes('## ADR archive\n\n## 2026-01-01 — x\ntext'), 'the scribe never touches the Ledger or the ADR archive: ' + JSON.stringify(ledger));
  assert(props.includes(`- [fact] **prod-host**: bbb (${old(1)}) [toolu_2]`) && props.includes(`- [fact] **Domain**: example.org (${old(1)}) [toolu_2]`) && props.includes(`- [fact] **Prod host**: ddd (${old(1)}) [owner said: on passe sur ddd] why: cheaper`), 'changed value / new key / owner evidence → proposals: ' + props);
  assert(props.includes('- [fix] [web] guard the empty id in parse() (') && props.includes('[toolu_3, toolu_4]') && !props.includes('seen ×'), 'fix hypothesis queued once, evidence accumulates, no counter: ' + props);
  assert(!props.includes('launch decided') && !ledger.includes('launch decided'), 'log items go to the journal, not Proposals nor Ledger');
  assert(jr.startsWith('# Journal\n') && /### \d{4}-\d{2}-\d{2} — session abcd1234\+efgh5678\n- Shipped the guide hub\n- Fixed the byline\n- Next: deploy\n- \d{4}-\d{2}-\d{2} — launch decided for March \[toolu_2\] why: owner wants Q1\n- \d{4}-\d{2}-\d{2} — y{199}… \[toolu_8\]/.test(jr), 'journal block: summary, next, events (clipped): ' + jr);
  assert(/## Candidates[\s\S]*- NEVER do X \(why\) \(\d{4}-\d{2}-\d{2}\) \[toolu_4\] \[toolu_5\] \(last seen \d{4}-\d{2}-\d{2}\)/.test(lrn) && !lrn.includes('×'), 'candidate + repeat = evidence added, no counter: ' + lrn);
  assert(/## Active Learnings[\s\S]*- ALWAYS do Y \(because\) \(owner [\d-]+: « non, toujours Y »\) \[toolu_6\]/.test(lrn), 'owner correction → Active, dated');
  assert(!lrn.includes('maybe do Z') && !lrn.includes('traversal') && !fs.existsSync(path.join(root, '_private')) && !fs.existsSync(path.join(path.dirname(root), 'web')), 'bad format and unsafe workspaces refused');
  assert(/- ALWAYS do X \(why\) \(/.test(lrn) && /- NEVER do X \(why\) \(/.test(lrn), 'opposite polarity is a separate rule');
  assert(!done.some(d => / error: /.test(d)), 'no error: ' + done);
  // Second run of the same session: journal block replaced (not duplicated), events kept, new event appended.
  apply(root, { summary: { did: ['Shipped the guide hub', 'Deployed'], next: 'watch logs' }, log: [{ date: `${old(0)}`, text: 'domain bought', evidence: 'toolu_9' }] }, ['abcd1234-x', 'efgh5678-y']);
  const jr2 = fs.readFileSync(path.join(root, 'JOURNAL.md'), 'utf8');
  assert((jr2.match(/^### /gm) || []).length === 1 && jr2.includes(`- Deployed\n- Next: watch logs\n- ${old(1)} — launch decided for March`) && jr2.includes(`- ${old(0)} — domain bought [toolu_9]`) && !jr2.includes('Fixed the byline'), 'same session re-run: block replaced, events accumulate: ' + jr2);
  apply(root, { summary: { did: ['Other session work'] } }, ['zzzz9999']);
  const jr3 = fs.readFileSync(path.join(root, 'JOURNAL.md'), 'utf8');
  assert(jr3.indexOf('session zzzz9999') < jr3.indexOf('session abcd1234') && (jr3.match(/^### /gm) || []).length === 2, 'newest session first');
  // Owner correction on a rule the scribe already queued → promoted, evidence carried, candidate line gone; losses are errors.
  const done2 = apply(root, { candidates: [
    { workspace: 'web', rule: 'NEVER do X (why)', incident: 'toolu_10', owner_correction: 'non, jamais X, je te l’ai dit' },
    { workspace: 'ghost', rule: 'NEVER do G (why)', incident: 'toolu_11' },
  ], state: [{ workspace: 'ghost', lines: ['A'], evidence: ['toolu_1'] }] });
  const lrn2 = fs.readFileSync(path.join(root, 'web', 'LEARNINGS.md'), 'utf8');
  assert(/## Active Learnings[\s\S]*- NEVER do X \(why\) \(owner [\d-]+: « non, jamais X[^»]*»\) \[toolu_10\] \[toolu_4\] \[toolu_5\]/.test(lrn2) && !/## Candidates[\s\S]*NEVER do X/.test(lrn2), 'owner correction promotes an existing candidate: ' + lrn2);
  assert(done2.some(d => d === 'candidate error: workspace ghost/ missing') && done2.some(d => d === 'state error: ghost/CONTEXT.md missing'), 'missing destination is an error, not a silent drop: ' + done2);
  // Expiry: 40-day candidate archived, 3-day one kept; 70-day proposal archived, fresh ones kept.
  const ex = expire(root, ['web']);
  const lrn3 = fs.readFileSync(path.join(root, 'web', 'LEARNINGS.md'), 'utf8');
  const dec3 = fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8');
  assert(ex.includes('web 1 candidate(s) expired') && ex.includes('1 proposal(s) expired'), 'expire report: ' + ex);
  assert(!sectionBody(lrn3, 'Candidates').includes('NEVER do OLD') && /- NEVER do OLD \(why\) \([\d-]+\) \[toolu_old\] \(expired [\d-]+\)/.test(sectionBody(lrn3, 'Archived Learnings')) && sectionBody(lrn3, 'Candidates').includes('ALWAYS do RECENT'), 'old candidate archived with reason, recent kept: ' + lrn3);
  assert(!/## Proposals\n[\s\S]*?\*\*Stale\*\*[\s\S]*?## Ledger/.test(dec3) && /## Proposals archive[\s\S]*\*\*Stale\*\*: s \([\d-]+\) \[toolu_s\] \(expired [\d-]+\)/.test(dec3) && sectionBody(dec3, 'Proposals').includes('**Domain**'), 'old proposal archived below the Ledger, fresh kept: ' + dec3);
  assert(dec3.indexOf('## Proposals archive') > dec3.indexOf('## Ledger') && dec3.indexOf('## Proposals archive') < dec3.indexOf('## ADR archive'), 'archive sits between Ledger and ADR archive');
  assert.deepStrictEqual(expire(root, ['web']), [], 'expire is idempotent');
  // Settled in place by /memorise, or a leftover [log]: moved to the archive, the fresh line stays, the count drops.
  fs.writeFileSync(path.join(root, 'DECISIONS.md'), replaceSection(dec3, 'Proposals', sectionBody(dec3, 'Proposals').replace(/\s*$/, '') + `\n- [fact] **Tagged**: t (${old(1)}) [toolu_t] (declined ${old(0)})\n- [log] ${old(1)} — leftover event [toolu_l]\n`));
  fs.writeFileSync(path.join(root, 'web', 'LEARNINGS.md'), replaceSection(lrn3, 'Candidates', sectionBody(lrn3, 'Candidates').replace(/\s*$/, '') + `\n- NEVER do TAGGED (why) (${old(1)}) [toolu_c] (declined ${old(0)})\n`));
  const before4 = countPending(root, ['web']);
  const ex4 = expire(root, ['web']);
  const dec4 = fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8'), lrn4 = fs.readFileSync(path.join(root, 'web', 'LEARNINGS.md'), 'utf8');
  assert(ex4.includes('1 settled proposal(s) archived') && ex4.includes('1 [log] proposal(s) retired') && ex4.includes('web 1 settled candidate(s) archived'), 'settled report: ' + ex4);
  assert(!/Tagged|leftover/.test(sectionBody(dec4, 'Proposals')) && /\*\*Tagged\*\*: t .*\(declined [\d-]+\)\n/.test(sectionBody(dec4, 'Proposals archive')) && /leftover event \[toolu_l\] \(retired /.test(sectionBody(dec4, 'Proposals archive')) && sectionBody(dec4, 'Proposals').includes('**Domain**'), 'settled + [log] proposals moved, fresh kept: ' + dec4);
  assert(!sectionBody(lrn4, 'Candidates').includes('TAGGED') && sectionBody(lrn4, 'Archived Learnings').includes('NEVER do TAGGED') && sectionBody(lrn4, 'Candidates').includes('ALWAYS do RECENT'), 'settled candidate moved, recent kept: ' + lrn4);
  const after4 = countPending(root, ['web']);
  assert(after4.proposals === before4.proposals - 2 && after4.candidates === before4.candidates - 1, 'inbox count drops by the moved lines');
  // A fact the owner declined is not queued again when the scribe sees it another day; a different value still is.
  assert(applyFactKV(root, { date: old(0), key: 'Tagged', value: 't', evidence: 'toolu_again' }) === false && !sectionBody(fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8'), 'Proposals').includes('Tagged'), 'declined fact stays declined');
  assert(applyFactKV(root, { date: old(0), key: 'Tagged', value: 'other', evidence: 'toolu_again' }) === '+1 proposal (fact)', 'a new value of a declined key is a new proposal');
  // Replay of the first proposal: nothing new written (evidence restated), files byte-identical.
  const before = fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8');
  const rounds = apply(root, p, ['abcd1234-x', 'efgh5678-y']);
  assert(rounds.filter(d => !/state updated|journal/.test(d)).length === 0, 'idempotent on re-apply: ' + JSON.stringify(rounds));
  assert(fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8') === before, 'DECISIONS.md byte-identical after replay');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('selftest OK:', done.join(' · '));
}
