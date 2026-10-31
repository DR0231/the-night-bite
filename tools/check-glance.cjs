// The Night Bite: check the "Tonight at a glance" strip on every lake home at phone, tablet and desktop widths.
// Usage: node tools/check-glance.cjs [BASE] [OUTDIR]
//   BASE defaults to the preview (https://dr0231.github.io/night-bite-preview/); OUTDIR gets the log and a Hoover phone shot.
// Blocks analytics and the visits counter (tools/no-analytics.cjs). Checks per lake and width: 4 cells plus the bite,
// the right source links (gauge, NWS) or a quiet "No public gauge", sunset filled, no sideways scroll, no console or CSP
// errors. Then NWS blocked (wind says so, page fine), and offline after one visit (the service worker copy still fills
// the strip). Exit code 1 on any FAIL.
const PW = process.env.PLAYWRIGHT_CORE || '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core';
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const BASE = (process.argv[2] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = (process.argv[3] || '/workspace/nb-glance').replace(/\/?$/, '/');
const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
const SIZES = [[390, 844, 'phone'], [820, 1180, 'tablet'], [1280, 800, 'desktop']];
const LAKES = ['hoover', 'alum', 'buckeye', 'oshaughnessy', 'griggs', 'indian', 'delaware', 'deercreek', 'madison', 'knox', 'clearfork', 'seneca', 'dillon', 'logan', 'saltfork', 'burroak', 'dow'];
const NOGAUGE = ['madison', 'knox', 'clearfork', 'logan', 'saltfork', 'dow'];
const TEMP = ['hoover', 'griggs', 'indian'];
const home = l => BASE + (l === 'hoover' ? '' : l + '/');
const lines = []; let fails = 0;
const check = (n, ok, info) => { lines.push((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + info : '')); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function read(page) {
  return page.evaluate(() => {
    const g = document.getElementById('glance'); if (!g) return null;
    const cell = k => { const a = g.querySelector('[data-cell="' + k + '"]'); return a && {
      href: a.getAttribute('href'), target: a.getAttribute('target'), empty: a.hasAttribute('data-empty'), none: a.hasAttribute('data-none'),
      v: a.querySelector('.glance-value').textContent.trim(), s: a.querySelector('.glance-sub').textContent.trim(),
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
      const page = await ctx.newPage(); const errs = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => errs.push('pageerror ' + e.message));
      await page.goto(home(lake) + '?t=' + Date.now(), { waitUntil: 'load' });
      await page.waitForFunction(() => { const c = document.getElementById('conditions'); return c && c.getAttribute('data-state') !== 'loading'; }, null, { timeout: 20000 }).catch(() => {});
      await sleep(2500);
      const r = await read(page); const t = `${lake} ${name}`;
      if (!r) { check(t + ' strip present', false); await page.close(); continue; }
      check(t + ' title + 4 cells + bite', r.title === 'Tonight at a glance' && r.cells === 4 && !!r.bite, `${r.title} / ${r.cells} / bite ${r.bite}`);
      if (NOGAUGE.includes(lake)) {
        check(t + ' level: quiet no gauge, no link', r.pool.v === '--' && r.pool.s === 'No public gauge' && r.pool.href === null, JSON.stringify([r.pool.v, r.pool.s, r.pool.href]));
      } else {
        check(t + ' level from gauge, links to gauge', /^\d+\.\d+ ft$/.test(r.pool.v) && /waterdata\.usgs\.gov|water\.usace\.army\.mil/.test(r.pool.href || '') && r.pool.target === '_blank', JSON.stringify([r.pool.v, r.pool.s, r.pool.href]));
      }
      if (TEMP.includes(lake)) check(t + ' water temp from USGS, links to gauge', (/^-?\d+ °F$/.test(r.temp.v) || r.temp.s === 'No reading right now') && /waterdata\.usgs\.gov/.test(r.temp.href || ''), JSON.stringify([r.temp.v, r.temp.s, r.temp.href]));
      else check(t + ' water temp: quiet no temp gauge, no link', r.temp.v === '--' && r.temp.s === 'No public temp gauge' && r.temp.href === null, JSON.stringify([r.temp.v, r.temp.s]));
      check(t + ' sunset filled', /^\d{1,2}:\d{2} (AM|PM)$/.test(r.sunset.v), JSON.stringify([r.sunset.v, r.sunset.s, r.sunset.href]));
      check(t + ' wind from NWS, links to NWS page', (/mph|Calm/.test(r.wind.v) || r.wind.s === 'NWS not available') && /forecast\.weather\.gov\/MapClick/.test(r.wind.href || ''), JSON.stringify([r.wind.v, r.wind.s, r.wind.href]));
      const hs = [r.pool.h, r.temp.h, r.sunset.h, r.wind.h];
      check(t + ' equal cell heights (1px row rule), no clipped values', Math.max(...hs) - Math.min(...hs) <= 1 && ![r.pool, r.temp, r.sunset, r.wind].some(c => c.over), hs.join(','));
      check(t + ' no sideways scroll', !r.sideways);
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
    for (const u of ['water', 'species/', 'species/saugeye', 'gear', 'log', 'about', 'updates', 'docks', 'stocking', 'ice', 'tournaments', 'privacy', 'water?lake=knox', 'water?lake=seneca', 'water?lake=dow', 'stocking?lake=saltfork', 'species/?lake=burroak']) {
      const page = await ctx.newPage(); const errs = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => errs.push('pageerror ' + e.message));
      const res = await page.goto(BASE + u, { waitUntil: 'load' }).catch(() => null);
      await sleep(1500);
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
      check(`NWS blocked ${lake}: wind says NWS not available, link kept`, r.wind.v === '--' && r.wind.s === 'NWS not available' && /forecast\.weather\.gov/.test(r.wind.href || ''), JSON.stringify([r.wind.v, r.wind.s, r.cond]));
      check(`NWS blocked ${lake}: sunset still filled, no script errors`, /\d:\d\d/.test(r.sunset.v) && perr.length === 0, r.sunset.v + ' ' + perr.join('|'));
      await page.close();
    }
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
