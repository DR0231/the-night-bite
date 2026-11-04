#!/usr/bin/env node
/* Log page (js/log.js): your trips, empty states and the backup file, end to end at 390.
 *   node tools/check-log-io.cjs <base> [outDir]
 * Empty phone: no trip list, one "no trips" line, Add a trip open, Community hidden (only an Example trip in the JSON),
 * no dev notes (JSON file names, localStorage) in the visible text. Then it saves two trips with the form plus an
 * old-format trip (no lake field, old ramp name "Redbank"), clicks Save a backup (checks the file name and contents),
 * clears, opens the file with Open a backup and checks the same trips came back (old one shows "Red Bank ramp", its
 * saved text kept). Opening it again adds nothing ("already here"); a junk file and a non-JSON file are refused without
 * touching what is saved; a bare array (raw nightbite-log-v1 copy) merges. Red light and high contrast: the status line
 * stays readable. Prints PASS/FAIL lines; exit 1 on any FAIL. Analytics blocked (tools/no-analytics.cjs).
 */
const fs = require('fs'), path = require('path'), os = require('os');
const PW = process.env.PLAYWRIGHT_CORE || '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core';
const { chromium } = require(PW);
const na = require(path.join(__dirname, 'no-analytics.cjs'));
const B = (process.argv[2] || 'http://127.0.0.1:8642/night-bite-preview/').replace(/\/?$/, '/');
const OUT = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'nb-logio-'));
fs.mkdirSync(OUT, { recursive: true });
let fails = 0, passes = 0;
function ok(name, cond, info) {
  if (cond) passes++; else fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !cond ? ' :: ' + JSON.stringify(info).slice(0, 400) : ''));
}
const KEY = 'nightbite-log-v1';
const OLD = { id: 'user-1690000000000', sample: false, date: '2024-06-01', location: 'Redbank', bait: 'Nightcrawlers', species: 'Channel catfish', disposition: 'Released', notes: 'Old format trip' };

