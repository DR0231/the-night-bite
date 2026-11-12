#!/usr/bin/env node
/* Water picker and lake switching, end to end (every lake home ships only its own lake, so switching is a page load):
 *   node tools/check-picker-flow.cjs <base> [outDir]      e.g. http://127.0.0.1:8765/night-bite-preview/
 * Root picker: first visit shows the picker; search (name, town), empty state and its clear button; region chip;
 * Enter opens the match and saves it; a return visit goes straight to the saved water; ?pick shows the picker with a
 * "Last picked" tile; a tile saves its water; "Just browsing" opens hoover/?browse and saves nothing; a shared lake link
 * saves that lake; with JavaScript off the tiles are plain links.
 * Lake switching on a lake home (header pill, at 390 and 1280): the sheet opens, the row for another lake goes to that
 * lake's own address, the new page shows that lake's H1 and only its own chart and blocks, and it becomes the saved lake.
 * Prints PASS/FAIL lines (check-all counts FAIL lines); exit 1 on any FAIL. Analytics blocked (tools/no-analytics.cjs).
 */
const path = require('path');
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));   // PLAYWRIGHT_CORE, then node_modules, then the box copy
const { chromium } = require(PW);
const na = require(path.join(__dirname, 'no-analytics.cjs'));
const B = (process.argv[2] || 'http://127.0.0.1:8765/night-bite-preview/').replace(/\/?$/, '/');
let fails = 0, passes = 0;
function ok(name, cond, info) {
  if (cond) passes++; else fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' :: ' + JSON.stringify(info) : ''));
}
const vis = p => p.$$eval('.wp-grid .wp-item:not([hidden]) .wp-name', a => a.map(x => x.textContent));
const saved = p => p.evaluate(() => localStorage.getItem('nb-lake'));
const lakeOf = u => (new URL(u).pathname.replace(/^\/night-bite-preview/, '').match(/^\/([a-z]+)\//) || [])[1] || '';
const isolation = p => p.evaluate(() => {
  const id = document.documentElement.dataset.lake;
  const foreign = [...document.querySelectorAll('[data-for]')].filter(e => !e.getAttribute('data-for').split(' ').includes(id)).length;
  const charts = [...document.querySelectorAll('img[src*="-chart.png"]')].map(i => i.getAttribute('src'));
  return { id, foreign, charts, h1: (document.querySelector('h1') || {}).textContent };
});

(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: na.args() });
  const errs = [];
  // ---- root picker, phone
  {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await na.block(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('root: ' + e.message));
    await p.goto(B, { waitUntil: 'load' });
    ok('first visit shows the picker', lakeOf(p.url()) === '' && (await p.textContent('h1')).trim().length > 0, p.url());
    ok('first visit: every tile shown', (await vis(p)).length >= 20, (await vis(p)).length);
    const lazy = await p.$$eval('.wp-grid img', a => a.map(i => i.getAttribute('loading')));
    ok('picker: first row eager, rest lazy', lazy.slice(0, 4).every(x => x !== 'lazy') && lazy.slice(4).every(x => x === 'lazy'), lazy.slice(0, 6));
    await p.click('.wp-browse-link'); await p.waitForURL(/hoover\//); await p.waitForLoadState();
    ok('Just browsing opens hoover/ and saves nothing', (await saved(p)) === null, await saved(p));
    await p.goto(B, { waitUntil: 'load' });
    ok('root after browsing still shows the picker', lakeOf(p.url()) === '', p.url());
    await p.fill('#wp-search', 'berl'); ok('search by name', (await vis(p)).join() === 'Berlin Lake', await vis(p));
    await p.fill('#wp-search', 'mt. sterling'); ok('search by town', (await vis(p)).length === 1, await vis(p));
    await p.fill('#wp-search', 'zzz'); ok('empty state shows', await p.isVisible('.wp-empty'));
    await p.click('.wp-empty-clear'); ok('empty state clear shows every water', (await vis(p)).length >= 20);
    await p.click('.wp-chip[data-chip="northeast"]');
    const ne = await vis(p); ok('region chip filters', ne.length > 0 && ne.length < 20, ne);
    await p.click('.wp-chip[data-chip="all"]');
    await p.fill('#wp-search', 'salt'); await p.press('#wp-search', 'Enter'); await p.waitForURL(/saltfork\//);
    ok('Enter opens the match and saves it', (await saved(p)) === 'saltfork', await saved(p));
    await p.goto(B); await p.waitForURL(/saltfork\//);
    ok('return visit goes to the saved water', lakeOf(p.url()) === 'saltfork', p.url());
    await p.goto(B + '?pick', { waitUntil: 'load' });
    ok('?pick shows the picker with Last picked', lakeOf(p.url()) === '' &&
      (await p.$$eval('.wp-last .wp-name', a => a.map(x => x.textContent))).join() === 'Salt Fork Lake');
    await p.click('.wp-grid a[data-water="hoover"]'); await p.waitForURL(/hoover\//);
    ok('tile saves its water', (await saved(p)) === 'hoover', await saved(p));
    await p.goto(B + 'berlin/', { waitUntil: 'load' });
    ok('shared lake link saves that lake', (await saved(p)) === 'berlin', await saved(p));
    await ctx.close();
  }
  // ---- lake switching from a lake home, phone and desktop
  for (const vp of [{ width: 390, height: 844, m: true }, { width: 1280, height: 800, m: false }]) {
    const W = vp.width + ': ';
    const ctx = await br.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.m, hasTouch: vp.m, serviceWorkers: 'block' });
    await na.block(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + e.message));
    await p.goto(B + 'hoover/', { waitUntil: 'load' });
    let iso = await isolation(p);
    ok(W + 'hoover/ ships only its own blocks and chart', iso.id === 'hoover' && iso.foreign === 0 && iso.charts.length === 1, iso);
    for (const next of ['alum', 'berlin', 'hoover']) {
      await p.click('.lake-pill'); await p.waitForTimeout(350);
      ok(W + 'pill opens the sheet', await p.$eval('#lake-sheet', d => d.open));
      const link = await p.$(`#lake-sheet a[data-lake="${next}"]`);
      ok(W + 'sheet has a row for ' + next, !!link);
      if (!link) break;
      // its region may be folded (the sheet opens the current lake's region): open it like a person would
      if (await link.evaluate(a => { const d = a.closest('details'); return !!d && !d.open; })) {
        await (await link.evaluateHandle(a => a.closest('details').querySelector('summary'))).click();
        await p.waitForTimeout(200);
      }
      await Promise.all([p.waitForURL(new RegExp('/' + next + '/')), link.click()]);
      await p.waitForLoadState('load');
      iso = await isolation(p);
      ok(W + 'switch to ' + next + ': own address, own content', lakeOf(p.url()) === next && iso.id === next && iso.foreign === 0 &&
        iso.charts.length === 1 && iso.charts[0].includes(next + '-chart'), { url: p.url(), ...iso });
      ok(W + next + ' becomes the saved lake', (await saved(p)) === next, await saved(p));
    }
    await ctx.close();
  }
  // ---- JavaScript off
  {
    const ctx = await br.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await na.block(ctx);
    const q = await ctx.newPage();
    await q.goto(B, { waitUntil: 'load' });
    ok('no JS: picker tiles are plain links', (await q.$$eval('.wp-grid a[href]', a => a.length)) >= 20);
    await q.goto(B + 'alum/', { waitUntil: 'load' });
    const shown = await q.$$eval('[data-for]', a => a.filter(e => getComputedStyle(e).display !== 'none').length);
    const lead = await q.$$eval('p.lead', a => a.filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent.trim().slice(0, 60)));
    ok('no JS: alum/ shows its own lake blocks', shown > 0 && lead.some(t => /Alum Creek/.test(t)) && !lead.some(t => /Hoover/.test(t)), { shown, lead });
    await ctx.close();
  }
  ok('no page errors', errs.length === 0, errs);
  await br.close();
  console.log(`check-picker-flow: ${passes} pass, ${fails} fail`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL crashed: ' + (e && e.stack || e)); process.exit(1); });
