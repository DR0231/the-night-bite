// The Night Bite: sweep every page in the site's sitemap at phone, tablet and desktop widths.
// Usage: node tools/sweep.cjs [--base URL] [--out DIR] [--pages a,b] [--shots [a,b|changed]] [--since REF] [--no-links]
//   --base   site to test (default the preview, https://dr0231.github.io/night-bite-preview/). Pages come from that
//            site's own sitemap.xml (falls back to this checkout's), so new pages are picked up with no edit here.
//   --out    folder for sweep.log and screenshots (default /workspace/nb-checks/sweep-<time>)
//   --pages  only these paths ('' or / is the root, alum/, water, species/saugeye)
//   --shots  screenshots at 390 and 1280 of the given paths only; bare --shots (or --shots changed) shoots just the
//            pages whose files changed since --since (default HEAD~1, plus uncommitted edits); css or js changes add the root
//   --no-links  skip the link check. Outside link results that answered 200 are cached for 7 days in
//            /workspace/nb-checks/link-cache.json (--link-cache FILE), so repeat runs only re-ask new or failing links.
// Every run blocks analytics and the visits counter (tools/no-analytics.cjs). Each new tab starts with no remembered lake
// (localStorage nb-lake cleared once per tab), so one page never carries the last lake into the next.
// Per page and width: HTTP status (a made-up page must 404), console and page errors (our own blocked beacon is ignored),
// no sideways scroll. Once per page: one <title>, one non-empty <h1>, meta description, canonical = the sitemap address,
// every image loaded with alt text. Then every link found: internal must answer 200, outside 404/410 fails, other
// outside answers (403, 429, timeouts) are noted. Exit 1 on any FAIL. The game (whisperwood.html) is left to its own checks.
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));   // PLAYWRIGHT_CORE, then node_modules, then the box copy
const { chromium } = require(PW);
const fs = require('fs'), path = require('path'), cp = require('child_process');
const NA = require(path.join(__dirname, 'no-analytics.cjs'));
const R = require(path.join(__dirname, 'registry.cjs'));
const SITE = R.SITE;

