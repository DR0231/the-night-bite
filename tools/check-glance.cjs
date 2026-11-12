// The Night Bite: check the "Tonight at a glance" strip on every lake home at phone, tablet and desktop widths.
// Usage: node tools/check-glance.cjs [BASE] [OUTDIR]   (lakes from js/lakes.js, other pages from sitemap.xml)
//   BASE defaults to the preview (https://dr0231.github.io/night-bite-preview/); OUTDIR gets the log and a Hoover phone shot.
// Blocks analytics and the visits counter (tools/no-analytics.cjs). Checks per lake and width: 4 cells plus the bite,
// the right source links (gauge, NWS) or a "No gauge" state linked to the pool card note, sunset filled, no sideways scroll, no console or CSP
// errors. Then NWS blocked (wind says "Check NWS", bite "Needs forecast", page fine), the share image with the gauges
// blocked (it prints the snapshot reading's own time), and offline after one visit (the service worker copy still fills
// the strip). Exit code 1 on any FAIL. APIs blocked and JavaScript off: tools/check-glance-fallback.cjs.
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));   // PLAYWRIGHT_CORE, then node_modules, then the box copy
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const BASE = (process.argv[2] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = (process.argv[3] || '/workspace/nb-glance').replace(/\/?$/, '/');
const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
const SIZES = [[390, 844, 'phone'], [820, 1180, 'tablet'], [1280, 800, 'desktop']];
// lakes, which have no gauge and which have a USGS temp gauge: all from js/lakes.js (tools/registry.cjs)
const R = require('./registry.cjs');
// NB_LAKES=a,b limits the per-lake pass to those lakes (check-all.py sets it from its lake scope); default every lake
const ONLY = (process.env.NB_LAKES || '').split(',').filter(Boolean);
const LAKES = ONLY.length ? R.order().filter(l => ONLY.includes(l)) : R.order(), NOGAUGE = R.noGauge(), TEMP = R.hasTemp();
const home = l => BASE + R.home(l);
// the analytics beacon we block ourselves logs ERR_BLOCKED_BY_CLIENT; ignore that line only when every failed request was ours
const realErrs = (errs, rf) => errs.filter(e => !(/ERR_BLOCKED_BY_CLIENT/.test(e) && rf.length && rf.every(u => NA.PATTERN.test(u))));
const watch = page => { const errs = [], rf = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('requestfailed', r => rf.push(r.url())); return () => realErrs(errs, rf); };
const lines = []; let fails = 0;
const check = (n, ok, info) => { lines.push((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + info : '')); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function read(page) {
  return page.evaluate(() => {
    const g = document.getElementById('glance'); if (!g) return null;
    const cell = k => { const a = g.querySelector('[data-cell="' + k + '"]'); return a && {
      href: a.getAttribute('href'), target: a.getAttribute('target'), empty: a.hasAttribute('data-empty'), none: a.hasAttribute('data-none'),
      v: a.querySelector('.glance-value').textContent.trim(), s: a.querySelector('.glance-sub').textContent.trim(), l: (a.querySelector('.glance-label') || {}).textContent,
      h: Math.round(a.getBoundingClientRect().height), w: Math.round(a.getBoundingClientRect().width),
      over: [...a.querySelectorAll('.glance-value')].some(e => e.scrollWidth > e.clientWidth + 1) }; };
    const b = g.querySelector('.glance-bite');
    return { title: g.querySelector('.glance-title').textContent.trim(), pool: cell('pool'), temp: cell('temp'), sunset: cell('sunset'), wind: cell('wind'),
      bite: b && b.querySelector('.glance-value').textContent.trim(), cells: g.querySelectorAll('.glance-grid .glance-cell').length,
      top: Math.round(g.getBoundingClientRect().top + scrollY), height: Math.round(g.getBoundingClientRect().height),
      sideways: document.documentElement.scrollWidth > innerWidth + 1, cond: document.getElementById('conditions').getAttribute('data-state') };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: NA.args(['--no-sandbox']) });
  for (const [w, h, name] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: name === 'phone' ? 3 : 1, isMobile: name === 'phone', hasTouch: name === 'phone', userAgent: name === 'phone' ? UA_IOS : undefined, serviceWorkers: 'block' });
    await NA.block(ctx);
    for (const lake of LAKES) {
      const page = await ctx.newPage(); const errsNow = watch(page);
      await page.goto(home(lake) + '?t=' + Date.now(), { waitUntil: 'load' });
      await page.waitForFunction(() => { const c = document.getElementById('conditions'); return c && c.getAttribute('data-state') !== 'loading'; }, null, { timeout: 20000 }).catch(() => {});
      await sleep(2500);
      const r = await read(page); const t = `${lake} ${name}`;
      if (!r) { check(t + ' strip present', false); await page.close(); continue; }
      check(t + ' title + 4 cells + bite', r.title === 'Tonight at a glance' && r.cells === 4 && !!r.bite, `${r.title} / ${r.cells} / bite ${r.bite}`);
      if (NOGAUGE.includes(lake)) {
        check(t + ' level: "No gauge" state, linked to the pool card note', (R.lakes()[lake].pool.stale ? r.pool.v === 'No reading' && r.pool.s === 'Gauge not reporting' : r.pool.v === 'No gauge' && r.pool.s === 'No public gauge') && /#pool-snapshot$/.test(r.pool.href || ''), JSON.stringify([r.pool.v, r.pool.s, r.pool.href]));
      } else {
        check(t + ' level from gauge, links to gauge', /^\d+\.\d+ ft$/.test(r.pool.v) && /waterdata\.usgs\.gov|water\.usace\.army\.mil/.test(r.pool.href || '') && r.pool.target === '_blank', JSON.stringify([r.pool.v, r.pool.s, r.pool.href]));
      }
      const PL = R.lakes()[lake].pool || {};
      if (!PL.temp && PL.outflow) check(t + ' outflow temp from USACE, labelled outflow, links to the Corps feed', (/^-?\d+ °F$/.test(r.temp.v) || r.temp.v === 'No reading' || r.temp.v === 'Check gauge') && r.temp.l === 'Outflow temp' && r.temp.href === PL.outflow.url, JSON.stringify([r.temp.l, r.temp.v, r.temp.s, r.temp.href]));
      else if (!PL.temp && PL.profile) check(t + ' water temp: "Profile only", dated, linked to the Corps profile', r.temp.v === 'Profile only' && r.temp.s === 'Corps, ' + PL.profile.short && r.temp.href === PL.profile.url, JSON.stringify([r.temp.v, r.temp.s, r.temp.href]));
      else if (TEMP.includes(lake)) check(t + ' water temp from USGS, links to gauge', (/^-?\d+ °F$/.test(r.temp.v) || r.temp.v === 'No reading') && /waterdata\.usgs\.gov/.test(r.temp.href || ''), JSON.stringify([r.temp.v, r.temp.s, r.temp.href]));
      else check(t + ' water temp: "No gauge" state, linked to the pool card note', r.temp.v === 'No gauge' && r.temp.s === 'No public gauge' && /#pool-snapshot$/.test(r.temp.href || ''), JSON.stringify([r.temp.v, r.temp.s, r.temp.href]));
      check(t + ' sunset filled', /^\d{1,2}:\d{2} (AM|PM)( [A-Z][a-z]{2})?$/.test(r.sunset.v.replace(/\s+/g, ' ')), JSON.stringify([r.sunset.v, r.sunset.s, r.sunset.href]));
      check(t + ' wind from NWS, links to NWS page', (/mph|Calm/.test(r.wind.v) || r.wind.v === 'Check NWS') && /forecast\.weather\.gov\/MapClick/.test(r.wind.href || ''), JSON.stringify([r.wind.v, r.wind.s, r.wind.href]));
      const hs = [r.pool.h, r.temp.h, r.sunset.h, r.wind.h];
      check(t + ' equal cell heights (1px row rule), no clipped values', Math.max(...hs) - Math.min(...hs) <= 1 && ![r.pool, r.temp, r.sunset, r.wind].some(c => c.over), hs.join(','));
      check(t + ' no sideways scroll', !r.sideways);
      // S4: the "How the bite is rated" explainer lists the same inputs and numbers as RULES in js/conditions.js
      const bx = await page.evaluate(() => {
        const R = window.NightBiteBiteRules, d = document.getElementById('bite-how'); if (!R || !d) return { missing: !R ? 'RULES' : '#bite-how' };
        const get = p => p.split('.').reduce((o, k) => o == null ? undefined : o[k], R);
        const fmt = (el, v) => el.getAttribute('data-fmt') === 'pct' ? Math.round(v * 100) + '%' : /\.pts\./.test(el.getAttribute('data-r')) ? (v > 0 ? '+' + v : v < 0 ? '\u2212' + Math.abs(v) : '0') : String(v);
        const bad = [...d.querySelectorAll('[data-r]')].filter(el => { const v = get(el.getAttribute('data-r')); return typeof v !== 'number' || fmt(el, v) !== el.textContent.trim(); })
          .map(el => el.getAttribute('data-r') + '=' + el.textContent.trim());
        const pts = []; const walk = (o, pre) => Object.keys(o).forEach(k => typeof o[k] === 'object' && !Array.isArray(o[k]) ? walk(o[k], pre + k + '.') : typeof o[k] === 'number' && pts.push(pre + k)); walk(R, '');
        const shown = new Set([...d.querySelectorAll('[data-r]')].map(el => el.getAttribute('data-r')));
        const glance = document.querySelector('#glance .glance-bite');
        return { inputs: [...d.querySelectorAll('[data-rule]')].map(li => li.getAttribute('data-rule')).join(','), want: R.inputs.join(','), bad, unshown: pts.filter(p => !shown.has(p)),
          tonight: (d.querySelector('[data-bite-tonight]') || {}).textContent || '', link: glance ? /#bite-how$/.test(glance.getAttribute('href') || '') : false };
      });
      check(t + ' bite explainer: same inputs as RULES', !bx.missing && bx.inputs === bx.want, bx.missing || bx.inputs + ' vs ' + bx.want);
      check(t + ' bite explainer: every RULES number shown and matching', !bx.missing && !bx.bad.length && !bx.unshown.length, bx.missing || JSON.stringify({ bad: bx.bad, unshown: bx.unshown }));
      check(t + ' bite explainer: tonight line filled, glance Bite links to it', !bx.missing && /^Tonight: /.test(bx.tonight) && bx.link, bx.missing || bx.tonight);
      const errs = errsNow();
      check(t + ' no console or CSP errors', errs.length === 0, errs.join(' | ').slice(0, 300));
      if (lake === 'hoover' && name === 'phone') {
        const el = await page.$('#glance');
        await page.evaluate(() => scrollTo(0, Math.max(0, document.getElementById('glance').getBoundingClientRect().top + scrollY - 120)));
        await el.screenshot({ path: OUT + 'hoover-phone.png' });
        await page.screenshot({ path: OUT + 'hoover-phone-full-screen.png' });
        lines.push(`INFO hoover phone strip top ${r.top}px, height ${r.height}px`);
      }
      await page.close();
    }
    await ctx.close();
  }
  // other pages: no strip, no console or CSP errors, no sideways scroll
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }); await NA.block(ctx);
    // every sitemap page that is not a lake home (the game excluded), plus the shared pages for the newest lake and a no gauge lake
    const last = LAKES[LAKES.length - 1], ng = NOGAUGE[0];
    const others = R.sitemapPaths().filter(p => !R.isLakeHome(p) && !/^whisperwood/.test(p))
      .concat(['water?lake=' + last, 'stocking?lake=' + last, 'species/?lake=' + last], ng && ng !== last ? ['water?lake=' + ng] : []);
    for (const u of others) {
      const page = await ctx.newPage(); const errsNow = watch(page);
      const res = await page.goto(BASE + u, { waitUntil: 'load' }).catch(() => null);
      await sleep(1500); const errs = errsNow();
      const r = await page.evaluate(() => ({ g: !!document.getElementById('glance'), side: document.documentElement.scrollWidth > innerWidth + 1 }));
      check(`other page ${u}: loads, no strip, no sideways scroll, no errors`, !!res && res.status() < 400 && !r.g && !r.side && errs.length === 0, (res ? res.status() : 'no response') + ' ' + errs.join(' | ').slice(0, 200));
      await page.close();
    }
    await ctx.close();
  }
  // NWS down: wind says so, everything else still fills, no page errors
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); await NA.block(ctx);
    await ctx.route(/api\.weather\.gov/, r => r.abort('failed'));
    for (const lake of ['hoover', 'knox']) {
      const page = await ctx.newPage(); const perr = [];
      page.on('pageerror', e => perr.push(e.message));
      await page.goto(home(lake) + '?t=' + Date.now()); await sleep(5000);
      const r = await read(page);
      check(`NWS blocked ${lake}: wind says Check NWS / NWS not reachable, link kept`, r.wind.v === 'Check NWS' && r.wind.s === 'NWS not reachable' && /forecast\.weather\.gov/.test(r.wind.href || ''), JSON.stringify([r.wind.v, r.wind.s, r.cond]));
      check(`NWS blocked ${lake}: bite says Needs forecast, never --`, r.bite === 'Needs forecast', r.bite);
      check(`NWS blocked ${lake}: sunset still filled, no script errors`, /\d:\d\d/.test(r.sunset.v) && perr.length === 0, r.sunset.v + ' ' + perr.join('|'));
      await page.close();
    }
    await ctx.close();
  }
  // share image with USGS and NWS blocked: the card shows its snapshot, and the image must print that reading's own
  // time (the pool card's Checked time), never pass it off as tonight's (F2)
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }); await NA.block(ctx);
    await ctx.route(/api\.waterdata\.usgs\.gov|waterservices\.usgs\.gov|cwms-data\.usace\.army\.mil|api\.weather\.gov/, r => r.abort('failed'));
    const page = await ctx.newPage(); const perr = []; page.on('pageerror', e => perr.push(e.message));
    await page.goto(home('hoover') + '?t=' + Date.now()); await sleep(3500);
    const at = await page.evaluate(() => { const t = document.querySelector('#correction-checked time'); return t ? t.getAttribute('datetime') : ''; });
    const want = at ? new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }, Date.now() - Date.parse(at) >= 6 * 864e5 ? { month: 'short', day: 'numeric' } : { weekday: 'short' })).format(new Date(at)) + ' ET' : '--';
    await page.click('[data-act="share"]');
    const alt = await page.waitForFunction(() => { const i = document.getElementById('tt-share-img'); return i && i.getAttribute('src') && i.getAttribute('alt'); }, null, { timeout: 15000 })
      .then(h => h.jsonValue()).catch(() => '');
    check('share image (gauges blocked): carries the reading\'s own time', alt.includes('(reading ' + want + ')'), JSON.stringify([want, alt]));
    check('share image (gauges blocked): no script errors', perr.length === 0, perr.join('|'));
    await ctx.close();
  }
  // offline after one visit: the service worker copy shows the strip, saved values or quiet notes
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await NA.block(ctx);
    const page = await ctx.newPage();
    await page.goto(home('hoover')); await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
    await page.reload(); await sleep(5000);
    await ctx.setOffline(true);
    const perr = []; page.on('pageerror', e => perr.push(e.message));
    await page.reload().catch(e => perr.push('reload ' + e.message)); await sleep(4000);
    const r = await read(page);
    check('offline hoover: strip renders from the service worker', !!r && r.cells === 4, r ? JSON.stringify([r.pool.v, r.temp.v, r.sunset.v, r.wind.v, r.wind.s]) : 'no strip');
    check('offline hoover: sunset filled, no script errors', !!r && /\d:\d\d/.test(r.sunset.v) && perr.length === 0, perr.join('|'));
    await ctx.close();
  }
  await browser.close();
  lines.push(`${fails ? 'FAILED' : 'ALL PASSED'}: ${lines.filter(l => l.startsWith('PASS')).length} pass, ${fails} fail`);
  fs.writeFileSync(OUT + 'check-glance.log', lines.join('\n') + '\n');
  console.log(lines.filter(l => !l.startsWith('PASS')).join('\n'));
  process.exit(fails ? 1 : 0);
})();
