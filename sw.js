/**
 * The Night Bite service worker (nightbiteoh.com).
 * Lives at the site root so its scope is the whole site (/). The preview copy runs the same file under /night-bite-preview/.
 * Every path below is relative to this file, so the same file works in both places.
 *
 *  · HTML: network first, falls back to the saved copy (then to offline.html) when there's no signal.
 *  · data/*.json (log, tournaments): network first, saved copy when offline.
 *  · CSS and JS: network first too, saved copy when offline or slow, so a page never mixes this deploy's HTML
 *    with last deploy's styles or scripts. (Up to v11 these were cache first, which showed the multi-lake
 *    picker unstyled and the old Hoover-only map script after a deploy.) Pages ask for them with ?v=VERSION.
 *  · Fonts, images: stale while revalidate (instant from cache, refreshed in the background).
 *  · Home pages: the root (Hoover), alum/ and buckeye/ are all precached, so each lake opens offline.
 *  · Whisperwood is never touched: nothing under whisperwood/ (or whisperwood.html) is cached or intercepted.
 *  · Cross origin requests (NWS, USGS, links out) pass straight through. The page itself keeps the last good
 *    readings in localStorage and labels them "Offline. Last updated ..." (js/refresh.js, NightBiteOffline).
 *  · Caches are named PREFIX + VERSION. Bump VERSION on any change to this list; activate deletes older caches
 *    with the same PREFIX only.
 *
 * Kill switch: see SERVICE-WORKER.md.
 */
var PREFIX = "nb-live-";
var VERSION = "v9-2026-10-27";
var CACHE = PREFIX + VERSION;
var SCOPE = new URL("./", self.location).href;
var NETWORK_TIMEOUT = 4000;

var PRECACHE = [
  "./",
  "alum/",
  "buckeye/",
  "species/",
  "water.html",
  "ice.html",
  "gear.html",
  "log.html",
  "tournaments.html",
  "about.html",
  "updates.html",
  "privacy.html",
  "offline.html",
  "site.webmanifest",
  "css/styles.css",
  "species/black-crappie.html",
  "species/blue-catfish.html",
  "species/bluegill.html",
  "species/channel-catfish.html",
  "species/common-carp.html",
  "species/flathead-catfish.html",
  "species/hybrid-striped-bass.html",
  "species/largemouth-bass.html",
  "species/longnose-gar.html",
  "species/saugeye.html",
  "species/smallmouth-bass.html",
  "species/walleye.html",
  "species/white-bass.html",
  "species/white-crappie.html",
  "species/muskellunge.html",
  "species/yellow-perch.html",
  "species/bullhead.html",
  "js/alerts.js",
  "js/astro.js",
  "js/biting-data.js",
  "js/biting-data-lakes.js",
  "js/biting.js",
  "js/community-log.js",
  "js/conditions.js",
  "js/get-app.js",
  "js/glance.js",
  "js/home-log.js",
  "js/hoover-map-data.js",
  "js/hoover-map.js",
  "js/ice-species.js",
  "js/install-tip.js",
  "js/lake-map-data-alum.js",
  "js/lake-map-data-buckeye.js",
  "js/lake-picker.js",
  "js/lake-snapshot.js",
  "js/lakes.js",
  "js/log.js",
  "js/mode-toggle.js",
  "js/nav.js",
  "js/updates-draft.js",
  "js/pack-list.js",
  "js/pool-readout.js",
  "js/pool-trend.js",
  "js/refresh.js",
  "js/species-filter.js",
  "js/species-lake.js",
  "js/sticky-nav.js",
  "js/sw-update.js",
  "js/tonight-tools.js",
  "js/tournaments.js",
  "js/usgs.js",
  "js/water.js",
  "assets/fonts/night-bite-pixel-bold.woff2",
  "assets/fonts/night-bite-pixel-regular.woff2",
  "assets/fonts/pixelify-sans-latin.woff2",
  "assets/fonts/source-serif-4-italic-latin.woff2",
  "assets/fonts/source-serif-4-latin.woff2",
  "favicon.svg",
  "favicon.ico",
  "apple-touch-icon.png",
  "assets/lantern.svg",
  "assets/lantern-hero.svg",
  "assets/hoover-chart.png",
  "assets/alum-chart.png",
  "assets/buckeye-chart.png",
  "assets/horizon-center.png",
  "assets/horizon-thin.png",
  "assets/horizon-tile.png",
  "assets/icons/bank.svg",
  "assets/icons/boat.svg",
  "assets/icons/bobber.svg",
  "assets/icons/fish-black-crappie.svg",
  "assets/icons/fish-blue-catfish.svg",
  "assets/icons/fish-bluegill.svg",
  "assets/icons/fish-channel-catfish.svg",
  "assets/icons/fish-common-carp.svg",
  "assets/icons/fish-flathead-catfish.svg",
  "assets/icons/fish-hybrid-striped-bass.svg",
  "assets/icons/fish-largemouth-bass.svg",
  "assets/icons/fish-longnose-gar.svg",
  "assets/icons/fish-saugeye.svg",
  "assets/icons/fish-smallmouth-bass.svg",
  "assets/icons/fish-walleye.svg",
  "assets/icons/fish-white-bass.svg",
  "assets/icons/fish-white-crappie.svg",
  "assets/icons/fish-muskellunge.svg",
  "assets/icons/fish-yellow-perch.svg",
  "assets/icons/fish-bullhead.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-192.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/moon.svg",
  "assets/map/hoover-map-tall.png",
  "assets/map/hoover-map-wide.png",
  "assets/map/alum-map-tall.png",
  "assets/map/alum-map-wide.png",
  "assets/map/buckeye-map-tall.png",
  "assets/map/buckeye-map-wide.png",
  "assets/map/pin-access.png",
  "assets/map/pin-ramp.png",
  "assets/map/pin-shop.png",
  "assets/moon/moon-phases.png",
  "assets/wind/wind-arrows.png",
  "assets/rigs/carolina.svg",
  "assets/rigs/floating-hover.svg",
  "assets/rigs/slip-float.svg",
  "assets/rigs/three-way.svg",
  "data/community-log.json",
  "data/tournaments.json"
];

