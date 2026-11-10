// scribe-writer.js — bounded, deterministic application of a scribe proposal to the memory files.
// No model call. Allowed destinations and nothing else:
//   <ws>/CONTEXT.md   ## Current state        (overwrite, evidence required)
//   DECISIONS.md      ## Facts (current)      (EXISTING key, value changed, tool-result evidence → updated in place + traced in ## Ledger)
//   DECISIONS.md      ## Proposals            (everything else the model found: new key, owner words as evidence, dated event — NOT injected,
//                                              drained by /memorise into Facts / Ledger / archive)
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

// Prepend one dated line to ## Ledger (after its leading comments). Pure: returns the new text, or null
// when the section is missing or the line is already there (digits count).
function prependLedger(text, line) {
  const body = sectionBody(text, 'Ledger');
  if (body === null) return null;
  if (body.split('\n').some(l => normFact(l) === normFact(line))) return null;
  const parts = body.replace(/^\n+/, '').split('\n');
  let i = 0; while (i < parts.length && parts[i].startsWith('<!--')) i++;
  parts.splice(i, 0, line);
  return replaceSection(text, 'Ledger', parts.join('\n'));
}
// Dated ledger line written by /memorise-validated content only (the scribe itself proposes, see applyProposal).
function applyFact(root, f) {
  if (!f.text || !f.evidence || !/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) return null;
  const text1 = String(f.text).replace(/\n/g, ' ').trim();
  if (text1.length > MAX_FACT) return `fact error: ${text1.length} chars > ${MAX_FACT}`;
  const file = path.join(root, 'DECISIONS.md');
  if (!fs.existsSync(file)) return null;
  const out = prependLedger(readText(file), `- ${f.date} — ${text1}`);
  if (out === null) return null;
  atomicWrite(file, out);
  return 'ledger +1';
}

// ## Facts (current): one line per key, upserted in place. Bounded by the number of keys, so the hook injects it
// whole; the dated ## Ledger keeps the trace of each change. Format: `- **Key**: value (since YYYY-MM-DD)`.
const normKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const FACTS_HEADER = '## Facts (current)\n<!-- One line per key, upserted by the scribe and /memorise. Injected whole at SessionStart: only what is true now. -->\n<!-- Format: `- **Key**: value (since YYYY-MM-DD)` — reuse a key when the same thing changes; a change is also logged in ## Ledger. -->\n\n';
const PROPOSALS_HEADER = '## Proposals\n<!-- Written by the memory scribe, NOT injected: what it found but may not write on its own (new key, owner statement as evidence, dated decision). -->\n<!-- /memorise drains this section: y → Facts / Ledger, n → ## Proposals archive. Format: `- [fact|log] … (date) [evidence] why: … · seen ×N` -->\n\n';
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

// The scribe's only direct write to DECISIONS.md: an EXISTING key whose value changed, proven by a tool result.
// Anything else (new key, owner words as evidence, dated event) is a proposal for /memorise.
function applyFactKV(root, f) {
  if (!f.key || !f.value || !f.evidence || !/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) return null;
  const key = String(f.key).replace(/[*\n:]/g, '').trim(), value = String(f.value).replace(/\n/g, ' ').trim();
  if (!key || key.length > 60) return null;
  if (value.length > MAX_FACT) return `fact error: ${value.length} chars > ${MAX_FACT}`;
  const file = path.join(root, 'DECISIONS.md');
  if (!fs.existsSync(file)) return null;
  const text = readText(file);
  const facts = sectionBody(text, 'Facts');
  const lines = facts === null ? [] : facts.split('\n');
  const idx = lines.findIndex(l => normKey((l.match(/^- \*\*([^*]+)\*\*:/) || [])[1]) === normKey(key));
  if (idx < 0 || !isToolId(f.evidence)) return applyProposal(root, 'fact', f);
  const m = lines[idx].match(/^- \*\*([^*]+)\*\*: (.*?)(?: \(since (\d{4}-\d{2}-\d{2})\))?$/) || [, key, '', ''];
  const shown = m[1], old = m[2].trim(), since = m[3] || '';   // first spelling of the key wins
  if (old === value) return null;                               // strict: `1.5` and `15` are different values
  if (since && f.date < since) return `fact stale: ${shown} (${f.date} < ${since})`;   // an old delta never rewinds a newer value
  lines[idx] = `- **${shown}**: ${value} (since ${f.date})`;
  // State and its trace land in ONE write: no half-updated file, and a trace too long is clipped, never dropped.
  const room = MAX_FACT - `**${shown}** changed:  → `.length;
  const trace = `- ${f.date} — **${shown}** changed: ${clip(old, Math.floor(room / 2))} → ${clip(value, Math.ceil(room / 2))}`;
  const out = prependLedger(replaceSection(text, 'Facts', lines.join('\n')), trace);
  if (out === null) return `fact error: no ## Ledger to trace the change of ${shown}`;
  atomicWrite(file, out);
  return `fact updated: ${shown}`;
}

