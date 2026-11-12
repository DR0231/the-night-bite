// The Night Bite: the "Tonight at a glance" strip never shows a placeholder. Loads each lake home twice per width:
//   apis-blocked  JavaScript on, USGS, the Corps (CWMS) and NWS all blocked, nothing saved on the phone
//   js-off        JavaScript off (the baked HTML from tools/glance_bake.py on its own)
// at 320 and 430 px wide, and asserts: the strip is visible; no "--", "Loading", "unavailable", "Gauge unavailable" or
// "NWS not available" anywhere in it; every value has text; gauge lakes show a level in ft and a visible stamp with a
// <time> ("last updated X ago" with JavaScript, the absolute date and time without); lakes with no gauge show the
// "No gauge" / "No reading" state linked to the pool card note; the pool card itself never says "unavailable" on a
// gauge lake; nothing in the strip is clipped (no value, sub or stamp wider than its box); no sideways scroll.
// Then water.html?lake=<id> with the gauges blocked: Griggs and Indian Lake (own temp gauge) show their own snapshot
// temp with its time, and no lake in scope keeps Hoover's baked water temp.
// Usage: node tools/check-glance-fallback.cjs [BASE] [OUTDIR] [--lakes a,b]
//   lakes: --lakes, else NB_LAKES (check-all sets it), else hoover,alum,knox,pymatuning (USGS, Corps, no gauge, stale)
// Blocks analytics (tools/no-analytics.cjs). Exit code 1 on any FAIL. Log: OUTDIR/check-glance-fallback.log
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));   // PLAYWRIGHT_CORE, then node_modules, then the box copy
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const R = require('./registry.cjs');
const fs = require('fs');
const argv = process.argv.slice(2);
const li = argv.indexOf('--lakes');
const flagLakes = li >= 0 ? (argv.splice(li, 2)[1] || '') : '';
const BASE = (argv[0] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = (argv[1] || '/workspace/nb-glance-fallback').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const want = (flagLakes || process.env.NB_LAKES || 'hoover,alum,knox,pymatuning').split(',').filter(Boolean);
const LAKES = R.order().filter(l => want.includes(l));
const unknown = want.filter(l => !R.order().includes(l));
const NOGAUGE = R.noGauge();
const WIDTHS = [320, 430];
const BLOCK = /api\.waterdata\.usgs\.gov|waterservices\.usgs\.gov|cwms-data\.usace\.army\.mil|api\.weather\.gov/;
const BAD = /(^|[^\w–-])--([^\w-]|$)|loading|unavailable|nws not available/i;
const lines = []; let fails = 0;
const check = (n, ok, info) => { lines.push((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + info : '')); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function read(page) {
  return page.evaluate(() => {
    const g = document.getElementById('glance'); if (!g) return null;
    const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const clip = e => e && e.scrollWidth > e.clientWidth + 1;
    const cell = k => { const a = g.querySelector('[data-cell="' + k + '"]'); if (!a) return null; const v = a.querySelector('.glance-value'), s = a.querySelector('.glance-sub');
      return { href: a.getAttribute('href') || '', v: v.innerText.trim(), s: s.innerText.trim(), state: v.classList.contains('glance-state'), clip: clip(v) || clip(s) }; };
    const st = g.querySelector('[data-glance="stamp"]'), tm = st && st.querySelector('time');
    const b = g.querySelector('[data-glance="bite"]');
    const line = document.getElementById('correction-line');
    return { visible: vis(g), text: g.innerText, pool: cell('pool'), temp: cell('temp'), sunset: cell('sunset'), wind: cell('wind'),
      bite: b && b.innerText.trim(), biteClip: clip(b),
      stamp: st ? st.innerText.trim() : '', stampVis: vis(st), time: tm ? { dt: tm.getAttribute('datetime'), txt: tm.innerText.trim(), vis: vis(tm) } : null,
      stampClip: st ? st.scrollWidth > st.clientWidth + 1 || st.scrollHeight > st.clientHeight + 1 : false,
      card: line ? line.innerText.trim() : '', sideways: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}

(async () => {
  if (unknown.length) check('lakes known to js/lakes.js', false, unknown.join(','));
  lines.push(`INFO base ${BASE}; lakes ${LAKES.join(',')}; widths ${WIDTHS.join(',')}`);
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: NA.args(['--no-sandbox']) });
  for (const mode of ['apis-blocked', 'js-off']) {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        javaScriptEnabled: mode !== 'js-off', serviceWorkers: 'block' });
      await NA.block(ctx);
      const blocked = [];
      await ctx.route(BLOCK, r => { blocked.push(r.request().url()); return r.abort('failed'); });
      for (const lake of LAKES) {
        const t = `${lake} ${mode} ${w}px`;
        const page = await ctx.newPage(); const perr = [];
        page.on('pageerror', e => perr.push(e.message));
        const res = await page.goto(BASE + R.home(lake) + '?t=' + Date.now(), { waitUntil: 'load' }).catch(e => { perr.push('goto ' + e.message); return null; });
        await sleep(mode === 'js-off' ? 300 : 4500);   // long enough for every blocked fetch to fail and the strip to settle
        const r = res && await read(page);
        if (!r) { check(t + ' strip present', false, res ? 'no #glance' : 'no response'); await page.close(); continue; }
        check(t + ' strip visible', r.visible);
        const bad = BAD.exec(r.text);
        check(t + ' no placeholder text in the strip', !bad, bad ? JSON.stringify(bad[0]) + ' in ' + JSON.stringify(r.text.replace(/\s+/g, ' ').slice(0, 220)) : '');
        const empty = ['pool', 'temp', 'sunset', 'wind'].filter(k => !r[k] || !r[k].v || !r[k].s);
        check(t + ' every cell has a value and a sub', !empty.length && !!r.bite, empty.join(',') + (r.bite ? '' : ' bite'));
        check(t + ' bite says what it needs', r.bite === 'Needs forecast' || /^(Good|Fair|Tough)$/.test(r.bite), r.bite);
        check(t + ' wind points at NWS', /forecast\.weather\.gov/.test(r.wind.href) && (/Check NWS/.test(r.wind.v) || /mph|Calm/.test(r.wind.v)), JSON.stringify([r.wind.v, r.wind.s]));
        if (mode === 'js-off') check(t + ' sunset says JS is off', r.sunset.v === 'JS is off', r.sunset.v);
        else check(t + ' sunset worked out on the phone', /^\d{1,2}:\d{2} (AM|PM)( [A-Z][a-z]{2})?$/.test(r.sunset.v.replace(/\s+/g, ' ')), r.sunset.v.replace(/\s+/g, ' '));   // after today's sunset: "5:15 PM Wed"
        const stale = (R.lakes()[lake].pool || {}).stale;
        if (NOGAUGE.includes(lake)) {
          check(t + ' no gauge: intentional state linked to the pool card note', r.pool.state && (stale ? r.pool.v === 'No reading' : r.pool.v === 'No gauge') && /#pool-snapshot$/.test(r.pool.href) && /#pool-snapshot$/.test(r.temp.href), JSON.stringify([r.pool.v, r.pool.s, r.pool.href]));
          check(t + ' no gauge: the stamp says so', r.stampVis && (stale ? /last reported/.test(r.stamp) : /No public lake level/.test(r.stamp)), r.stamp);
        } else {
          check(t + ' level is the stamped reading in ft', /^\d+\.\d+\s*ft$/.test(r.pool.v) && !r.pool.state, JSON.stringify([r.pool.v, r.pool.s]));
          check(t + ' timestamp visible', r.stampVis && !!r.time && r.time.vis && !!r.time.txt && !isNaN(Date.parse(r.time.dt)), JSON.stringify([r.stamp, r.time]));
          if (mode === 'js-off') check(t + ' no JS: absolute date and time', /last checked/.test(r.stamp) && /^[A-Z][a-z]+\.? \d{1,2}, \d{1,2}(:\d\d)? (AM|PM) ET$/.test(r.time.txt), r.stamp);
          else check(t + ' JS: "last updated X ago" with the date', /last updated (just now|\d+ (min|hours?|days) ago)/.test(r.stamp) && /\(.+ ET\)/.test(r.time.txt), r.stamp);
          check(t + ' pool card keeps the reading', !/unavailable/i.test(r.card) && /\d+\.\d+ ft/.test(r.card), r.card);
        }
        check(t + ' nothing clipped', !['pool', 'temp', 'sunset', 'wind'].some(k => r[k].clip) && !r.biteClip && !r.stampClip,
          ['pool', 'temp', 'sunset', 'wind'].filter(k => r[k].clip).join(',') + (r.biteClip ? ' bite' : '') + (r.stampClip ? ' stamp' : ''));
        check(t + ' no sideways scroll', !r.sideways);
        check(t + ' no script errors', perr.length === 0, perr.join(' | ').slice(0, 300));
        await page.close();
      }
      if (mode === 'apis-blocked') lines.push(`INFO ${w}px: ${blocked.length} gauge and NWS requests blocked`);
      await ctx.close();
    }
  }
  // water.html carries Hoover's baked pool card; with USGS blocked, a lake with its own temp gauge (Griggs, Indian Lake)
  // must show its own snapshot temp with its time, and no other lake may keep Hoover's baked water temp (F3)
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await NA.block(ctx);
    await ctx.route(BLOCK, r => r.abort('failed'));
    const raw = await (await ctx.request.get(BASE + 'water.html')).text();
    const bm = /id="water-temp">([\s\S]*?)<\/span>\s*<\/div>/.exec(raw);
    const hooverTemp = bm ? (/<strong>([^<]+)<\/strong>/.exec(bm[1]) || [])[1] || '' : '';
    const temps = R.hasTemp().filter(l => l !== 'hoover');
    const shared = [...new Set(temps.concat(LAKES.filter(l => l !== 'hoover' && !NOGAUGE.includes(l))))];
    for (const lake of shared) {
      const page = await ctx.newPage(); const perr = []; page.on('pageerror', e => perr.push(e.message));
      await page.goto(BASE + 'water.html?lake=' + lake + '&t=' + Date.now(), { waitUntil: 'load' });
      await sleep(3500);
      const w = await page.evaluate(() => { const e = document.getElementById('water-temp'); const t = e && e.querySelector('time');
        return e ? { txt: e.textContent.replace(/\s+/g, ' ').trim(), at: t ? t.getAttribute('datetime') : '' } : null; });
      const S = (R.lakes()[lake].pool || {}).snapshot || {};
      if (!w) { check(`water.html ${lake}: water temp line present`, false); await page.close(); continue; }
      check(`water.html ${lake}: no Hoover water temp under this lake`, !hooverTemp || !w.txt.includes(hooverTemp), JSON.stringify([hooverTemp, w.txt]));
      if (temps.includes(lake)) check(`water.html ${lake}: its own snapshot temp with its time`, (w.at === S.at && /°F/.test(w.txt)) || w.txt === 'No water temp in the last check', JSON.stringify([w.txt, w.at, S.at]));
      check(`water.html ${lake}: no script errors`, perr.length === 0, perr.join(' | ').slice(0, 300));
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  lines.push(`${fails ? 'FAILED' : 'ALL PASSED'}: ${lines.filter(l => l.startsWith('PASS')).length} pass, ${fails} fail`);
  fs.writeFileSync(OUT + 'check-glance-fallback.log', lines.join('\n') + '\n');
  console.log(lines.filter(l => !l.startsWith('PASS')).join('\n'));
  process.exit(fails ? 1 : 0);
})();
