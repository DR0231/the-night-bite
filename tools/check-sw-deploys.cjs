// The Night Bite: a page never pairs one deploy's HTML with another deploy's styles or scripts, and the kill switch
// clears every cache (the Nov. 13, 2026 verification run, N1 to N3). Real Chrome, a real service worker, and a local
// server that copies GitHub Pages (clean URLs, 404.html, Cache-Control: max-age=600) and can switch deploys, slow
// chosen files down, or drop every connection (offline). Each deploy is a copy of this checkout with a marker in a
// page (<meta name="nb-deploy">), in css/styles.css (--nb-deploy) and in js/nav.js (window.NB_DEPLOY_JS), its own
// VERSION, then tools/stamp-version.py, exactly like a real deploy. Nothing outside 127.0.0.1 is fetched.
//   n1-slow-css     N1: worker A, deploy B, styles.css takes 6 s: water.html shows B's HTML with B's styles and scripts
//   n1-slow-page    N1 mirror: worker A, deploy B, hoover/ takes 6 s: one deploy's page, styles and scripts, never mixed
//   n2-offline      N2: water.html saved under A, B takes over, offline: the saved page with its own (A) files
//   n2-slow         N2: the same online, with water.html taking 6 s
//   legacy-offline  the v134 (live v41) worker's saved water.html, then this worker takes over, offline: never mixed
//   legacy-slow-css the one deploy that still runs an old worker: its mix after a slow styles.css heals with one reload
//   many-deploys    one visitor through four deploys in a row (A, B, C, A again): each worker takes over, one deploy each
//   no-reload       an ordinary deploy reloads nobody (every returning visitor's page reloading showed in Cloudflare)
//   kill-sw-only    tools/sw-kill-switch.js deployed as sw.js: every nb- cache and the registration are gone
//   kill-both       N3: kill switch plus js/sw-update.js replaced by tools/sw-kill-switch-page.js: still all gone
//   repro-kill-old  INFO only: the kill switch the docs gave up to v134, both files replaced (the N3 race)
// Usage: node tools/check-sw-deploys.cjs [OUTDIR] [--code DIR] [--legacy DIR] [--only a,b] [--expect-fail]
//   --code DIR     build deploys A and B from DIR instead of this checkout (the v134 tree shows the bugs)
//   --legacy DIR   the older tree for the legacy-* cases (default: skipped; check-all passes the parent commit)
//   --expect-fail  exit 0 when at least one N1/N2 case fails (a baseline run on the old code)
// NB_DEBUG=1 adds an in-flight event list to each worker, printed when a worker never takes over.
// Exit code 1 on any FAIL. Log: OUTDIR/check-sw-deploys.log. Blocks analytics (tools/no-analytics.cjs).
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), os = require('os');

