// check-night-rules (S5): the night-rules chip and the NWS storm banner on lake homes, at 390 px.
// Usage: node tools/check-night-rules.cjs [BASE] [OUTDIR]   lakes from NB_LAKES (default hoover,berlin)
// Per lake: a chip shows exactly when data/quick-facts.json has sourced hours, sits above the fold, links the official
// source, and its countdown reads "Xh Ym left", "Ym left", "After hours now" or "Closed until ..." (or is hidden before
// noon for sunset-only hours). Red light and high contrast: chip still visible with readable text. Then a mocked
// api.weather.gov alert (Severe Thunderstorm Warning + a Special Weather Statement naming thunderstorms) must show the
// banner above the fold with the warning first and "plus 1 more". No network for alerts; analytics blocked.
// Exit 1 on any FAIL. No screenshots.
const PW = process.env.PLAYWRIGHT_CORE || '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core';
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const R = require('./registry.cjs');
const fs = require('fs'), path = require('path');
const BASE = (process.argv[2] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = process.argv[3] || '/tmp/nb-night-rules'; fs.mkdirSync(OUT, { recursive: true });
const LAKES = (process.env.NB_LAKES || 'hoover,berlin').split(',').filter(Boolean);
const QF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'quick-facts.json'), 'utf8')).lakes;
let pass = 0, fail = 0; const log = [];
function ok(name, cond, info) { if (cond) pass++; else fail++; const l = (cond ? 'PASS ' : 'FAIL ') + name + (cond || !info ? '' : ' :: ' + info); log.push(l); console.log(l); }
const LEFT = /^(\d+h \d+m left|\d+m left|After hours now|Closed until \d{1,2}(:\d\d)? [ap]\.m\.)$/;
const future = new Date(Date.now() + 3 * 3600e3).toISOString();
const ALERTS = { features: [
  { properties: { id: 'a1', event: 'Severe Thunderstorm Warning', status: 'Actual', messageType: 'Alert', ends: future, areaDesc: 'x' } },
  { properties: { id: 'a2', event: 'Special Weather Statement', status: 'Actual', messageType: 'Alert', headline: 'Strong thunderstorms', description: 'Lightning and gusts', expires: future, areaDesc: 'x' } },
  { properties: { id: 'a3', event: 'Special Weather Statement', status: 'Actual', messageType: 'Alert', headline: 'Patchy fog', description: 'Fog', expires: future, areaDesc: 'x' } } ] };

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: NA.args(['--no-sandbox']) });
  for (const lake of LAKES) {
    const H = QF[lake] && QF[lake].hours; const want = !!(H && !H.none);
    for (const mode of ['', 'red', 'contrast']) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
      await NA.block(ctx);
      if (mode) await ctx.addInitScript(m => { try { localStorage.setItem('nb-a11y', JSON.stringify(m === 'red' ? { light: 'red' } : { contrast: 'more' })); } catch (e) {} }, mode);
      const mock = mode === '';
      await ctx.route(/api\.weather\.gov\/alerts/, r => r.fulfill({ status: 200, contentType: 'application/geo+json', body: JSON.stringify(mock ? ALERTS : { features: [] }) }));
      const p = await ctx.newPage();
      const url = BASE + R.home(lake);
      await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1200);
      const W = `${lake}${mode ? ' [' + mode + ']' : ''}: `;
      const c = await p.evaluate(() => { const e = document.getElementById('night-rules'); if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e), l = e.querySelector('[data-nr="left"]');
        return { top: r.top, bottom: r.bottom, w: r.width, href: e.href, text: e.textContent.replace(/\s+/g, ' ').trim(), left: l.hidden ? null : l.textContent, color: s.color, bg: s.backgroundColor, light: document.documentElement.getAttribute('data-light') || '', contrast: document.documentElement.getAttribute('data-contrast') || '', sw: document.documentElement.scrollWidth }; });
      if (!want) { ok(W + 'no chip without sourced hours', c === null, JSON.stringify(c)); }
      else {
        ok(W + 'chip present', !!c);
        if (c) {
          ok(W + 'chip above the fold at 390', c.top >= 0 && c.bottom <= 844 && c.w > 0, `${c.top}-${c.bottom}`);
          ok(W + 'chip links the official source', c.href === H.source[1], c.href);
          ok(W + 'chip text is the data text', c.text.startsWith(H.chip), c.text);
          const sunsetMorning = H.close === 'sunset' && c.left === null;
          ok(W + 'countdown state', (H.open === null && c.left === null) || sunsetMorning || LEFT.test(c.left || ''), String(c.left));
          ok(W + 'no sideways scroll', c.sw <= 390, String(c.sw));
          if (mode === 'red') ok(W + 'red light applied and chip text not cream', c.light === 'red' && c.color !== 'rgb(245, 237, 216)', c.light + ' ' + c.color);
          if (mode === 'contrast') ok(W + 'high contrast applied', c.contrast === 'more', c.contrast);
        }
      }
      if (mock) {
        const a = await p.evaluate(() => { const e = document.querySelector('.nws-alert'); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, text: e.textContent }; });
        ok(W + 'storm banner shows', !!a);
        if (a) {
          ok(W + 'banner above the fold at 390', a.top >= 0 && a.bottom <= 844, `${a.top}-${a.bottom}`);
          ok(W + 'warning first, statement counted, fog statement dropped', /^Severe Thunderstorm Warning/.test(a.text) && /plus 1 more/.test(a.text), a.text);
        }
      }
      await ctx.close();
    }
  }
  await b.close();
  const sum = `check-night-rules: ${pass} pass, ${fail} fail`;
  console.log(sum); fs.writeFileSync(path.join(OUT, 'check-night-rules.log'), log.concat(sum).join('\n') + '\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
