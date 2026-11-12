#!/usr/bin/env node
/* Share a trip on /log sends to the nb-trip-queue Worker (workers/trip-queue/), end to end at 390.
 *   node tools/check-trip-queue.cjs <base> [outDir]
 * 1. log.html CSP allows the Worker in connect-src; the honeypot is off screen and out of the tab order.
 * 2. Queue down (request aborted): the status line says so and points to Build email / GitHub issue, which stay visible.
 * 3. Real round trip: fills the form and clicks Send for review. The request is marked as a check trip on the way out
 *    (check: true, notes "[nb-check] automated test trip"), so it can never be mistaken for a reader's trip. From a
 *    local base the Origin is set to https://dr0231.github.io (the Worker only answers the two site origins). Then it
 *    lists the queue with the admin token (/home/box/.nightbite/trip-queue-admin-token, never printed), checks the trip
 *    is pending, rejects it and checks it's gone.
 * 4. Red light and high contrast: the status line stays readable.
 * Prints PASS/FAIL lines; exit 1 on any FAIL. Analytics blocked (tools/no-analytics.cjs).
 */
const fs = require('fs'), path = require('path'), os = require('os');
const PW = require(require('path').join(__dirname, 'playwright-path.cjs'));   // PLAYWRIGHT_CORE, then node_modules, then the box copy
const { chromium } = require(PW);
const na = require(path.join(__dirname, 'no-analytics.cjs'));
const B = (process.argv[2] || 'http://127.0.0.1:8642/night-bite-preview/').replace(/\/?$/, '/');
const OUT = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'nb-tripq-'));
fs.mkdirSync(OUT, { recursive: true });
const Q = process.env.NB_TRIP_QUEUE_URL || 'https://nb-trip-queue.nightbiteoh.workers.dev';
const TOKEN_FILE = process.env.NB_TRIP_TOKEN_FILE || '/home/box/.nightbite/trip-queue-admin-token';
const SITE_ORIGINS = ['https://nightbiteoh.com', 'https://dr0231.github.io'];
let fails = 0, passes = 0;
function ok(name, cond, info) {
  if (cond) passes++; else fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !cond ? ' :: ' + JSON.stringify(info).slice(0, 400) : ''));
}
async function admin(method, p, body) {
  const tok = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  const r = await fetch(Q + p, { method, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, j: await r.json().catch(() => ({})) };
}
async function fill(p) {
  await p.evaluate(() => { document.getElementById('add-trip').open = true; });
  await p.fill('#c-date', new Date().toISOString().slice(0, 10));
  await p.selectOption('#c-species', 'Channel catfish');
  await p.selectOption('#c-ramp', { index: 1 });
  await p.selectOption('#c-time', 'Night');
  await p.fill('#c-bait', 'Check bait');
  await p.selectOption('#c-keep', 'Released');
  await p.fill('#c-notes', 'Check trip');
}
const statusOf = p => p.evaluate(() => { const e = document.getElementById('trip-send-status'); return { hidden: e.hidden, state: e.getAttribute('data-state'), text: e.textContent }; });

(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: na.args() });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await na.block(ctx);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'log', { waitUntil: 'networkidle' });
  const pageOrigin = new URL(p.url()).origin;

  const csp = await p.evaluate(() => (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '');
  ok('CSP connect-src allows the queue', /connect-src[^;]*https:\/\/nb-trip-queue\.nightbiteoh\.workers\.dev/.test(csp), csp);
  const hp = await p.evaluate(() => { const i = document.getElementById('c-website'); const r = i.getBoundingClientRect(); return { tab: i.tabIndex, off: r.right < 0 || r.left > innerWidth, aria: i.closest('[aria-hidden="true"]') !== null }; });
  ok('honeypot off screen, untabbable, aria-hidden', hp.tab === -1 && hp.off && hp.aria, hp);

  // 2. queue down
  await p.route(Q + '/**', r => r.abort('failed'));
  await fill(p);
  await p.click('#send-trip');
  await p.waitForFunction(() => document.getElementById('trip-send-status').getAttribute('data-state') === 'failed', null, { timeout: 20000 }).catch(() => {});
  let st = await statusOf(p);
  ok('queue down: says so and points to the other ways', st.state === 'failed' && /Build email/.test(st.text), st);
  const fb = await p.evaluate(() => ['build-email', 'show-markdown'].every(id => { const e = document.getElementById(id); return e && e.offsetParent !== null; }) && !!document.querySelector('#trip-fallback a[href*="github.com"]'));
  ok('fallback buttons visible', fb);
  ok('form kept after a failed send', (await p.inputValue('#c-bait')) === 'Check bait');
  await p.unroute(Q + '/**');

  // 3. real round trip, marked as a check trip
  let sentId = null;
  const allowed = SITE_ORIGINS.includes(pageOrigin);
  await p.route(Q + '/submit', async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': pageOrigin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'Content-Type' } });
    }
    const body = JSON.parse(req.postData() || '{}');
    body.check = true;
    body.notes = '[nb-check] automated test trip, reject me';
    const headers = { ...req.headers(), 'content-type': 'application/json' };
    if (!allowed) headers.origin = 'https://dr0231.github.io';
    const resp = await route.fetch({ method: 'POST', headers, postData: JSON.stringify(body) });
    const text = await resp.text();
    try { sentId = JSON.parse(text).id || null; } catch (e) {}
    return route.fulfill({ status: resp.status(), body: text, headers: { 'content-type': 'application/json', 'access-control-allow-origin': pageOrigin } });
  });
  await fill(p);
  await p.click('#send-trip');
  await p.waitForFunction(() => /sent|failed/.test(document.getElementById('trip-send-status').getAttribute('data-state') || ''), null, { timeout: 20000 }).catch(() => {});
  st = await statusOf(p);
  ok('send: status says sent and waiting for review', st.state === 'sent' && /review/.test(st.text), st);
  ok('send: form cleared', (await p.inputValue('#c-bait')) === '');
  ok('send: queue returned an id', !!sentId, sentId);
  if (sentId) {
    const l = await admin('GET', '/admin/list?status=pending');
    const e = (l.j.entries || []).find(x => x.id === sentId);
    ok('queue: check trip is pending', l.status === 200 && e && e.status === 'pending' && e.check === true && /^\[nb-check\]/.test(e.notes), { status: l.status, e });
    ok('queue: only form fields kept (no IP)', e && Object.keys(e).every(k => ['id', 'status', 'received', 'from', 'lake', 'date', 'species', 'ramp', 'time_window', 'bait', 'keep_release', 'notes', 'check'].includes(k)), e && Object.keys(e));
    const rj = await admin('POST', '/admin/reject', { id: sentId });
    ok('queue: reject deletes it', rj.status === 200 && /rejected/.test(rj.j.status || ''), rj);
    const l2 = await admin('GET', '/admin/list?status=pending');
    ok('queue: gone after reject', !(l2.j.entries || []).some(x => x.id === sentId));
  }
  const noAuth = await fetch(Q + '/admin/list');
  ok('admin list refuses without the token', noAuth.status === 401, noAuth.status);

  // 4. red light and high contrast keep the status readable
  for (const [attr, val] of [['data-light', 'red'], ['data-contrast', 'high']]) {
    const r = await p.evaluate(([a, v]) => {
      document.documentElement.setAttribute(a, v);
      const e = document.getElementById('trip-send-status'); const s = getComputedStyle(e);
      const out = { color: s.color, vis: e.offsetParent !== null, radius: s.borderRadius };
      document.documentElement.removeAttribute(a);
      return out;
    }, [attr, val]);
    ok(attr + ' ' + val + ': status visible', r.vis && r.color !== 'rgba(0, 0, 0, 0)', r);
  }
  ok('no page errors', errs.length === 0, errs);
  await br.close();
  console.log(`check-trip-queue: ${passes} pass, ${fails} fail`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