function rel(url) { return url.href.slice(SCOPE.length); }

function isWhisperwood(url) {
  var r = rel(url).toLowerCase();
  return r === "whisperwood" || r.indexOf("whisperwood/") === 0 || r.indexOf("whisperwood.html") === 0;
}

// a cached redirect can't answer a navigation, so store a clean copy
function clean(res) {
  if (!res.redirected) return Promise.resolve(res);
  return res.blob().then(function (b) {
    return new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers });
  });
}

function keyFor(url) {
  var u = new URL(url.href);
  u.search = "";
  u.hash = "";
  return u.href;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(PRECACHE.map(function (path) {
        var url = new URL(path, SCOPE).href;
        return fetch(new Request(url, { cache: "reload", credentials: "same-origin" }))
          .then(function (res) {
            if (!res.ok) throw new Error(path + " " + res.status);
            return clean(res).then(function (c) { return cache.put(url, c); });
          });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(PREFIX) === 0 && k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cachedPage(url) {
  var href = keyFor(url);
  var tries = [href];
  if (/\/$/.test(href)) tries.push(href + "index.html");
  else if (/\/index\.html$/.test(href)) tries.push(href.replace(/index\.html$/, ""));
  else if (!/\.[a-z0-9]+$/i.test(href)) { tries.push(href + ".html"); tries.push(href + "/"); }
  return caches.open(CACHE).then(function (cache) {
    var i = 0;
    function next() {
      if (i >= tries.length) return undefined;
      return cache.match(tries[i++]).then(function (r) { return r || next(); });
    }
    return next();
  });
}

function offlinePage() {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(new URL("offline.html", SCOPE).href);
  }).then(function (res) {
    if (!res) return Response.error();
    // links in offline.html are written from the site root; a <base> keeps them right from any folder
    return res.text().then(function (html) {
      return new Response(html.replace("<head>", '<head><base href="' + SCOPE + '">'), {
        status: 200, headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    });
  });
}

function networkFirst(event, url, isPage) {
  var network = fetch(event.request).then(function (res) {
    if (res.ok && res.type === "basic") {
      var copy = res.clone();
      event.waitUntil(clean(copy).then(function (c) {
        return caches.open(CACHE).then(function (cache) { return cache.put(keyFor(url), c); });
      }));
    }
    return res;
  });
  var timeout = new Promise(function (resolve) {
    setTimeout(function () { resolve(cachedPage(url)); }, NETWORK_TIMEOUT);
  });
  return Promise.race([
    network,
    timeout.then(function (hit) { return hit || network; })   // slow signal: use the saved page if there is one
  ]).catch(function () {
    return cachedPage(url).then(function (hit) { return hit || (isPage ? offlinePage() : Response.error()); });
  });
}

function staleWhileRevalidate(event, url) {
  var key = keyFor(url);
  return caches.open(CACHE).then(function (cache) {
    return cache.match(key).then(function (hit) {
      var fresh = fetch(event.request).then(function (res) {
        if (res.ok && res.type === "basic") return clean(res.clone()).then(function (c) { return cache.put(key, c); }).then(function () { return res; });
        return res;
      });
      if (hit) {
        event.waitUntil(fresh.catch(function () {}));
        return hit;
      }
      return fresh;
    });
  });
}

// js/sw-update.js asks before it heals a page: this worker keeps CSS and JS network first, so pages it served are
// never a mix of two deploys and don't need the one time reload.
self.addEventListener("message", function (event) {
  var d = event.data;
  if (d && d.type === "nb-hello" && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION, assets: "network-first" });
  }
});

// "Remind me" (js/tonight-tools.js): the page shows the notification through this worker; tapping it opens
// (or focuses) the lake's home page. No push subscription, no server: nothing arrives here from outside.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || SCOPE;
  if (url.indexOf(SCOPE) !== 0) url = SCOPE;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.split("#")[0] === url && "focus" in list[i]) return list[i].focus();
    }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // NWS, USGS and every other site: untouched
  if (url.href.indexOf(SCOPE) !== 0) return;           // outside this site
  if (isWhisperwood(url)) return;                      // Whisperwood: never cached, never intercepted
  if (url.pathname.slice(-6) === "sw.js") return;
  var accept = req.headers.get("Accept") || "";
  if (req.mode === "navigate" || accept.indexOf("text/html") !== -1) {
    event.respondWith(networkFirst(event, url, true));
    return;
  }
  if (rel(url).indexOf("data/") === 0) {                // community log and tournaments: freshest first
    event.respondWith(networkFirst(event, url, false));
    return;
  }
  if (/\.(css|js)$/i.test(url.pathname)) {               // styles and scripts: always the same deploy as the page
    event.respondWith(networkFirst(event, url, false));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, url));
});
