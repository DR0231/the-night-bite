# Service worker and Add to Home Screen

Files: `sw.js` (site root), `js/sw-update.js` (every page except whisperwood.html and the whisperwood/ game),
`site.webmanifest`, `offline.html`, `js/install-tip.js` (Home only), `assets/icons/icon-maskable-192.png` and `-512.png`.
Promoted from the preview copy (DR0231/night-bite-preview) on 2026-10-22; fetch rules, `?v=` stamping and
`sw-update.js` promoted on 2026-10-24 (v6).

## What it does

* Scope is the folder `sw.js` sits in: `/` on nightbiteoh.com. Every path in `sw.js` and the manifest is relative,
  so the same file also runs on the preview copy under `/night-bite-preview/`.
* Install precaches the core pages (clean URLs: `./`, `species/`, the `.html` pages), `css/styles.css`, all of `js/`,
  the Latin fonts, icons, map art and `data/*.json`.
* Pages (navigations and `text/html`): network first with a 4 second timeout, then the saved copy, then `offline.html`.
  Extensionless paths also try `.html` and a trailing `/`.
* `data/*.json`: network first, saved copy when offline.
* CSS and JS: network first with the same 4 second timeout, saved copy when offline or slow. (Through live v5 and preview v11 they were
  stale while revalidate, so right after a deploy a page could get new HTML with last deploy's `styles.css` and
  `hoover-map.js`: the lake picker showed unstyled and every map opened Hoover.)
* Everything else on this site (fonts, images): stale while revalidate.
* Every page links its own CSS and JS with `?v=VERSION`, which skips GitHub Pages' 10 minute HTTP cache. The worker
  strips `?v=` when it saves a copy, so offline copies still match.
* `js/sw-update.js` (renamed from `sw-register.js` in live v6 and preview v12 so an older worker has never cached it) reloads the page
  once when a new worker takes over a page an older one was controlling, only in the first 20 seconds.

* Never touched: anything under `whisperwood/` and `whisperwood.html` (no `respondWith`, nothing cached), the
  service worker file itself, any other origin (NWS, USGS, Google Maps, GitHub). Non GET requests pass through.
* Live readings are not cached by the service worker. The page keeps the last good USGS reading, 7 day trend and NWS
  forecast in localStorage (`nb-usgs-last`, `nb-trend-last`, `nb-cond-last`) and, with no signal, shows them with
  "Offline. Last updated HH:MM ET." Values only ever come from a real fetch.
* Cache name is `PREFIX + VERSION`: `nb-live-v6-2026-10-24` on nightbiteoh.com (`nb-preview-` on the preview).
  Activate deletes caches with the same prefix only.
* Pages that load `sw-update.js` have `worker-src 'self'` in their CSP meta. whisperwood.html keeps `worker-src 'none'`.

## Every deploy

1. Bump `VERSION` in `sw.js`.
2. Run `python3 tools/stamp-version.py` from the repo root (rewrites every `?v=` to match; skips Whisperwood),
   so phones and the HTTP cache pick up the new copies.

## Updating

* Add new pages or assets to `PRECACHE` (a missing file makes the install fail, so check the paths exist).
* Never add `sw-update.js` to a Whisperwood page, and keep `isWhisperwood()` in `sw.js`.

## Kill switch

If the worker ever misbehaves, deploy this as `sw.js` (same path). Browsers check for a new `sw.js` on every
navigation (at most every 24 hours), so it reaches everyone who opens the site:

```js
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf("nb-") === 0; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
  );
});
```

Also make `js/sw-update.js` stop registering (or replace its body with
`navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });`).
Don't delete `sw.js` outright: a 404 leaves already installed workers running until they expire.
