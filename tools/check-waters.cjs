// The Night Bite: full check of every page a set of waters has (lake home plus its ?lake= views of the shared pages).
// Usage: node tools/check-waters.cjs [BASE] [OUTDIR] [ids,comma,separated | --all-lakes [--group N] [--fresh]]
//   No ids: the lakes whose files differ from origin/main (git diff, uncommitted and untracked too) plus hoover, printed.
//   --all-lakes: every lake, in groups of 5 (NB_GROUP_SIZE), each run as its own child into OUTDIR/group-N/ with a
//   group-N.json result; rerunning skips groups that passed, so an interrupted run resumes. --group N runs one group.
//   BASE defaults to the preview. Every run blocks analytics and the visits counter (tools/no-analytics.cjs).
// Per page at 390, 820 and 1280: status 200, no console or page errors, no sideways scroll, every image loaded with alt.
// Once per page (390): title, meta description, OG tags, canonical, JSON-LD parses, lake home WebPage dateModified
// matches the Quick facts checked date, visible copy has no spaced dashes, no county names, "Buckeye" only as
// "Buckeye Lake" (or Buckeye Trail/State), every visible card or data block has an outside source link.
// Then every link found: internal must be 200, outside 404/410 fails (403, 405, 429 and timeouts are noted, not failed).
const PW = process.env.PLAYWRIGHT_CORE || '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core';
const { chromium } = require(PW);
const path = require('path'), fs = require('fs');
const NA = require(path.join(__dirname, 'no-analytics.cjs'));
const FLAGS = process.argv.slice(2).filter(x => x.startsWith('--')), POS = process.argv.slice(2).filter((x, i, l) => !x.startsWith('--') && l[i - 1] !== '--group');
const BASE = (POS[0] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = (POS[1] || '/tmp/check-waters').replace(/\/?$/, '/'); fs.mkdirSync(OUT, { recursive: true });
const R = require(path.join(__dirname, 'registry.cjs'));
if (FLAGS.includes('--all-lakes')) {   // explicit full run, in resumable groups; each group is a child run of this script
  const size = +process.env.NB_GROUP_SIZE || 5, all = R.order(), gi = process.argv.indexOf('--group'), only = gi > 0 ? process.argv[gi + 1] : null;
  const groups = []; for (let i = 0; i < all.length; i += size) groups.push(all.slice(i, i + size));
  if (only && !(+only >= 1 && +only <= groups.length)) { console.error(`check-waters: no group ${only}; groups are 1 to ${groups.length}`); process.exit(2); }
  if (FLAGS.includes('--fresh')) for (const f of fs.readdirSync(OUT)) if (/^group-\d+\.json$/.test(f)) fs.unlinkSync(OUT + f);
  console.log(`check-waters --all-lakes: ${all.length} lakes in ${groups.length} groups of ${size}, results in ${OUT}`);
  let worst = 0;
  groups.forEach((g, i) => {
    const k = String(i + 1), res = OUT + 'group-' + k + '.json';
    if (only && only !== k) return;
    if (fs.existsSync(res) && JSON.parse(fs.readFileSync(res, 'utf8')).exit === 0) { console.log(`  group ${k} (${g.join(',')}): done earlier, skipped`); return; }
    const t0 = Date.now(), p = require('child_process').spawnSync(process.execPath, [__filename, BASE, OUT + 'group-' + k + '/', g.join(',')], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const tail = (p.stdout || '').trim().split('\n').pop();
    fs.writeFileSync(res, JSON.stringify({ group: k, lakes: g, exit: p.status, secs: Math.round((Date.now() - t0) / 1000), result: tail, at: new Date().toISOString() }, null, 1) + '\n');
    console.log(`  group ${k} (${g.join(',')}): exit ${p.status} :: ${tail}`); worst = Math.max(worst, p.status || 0);
  });
  process.exit(worst ? 1 : 0);
}
let IDS = POS[2] ? POS[2].split(',') : null;
if (!IDS) {   // never every lake by accident: changed lakes plus hoover
  const ch = R.changed('origin/main'); const set = new Set([...(ch.lakes || []), 'hoover']);
  IDS = R.order().filter(l => set.has(l));
  console.log(`check-waters scope: lakes changed vs origin/main: ${(ch.lakes || []).join(',') || 'none'}, plus hoover -> ${IDS.join(',')}` + (ch.error ? ` (${ch.error})` : '') + ' (pass ids or --all-lakes for more)');
}
const badIds = IDS.filter(l => !R.order().includes(l)); if (badIds.length) { console.error('check-waters: unknown lake(s): ' + badIds.join(',')); process.exit(2); }
const QF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'quick-facts.json'), 'utf8')).lakes;
const SITE = 'https://nightbiteoh.com/';
const results = []; let fails = 0;
const check = (n, ok, info) => { results.push((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + String(info).slice(0, 400) : '')); if (!ok) fails++; };
const note = s => results.push('NOTE ' + s);
const SPX = fs.readFileSync(path.join(__dirname, '..', 'species', 'index.html'), 'utf8');
const speciesOf = l => [...SPX.matchAll(/class="card species-card"[^>]*href="([a-z-]+)" data-lakes="([^"]*)"/g)].filter(m => m[2].split(' ').includes(l)).map(m => m[1]);
const home = l => R.home(l);   // every lake home at <id>/, Hoover too (the site root is the water picker)
const PAGES = IDS.flatMap(l => [home(l), ...['water', 'stocking', 'gear', 'ice', 'log', 'species/'].map(p => p + '?lake=' + l), ...speciesOf(l).map(s => 'species/' + s + '?lake=' + l)]);
(async () => {
  const sm = await (await fetch(BASE + 'sitemap.xml?x=' + Date.now())).text();
  for (const l of IDS) check(`sitemap lists /${home(l)}`, sm.includes(`<loc>${SITE}${home(l)}</loc>`));
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: NA.args(['--no-sandbox']) });
  const links = new Map();
  for (const [w, h] of [[390, 844], [820, 1180], [1280, 800]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    await NA.block(ctx);
    // each new tab starts with no remembered lake, so one page never carries the last lake into the next ('/ shows hoover :: dow')
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('nb-test-fresh')) { localStorage.removeItem('nb-lake'); sessionStorage.setItem('nb-test-fresh', '1'); } } catch (e) {} });
    for (const p of PAGES) {
      const page = await ctx.newPage(); const errs = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => errs.push('pageerror ' + e.message));
      const rf = []; page.on('requestfailed', r => rf.push(r.url()));
      let st = 0;
      try { const r = await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 45000 }); st = r ? r.status() : 0; } catch (e) { errs.push('goto ' + e.message); }
      await page.waitForTimeout(500);
      const lake = p.split('?lake=')[1] || p.replace('/', '');
      const d = await page.evaluate(() => {
        const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const imgs = [...document.images].filter(vis).map(i => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.hasAttribute('alt') }));
        const svgBad = [...document.querySelectorAll('svg[role=img]')].filter(s => !s.getAttribute('aria-label') && !s.querySelector('title')).length;
        return { ov: document.documentElement.scrollWidth - window.innerWidth, lake: document.documentElement.dataset.lake, imgs, svgBad };
      }).catch(e => ({ ov: 99, imgs: [], err: e.message }));
      check(`${w} /${p} status 200`, st === 200, st);
      // the analytics beacon we block ourselves shows up as ERR_BLOCKED_BY_CLIENT; that one is expected on live
      const real = errs.filter(e => !(/ERR_BLOCKED_BY_CLIENT/.test(e) && rf.every(u => NA.PATTERN.test(u))));
      check(`${w} /${p} no console or page errors`, real.length === 0, real.join(' | ') + (real.length ? ' RF ' + rf.join(' ') : ''));
      check(`${w} /${p} no sideways scroll`, d.ov <= 1, d.ov);
      check(`${w} /${p} shows ${lake}`, d.lake === lake, d.lake);
      const badImg = d.imgs.filter(i => !i.ok || !i.alt);
      check(`${w} /${p} images load and have alt`, badImg.length === 0 && !d.svgBad, JSON.stringify(badImg).slice(0, 200) + (d.svgBad ? ' svg no label ' + d.svgBad : ''));
      if (w === 390) {
        const m = await page.evaluate(async () => {
          const pill = document.querySelector('[aria-haspopup=dialog]'); if (pill && !location.search) { pill.click(); await new Promise(r => setTimeout(r, 400)); }
          const pickerIds = [...document.querySelectorAll('a[data-lake]')].map(e => e.dataset.lake).join(' ');
          const dlg = document.querySelector('dialog[open]'); if (dlg) dlg.close();
          document.querySelectorAll('details').forEach(x => x.open = true);
          await new Promise(r => setTimeout(r, 300));
          const q = s => document.querySelector(s); const c = s => (q(s) || {}).content || '';
          const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch (e) { return { __bad: e.message }; } });
          const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const main = q('main') || document.body;
          const own = h => /^https:\/\/(nightbiteoh\.com|dr0231\.github\.io)\b/.test(h);
          const srcA = a => (/^https?:/.test(a.href) && !own(a.href)) || /^(\.\.\/)?(stocking|water|species\/[a-z-]+|[a-z-]+)(\?lake=[a-z]+)?(#[\w-]+)?$|^#[\w-]+$/.test(a.getAttribute('href'));
          // user-entry boxes (forms and their inputs, the private trip list marked data-user-entry) hold what the reader types,
          // not lake data, so their digits don't make a block need a source; everything else in the block still counts
          const dataText = b => { const c = b.cloneNode(true); c.querySelectorAll('form, input, select, textarea, [data-user-entry]').forEach(x => x.remove());
            if (b.matches('form, [data-user-entry]')) return ''; return c.textContent; };
          const blocks = [...main.querySelectorAll('.card, .how-to-read, .data-glance, .glance-cell, section.lake-section, .stock-lake, .rules-card')]
            .filter(vis).filter(b => /\d/.test(dataText(b)) && !b.closest('nav'))
            .filter(b => !b.querySelector('.card, .how-to-read'))
            .filter(b => !/^\/gear/.test(location.pathname.replace(/^\/night-bite-preview/, '')) || b.closest('[data-for]'))   // gear kits are general tackle, not lake data
            .map(b => { const own2 = [b, ...b.querySelectorAll('a[href]')].filter(a => a.matches('a[href]'));
              const up = b.closest('[data-for], section, article') || b; const ext = [...up.querySelectorAll('a[href]')];
              return { t: b.innerText.trim().replace(/\s+/g, ' ').slice(0, 70), src: own2.some(srcA) || ext.some(srcA), own: own2.map(a => a.getAttribute('href')).slice(0, 3) }; });
          const aa = [...document.querySelectorAll('a[href]')].filter(a => vis(a) || a.closest('details')).map(a => a.href).filter(h => /^https?:/.test(h));
          const qfTime = (q('#quick-facts time') || {}).dateTime || '';
          return { title: document.title, desc: c('meta[name=description]'), ogt: c('meta[property="og:title"]'), ogd: c('meta[property="og:description"]'), ogi: c('meta[property="og:image"]'), ogu: c('meta[property="og:url"]'), canon: (q('link[rel=canonical]') || {}).href || '', ld, qfTime, text: main.innerText, blocks, aa, picker: pickerIds };
        });
        if (!p.includes('?')) check(`/${p} lake picker lists all ${IDS.length} waters`, IDS.every(i => m.picker.includes(i)), m.picker.slice(0, 200));
        check(`/${p} title, description, OG, canonical`, m.title && m.desc && m.ogt && m.ogd && m.ogi && m.ogu && m.canon.startsWith(SITE), `${m.title} | canon ${m.canon} | og:image ${m.ogi}`);
        if (m.ogi) { const r = await fetch(m.ogi.replace(SITE, BASE)).catch(() => null); check(`/${p} og:image serves`, r && r.status === 200, m.ogi + ' ' + (r && r.status)); }
        check(`/${p} JSON-LD parses`, m.ld.every(x => !x.__bad), JSON.stringify(m.ld.filter(x => x.__bad)));
        if (!p.includes('?')) {
          const wp = m.ld.flat().find(x => x['@type'] === 'WebPage') || {};
          const qf = (QF[lake] || {}).checked;
          check(`/${p} Quick facts present, WebPage dateModified = checked`, !!m.qfTime && m.qfTime === qf && wp.dateModified === qf, `qf ${m.qfTime} json ${qf} ld ${wp.dateModified}`);
        }
        const dash = m.text.match(/.{0,30}\S [-–—] \S.{0,30}/g) || [];
        check(`/${p} no spaced dashes`, dash.length === 0, dash.slice(0, 3).join(' || '));
        const county = m.text.match(/.{0,25}\bCount(y|ies)\b(?! R(oa)?d).{0,25}/g) || [];
        check(`/${p} no county names`, county.length === 0, county.slice(0, 3).join(' || '));
        const bk = m.text.match(/.{0,25}\bBuckeye\b(?! (Lake|Trail|State))(?!-).{0,25}/g) || [];
        check(`/${p} Buckeye Lake in full`, bk.length === 0, bk.slice(0, 3).join(' || '));
        const nosrc = m.blocks.filter(b => !b.src);
        check(`/${p} every data block has a source link (${m.blocks.length} blocks)`, nosrc.length === 0, nosrc.map(b => b.t + ' [' + b.own.join(',') + ']').join(' || '));
        for (const h of m.aa) { const u = h.split('#')[0]; if (!links.has(u)) links.set(u, p); }
      }
      if (w === 390 || w === 1280) await page.screenshot({ path: `${OUT}${w}-${p.replace(/[\/?=]/g, '_')}.png` }).catch(() => {});
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  // link check
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
  const list = [...links.keys()].filter(u => !NA.PATTERN.test(u));
  const one = async u => {
    for (const method of ['HEAD', 'GET']) {
      try { const r = await fetch(u, { method, redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) }); if (method === 'HEAD' && r.status >= 400) continue; return r.status; } catch (e) { if (method === 'GET') return 'ERR ' + (e.cause && e.cause.code || e.name); }
    }
  };
  let i = 0; const res = [];
  await Promise.all(Array.from({ length: 8 }, async () => { while (i < list.length) { const u = list[i++]; res.push([u, await one(u)]); } }));
  for (const [u, s] of res.sort()) {
    const internal = u.startsWith(BASE) || u.startsWith(SITE);
    if (internal) check(`link ${u} (from /${links.get(u)})`, s === 200, s);
    else if (s === 404 || s === 410) check(`outside link ${u} (from /${links.get(u)})`, false, s);
    else if (s !== 200) note(`outside link ${u} answered ${s} (from /${links.get(u)})`);
    else results.push('PASS outside link ' + u);
  }
  const pass = results.filter(r => r.startsWith('PASS')).length;
  const sum = `check-waters ${BASE} [${IDS.join(',')}]: ${pass} pass, ${fails} fail, ${list.length} links`;
  fs.writeFileSync(OUT + 'check-waters.log', results.join('\n') + '\n' + sum + '\n');
  console.log(results.filter(r => !r.startsWith('PASS')).join('\n')); console.log(sum);
  process.exit(fails ? 1 : 0);
})();
