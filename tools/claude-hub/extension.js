// Claude Hub — VS Code sidebar for the 0-to-Hero memory stack.
// Shows, at the top of the Explorer: Claude usage, the recent projects under one root folder, and per
// project the memory scribe state (✍ up to date / behind / running), the memory inbox (✉ N proposals
// waiting for /memorise) and a "run the scribe now" button. No model call, no network except the
// usage endpoint Claude Code itself uses. Everything is read from ~/.claude (sessions, scribe state).
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');

// Claude Code stores sessions in ~/.claude/projects/<path with every non-alnum char -> '-'>
const sessionKey = p => p.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

// Per project key: when its newest transcript was written, and which one it is.
function lastActivityByKey() {
  const map = new Map();
  const dir = path.join(CLAUDE_DIR, 'projects');
  for (const d of safeReaddir(dir)) {
    let latest = 0, transcript = null;
    for (const f of safeReaddir(path.join(dir, d))) {
      if (!f.endsWith('.jsonl')) continue;
      try { const m = fs.statSync(path.join(dir, d, f)).mtimeMs; if (m > latest) { latest = m; transcript = path.join(dir, d, f); } } catch {}
    }
    if (latest) map.set(d.toLowerCase(), { latest, transcript });
  }
  return map;
}

// Memory scribe (~/.claude/hooks/scribe): has it read the project's newest session?
// lag = transcript lines past the scribe's cursor (same count as scribe-worker). null = project not watched.
// inbox = proposals + candidates waiting for /memorise (pending.json, written by the worker after each run).
const SCRIBE_STATE = path.join(CLAUDE_DIR, 'scribe');
const SCRIBE_TRIGGER = path.join(CLAUDE_DIR, 'hooks', 'scribe', 'scribe-trigger.js');
const scribeSlug = p => p.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
function scribeState(projectPath, transcript) {
  const dirName = safeReaddir(SCRIBE_STATE).find(d => d.toLowerCase() === scribeSlug(projectPath)); // slug keeps the cwd's case on disk
  if (!dirName) return null;
  const st = path.join(SCRIBE_STATE, dirName);
  let inbox = null;
  try { inbox = JSON.parse(fs.readFileSync(path.join(st, 'pending.json'), 'utf8')); } catch {}
  if (!transcript) return { lag: null, running: false, session: null, transcript: null, inbox };
  const session = path.basename(transcript, '.jsonl');
  let cursor = 0;
  try { cursor = JSON.parse(fs.readFileSync(path.join(st, 'cursors', `${session}.json`), 'utf8')).line || 0; } catch {}
  let lag = null;
  try {
    const txt = fs.readFileSync(transcript, 'utf8'); // ponytail: full read, the hub refreshes at most every few seconds
    lag = Math.max(0, (txt.match(/\n/g) || []).length + (txt.endsWith('\n') || !txt ? 0 : 1) - cursor);
  } catch {}
  let running = false;
  try { running = Date.now() - fs.statSync(path.join(st, 'worker.lock')).mtimeMs < 600000; } catch {}
  return { lag, running, session, transcript, inbox };
}

// Flush this project's newest session through the scribe now: same stdin the SessionEnd hook gets.
function runScribe(p) {
  if (!p.scribe || !p.scribe.session) return;
  // process.execPath is VS Code itself here, not node
  const nodeExe = [path.join(process.env.ProgramFiles || 'C:/Program Files', 'nodejs', 'node.exe'), '/usr/local/bin/node', '/usr/bin/node'].find(fs.existsSync) || 'node';
  const child = require('child_process').spawn(nodeExe, [SCRIBE_TRIGGER], { cwd: p.path, stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true, detached: true });
  child.stdin.end(JSON.stringify({ session_id: p.scribe.session, transcript_path: p.scribe.transcript, cwd: p.path, hook_event_name: 'SessionEnd' }));
  child.unref();
}

