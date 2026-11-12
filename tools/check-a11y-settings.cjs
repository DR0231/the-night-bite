#!/usr/bin/env node
/* Display settings (js/a11y-boot.js + js/a11y.js), end to end:
 *   node tools/check-a11y-settings.cjs <base> [outDir] [pages]     pages default: ",hoover/,species/" (comma list)
 * At 390 (phone, via the More menu) and 1280 (desktop, via the footer) on each page: the Display button shows, the
 * panel opens as a modal with focus inside and closes on Escape with focus back on a button; each text size sets
 * data-text and changes the root font size; Large and Extra large turn on readable text; Readable text swaps body, nav
 * and heading fonts to the system font while the logo keeps its pixel face; Less motion stops transitions; High contrast
 * sets data-contrast and keeps body/nav text >= 7:1; every setting persists after a reload and is on <html> before
 * first paint (checked from a script that runs before the stylesheet's first paint); no sideways scroll at XL;
 * Reset clears it. Red light at 390: applies, red text on true black, nothing brighter than the red ceiling, the share card
 * is drawn red, pictures get the red filter and the lantern does not, it persists before paint and turns off cleanly.
 * Touch targets at 390 (page and More menu): every control >= 44x44 except inline text links and the scrollspy rail. Focus: Tab through the
 * first 12 stops at 390 and 1280 shows a ring on each.
 * Prints PASS/FAIL lines; exit 1 on any FAIL. Analytics blocked (tools/no-analytics.cjs).
 */
const path = require('path');
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));   // PLAYWRIGHT_CORE, then node_modules, then the box copy
const { chromium } = require(PW);
const na = require(path.join(__dirname, 'no-analytics.cjs'));
const B = (process.argv[2] || 'http://127.0.0.1:8765/night-bite-preview/').replace(/\/?$/, '/');
const PAGES = (process.argv[4] || ',hoover/,species/').split(',');
let fails = 0, passes = 0;
function ok(name, cond, info) {
  if (cond) passes++; else fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !cond ? ' :: ' + JSON.stringify(info) : ''));
}
const attrs = p => p.evaluate(() => { const h = document.documentElement; return ['text', 'font', 'motion', 'contrast'].map(k => k + '=' + (h.getAttribute('data-' + k) || '')).join(' '); });
const state = p => p.evaluate(() => {
  const cs = e => e ? getComputedStyle(e) : null, q = s => document.querySelector(s);
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const navA = q('.site-nav a'), body = document.body;
  return {
    root: parseFloat(cs(document.documentElement).fontSize),
    body: cs(body).fontFamily, nav: navA ? cs(navA).fontFamily : '', h: cs(q('h1') || body).fontFamily,
    logo: q('.logo-text') ? cs(q('.logo-text')).fontFamily : 'Night Bite Pixel',
    navTrans: navA ? cs(navA).transitionDuration : '0s',
    bodyContrast: ratio(cs(body).color, 'rgb(10, 22, 40)'),
    navContrast: Math.min(21, ...[...document.querySelectorAll('.site-nav a, .nav-more-btn')].filter(e => e.offsetParent && !e.matches(':hover')).map(e => ratio(cs(e).color, 'rgb(10, 22, 40)'))),
    navLow: [...document.querySelectorAll('.site-nav a, .nav-more-btn')].filter(e => e.offsetParent && ratio(cs(e).color, 'rgb(10, 22, 40)') < 7).map(e => e.textContent.trim() + ' ' + cs(e).color),
    scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    navHit: [...document.querySelectorAll('.site-nav a, .nav-more-btn')].filter(e => e.offsetParent).filter(e => {
      const r = e.getBoundingClientRect(); if (r.right > innerWidth + 1 || r.left < -1) return true;
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(t && (e === t || e.contains(t)));
    }).map(e => e.textContent.trim()),
    boot: window.__nbBootAttrs || null
  };
});
const sys = f => /system-ui/.test(f) && !/Pixelify|Night Bite Pixel|Source Serif/.test(f);

