// scribe-writer.js — bounded, deterministic application of a scribe proposal to the memory files.
// No model call. Allowed destinations and nothing else:
//   <ws>/CONTEXT.md   ## Current state        (overwrite, evidence required)
//   DECISIONS.md      ## Ledger               (prepend one-liner ≤ 200 chars, evidence required)
//   <ws>/LEARNINGS.md ## Candidates           (append; NOT injected) — or ## Active Learnings ×1 when
//                                              the owner's own correction is quoted (owner_correction)
// Never: AGENT.md, CLAUDE.md, ## Thread, anything under _private/. Atomic: temp file + rename.
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
const safeWorkspace = ws => typeof ws === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ws) && !ws.startsWith('_') && ws !== '.' && ws !== '..';
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

function applyState(root, s) {
  if (!safeWorkspace(s.workspace) || !Array.isArray(s.lines) || !s.lines.length || !Array.isArray(s.evidence) || !s.evidence.length) return null;
  const file = path.join(root, s.workspace, 'CONTEXT.md');
  if (!fs.existsSync(file)) return null;
  const text = readText(file);
  const lines = s.lines.slice(0, 5).map(l => String(l).replace(/\n/g, ' ').trim()).filter(Boolean);
  const body = `\nUpdated: ${today()} (scribe). ${lines.join('\n')}${s.next ? `\nNext: ${String(s.next).replace(/\n/g, ' ').trim()}` : ''}\n`;
  const out = replaceSection(text, 'Current state', body);
  if (!out) return null;
  atomicWrite(file, out);
  return `${s.workspace} state updated`;
}

function applyFact(root, f) {
  if (!f.text || !f.evidence || !/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) return null;
  const text1 = String(f.text).replace(/\n/g, ' ').trim();
  if (text1.length > MAX_FACT) return `fact rejected (${text1.length} chars > ${MAX_FACT})`;
  const file = path.join(root, 'DECISIONS.md');
  if (!fs.existsSync(file)) return null;
  const text = readText(file);
  const body = sectionBody(text, 'Ledger');
  if (body === null) return null;
  const line = `- ${f.date} — ${text1}`;
  if (body.split('\n').some(l => normFact(l) === normFact(line))) return null; // already there (digits count)
  // Supersession: a fact that starts with the same **key** (e.g. "**Prod = ") marks the previous one.
  const key = (text1.match(/^\*\*[^*=]+=/) || [null])[0];
  let newBody = body;
  if (key) {
    newBody = newBody.split('\n').map(l => (l.startsWith('- ') && l.includes(key) && !l.includes('(superseded')) ? `${l} (superseded ${f.date})` : l).join('\n');
  }
  // keep the leading HTML comment line(s) first, then the new entry
  const parts = newBody.replace(/^\n+/, '').split('\n');
  let i = 0; while (i < parts.length && parts[i].startsWith('<!--')) i++;
  parts.splice(i, 0, line);
  const out = replaceSection(text, 'Ledger', parts.join('\n'));
  atomicWrite(file, out);
  return 'ledger +1';
}

function ensureLearnings(file, ws) {
  if (fs.existsSync(file)) {
    let t = readText(file);
    if (!/^## Candidates/m.test(t)) {
      t = t.replace(/\s*$/, '') + '\n\n## Candidates\n<!-- scribe proposals, NOT injected — validated in session (y / n / fix) or by /memorise -->\n';
      atomicWrite(file, t);
    }
    return t;
  }
  const t = `# ${ws}/ — Learnings\n\n## Active Learnings\n<!-- ALWAYS/NEVER [action] ([why]) ×N — injected at SessionStart -->\n\n## Archived Learnings\n<!-- demoted / non-recurrent rules — kept, not injected -->\n\n## Drift log\n<!-- rules ignored despite being capitalized — audit trail -->\n\n## Candidates\n<!-- scribe proposals, NOT injected — validated in session (y / n / fix) or by /memorise -->\n`;
  atomicWrite(file, t);
  return t;
}

