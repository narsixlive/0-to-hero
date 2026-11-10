// node scribe-worker.check.js — smallest check that fails if evidence verification, the signal
// filter, the delta cursor logic or the exclusive lock breaks. No model call.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
process.argv[2] = process.argv[2] || 'check';
const { verify, hasSignal, deltaFor, acquireLock } = require('./scribe-worker.js');

const delta = [
  'USER: on déploie en prod demain matin, c\'est décidé',
  'TOOL toolu_real1 Edit: web/app.ts',
  'RESULT toolu_real1: ok',
  'TOOL toolu_real2 Bash: npm test',
  'RESULT ERROR toolu_real2: 1 failing',
  'USER: non, ne lance jamais npm test sans build avant',
  'USER: je préfère les titres courts pour les vidéos',
].join('\n');

const { proposal, rejected } = verify({
  state: [
    { workspace: 'web', lines: ['a'], evidence: ['toolu_real1', 'toolu_FAKE'] },
    { workspace: 'web', lines: ['b'], evidence: ['toolu_FAKE'] },
    { workspace: 'web', lines: ['c'], evidence: ['toolu_real2'] },          // error result is not evidence of state
    { workspace: 'other', lines: ['d'], evidence: ['toolu_real1'] },        // unknown workspace
  ],
  facts: [
    { date: '2026-11-09', text: 'prod deploy tomorrow', evidence: 'owner said: on déploie en prod demain matin' },
    { date: '2026-11-09', text: 'invented', evidence: 'owner said: we sold the company' },
    { date: '2026-11-09', text: 'by id', evidence: 'toolu_real1' },
    { date: '2026-11-09', text: 'by failed id', evidence: 'toolu_real2' },
    { date: '2026-11-09', text: 'fake id', evidence: 'toolu_NOPE' },
    { date: '2099-01-01', text: 'dated in the future', evidence: 'toolu_real1' },
    { date: '2026-11-09', text: 'RSS shuts down 2099-01-01', evidence: 'toolu_real1' },
    { date: '2026-11-09', key: 'Prod host', value: 'hetzner', evidence: 'toolu_real1' },
    { date: '2026-11-09', key: 'Fake', value: 'x', evidence: 'toolu_NOPE' },
  ],
  log: [{ date: '2026-11-09', text: 'launch set for 2099-01-01', evidence: 'owner said: on déploie en prod demain matin' }],
  candidates: [
    { workspace: 'web', rule: 'NEVER run npm test without build (…)', incident: 'toolu_real2', owner_correction: 'ne lance jamais npm test sans build avant', seam: 'x.ts:1' },
    { workspace: 'web', rule: 'NEVER do X (…)', incident: 'toolu_real2', owner_correction: 'invented quote here', seam: null },
    { workspace: 'web', rule: 'NEVER do Y (…)', incident: 'toolu_FAKE', owner_correction: null, seam: null },
    { workspace: 'web', rule: 'ALWAYS keep video titles short (…)', incident: 'owner said: je préfère les titres courts pour les vidéos', owner_correction: 'je préfère les titres courts pour les vidéos' },
    { workspace: 'nope', rule: 'NEVER do Z (…)', incident: 'toolu_real2' },
  ],
}, delta, ['web']);

assert.strictEqual(proposal.state.length, 1, 'state needs a successful result id in a known workspace');
assert.deepStrictEqual(proposal.state[0].evidence, ['toolu_real1'], 'fake ids filtered out of evidence');
assert.deepStrictEqual(proposal.facts.map(f => `${f.key}=${f.value}`), ['Prod host=hetzner'], 'keyed facts need a successful id; fake id dropped');
assert.deepStrictEqual(proposal.log.map(f => f.text), ['prod deploy tomorrow', 'by id', 'RSS shuts down 2099-01-01 (future date: scheduled, not yet happened)', 'launch set for 2099-01-01 (future date: scheduled, not yet happened)'],'facts need a successful id or a real quote; future-dated fact dropped, future date in text tagged');
assert.strictEqual(proposal.candidates.length, 3, 'candidate with fake incident or unknown workspace dropped');
assert.strictEqual(proposal.candidates[0].owner_correction, 'ne lance jamais npm test sans build avant', 'imperative owner words kept');
assert.strictEqual(proposal.candidates[0].seam, null, 'seam always null (no file access)');
assert.strictEqual(proposal.candidates[1].owner_correction, null, 'invented quote nulled, candidate kept on its real incident');
assert.match(proposal.candidates[2].incident, /^owner \d{4}-\d{2}-\d{2}$/, 'owner quote accepted as incident (tool-free correction)');
assert.strictEqual(proposal.candidates[2].owner_correction, null, 'a preference that is not imperative does not promote to Active');
assert.strictEqual(rejected, 10);

assert.ok(!hasSignal('TOOL toolu_1 Read: a.ts\nRESULT toolu_1: content\nUSER: ok'), 'read-only turn = no signal');
assert.ok(hasSignal('TOOL toolu_1 Edit: a.ts\nRESULT toolu_1: ok'), 'write = signal');
assert.ok(hasSignal('RESULT ERROR toolu_1: boom'), 'error = signal');
assert.ok(hasSignal('USER: ' + 'x'.repeat(40)), 'long user line = signal');

// deltaFor: cut at a line boundary when over the cap, remainder left behind; trailing half-written line not consumed.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribe-check-'));
const tr = path.join(tmp, 't.jsonl'); const cur = path.join(tmp, 'c.json');
const u = text => JSON.stringify({ type: 'user', message: { content: text } });
const big = 'y'.repeat(300);
fs.writeFileSync(tr, [u('USER one ' + big), u('USER two ' + big), u('USER three ' + big), '{"type":"user","message":{"content":"half'].join('\n') + '\n');
const d1 = deltaFor(tr, cur, 700);
assert.ok(d1 && d1.partial && d1.from === 0 && d1.line === 2 && d1.text.includes('one') && d1.text.includes('two') && !d1.text.includes('three'), 'first cut after two entries: ' + JSON.stringify({ ...d1, text: undefined }));
fs.writeFileSync(cur, JSON.stringify({ line: d1.line }));
const d2 = deltaFor(tr, cur, 700);
assert.ok(d2 && !d2.partial && d2.from === 2 && d2.line === 3 && d2.text.includes('three'), 'second run takes the remainder, stops before the unfinished line: ' + JSON.stringify({ ...d2, text: undefined }));
fs.writeFileSync(cur, JSON.stringify({ line: d2.line }));
assert.strictEqual(deltaFor(tr, cur, 700), null, 'only an unfinished trailing line → nothing');

// exclusive lock
const lock = path.join(tmp, 'worker.lock');
assert.ok(acquireLock(lock), 'first lock acquired');
assert.ok(!acquireLock(lock), 'second acquisition refused while fresh');
const old = new Date(Date.now() - 11 * 60 * 1000); fs.utimesSync(lock, old, old);
assert.ok(acquireLock(lock), 'stale lock (>10 min) is taken over');
fs.rmSync(tmp, { recursive: true, force: true });
console.log('scribe-worker.check: ok');