(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: na.args() });
  const errs = [];
  for (const vp of [{ width: 390, height: 844, m: true }, { width: 1280, height: 800, m: false }]) {
    for (const pg of PAGES) {
      const W = vp.width + ' /' + pg + ': ';
      const ctx = await br.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.m, hasTouch: vp.m, serviceWorkers: 'block' });
      await na.block(ctx);
      // record <html> attributes at the first point the body exists (before first paint of content)
      await ctx.addInitScript(() => { document.addEventListener('readystatechange', () => {}, { once: true });
        new MutationObserver((l, o) => { if (document.body) { const h = document.documentElement; window.__nbBootAttrs = ['text', 'font', 'motion', 'contrast'].map(k => h.getAttribute('data-' + k) || '').join('|'); o.disconnect(); } }).observe(document, { childList: true, subtree: true }); });
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + e.message));
      await p.goto(B + pg + (pg === '' ? '?pick' : ''), { waitUntil: 'load' });
      const base = await state(p);
      ok(W + 'default: pixel/serif fonts, no attributes', !sys(base.body) && (await attrs(p)) === 'text= font= motion= contrast=', [base.body, await attrs(p)]);
      async function openPanel() {
        if (vp.m && await p.isVisible('.nav-more-btn')) { await p.click('.nav-more-btn'); await p.click('#nav-more-panel [data-a11y-open]'); }
        else { await p.click('.site-footer [data-a11y-open]'); }
        await p.waitForSelector('#a11y-panel[open]', { timeout: 3000 });
      }
      const btnVisible = vp.m && await p.isVisible('.nav-more-btn')
        ? (await p.click('.nav-more-btn'), await p.isVisible('#nav-more-panel [data-a11y-open]'))
        : await p.isVisible('.site-footer [data-a11y-open]');
      if (vp.m && await p.isVisible('#nav-more-panel')) await p.click('.nav-more-btn');
      ok(W + 'Display button visible (' + (vp.m ? 'More menu' : 'footer') + ')', btnVisible);
      await openPanel();
      const modal = await p.evaluate(() => { const d = document.getElementById('a11y-panel'); return { modal: d.matches(':modal'), focusIn: d.contains(document.activeElement), label: d.getAttribute('aria-labelledby') }; });
      ok(W + 'panel is a labelled modal with focus inside', modal.modal && modal.focusIn && modal.label === 'a11y-title', modal);
      await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      ok(W + 'Escape closes and returns focus to a button', await p.evaluate(() => !document.getElementById('a11y-panel').open && /^(BUTTON)$/.test(document.activeElement.tagName)));
      // text sizes
      let prev = 0;
      for (const [v, lbl] of [['sm', 'Small'], ['', 'Default'], ['lg', 'Large'], ['xl', 'Extra large']]) {
        await openPanel(); await p.click('.a11y-seg-opt[data-size="' + (v || 'default') + '"]'); await p.keyboard.press('Escape');
        const s = await state(p), a = await attrs(p);
        ok(W + 'size ' + lbl + ' applies', a.includes('text=' + v + ' ') && s.root > prev, [a, s.root]);
        if (v === 'lg' || v === 'xl') ok(W + lbl + ' turns on readable text', a.includes('font=readable') && sys(s.body) && sys(s.nav) && sys(s.h) && /Night Bite Pixel/.test(s.logo), [a, s.body, s.nav, s.logo]);
        prev = s.root;
      }
      let s = await state(p);
      ok(W + 'XL: no sideways scroll', s.scrollX <= 1, s.scrollX);
      ok(W + 'XL: every header link fits and is tappable', s.navHit.length === 0, s.navHit);
      await p.reload({ waitUntil: 'load' }); s = await state(p);
      ok(W + 'XL persists after reload and applies before paint', (await attrs(p)).startsWith('text=xl font=readable') && s.boot === 'xl|readable||' && sys(s.body), [await attrs(p), s.boot]);
      // back to default size, readable on its own
      await openPanel(); await p.click('.a11y-seg-opt[data-size="default"]');
      const fontDisabled = await p.isDisabled('#a11y-font');
      await p.uncheck('#a11y-font'); await p.check('#a11y-font'); await p.keyboard.press('Escape');
      ok(W + 'Readable text alone (default size)', !fontDisabled && (await attrs(p)).startsWith('text= font=readable') && sys((await state(p)).body), await attrs(p));
      await openPanel(); await p.check('#a11y-motion'); await p.check('#a11y-contrast'); await p.keyboard.press('Escape'); await p.mouse.move(1, 400); await p.waitForTimeout(200);
      s = await state(p);
      ok(W + 'Less motion stops transitions', /motion=reduce/.test(await attrs(p)) && parseFloat(s.navTrans) < 0.001 && await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), [s.navTrans]);
      ok(W + 'High contrast: body and nav text >= 7:1', /contrast=more/.test(await attrs(p)) && s.bodyContrast >= 7 && s.navContrast >= 7, [s.bodyContrast, s.navContrast, s.navLow]);
      await p.reload({ waitUntil: 'load' }); s = await state(p);
      ok(W + 'motion + contrast + readable persist after reload, before paint', (await attrs(p)) === 'text= font=readable motion=reduce contrast=more' && s.boot === '|readable|reduce|more', [await attrs(p), s.boot]);
      await openPanel(); await p.click('.a11y-reset'); await p.keyboard.press('Escape');
      await p.reload({ waitUntil: 'load' });
      ok(W + 'Reset clears every setting', (await attrs(p)) === 'text= font= motion= contrast=' && (await p.evaluate(() => localStorage.getItem('nb-a11y'))) === '{}', await attrs(p));
      await ctx.close();
    }
  }
  // Red light (S3b), at 390 on each page: applies from the panel, true black behind red text, the toolbar color follows,
  // photos/maps/charts get the red filter while the lantern keeps its art, it persists and is on <html> before paint.
  const RED_CEIL = 96;   // no text color or share-card pixel may have green or blue above this (0-255)
  for (const pg of PAGES) {
    const W = '390 /' + pg + ' red: ';
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await na.block(ctx);
    await ctx.addInitScript(() => { new MutationObserver((l, o) => { if (document.body) { window.__nbBootLight = document.documentElement.getAttribute('data-light') || ''; o.disconnect(); } }).observe(document, { childList: true, subtree: true }); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + e.message));
    await p.goto(B + pg + (pg === '' ? '?pick' : ''), { waitUntil: 'load' });
    if (await p.isVisible('.nav-more-btn')) { await p.click('.nav-more-btn'); await p.click('#nav-more-panel [data-a11y-open]'); } else await p.click('.site-footer [data-a11y-open]');
    await p.waitForSelector('#a11y-panel[open]', { timeout: 3000 });
    ok(W + 'Red light toggle in the panel', await p.isVisible('#a11y-light'));
    await p.check('#a11y-light'); await p.keyboard.press('Escape'); await p.waitForTimeout(700);   // let color transitions finish
    const red = () => p.evaluate((CEIL) => {
      const cs = e => getComputedStyle(e), h = document.documentElement;
      const rgb = c => (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
      const lum = c => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); const m = rgb(c); return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const bright = [];
      for (const e of document.querySelectorAll('body *')) {
        if (!e.offsetParent && cs(e).position !== 'fixed') continue;
        if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        if (e.closest('dialog:not([open]), [hidden]')) continue;
        const m = rgb(cs(e).color); if (m[1] > CEIL || m[2] > CEIL) bright.push(e.tagName + '.' + (e.className || '') + ' ' + cs(e).color);
      }
      const imgs = [...document.querySelectorAll('main img, main svg')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('.hero-horizon'));
      const lantern = document.querySelector('.logo img, .lantern-glow');
      return {
        attr: h.getAttribute('data-light') || '', bg: cs(document.body).backgroundColor, theme: (document.querySelector('meta[name="theme-color"]') || {}).content,
        text: (Math.max(lum(cs(document.body).color), 0) + 0.05) / 0.05, bright: bright.slice(0, 8), brightN: bright.length,
        unfiltered: imgs.filter(e => !/sepia/.test(cs(e).filter)).map(e => (e.getAttribute('src') || e.tagName)).slice(0, 5),
        lantern: lantern ? cs(lantern).filter : 'none', boot: window.__nbBootLight
      };
    }, RED_CEIL);
    let r = await red();
    ok(W + 'applies: data-light=red, black page, toolbar black', r.attr === 'red' && r.bg === 'rgb(0, 0, 0)' && r.theme === '#000000', r);
    ok(W + 'body text red on black >= 4.5:1', r.text >= 4.5, r.text);
    ok(W + 'no text brighter than the red ceiling', r.brightN === 0, r.bright);
    ok(W + 'pictures, maps and charts get the red filter', r.unfiltered.length === 0, r.unfiltered);
    ok(W + 'lantern art untouched (no red filter)', !/sepia/.test(r.lantern), r.lantern);
    await p.reload({ waitUntil: 'load' }); r = await red();
    ok(W + 'persists after reload, before paint', r.attr === 'red' && r.boot === 'red' && r.bg === 'rgb(0, 0, 0)', r);
    if (await p.$('[data-act="share"]')) {
      await p.click('[data-act="share"]');
      await p.waitForFunction(() => { const i = document.getElementById('tt-share-img'); return i && i.src && i.complete && i.naturalWidth; }, null, { timeout: 15000 }).catch(() => {});
      const card = await p.evaluate((CEIL) => {
        const i = document.getElementById('tt-share-img'); if (!i || !i.naturalWidth) return { none: true };
        const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
        const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
        let over = 0, maxG = 0, maxB = 0;
        for (let k = 0; k < d.length; k += 4) {
          const px = (k / 4) % c.width, py = Math.floor(k / 4 / c.width);
          if (px >= 44 && px <= 96 && py >= 30 && py <= 94) continue;   // the lantern keeps its art
          if (d[k + 1] > maxG) maxG = d[k + 1]; if (d[k + 2] > maxB) maxB = d[k + 2];
          if (d[k + 1] > CEIL || d[k + 2] > CEIL) over++;
        }
        const dl = document.getElementById('tt-share');
        return { maxG, maxB, over, dlgBg: getComputedStyle(dl).backgroundColor };
      }, RED_CEIL);
      ok(W + 'share card drawn in red (no pixel above the ceiling outside the lantern)', !card.none && card.over === 0, card);
      ok(W + 'share dialog background is dark', card.dlgBg && (card.dlgBg.match(/\d+/g) || [255, 255, 255]).slice(1, 3).every(v => +v <= 16), card.dlgBg);
      await p.keyboard.press('Escape');
    }
    // turn it off again
    if (await p.isVisible('.nav-more-btn')) { await p.click('.nav-more-btn'); await p.click('#nav-more-panel [data-a11y-open]'); } else await p.click('.site-footer [data-a11y-open]');
    await p.uncheck('#a11y-light'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    r = await red();
    ok(W + 'turning it off restores the night palette and toolbar color', r.attr === '' && r.theme === '#0a1628' && r.bg !== 'rgb(0, 0, 0)', r);
    await ctx.close();
  }

  // Touch targets and focus (S3b), at 390 on each page: every visible link, button, field and summary is at least
  // 44x44 (its box plus any absolutely placed ::before/::after touch slop), with the More menu closed and open. Links
  // inside running text are exempt (WCAG 2.5.8 inline exception), as is the skip link until it is focused.
  // Then Tab through the first 12 stops: each one shows a focus ring (outline or box-shadow) on a visible element.
  const tapMisses = () => p2.evaluate(() => {
    const miss = [];
    const slop = (e, b) => {
      let r = { l: b.left, t: b.top, r: b.right, b: b.bottom };
      for (const ps of ['::before', '::after']) {
        const c = getComputedStyle(e, ps); if (c.content === 'none' || c.position !== 'absolute') continue;
        const n = v => parseFloat(v) || 0;
        r = { l: Math.min(r.l, b.left + n(c.left)), t: Math.min(r.t, b.top + n(c.top)), r: Math.max(r.r, b.right - n(c.right)), b: Math.max(r.b, b.bottom - n(c.bottom)) };
      }
      return { w: r.r - r.l, h: r.b - r.t };
    };
    for (const e of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])')) {
      const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
      if (!b.width || !b.height || cs.visibility === 'hidden' || e.closest('[hidden], dialog:not([open]), [aria-hidden="true"]')) continue;
      if (e.classList.contains('sr-only')) continue;
      if (e.matches('input[type=radio], input[type=checkbox]') && e.closest('label')) continue;   // the label is the target
      let par = e.parentElement; while (par && getComputedStyle(par).display === 'inline') par = par.parentElement;
      if (e.tagName === 'A' && cs.display === 'inline' && par && par.textContent.trim().length > e.textContent.trim().length + 2) continue;
      if (e.classList.contains('spy-link')) continue;   // scrollspy rail: a shortcut beside the page (sections are reachable by scrolling); slices >= 24px (WCAG 2.5.8), widening it would cover page text
      const z = slop(e, b);
      if (z.w < 43.5 || z.h < 43.5) miss.push((e.className && typeof e.className === 'string' ? e.tagName.toLowerCase() + '.' + e.className.split(' ')[0] : e.tagName.toLowerCase()) + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24) + '" ' + Math.round(z.w) + 'x' + Math.round(z.h));
    }
    return miss;
  });
  let p2;
  for (const pg of PAGES) {
    const W = '390 /' + pg + ' targets: ';
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await na.block(ctx);
    p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(W + e.message));
    await p2.goto(B + pg + (pg === '' ? '?pick' : ''), { waitUntil: 'load' });
    let m = await tapMisses();
    ok(W + 'every tap target >= 44x44 (page)', m.length === 0, m);
    if (await p2.isVisible('.nav-more-btn')) {
      await p2.click('.nav-more-btn'); m = await tapMisses();
      ok(W + 'every tap target >= 44x44 (More menu open)', m.length === 0, m);
      await p2.click('.nav-more-btn');
    }
    await ctx.close();
  }
  for (const [vw, vh, mob] of [[390, 844, true], [1280, 800, false]]) {
    for (const pg of PAGES) {
      const W = vw + ' /' + pg + ' focus: ';
      const ctx = await br.newContext({ viewport: { width: vw, height: vh }, isMobile: mob, hasTouch: mob, serviceWorkers: 'block' });
      await na.block(ctx);
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + e.message));
      await p.goto(B + pg + (pg === '' ? '?pick' : ''), { waitUntil: 'load' });
      const bad = [];
      for (let i = 0; i < 12; i++) {
        await p.keyboard.press('Tab');
        const f = await p.evaluate(() => {
          const e = document.activeElement; if (!e || e === document.body) return null;
          const c = getComputedStyle(e), b = e.getBoundingClientRect();
          let ring = (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2) || (c.boxShadow && c.boxShadow !== 'none');
          if (!ring && e.matches('input')) { const l = e.closest('label'); if (l) { const lc = getComputedStyle(l); ring = lc.outlineStyle !== 'none' && parseFloat(lc.outlineWidth) >= 2; } }
          return { name: e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '') + ' ' + (e.textContent || '').trim().slice(0, 20), ring, vis: b.width > 0 && b.height > 0, fv: e.matches(':focus-visible') };
        });
        if (f && !(f.ring && f.vis && f.fv)) bad.push(f);
      }
      ok(W + 'Tab through the first 12 stops: each has a visible focus ring', bad.length === 0, bad);
      await ctx.close();
    }
  }

  // no JS: Display buttons stay hidden (no dead control)
  {
    const ctx = await br.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
    await na.block(ctx);
    const p = await ctx.newPage(); await p.goto(B + 'hoover/', { waitUntil: 'load' });
    ok('no JS: Display button hidden', !(await p.isVisible('.site-footer [data-a11y-open]')));
    await ctx.close();
  }
  ok('no page errors', errs.length === 0, errs);
  await br.close();
  console.log(`check-a11y-settings ${B}: ${passes} pass, ${fails} fail`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed :: ' + e.message); process.exit(1); });
