#!/usr/bin/env node
/* Interface language (js/i18n.js), end to end at 390 on hoover/ and log.
 *   node tools/check-i18n.cjs <base> [outDir]
 * Fresh phone: English, html lang="en", no draft marker. Footer Language opens the Display panel on the language select;
 * picking Español sets html lang="es", shows the "Draft translation" marker, swaps nav, glance and footer labels, and
 * leaves the h1 (lake name) and the glance numbers untouched; the night-rules chip is a draft translation (S13 seg4). A reload keeps Spanish (lang set
 * by js/a11y-boot.js before any page script). A string file missing a key falls back to English for that key only.
 * Log in Spanish: form labels and placeholders swap, species and ramp options stay English. Red light and high contrast:
 * the marker stays readable (>= 4.5:1). Back to English: everything restores and nb-lang is cleared. No sideways scroll,
 * no page errors. Every other drafted language applies at 390 with the right html dir. RTL (ar, then ur and fa):
 * dir="rtl" from the panel and kept on reload before page scripts, no sideways scroll at 390 on hoover/ and log, the
 * header still fits (logo, lake pill and nav inside the row, nothing overlapping), Display panel and marker inside the
 * viewport, the rule chip, glance numbers and English options marked dir="ltr", and switching to a left-to-right
 * language or back to English resets dir="ltr" with no leftover marks. Prints PASS/FAIL lines; exit 1 on any FAIL.
 * S10: page UI coverage in ja, ar and de on /, hoover/, alum/, water, log and species/ (any visible heading, label, control,
 * status line or intro without a key fails, English-kept terms aside), English restores the page UI, and Readable text:
 * locked on with a translated note for zh, ja, ko, hi, ar, ur, fa, ru; working like English for Latin languages; the
 * user's saved setting comes back in English. Analytics blocked (tools/no-analytics.cjs).
 */
