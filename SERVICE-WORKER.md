# Service worker and Add to Home Screen

Files: `sw.js` (site root), `js/sw-update.js` (every page except whisperwood.html and the whisperwood/ game),
`site.webmanifest`, `offline.html`, `js/install-tip.js` (Home only), `assets/icons/icon-maskable-192.png` and `-512.png`.
Promoted from the preview copy (DR0231/night-bite-preview) on 2026-10-22; fetch rules, `?v=` stamping and
`sw-update.js` promoted on 2026-10-24 (v6). The hashed precache diet (preview v127) and every-lake-home precache
(preview v128) were promoted on 2026-11-11 as live v38. The per-lake "what's biting" split (preview v132) was
promoted on 2026-11-11 as live v40. "Deploys never mix" and the new kill switch (preview v135 to v140) were
promoted on 2026-11-17 as live v42.

## What it does

* Scope is the folder `sw.js` sits in: `/` on nightbiteoh.com. Every path in `sw.js` and the manifest is relative,
  so the same file also runs on the preview copy under `/night-bite-preview/`.
* Precache (since live v40, matching preview v132; live v42 has 62 lake homes, 527 files, about 4.95 MB): at v40
  436 files, about 4.1 MB. The water picker (`./`),
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
  `./` and every lake home, else the pages cache, see "Deploys never mix" below), then `offline.html`. An unvisited
  deeper page (for example `water.html` or a species page) shows `offline.html`. Extensionless paths also try `.html` and a trailing `/`.
* `data/*.json`: network first, then the newest saved copy, then the precached one. The worker only answers the
  site's own pages; it never changes headers, so `data/advisor-rules.json` for the Android app (which fetches it
  directly over HTTPS) is exactly what GitHub Pages serves.
* CSS and JS: by the deploy the page asks for (`?v=`), see "Deploys never mix" below. A precached script or style is
  not saved again at runtime. (Through live v5 and preview v11 they were stale while revalidate, so right after a
  deploy a page could get new HTML with last deploy's `styles.css` and `hoover-map.js`: the lake picker showed
  unstyled and every map opened Hoover. Live v6 to v41 were network first with a 4 second fallback to the saved
  copy, which still mixed deploys on a slow connection; N1 and N2 below.)
* Fonts and images: precached ones come straight from the precache (they change only with their hash); the rest
  are stale while revalidate in the assets cache.
* Every page links its own CSS and JS with `?v=VERSION`, which skips GitHub Pages' 10 minute HTTP cache. The worker
  strips `?v=` (and any query) when it saves or looks up a copy, so offline copies still match.
* `js/sw-update.js` (renamed from `sw-register.js` in live v6 and preview v12) asks the worker that served the page
  `nb-hello`. A live v42 or newer worker answers `assets: "by-deploy"` and never needs a reload, unless it says the
  page is mixed (the `mixed` flag in that answer, or an `nb-mixed` message later). A live v19 to v41 worker answers
  `assets: "network-first"`: when the new worker takes over, the page reloads once if the page or one of its styles
  or scripts took 3.5 seconds or more, or the phone is offline, since only then could the old 4 second fallback have
  mixed it. A worker that doesn't answer (before live v19) still gets the reload. Only in the first 20 seconds, at
  most once per deploy and once a minute. There is no update toast; the update is silent.
* Activate deletes every other cache with this `PREFIX` (the old per version caches like `nb-live-v37-2026-11-11`
  included) and every precache entry that is no longer listed and that no saved page still needs, then claims open
  pages.
* Pages that load `sw-update.js` have `worker-src 'self'` in their CSP meta. whisperwood.html keeps `worker-src 'none'`.

## Deploys never mix (live v42, preview v135)

The Nov. 13, 2026 verification run found two ways a page could show one deploy's HTML with another deploy's styles:

* N1: during the update window, the old worker's 4 second fallback answered a slow `styles.css` (or a slow page)
  from its own deploy, so new HTML got old styles, or an old saved page got new styles and scripts from the network.
* N2: pages saved at runtime (`PREFIX + "pages"`) carried no deploy, so after the next deploy, offline or with a
  slow page, they were served next to the new precached styles.

How live v42 works. Every page names its deploy: `stamp-version.py` writes `?v=VERSION` on its own CSS and JS.

1. Each worker writes a small manifest of its CSS and JS hashes to `PREFIX + "deploys"` at install. The first
   v42 install also writes one for the worker it replaces (it asks it `nb-hello` for its VERSION and reads its
   files from the precache keys it left), so pages the live v41 worker saved are covered too.
2. A page saved at runtime keeps its deploy in an `X-NB-Deploy` header (the `?v=` stamp in the page). Pages saved
   before v42 have no header; the stamp is read from the page itself.
