#!/usr/bin/env node
/* Minimum computed font size at 390px on phones (UX audit 2026-11-18, step 4).
 *   node tools/check-min-font.cjs <base> [outDir]
 *     e.g. http://127.0.0.1:8765/night-bite-preview/
 * Pages: /?pick, /night (every region opened), /rules, /drawdown, /species/trout, and each lake in NB_LAKES
 * (default hoover). Quick facts on a lake home is opened. Also checks German nav on the first lake (or /?pick)
 * so translated labels stay at the 13px nav floor.
 *
 * Floors (computed px): 13px for header and footer nav text; 14px for everything else that is visible.
 * Data sublabels and the USGS provenance line are always required to meet 14px (not allowlisted).
 * A short allowlist covers justified exceptions (legal fine print, unit suffixes, compact chrome
 * that is not a data sublabel). Allowlisted hits are NOTE, not FAIL.
 * Hidden, sr-only, aria-hidden, clipped table headers, off-screen, and closed disclosure/dialog text
 * are skipped. Prints PASS/FAIL/NOTE lines (check-all counts FAIL lines); exit 1 on any FAIL.
 * Analytics blocked.
 */
const fs = require('fs');
const path = require('path');
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));
const { chromium } = require(PW);
const na = require(path.join(__dirname, 'no-analytics.cjs'));

const B = (process.argv[2] || 'http://127.0.0.1:8765/night-bite-preview/').replace(/\/?$/, '/');
const OUT = process.argv[3] || '';
const lakes = (process.env.NB_LAKES || 'hoover').split(',').map(s => s.trim()).filter(Boolean);
const PAGES = ['?pick', 'night', 'rules', 'drawdown', 'species/trout', ...lakes.map(id => id + '/')];
const MIN = 14;
const NAV_MIN = 13;

let fails = 0, passes = 0, notes = 0;

function ok(name, cond, info) {
  if (cond) passes++; else fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' :: ' + JSON.stringify(info) : ''));
}
function note(name, info) {
  notes++;
  console.log('NOTE ' + name + (info !== undefined ? ' :: ' + JSON.stringify(info) : ''));
}

