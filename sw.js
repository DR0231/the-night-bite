/**
 * The Night Bite service worker (nightbiteoh.com).
 * Lives at the site root so its scope is the whole site (/). The preview copy runs the same file under /night-bite-preview/.
 * Every path below is relative to this file, so the same file works in both places.
 *
 *  · HTML: network first, falls back to the saved copy (then to offline.html) when there's no signal.
 *  · data/*.json (log, tournaments): network first, saved copy when offline.
 *  · CSS, JS, fonts, images: stale while revalidate (instant from cache, refreshed in the background).
 *  · Whisperwood is never touched: nothing under whisperwood/ (or whisperwood.html) is cached or intercepted.
 *  · Cross origin requests (NWS, USGS, links out) pass straight through. The page itself keeps the last good
 *    readings in localStorage and labels them "Offline. Last updated ..." (js/refresh.js, NightBiteOffline).
 *  · Caches are named PREFIX + VERSION. Bump VERSION on any change to this list; activate deletes older caches
 *    with the same PREFIX only.
 *
 * Kill switch: see SERVICE-WORKER.md.
 */
var PREFIX = "nb-live-";
var VERSION = "v2-2026-10-22";
var CACHE = PREFIX + VERSION;
var SCOPE = new URL("./", self.location).href;
var NETWORK_TIMEOUT = 4000;

var PRECACHE = [
  "./",
  "species/",
  "water.html",
  "gear.html",
  "log.html",
  "tournaments.html",
  "about.html",
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
  "js/alerts.js",
  "js/astro.js",
  "js/biting-data.js",
  "js/biting.js",
  "js/community-log.js",
  "js/conditions.js",
  "js/get-app.js",
  "js/home-log.js",
  "js/hoover-map-data.js",
  "js/hoover-map.js",
  "js/install-tip.js",
  "js/log.js",
  "js/mode-toggle.js",
  "js/nav.js",
  "js/pack-list.js",
  "js/pool-readout.js",
  "js/pool-trend.js",
  "js/refresh.js",
  "js/species-filter.js",
  "js/sticky-nav.js",
  "js/sw-register.js",
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
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-192.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/moon.svg",
  "assets/map/hoover-map-tall.png",
  "assets/map/hoover-map-wide.png",
  "assets/map/pin-access.png",
  "assets/map/pin-ramp.png",
  "assets/map/pin-shop.png",
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
  event.respondWith(staleWhileRevalidate(event, url));
});