const argv = process.argv.slice(2), opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const OUT = ((argv[0] && !argv[0].startsWith('--')) ? argv[0] : '/workspace/nb-sw-deploys').replace(/\/?$/, '/');
const REPO = path.resolve(__dirname, '..');
const CODE = path.resolve(opt('--code') || REPO), LEGACY = opt('--legacy') ? path.resolve(opt('--legacy')) : null;
const ONLY = opt('--only') ? opt('--only').split(',') : null, EXPECT_FAIL = argv.includes('--expect-fail');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
const PREFIX = '/night-bite-preview/';
const lines = []; let fails = 0, reproFails = 0;
const log = s => { lines.push(s); console.log(s); };
const check = (n, ok, info) => { log((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + info : '')); if (!ok) { fails++; if (/^n[12]-/.test(n)) reproFails++; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- deploy trees
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-sw-deploys-'));
function build(src, tag) {
  const dir = path.join(WORK, tag);
  const skip = new Set(['.git', 'whisperwood', 'node_modules', path.join('.github', 'build-inputs', 'i18n-tm'), path.join('data', 'i18n', 'tm')]);   // the 14 MB translation memory isn't needed (older trees keep it at data/i18n/tm); .github/build-inputs/biting-data*.js are copied, since stamp-version runs biting-split
  fs.cpSync(src, dir, { recursive: true, filter: f => !skip.has(path.relative(src, f)) });
  const sw = path.join(dir, 'sw.js');
  const ver = 'v900-test-' + tag;
  let swSrc = fs.readFileSync(sw, 'utf8').replace(/var VERSION = "[^"]+";/, 'var VERSION = "' + ver + '";');
  if (process.env.NB_DEBUG) swSrc = 'self.__inflight = {}; var __n = 0;\n' +
    'var __rw = FetchEvent.prototype.respondWith; FetchEvent.prototype.respondWith = function (p) { var id = ++__n; self.__inflight[id] = "rw " + this.request.url; Promise.resolve(p).finally(function () { delete self.__inflight[id]; }); return __rw.call(this, p); };\n' +
    'var __wu = ExtendableEvent.prototype.waitUntil; ExtendableEvent.prototype.waitUntil = function (p) { var id = ++__n; self.__inflight[id] = "wu " + ((this.request && this.request.url) || this.type); Promise.resolve(p).finally(function () { delete self.__inflight[id]; }); return __wu.call(this, p); };\n' + swSrc;
  fs.writeFileSync(sw, swSrc);
  for (const p of ['water.html', 'hoover/index.html', 'index.html']) {
    const f = path.join(dir, p);
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('<head>', '<head>\n  <meta name="nb-deploy" content="' + tag + '">'));
  }
  fs.appendFileSync(path.join(dir, 'css/styles.css'), '\n:root { --nb-deploy: "' + tag + '"; }\n');
  fs.appendFileSync(path.join(dir, 'js/nav.js'), '\nwindow.NB_DEPLOY_JS = "' + tag + '";\n');
  cp.execFileSync('python3', ['tools/stamp-version.py'], { cwd: dir, stdio: 'pipe' });
  return { dir, ver, tag, over: {} };
}

// ---------------------------------------------------------------- a GitHub Pages like server
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const S = { deploy: null, delays: [], down: false, hits: [] };
const server = http.createServer((req, res) => {
  if (S.down) { req.socket.destroy(); return; }
  const u = new URL(req.url, 'http://x');
  S.hits.push(u.pathname + u.search);
  if (!u.pathname.startsWith(PREFIX)) { res.writeHead(404); return res.end(); }
  let rel = decodeURIComponent(u.pathname.slice(PREFIX.length));
  const d = S.deploy;
  const send = (status, rel2) => {
    const body = d.over[rel2] != null ? Buffer.from(d.over[rel2]) : fs.readFileSync(path.join(d.dir, rel2));
    const delay = S.delays.filter(x => x.re.test(u.pathname)).reduce((a, x) => Math.max(a, x.ms), 0);
    setTimeout(() => {
      if (S.down) { req.socket.destroy(); return; }
      res.writeHead(status, { 'Content-Type': TYPES[path.extname(rel2)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
      res.end(body);
    }, delay);
  };
  const exists = p => d.over[p] != null || (fs.existsSync(path.join(d.dir, p)) && fs.statSync(path.join(d.dir, p)).isFile());
  const isDir = p => fs.existsSync(path.join(d.dir, p)) && fs.statSync(path.join(d.dir, p)).isDirectory();
  if (rel === '' || rel.endsWith('/')) { if (exists(rel + 'index.html')) return send(200, rel + 'index.html'); }
  else if (exists(rel)) return send(200, rel);
  else if (isDir(rel)) { res.writeHead(301, { Location: u.pathname + '/' }); return res.end(); }
  else if (exists(rel + '.html')) return send(200, rel + '.html');
  return send(404, '404.html');
});

// ---------------------------------------------------------------- page helpers
let BASE;
const hello = page => page.evaluate(() => new Promise(r => {
  const c = navigator.serviceWorker.controller; if (!c) return r(null);
  const ch = new MessageChannel(); ch.port1.onmessage = e => r(e.data); c.postMessage({ type: 'nb-hello' }, [ch.port2]); setTimeout(() => r(null), 2000);
})).catch(() => null);
const markers = page => page.evaluate(() => ({
  html: (document.querySelector('meta[name="nb-deploy"]') || {}).content || (document.querySelector('.offline-links') ? 'offline' : document.title),
  css: getComputedStyle(document.documentElement).getPropertyValue('--nb-deploy').trim().replace(/"/g, '') || 'none',
  js: window.NB_DEPLOY_JS || 'none' })).catch(e => ({ html: 'error ' + e.message, css: '', js: '' }));
const one = m => m.html === m.css && m.css === m.js;
const fmt = m => 'html ' + m.html + ', css ' + m.css + ', js ' + m.js;
async function nbCaches(page) { return page.evaluate(async () => (await caches.keys()).filter(k => k.indexOf('nb-') === 0)); }
async function regs(page) { return page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length); }
async function cacheBytes(page) {
  return page.evaluate(async () => { let n = 0, b = 0; for (const k of (await caches.keys()).filter(k => k.indexOf('nb-') === 0)) { const c = await caches.open(k); for (const r of await c.keys()) { n++; const x = await c.match(r); b += (await x.clone().arrayBuffer()).byteLength; } } return { n, b }; });
}

// wait until the worker for `ver` controls the page (it installs in the background, then claims)
async function waitWorker(page, ver, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const h = await hello(page);
    if (h && h.version === ver) return h;
    // ask for an update only while nothing is installing or waiting
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r && !r.installing && !r.waiting && r.update()).catch(() => {})).catch(() => {});
    await sleep(700);
  }
  const st = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); const f = w => w && w.state; return r ? { installing: f(r.installing), waiting: f(r.waiting), active: f(r.active), controller: !!navigator.serviceWorker.controller } : null; }).catch(e => e.message);
  log('INFO no worker ' + ver + ' after ' + ms + ' ms: ' + JSON.stringify(st) + ', last requests ' + S.hits.slice(-8).join(' '));
  if (process.env.NB_DEBUG) for (const w of page.context().serviceWorkers()) log('INFO debug worker ' + w.url() + ': ' + JSON.stringify(await w.evaluate(() => ({ v: VERSION, inflight: self.__inflight })).catch(e => e.message)));
  return null;
}

