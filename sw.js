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
 *  · Home pages: the root (the water picker) and every lake home page (hoover/, alum/, buckeye/, oshaughnessy/, griggs/, indian/, delaware/, deercreek/, madison/, knox/, clearfork/, seneca/, dillon/, logan/, saltfork/, burroak/, dow/, mosquito/, berlin/, westbranch/, pymatuning/, milton/, leesville/, grandlakestmarys/, caesarcreek/, eastfork/, cjbrown/, rockyfork/, ladue/, paintcreek/, portagelakes/, mogadore/, loramie/, nimisila/, cowan/, acton/, tappan/, piedmont/, clendening/, atwood/, charlesmill/, pleasanthill/, beachcity/, wingfoot/, eastbranch/, guilford/, highlandtown/, punderson/, wellington/) are precached, so each lake opens offline.
 *  · Whisperwood is never touched: nothing under whisperwood/ (or whisperwood.html) is cached or intercepted.
 *  · Cross origin requests (NWS, USGS, links out) pass straight through. The page itself keeps the last good
 *    readings in localStorage and labels them "Offline. Last updated ..." (js/refresh.js, NightBiteOffline).
 *  · Caches are named PREFIX + VERSION. Bump VERSION on any change to this list; activate deletes older caches
 *    with the same PREFIX only.
 *
 * Kill switch: see SERVICE-WORKER.md.
 */
var PREFIX = "nb-live-";
var VERSION = "v36-2026-11-11";
var CACHE = PREFIX + VERSION;
var SCOPE = new URL("./", self.location).href;
var NETWORK_TIMEOUT = 4000;