3. CSS and JS requests, by their `?v=`:
   * this worker's deploy (or no `?v=`): the precached copy, which install checked against its hash. No network
     wait, so a slow `styles.css` can't matter.
   * a deploy this worker keeps (a saved page of an earlier deploy, or a tab left open across the update): that
     deploy's own copy from the precache.
   * a deploy it doesn't know, which can only be newer (its page came from the network before this worker
     updated): the network, with no 4 second fallback, because every copy here is older. Only when the network
     fails outright does it use a saved copy, and then it tells the page (`nb-mixed`), which reloads once.
4. Pages, when the network is slow (4 seconds) or gone:
   * a precached page (`./`, every lake home, `offline.html`) belongs to this deploy (its hash ignores the stamps),
     so it is served with its stamps rewritten to this `VERSION` and gets this deploy's files.
   * a page from the pages cache is served only when its deploy is this one, or every file of its deploy that
     changed since is still kept. Otherwise the worker waits for the network or shows `offline.html`, never the old
     page with new styles.
5. Activate keeps the changed CSS and JS of each deploy a saved page still needs, and deletes the manifests and
   copies nobody needs. The pages cache holds at most 40 pages, so this is a few old copies of the files that
   changed (usually `styles.css` and a handful of scripts), not a second precache.

`tools/check-sw-deploys.cjs` runs these in Chrome against a local Pages-like server that switches deploys, slows
chosen files and drops connections: `n1-slow-css`, `n1-slow-page`, `n2-offline`, `n2-slow`, `no-reload`,
`legacy-offline` and `legacy-slow-css` (from the old worker), `kill-sw-only` and `kill-both`. On the old code
the N1 and N2 cases fail (`--code <old tree> --expect-fail`).

The one deploy that still runs an old worker (live's first v42 install) can't be changed after the fact: during
that update window the v41 worker can still mix a slow page. js/sw-update.js heals that page with one reload when
the v42 worker takes over (`legacy-slow-css`).

## Every deploy

1. Bump `VERSION` in `sw.js`.
2. Run `python3 tools/stamp-version.py` from the repo root. It rewrites every `?v=` to match (skips Whisperwood) and
   then runs `tools/sw-precache.py`, which refreshes `REVISIONS`. Run `sw-precache.py` again after any later build
   that touches a precached file; `tools/check-all.py` and `tools/promote.py` run it last on their own.
3. `python3 tools/sw-precache.py --check` (in the GitHub static checks and in check-all as `check-sw-precache`)
   fails when `REVISIONS` is stale or a precached file is missing (a missing file would fail every install).
4. `python3 tools/check-precache-refs.py` (in the GitHub static checks and in check-all) fails when a lake home, the
   lake home template or offline.html loads a script, stylesheet or first-paint image that `PRECACHE` doesn't list, so
   a new `<script>` can't quietly break offline pages.
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
  "Offline. Last updated 8:45 AM ET." (a reading from another day carries its weekday and date, "Mon Nov. 9, 8:45 AM
  ET"). Values only ever come from a real fetch.
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

If the worker ever misbehaves, deploy `tools/sw-kill-switch.js` as `sw.js` (same path) and **change nothing else**.
Leave `js/sw-update.js` as it is: it keeps registering `sw.js`, which is now the kill switch, and the browser picks
it up on the next navigation (it checks `sw.js` on every navigation, at most every 24 hours), so it reaches everyone
who opens the site. The kill switch clears every cache whose name starts with `nb-` (precache, pages, data, assets,
deploys; about 5 MB) on install and again on activate, then unregisters and reloads open pages, which then run on
the plain network. Each step runs even if the one before fails.

```js
// tools/sw-kill-switch.js, deployed as sw.js
function clearNb() {
  return caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("nb-") === 0; }).map(function (k) { return caches.delete(k); }));
  }).catch(function () {});
}
self.addEventListener("install", function (event) { self.skipWaiting(); event.waitUntil(clearNb()); });
self.addEventListener("activate", function (event) {
  event.waitUntil(
    clearNb()
      .then(function () { return self.registration.unregister(); }).catch(function () {})
      .then(clearNb)
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
      .catch(function () {})
  );
});
```

Don't replace `js/sw-update.js` with an unregister line at the same time (up to live v41 this page said either was
fine). Unregistering from the page can win the race against the kill switch worker; a worker that is unregistered
before it activates never runs its cleanup, so every `nb-` cache stays behind (N3 in the Nov. 13 run, reproduced
by `repro-kill-old` in `tools/check-sw-deploys.cjs`). If, weeks later, pages should stop registering for good,
`tools/sw-kill-switch-page.js` can replace the body of `js/sw-update.js`: it clears the `nb-` caches from the page
itself, before and after it unregisters, so it is safe in either order (`kill-both`).

Don't delete `sw.js` outright: a 404 leaves already installed workers running until they expire.

A first install that fails part way (one file can't be fetched) leaves the files it already got in
`PREFIX + "precache"` (N4, about 435 entries). That is harmless: they are saved under their hashes, and the next
install reuses every one whose hash still matches instead of downloading it again.
