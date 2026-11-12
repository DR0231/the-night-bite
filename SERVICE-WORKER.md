# Service worker and Add to Home Screen

Files: `sw.js` (site root), `js/sw-update.js` (every page except whisperwood.html and the whisperwood/ game),
`site.webmanifest`, `offline.html`, `js/install-tip.js` (Home only), `assets/icons/icon-maskable-192.png` and `-512.png`.
Promoted from the preview copy (DR0231/night-bite-preview) on 2026-10-22; fetch rules, `?v=` stamping and
`sw-update.js` promoted on 2026-10-24 (v6). The hashed precache diet (preview v127) and every-lake-home precache
(preview v128) were promoted on 2026-11-11 as live v38. The per-lake "what's biting" split (preview v132) was
promoted on 2026-11-11 as live v40.

## What it does

* Scope is the folder `sw.js` sits in: `/` on nightbiteoh.com. Every path in `sw.js` and the manifest is relative,
  so the same file also runs on the preview copy under `/night-bite-preview/`.
* Precache (since live v40, matching preview v132): 436 files, about 4.1 MB. The water picker (`./`),
  `offline.html`, the manifest, favicons and icons, `css/styles.css`, the 42 shared scripts in `js/`, the Latin
  fonts, the picker tiles, Hoover's depth contours, the map pins, moon and wind sprites, and `data/quick-facts.json`,
  `bait-shops.json`, `community-log.json` and `tournaments.json`, plus every lake home and the chart, map script
  (`js/lake-map-data-*.js`, or `js/hoover-map-data.js` for Hoover), map images and its own "what's biting" set
  (`js/biting/<id>.js`, from `tools/biting-split.py`; the species and ice pages and the share card read it) that
  its pages need offline. Before live v40 every install also took the combined `js/biting-data.js` and
  `js/biting-data-lakes.js` (about 263 KB) and every species page loaded both. The lake
  list is written by `tools/sw-precache.py` from `js/lakes.js`, so a new water is picked up automatically. Up to live
  v37 (preview v126) it was all 436 files (about 6.4 MB): every page, all 18 language files and every lake's maps.
  Preview v127 cut that to the shell only (149 files, about 1.6 MB) and left unvisited lake homes offline until they
  were opened online; live skipped that intermediate step and went to every lake home in v38. Live v40 keeps every
  lake home and adds that home's biting set instead of the two combined biting files.
* Content hashes: `REVISIONS` in `sw.js` holds a 12 hex sha256 per precached file, written by
  `tools/sw-precache.py`. The precache (`PREFIX + "precache"`) is kept across deploys and each copy is saved under its
  hash, so a new worker downloads only the files whose hash changed. HTML hashes blank the `?v=` stamps first,
  because `stamp-version.py` rewrites them on every deploy without changing the page. A changed file is fetched with
  `cache: "no-cache"` (a 304 when the server copy is the same) and checked against its hash; if a cache in between
  still hands out last deploy's copy, it asks once more past it (`?nbrev=<hash>`, `cache: "reload"`) and keeps that.
  On the first install after live v37 the worker also reuses any copy in the old per version cache whose hash matches.
* Runtime caches, kept across deploys and capped by count (newest kept): `PREFIX + "pages"` (40) for every page
  opened online, so a deeper page you visited opens offline; `PREFIX + "data"` (60) for `data/*.json` and the language
  files; `PREFIX + "assets"` (200) for lake only scripts, lake maps and other images and fonts.
* Pages (navigations and `text/html`): network first with a 4 second timeout, then the saved copy (precache for
  `./` and every lake home, else the pages cache), then `offline.html`. An unvisited deeper page (for example
  `water.html` or a species page) shows `offline.html`. Extensionless paths also try `.html` and a trailing `/`.
* `data/*.json`: network first, then the newest saved copy, then the precached one. The worker only answers the
  site's own pages; it never changes headers, so `data/advisor-rules.json` for the Android app (which fetches it
  directly over HTTPS) is exactly what GitHub Pages serves.
