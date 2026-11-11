// node root.check.js — smallest check that fails if project-root resolution or the light-project
// ("." workspace) path breaks. Synthetic tree in a temp dir, no model call, nothing outside it touched.
// Covers: JS (scribe-trigger) and bash (inject-learnings.sh) agree on the root; a Bash `cd` does not move
// it; light project rules land in root LEARNINGS.md and recur; first workspace hands over cleanly.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
process.argv[2] = process.argv[2] || 'check';
const { projectRoot } = require('./scribe-trigger.js');
const { verify } = require('./scribe-worker.js');
const writer = require('./scribe-writer.js');
const INJ = path.join(__dirname, '..', 'inject-learnings.sh').replace(/\\/g, '/');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'root-check-'));
const mk = (rel, files = []) => { const d = path.join(tmp, rel); fs.mkdirSync(d, { recursive: true }); for (const f of files) fs.writeFileSync(path.join(d, f), f === 'DECISIONS.md' ? '# D\n\n## Facts (current)\n\n## Proposals\n\n## Ledger (facts of record)\n- 2026-01-01 — fact\n' : '# x\n'); return d; };
// parent/                  CLAUDE.md + a child AGENT.md, no DECISIONS → NOT a project (workspace map of several projects)
// parent/full/             CLAUDE.md + DECISIONS.md + api/AGENT.md
// parent/full/api/code_py/ CLAUDE.md only (nested instructions) → belongs to full
// parent/light/            CLAUDE.md + DECISIONS.md, no workspace
// parent/other/            nothing
mk('parent', ['CLAUDE.md']); mk('parent/tool', ['AGENT.md']);
const full = mk('parent/full', ['CLAUDE.md', 'DECISIONS.md']); mk('parent/full/api', ['AGENT.md']); mk('parent/full/api/code_py', ['CLAUDE.md']);
const light = mk('parent/light', ['CLAUDE.md', 'DECISIONS.md']); mk('parent/light/src');
const other = mk('parent/other');
const norm = p => (p || '').replace(/^\/([a-z])\//i, (_, d) => d + ':/').replace(/\\/g, '/').toLowerCase().replace(/\/$/, '');
// Git Bash prints POSIX paths (/tmp/..., /c/...): convert back to Windows form before comparing.
const winPath = p => (p && process.platform === 'win32') ? spawnSync('cygpath', ['-m', p], { encoding: 'utf8' }).stdout.trim() || p : p;
const bashRoot = (projectDir, pwd) => winPath(spawnSync('bash', [INJ], { cwd: pwd, input: '{}', encoding: 'utf8',
  env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, INJECT_PRINT_ROOT: '1' } }).stdout.trim()) || null;

// 1. Root resolution, JS and bash agree.
for (const [start, want] of [[full, full], [path.join(full, 'api', 'code_py'), full], [light, light], [path.join(light, 'src'), light], [path.join(tmp, 'parent'), null], [other, null]]) {
  const js = projectRoot(start), sh = bashRoot(start, start);
  assert.strictEqual(norm(js), norm(want), `js root of ${start}`);
  assert.strictEqual(norm(sh), norm(want), `bash root of ${start}`);
}
// 2. Drift: CLAUDE_PROJECT_DIR wins over a cwd that moved into a sibling project.
assert.strictEqual(norm(bashRoot(full, light)), norm(full), 'bash: cd into a sibling does not move the root');

// 3. Light project lifecycle.
const wsOf = r => { const w = fs.readdirSync(r, { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(r, d.name, 'AGENT.md'))).map(d => d.name); return w.length ? w : ['.']; };
const run = (root, ws, rule, id) => { const { proposal, rejected } = verify({ candidates: [{ workspace: ws, rule, incident: id }] }, `TOOL ${id} Bash: x\nRESULT ${id}: ok`, wsOf(root)); return { done: writer.apply(root, proposal), rejected }; };
const L = () => fs.readFileSync(path.join(light, 'LEARNINGS.md'), 'utf8');
assert.deepStrictEqual(run(light, '.', 'NEVER push without a build (CI breaks)', 'toolu_1').done, ['. +1 candidate']);
assert.ok(/^# light — Learnings/m.test(L()), 'root LEARNINGS.md created with the project name');
run(light, '.', 'NEVER push without a build (CI breaks)', 'toolu_2');
assert.ok(/^- NEVER push without a build \(CI breaks\) \(\d{4}-\d{2}-\d{2}\) \[toolu_1\] \[toolu_2\] \(last seen \d{4}-\d{2}-\d{2}\)$/m.test(L()), 'recurrence adds evidence at the root, no counter: ' + L());
assert.strictEqual(run(light, 'src', 'ALWAYS a b c d', 'toolu_3').rejected, 1, 'light: unknown workspace rejected');
assert.strictEqual(run(light, '..', 'ALWAYS a b c d', 'toolu_4').rejected, 1, 'light: ".." rejected');
assert.strictEqual(writer.countPending(light, wsOf(light)).candidates, 1, 'inbox counts the root candidate');
fs.writeFileSync(path.join(light, 'LEARNINGS.md'), L().replace('## Active Learnings\n', '## Active Learnings\n- NEVER force-push (history loss) ×3\n'));
const inj = spawnSync('bash', [INJ], { cwd: path.join(light, 'src'), input: '{}', encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: light } }).stdout;
assert.ok(/force-push/.test(inj) && !/push without a build/.test(inj), 'injector: root Active injected, Candidates not');

// 4. First workspace: "." closes, root leftovers stay counted and injected until /memorise moves them.
mk('parent/light/src', ['AGENT.md']);
assert.strictEqual(run(light, '.', 'ALWAYS tag releases (traceability)', 'toolu_5').rejected, 1, '"." refused once a workspace exists');
assert.deepStrictEqual(run(light, 'src', 'ALWAYS tag releases (traceability)', 'toolu_6').done, ['src +1 candidate']);
assert.strictEqual(writer.countPending(light, wsOf(light)).candidates, 2, 'root leftover + src candidate both counted');

// 5. Full project: "." never accepted.
assert.strictEqual(run(full, '.', 'ALWAYS a b c d', 'toolu_7').rejected, 1, 'full project: "." rejected');
assert.ok(!fs.existsSync(path.join(full, 'LEARNINGS.md')), 'full project: no root LEARNINGS.md created');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('root.check: ok');
