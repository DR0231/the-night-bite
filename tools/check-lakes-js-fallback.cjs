// The Night Bite: if js/lakes.js fails to load, a non-Hoover page must not use Hoover's gauge,
// weather point, alert zones, saved keys, or numbers. Seeds unsuffixed Hoover saved readings
// (877.77 ft, 99°F) plus unsuffixed weather and alert caches, blocks lakes.js, then checks
// Madison (no gauge), Alum Creek (gauged), Hoover, and water.html?lake=alum.
// Usage: node tools/check-lakes-js-fallback.cjs [BASE] [OUTDIR]
// Blocks analytics (tools/no-analytics.cjs). Exit code 1 on any FAIL. Log: OUTDIR/check-lakes-js-fallback.log
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));
const { chromium } = require(PW);
const NA = require('./no-analytics.cjs');
const fs = require('fs');
const BASE = (process.argv[2] || 'https://dr0231.github.io/night-bite-preview/').replace(/\/?$/, '/');
const OUT = (process.argv[3] || '/workspace/nb-lakes-js-fallback').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
const lines = []; let fails = 0;
const check = (n, ok, info) => { lines.push((ok ? 'PASS ' : 'FAIL ') + n + (info ? ' :: ' + info : '')); if (!ok) fails++; };
const MARK_FT = '877.77';
const MARK_F = '99';
const HOOVER_GAUGE = /03228400/;
const HOOVER_WX = /api\.weather\.gov\/gridpoints\/ILN\/89,88|api\.weather\.gov\/points\/40\.11,-82\.88|api\.weather\.gov\/stations\/KCMH|forecast\.weather\.gov\/MapClick\.php\?lat=40\.11/;
const HOOVER_ALERT_ZONES = /api\.weather\.gov\/alerts\/active\?[^#]*zone=(?:[^&]*?)(OHC041|OHC049|OHZ046|OHZ055)/;
const LAKES_JS = /\/js\/lakes\.js(\?|$)/;
const WX_UNAVAILABLE = /Weather unavailable, check weather\.gov/;
const GENERIC_WX = 'https://www.weather.gov/';

function seedHoover() {
  const now = Date.now();
  const iso = new Date(now - 30 * 60 * 1000).toISOString();
  const pts = [];
  for (let i = 13; i >= 0; i--) {
    const t = now - i * 12 * 3600 * 1000;
    pts.push({ t: t, v: i ? 876.5 : 877.77, iso: new Date(t).toISOString() });
  }
  const usgs = {
    savedAt: now,
    g: '03228400:62614:00010',
    pool: { value: 877.77, dateTime: iso },
    temp: { value: 37.222, dateTime: iso }
  };
  localStorage.setItem('nb-usgs-last', JSON.stringify(usgs));
  localStorage.setItem('nb-trend-last', JSON.stringify({ savedAt: now, pts: pts }));
  const hourly = { properties: { periods: [{
    startTime: new Date(now - 10 * 60 * 1000).toISOString(),
    endTime: new Date(now + 50 * 60 * 1000).toISOString(),
    windSpeed: '5 mph', windDirection: 'S', temperature: 72, temperatureUnit: 'F',
    probabilityOfPrecipitation: { value: 10 }, shortForecast: 'Hoover cache test'
  }] } };
  sessionStorage.setItem('nb-cond-v3', JSON.stringify({ at: now, hourly: hourly, obs: { features: [] }, thunder: null }));
  sessionStorage.setItem('nb-alerts-v1', JSON.stringify({
    at: now,
    list: [{ id: 'test-hoover-alert', event: 'Tornado Warning', until: new Date(now + 3600 * 1000).toISOString(), area: 'Delaware, Franklin', rank: 0 }]
  }));
}

async function read(page) {
  return page.evaluate(() => {
    const $ = s => document.querySelector(s), tx = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
    const line = $('#correction-line'), checked = $('#correction-checked'), trend = $('#pool-trend');
    const hrefs = Array.from(document.querySelectorAll('#correction-checked a, #usgs-live-status a, #correction-line a, [data-cell="pool"], [data-cell="temp"]'))
      .map(a => a.getAttribute('href') || '').join(' ');
    const cond = $('#conditions'), status = cond && cond.querySelector('.cond-status');
    const statusLink = status && status.querySelector('a');
    const alert = $('.nws-alert');
    const alertLink = alert && alert.querySelector('a');
    return {
      lake: document.documentElement.getAttribute('data-lake') || '',
      hasLK: !!(window.NightBiteLake && window.NightBiteLake.id),
      line: tx(line),
      src: line && line.getAttribute('data-source'),
      checked: tx(checked),
      status: tx($('#usgs-live-status')),
      temp: tx($('#water-temp')),
      gPool: tx($('[data-glance="pool"]')),
      gTemp: tx($('[data-glance="temp"]')),
      stamp: tx($('[data-glance="stamp"]')),
      hrefs,
      trendDrawn: !!(trend && trend.hasAttribute('data-drawn') && !trend.hidden),
      trendLabel: trend ? (trend.querySelector('svg') && trend.querySelector('svg').getAttribute('aria-label') || '') : '',
      hasCond: !!cond,
      condState: cond ? (cond.getAttribute('data-state') || '') : '',
      condStatus: tx(status),
      condHref: statusLink ? (statusLink.getAttribute('href') || '') : '',
      condSummary: tx(cond && cond.querySelector('.cond-summary')),
      alertText: tx(alert),
      alertHref: alertLink ? (alertLink.getAttribute('href') || '') : ''
    };
  });
}

function borrowed(r) {
  const blob = [r.line, r.checked, r.status, r.temp, r.gPool, r.gTemp, r.stamp, r.trendLabel, r.hrefs].join(' ');
  return blob.includes(MARK_FT) || new RegExp('\\b' + MARK_F + '\\s*°F').test(blob) || HOOVER_GAUGE.test(blob) || HOOVER_GAUGE.test(r.hrefs);
}

function borrowedWx(r) {
  const blob = [r.condStatus, r.condHref, r.condSummary, r.alertText, r.alertHref].join(' ');
  return /NWS hourly forecast for Hoover|Columbus airport \(KCMH\)|the Hoover area|Hoover cache test|Tornado Warning/i.test(blob)
    || /lat=40\.11|lon=-82\.88|ILN\/89,88|stations\/KCMH/.test(blob);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: NA.args && NA.args() });
  lines.push('INFO base ' + BASE);

  async function visit(path) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await NA.block(ctx);
    await ctx.addInitScript(seedHoover);
    const hits = { lakesJs: 0, hooverGauge: 0, hooverWx: 0, hooverAlerts: 0 };
    await ctx.route(LAKES_JS, r => { hits.lakesJs++; return r.abort('failed'); });
    await ctx.route(/./, r => {
      const u = r.request().url();
      if (HOOVER_GAUGE.test(u) && /waterdata|waterservices|api\.waterdata/.test(u)) hits.hooverGauge++;
      if (HOOVER_WX.test(u)) hits.hooverWx++;
      if (HOOVER_ALERT_ZONES.test(u)) hits.hooverAlerts++;
      return r.fallback();
    });
    const page = await ctx.newPage();
    const perr = [];
    page.on('pageerror', e => perr.push('pageerror: ' + e.message));
    await page.goto(BASE + path, { waitUntil: 'load' }).catch(e => perr.push('goto ' + e.message));
    await page.waitForTimeout(500);
    const r = await read(page);
    r.hits = hits;
    r.perr = perr.filter(m => !/lakes\.js/i.test(m));
    await ctx.close();
    return r;
  }

  function checkPool(name, r, opts) {
    check(name + ': lakes.js was blocked', !r.hasLK, 'hasLK=' + r.hasLK);
    check(name + ': data-lake is ' + opts.lake, r.lake === opts.lake, r.lake);
    if (opts.line) check(name + ': ' + opts.lineLabel, opts.line(r), r.line);
    if (opts.glance) check(name + ': glance stays no public gauge', /no public gauge/i.test(r.gPool), r.gPool);
    if (opts.noBorrow) {
      check(name + ': no Hoover numbers, gauge link, or saved 877.77/99°F', !borrowed(r), [r.line, r.gPool, r.temp, r.hrefs].join(' | '));
      check(name + ': no fetch of Hoover gauge 03228400', r.hits.hooverGauge === 0, String(r.hits.hooverGauge));
      check(name + ': trend not drawn from Hoover saved week', !r.trendDrawn && !r.trendLabel.includes(MARK_FT), r.trendLabel);
    }
  }

  function checkWxUnavailable(name, r) {
    check(name + ': weather shows unavailable, not Hoover forecast', WX_UNAVAILABLE.test(r.condStatus) && r.condState === 'error', r.condStatus + ' state=' + r.condState);
    check(name + ': weather.gov link is not Hoover-specific', r.condHref === GENERIC_WX || r.condHref === 'https://www.weather.gov', r.condHref);
    check(name + ': no Hoover weather point, KCMH, or saved Hoover forecast', !borrowedWx(r), [r.condStatus, r.condHref, r.condSummary, r.alertText].join(' | '));
    check(name + ': no fetch of Hoover NWS grid, point, or KCMH', r.hits.hooverWx === 0, String(r.hits.hooverWx));
    check(name + ': no Hoover-area alert banner or unsuffixed alert cache', !r.alertText && !/the Hoover area|Tornado Warning/i.test(r.alertText), r.alertText);
    check(name + ': no fetch of Hoover alert zones', r.hits.hooverAlerts === 0, String(r.hits.hooverAlerts));
  }

  const madison = await visit('madison/?t=' + Date.now());
  checkPool('madison', madison, {
    lake: 'madison',
    lineLabel: 'baked no-gauge line kept',
    line: r => r.line === 'No public lake level gauge',
    glance: true,
    noBorrow: true
  });
  checkWxUnavailable('madison', madison);

  const alum = await visit('alum/?t=' + Date.now());
  checkPool('alum', alum, {
    lake: 'alum',
    lineLabel: 'baked Alum snapshot kept (not Hoover saved reading)',
    line: r => r.line.includes('ft') && !r.line.includes(MARK_FT),
    noBorrow: true
  });
  checkWxUnavailable('alum', alum);

  const hoover = await visit('hoover/?t=' + Date.now());
  checkPool('hoover', hoover, { lake: 'hoover' });
  check('hoover: may use unsuffixed saved reading (877.77 ft)', hoover.line.includes(MARK_FT), hoover.line);
  check('hoover: may use unsuffixed Hoover weather cache or forecast',
    /NWS hourly forecast for Hoover|Hoover cache test|Columbus airport \(KCMH\)/.test([hoover.condStatus, hoover.condSummary].join(' ')),
    hoover.condStatus + ' | ' + hoover.condSummary);
  check('hoover: may use unsuffixed Hoover alert cache', /Tornado Warning/.test(hoover.alertText) && /the Hoover area/.test(hoover.alertText), hoover.alertText);

  const water = await visit('water.html?lake=alum&t=' + Date.now());
  check('water.html?lake=alum: data-lake is alum', water.lake === 'alum', water.lake);
  check('water.html?lake=alum: no Hoover numbers or 03228400 link', !borrowed(water) && !water.line.includes('891.50') && !/03228400/.test(water.hrefs), [water.line, water.hrefs, water.checked].join(' | '));
  check('water.html?lake=alum: no fetch of Hoover gauge 03228400', water.hits.hooverGauge === 0, String(water.hits.hooverGauge));
  check('water.html?lake=alum: no Hoover-area alert banner or unsuffixed alert cache', !water.alertText && !/the Hoover area|Tornado Warning/i.test(water.alertText), water.alertText);
  check('water.html?lake=alum: no fetch of Hoover alert zones', water.hits.hooverAlerts === 0, String(water.hits.hooverAlerts));

  await browser.close();
  const text = lines.join('\n') + '\n' + (fails ? fails + ' FAIL\n' : 'all passed\n');
  fs.writeFileSync(OUT + 'check-lakes-js-fallback.log', text);
  console.log(text);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