(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: na.args() });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
  await na.block(ctx);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'log', { waitUntil: 'load' });
  await p.evaluate(() => { localStorage.clear(); });
  await p.reload({ waitUntil: 'networkidle' });
  const empty = await p.evaluate(() => ({
    listHidden: document.getElementById('log-list').hidden,
    emptyShown: !document.getElementById('log-empty').hidden,
    addOpen: document.getElementById('add-private').open,
    community: document.getElementById('community').hidden,
    example: /\bExample\b/.test(document.querySelector('main').innerText),
    dev: (document.querySelector('main').innerText.match(/community-log\.json|localStorage|nightbite-log|\.json\b|mailto/gi) || [])
  }));
  ok('empty: trip list hidden, one line shown, Add a trip open', empty.listHidden && empty.emptyShown && empty.addOpen, empty);
  ok('empty: Community hidden while it only has an Example trip', empty.community === true, empty);
  ok('no Example card and no dev notes in the page text', !empty.example && !empty.dev.length, empty);

  // two trips through the form
  for (const t of [['2026-10-30', 'Sunbury Road ramp', 'Cut shad', 'Channel catfish', 'Released', 'Wind out of the south'], ['2026-11-01', 'Twin Bridges ramp', 'Jig', 'Black crappie', 'Kept (2)', '']]) {
    await p.fill('#date', t[0]); await p.selectOption('#location', t[1]); await p.fill('#bait', t[2]);
    await p.selectOption('#species', t[3]); await p.selectOption('#disposition', t[4]); await p.fill('#notes', t[5]);
    await p.click('#trip-form button[type=submit]');
  }
  // plus one old-format entry written the way older versions stored it
  await p.evaluate(([k, o]) => { const a = JSON.parse(localStorage.getItem(k) || '[]'); a.push(o); localStorage.setItem(k, JSON.stringify(a)); }, [KEY, OLD]);
  await p.reload({ waitUntil: 'networkidle' });
  const before = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const cards = await p.$$eval('#log-list .paper-card', a => a.length);
  ok('three trips saved and shown, list visible, empty line hidden', before.length === 3 && cards === 3 && await p.evaluate(() => !document.getElementById('log-list').hidden && document.getElementById('log-empty').hidden), { n: before.length, cards });

  await p.click('#log-backup summary');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }), p.click('#log-export')]);
  const file = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(file);
  ok('backup file name night-bite-log-YYYY-MM-DD.json', /^night-bite-log-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok('backup file has app, version and all three trips', data.app === 'the-night-bite' && data.version === 1 && Array.isArray(data.entries) && data.entries.length === 3, data);

  p.once('dialog', d => d.accept());
  await p.click('#clear-user-entries');
  ok('Clear empties the saved trips', await p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]').length === 0, KEY));

  await p.setInputFiles('#log-import', file);
  await p.waitForFunction(() => !document.getElementById('log-io-status').hidden && /Added|No new/.test(document.getElementById('log-io-status').textContent), null, { timeout: 5000 });
  const after = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const norm = a => a.map(e => [e.id, e.lake, e.date, e.location, e.bait, e.species, e.disposition, e.notes].join('|')).sort();
  ok('round trip: the same trips come back', JSON.stringify(norm(after)) === JSON.stringify(norm(before)), { before: norm(before), after: norm(after) });
  ok('status says Added 3 trips', /Added 3 trips/.test(await p.textContent('#log-io-status')), await p.textContent('#log-io-status'));
  const old = after.find(e => e.id === OLD.id) || {};
  const shown = await p.$$eval('#log-list .paper-card', a => a.map(c => c.innerText));
  ok('old-format trip: lake hoover, saved text kept, shows Red Bank ramp', old.lake === 'hoover' && old.location === 'Redbank' && shown.some(t => /Red Bank ramp/.test(t) && /Old format trip/.test(t)), { old, shown });

  await p.setInputFiles('#log-import', []); await p.setInputFiles('#log-import', file);
  await p.waitForFunction(() => /already here/.test(document.getElementById('log-io-status').textContent), null, { timeout: 5000 }).catch(() => {});
  ok('importing again merges: nothing doubled', (await p.evaluate(k => JSON.parse(localStorage.getItem(k)).length, KEY)) === 3 && /3 trips were already here/.test(await p.textContent('#log-io-status')), await p.textContent('#log-io-status'));

  const r = await p.evaluate(([o]) => {
    const io = window.NightBiteLogIO, n = () => JSON.parse(localStorage.getItem('nightbite-log-v1')).length;
    const a = io.importText('not json'), b = io.importText(JSON.stringify({ app: 'other', entries: [] })),
      c = io.importText(JSON.stringify({ entries: [{ date: 'yesterday', species: 'x' }, { date: '2026-01-01', lake: 'atlantis', species: 'x' }, { date: '2026-01-01', species: 5 }, { sample: true, date: '2026-01-01', species: 'x' }] })),
      count1 = n();
    const d = io.importText(JSON.stringify([Object.assign({}, o, { id: 'user-2', notes: 'Bare array trip', location: 'Walnut Road' })]));
    return { a, b, c, count1, d, count2: n() };
  }, [OLD]);
  ok('non-JSON and foreign files refused', r.a.error && r.b.error, r);
  ok('bad entries skipped, samples dropped quietly, nothing saved', r.c.added === 0 && r.c.skipped === 3 && r.count1 === 3, r);
  ok('bare array (raw old log) merges', r.d.added === 1 && r.count2 === 4, r);

  for (const mode of [['data-light', 'red'], ['data-contrast', 'high']]) {
    await p.evaluate(m => document.documentElement.setAttribute(m[0], m[1]), mode); await p.waitForTimeout(400);
    const c = await p.evaluate(() => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const bg = getComputedStyle(document.body).backgroundColor, s = document.getElementById('log-io-status'), fg = getComputedStyle(s).color;
      const x = lum(fg), y = lum(bg); return { fg, bg, ratio: (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05), shown: !!s.offsetParent };
    });
    ok(mode.join('=') + ': backup status readable (>= 4.5:1)', c.shown && c.ratio >= 4.5, c);
    await p.evaluate(m => document.documentElement.removeAttribute(m[0]), mode);
  }
  await p.evaluate(() => localStorage.clear());
  ok('no page errors', !errs.length, errs);
  await br.close();
  console.log(`check-log-io: ${passes} pass, ${fails} fail`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed :: ' + e.message); process.exit(1); });
