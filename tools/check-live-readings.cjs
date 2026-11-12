// The Night Bite: a visitor never sees a stale, saved or borrowed gauge reading presented as current (the Nov. 12, 2026
// live-integrity review, F1 to F5 and F10 to F13). Loads Hoover's home page with the gauges answered by fake
// responses (Playwright routes; nothing real is fetched from USGS, the Corps or NWS) and checks what the pool card,
// the glance strip, the bite rating ("Tonight, in short" and the explainer) and the share image say:
//   fresh          level and temp 30 min old: tagged live, temp shared with the bite rating (the control)
//   stale-9d       F1: the gauge's newest level and temp are 9 days old: shown plainly with their time, never "live",
//                  no water temp in the bite rating; the share image prints the reading's own time
//   old-temp       F1: fresh level, 3-week-old temp: level live, temp out of the pool line and the bite rating, the
//                  temp detail says "last reading" with its date
//   temp-only      F4: a temp but no level: the pool line and its Checked time stay as they were, never tagged live
//   saved          F5: USGS down, a 2-day-old reading saved on the phone: shown as saved, never shared with the bite rating
//   temp-4h        F5: level 1 h old and temp 4 h old: the temp shows on the card, the bite rating ignores it (3 h limit)
//   race           F10: a slow older answer that lands after a newer one never replaces it
//   trend-old      the 7 day chart ends at its last reading's time, not "Now", when that is more than 6 h old
//   hidden         F13: a page opened in a background tab fetches nothing until it is visible
//   alert-expiry   a banner whose end time passed goes away even when the alerts refresh fails
//   wind-failed    Glance wind says how old the forecast is after a failed NWS refresh (real NWS for the first load;
//                  skipped with an INFO line when weather.gov can't be reached)
// Usage: node tools/check-live-readings.cjs [BASE] [OUTDIR]     (BASE: the preview, or tools/serve.py for local runs)
// Blocks analytics (tools/no-analytics.cjs). Exit code 1 on any FAIL. Log: OUTDIR/check-live-readings.log
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const fs = require('fs');
const BASE = (process.argv[2] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = (process.argv[3] || '/workspace/nb-live-readings').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
const lines = []; let fails = 0;
const check = (n, ok, info) => { lines.push((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + info : '')); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = 36e5, iso = ms => new Date(ms).toISOString().replace('Z', '+00:00');
const GAUGE = '03228400:62614:00010';   // js/usgs.js GAUGE_ID for Hoover (site, level and temp parameters)
const USGS_LATEST = /api\.waterdata\.usgs\.gov\/ogcapi\/v1\/collections\/latest-continuous\//;
const USGS_SERIES = /api\.waterdata\.usgs\.gov\/ogcapi\/v1\/collections\/continuous\//;
const OTHER = /waterservices\.usgs\.gov|cwms-data\.usace\.army\.mil/;
const NWS = /api\.weather\.gov/;
const json = body => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
const latest = (lvl, tmp) => json({ type: 'FeatureCollection', features: [
  lvl && { properties: { parameter_code: '62614', time: iso(lvl.t), value: String(lvl.v) } },
  tmp && { properties: { parameter_code: '00010', time: iso(tmp.t), value: String(tmp.c) } }].filter(Boolean) });
// the legacy WaterServices IV answer (js/lakes.js falls back to it when the new API has no level)
const iv = (code, t, v) => json({ value: { timeSeries: [{ variable: { variableCode: [{ value: code }] }, values: [{ value: [{ value: String(v), dateTime: iso(t) }] }] }] } });
function series(endMs) {   // 7 days of 15 minute levels ending at endMs
  const f = []; for (let t = endMs - 7 * 24 * H; t <= endMs; t += H / 4) f.push({ properties: { time: iso(t), value: (890 + Math.sin(t / 9e7) * 0.2).toFixed(2) } });
  return json({ type: 'FeatureCollection', features: f });
}

async function read(page) {
  return page.evaluate(() => {
    const $ = s => document.querySelector(s), tx = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
    const line = $('#correction-line'), ct = $('#correction-checked time'), w = $('#bite-how [data-bite-now="water"]');
    const cl = $('#conditions .cond-line');
    return { line: tx(line), src: line && line.getAttribute('data-source'), failed: !!(line && line.hasAttribute('data-refresh-failed')),
      checked: ct ? ct.getAttribute('datetime') : '', status: tx($('#usgs-live-status')), temp: tx($('#water-temp')),
      stamp: tx($('[data-glance="stamp"]')), gTemp: tx($('[data-glance="temp"]')), gPool: tx($('[data-glance="pool"]')),
      waterF: window.NightBiteWaterF, condLine: cl && !cl.hidden ? tx(cl.querySelector('.cond-line-text')) : '',
      biteWater: w ? w.getAttribute('data-have') : null, trendEnd: tx($('.pool-trend-axis span:last-child')),
      trendOld: !!($('#pool-trend') && $('#pool-trend').hasAttribute('data-old')) };
  });
}

async function scenario(browser, name, opts, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await NA.block(ctx);
  if (opts.init) await ctx.addInitScript(opts.init);
  const hits = { latest: 0, series: 0, nws: 0 };
  await ctx.route(OTHER, r => opts.legacy && /waterservices\.usgs\.gov/.test(r.request().url()) ? r.fulfill(opts.legacy()) : r.abort('failed'));
  await ctx.route(NWS, r => { hits.nws++; return opts.nws ? opts.nws(r) : r.abort('failed'); });
  await ctx.route(USGS_SERIES, r => { hits.series++; return opts.series ? r.fulfill(opts.series()) : r.abort('failed'); });
  await ctx.route(USGS_LATEST, async r => { const n = hits.latest++; if (!opts.latest) return r.abort('failed'); const x = await opts.latest(n); return x ? r.fulfill(x) : r.abort('failed'); });
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => perr.push(e.message));
  if (opts.saved) {   // a reading saved on this phone by an earlier visit
    await page.goto(BASE + 'about.html', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate(s => localStorage.setItem('nb-usgs-last', JSON.stringify(s)), opts.saved);
  }
  await page.goto(BASE + 'hoover/?t=' + Date.now(), { waitUntil: 'load' }).catch(e => perr.push('goto ' + e.message));
  await sleep(opts.wait || 3000);
  try { await fn(page, hits); } catch (e) { check(name + ': ran', false, e.message.slice(0, 200)); }
  check(name + ': no script errors', perr.length === 0, perr.join(' | ').slice(0, 300));
  await ctx.close();
}

(async () => {
  lines.push('INFO base ' + BASE);
  const browser = await chromium.launch({ executablePath: CHROME, args: NA.args(['--no-sandbox']) });
  const now = Date.now();

  await scenario(browser, 'fresh', { latest: () => latest({ t: now - 0.5 * H, v: 890.21 }, { t: now - 0.5 * H, c: 14.8 }), series: () => series(now - 0.5 * H) }, async page => {
    const r = await read(page);
    check('fresh: tagged live', r.src === 'live' && !r.failed && /^890\.21 ft · 59°F/.test(r.line), JSON.stringify([r.src, r.line]));
    check('fresh: status says live', /^Live USGS refresh updated pool \+ temp/.test(r.status), r.status);
    check('fresh: glance says live', /live from the USGS gauge/.test(r.stamp), r.stamp);
    check('fresh: temp shared with the bite rating', r.waterF === 58.6 && /59°F water/.test(r.condLine) && r.biteWater === 'yes', JSON.stringify([r.waterF, r.condLine, r.biteWater]));
    check('fresh: 7 day chart ends at Now', r.trendEnd === 'Now' && !r.trendOld, r.trendEnd);
  });

  await scenario(browser, 'stale-9d', { latest: () => latest({ t: now - 9 * 24 * H, v: 890.40 }, { t: now - 9 * 24 * H, c: 16 }) }, async page => {
    const r = await read(page);
    check('stale-9d: shown plainly as the last reading, not live', r.src === 'old' && /^890\.40 ft/.test(r.line) && Math.abs(Date.parse(r.checked) - (now - 9 * 24 * H)) < 6e4, JSON.stringify([r.src, r.line, r.checked]));
    check('stale-9d: status says no new reading, with its time', /^No new reading in 6 hours, check USGS\. Showing the reading from .+ ET\.$/.test(r.status) && !/^Live/.test(r.status), r.status);
    check('stale-9d: glance never says live', !/live from/i.test(r.stamp) && /last updated 9 days ago/.test(r.stamp), r.stamp);
    check('stale-9d: no water temp in the bite rating', (r.waterF === null || r.waterF === undefined) && !/°F water/.test(r.condLine) && r.biteWater !== 'yes', JSON.stringify([r.waterF, r.condLine, r.biteWater]));
    // F2: the share image carries the reading's own time
    await page.click('[data-act="share"]');
    await page.waitForFunction(() => { const i = document.getElementById('tt-share-img'); return i && i.getAttribute('src'); }, null, { timeout: 15000 });
    const alt = await page.getAttribute('#tt-share-img', 'alt');
    const want = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(now - 9 * 24 * H));   // over 6 days: dated, not a weekday
    check('stale-9d: share image carries the reading time', alt.includes('(reading ' + want + ' ET)'), alt);
    await page.locator('#tt-share-img').screenshot({ path: OUT + 'share-stale-9d.png' }).catch(() => {});
  });

  await scenario(browser, 'old-temp', { latest: () => latest({ t: now - 0.5 * H, v: 890.20 }, { t: now - 21 * 24 * H, c: 21.7 }) }, async page => {
    const r = await read(page);
    check('old-temp: level live, temp out of the pool line', r.src === 'live' && /^890\.20 ft · no temp ·/.test(r.line), r.line);
    check('old-temp: temp detail says last reading with its date', /71\.1 °F .*last reading/.test(r.temp), r.temp);
    check('old-temp: status says temp unavailable', /temp unavailable, check USGS/.test(r.status), r.status);
    check('old-temp: glance stamp speaks for the level only', /^Level live from/.test(r.stamp), r.stamp);
    check('old-temp: no water temp in the bite rating', (r.waterF === null || r.waterF === undefined) && !/°F water/.test(r.condLine), JSON.stringify([r.waterF, r.condLine]));
  });

  // the new API has a temp and no level, so js/lakes.js asks the legacy API, which has the same: a temp alone
  await scenario(browser, 'temp-only', { latest: () => latest(null, { t: now - 0.5 * H, c: 14 }), legacy: () => iv('00010', now - 0.5 * H, 14) }, async page => {
    const r = await read(page);
    check('temp-only: never tagged live', r.src !== 'live' && r.failed, JSON.stringify([r.src, r.failed]));
    check('temp-only: Checked keeps the line\'s own time', Date.now() - Date.parse(r.checked) > 6 * H, r.checked);
    check('temp-only: glance does not say live', !/live from/i.test(r.stamp), r.stamp);
    check('temp-only: temp detail shows the new temp with its time', /^57\.2 °F \(14\.0 °C\) · \d{4}-\d\d-\d\d \d\d:\d\d ET$/.test(r.temp), r.temp);
    check('temp-only: status says pool unavailable', /refresh updated temp \(provisional\)\. · pool unavailable, check USGS/.test(r.status), r.status);
  });

  const d2 = now - 2 * 24 * H;
  await scenario(browser, 'saved', { saved: { savedAt: d2, g: GAUGE, pool: { value: 890.3, dateTime: iso(d2) }, temp: { value: 13.9, dateTime: iso(d2) }, out: null } }, async page => {
    const r = await read(page);
    check('saved: shown as saved after the failed refresh', r.src === 'saved' && r.failed && /^890\.30 ft/.test(r.line), JSON.stringify([r.src, r.line]));
    check('saved: status says the refresh failed, with the reading time', /^Live refresh failed, check USGS\. Showing the reading from .+ ET\.$/.test(r.status), r.status);
    check('saved: never shared with the bite rating', (r.waterF === null || r.waterF === undefined) && !/°F water/.test(r.condLine) && r.biteWater !== 'yes', JSON.stringify([r.waterF, r.condLine, r.biteWater]));
  });

  await scenario(browser, 'saved-other-gauge', { saved: { savedAt: d2, g: '99999999:62614:00010', pool: { value: 777.7, dateTime: iso(d2) }, temp: null, out: null } }, async page => {
    const r = await read(page);
    check('saved-other-gauge: a reading from another gauge is dropped', !/777\.70/.test(r.line) && r.src === 'snapshot', JSON.stringify([r.src, r.line]));
  });

  await scenario(browser, 'temp-4h', { latest: () => latest({ t: now - 1 * H, v: 890.25 }, { t: now - 4 * H, c: 15 }) }, async page => {
    const r = await read(page);
    check('temp-4h: temp shown on the card', r.src === 'live' && /· 59°F ·/.test(r.line), r.line);
    check('temp-4h: bite rating ignores a temp over 3 hours old', !/°F water/.test(r.condLine) && r.biteWater !== 'yes', JSON.stringify([r.condLine, r.biteWater]));
  });

  await scenario(browser, 'race', { wait: 500, latest: async n => {
    if (n === 0) { await sleep(3000); return latest({ t: now - 1 * H, v: 890.00 }, { t: now - 1 * H, c: 15 }); }
    return latest({ t: now - 0.75 * H, v: 890.50 }, { t: now - 0.75 * H, c: 15.5 });
  } }, async (page, hits) => {
    await page.evaluate(() => window.NightBiteRefresh.run('check'));
    await sleep(4500);
    const r = await read(page);
    check('race: a slow older answer never replaces a newer one', hits.latest >= 2 && /^890\.50 ft/.test(r.line), JSON.stringify([hits.latest, r.line]));
  });

  await scenario(browser, 'trend-old', { latest: () => latest({ t: now - 0.5 * H, v: 890.21 }, null), series: () => series(now - 2 * 24 * H) }, async page => {
    const r = await read(page);
    check('trend-old: chart end says its own time, not Now', r.trendOld && /^\d{1,2}:\d\d (AM|PM) [A-Z][a-z]{2}$/.test(r.trendEnd), JSON.stringify([r.trendEnd, r.trendOld]));
    check('trend-old: old trend stays out of Tonight, in short', !/over 7 days/.test(r.condLine), r.condLine);
  });

  // F13: the page starts hidden (a background tab), then becomes visible
  const HIDE = `(() => { window.__nbHidden = true;
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return !!window.__nbHidden; } });
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get() { return window.__nbHidden ? 'hidden' : 'visible'; } }); })();`;
  await scenario(browser, 'hidden', { init: HIDE, latest: () => latest({ t: now - 0.5 * H, v: 890.21 }, { t: now - 0.5 * H, c: 14.8 }), series: () => series(now - 0.5 * H) }, async (page, hits) => {
    const a = { ...hits };
    check('hidden: no gauge or weather fetch while the tab is hidden', a.latest === 0 && a.series === 0 && a.nws === 0, JSON.stringify(a));
    await page.evaluate(() => { window.__nbHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(3000);
    const r = await read(page);
    check('hidden: fetches once visible, exactly once', hits.latest === 1 && hits.series === 1 && r.src === 'live', JSON.stringify([hits, r.src]));
  });

  // alerts: a warning that ends 12 s after this point, then the next alerts refresh fails
  const ends = Date.now() + 12000;
  let alertsUp = true;
  await scenario(browser, 'alert-expiry', { wait: 3000, nws: r => {
    if (!/\/alerts\/active/.test(r.request().url())) return r.abort('failed');
    if (!alertsUp) return r.abort('failed');
    return r.fulfill(json({ features: [{ id: 'x', properties: { id: 'x', event: 'Flood Warning', status: 'Actual', messageType: 'Alert', ends: new Date(ends).toISOString(), areaDesc: 'Test' } }] }));
  } }, async page => {
    const shown = await page.evaluate(() => !!document.querySelector('.nws-alert'));
    check('alert-expiry: active warning shows', shown);
    alertsUp = false;
    await sleep(Math.max(0, ends - Date.now()) + 500);
    await page.evaluate(() => window.NightBiteRefresh.run('check'));
    await sleep(1500);
    const still = await page.evaluate(() => !!document.querySelector('.nws-alert'));
    check('alert-expiry: banner gone after its end time though the refresh failed', !still);
  });

  // Glance wind after a failed NWS refresh: the first load uses the real weather.gov (no fake forecast is invented)
  let nwsUp = true;
  await scenario(browser, 'wind-failed', { wait: 9000, nws: r => nwsUp ? r.continue() : r.abort('failed') }, async page => {
    const ok = await page.evaluate(() => { const c = document.getElementById('conditions'); return c && c.getAttribute('data-state') === 'ok' && !c.hasAttribute('data-saved'); });
    if (!ok) { lines.push('INFO wind-failed: weather.gov not reachable from here, skipped'); return; }
    const before = await page.evaluate(() => document.querySelector('[data-glance="wind-sub"]').textContent.trim());
    nwsUp = false;
    await page.evaluate(() => window.NightBiteRefresh.run('check'));
    await sleep(4000);
    const after = await page.evaluate(() => document.querySelector('[data-glance="wind-sub"]').textContent.trim());
    check('wind-failed: glance wind says how old the forecast is', /^NWS/.test(before) && /^NWS, \d+[mhd] ago$/.test(after), JSON.stringify([before, after]));
  });

  await browser.close();
  lines.push(`${fails ? 'FAILED' : 'ALL PASSED'}: ${lines.filter(l => l.startsWith('PASS')).length} pass, ${fails} fail`);
  fs.writeFileSync(OUT + 'check-live-readings.log', lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(fails ? 1 : 0);
})();
