# Service worker and Add to Home Screen

Files: `sw.js` (site root), `js/sw-register.js` (every page except whisperwood.html and the whisperwood/ game),
`site.webmanifest`, `offline.html`, `js/install-tip.js` (Home only), `assets/icons/icon-maskable-192.png` and `-512.png`.
Promoted from the preview copy (DR0231/night-bite-preview) on 2026-10-22.

## What it does

* Scope is the folder `sw.js` sits in: `/` on nightbiteoh.com. Every path in `sw.js` and the manifest is relative,
  so the same file also runs on the preview copy under `/night-bite-preview/`.
* Install precaches the core pages (clean URLs: `./`, `species/`, the `.html` pages), `css/styles.css`, all of `js/`,
  the Latin fonts, icons, map art and `data/*.json`.
* Pages (navigations and `text/html`): network first with a 4 second timeout, then the saved copy, then `offline.html`.
  Extensionless paths also try `.html` and a trailing `/`.
* `data/*.json`: network first, saved copy when offline.
* Everything else on this site: stale while revalidate.
* Never touched: anything under `whisperwood/` and `whisperwood.html` (no `respondWith`, nothing cached), the
  service worker file itself, any other origin (NWS, USGS, Google Maps, GitHub). Non GET requests pass through.
* Live readings are not cached by the service worker. The page keeps the last good USGS reading, 7 day trend and NWS
  forecast in localStorage (`nb-usgs-last`, `nb-trend-last`, `nb-cond-last`) and, with no signal, shows them with
  "Offline. Last updated HH:MM ET." Values only ever come from a real fetch.
* Cache name is `PREFIX + VERSION`: `nb-live-v2-2026-10-22` on nightbiteoh.com (`nb-preview-` on the preview).
  Activate deletes caches with the same prefix only.
* Pages that load `sw-register.js` have `worker-src 'self'` in their CSP meta. whisperwood.html keeps `worker-src 'none'`.

## Updating

* Bump `VERSION` in `sw.js` on every deploy that changes a precached file, so phones pick up the new copies.
* Add new pages or assets to `PRECACHE` (a missing file makes the install fail, so check the paths exist).
* Never add `sw-register.js` to a Whisperwood page, and keep `isWhisperwood()` in `sw.js`.

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

Also make `js/sw-register.js` stop registering (or replace its body with
`navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });`).
Don't delete `sw.js` outright: a 404 leaves already installed workers running until they expire.