(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: na.args() });
  const ctx = await br.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, serviceWorkers: 'block'
  });
  await na.block(ctx);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const report = [];

  async function collect(rel, lang) {
    const url = B + rel;
    await page.goto(url, { waitUntil: 'load' });
    if (lang) {
      await page.evaluate((code) => {
        try { localStorage.setItem('nb-lang', code); } catch (e) {}
        document.documentElement.setAttribute('data-lang', code);
      }, lang);
      await page.goto(url, { waitUntil: 'load' });
    }
    if (rel === 'night') {
      await page.evaluate(() => document.querySelectorAll('.night-region').forEach(d => { d.open = true; }));
      await page.waitForTimeout(200);
    }
    if (/\/$/.test(rel) && rel !== '') {
      await page.evaluate(() => {
        const qf = document.querySelector('#quick-facts, details.quick-facts');
        if (qf) qf.open = true;
      });
    }
    await page.waitForTimeout(400);
    return page.evaluate(({ min, navMin }) => {
      function visible(el) {
        if (!el || el.nodeType !== 1) return false;
        if (el.closest('.sr-only, [hidden], [aria-hidden="true"]')) return false;
        if (el.classList && el.classList.contains('sr-only')) return false;
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return false;
        if (Math.abs(r.left) > 8000 || Math.abs(r.top) > 8000) return false;
        const parent = el.closest('details:not([open])');
        if (parent && parent !== el && !el.closest('summary')) return false;
        const dlg = el.closest('dialog');
        if (dlg && !dlg.open) return false;
        const thead = el.closest('thead');
        if (thead) {
          const ts = getComputedStyle(thead);
          if (ts.position === 'absolute' || ts.clipPath && ts.clipPath !== 'none') return false;
        }
        return true;
      }
      function isNav(el) {
        return !!el.closest('.site-nav, .nav-more-btn, .nav-more-panel, .footer-inner nav, .footer-guides, .footer-app, .site-footer nav');
      }
      function isRequired(el, pseudo) {
        if (el.closest('.glance-label, .glance-sub, .glance-stamp, .cond-label, .cond-sub, .cond-hour-t, .cond-hour-wind, .cond-hour-pop, .chip-label, .pool-readout-label')) return true;
        if (pseudo === '::before' && el.matches('.stack-table tbody td, .stack-table tbody td.num, .access-table td[data-label]')) return true;
        return false;
      }
      // Short allowlist of justified exceptions. Hits are noted, not failed.
      const ALLOW = [
        { q: '.disclaimer-short, .disclaimer, .cond-bite-note', why: 'legal or caveat fine print' },
        { q: '.glance-unit, .cond-unit, .pool-readout-unit, .pool-trend-unit', why: 'unit suffix beside a large numeral' },
        { q: '.guides-label, .nav-guides-label, .social-label', why: 'footer or menu group heading' },
        { q: '.preview-chip, .sample-badge, .is-new', why: 'status badge' },
        { q: '.lake-pill-label, .lake-pill-chip', why: 'header water-picker chip' },
        { q: '.summary-chip', why: 'compact night-access status chip' },
        { q: '.wp-chip, .wp-area, .wp-gauge, .wp-region-title, .wp-title', why: 'picker tile chrome' },
        { q: '.logo-text', why: 'site wordmark (already 13px at 390)' },
        { q: '.bento-card h2, .bento-card h3, .get-app-intro h2, .glance-title, .qf-title, .lake-links-label', why: 'card or section title, not a data sublabel' },
        { q: '.glance-btn, .glance-note, .night-chip-left, .pool-trend-label, .pool-trend-word, .pool-chart-name, .pool-chart figcaption, .contour-map-summary-note, .cond-x-label, .cond-x-value, .bait-near, .btn-ghost, .night-search label, .data-glance-list dt, .qf-list dt, .quick-facts dt', why: '12–13px UI chrome, not a data sublabel' },
        { q: 'details > summary, summary', why: 'disclosure summary label' },
      ];
      function allowWhy(el) {
        for (const a of ALLOW) {
          try { if (el.closest(a.q) || el.matches(a.q)) return a.why; } catch (e) {}
        }
        return '';
      }
      const out = [];
      const seen = new Set();
      function add(el, text, pseudo) {
        if (!visible(el)) return;
        const t = (text || '').replace(/\s+/g, ' ').trim();
        if (!t) return;
        const st = getComputedStyle(el, pseudo || null);
        const px = parseFloat(st.fontSize);
        if (!Number.isFinite(px)) return;
        const key = (el.id || '') + '|' + (typeof el.className === 'string' ? el.className : '') + '|' + (pseudo || '') + '|' + t.slice(0, 80);
        if (seen.has(key)) return;
        seen.add(key);
        const nav = isNav(el);
        const required = isRequired(el, pseudo);
        const floor = nav && !required ? navMin : min;
        const cls = (typeof el.className === 'string' ? el.className.trim() : '').slice(0, 80);
        const why = (!required && px + 0.05 < floor) ? allowWhy(el) : '';
        out.push({
          px: Math.round(px * 10) / 10,
          floor,
          nav,
          required,
          allow: why,
          tag: el.tagName.toLowerCase(),
          cls,
          pseudo: pseudo || '',
          text: t.slice(0, 90)
        });
      }
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) add(node.parentElement, node.textContent, '');
      document.querySelectorAll('*').forEach(el => {
        for (const pseudo of ['::before', '::after']) {
          const raw = getComputedStyle(el, pseudo).content;
          if (!raw || raw === 'none') continue;
          const t = raw.replace(/^['"]|['"]$/g, '');
          if (t && t !== 'none') add(el, t, pseudo);
        }
      });
      const sw = document.documentElement.scrollWidth;
      const iw = window.innerWidth;
      return { rows: out, scroll: { sw, iw, overflow: sw > iw + 1 }, lang: document.documentElement.getAttribute('data-lang') || '' };
    }, { min: MIN, navMin: NAV_MIN });
  }

  for (const rel of PAGES) {
    const data = await collect(rel, '');
    const pageName = rel === '?pick' ? '/' : '/' + rel.replace(/\/$/, rel.endsWith('/') ? '/' : '');
    const short = data.rows.filter(r => r.px + 0.05 < r.floor);
    const failRows = short.filter(r => r.required || !r.allow);
    const noteRows = short.filter(r => !r.required && r.allow);
    for (const r of failRows) {
      ok(pageName + ' ' + (r.required ? 'sublabel ' : '') + (r.nav ? 'nav ' : '') + (r.cls || r.tag) + (r.pseudo ? ' ' + r.pseudo : '') + ' "' + r.text + '"', false, { px: r.px, floor: r.floor });
    }
    for (const r of noteRows) {
      note(pageName + ' ' + (r.cls || r.tag) + (r.pseudo ? ' ' + r.pseudo : '') + ' "' + r.text + '"', { px: r.px, floor: r.floor, why: r.allow });
    }
    if (failRows.length === 0) {
      ok(pageName + ' visible text meets ' + MIN + 'px (' + NAV_MIN + 'px nav), ' + data.rows.length + ' nodes', true);
    }
    if (data.scroll.overflow) ok(pageName + ' no horizontal scroll at 390', false, data.scroll);
    else ok(pageName + ' no horizontal scroll at 390', true);
    report.push({ page: pageName, total: data.rows.length, fail: failRows.length, note: noteRows.length, scroll: data.scroll, samples: short.slice(0, 30) });
  }

  // Translated nav must also stay at 13px (ellipsis may kick in; the page must not scroll sideways).
  const langRel = (lakes[0] ? lakes[0] + '/' : '?pick');
  const de = await collect(langRel, 'de');
  const deNav = de.rows.filter(r => r.nav);
  const deShort = deNav.filter(r => r.px + 0.05 < NAV_MIN && !r.allow);
  const deNotes = deNav.filter(r => r.px + 0.05 < NAV_MIN && r.allow);
  const deName = '/de ' + (langRel === '?pick' ? '/' : '/' + langRel);
  for (const r of deNotes) {
    note(deName + ' ' + (r.cls || r.tag) + ' "' + r.text + '"', { px: r.px, floor: NAV_MIN, why: r.allow });
  }
  if (deShort.length) {
    for (const r of deShort) ok(deName + ' nav "' + r.text + '"', false, { px: r.px, floor: NAV_MIN });
  } else {
    ok(deName + ' nav text is ' + NAV_MIN + 'px or larger (' + deNav.length + ' nodes, lang=' + de.lang + ')', true);
  }
  if (de.scroll.overflow) ok(deName + ' no horizontal scroll at 390', false, de.scroll);
  else ok(deName + ' no horizontal scroll at 390', true);
  report.push({ page: deName, total: deNav.length, fail: deShort.length, note: 0, scroll: de.scroll, lang: de.lang });

  if (errs.length) ok('no page errors', false, errs);
  else ok('no page errors', true);

  await br.close();
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'min-font.json'), JSON.stringify({ min: MIN, navMin: NAV_MIN, pages: report }, null, 2));
  }
  console.log(`check-min-font: ${passes} pass, ${fails} fail, ${notes} allowlist notes`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