* CSS and JS: network first with the same 4 second timeout, saved copy when offline or slow. A precached script or
  style is not saved again at runtime: its offline copy is the one that matches the precached shell. (Through live v5
  and preview v11 they were stale while revalidate, so right after a deploy a page could get new HTML with last
  deploy's `styles.css` and `hoover-map.js`: the lake picker showed unstyled and every map opened Hoover.)
* Fonts and images: precached ones come straight from the precache (they change only with their hash); the rest
  are stale while revalidate in the assets cache.
* Every page links its own CSS and JS with `?v=VERSION`, which skips GitHub Pages' 10 minute HTTP cache. The worker
  strips `?v=` (and any query) when it saves or looks up a copy, so offline copies still match.
* `js/sw-update.js` (renamed from `sw-register.js` in live v6 and preview v12 so an older worker has never cached it)
  reloads the page once when a new worker takes over a page an older one was controlling, only in the first 20
  seconds, and only if the old worker doesn't answer the `nb-hello` message with `assets: "network-first"` (live v19
  and newer do, v40 included). There is no update toast; the update is silent.
* Activate deletes every other cache with this `PREFIX` (the old per version caches like `nb-live-v37-2026-11-11`
  included) and every precache entry that is no longer listed, then claims open pages.
* Pages that load `sw-update.js` have `worker-src 'self'` in their CSP meta. whisperwood.html keeps `worker-src 'none'`.

## Every deploy

1. Bump `VERSION` in `sw.js`.
2. Run `python3 tools/stamp-version.py` from the repo root. It rewrites every `?v=` to match (skips Whisperwood) and
   then runs `tools/sw-precache.py`, which refreshes `REVISIONS`. Run `sw-precache.py` again after any later build
   that touches a precached file; `tools/check-all.py` and `tools/promote.py` run it last on their own.
3. `python3 tools/sw-precache.py --check` (in the GitHub static checks and in check-all as `check-sw-precache`)
   fails when `REVISIONS` is stale or a precached file is missing (a missing file would fail every install).
* A precached file without a hash (say a line added by hand without running the tool) is keyed by `VERSION`
  instead, so it is downloaded again on every deploy, which is the old behaviour and never stale.
* To precache another file, add its path to `PRECACHE` and run `sw-precache.py`. Keep the list small: anything a
  visitor opens online is saved at runtime anyway. New waters need no hand edit of `sw.js`: `sw-precache.py` adds
  the new lake home and its first-paint assets from `js/lakes.js`, and `build-tile-charts.py` writes the picker tile
  line.
* Never touched: anything under `whisperwood/` and `whisperwood.html` (no `respondWith`, nothing cached), the
  service worker file itself, any other origin (NWS, USGS, Google Maps, GitHub). Non GET requests pass through.
* Live readings are not cached by the service worker. The page keeps the last good USGS reading, 7 day trend and NWS
  forecast in localStorage (`nb-usgs-last`, `nb-trend-last`, `nb-cond-last`) and, with no signal, shows them with
  "Offline. Last updated HH:MM ET." Values only ever come from a real fetch.
* Measured on the preview v127 change: a deploy with one changed page moved 437 files and 6.44 MB to each installed
  phone before, and 2 files (`sw.js` and the page) and 63 KB after. Live v40 keeps that hashed update: a bump that
  changes one page still downloads only that page (and `sw.js`). The first install is 436 files, about 4.1 MB,
  because every lake home and that home's biting set are saved up front.

## Promotion

`tools/promote.py` copies the preview `sw.js`, sets `PREFIX = "nb-live-"` and a fresh `VERSION`, then runs
`sw-precache.py` on the live tree last so the hashes are those of the live files. Phones download only the files
whose hash changed. Keep `sw.js` at the repo root so the scope is `/`. Whisperwood stays excluded by
`isWhisperwood()`: it matches `whisperwood`, `whisperwood/...` and `whisperwood.html` relative to the scope. Don't
add `sw-update.js` to any Whisperwood page. The game keeps its own saves in localStorage and is never served from
this cache. Manifest `name` is rewritten from "The Night Bite (Preview)" to "The Night Bite"; `id`, `start_url`
and `scope` stay `./`.

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

The kill switch removes every cache whose name starts with `nb-`, which covers the v40 precache, pages, data
and assets caches too. Also make `js/sw-update.js` stop registering (or replace its body with
`navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });`).
Don't delete `sw.js` outright: a 404 leaves already installed workers running until they expire.