const fs = require('fs'), path = require('path'), os = require('os');
const PW = process.env.PLAYWRIGHT_CORE || '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core';
const { chromium } = require(PW);
const na = require(path.join(__dirname, 'no-analytics.cjs'));
const B = (process.argv[2] || 'http://127.0.0.1:8642/night-bite-preview/').replace(/\/?$/, '/');
const OUT = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'nb-i18n-'));
fs.mkdirSync(OUT, { recursive: true });
let fails = 0, passes = 0;
function ok(name, cond, info) {
  if (cond) passes++; else fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !cond ? ' :: ' + JSON.stringify(info).slice(0, 400) : ''));
}
const state = () => {
  const q = s => document.querySelector(s), t = s => ((q(s) || {}).textContent || '').replace(/\s+/g, ' ').trim();
  const m = q('#i18n-draft');
  return { lang: document.documentElement.lang, dir: document.documentElement.dir || 'ltr', store: localStorage.getItem('nb-lang'), marker: m && m.offsetParent ? m.textContent : '',
    nav: t('.site-nav a[href="species/"]'), glance: t('#glance-title'), level: t('.glance-cell[data-cell="pool"] .glance-label'),
    poolVal: t('[data-glance="pool"]'), h1: t('main h1'), chip: t('.night-chip-text'), foot: t('.site-footer a[href="privacy"]'),
    gear: t('.site-nav a[href="gear"]'), ov: document.documentElement.scrollWidth - 390 };
};
(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: na.args() });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await na.block(ctx);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'hoover/', { waitUntil: 'load' }); await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  const en = await p.evaluate(state);
  ok('fresh: English, lang="en", no draft marker', en.lang === 'en' && !en.marker && en.nav === 'Species' && !en.store, en);
  const btn = p.locator('.site-footer [data-lang-open]');
  ok('footer has a Language button', await btn.count() === 1 && await btn.isVisible());
  await btn.click(); await p.waitForTimeout(300);
  const foc = await p.evaluate(() => document.activeElement && document.activeElement.id);
  ok('Language opens the Display panel on the language select', foc === 'a11y-lang', foc);
  await p.selectOption('#a11y-lang', 'es'); await p.waitForTimeout(800);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const es = await p.evaluate(state);
  ok('es: html lang="es", nb-lang saved', es.lang === 'es' && es.store === 'es', es);
  ok('es: Draft translation marker shown', /Draft translation/.test(es.marker) && /Traducci/.test(es.marker), es.marker);
  ok('es: nav, glance and footer labels in Spanish', es.nav === 'Especies' && es.glance === 'Esta noche de un vistazo' && es.level === 'Nivel del lago' && es.foot === 'Privacidad', es);
  ok('es: lake name and level number unchanged, rule chip translated (draft)', es.h1 === en.h1 && es.chip !== en.chip && !!es.chip && es.poolVal === en.poolVal, { en, es });
  // S13: a time and a date actually show in Spanish (Intl), not just the labels
  await p.waitForFunction(() => { const v = document.querySelector('[data-cond="sunset"] .cond-value'); return v && /\d/.test(v.textContent); }, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(300);
  const tm = await p.evaluate(() => {
    const t = s => ((document.querySelector(s) || {}).textContent || '').replace(/\s+/g, ' ').trim();
    const d = [...document.querySelectorAll('main time[datetime]')].find(e => /^\d{4}-\d{2}-\d{2}$/.test(e.getAttribute('datetime')));
    return { sunset: t('[data-cond="sunset"] .cond-value'), glance: t('[data-glance="sunset"]'), date: d ? d.textContent.trim() : null, dt: d && d.getAttribute('datetime') };
  });
  const want = tm.dt ? new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(Date.UTC(+tm.dt.slice(0, 4), +tm.dt.slice(5, 7) - 1, +tm.dt.slice(8, 10))) : '';
  ok('es: sunset cell on hoover shows a 24 h Spanish time (no AM/PM)', /\d{1,2}:\d{2}/.test(tm.sunset) && !/\b(AM|PM)\b/.test(tm.sunset), tm);
  ok('es: a <time datetime> date in <main> is written with Intl es', !!tm.date && tm.date === want && !/^[A-Z][a-z]{2}\.? \d/.test(tm.date), { tm, want });
  const contourAlt = await p.locator('#depth-contours img').getAttribute('alt');
  ok('es: Hoover contour image alt text switches', !!contourAlt && /profundidad/i.test(contourAlt) && /Hoover/.test(contourAlt) && !/ODNR-style/.test(contourAlt), contourAlt);
  ok('es: no sideways scroll', es.ov <= 1, es.ov);
  await p.reload({ waitUntil: 'load' });
  const early = await p.evaluate(() => document.documentElement.lang);
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(600);
  const re = await p.evaluate(state);
  ok('reload: Spanish kept (lang set before page scripts)', early === 'es' && re.nav === 'Especies' && /Draft translation/.test(re.marker), { early, re });
  for (const mode of [['data-light', 'red'], ['data-contrast', 'more']]) {
    await p.evaluate(m => document.documentElement.setAttribute(m[0], m[1]), mode); await p.waitForTimeout(300);
    const c = await p.evaluate(() => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const m = document.getElementById('i18n-draft'), bg = getComputedStyle(m).backgroundColor, r = [];
      for (const el of [m.querySelector('.i18n-draft-tag'), m.querySelector('.i18n-draft-text')]) { const x = lum(getComputedStyle(el).color), y = lum(bg); r.push((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)); }
      return { bg, r };
    });
    ok(mode.join('=') + ': draft marker readable (>= 4.5:1)', c.r.every(x => x >= 4.5), c);
    await p.evaluate(m => document.documentElement.removeAttribute(m[0]), mode);
  }
  await p.goto(B + 'log', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const lg = await p.evaluate(() => ({ sum: (document.querySelector('#add-private summary') || {}).textContent, date: (document.querySelector('label[for="date"]') || {}).textContent,
    ph: (document.querySelector('#trip-form textarea') || {}).placeholder, opts: [...document.querySelectorAll('#trip-form option')].map(o => o.textContent).join('|'),
    ov: document.documentElement.scrollWidth - 390 }));
  ok('log es: form labels and placeholder in Spanish', lg.sum === 'Añadir una salida' && lg.date === 'Fecha' && /Tiempo, luna/.test(lg.ph || ''), lg);
  ok('log es: species and ramp options stay English', /Walleye/.test(lg.opts) && /Walnut Street ramp/.test(lg.opts) && /Channel catfish/.test(lg.opts), lg.opts.slice(0, 300));
  ok('log es: no sideways scroll', lg.ov <= 1, lg.ov);
  // back to English from the panel
  await p.goto(B + 'hoover/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.locator('.site-footer [data-lang-open]').click(); await p.waitForTimeout(300);
  await p.selectOption('#a11y-lang', 'en'); await p.waitForTimeout(600); await p.keyboard.press('Escape');
  const back = await p.evaluate(state);
  ok('back to English: labels restored, marker gone, nb-lang cleared', back.lang === 'en' && back.nav === 'Species' && back.glance === 'Tonight at a glance' && !back.marker && !back.store, back);
  ok('no page errors', !errs.length, errs);
  // missing key falls back to English (string file served without nav.gear)
  const c2 = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await na.block(c2);
  await c2.route(/data\/i18n\/es\.json/, async r => { const res = await r.fetch(); const j = await res.json(); delete j.strings['nav.gear']; await r.fulfill({ response: res, json: j }); });
  await c2.addInitScript(() => { try { localStorage.setItem('nb-lang', 'es'); } catch (e) {} });
  const p2 = await c2.newPage(); await p2.goto(B + 'hoover/', { waitUntil: 'networkidle' }); await p2.waitForTimeout(700);
  const fb = await p2.evaluate(state);
  ok('missing key falls back to English (Gear), others Spanish', fb.gear === 'Gear' && fb.nav === 'Especies' && fb.lang === 'es', fb);
  // header fit at 390: logo, lake pill and nav inside the row, nav on one row, nothing overlapping (S9c)
  const fit = () => {
    const W = 390, r = el => el && el.getBoundingClientRect(), inV = b => b && b.width > 0 && b.left >= -1 && b.right <= W + 1;
    const hdr = document.querySelector('.header-inner'), logo = r(document.querySelector('.logo')), pill = r(document.querySelector('.lake-pill'));
    const nav = [...document.querySelectorAll('.site-nav > ul > li')].filter(li => li.offsetParent).map(r);
    const over = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    return { hdrOv: hdr.scrollWidth - hdr.clientWidth, logo: inV(logo), pill: inV(pill), nav: nav.length && nav.every(inV),
      navHitsLogo: nav.some(b => over(b, logo)), navHitsPill: nav.some(b => over(b, pill)), oneRow: nav.every(b => Math.abs(b.top - nav[0].top) < 4),
      ov: document.documentElement.scrollWidth - 390 };
  };
  // every other drafted language (S9b+): applies (html lang, marker, Species nav from its file), facts untouched, no sideways scroll at 390
  const langs = fs.readdirSync(path.join(__dirname, '..', 'data', 'i18n')).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).filter(l => l !== 'en' && l !== 'es');
  for (const l of langs) {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'i18n', l + '.json'), 'utf8'));
    const c3 = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await na.block(c3);
    await c3.addInitScript(v => { try { localStorage.setItem('nb-lang', v); } catch (e) {} }, l);
    const p3 = await c3.newPage(); const e3 = []; p3.on('pageerror', e => e3.push(e.message));
    await p3.goto(B + 'hoover/', { waitUntil: 'networkidle' }); await p3.waitForTimeout(700);
    const st = await p3.evaluate(state), f3 = await p3.evaluate(fit);
    ok(`${l}: applies (lang, dir ${(j._meta && j._meta.dir) || 'ltr'}, marker, nav), facts unchanged, no sideways scroll, no errors`, st.lang === l && st.dir === ((j._meta && j._meta.dir) || 'ltr') && /Draft translation/.test(st.marker) && st.nav === j.strings['nav.species'] && st.h1 === en.h1 && !!st.chip && st.chip !== en.chip && st.ov <= 1 && !e3.length, { st, e3 });
    ok(`${l}: header fits at 390 (logo, lake pill, nav in view, one row, no overlap)`, f3.ov <= 1 && f3.hdrOv <= 1 && f3.logo && f3.pill && f3.nav && f3.oneRow && !f3.navHitsLogo && !f3.navHitsPill, f3);
    await c3.close();
  }
  // RTL (S9c): Arabic from the panel, then reload, header fit, panel, Log, and back to LTR
  const marks = () => ({ chip: (document.querySelector('.night-chip-text') || {}).dir, pool: (document.querySelector('[data-glance="pool"]') || {}).dir,
    h1: (document.querySelector('main h1') || {}).dir, left: [...document.querySelectorAll('[data-nb-ltr]')].length });
  const c4 = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await na.block(c4);
  const p4 = await c4.newPage(); const e4 = []; p4.on('pageerror', e => e4.push(e.message));
  await p4.goto(B + 'hoover/', { waitUntil: 'networkidle' }); await p4.waitForTimeout(400);
  const enFit = await p4.evaluate(fit);
  await p4.locator('.site-footer [data-lang-open]').click(); await p4.waitForTimeout(300);
  await p4.selectOption('#a11y-lang', 'ar'); await p4.waitForTimeout(800);
  const panel = await p4.evaluate(() => { const b = document.querySelector('.a11y-panel').getBoundingClientRect(), s = document.querySelector('#a11y-lang').getBoundingClientRect();
    return { dir: document.documentElement.dir, inV: b.left >= -1 && b.right <= 391 && s.left >= b.left - 1 && s.right <= b.right + 1, ov: document.documentElement.scrollWidth - 390 }; });
  ok('ar: picking it sets html dir="rtl"; Display panel and its select fit at 390', panel.dir === 'rtl' && panel.inV && panel.ov <= 1, panel);
  await p4.keyboard.press('Escape'); await p4.waitForTimeout(200);
  await p4.reload({ waitUntil: 'load' });
  const earlyDir = await p4.evaluate(() => document.documentElement.dir);
  await p4.waitForLoadState('networkidle'); await p4.waitForTimeout(700);
  const ar = await p4.evaluate(state), arFit = await p4.evaluate(fit), arMk = await p4.evaluate(marks);
  ok('ar: dir="rtl" kept on reload, set before page scripts', earlyDir === 'rtl' && ar.dir === 'rtl' && ar.lang === 'ar' && ar.store === 'ar', { earlyDir, ar });
  ok('ar: no sideways scroll at 390 (hoover/)', arFit.ov <= 1, arFit);
  ok('ar: header still fits (logo, lake pill, nav in view, one row, no overlap)', arFit.hdrOv <= 1 && arFit.logo && arFit.pill && arFit.nav && arFit.oneRow && !arFit.navHitsLogo && !arFit.navHitsPill, { arFit, enFit });
  ok('ar: Draft translation marker in view, nav in Arabic', /Draft translation/.test(ar.marker) && ar.nav === 'الأنواع', ar);
  ok('ar: rule chip translated, level number and lake name unchanged and marked dir="ltr"', ar.chip !== en.chip && ar.poolVal === en.poolVal && ar.h1 === en.h1 && arMk.chip !== 'ltr' && arMk.pool === 'ltr' && arMk.h1 === 'ltr', { ar, arMk });
  await p4.goto(B + 'log', { waitUntil: 'networkidle' }); await p4.waitForTimeout(700);
  const alog = await p4.evaluate(() => { const o = [...document.querySelectorAll('#trip-form option')]; const w = o.find(x => /Walleye/.test(x.textContent));
    return { dir: document.documentElement.dir, date: (document.querySelector('label[for="date"]') || {}).textContent, wdir: w && w.dir,
      ov: document.documentElement.scrollWidth - 390, formIn: (() => { const b = document.querySelector('#trip-form').getBoundingClientRect(); return b.left >= -1 && b.right <= 391; })() }; });
  ok('log ar: dir rtl, labels in Arabic, species option marked dir="ltr", form in view, no sideways scroll', alog.dir === 'rtl' && alog.date === 'التاريخ' && alog.wdir === 'ltr' && alog.formIn && alog.ov <= 1, alog);
  // to a left-to-right language: dir resets, no leftover ltr marks
  await p4.goto(B + 'hoover/', { waitUntil: 'networkidle' }); await p4.waitForTimeout(500);
  await p4.locator('.site-footer [data-lang-open]').click(); await p4.waitForTimeout(300);
  await p4.selectOption('#a11y-lang', 'fr'); await p4.waitForTimeout(800); await p4.keyboard.press('Escape');
  const fr = await p4.evaluate(state), frMk = await p4.evaluate(marks);
  ok('ar to fr: html dir="ltr", no leftover dir marks', fr.dir === 'ltr' && fr.lang === 'fr' && frMk.left === 0 && !frMk.chip, { fr, frMk });
  for (const l of ['ur', 'fa']) {
    await p4.locator('.site-footer [data-lang-open]').click(); await p4.waitForTimeout(300);
    await p4.selectOption('#a11y-lang', l); await p4.waitForTimeout(800); await p4.keyboard.press('Escape');
    const s4 = await p4.evaluate(state), f4 = await p4.evaluate(fit), m4 = await p4.evaluate(marks);
    ok(`${l}: dir="rtl", header fits, no sideways scroll, chip in RTL (translated)`, s4.dir === 'rtl' && s4.lang === l && f4.ov <= 1 && f4.hdrOv <= 1 && f4.nav && f4.logo && f4.pill && !f4.navHitsLogo && !f4.navHitsPill && m4.chip !== 'ltr', { s4, f4, m4 });
  }
  await p4.locator('.site-footer [data-lang-open]').click(); await p4.waitForTimeout(300);
  await p4.selectOption('#a11y-lang', 'en'); await p4.waitForTimeout(700); await p4.keyboard.press('Escape');
  const b4 = await p4.evaluate(state), bm = await p4.evaluate(marks);
  await p4.reload({ waitUntil: 'networkidle' }); const b5 = await p4.evaluate(state);
  ok('RTL back to English: dir="ltr", marks gone, nb-lang cleared, still ltr after reload', b4.dir === 'ltr' && b4.lang === 'en' && bm.left === 0 && !b4.store && b5.dir === 'ltr' && b5.lang === 'en', { b4, bm, b5 });
  ok('RTL run: no page errors', !e4.length, e4);
  await c4.close();

  // UI coverage (S10): in ja, ar (no Latin script of their own) and de, on the home, two lake homes, Water, Log and Species,
  // every visible UI element (headings, summaries, buttons, labels, legends, table heads, glance labels, subs and status
  // lines, fold and filter controls, intro lines) is translated. ja/ar: its own text, minus the English-kept terms (lake,
  // ramp and species names, agencies, brands, units), has no English word left. All three: no UI text still equals an
  // English string that has a key. h1 (titles), options (names), NWS forecast words and [data-nb-keep] are exempt.
  const EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'i18n', 'en.json'), 'utf8')).strings;
  const enVals = Object.values(EN).map(v => v.replace(/\s+/g, ' ').trim()).filter(v => !/\{\w+\}/.test(v));
  const UIPAGES = ['', 'hoover/', 'oshaughnessy/', 'alum/', 'water', 'log', 'species/'];
  const audit = ([enVals, trVals]) => {
    const SEL = 'h2,h3,h4,h5,summary,button,label,legend,th,dt,.glance-label,.glance-sub,.glance-stamp,.cond-label,.cond-sub,.pool-readout-label,.pool-trend-label,.spy-label,.filter-chip,a.btn,.lead,.wp-lead,.wp-browse-sub,.get-app-lead,.bite-tonight,.qf-checked,.qf-list dd,.qf-docks,.quick-facts .info-tip-body';
    const L = window.NightBiteLakes || {}, kept = ['Columbus Recreation and Parks', 'Oxbow Road', 'Sunbury Road', 'Twin Bridges', 'Red Bank', 'Walnut Street', 'Mudflats Boardwalk', 'Home Road', 'Bellepoint', 'Twin Lakes', 'New Galena', 'Hollenback Road', 'Cheshire Road', 'Cheshire', 'Howard', 'US 36/SR 37', 'The Night Bite', 'Whisperwood Vale', 'Whisperwood', 'ODNR', 'USGS', 'USACE', 'NWS', 'GitHub', 'iPhone', 'Android', 'iOS', 'Chrome', 'Ohio', 'PDF', 'Corps', 'markdown', 'URL', 'weather.gov', 'issue', 'Cats', 'Bass', 'Panfish', 'wiper'];
    Object.values(L.all || {}).forEach(c => ['name', 'short'].forEach(k => c[k] && kept.push(c[k])));
    const sp = L.speciesNames || {}; Object.keys(sp).forEach(k => { kept.push(k); if (typeof sp[k] === 'string') kept.push(sp[k]); });
    kept.sort((a, b) => b.length - a.length);
    const out = [];
    document.querySelectorAll(SEL).forEach(el => {
      if (!el.offsetParent || el.closest('h1, option, .cond-summary, [data-nb-keep], .i18n-draft, .map-card, .bait-list, .lake-sheet-list, .wp-grid')) return;
      let t = ''; el.childNodes.forEach(n => { if (n.nodeType === 3) t += n.nodeValue; });
      t = t.replace(/\s+/g, ' ').trim(); if (!t) return;
      let r = t; kept.forEach(k => { r = r.split(k).join(' '); });
      const nonLatin = /[^\u0000-\u024f\u2000-\u206f\u00a0-\u00ff]/.test(t);
      out.push({ t: t.slice(0, 90), eng: !nonLatin && /[A-Za-z]{3,}/.test(r.replace(/\b(ft|mph|AM|PM|ET|min|hrs?)\b/g, '')), same: enVals.includes(t) && !trVals.includes(t) && !kept.includes(t) });
    });
    return out;
  };
  for (const l of ['ja', 'ar', 'de']) {
    const c5 = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await na.block(c5);
    await c5.addInitScript(v => { try { localStorage.setItem('nb-lang', v); } catch (e) {} }, l);
    const trVals = Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'i18n', l + '.json'), 'utf8')).strings).map(v => v.replace(/\s+/g, ' ').trim());
    const p5 = await c5.newPage(); const e5 = []; p5.on('pageerror', e => e5.push(e.message));
    for (const pg of UIPAGES) {
      await p5.goto(B + pg, { waitUntil: 'networkidle' }); await p5.waitForTimeout(900);
      const a = await p5.evaluate(audit, [enVals, trVals]);
      const bad = a.filter(x => x.same || (l !== 'de' && x.eng)).map(x => x.t);
      ok(`${l} /${pg}: every visible heading, label, control and status line translated (${a.length} checked)`, a.length > 3 && !bad.length, bad.slice(0, 12));
    }
    ok(`${l} UI coverage run: no page errors`, !e5.length, e5);
    await c5.close();
  }
  // back to English restores the page UI too
  {
    const c6 = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await na.block(c6);
    const p6 = await c6.newPage(); await p6.goto(B + 'hoover/', { waitUntil: 'networkidle' }); await p6.waitForTimeout(500);
    const grab = () => [...document.querySelectorAll('main h2, main summary, main dt, .glance-sub, .cond-label')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join('|');
    const before = await p6.evaluate(grab);
    await p6.locator('.site-footer [data-lang-open]').click(); await p6.waitForTimeout(300);
    await p6.selectOption('#a11y-lang', 'ja'); await p6.waitForTimeout(900);
    const mid = await p6.evaluate(grab);
    await p6.selectOption('#a11y-lang', 'en'); await p6.waitForTimeout(700); await p6.keyboard.press('Escape');
    const after = await p6.evaluate(grab);
    ok('hoover/ page UI: ja swaps headings and labels, English restores them exactly', mid !== before && /クイック|早わかり/.test(mid) && after === before, { before: before.slice(0, 160), after: after.slice(0, 160) });
    await c6.close();
  }
  // Readable text (S10): scripts the pixel fonts can't draw show it on and locked with a note; Latin languages keep the
  // toggle working like English; the saved setting is never overwritten, so English gets the user's own choice back.
  {
    const c7 = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await na.block(c7);
    const p7 = await c7.newPage(); const e7 = []; p7.on('pageerror', e => e7.push(e.message));
    await p7.goto(B + 'hoover/', { waitUntil: 'networkidle' }); await p7.evaluate(() => localStorage.clear()); await p7.reload({ waitUntil: 'networkidle' });
    const rd = () => { const f = document.querySelector('#a11y-font'), n = document.querySelector('#a11y-font-note'), h = document.documentElement;
      return { checked: f.checked, disabled: f.disabled, note: n.textContent, attr: h.getAttribute('data-font'), saved: (JSON.parse(localStorage.getItem('nb-a11y') || '{}')).font || null,
        bodyFont: getComputedStyle(document.body).fontFamily, lang: h.lang, dir: h.dir }; };
    await p7.locator('.site-footer [data-lang-open]').click(); await p7.waitForTimeout(300);
    const r0 = await p7.evaluate(rd);
    ok('English, fresh: Readable text off and enabled', !r0.checked && !r0.disabled && !r0.attr, r0);
    // S11: every language other than English is locked (readable over pixel)
    const SYS = ['zh', 'ja', 'ko', 'hi', 'ar', 'ur', 'fa', 'ru', 'es', 'tl', 'vi', 'fr', 'pt', 'ht', 'de', 'pl', 'it'];
    for (const l of SYS) {
      await p7.selectOption('#a11y-lang', l); await p7.waitForTimeout(700);
      const r = await p7.evaluate(rd), lock = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'i18n', l + '.json'), 'utf8')).strings['display.readable_locked'];
      ok(`${l}: Readable text shown on and locked, note "${lock}", system font in use, saved setting untouched`, r.checked && r.disabled && r.note === lock && !/Pixel/.test(r.bodyFont.split(',')[0]) && r.saved === null, r);
    }
    { // English keeps the working toggle
      await p7.selectOption('#a11y-lang', 'en'); await p7.waitForTimeout(500);
      const a = await p7.evaluate(rd);
      await p7.check('#a11y-font'); await p7.waitForTimeout(200); const b = await p7.evaluate(rd);
      await p7.uncheck('#a11y-font'); await p7.waitForTimeout(200); const c = await p7.evaluate(rd);
      ok('en: Readable text toggle works (off, on, off; saved and applied each time)', !a.checked && !a.disabled && b.checked && b.attr === 'readable' && b.saved === 'readable' && !c.checked && !c.attr && c.saved === null, { a, b, c });
    }
    // user turns Readable on in English, then a locked language, then back: still on; and off stays off
    await p7.selectOption('#a11y-lang', 'en'); await p7.waitForTimeout(500);
    await p7.check('#a11y-font'); await p7.waitForTimeout(200);
    await p7.selectOption('#a11y-lang', 'ja'); await p7.waitForTimeout(700);
    await p7.selectOption('#a11y-lang', 'en'); await p7.waitForTimeout(600);
    const on = await p7.evaluate(rd);
    await p7.uncheck('#a11y-font'); await p7.waitForTimeout(200);
    await p7.selectOption('#a11y-lang', 'ar'); await p7.waitForTimeout(700);
    const arL = await p7.evaluate(rd);
    await p7.selectOption('#a11y-lang', 'en'); await p7.waitForTimeout(600);
    const off = await p7.evaluate(rd);
    ok('back to English restores the saved Readable setting (on stays on, off stays off)', on.checked && !on.disabled && on.attr === 'readable' && on.saved === 'readable' && !off.checked && !off.disabled && !off.attr && off.saved === null, { on, off });
    ok('ar: locked Readable row stays inside the panel (RTL)', arL.dir === 'rtl' && arL.disabled && await p7.evaluate(() => { const b = document.querySelector('.a11y-panel').getBoundingClientRect(), r = document.querySelector('#a11y-font').closest('.a11y-row').getBoundingClientRect(); return r.left >= b.left - 1 && r.right <= b.right + 1; }), arL);
    const noteCR = () => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const bgOf = el => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; el = el.parentElement; } return 'rgb(0,0,0)'; };
      const n = document.querySelector('#a11y-font-note'), x = lum(getComputedStyle(n).color), y = lum(bgOf(n));
      return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100;
    };
    for (const mode of [['data-light', 'red'], ['data-contrast', 'more']]) {
      await p7.evaluate(m => document.documentElement.setAttribute(m[0], m[1]), mode);
      await p7.selectOption('#a11y-lang', 'en'); await p7.waitForTimeout(400);
      const base = await p7.evaluate(noteCR);
      await p7.selectOption('#a11y-lang', 'ko'); await p7.waitForTimeout(600);
      const cr = await p7.evaluate(noteCR), r = await p7.evaluate(rd);
      ok(mode.join('=') + `: locked Readable note keeps the mode's own note contrast (${cr}:1, English note ${base}:1)`, r.disabled && r.checked && cr >= base && cr >= 4, { cr, base });
      await p7.evaluate(m => document.documentElement.removeAttribute(m[0]), mode);
    }
    await p7.selectOption('#a11y-lang', 'en'); await p7.waitForTimeout(400);
    ok('Readable run: no page errors', !e7.length, e7);
    await c7.close();
  }
  await br.close();
  console.log(`check-i18n: ${passes} pass, ${fails} fail`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed :: ' + e.message); process.exit(1); });