// Proposal for /memorise: `- [fact] **Key**: value (date) [evidence] why: …` or `- [log] date — text [evidence] why: …`.
// Deduped on content; a repeat with new evidence bumps `seen ×N`. Creates ## Facts and ## Proposals above ## Ledger if needed.
function applyProposal(root, kind, f) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') ? f.date : today();
  const content = kind === 'fact'
    ? (f.key && f.value ? `**${String(f.key).replace(/[*\n:]/g, '').trim()}**: ${String(f.value).replace(/\n/g, ' ').trim()} (${date})` : null)
    : (f.text ? `${date} — ${String(f.text).replace(/\n/g, ' ').trim()}` : null);
  if (!content || !f.evidence) return null;
  if (content.length > MAX_FACT + 40) return `proposal error: ${content.length} chars`;
  const file = path.join(root, 'DECISIONS.md');
  if (!fs.existsSync(file)) return null;
  let text = readText(file);
  text = ensureSection(text, 'Facts', FACTS_HEADER, /^## Ledger/m);
  text = text && ensureSection(text, 'Proposals', PROPOSALS_HEADER, /^## Ledger/m);
  if (!text) return null;
  const ev = clip(String(f.evidence).replace(/[\[\]\n]/g, ' ').trim(), 80);
  const why = f.why ? ` why: ${clip(String(f.why).replace(/\n/g, ' ').trim(), 160)}` : '';
  const lines = sectionBody(text, 'Proposals').split('\n');
  const idx = lines.findIndex(l => l.startsWith(`- [${kind}] `) && normFact(l.slice(0, l.indexOf(' [', 9) > 0 ? l.indexOf(' [', 9) : undefined).replace(/^- \[\w+\] /, '')) === normFact(content));
  if (idx >= 0) {
    if (lines[idx].includes(ev)) return null;                              // same evidence restated
    const n = Number((lines[idx].match(/ · seen ×(\d+)$/) || [, 1])[1]) + 1;
    lines[idx] = lines[idx].replace(/ · seen ×\d+$/, '').replace(/\]( why: |$)/, `, ${ev}]$1`) + ` · seen ×${n}`;   // evidence accumulates in the bracket
    atomicWrite(file, replaceSection(text, 'Proposals', lines.join('\n')));
    return `proposal ×${n}`;
  }
  atomicWrite(file, appendTo(text, 'Proposals', `- [${kind}] ${content} [${ev}]${why}`));
  return `+1 proposal (${kind})`;
}

// Backlog for the alert surfaces: proposals in DECISIONS.md + candidates in every LEARNINGS.md, and the oldest date seen.
function countPending(root, wss = []) {
  const count = (file, heading) => {
    if (!fs.existsSync(file)) return [];
    const b = sectionBody(fs.readFileSync(file, 'utf8'), heading) || '';
    return b.split('\n').filter(l => l.startsWith('- '));
  };
  const proposals = count(path.join(root, 'DECISIONS.md'), 'Proposals');
  const candidates = wss.flatMap(ws => count(path.join(root, ws, 'LEARNINGS.md'), 'Candidates'));
  const dates = [...proposals, ...candidates].flatMap(l => l.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []).sort();
  return { proposals: proposals.length, candidates: candidates.length, oldest: dates[0] || null };
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
  for (const f of proposal.facts || []) { try { const r = once(() => f.key ? applyFactKV(root, f) : applyProposal(root, 'log', f)); if (r) done.push(r); } catch (e) { done.push(`fact error: ${e.message}`); } }
  for (const f of proposal.log || []) { try { const r = once(() => applyProposal(root, 'log', f)); if (r) done.push(r); } catch (e) { done.push(`log error: ${e.message}`); } }
  for (const c of proposal.candidates || []) { try { const r = once(() => applyCandidate(root, c)); if (r) done.push(r); } catch (e) { done.push(`candidate error: ${e.message}`); } }
  return done;
}

module.exports = { apply, replaceSection, sectionBody, countPending };