// one browser per case: in one long-lived browser, after two or three cases (each a context with about 4.5 MB of
// in-memory caches, opened and closed), a later case's new worker sat "installed" forever with nothing in flight in
// the old one. A fresh browser per case never did, and many-deploys shows one visitor taking update after update.
async function context() {
  if (current) await current.close().catch(() => {});
  current = await chromium.launch({ executablePath: CHROME, args: NA.args([]) });
  const ctx = await current.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await NA.block(ctx);
  // no live data: the gauges and the forecast are never fetched from the real services in this check
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort('failed'));
  return ctx;
}
let current = null;
async function goto(page, rel, wait = 'load') {
  try { await page.goto(BASE + rel, { waitUntil: wait, timeout: 30000 }); } catch (e) { log('INFO goto ' + rel + ': ' + e.message.split('\n')[0]); }
}
// a visitor under deploy d: the worker installed and in control, water.html saved too
async function visit(browser, d) {
  S.deploy = d; S.delays = []; S.down = false;
  const ctx = await context(browser), page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) log('INFO console: ' + m.text().slice(0, 200)); });
  await goto(page, 'hoover/');
  const ok = await waitWorker(page, d.ver);
  if (!ok) log('INFO worker ' + d.ver + ' never took control');
  await goto(page, 'water.html');
  await sleep(1500);
  return { ctx, page };
}
function countLoads(page) { const c = { n: 0 }; page.on('load', () => c.n++); return c; }

