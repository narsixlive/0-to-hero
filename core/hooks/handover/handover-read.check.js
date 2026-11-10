#!/usr/bin/env node
// Self-check for handover-read.js: node handover-read.check.js (exit 0 = pass).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-'));
const dir = path.join(home, '.claude', 'handovers', 'D--p-q');
fs.mkdirSync(dir, { recursive: true });
const run = (source = 'clear') => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'handover-read.js')], {
    input: JSON.stringify({ source, cwd: 'D:\\p q' }),
    env: { ...process.env, USERPROFILE: home, HOME: home },
  }).toString();
  return out ? JSON.parse(out).hookSpecificOutput.additionalContext : '';
};
const block = (n) => `## Manual handover — t${n}\n\n**Status:** IN PROGRESS\n\nbody ${n}\n\n### Quick start for the next session\n- FIRST ACTION: a${n}\n`;
const compaction = '\n## Compaction — t9 (trigger: auto)\n\n- transcript: `x.jsonl`\n';
const touch = (f, ageMs) => { const t = (Date.now() - ageMs) / 1000; fs.utimesSync(f, t, t); };

// Two handover blocks, then PreCompact breadcrumbs: only the newest handover block goes in.
const a = path.join(dir, 'a.md');
fs.writeFileSync(a, `${block(1)}\n${block(2)}${compaction}`);
touch(a, 60_000);
// A newer file with breadcrumbs only is no resume point.
const b = path.join(dir, 'b.md');
fs.writeFileSync(b, compaction);

assert.strictEqual(run('compact'), '', 'only /clear injects');
let ctx = run();
assert.ok(ctx.includes('body 2') && ctx.includes('FIRST ACTION: a2'), 'newest block injected');
assert.ok(!ctx.includes('body 1'), 'earlier block left out');
assert.ok(!ctx.includes('## Compaction'), 'breadcrumbs left out');
assert.ok(ctx.includes(`Handover file: ${a} (1 earlier block, kept for /memorise)`), 'points to the file');
assert.ok(!/ground truth|FACT/.test(ctx), 'no false authority');
assert.ok(fs.existsSync(`${a}.consumed`), 'marked consumed after injection');
assert.strictEqual(run(), '', 'injected once');

// A new block after the marker is injected again.
fs.appendFileSync(a, `\n${block(3)}`);
ctx = run();
assert.ok(ctx.includes('body 3') && !ctx.includes('body 2') && ctx.includes('(2 earlier blocks'), 'new block injected');

// Older than the window: nothing.
const c = path.join(dir, 'c.md');
fs.writeFileSync(c, block(4));
touch(c, 16 * 60_000);
touch(a, 16 * 60_000);
assert.strictEqual(run(), '', 'stale handover ignored');

fs.rmSync(home, { recursive: true, force: true });
console.log('handover-read: all checks pass');
