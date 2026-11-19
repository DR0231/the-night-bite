#!/usr/bin/env node
/* 44px minimum tap height at 390px on phones (UX audit 2026-11-18).
 *   node tools/check-tap-targets.cjs <base> [outDir]
 *     e.g. http://127.0.0.1:8765/night-bite-preview/
 * Pages: /?pick, /night (every region opened), /rules, /drawdown, /species/trout, and each lake in NB_LAKES
 * (default hoover). Quick facts on a lake home is opened so its source line is measured.
 * Fails on a visible control shorter than 44px, except:
 *   · inline links inside running sentences (noted, not a failure)
 *   · hidden, sr-only, aria-hidden, off-screen, or closed disclosure/dialog controls
 *   · the trip-form honeypot (#c-website)
 * Width under 44px is allowed on text links (the word can be short); icon-only buttons still need 44px square.
 * Prints PASS/FAIL/NOTE lines (check-all counts FAIL lines); exit 1 on any FAIL. Analytics blocked.
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
const MIN = 44;
const SEL = 'a, button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"]';

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

  for (const rel of PAGES) {
    const url = B + rel;
    await page.goto(url, { waitUntil: 'load' });
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
    const rows = await page.evaluate(({ sel, min }) => {
      function visible(el) {
        if (el.closest('.sr-only, [hidden], [aria-hidden="true"]')) return false;
        if (el.classList.contains('sr-only')) return false;
        if (el.id === 'c-website' || el.closest('.hp-field')) return false;
        if (el.tabIndex < 0 && (el.id === 'c-website' || el.closest('[aria-hidden="true"]'))) return false;
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        // off-screen honeypots and clipped visually-hidden controls
        if (r.right < 0 || r.bottom < 0 || r.left > (window.innerWidth + 40) || r.top > document.documentElement.scrollHeight) return false;
        if (Math.abs(r.left) > 8000 || Math.abs(r.top) > 8000) return false;
        const parent = el.closest('details:not([open])');
        if (parent && parent !== el && !el.closest('summary')) return false;
        const dlg = el.closest('dialog');
        if (dlg && !dlg.open) return false;
        return true;
      }
      function isInlineProse(el) {
        if (el.tagName !== 'A' && el.getAttribute('role') !== 'link') return false;
        if (el.closest('.summary-head, .summary-src, .qf-src, .lake-links-also, .stack-table th, .site-nav, .site-footer, .footer-guides, .footer-social, .nav-more-panel, .wp-chip, .wp-browse-link')) return false;
        const block = el.closest('p, li, dd, .lead, .callout, .disclaimer-short, .dock-note, .summary-body, .qf-docks, .info-tip-body, blockquote');
        if (!block) return false;
        const kids = [...block.childNodes].filter(n => !(n.nodeType === 3 && !n.textContent.trim()));
        if (kids.length === 1 && (kids[0] === el || (kids[0].nodeType === 1 && kids[0].contains(el) && kids[0].childNodes.length <= 1))) return false;
        return true;
      }
      function isIconOnly(el) {
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
        return el.tagName === 'BUTTON' && text.length === 0;
      }
      return [...document.querySelectorAll(sel)].filter(visible).map(el => {
        const r = el.getBoundingClientRect();
        const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.id || el.className || el.tagName)
          .toString().trim().replace(/\s+/g, ' ').slice(0, 90);
        const cls = (typeof el.className === 'string' ? el.className : '').trim().slice(0, 80);
        return {
          tag: el.tagName.toLowerCase(),
          cls,
          href: (el.getAttribute('href') || '').slice(0, 90),
          label,
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          inline: isInlineProse(el),
          icon: isIconOnly(el),
        };
      });
    }, { sel: SEL, min: MIN });

    const pageName = rel === '?pick' ? '/' : '/' + rel.replace(/\/$/, rel.endsWith('/') ? '/' : '');
    const short = [];
    for (const r of rows) {
      const shortH = r.h < MIN;
      const shortW = r.icon && r.w < MIN;
      if (!shortH && !shortW) continue;
      short.push(r);
      const info = { h: r.h, w: r.w, tag: r.tag, class: r.cls, text: r.label };
      if (r.inline && !r.icon) {
        note(pageName + ' inline ' + r.label, info);
      } else {
        ok(pageName + ' ' + (r.label || r.tag), false, info);
      }
    }
    const n = rows.length;
    const bad = short.filter(r => !r.inline || r.icon).length;
    if (bad === 0) ok(pageName + ' all ' + n + ' controls are 44px or taller', true);
    report.push({ page: pageName, total: n, fail: bad, note: short.filter(r => r.inline && !r.icon).length, samples: short.slice(0, 20) });
  }

  if (errs.length) ok('no page errors', false, errs);
  else ok('no page errors', true);

  await br.close();
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'tap-targets.json'), JSON.stringify({ min: MIN, pages: report }, null, 2));
  }
  console.log(`check-tap-targets: ${passes} pass, ${fails} fail, ${notes} inline notes`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