// Open DECISIONS.md on its ## Proposals section: that is where /memorise will look.
async function openInbox(p) {
  const file = path.join(p.path, 'DECISIONS.md');
  if (!fs.existsSync(file)) return;
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
  const line = Math.max(0, doc.getText().split('\n').findIndex(l => /^## Proposals/.test(l)));
  await vscode.window.showTextDocument(doc, { selection: new vscode.Range(line, 0, line, 0) });
}

function safeReaddir(p) {
  try { return fs.readdirSync(p); } catch { return []; }
}

const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const hasClaudeFiles = p => fs.existsSync(path.join(p, 'CLAUDE.md')) || isDir(path.join(p, '.claude'));

// Root = claudeHub.root setting, else the parent folder of the opened workspace.
function projectsRoot() {
  const cfg = vscode.workspace.getConfiguration('claudeHub').get('root');
  if (cfg) return cfg;
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  return ws ? path.dirname(ws) : os.homedir();
}

// A folder is a project if it has CLAUDE.md/.claude or a session history; a container folder
// one level down only contributes its sub-projects.
function getProjects() {
  const root = projectsRoot();
  const activity = lastActivityByKey();
  const out = [];
  const add = (p, parent) => {
    const a = activity.get(sessionKey(p));
    const last = a?.latest || 0;
    if (last || hasClaudeFiles(p)) out.push({ name: path.basename(p), parent, path: p, last, scribe: scribeState(p, a?.transcript) });
  };
  for (const top of safeReaddir(root).filter(n => !n.startsWith('.')).map(n => path.join(root, n)).filter(isDir)) {
    add(top, '');
    for (const sub of safeReaddir(top).filter(n => !n.startsWith('.')).map(n => path.join(top, n)).filter(isDir)) {
      add(sub, path.basename(top));
    }
  }
  return out.sort((a, b) => b.last - a.last);
}

// Same endpoint Claude Code's /usage uses. The token is refreshed by Claude Code itself;
// we only read it (refreshing here would rotate the refresh token under Claude Code's feet).
async function fetchUsage() {
  const creds = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, '.credentials.json'), 'utf8')).claudeAiOauth;
  const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
    headers: { Authorization: `Bearer ${creds.accessToken}`, 'anthropic-beta': 'oauth-2025-04-20' },
  });
  if (!res.ok) {
    const e = new Error(res.status === 401 ? 'token expired, restart Claude Code' : res.status === 429 ? 'rate limited' : `HTTP ${res.status}`);
    e.retryAfter = res.status === 429 ? (+res.headers.get('retry-after') || 300) : 60;
    throw e;
  }
  return res.json();
}

// Shared by every VS Code window through a temp file: N windows still make at most one call
// per 5 minutes, and a 429 backs them all off until retryAt.
const USAGE_CACHE = path.join(os.tmpdir(), 'claude-hub-usage.json');
const MIN_INTERVAL = 300000;