async function run(name, fn) {
  if (ONLY && !ONLY.includes(name)) return;
  log('--- ' + name);
  try { await fn(); } catch (e) { check(name + ': ran', false, e.stack.split('\n').slice(0, 3).join(' | ')); }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  BASE = 'http://127.0.0.1:' + server.address().port + PREFIX;
  log('code: ' + CODE + (LEGACY ? '  legacy: ' + LEGACY : '') + '  base: ' + BASE);
  const A = build(CODE, 'A'), B = build(CODE, 'B');
  const L = LEGACY ? build(LEGACY, 'L') : null, N = LEGACY ? build(REPO, 'N') : null;
  const browser = null;

  await run('n1-slow-css', async () => {
    const { ctx, page } = await visit(browser, A);
    S.deploy = B; S.delays = [{ re: /\/css\/styles\.css$/, ms: 6000 }];
    await goto(page, 'water.html');
    await sleep(1000);
    const m = await markers(page);
    check('n1-slow-css: water.html after a deploy, styles.css taking 6 s: one deploy (B)', one(m) && m.html === 'B', fmt(m));
    await ctx.close();
  });

  await run('n1-slow-page', async () => {
    const { ctx, page } = await visit(browser, A);
    S.deploy = B; S.delays = [{ re: /\/hoover\/(index\.html)?$/, ms: 6000 }];
    await goto(page, 'hoover/');
    await sleep(1000);
    const m = await markers(page);
    check('n1-slow-page: hoover/ taking 6 s after a deploy: page, styles and scripts from one deploy', one(m) && (m.html === 'A' || m.html === 'B'), fmt(m));
    await ctx.close();
  });

  async function n2(name, slow) {
    const { ctx, page } = await visit(browser, A);
    S.deploy = B;
    await goto(page, 'hoover/');
    const h = await waitWorker(page, B.ver);
    check(name + ': the new worker took over', !!h, JSON.stringify(h));
    if (slow) S.delays = [{ re: /\/water(\.html)?$/, ms: 6000 }];
    else { S.down = true; await ctx.setOffline(true); }
    await goto(page, 'water.html');
    await sleep(1000);
    const m = await markers(page);
    check(name + ': water.html saved under A, opened ' + (slow ? 'with a 6 s page' : 'offline') + ' under B: one deploy', one(m) || m.html === 'offline', fmt(m));
    check(name + ': it is the saved page with its own files (A), not offline.html', m.html === 'A' && one(m), fmt(m));
    if (!slow) {
      await goto(page, 'hoover/');
      const m2 = await markers(page);
      check(name + ': hoover/ offline is this deploy (B) throughout', one(m2) && m2.html === 'B', fmt(m2));
    }
    await ctx.setOffline(false); S.down = false;
    await ctx.close();
  }
  await run('n2-offline', () => n2('n2-offline', false));
  await run('n2-slow', () => n2('n2-slow', true));

  if (L) {
    await run('legacy-offline', async () => {
      const { ctx, page } = await visit(browser, L);
      const h0 = await hello(page);
      log('INFO legacy worker says ' + JSON.stringify(h0));
      S.deploy = N;
      await goto(page, 'hoover/');
      const h = await waitWorker(page, N.ver);
      check('legacy-offline: this worker took over from the old one', !!h && h.assets === 'by-deploy', JSON.stringify(h));
      S.down = true; await ctx.setOffline(true);
      await goto(page, 'water.html');
      await sleep(1000);
      const m = await markers(page);
      check('legacy-offline: water.html the old worker saved, offline: one deploy (or offline.html), never mixed', one(m) || m.html === 'offline', fmt(m));
      log('INFO legacy-offline served: ' + fmt(m));
      await ctx.setOffline(false); S.down = false;
      await ctx.close();
    });
    await run('legacy-slow-css', async () => {
      const { ctx, page } = await visit(browser, L);
      const loads = countLoads(page);
      S.deploy = N; S.delays = [{ re: /\/css\/styles\.css$/, ms: 6000 }];
      await goto(page, 'water.html');
      const m0 = await markers(page);
      log('INFO legacy-slow-css first paint (old worker): ' + fmt(m0));
      const h = await waitWorker(page, N.ver, 40000);
      await sleep(8000);
      const m = await markers(page);
      check('legacy-slow-css: after the new worker takes over, the page is one deploy (N)', one(m) && m.html === 'N', fmt(m) + ', loads ' + loads.n + ', worker ' + JSON.stringify(h));
      check('legacy-slow-css: it healed with at most one reload', loads.n <= 2, 'loads ' + loads.n);
      await ctx.close();
    });
  }

  await run('many-deploys', async () => {
    const C = build(CODE, 'C');
    const { ctx, page } = await visit(browser, A);
    for (const d of [B, C, A]) {
      S.deploy = d;
      await goto(page, 'water.html');
      const h = await waitWorker(page, d.ver);
      await goto(page, 'water.html');
      const m = await markers(page);
      check('many-deploys: ' + d.tag + ' took over and water.html is one deploy (' + d.tag + ')', !!h && one(m) && m.html === d.tag, fmt(m) + ', worker ' + JSON.stringify(h));
    }
    await ctx.close();
  });

  await run('no-reload', async () => {
    const { ctx, page } = await visit(browser, A);
    const loads = countLoads(page);
    S.deploy = B;
    await goto(page, 'water.html');
    await waitWorker(page, B.ver);
    await sleep(3000);
    const m = await markers(page);
    check('no-reload: a deploy on a good connection: B, one deploy', one(m) && m.html === 'B', fmt(m));
    check('no-reload: and no reload', loads.n === 1, 'loads ' + loads.n);
    await ctx.close();
  });

  const KILL = fs.readFileSync(path.join(REPO, 'tools/sw-kill-switch.js'), 'utf8');
  const KILL_PAGE = fs.readFileSync(path.join(REPO, 'tools/sw-kill-switch-page.js'), 'utf8');
  // the kill switch SERVICE-WORKER.md gave up to v134, and its sw-update.js line
  const OLD_KILL = 'self.addEventListener("install", function () { self.skipWaiting(); });\nself.addEventListener("activate", function (event) {\n  event.waitUntil(\n    caches.keys()\n      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf("nb-") === 0; }).map(function (k) { return caches.delete(k); })); })\n      .then(function () { return self.registration.unregister(); })\n      .then(function () { return self.clients.matchAll({ type: "window" }); })\n      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })\n  );\n});\n';
  const OLD_PAGE = 'navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });\n';
  async function kill(name, over, info) {
    const { ctx, page } = await visit(browser, A);
    const before = await cacheBytes(page);
    log('INFO ' + name + ': before, ' + before.n + ' entries, ' + (before.b / 1048576).toFixed(2) + ' MB in nb- caches');
    S.deploy = Object.assign({}, A, { over });
    await goto(page, 'hoover/');
    await sleep(6000);
    await goto(page, 'water.html');
    await sleep(4000);
    const left = await nbCaches(page), r = await regs(page), b = await cacheBytes(page);
    const msg = 'caches left ' + JSON.stringify(left) + ' (' + (b.b / 1048576).toFixed(2) + ' MB), registrations ' + r;
    if (info) { log('INFO ' + name + ': ' + msg + (left.length ? ' (the N3 race reproduced)' : '')); }
    else check(name + ': every nb- cache and the registration are gone', left.length === 0 && r === 0, msg);
    await ctx.close();
  }
  await run('kill-sw-only', () => kill('kill-sw-only', { 'sw.js': KILL }));
  await run('kill-both', () => kill('kill-both', { 'sw.js': KILL, 'js/sw-update.js': KILL_PAGE }));
  await run('repro-kill-old', () => kill('repro-kill-old', { 'sw.js': OLD_KILL, 'js/sw-update.js': OLD_PAGE }, true));

  if (current) await current.close().catch(() => {});
  server.close();
  fs.rmSync(WORK, { recursive: true, force: true });
  const pass = lines.filter(l => l.startsWith('PASS')).length;
  log(fails ? fails + ' FAIL, ' + pass + ' pass' : 'ALL PASSED: ' + pass + ' pass, 0 fail');
  fs.writeFileSync(OUT + 'check-sw-deploys.log', lines.join('\n') + '\n');
  if (EXPECT_FAIL) process.exit(reproFails ? 0 : 1);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (x) {} process.exit(2); });