function applyCandidate(root, c) {
  if (!safeWorkspace(c.workspace) || !c.rule || !/^(ALWAYS|NEVER)\b/.test(String(c.rule).trim()) || !c.incident) return null;
  const dir = path.join(root, c.workspace);
  if (!fs.existsSync(dir)) return null;
  const file = path.join(dir, 'LEARNINGS.md');
  let text = ensureLearnings(file, c.workspace);
  text = readText(file);
  const rule = String(c.rule).replace(/\n/g, ' ').trim();
  // Already a rule anywhere in the file (Active / Archived / Candidates)? → bump only if the incident is new.
  const all = text.split('\n');
  const idx = all.findIndex(l => l.startsWith('- ') && (norm(l).includes(norm(rule).slice(0, 60)) || similar(l.slice(2), rule)));
  if (idx >= 0) {
    if (all[idx].includes(c.incident)) return null;              // same incident restated
    all[idx] = all[idx].replace(/×(\d+)/, (_, n) => `×${Number(n) + 1}`) + ` [${c.incident}]`;
    atomicWrite(file, all.join('\n'));
    return `${c.workspace} ×N bumped`;
  }
  const owner = c.owner_correction && String(c.owner_correction).trim().length >= 8 ? String(c.owner_correction).replace(/\n/g, ' ').trim() : null;
  const seam = c.seam ? ` seam: ${c.seam}` : '';
  if (owner) {
    // The owner's own imperative is the validation → Active ×1, quote kept as provenance.
    const body = sectionBody(text, 'Active Learnings');
    if (body === null) return null;
    const out = replaceSection(text, 'Active Learnings', body.replace(/\s*$/, '') + `\n- ${rule} ×1 (owner ${today()}: « ${owner} ») [${c.incident}]`);
    atomicWrite(file, out);
    return `${c.workspace} +1 ACTIVE (owner correction)`;
  }
  const body = sectionBody(text, 'Candidates');
  const out = replaceSection(text, 'Candidates', body.replace(/\s*$/, '') + `\n- ${rule} seen ×1 (${today()}) [${c.incident}]${seam}`);
  atomicWrite(file, out);
  return `${c.workspace} +1 candidate`;
}

// Each applyX re-reads its file, so a race is retried once from the fresh content.
const once = fn => { try { return fn(); } catch (e) { if (!e.race) throw e; return fn(); } };
function apply(root, proposal) {
  const done = [];
  for (const s of proposal.state || []) { try { const r = once(() => applyState(root, s)); if (r) done.push(r); } catch (e) { done.push(`state error: ${e.message}`); } }
  for (const f of proposal.facts || []) { try { const r = once(() => applyFact(root, f)); if (r) done.push(r); } catch (e) { done.push(`fact error: ${e.message}`); } }
  for (const c of proposal.candidates || []) { try { const r = once(() => applyCandidate(root, c)); if (r) done.push(r); } catch (e) { done.push(`candidate error: ${e.message}`); } }
  return done;
}

module.exports = { apply, replaceSection, sectionBody };

