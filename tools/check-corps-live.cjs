// The Night Bite: a Corps CWMS reading is never left tagged live as current when it is older than 6 hours,
// and a hung CWMS fetch times out so the card can drop the live tag (Opus triage, Nov. 24, 2026, step 5).
// Loads Alum Creek (CWMS level + outflow) and East Fork (USGS level + Corps outflow) with fake CWMS/USGS
// answers (Playwright routes; nothing real is fetched). Blocks analytics (tools/no-analytics.cjs).
//   fresh            level 30 min old: tagged live, glance says live from the USACE gauge (the control)
//   stale-7h         the newest Corps level is 7 hours old: shown plainly, never "live", not in "Tonight, in short"
//   hung-stale       a live reading ages past 6 hours, then CWMS hangs: the live tag is dropped; glance does not
//                    say live; the 8 second timeout settles the refresh
//   hung-outflow     East Fork: USGS level is fresh, Corps outflow hangs: the USGS level is still tagged live
//                    (a hung outflow must not hold back the level)
// Usage: node tools/check-corps-live.cjs [BASE] [OUTDIR]
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const fs = require('fs');
const BASE = (process.argv[2] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = (process.argv[3] || '/workspace/nb-corps-live').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
const lines = []; let fails = 0;
const check = (n, ok, info) => { lines.push((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + info : '')); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = 36e5, iso = ms => new Date(ms).toISOString().replace('Z', '+00:00');
const CWMS = /cwms-data\.usace\.army\.mil/;
const USGS_LATEST = /api\.waterdata\.usgs\.gov\/ogcapi\/v1\/collections\/latest-continuous\//;
const USGS_SERIES = /api\.waterdata\.usgs\.gov\/ogcapi\/v1\/collections\/continuous\//;
const OTHER = /waterservices\.usgs\.gov/;
const NWS = /api\.weather\.gov/;
const json = body => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
const cwms = (t, v) => json({ values: [[t, v, 0]], units: 'ft' });
const cwmsTemp = (t, f) => json({ values: [[t, f, 0]], units: 'F' });
const latest = (lvl) => json({ type: 'FeatureCollection', features: [
  { properties: { parameter_code: '62614', time: iso(lvl.t), value: String(lvl.v) } }
] });

async function read(page) {
  return page.evaluate(() => {
    const $ = s => document.querySelector(s), tx = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
    const line = $('#correction-line'), ct = $('#correction-checked time');
    const cl = $('#conditions .cond-line');
    return { line: tx(line), src: line && line.getAttribute('data-source'),
      failed: !!(line && line.hasAttribute('data-refresh-failed')),
      checked: ct ? ct.getAttribute('datetime') : '', status: tx($('#usgs-live-status')),
      stamp: tx($('[data-glance="stamp"]')),
      condLine: cl && !cl.hidden ? tx(cl.querySelector('.cond-line-text')) : '' };
  });
}

async function scenario(browser, name, path, opts, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await NA.block(ctx);
  const hits = { cwms: 0, latest: 0 };
  await ctx.route(OTHER, r => r.abort('failed'));
  await ctx.route(NWS, r => r.abort('failed'));
  await ctx.route(USGS_SERIES, r => r.abort('failed'));
  await ctx.route(USGS_LATEST, async r => {
    hits.latest++;
    if (!opts.latest) return r.abort('failed');
    const x = typeof opts.latest === 'function' ? await opts.latest(r) : opts.latest();
    return x ? r.fulfill(x) : r.abort('failed');
  });
  await ctx.route(CWMS, async r => {
    hits.cwms++;
    if (opts.hangCwms) return;   // never fulfill: the 8 second AbortController must settle this
    const u = r.request().url();
    if (opts.cwms) return r.fulfill(opts.cwms(u));
    return r.abort('failed');
  });
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => perr.push(e.message));
  await page.goto(BASE + path + '?t=' + Date.now(), { waitUntil: 'load' }).catch(e => perr.push('goto ' + e.message));
  await sleep(opts.wait || 4000);
  try { await fn(page, hits, ctx); } catch (e) { check(name + ': ran', false, e.message.slice(0, 200)); }
  check(name + ': no script errors', perr.length === 0, perr.join(' | ').slice(0, 300));
  await ctx.close();
}

(async () => {
  lines.push('INFO base ' + BASE);
  const browser = await chromium.launch({ executablePath: CHROME, args: NA.args(['--no-sandbox']) });
  const now = Date.now();

  function alumCwms(tLevel, tOut) {
    return u => /Temp-Water/i.test(u) ? cwmsTemp(tOut || tLevel, 60) : cwms(tLevel, 886.50);
  }

  await scenario(browser, 'fresh', 'alum/', { wait: 4000, cwms: alumCwms(now - 0.5 * H, now - 0.5 * H) }, async page => {
    const r = await read(page);
    check('fresh: tagged live', r.src === 'live' && !r.failed && /^886\.50 ft/.test(r.line), JSON.stringify([r.src, r.line, r.failed]));
    check('fresh: glance says live from the USACE gauge', /live from the USACE gauge/i.test(r.stamp), r.stamp);
    check('fresh: pool is in Tonight, in short', /pool 1\.5 ft below full/.test(r.condLine), r.condLine);
  });

  await scenario(browser, 'stale-7h', 'alum/', { wait: 4000, cwms: alumCwms(now - 7 * H, now - 7 * H) }, async page => {
    const r = await read(page);
    check('stale-7h: shown as the last reading, not live', r.src === 'old' && /^886\.50 ft/.test(r.line), JSON.stringify([r.src, r.line, r.status]));
    check('stale-7h: glance never says live', !/live from/i.test(r.stamp), r.stamp);
    check('stale-7h: pool is not current in Tonight, in short', !/pool 1\.5 ft below full/.test(r.condLine), r.condLine);
    check('stale-7h: status names the 6 hour limit', /No new reading in 6 hours/i.test(r.status), r.status);
  });

  let hang = false;
  await scenario(browser, 'hung-stale', 'alum/', { wait: 4000, cwms: u => hang ? new Promise(() => {}) : alumCwms(now - 0.5 * H, now - 0.5 * H)(u) }, async (page, hits) => {
    let r = await read(page);
    check('hung-stale: first load is live', r.src === 'live' && /live from the USACE gauge/i.test(r.stamp), JSON.stringify([r.src, r.stamp]));
    hang = true;
    await page.evaluate(shift => { const real = Date.now.bind(Date); Date.now = () => real() + shift; }, 7 * H);
    await page.evaluate(() => window.NightBiteRefresh.run('check'));
    await sleep(10000);
    r = await read(page);
    check('hung-stale: hung refresh past 6 hours drops the live tag', r.src !== 'live' && /^886\.50 ft/.test(r.line), JSON.stringify([r.src, r.failed, r.line, r.status]));
    check('hung-stale: glance does not call the stale reading live', !/live from/i.test(r.stamp), r.stamp);
    check('hung-stale: pool is not current in Tonight, in short', !/pool 1\.5 ft below full/.test(r.condLine), r.condLine);
  });

  await scenario(browser, 'hung-outflow', 'eastfork/', {
    wait: 11000,
    hangCwms: true,
    latest: () => latest({ t: now - 0.5 * H, v: 796.20 })
  }, async page => {
    const r = await read(page);
    check('hung-outflow: USGS level is still tagged live when Corps outflow hangs', r.src === 'live' && /^796\.20 ft/.test(r.line), JSON.stringify([r.src, r.line, r.status, r.stamp]));
  });

  await browser.close();
  lines.push(`${fails ? 'FAILED' : 'ALL PASSED'}: ${lines.filter(l => l.startsWith('PASS')).length} pass, ${fails} fail`);
  fs.writeFileSync(OUT + 'check-corps-live.log', lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(fails ? 1 : 0);
})();