async function loadUsage() {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(USAGE_CACHE, 'utf8')); } catch {}
  const now = Date.now();
  if ((cache.usage && now - cache.fetchedAt < MIN_INTERVAL) || now < (cache.retryAt || 0)) return cache;
  try {
    cache = { ...cache, usage: summarize(await fetchUsage()), fetchedAt: now, error: null, retryAt: 0 };
  } catch (e) {
    const retryAt = now + (e.retryAfter || 60) * 1000;
    cache = { ...cache, error: `${e.message}, retry at ${new Date(retryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, retryAt };
  }
  try { fs.writeFileSync(USAGE_CACHE, JSON.stringify(cache)); } catch {}
  return cache;
}

const resetIn = iso => {
  const m = Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000));
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${Math.floor(m / 1440)} d ${Math.round((m % 1440) / 60)} h`;
};

const LIMIT_NAMES = { session: 'Session (5h)', weekly_all: 'Week', weekly_scoped: 'Week' };

// Usage limits reduced to what both the status bar and the hub display.
function summarize(u) {
  return {
    limits: (u.limits || []).map(l => ({
      name: (LIMIT_NAMES[l.kind] || l.kind) + (l.scope?.model?.display_name ? ` (${l.scope.model.display_name})` : ''),
      percent: Math.round(l.percent),
      reset: resetIn(l.resets_at),
    })),
    breakdown: (u.seven_day_breakdown?.rows || []).filter(r => r.percent).map(r => `${r.display_name} ${r.percent}%`).join(' · '),
    session: Math.round(u.five_hour?.utilization ?? 0),
    week: Math.round(u.seven_day?.utilization ?? 0),
    at: new Date().toLocaleTimeString(),
  };
}

function renderStatus(item, usage, error) {
  if (!usage) {
    item.text = '$(sparkle) usage ?';
    item.tooltip = `Usage unavailable: ${error}`;
    item.backgroundColor = undefined;
    return;
  }
  item.text = `$(sparkle) 5h ${usage.session}% · 7d ${usage.week}%`;
  const worst = Math.max(usage.session, usage.week);
  item.backgroundColor = worst >= 90 ? new vscode.ThemeColor('statusBarItem.errorBackground')
    : worst >= 70 ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
  const md = new vscode.MarkdownString('**Claude usage**\n\n');
  for (const l of usage.limits) md.appendMarkdown(`- ${l.name}: **${l.percent}%**, resets in ${l.reset}\n`);
  if (usage.breakdown) md.appendMarkdown(`\n7d: ${usage.breakdown}\n`);
  md.appendMarkdown(`\n_updated ${usage.at}, click to open the hub_`);
  if (error) md.appendMarkdown(`\n\n⚠ ${error}`);
  item.tooltip = md;
}

function hubHtml(webview, data) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 8px 12px 16px; }
  .lim { margin-bottom: 8px; }
  .lim-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
  .pct { font-variant-numeric: tabular-nums; font-weight: 600; }
  .bar { height: 5px; border-radius: 3px; background: var(--vscode-editorWidget-border, #8884); overflow: hidden; }
  .fill { height: 100%; border-radius: 3px; background: var(--vscode-charts-green, #3fb950); transition: width .4s; }
  .fill.warn { background: var(--vscode-charts-orange, #d29922); }
  .fill.crit { background: var(--vscode-charts-red, #f85149); }
  .muted { color: var(--vscode-descriptionForeground); font-size: 11px; }
  .err { color: var(--vscode-errorForeground); font-size: 12px; }
  #projects { margin-top: 6px; }
  input { width: 100%; box-sizing: border-box; padding: 4px 6px; margin-top: 10px; font: inherit; color: var(--vscode-input-foreground);
    background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; outline: none; }
  input:focus { border-color: var(--vscode-focusBorder); }
  .row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; margin: 0 -6px; border-radius: 3px; cursor: pointer; }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row.sel { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  .dot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--vscode-descriptionForeground); opacity: .35; }
  .dot.today { background: var(--vscode-charts-green, #3fb950); opacity: 1; }
  .dot.week { background: var(--vscode-charts-blue, #3794ff); opacity: 1; }
  .label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .when { flex: none; font-size: 11px; color: var(--vscode-descriptionForeground); font-variant-numeric: tabular-nums; }
  .nw { flex: none; display: none; border: none; background: none; color: inherit; cursor: pointer; padding: 0 2px; border-radius: 3px; }
  .row:hover .nw, .row.sel .nw { display: block; }
  .row:hover .when, .row.sel .when { display: none; }
  .nw:hover { background: var(--vscode-toolbar-hoverBackground); }
  .scribe { flex: none; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--vscode-charts-orange, #d29922); }
  .scribe.ok { color: var(--vscode-charts-green, #3fb950); }
  .scribe.run { color: var(--vscode-descriptionForeground); }
  .inbox { flex: none; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--vscode-charts-orange, #d29922); font-weight: 600; cursor: pointer; }
  .inbox:hover { text-decoration: underline; }
  .sc { flex: none; display: none; border: none; background: none; color: inherit; cursor: pointer; padding: 0 2px; border-radius: 3px; }
  .row:hover .sc, .row.sel .sc { display: block; }
  .sc:hover { background: var(--vscode-toolbar-hoverBackground); }
  .legend { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border, #8884)); }
</style></head><body>
<div id="usage"></div>
<input id="q" placeholder="Filter…" title="↑↓ navigate · Enter open · Ctrl+Enter new window">
<div id="projects"></div>
<div class="legend muted">✍ ✓ memory up to date · ✍ ↻ behind, click ✍ to catch up · ✉ N items waiting for review (optional: /memorise in that project)</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let data = ${json}, sel = 0, list = [];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function ago(ms) {
  if (!ms) return '—';
  const m = Math.round((Date.now() - ms) / 6e4);
  return m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d';
}
function bucket(ms) {
  if (ms && new Date(ms).toDateString() === new Date().toDateString()) return 'today';
  return ms && Date.now() - ms < 7 * 864e5 ? 'week' : 'old';
}
function renderUsage() {
  const el = document.getElementById('usage');
  const u = data.usage;
  if (!u) { el.innerHTML = data.usageError ? '<div class="err">Usage unavailable: ' + esc(data.usageError) + '</div>' : '<div class="muted">Loading usage…</div>'; return; }
  el.innerHTML = u.limits.map(l =>
    '<div class="lim"><div class="lim-top"><span>' + esc(l.name) + '</span><span><span class="pct">' + l.percent + '%</span> <span class="muted">· ' + esc(l.reset) + '</span></span></div>' +
    '<div class="bar"><div class="fill ' + (l.percent >= 90 ? 'crit' : l.percent >= 70 ? 'warn' : '') + '" style="width:' + Math.min(100, l.percent) + '%"></div></div></div>'
  ).join('') + '<div class="muted">' + esc(u.breakdown ? '7d: ' + u.breakdown + ' · ' : '') + 'updated ' + esc(u.at) + '</div>' +
    (data.usageError ? '<div class="muted">⚠ ' + esc(data.usageError) + '</div>' : '');
}
function renderProjects() {
  const q = document.getElementById('q').value.toLowerCase();
  // projects arrive sorted by last activity: empty filter = the 5 most recent, typing searches them all
  const match = data.projects.filter(p => (p.parent + ' ' + p.name).toLowerCase().includes(q));
  list = q ? match : match.slice(0, 5);
  sel = Math.min(sel, Math.max(0, list.length - 1));
  let html = '';
  list.forEach((p, i) => {
    const b = bucket(p.last);
    const s = p.scribe;
    const badge = !s ? '' : s.running ? '<span class="scribe run" title="Scribe running">✍ ⏳</span>'
      : s.lag === 0 ? '<span class="scribe ok" title="Memory up to date: /clear is safe">✍ ✓</span>'
      : s.lag === null ? '<span class="scribe" title="Scribe: lag unknown">✍ ?</span>'
      : '<span class="scribe" title="Scribe behind (' + s.lag + ' transcript lines): click ✍ to catch up">✍ ↻</span>';
    const inbox = s && s.inbox && s.inbox.alert ? '<span class="inbox" data-inbox="' + i + '" title="' + s.inbox.total + ' memory proposals waiting for /memorise' + (s.inbox.ageDays ? ' (oldest ' + s.inbox.ageDays + ' d)' : '') + ' — click to open DECISIONS.md ## Proposals">✉ ' + s.inbox.total + '</span>' : '';
    const scBtn = s && s.session ? '<button class="sc" data-sc="' + i + '" title="Run the scribe now">✍</button>' : '';
    html += '<div class="row' + (i === sel ? ' sel' : '') + '" data-i="' + i + '" title="' + esc(p.path) + '"><span class="dot ' + b + '"></span>' +
      '<span class="label">' + esc(p.name) + '</span>' + badge + inbox +
      '<span class="when">' + ago(p.last) + '</span>' + scBtn + '<button class="nw" data-nw="' + i + '" title="New window">⧉</button></div>';
  });
  if (!q && data.projects.length > 5) html += '<div class="muted" style="margin-top:4px">+ ' + (data.projects.length - 5) + ' more, type to search</div>';
  document.getElementById('projects').innerHTML = html || '<div class="muted" style="margin-top:8px">No project.</div>';
}
const open = (p, newWindow) => p && vscode.postMessage({ type: 'open', path: p.path, newWindow });
document.getElementById('projects').addEventListener('click', e => {
  const nw = e.target.closest('[data-nw]');
  if (nw) return open(list[+nw.dataset.nw], true);
  const sc = e.target.closest('[data-sc]');
  if (sc) { const p = list[+sc.dataset.sc]; p.scribe.running = true; renderProjects(); return vscode.postMessage({ type: 'scribe', path: p.path }); }
  const ib = e.target.closest('[data-inbox]');
  if (ib) return vscode.postMessage({ type: 'inbox', path: list[+ib.dataset.inbox].path });
  const row = e.target.closest('.row');
  if (row) open(list[+row.dataset.i], e.ctrlKey || e.metaKey);
});
document.getElementById('q').addEventListener('input', () => { sel = 0; renderProjects(); });
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sel = Math.max(0, Math.min(list.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
    renderProjects();
    document.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') open(list[sel], e.ctrlKey || e.metaKey);
});
window.addEventListener('message', e => { Object.assign(data, e.data); renderUsage(); if (e.data.projects) renderProjects(); });
// keep the relative times fresh while the view stays open
setInterval(renderProjects, 6e4);
renderUsage(); renderProjects();
// the view's html is reloaded each time it's shown again: ask for fresh data instead of trusting the embedded copy
vscode.postMessage({ type: 'ready' });
</script></body></html>`;
}

function activate(context) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.command = 'claudeHub.openHub';
  status.show();

  let usage = null, usageError = null, view = null, lastFetch = 0, pending = null;

  async function refreshUsage() {
    lastFetch = Date.now();
    ({ usage = null, error: usageError = null } = await loadUsage());
    renderStatus(status, usage, usageError);
    view?.webview.postMessage({ usage, usageError });
  }

  // Live mode: every Claude Code session write triggers a refresh, throttled to one per 5 minutes.
  function refreshSoon() {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      view?.webview.postMessage({ projects: getProjects() });
      refreshUsage();
    }, Math.max(0, lastFetch + MIN_INTERVAL - Date.now()));
  }
  try {
    const watcher = fs.watch(path.join(CLAUDE_DIR, 'projects'), { recursive: true }, (_, file) => {
      if (file?.endsWith('.jsonl')) refreshSoon();
    });
    context.subscriptions.push({ dispose: () => watcher.close() });
  } catch { /* no sessions folder yet: the 5-min timer still runs */ }
  // Scribe badges: cursors, lock, queue and pending.json change under ~/.claude/scribe; cheap, so no 5-min throttle (2 s debounce).
  let scribeTimer = null;
  try {
    const w = fs.watch(SCRIBE_STATE, { recursive: true }, () => {
      clearTimeout(scribeTimer);
      scribeTimer = setTimeout(() => view?.webview.postMessage({ projects: getProjects() }), 2000);
    });
    context.subscriptions.push({ dispose: () => { w.close(); clearTimeout(scribeTimer); } });
  } catch { /* no scribe on this machine */ }

  const provider = {
    // Called each time the sidebar view is shown again, so the project list is always fresh.
    resolveWebviewView(v) {
      view = v;
      v.webview.options = { enableScripts: true };
      v.webview.html = hubHtml(v.webview, { projects: getProjects(), usage, usageError });
      v.webview.onDidReceiveMessage(m => {
        if (m.type === 'open') vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(m.path), { forceNewWindow: !!m.newWindow });
        if (m.type === 'ready') v.webview.postMessage({ projects: getProjects(), usage, usageError });
        if (m.type === 'scribe') runScribe(getProjects().find(p => p.path === m.path) || {});
        if (m.type === 'inbox') openInbox({ path: m.path });
      });
      v.onDidDispose(() => { view = null; });
    },
  };

  const minutes = vscode.workspace.getConfiguration('claudeHub').get('usageRefreshMinutes');
  const timer = setInterval(refreshUsage, minutes * 60000);
  refreshUsage();

  context.subscriptions.push(
    status,
    { dispose: () => { clearInterval(timer); clearTimeout(pending); } },
    vscode.window.registerWebviewViewProvider('claudeHub.hub', provider),
    vscode.commands.registerCommand('claudeHub.openHub', () => vscode.commands.executeCommand('claudeHub.hub.focus')),
    vscode.commands.registerCommand('claudeHub.refresh', () => {
      view?.webview.postMessage({ projects: getProjects() });
      refreshUsage();
    }),
  );

  // Start screen: only in a window with no folder, so opening a project keeps its explorer.
  if (!vscode.workspace.workspaceFolders?.length) vscode.commands.executeCommand('claudeHub.hub.focus');
}

module.exports = { activate, deactivate() {} };