if (require.main === module && process.argv.includes('--selftest')) {
  const assert = require('assert');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scribe-selftest-'));
  fs.mkdirSync(path.join(root, 'web'));
  fs.writeFileSync(path.join(root, 'web', 'CONTEXT.md'), '# web\n\nbrief\n\n<!-- END BRIEF -->\n\n## Current state\n\nUpdated: 2026-01-01. old\n\n## Thread\n\n### 2026-01-01 — x\n- y\n');
  fs.writeFileSync(path.join(root, 'DECISIONS.md'), '# D\n\n## Ledger (facts of record)\n<!-- c -->\n- 2026-01-01 — **Prod = `aaa`**: old\n- 2026-01-01 — other\n\n## ADR archive\n\n## 2026-01-01 — x\ntext\n');
  const p = {
    state: [{ workspace: 'web', lines: ['A', 'B'], next: 'C', evidence: ['toolu_1'] }, { workspace: 'web', lines: ['NO'], evidence: [] }],
    facts: [{ date: '2026-02-02', text: '**Prod = `bbb`**: new', evidence: 'toolu_2' }, { date: '2026-02-02', text: 'x'.repeat(201), evidence: 'toolu_3' },
      { date: '2026-02-02', text: 'retry 3 times', evidence: 'toolu_3' }, { date: '2026-02-02', text: 'retry 5 times', evidence: 'toolu_3' }],   // digits differ → two facts
    candidates: [
      { workspace: '../web', rule: 'NEVER escape (traversal)', incident: 'toolu_9' },            // unsafe workspace → ignored
      { workspace: '_private', rule: 'NEVER leak (private)', incident: 'toolu_9' },              // private → ignored
      { workspace: 'web', rule: 'NEVER do X (why)', incident: 'toolu_4', owner_correction: null, seam: 'a.ts:1' },
      { workspace: 'web', rule: 'ALWAYS do X (why)', incident: 'toolu_8' },                       // opposite polarity → separate rule, not a bump
      { workspace: 'web', rule: 'NEVER do X (why)', incident: 'toolu_5' },           // new incident → bump
      { workspace: 'web', rule: 'NEVER do X (why)', incident: 'toolu_5' },           // restated → ignored
      { workspace: 'web', rule: 'ALWAYS do Y (because)', incident: 'toolu_6', owner_correction: 'non, toujours Y' },
      { workspace: 'web', rule: 'maybe do Z', incident: 'toolu_7' },                 // bad format → ignored
    ],
  };
  const done = apply(root, p);
  const ctx = fs.readFileSync(path.join(root, 'web', 'CONTEXT.md'), 'utf8');
  const dec = fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8');
  const lrn = fs.readFileSync(path.join(root, 'web', 'LEARNINGS.md'), 'utf8');
  assert(ctx.includes('(scribe). A\nB\nNext: C') && ctx.includes('### 2026-01-01 — x') && ctx.includes('<!-- END BRIEF -->'), 'state + thread + brief');
  assert(!ctx.includes('NO'), 'state without evidence refused');
  assert(dec.indexOf('- 2026-02-02 — **Prod = `bbb`**') < dec.indexOf('- 2026-01-01 — **Prod = `aaa`**') && dec.includes('(superseded 2026-02-02)') && dec.includes('## ADR archive\n\n## 2026-01-01 — x\ntext'), 'ledger prepend + supersede + ADR intact');
  assert(done.some(d => d.includes('fact rejected')), 'long fact rejected');
  assert(/## Candidates[\s\S]*- NEVER do X \(why\) seen ×2 \(\d{4}-\d{2}-\d{2}\) \[toolu_4\] seam: a\.ts:1 \[toolu_5\]/.test(lrn), 'candidate + bump once');
  assert(/## Active Learnings[\s\S]*- ALWAYS do Y \(because\) ×1 \(owner [\d-]+: « non, toujours Y »\)/.test(lrn), 'owner correction → Active');
  assert(!lrn.includes('maybe do Z'), 'bad format ignored');
  assert(!lrn.includes('traversal') && !fs.existsSync(path.join(root, '_private')) && !fs.existsSync(path.join(path.dirname(root), 'web')), 'unsafe workspaces refused');
  assert(/- ALWAYS do X \(why\) seen ×1/.test(lrn) && /- NEVER do X \(why\) seen ×2/.test(lrn), 'opposite polarity is a separate rule');
  assert(dec.includes('retry 3 times') && dec.includes('retry 5 times'), 'facts differing by a number are both kept');
  const rounds = apply(root, p);
  assert(rounds.filter(d => d.includes('candidate') || d.includes('bumped') || d.includes('ledger')).length === 0, 'idempotent on re-apply: ' + JSON.stringify(rounds));
  fs.rmSync(root, { recursive: true, force: true });
  console.log('selftest OK:', done.join(' · '));
}