const argv = process.argv.slice(2), opt = {};
if (argv.includes('--help') || argv.includes('-h')) {
  const head = require('fs').readFileSync(__filename, 'utf8').split('\n');
  console.log(head.slice(0, head.findIndex(l => !l.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
for (let i = 0; i < argv.length; i++) {
  const k = argv[i]; if (!k.startsWith('--')) continue;
  const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  opt[k.slice(2)] = v;
}
const BASE = String(opt.base || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = String(opt.out || '/workspace/nb-checks/sweep-' + stamp).replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const CACHE = String(opt['link-cache'] || '/workspace/nb-checks/link-cache.json');
const WIDTHS = String(opt.widths || '390,820,1280').split(',').map(Number);
const norm = p => String(p).replace(/^\//, '').replace(/^\.\/?$/, '');

const results = []; let fails = 0;
const check = (n, ok, info) => { results.push((ok ? 'PASS ' : 'FAIL ') + n + (info !== undefined && info !== '' ? ' :: ' + String(info).slice(0, 300) : '')); if (!ok) fails++; };
const note = s => results.push('NOTE ' + s);

function changedPages() {
  const since = typeof opt.since === 'string' ? opt.since : 'HEAD~1';
  const root = path.join(__dirname, '..');
  const git = args => { try { return cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); } catch (e) { return []; } };
  const files = [...new Set([...git(['diff', '--name-only', since]), ...git(['ls-files', '--others', '--exclude-standard'])])];
  const pages = new Set();
  for (const f of files) {
    if (/^(whisperwood|previews\/|review\/|tools\/)/.test(f)) continue;
    if (f === 'index.html') pages.add('');
    else if (/\/index\.html$/.test(f)) pages.add(f.replace(/index\.html$/, ''));
    else if (/\.html$/.test(f)) pages.add(f.replace(/\.html$/, ''));
    else if (/^(css|js)\//.test(f)) pages.add('');
  }
  return [...pages];
}

async function linkStatus(u) {
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(u, { method, redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      if (method === 'HEAD' && r.status >= 400) continue;
      return r.status;
    } catch (e) { if (method === 'GET') return 'ERR ' + (e.cause && e.cause.code || e.name); }
  }
}

(async () => {
  // pages: the target's own sitemap, else this checkout's
  let paths;
  try {
    const sm = await (await fetch(BASE + 'sitemap.xml?x=' + Date.now(), { signal: AbortSignal.timeout(20000) })).text();
    paths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(SITE, ''));
    if (!paths.length) throw new Error('empty');
  } catch (e) { paths = R.sitemapPaths(); note('could not read ' + BASE + 'sitemap.xml, used this checkout\'s'); }
  if (opt.pages) paths = String(opt.pages).split(',').map(norm);
  const game = paths.filter(p => /^whisperwood/.test(p));
  if (game.length) note('skipped the game (' + game.join(', ') + '): it has its own checks');
  paths = paths.filter(p => !/^whisperwood/.test(p));
  const probe = 'no-such-page-' + stamp.toLowerCase();
  let shots = [];
  if (opt.shots === true || opt.shots === 'changed') shots = changedPages();
  else if (opt.shots) shots = String(opt.shots).split(',').map(norm);
  if (shots.length) fs.mkdirSync(OUT + 'shots', { recursive: true });
  if (opt.shots) note('screenshots: ' + (shots.length ? shots.map(p => '/' + p).join(', ') : 'none (no page changed)'));

  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: NA.args(['--no-sandbox']) });
  const links = new Map();
  await Promise.all(WIDTHS.map(async (w, wi) => {
    const mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
    await NA.block(ctx);
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('nb-test-fresh')) { localStorage.removeItem('nb-lake'); sessionStorage.setItem('nb-test-fresh', '1'); } } catch (e) {} });
    for (const p of [...paths, probe]) {
      const page = await ctx.newPage(); const errs = [], rf = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => errs.push('pageerror ' + e.message));
      page.on('requestfailed', r => rf.push(r.url()));
      let st = 0;
      try { const r = await page.goto(BASE + p, { waitUntil: 'load', timeout: 45000 }); st = r ? r.status() : 0; } catch (e) { errs.push('goto ' + e.message); }
      await page.waitForTimeout(800);
      // loading="lazy" images below the fold (picker tiles) never load in a headless pass: load them, then judge them
      await page.evaluate(() => Promise.race([new Promise(r => setTimeout(r, 5000)), Promise.all([...document.images]
        .filter(i => i.loading === 'lazy' && !i.complete).map(i => new Promise(r => { i.addEventListener('load', r); i.addEventListener('error', r); i.loading = 'eager'; })))])).catch(() => {});
      const real = errs.filter(e => !(/ERR_BLOCKED_BY_CLIENT/.test(e) && rf.length && rf.every(u => NA.PATTERN.test(u))))
        .filter(e => !(p === probe && /404/.test(e)));
      const d = await page.evaluate(() => {
        const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const q = s => document.querySelector(s);
        return {
          ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          titles: document.querySelectorAll('head title').length, title: document.title.trim(),
          h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().replace(/\s+/g, ' ')),
          desc: (q('meta[name=description]') || {}).content || '', canon: (q('link[rel=canonical]') || {}).href || '',
          imgs: [...document.images].filter(vis).map(i => ({ src: (i.currentSrc || i.src).slice(-80), ok: i.complete && i.naturalWidth > 0, alt: i.hasAttribute('alt') })),
          links: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => /^https?:/.test(h)),
        };
      }).catch(e => ({ ov: 0, err: e.message, imgs: [], links: [], h1: [] }));
      const t = `${w} /${p}`;
      if (p === probe) {
        check(`${t} unknown page answers 404`, st === 404, st);
        check(`${t} 404 page: no errors, no sideways scroll`, real.length === 0 && d.ov <= 1, real.join(' | ') + ' ov ' + d.ov);
        await page.close(); continue;
      }
      check(`${t} status 200`, st === 200, st);
      check(`${t} no console or page errors`, real.length === 0, real.join(' | ') + (real.length && rf.length ? ' RF ' + rf.join(' ') : ''));
      check(`${t} no sideways scroll`, d.ov <= 1, d.ov);
      if (wi === 0) {
        check(`/${p} one title`, d.titles === 1 && !!d.title, d.title);
        check(`/${p} one h1`, d.h1.length === 1 && !!d.h1[0], JSON.stringify(d.h1));
        check(`/${p} meta description`, !!d.desc.trim(), d.desc.slice(0, 80));
        check(`/${p} canonical is the sitemap address`, d.canon === SITE + p, d.canon);
        const bad = d.imgs.filter(i => !i.ok || !i.alt);
        check(`/${p} images load and have alt (${d.imgs.length})`, bad.length === 0, JSON.stringify(bad));
        for (const h of d.links) { const u = h.split('#')[0]; if (!NA.PATTERN.test(u) && !links.has(u)) links.set(u, p); }
      }
      if (shots.includes(p) && (w === 390 || w === 1280)) await page.screenshot({ path: `${OUT}shots/${w}-${p.replace(/[\/?=]/g, '_') || 'root'}.png`, fullPage: true }).catch(e => note('shot failed ' + t + ' ' + e.message));
      await page.close();
    }
    await ctx.close();
  }));
  await browser.close();

  if (!opt['no-links']) {
    let cache = {}; try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) {}
    const WEEK = 7 * 864e5, now = Date.now();
    const list = [...links.keys()];
    let i = 0, fromCache = 0;
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (i < list.length) {
        const u = list[i++]; const from = links.get(u);
        const internal = u.startsWith(BASE) || u.startsWith(SITE);
        const target = u;   // absolute nightbiteoh.com links (the game at whisperwood/) are meant to reach live, so check them as written
        let s;
        if (!internal && cache[u] && cache[u].status === 200 && now - cache[u].at < WEEK) { s = 200; fromCache++; }
        else { s = await linkStatus(target); if (!internal) cache[u] = { status: s, at: now }; }
        if (internal) check(`link ${u} (from /${from})`, s === 200, s);
        else if (s === 404 || s === 410) check(`outside link ${u} (from /${from})`, false, s);
        else if (s !== 200) note(`outside link ${u} answered ${s} (from /${from})`);
        else results.push('PASS outside link ' + u);
      }
    }));
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
    note(`links: ${list.length} checked, ${fromCache} outside links from the cache`);
  }
  const pass = results.filter(r => r.startsWith('PASS')).length;
  const sum = `sweep ${BASE}: ${paths.length} pages x ${WIDTHS.length} widths, ${pass} pass, ${fails} fail`;
  fs.writeFileSync(OUT + 'sweep.log', results.sort().join('\n') + '\n' + sum + '\n');
  console.log(results.filter(r => !r.startsWith('PASS')).sort().join('\n')); console.log(sum); console.log('log: ' + OUT + 'sweep.log');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('sweep crashed: ' + (e.stack || e)); process.exit(2); });