if (require.main === module && process.argv.includes('--selftest')) {
  const assert = require('assert');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scribe-selftest-'));
  fs.mkdirSync(path.join(root, 'web'));
  fs.writeFileSync(path.join(root, 'web', 'CONTEXT.md'), '# web\n\nbrief\n\n<!-- END BRIEF -->\n\n## Current state\n\nUpdated: 2026-01-01. old\n\n## Thread\n\n### 2026-01-01 — x\n- y\n');
  fs.writeFileSync(path.join(root, 'DECISIONS.md'), '# D\n\n## Facts (current)\n<!-- f -->\n- **Prod host**: aaa (since 2026-01-01)\n- **Price**: 1.5 (since 2026-01-01)\n\n## Ledger (facts of record)\n<!-- c -->\n- 2026-01-01 — other\n\n## ADR archive\n\n## 2026-01-01 — x\ntext\n');
  const p = {
    state: [{ workspace: 'web', lines: ['A', 'B'], next: 'C', evidence: ['toolu_1'] }, { workspace: 'web', lines: ['NO'], evidence: [] }],
    facts: [
      { date: '2026-02-02', key: 'prod-host', value: 'bbb', evidence: 'toolu_2' },                 // existing key (other spelling) + tool id → written, traced
      { date: '2025-12-01', key: 'Prod host', value: 'zzz', evidence: 'toolu_2' },                 // older than the value in place → stale, ignored
      { date: '2026-02-02', key: 'Price', value: '15', evidence: 'toolu_2' },                      // strict equality: 1.5 ≠ 15 → written
      { date: '2026-02-02', key: 'Domain', value: 'example.org', evidence: 'toolu_2' },            // new key → proposal, not written
      { date: '2026-02-02', key: 'Prod host', value: 'ddd', evidence: 'owner said: on passe sur ddd', why: 'cheaper' },   // owner words → proposal
      { date: '2026-02-02', key: 'Long', value: 'x'.repeat(201), evidence: 'toolu_3' },            // too long → error (counted by the worker)
      { date: '2026-02-02', text: 'legacy unkeyed fact', evidence: 'toolu_3' }],                   // legacy shape → log proposal
    log: [{ date: '2026-02-03', text: 'launch decided for March', evidence: 'toolu_2', why: 'owner wants Q1' },
          { date: '2026-02-03', text: 'launch decided for March', evidence: 'toolu_7' }],          // same content, new evidence → seen ×2
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
  const facts = sectionBody(dec, 'Facts'), props = sectionBody(dec, 'Proposals'), ledger = sectionBody(dec, 'Ledger');
  assert(facts.includes('- **Prod host**: bbb (since 2026-02-02)') && !facts.includes('aaa') && facts.includes('- **Price**: 15 (since 2026-02-02)') && (facts.match(/^- /gm) || []).length === 2, 'existing keys updated in place, first spelling kept, no new key written: ' + facts);
  assert(ledger.indexOf('- 2026-02-02 — **Prod host** changed: aaa → bbb') < ledger.indexOf('- 2026-01-01 — other') && ledger.includes('**Price** changed: 1.5 → 15') && dec.includes('## ADR archive\n\n## 2026-01-01 — x\ntext'), 'changes traced in ledger, ADR intact');
  assert(done.some(d => d.startsWith('fact stale: Prod host')) && !facts.includes('zzz') && !ledger.includes('zzz'), 'older delta never rewinds a newer value');
  assert(dec.indexOf('## Facts') < dec.indexOf('## Proposals') && dec.indexOf('## Proposals') < dec.indexOf('## Ledger'), 'Proposals section created between Facts and Ledger');
  assert(props.includes('- [fact] **Domain**: example.org (2026-02-02) [toolu_2]') && props.includes('- [fact] **Prod host**: ddd (2026-02-02) [owner said: on passe sur ddd] why: cheaper') && props.includes('- [log] 2026-02-02 — legacy unkeyed fact [toolu_3]'), 'new key / owner evidence / legacy shape → proposals: ' + props);
  assert(props.includes('- [log] 2026-02-03 — launch decided for March [toolu_2, toolu_7] why: owner wants Q1 · seen ×2') && (props.match(/launch decided/g) || []).length === 1, 'same proposal with new evidence bumps ×N');
  assert(done.some(d => d.startsWith('fact error: 201 chars')) && !facts.includes('Long'), 'too long → error, not written');
  assert(!ledger.includes('launch decided') && !ledger.includes('legacy'), 'the scribe never writes log lines to the ledger itself');
  const pend = countPending(root, ['web']);
  assert(pend.proposals === 4 && pend.oldest === '2026-02-02', 'countPending: ' + JSON.stringify(pend));
  assert(/## Candidates[\s\S]*- NEVER do X \(why\) seen ×2 \(\d{4}-\d{2}-\d{2}\) \[toolu_4\] seam: a\.ts:1 \[toolu_5\]/.test(lrn), 'candidate + bump once');
  assert(/## Active Learnings[\s\S]*- ALWAYS do Y \(because\) ×1 \(owner [\d-]+: « non, toujours Y »\)/.test(lrn), 'owner correction → Active');
  assert(!lrn.includes('maybe do Z'), 'bad format ignored');
  assert(!lrn.includes('traversal') && !fs.existsSync(path.join(root, '_private')) && !fs.existsSync(path.join(path.dirname(root), 'web')), 'unsafe workspaces refused');
  assert(/- ALWAYS do X \(why\) seen ×1/.test(lrn) && /- NEVER do X \(why\) seen ×2/.test(lrn), 'opposite polarity is a separate rule');
  const rounds = apply(root, p);
  assert(rounds.filter(d => d.includes('candidate') || d.includes('bumped') || d.includes('ledger') || d.includes('proposal') || d.startsWith('fact updated')).length === 0, 'idempotent on re-apply: ' + JSON.stringify(rounds));
  const dec2 = fs.readFileSync(path.join(root, 'DECISIONS.md'), 'utf8');
  assert(dec2 === dec, 'DECISIONS.md byte-identical after replay');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('selftest OK:', done.join(' · '));
}