var PRECACHE = [
  "./",
  "hoover/",
  "alum/",
  "buckeye/",
  "oshaughnessy/",
  "griggs/",
  "indian/",
  "delaware/",
  "deercreek/",
  "madison/",
  "knox/",
  "clearfork/",
  "seneca/",
  "dillon/",
  "logan/",
  "saltfork/",
  "burroak/",
  "dow/",
  "mosquito/",
  "berlin/",
  "westbranch/",
  "pymatuning/",
  "milton/",
  "leesville/",
  "grandlakestmarys/",
  "caesarcreek/",
  "eastfork/",
  "cjbrown/",
  "rockyfork/",
  "ladue/",
  "paintcreek/",
  "portagelakes/",
  "mogadore/",
  "loramie/",
  "nimisila/",
  "cowan/",
  "acton/",
  "tappan/",
  "piedmont/",
  "clendening/",
  "atwood/",
  "charlesmill/",
  "pleasanthill/",
  "beachcity/",
  "wingfoot/",
  "eastbranch/",
  "guilford/",
  "highlandtown/",
  "punderson/",
  "wellington/",
  "species/",
  "water.html",
  "ice.html",
  "stocking.html",
  "gear.html",
  "log.html",
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
  "js/night-rules.js",
  "js/i18n.js",
  "data/i18n/en.json",
  "data/i18n/es.json",
  "data/i18n/zh.json",
  "data/i18n/tl.json",
  "data/i18n/vi.json",
  "data/i18n/fr.json",
  "data/i18n/ko.json",
  "data/i18n/pt.json",
  "data/i18n/hi.json",
  "data/i18n/ru.json",
  "data/i18n/ht.json",
  "data/i18n/de.json",
  "data/i18n/pl.json",
  "data/i18n/it.json",
  "data/i18n/ja.json",
  "data/i18n/ar.json",
  "data/i18n/ur.json",
  "data/i18n/fa.json",
  "js/bait-nearby.js",
  "data/bait-shops.json",
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
  "js/lake-map-data-oshaughnessy.js",
  "js/lake-map-data-griggs.js",
  "js/lake-map-data-indian.js",
  "js/lake-map-data-delaware.js",
  "js/lake-map-data-deercreek.js",
  "js/lake-map-data-madison.js",
  "js/lake-map-data-knox.js",
  "js/lake-map-data-clearfork.js",
  "js/lake-map-data-seneca.js",
  "js/lake-map-data-dillon.js",
  "js/lake-map-data-logan.js",
  "js/lake-map-data-saltfork.js",
  "js/lake-map-data-burroak.js",
  "js/lake-map-data-dow.js",
  "js/lake-map-data-mosquito.js",
  "js/lake-map-data-berlin.js",
  "js/lake-map-data-westbranch.js",
  "js/lake-map-data-pymatuning.js",
  "js/lake-map-data-milton.js",
  "js/lake-map-data-leesville.js",
  "js/lake-map-data-grandlakestmarys.js",
  "js/lake-map-data-caesarcreek.js",
  "js/lake-map-data-eastfork.js",
  "js/lake-map-data-cjbrown.js",
  "js/lake-map-data-rockyfork.js",
  "js/lake-map-data-ladue.js",
  "js/lake-map-data-paintcreek.js",
  "js/lake-map-data-portagelakes.js",
  "js/lake-map-data-mogadore.js",
  "js/lake-map-data-loramie.js",
  "js/lake-map-data-nimisila.js",
  "js/lake-map-data-cowan.js",
  "js/lake-map-data-acton.js",
  "js/lake-map-data-tappan.js",
  "js/lake-map-data-piedmont.js",
  "js/lake-map-data-clendening.js",
  "js/lake-map-data-atwood.js",
  "js/lake-map-data-charlesmill.js",
  "js/lake-map-data-pleasanthill.js",
  "js/lake-map-data-beachcity.js",
  "js/lake-map-data-wingfoot.js",
  "js/lake-map-data-eastbranch.js",
  "js/lake-map-data-guilford.js",
  "js/lake-map-data-highlandtown.js",
  "js/lake-map-data-punderson.js",
  "js/lake-map-data-wellington.js",
  "js/lake-picker.js",
  "js/water-picker.js",
  "js/lake-snapshot.js",
  "js/lakes.js",
  "js/log.js",
  "js/mode-toggle.js",
  "js/nav.js",
  "js/a11y-boot.js",
  "js/a11y.js",
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
  "js/visits.js",
  "js/scrollspy.js",
  "js/fold-anchors.js",
  "js/local-notes.js",
  "js/docks.js",
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
  "assets/tiles/hoover.png",
  "assets/tiles/alum.png",
  "assets/tiles/buckeye.png",
  "assets/tiles/oshaughnessy.png",
  "assets/tiles/griggs.png",
  "assets/tiles/indian.png",
  "assets/tiles/delaware.png",
  "assets/tiles/deercreek.png",
  "assets/tiles/madison.png",
  "assets/tiles/knox.png",
  "assets/tiles/clearfork.png",
  "assets/tiles/seneca.png",
  "assets/tiles/dillon.png",
  "assets/tiles/logan.png",
  "assets/tiles/saltfork.png",
  "assets/tiles/burroak.png",
  "assets/tiles/dow.png",
  "assets/tiles/mosquito.png",
  "assets/tiles/berlin.png",
  "assets/tiles/westbranch.png",
  "assets/tiles/pymatuning.png",
  "assets/tiles/milton.png",
  "assets/tiles/leesville.png",
  "assets/tiles/grandlakestmarys.png",
  "assets/tiles/caesarcreek.png",
  "assets/tiles/eastfork.png",
  "assets/tiles/cjbrown.png",
  "assets/tiles/rockyfork.png",
  "assets/tiles/ladue.png",
  "assets/tiles/paintcreek.png",
  "assets/tiles/portagelakes.png",
  "assets/tiles/mogadore.png",
  "assets/tiles/loramie.png",
  "assets/tiles/nimisila.png",
  "assets/tiles/cowan.png",
  "assets/tiles/acton.png",
  "assets/tiles/tappan.png",
  "assets/tiles/piedmont.png",
  "assets/tiles/clendening.png",
  "assets/tiles/atwood.png",
  "assets/tiles/charlesmill.png",
  "assets/tiles/pleasanthill.png",
  "assets/tiles/beachcity.png",
  "assets/tiles/wingfoot.png",
  "assets/tiles/eastbranch.png",
  "assets/tiles/guilford.png",
  "assets/tiles/highlandtown.png",
  "assets/tiles/punderson.png",
  "assets/tiles/wellington.png",
  "assets/hoover-chart.png",
  "assets/maps/hoover-depth-contours.webp",
  "assets/alum-chart.png",
  "assets/buckeye-chart.png",
  "assets/oshaughnessy-chart.png",
  "assets/griggs-chart.png",
  "assets/indian-chart.png",
  "assets/delaware-chart.png",
  "assets/deercreek-chart.png",
  "assets/madison-chart.png",
  "assets/knox-chart.png",
  "assets/clearfork-chart.png",
  "assets/seneca-chart.png",
  "assets/dillon-chart.png",
  "assets/logan-chart.png",
  "assets/saltfork-chart.png",
  "assets/burroak-chart.png",
  "assets/dow-chart.png",
  "assets/mosquito-chart.png",
  "assets/berlin-chart.png",
  "assets/westbranch-chart.png",
  "assets/pymatuning-chart.png",
  "assets/milton-chart.png",
  "assets/leesville-chart.png",
  "assets/grandlakestmarys-chart.png",
  "assets/caesarcreek-chart.png",
  "assets/eastfork-chart.png",
  "assets/cjbrown-chart.png",
  "assets/rockyfork-chart.png",
  "assets/ladue-chart.png",
  "assets/paintcreek-chart.png",
  "assets/portagelakes-chart.png",
  "assets/mogadore-chart.png",
  "assets/loramie-chart.png",
  "assets/nimisila-chart.png",
  "assets/cowan-chart.png",
  "assets/acton-chart.png",
  "assets/tappan-chart.png",
  "assets/piedmont-chart.png",
  "assets/clendening-chart.png",
  "assets/atwood-chart.png",
  "assets/charlesmill-chart.png",
  "assets/pleasanthill-chart.png",
  "assets/beachcity-chart.png",
  "assets/wingfoot-chart.png",
  "assets/eastbranch-chart.png",
  "assets/guilford-chart.png",
  "assets/highlandtown-chart.png",
  "assets/punderson-chart.png",
  "assets/wellington-chart.png",
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
  "assets/map/oshaughnessy-map-tall.png",
  "assets/map/oshaughnessy-map-wide.png",
  "assets/map/griggs-map-tall.png",
  "assets/map/griggs-map-wide.png",
  "assets/map/indian-map-tall.png",
  "assets/map/indian-map-wide.png",
  "assets/map/delaware-map-tall.png",
  "assets/map/delaware-map-wide.png",
  "assets/map/deercreek-map-tall.png",
  "assets/map/deercreek-map-wide.png",
  "assets/map/madison-map-tall.png",
  "assets/map/madison-map-wide.png",
  "assets/map/knox-map-tall.png",
  "assets/map/knox-map-wide.png",
  "assets/map/clearfork-map-tall.png",
  "assets/map/clearfork-map-wide.png",
  "assets/map/seneca-map-tall.png",
  "assets/map/seneca-map-wide.png",
  "assets/map/dillon-map-tall.png",
  "assets/map/dillon-map-wide.png",
  "assets/map/logan-map-tall.png",
  "assets/map/logan-map-wide.png",
  "assets/map/saltfork-map-tall.png",
  "assets/map/saltfork-map-wide.png",
  "assets/map/burroak-map-tall.png",
  "assets/map/burroak-map-wide.png",
  "assets/map/dow-map-tall.png",
  "assets/map/dow-map-wide.png",
  "assets/map/mosquito-map-tall.png",
  "assets/map/mosquito-map-wide.png",
  "assets/map/berlin-map-tall.png",
  "assets/map/berlin-map-wide.png",
  "assets/map/westbranch-map-tall.png",
  "assets/map/westbranch-map-wide.png",
  "assets/map/pymatuning-map-tall.png",
  "assets/map/pymatuning-map-wide.png",
  "assets/map/milton-map-tall.png",
  "assets/map/milton-map-wide.png",
  "assets/map/leesville-map-tall.png",
  "assets/map/leesville-map-wide.png",
  "assets/map/grandlakestmarys-map-tall.png",
  "assets/map/grandlakestmarys-map-wide.png",
  "assets/map/caesarcreek-map-tall.png",
  "assets/map/caesarcreek-map-wide.png",
  "assets/map/eastfork-map-tall.png",
  "assets/map/eastfork-map-wide.png",
  "assets/map/cjbrown-map-tall.png",
  "assets/map/cjbrown-map-wide.png",
  "assets/map/rockyfork-map-tall.png",
  "assets/map/rockyfork-map-wide.png",
  "assets/map/ladue-map-tall.png",
  "assets/map/ladue-map-wide.png",
  "assets/map/paintcreek-map-tall.png",
  "assets/map/paintcreek-map-wide.png",
  "assets/map/portagelakes-map-tall.png",
  "assets/map/portagelakes-map-wide.png",
  "assets/map/mogadore-map-tall.png",
  "assets/map/mogadore-map-wide.png",
  "assets/map/loramie-map-tall.png",
  "assets/map/loramie-map-wide.png",
  "assets/map/nimisila-map-tall.png",
  "assets/map/nimisila-map-wide.png",
  "assets/map/cowan-map-tall.png",
  "assets/map/cowan-map-wide.png",
  "assets/map/acton-map-tall.png",
  "assets/map/acton-map-wide.png",
  "assets/map/tappan-map-tall.png",
  "assets/map/tappan-map-wide.png",
  "assets/map/piedmont-map-tall.png",
  "assets/map/piedmont-map-wide.png",
  "assets/map/clendening-map-tall.png",
  "assets/map/clendening-map-wide.png",
  "assets/map/atwood-map-tall.png",
  "assets/map/atwood-map-wide.png",
  "assets/map/charlesmill-map-tall.png",
  "assets/map/charlesmill-map-wide.png",
  "assets/map/pleasanthill-map-tall.png",
  "assets/map/pleasanthill-map-wide.png",
  "assets/map/beachcity-map-tall.png",
  "assets/map/beachcity-map-wide.png",
  "assets/map/wingfoot-map-tall.png",
  "assets/map/wingfoot-map-wide.png",
  "assets/map/eastbranch-map-tall.png",
  "assets/map/eastbranch-map-wide.png",
  "assets/map/guilford-map-tall.png",
  "assets/map/guilford-map-wide.png",
  "assets/map/highlandtown-map-tall.png",
  "assets/map/highlandtown-map-wide.png",
  "assets/map/punderson-map-tall.png",
  "assets/map/punderson-map-wide.png",
  "assets/map/wellington-map-tall.png",
  "assets/map/wellington-map-wide.png",
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
  else if (/\.html$/.test(href)) tries.push(href.replace(/\.html$/, ""));
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
