/**
 * The Night Bite service worker (nightbiteoh.com).
 * Lives at the site root so its scope is the whole site (/). The preview copy runs the same file under /night-bite-preview/.
 * Every path below is relative to this file, so the same file works in both places.
 *
 * Since v127 (the "diet"): a hashed precache, kept across deploys, plus runtime caches. v128 adds every lake home.
 *  · Precache: the shell, every lake home, and the chart, map script and map images each home needs offline. The
 *    water picker (./), offline.html, the manifest and icons, css/styles.css, the shared scripts in js/, the fonts,
 *    the picker tiles, Hoover's depth contours, the map pins, and the small data files the home and lake pages
 *    read, plus one block per water from js/lakes.js (tools/sw-precache.py writes it). Each file has a content hash
 *    in REVISIONS, and the cache (PREFIX + "precache") outlives VERSION: a new worker only downloads files whose
 *    hash changed. Hashes of HTML ignore the ?v= stamps, which change on every deploy without changing the page.
 *  · Pages (navigations and text/html): network first with a 4 second timeout, then the saved copy, then offline.html.
 *    Lake homes come from the precache, so they open offline right after install. Every other page you open online
 *    is saved (PREFIX + "pages", newest 40). An unvisited deeper page (water.html, a species page) shows offline.html.
 *  · data/*.json: network first, saved copy when offline (PREFIX + "data", newest 60; the precached copy is the
 *    last resort). The worker never adds headers: data/advisor-rules.json for the Android app is plain GitHub Pages.
 *  · CSS and JS: network first too, saved copy when offline or slow, so a page never mixes this deploy's HTML
 *    with last deploy's styles or scripts. (Up to v11 these were cache first, which showed the multi-lake
 *    picker unstyled and the old Hoover-only map script after a deploy.) Pages ask for them with ?v=VERSION.
 *  · Fonts and images: precached ones straight from the precache; the rest stale while revalidate
 *    (PREFIX + "assets", newest 200, which also holds the lake only scripts).
 *  · Whisperwood is never touched: nothing under whisperwood/ (or whisperwood.html) is cached or intercepted.
 *  · Cross origin requests (NWS, USGS, links out) pass straight through. The page itself keeps the last good
 *    readings in localStorage and labels them "Offline. Last updated ..." (js/refresh.js, NightBiteOffline).
 *  · Activate deletes every other cache with this PREFIX (the old one per VERSION caches included) and precache
 *    entries no longer listed. Other sites on the same origin (other github.io projects) are left alone.
 *
 * Kill switch: see SERVICE-WORKER.md.
 */
var PREFIX = "nb-live-";
var VERSION = "v38-2026-11-11";
var SCOPE = new URL("./", self.location).href;
var NETWORK_TIMEOUT = 4000;
var PRECACHE_CACHE = PREFIX + "precache";
var RUNTIME = { pages: PREFIX + "pages", data: PREFIX + "data", assets: PREFIX + "assets" };
var LIMITS = { pages: 40, data: 60, assets: 200 };

var PRECACHE = [
  "./",
  "offline.html",
  "site.webmanifest",
  "favicon.svg",
  "favicon.ico",
  "apple-touch-icon.png",
  "css/styles.css",
  "js/alerts.js",
  "js/astro.js",
  "js/night-rules.js",
  "js/i18n.js",
  "js/bait-nearby.js",
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
  "data/quick-facts.json",
  "data/bait-shops.json",
  "data/community-log.json",
  "data/tournaments.json",
  "assets/fonts/night-bite-pixel-bold.woff2",
  "assets/fonts/night-bite-pixel-regular.woff2",
  "assets/fonts/pixelify-sans-latin.woff2",
  "assets/fonts/source-serif-4-italic-latin.woff2",
  "assets/fonts/source-serif-4-latin.woff2",
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
  "assets/lantern.svg",
  "assets/lantern-hero.svg",
  "assets/horizon-center.png",
  "assets/horizon-thin.png",
  "assets/horizon-tile.png",
  "assets/maps/hoover-depth-contours.webp",
  "assets/map/pin-access.png",
  "assets/map/pin-ramp.png",
  "assets/map/pin-shop.png",
  "assets/moon/moon-phases.png",
  "assets/wind/wind-arrows.png",
  // BEGIN LAKE PRECACHE
  "hoover/",
  "assets/hoover-chart.png",
  "assets/map/hoover-map-tall.png",
  "assets/map/hoover-map-wide.png",
  "alum/",
  "assets/alum-chart.png",
  "js/lake-map-data-alum.js",
  "assets/map/alum-map-tall.png",
  "assets/map/alum-map-wide.png",
  "buckeye/",
  "assets/buckeye-chart.png",
  "js/lake-map-data-buckeye.js",
  "assets/map/buckeye-map-tall.png",
  "assets/map/buckeye-map-wide.png",
  "oshaughnessy/",
  "assets/oshaughnessy-chart.png",
  "js/lake-map-data-oshaughnessy.js",
  "assets/map/oshaughnessy-map-tall.png",
  "assets/map/oshaughnessy-map-wide.png",
  "griggs/",
  "assets/griggs-chart.png",
  "js/lake-map-data-griggs.js",
  "assets/map/griggs-map-tall.png",
  "assets/map/griggs-map-wide.png",
  "indian/",
  "assets/indian-chart.png",
  "js/lake-map-data-indian.js",
  "assets/map/indian-map-tall.png",
  "assets/map/indian-map-wide.png",
  "delaware/",
  "assets/delaware-chart.png",
  "js/lake-map-data-delaware.js",
  "assets/map/delaware-map-tall.png",
  "assets/map/delaware-map-wide.png",
  "deercreek/",
  "assets/deercreek-chart.png",
  "js/lake-map-data-deercreek.js",
  "assets/map/deercreek-map-tall.png",
  "assets/map/deercreek-map-wide.png",
  "madison/",
  "assets/madison-chart.png",
  "js/lake-map-data-madison.js",
  "assets/map/madison-map-tall.png",
  "assets/map/madison-map-wide.png",
  "knox/",
  "assets/knox-chart.png",
  "js/lake-map-data-knox.js",
  "assets/map/knox-map-tall.png",
  "assets/map/knox-map-wide.png",
  "clearfork/",
  "assets/clearfork-chart.png",
  "js/lake-map-data-clearfork.js",
  "assets/map/clearfork-map-tall.png",
  "assets/map/clearfork-map-wide.png",
  "seneca/",
  "assets/seneca-chart.png",
  "js/lake-map-data-seneca.js",
  "assets/map/seneca-map-tall.png",
  "assets/map/seneca-map-wide.png",
  "dillon/",
  "assets/dillon-chart.png",
  "js/lake-map-data-dillon.js",
  "assets/map/dillon-map-tall.png",
  "assets/map/dillon-map-wide.png",
  "logan/",
  "assets/logan-chart.png",
  "js/lake-map-data-logan.js",
  "assets/map/logan-map-tall.png",
  "assets/map/logan-map-wide.png",
  "saltfork/",
  "assets/saltfork-chart.png",
  "js/lake-map-data-saltfork.js",
  "assets/map/saltfork-map-tall.png",
  "assets/map/saltfork-map-wide.png",
  "burroak/",
  "assets/burroak-chart.png",
  "js/lake-map-data-burroak.js",
  "assets/map/burroak-map-tall.png",
  "assets/map/burroak-map-wide.png",
  "dow/",
  "assets/dow-chart.png",
  "js/lake-map-data-dow.js",
  "assets/map/dow-map-tall.png",
  "assets/map/dow-map-wide.png",
  "mosquito/",
  "assets/mosquito-chart.png",
  "js/lake-map-data-mosquito.js",
  "assets/map/mosquito-map-tall.png",
  "assets/map/mosquito-map-wide.png",
  "berlin/",
  "assets/berlin-chart.png",
  "js/lake-map-data-berlin.js",
  "assets/map/berlin-map-tall.png",
  "assets/map/berlin-map-wide.png",
  "westbranch/",
  "assets/westbranch-chart.png",
  "js/lake-map-data-westbranch.js",
  "assets/map/westbranch-map-tall.png",
  "assets/map/westbranch-map-wide.png",
  "pymatuning/",
  "assets/pymatuning-chart.png",
  "js/lake-map-data-pymatuning.js",
  "assets/map/pymatuning-map-tall.png",
  "assets/map/pymatuning-map-wide.png",
  "milton/",
  "assets/milton-chart.png",
  "js/lake-map-data-milton.js",
  "assets/map/milton-map-tall.png",
  "assets/map/milton-map-wide.png",
  "leesville/",
  "assets/leesville-chart.png",
  "js/lake-map-data-leesville.js",
  "assets/map/leesville-map-tall.png",
  "assets/map/leesville-map-wide.png",
  "grandlakestmarys/",
  "assets/grandlakestmarys-chart.png",
  "js/lake-map-data-grandlakestmarys.js",
  "assets/map/grandlakestmarys-map-tall.png",
  "assets/map/grandlakestmarys-map-wide.png",
  "caesarcreek/",
  "assets/caesarcreek-chart.png",
  "js/lake-map-data-caesarcreek.js",
  "assets/map/caesarcreek-map-tall.png",
  "assets/map/caesarcreek-map-wide.png",
  "eastfork/",
  "assets/eastfork-chart.png",
  "js/lake-map-data-eastfork.js",
  "assets/map/eastfork-map-tall.png",
  "assets/map/eastfork-map-wide.png",
  "cjbrown/",
  "assets/cjbrown-chart.png",
  "js/lake-map-data-cjbrown.js",
  "assets/map/cjbrown-map-tall.png",
  "assets/map/cjbrown-map-wide.png",
  "rockyfork/",
  "assets/rockyfork-chart.png",
  "js/lake-map-data-rockyfork.js",
  "assets/map/rockyfork-map-tall.png",
  "assets/map/rockyfork-map-wide.png",
  "ladue/",
  "assets/ladue-chart.png",
  "js/lake-map-data-ladue.js",
  "assets/map/ladue-map-tall.png",
  "assets/map/ladue-map-wide.png",
  "paintcreek/",
  "assets/paintcreek-chart.png",
  "js/lake-map-data-paintcreek.js",
  "assets/map/paintcreek-map-tall.png",
  "assets/map/paintcreek-map-wide.png",
  "portagelakes/",
  "assets/portagelakes-chart.png",
  "js/lake-map-data-portagelakes.js",
  "assets/map/portagelakes-map-tall.png",
  "assets/map/portagelakes-map-wide.png",
  "mogadore/",
  "assets/mogadore-chart.png",
  "js/lake-map-data-mogadore.js",
  "assets/map/mogadore-map-tall.png",
  "assets/map/mogadore-map-wide.png",
  "loramie/",
  "assets/loramie-chart.png",
  "js/lake-map-data-loramie.js",
  "assets/map/loramie-map-tall.png",
  "assets/map/loramie-map-wide.png",
  "nimisila/",
  "assets/nimisila-chart.png",
  "js/lake-map-data-nimisila.js",
  "assets/map/nimisila-map-tall.png",
  "assets/map/nimisila-map-wide.png",
  "cowan/",
  "assets/cowan-chart.png",
  "js/lake-map-data-cowan.js",
  "assets/map/cowan-map-tall.png",
  "assets/map/cowan-map-wide.png",
  "acton/",
  "assets/acton-chart.png",
  "js/lake-map-data-acton.js",
  "assets/map/acton-map-tall.png",
  "assets/map/acton-map-wide.png",
  "tappan/",
  "assets/tappan-chart.png",
  "js/lake-map-data-tappan.js",
  "assets/map/tappan-map-tall.png",
  "assets/map/tappan-map-wide.png",
  "piedmont/",
  "assets/piedmont-chart.png",
  "js/lake-map-data-piedmont.js",
  "assets/map/piedmont-map-tall.png",
  "assets/map/piedmont-map-wide.png",
  "clendening/",
  "assets/clendening-chart.png",
  "js/lake-map-data-clendening.js",
  "assets/map/clendening-map-tall.png",
  "assets/map/clendening-map-wide.png",
  "atwood/",
  "assets/atwood-chart.png",
  "js/lake-map-data-atwood.js",
  "assets/map/atwood-map-tall.png",
  "assets/map/atwood-map-wide.png",
  "charlesmill/",
  "assets/charlesmill-chart.png",
  "js/lake-map-data-charlesmill.js",
  "assets/map/charlesmill-map-tall.png",
  "assets/map/charlesmill-map-wide.png",
  "pleasanthill/",
  "assets/pleasanthill-chart.png",
  "js/lake-map-data-pleasanthill.js",
  "assets/map/pleasanthill-map-tall.png",
  "assets/map/pleasanthill-map-wide.png",
  "beachcity/",
  "assets/beachcity-chart.png",
  "js/lake-map-data-beachcity.js",
  "assets/map/beachcity-map-tall.png",
  "assets/map/beachcity-map-wide.png",
  "wingfoot/",
  "assets/wingfoot-chart.png",
  "js/lake-map-data-wingfoot.js",
  "assets/map/wingfoot-map-tall.png",
  "assets/map/wingfoot-map-wide.png",
  "eastbranch/",
  "assets/eastbranch-chart.png",
  "js/lake-map-data-eastbranch.js",
  "assets/map/eastbranch-map-tall.png",
  "assets/map/eastbranch-map-wide.png",
  "guilford/",
  "assets/guilford-chart.png",
  "js/lake-map-data-guilford.js",
  "assets/map/guilford-map-tall.png",
  "assets/map/guilford-map-wide.png",
  "highlandtown/",
  "assets/highlandtown-chart.png",
  "js/lake-map-data-highlandtown.js",
  "assets/map/highlandtown-map-tall.png",
  "assets/map/highlandtown-map-wide.png",
  "punderson/",
  "assets/punderson-chart.png",
  "js/lake-map-data-punderson.js",
  "assets/map/punderson-map-tall.png",
  "assets/map/punderson-map-wide.png",
  "wellington/",
  "assets/wellington-chart.png",
  "js/lake-map-data-wellington.js",
  "assets/map/wellington-map-tall.png",
  "assets/map/wellington-map-wide.png",
  // END LAKE PRECACHE
];

// tools/sw-precache.py writes this block (stamp-version.py and promote.py run it). Don't edit it by hand.
// BEGIN REVISIONS
var REVISIONS = {
  "./": "fce7a75f9835",
  "offline.html": "a035d7a4d213",
  "site.webmanifest": "102fc0d95634",
  "favicon.svg": "a4203bb6ec2d",
  "favicon.ico": "ec8fafebba48",
  "apple-touch-icon.png": "ae1b52f0a95b",
  "css/styles.css": "f29603e74d2b",
  "js/alerts.js": "2c7b980aa108",
  "js/astro.js": "a3ec0945f030",
  "js/night-rules.js": "c14111456232",
  "js/i18n.js": "e4390c024f98",
  "js/bait-nearby.js": "b75e87af32d4",
  "js/biting-data.js": "a34d2c4327fb",
  "js/biting-data-lakes.js": "0b33ed7d3612",
  "js/biting.js": "96b7dd457419",
  "js/community-log.js": "8115f19147eb",
  "js/conditions.js": "411b3d05c3d9",
  "js/get-app.js": "8345fce8e5c8",
  "js/glance.js": "10a9bc96cc51",
  "js/home-log.js": "09d0017c6cec",
  "js/hoover-map-data.js": "88336536d9dc",
  "js/hoover-map.js": "eb007aca9278",
  "js/ice-species.js": "1b7ad6422ffa",
  "js/install-tip.js": "066437822918",
  "js/lake-picker.js": "03f6265ee9c9",
  "js/water-picker.js": "b48ce9fb2f0d",
  "js/lake-snapshot.js": "9f0ac1a4d1ac",
  "js/lakes.js": "1f72f697524f",
  "js/log.js": "69cf38e8db8a",
  "js/mode-toggle.js": "842ee5852866",
  "js/nav.js": "85c14199105b",
  "js/a11y-boot.js": "dce50da82642",
  "js/a11y.js": "285b620a50bc",
  "js/updates-draft.js": "954b481592ef",
  "js/pack-list.js": "f9a5e5d83c93",
  "js/pool-readout.js": "8d7a2674f345",
  "js/pool-trend.js": "a619ea9620f8",
  "js/refresh.js": "fdff32325088",
  "js/species-filter.js": "454f000c5ba6",
  "js/species-lake.js": "6619e409199a",
  "js/sticky-nav.js": "320454e88b43",
  "js/sw-update.js": "6e734dea5cc5",
  "js/tonight-tools.js": "e58623e5304e",
  "js/tournaments.js": "fd4ba507c0c4",
  "js/usgs.js": "a25e9832344f",
  "js/water.js": "23040b9980b5",
  "js/visits.js": "e0f046529c59",
  "js/scrollspy.js": "1b056c72b92f",
  "js/fold-anchors.js": "50003a38a248",
  "js/local-notes.js": "d68fc177c5f1",
  "js/docks.js": "a1a7f6febfb1",
  "data/quick-facts.json": "856ba6ea6354",
  "data/bait-shops.json": "64f734bc9039",
  "data/community-log.json": "580fe5dfefbb",
  "data/tournaments.json": "a5ba0fefa580",
  "assets/fonts/night-bite-pixel-bold.woff2": "3e683f59654f",
  "assets/fonts/night-bite-pixel-regular.woff2": "1458fee0d42d",
  "assets/fonts/pixelify-sans-latin.woff2": "9c367c6a9e26",
  "assets/fonts/source-serif-4-italic-latin.woff2": "f97463f721a8",
  "assets/fonts/source-serif-4-latin.woff2": "88c3215f1779",
  "assets/tiles/hoover.png": "411fd8c327e8",
  "assets/tiles/alum.png": "5a075b159522",
  "assets/tiles/buckeye.png": "49fa9166b395",
  "assets/tiles/oshaughnessy.png": "8986fdeff21f",
  "assets/tiles/griggs.png": "0fce7b9cec29",
  "assets/tiles/indian.png": "ae0f4f923523",
  "assets/tiles/delaware.png": "67f9ba436001",
  "assets/tiles/deercreek.png": "ca508082e49b",
  "assets/tiles/madison.png": "abd1960f02de",
  "assets/tiles/knox.png": "bf6cc39419cb",
  "assets/tiles/clearfork.png": "7c8f14d451ea",
  "assets/tiles/seneca.png": "f57a6316a301",
  "assets/tiles/dillon.png": "bd6608c42c35",
  "assets/tiles/logan.png": "9b19d7c77372",
  "assets/tiles/saltfork.png": "a9eae44cbb73",
  "assets/tiles/burroak.png": "001b10eed944",
  "assets/tiles/dow.png": "237f2f4aace4",
  "assets/tiles/mosquito.png": "6588818a309f",
  "assets/tiles/berlin.png": "5b955766882c",
  "assets/tiles/westbranch.png": "e56bb16d0261",
  "assets/tiles/pymatuning.png": "fbe089a5aefa",
  "assets/tiles/milton.png": "968f2a7d6219",
  "assets/tiles/leesville.png": "3d0fc02b5bb7",
  "assets/tiles/grandlakestmarys.png": "8b90b41a6af9",
  "assets/tiles/caesarcreek.png": "551a3bd7ed01",
  "assets/tiles/eastfork.png": "5ac9f2c45bc3",
  "assets/tiles/cjbrown.png": "68418c62d334",
  "assets/tiles/rockyfork.png": "131752bec923",
  "assets/tiles/ladue.png": "7b3e1bafb155",
  "assets/tiles/paintcreek.png": "59da3f0fad45",
  "assets/tiles/portagelakes.png": "79de1b5039b0",
  "assets/tiles/mogadore.png": "0f699c2f3fed",
  "assets/tiles/loramie.png": "a1b5bf7ac644",
  "assets/tiles/nimisila.png": "19b9ca50ba99",
  "assets/tiles/cowan.png": "037e85394b6b",
  "assets/tiles/acton.png": "fb8b3d71db81",
  "assets/tiles/tappan.png": "da0dbd2fbac5",
  "assets/tiles/piedmont.png": "dcd9c2334098",
  "assets/tiles/clendening.png": "edab7e9945e9",
  "assets/tiles/atwood.png": "a3966e5ffcac",
  "assets/tiles/charlesmill.png": "27f56f47e49f",
  "assets/tiles/pleasanthill.png": "82e454bd8cf3",
  "assets/tiles/beachcity.png": "e15c29994997",
  "assets/tiles/wingfoot.png": "c7d7901bcc55",
  "assets/tiles/eastbranch.png": "5ae73f8ed328",
  "assets/tiles/guilford.png": "96ac04ccb00d",
  "assets/tiles/highlandtown.png": "53939e559f2c",
  "assets/tiles/punderson.png": "ce058a1f557b",
  "assets/tiles/wellington.png": "c264604f3ce0",
  "assets/icons/bank.svg": "3d52f3c2091d",
  "assets/icons/boat.svg": "adc37375205e",
  "assets/icons/bobber.svg": "9d2e548697f8",
  "assets/icons/fish-black-crappie.svg": "93c7ad010cd4",
  "assets/icons/fish-blue-catfish.svg": "24f95321d2d8",
  "assets/icons/fish-bluegill.svg": "66638a4c5289",
  "assets/icons/fish-channel-catfish.svg": "fc3a94949f46",
  "assets/icons/fish-common-carp.svg": "0503f0acf360",
  "assets/icons/fish-flathead-catfish.svg": "ad68bb1d7c9d",
  "assets/icons/fish-hybrid-striped-bass.svg": "11eeada354fd",
  "assets/icons/fish-largemouth-bass.svg": "5bc042d6c48f",
  "assets/icons/fish-longnose-gar.svg": "bbc598d003a0",
  "assets/icons/fish-saugeye.svg": "8fe6267acfdf",
  "assets/icons/fish-smallmouth-bass.svg": "687d4a0e2427",
  "assets/icons/fish-walleye.svg": "c8ec0b5ad7df",
  "assets/icons/fish-white-bass.svg": "e9dae8031412",
  "assets/icons/fish-white-crappie.svg": "7226b8d28926",
  "assets/icons/fish-muskellunge.svg": "5f928de1be7b",
  "assets/icons/fish-yellow-perch.svg": "8bd5aa0775bf",
  "assets/icons/fish-bullhead.svg": "f6891883c429",
  "assets/icons/icon-192.png": "1a71fa8bf8ff",
  "assets/icons/icon-512.png": "731523cf6126",
  "assets/icons/icon-maskable-192.png": "7b5bd4488247",
  "assets/icons/icon-maskable-512.png": "49588ad8eca6",
  "assets/icons/moon.svg": "823fef6f2eb8",
  "assets/lantern.svg": "e99d689ca189",
  "assets/lantern-hero.svg": "a00256a88874",
  "assets/horizon-center.png": "d4e12d76b18e",
  "assets/horizon-thin.png": "e221a7fc7502",
  "assets/horizon-tile.png": "f876ce581248",
  "assets/maps/hoover-depth-contours.webp": "afd472240e97",
  "assets/map/pin-access.png": "0b291a11e61d",
  "assets/map/pin-ramp.png": "4fb65a1c2743",
  "assets/map/pin-shop.png": "b7beeb5fd6a9",
  "assets/moon/moon-phases.png": "88eb81447164",
  "assets/wind/wind-arrows.png": "320e354157c4",
  "hoover/": "e20ad34acbb1",
  "assets/hoover-chart.png": "fe743cba0221",
  "assets/map/hoover-map-tall.png": "8ccedbbfb7ab",
  "assets/map/hoover-map-wide.png": "1330bbed1c9a",
  "alum/": "94a0c5aba8ae",
  "assets/alum-chart.png": "c16bd4b47fe9",
  "js/lake-map-data-alum.js": "5678be7e44d1",
  "assets/map/alum-map-tall.png": "6690ef553cf0",
  "assets/map/alum-map-wide.png": "764c9fd37d01",
  "buckeye/": "848070fec881",
  "assets/buckeye-chart.png": "bfe2966578a3",
  "js/lake-map-data-buckeye.js": "68778c2349e8",
  "assets/map/buckeye-map-tall.png": "64957d8aef76",
  "assets/map/buckeye-map-wide.png": "5025bb2f3a4f",
  "oshaughnessy/": "998af646767e",
  "assets/oshaughnessy-chart.png": "3b40fae44c40",
  "js/lake-map-data-oshaughnessy.js": "f050afe8afe8",
  "assets/map/oshaughnessy-map-tall.png": "17fa0ebfc502",
  "assets/map/oshaughnessy-map-wide.png": "81aa41f82d1f",
  "griggs/": "e7b017521497",
  "assets/griggs-chart.png": "8a264a3b7c7d",
  "js/lake-map-data-griggs.js": "f2acdec71f03",
  "assets/map/griggs-map-tall.png": "ce164fce175f",
  "assets/map/griggs-map-wide.png": "a2ea510cefdf",
  "indian/": "c9e47b78fa97",
  "assets/indian-chart.png": "84b8f17a1d85",
  "js/lake-map-data-indian.js": "535b52fe7fdc",
  "assets/map/indian-map-tall.png": "2326904e34ad",
  "assets/map/indian-map-wide.png": "f9de608ea45c",
  "delaware/": "bffe93339fc2",
  "assets/delaware-chart.png": "c998d5020831",
  "js/lake-map-data-delaware.js": "c79e0ef0869f",
  "assets/map/delaware-map-tall.png": "cf176edc91f6",
  "assets/map/delaware-map-wide.png": "1a4b178ec53b",
  "deercreek/": "fc9daf883a88",
  "assets/deercreek-chart.png": "092a1b944384",
  "js/lake-map-data-deercreek.js": "44e04a1604e7",
  "assets/map/deercreek-map-tall.png": "5654e0f59db7",
  "assets/map/deercreek-map-wide.png": "94741d413ed8",
  "madison/": "02cd67ed8065",
  "assets/madison-chart.png": "d3766badfbd1",
  "js/lake-map-data-madison.js": "168f408b503d",
  "assets/map/madison-map-tall.png": "444806e561ae",
  "assets/map/madison-map-wide.png": "95878b3ea30f",
  "knox/": "c24bd4814778",
  "assets/knox-chart.png": "025d6bb15f45",
  "js/lake-map-data-knox.js": "392b82f2f374",
  "assets/map/knox-map-tall.png": "4fc3e6e27e1e",
  "assets/map/knox-map-wide.png": "979e6ba7ddfb",
  "clearfork/": "7daa85bcd779",
  "assets/clearfork-chart.png": "71d6124a936a",
  "js/lake-map-data-clearfork.js": "4a0fc97e9cf9",
  "assets/map/clearfork-map-tall.png": "0bbdf6e67c04",
  "assets/map/clearfork-map-wide.png": "70e32449565e",
  "seneca/": "3330e6926183",
  "assets/seneca-chart.png": "30b242bf47e0",
  "js/lake-map-data-seneca.js": "a6edd3f302fc",
  "assets/map/seneca-map-tall.png": "90ccd70ec71d",
  "assets/map/seneca-map-wide.png": "86379360b101",
  "dillon/": "f5cc15901bdc",
  "assets/dillon-chart.png": "5acb4d046c23",
  "js/lake-map-data-dillon.js": "dafe786159c3",
  "assets/map/dillon-map-tall.png": "29d7f7030500",
  "assets/map/dillon-map-wide.png": "c9b315494172",
  "logan/": "4bca9932b480",
  "assets/logan-chart.png": "f2e49674592a",
  "js/lake-map-data-logan.js": "25aec9e6c604",
  "assets/map/logan-map-tall.png": "974c448fa6a8",
  "assets/map/logan-map-wide.png": "4dc4302101c2",
  "saltfork/": "60fa0d148d9f",
  "assets/saltfork-chart.png": "00c70968ea52",
  "js/lake-map-data-saltfork.js": "776d711d996b",
  "assets/map/saltfork-map-tall.png": "86b0df903f84",
  "assets/map/saltfork-map-wide.png": "fc75e61e3fff",
  "burroak/": "c77d542c372f",
  "assets/burroak-chart.png": "dfd696e071e0",
  "js/lake-map-data-burroak.js": "f7cfc9311242",
  "assets/map/burroak-map-tall.png": "e18358a3c235",
  "assets/map/burroak-map-wide.png": "9a456fa305f4",
  "dow/": "c4f1294820f2",
  "assets/dow-chart.png": "9dea67521582",
  "js/lake-map-data-dow.js": "0589fd4ecfbc",
  "assets/map/dow-map-tall.png": "c6ee1b4bfdcc",
  "assets/map/dow-map-wide.png": "1282bad36e66",
  "mosquito/": "61d48a4121aa",
  "assets/mosquito-chart.png": "fbcd2e567bbb",
  "js/lake-map-data-mosquito.js": "e4d6935ed0ac",
  "assets/map/mosquito-map-tall.png": "0ec97542cfcb",
  "assets/map/mosquito-map-wide.png": "5f9c8adca6e1",
  "berlin/": "bba8f863a38b",
  "assets/berlin-chart.png": "b830fa015fb7",
  "js/lake-map-data-berlin.js": "4c80a4fb7b37",
  "assets/map/berlin-map-tall.png": "8bda38969671",
  "assets/map/berlin-map-wide.png": "f06db7bafa09",
  "westbranch/": "bc1981bacf55",
  "assets/westbranch-chart.png": "882121f583eb",
  "js/lake-map-data-westbranch.js": "e9fe07f9b0cd",
  "assets/map/westbranch-map-tall.png": "1e08f8cc8cb5",
  "assets/map/westbranch-map-wide.png": "28227371f1b1",
  "pymatuning/": "d5367b1dd4ba",
  "assets/pymatuning-chart.png": "cc48ee19f208",
  "js/lake-map-data-pymatuning.js": "b0852213f8ab",
  "assets/map/pymatuning-map-tall.png": "c7d15d6af5fb",
  "assets/map/pymatuning-map-wide.png": "6cb0238db655",
  "milton/": "d7c9fde50c0a",
  "assets/milton-chart.png": "86d5f99e27e1",
  "js/lake-map-data-milton.js": "7c5ac5a84f27",
  "assets/map/milton-map-tall.png": "99dad2407b96",
  "assets/map/milton-map-wide.png": "f53f78b14569",
  "leesville/": "26537af9b90f",
  "assets/leesville-chart.png": "f9e088059c15",
  "js/lake-map-data-leesville.js": "9c798afe6a13",
  "assets/map/leesville-map-tall.png": "6c1554562cd4",
  "assets/map/leesville-map-wide.png": "1e7cf0bdfe35",
  "grandlakestmarys/": "cd8c49b21202",
  "assets/grandlakestmarys-chart.png": "b09d980eba98",
  "js/lake-map-data-grandlakestmarys.js": "2d329bf60d3e",
  "assets/map/grandlakestmarys-map-tall.png": "3a1658e2596a",
  "assets/map/grandlakestmarys-map-wide.png": "8ee5a67cbc3a",
  "caesarcreek/": "62ce1ccfac5a",
  "assets/caesarcreek-chart.png": "29e57056cc97",
  "js/lake-map-data-caesarcreek.js": "160b4c922ff6",
  "assets/map/caesarcreek-map-tall.png": "184424f54ae3",
  "assets/map/caesarcreek-map-wide.png": "004ee69b5927",
  "eastfork/": "b4f814ef0fd4",
  "assets/eastfork-chart.png": "a13ff7f07bd6",
  "js/lake-map-data-eastfork.js": "49bebe171c8a",
  "assets/map/eastfork-map-tall.png": "f7806350d292",
  "assets/map/eastfork-map-wide.png": "47951587ddcc",
  "cjbrown/": "7bc4f1c7e504",
  "assets/cjbrown-chart.png": "5cd4d674053d",
  "js/lake-map-data-cjbrown.js": "32eb2e1621e3",
  "assets/map/cjbrown-map-tall.png": "2b9d57dfc4a3",
  "assets/map/cjbrown-map-wide.png": "fe941203b2e4",
  "rockyfork/": "64ef9d4417f0",
  "assets/rockyfork-chart.png": "d25868daf005",
  "js/lake-map-data-rockyfork.js": "85a14014ac0b",
  "assets/map/rockyfork-map-tall.png": "5d21225b0589",
  "assets/map/rockyfork-map-wide.png": "0c8f026eb1f3",
  "ladue/": "1e845919cfc4",
  "assets/ladue-chart.png": "25c5f2b830a4",
  "js/lake-map-data-ladue.js": "353c5a8cba6d",
  "assets/map/ladue-map-tall.png": "13e4125e1e35",
  "assets/map/ladue-map-wide.png": "38d5e5827892",
  "paintcreek/": "98a02c913d2e",
  "assets/paintcreek-chart.png": "5ff440009e16",
  "js/lake-map-data-paintcreek.js": "e465e889acf6",
  "assets/map/paintcreek-map-tall.png": "c8e40efa53d4",
  "assets/map/paintcreek-map-wide.png": "441b1eaa4e1d",
  "portagelakes/": "c484fb5a8c13",
  "assets/portagelakes-chart.png": "30a8f8f2ef6a",
  "js/lake-map-data-portagelakes.js": "37c02c308b61",
  "assets/map/portagelakes-map-tall.png": "3cb868942cf0",
  "assets/map/portagelakes-map-wide.png": "62d1be84e5dc",
  "mogadore/": "5b9d815c31f3",
  "assets/mogadore-chart.png": "d3af6b763190",
  "js/lake-map-data-mogadore.js": "6bdb33101d54",
  "assets/map/mogadore-map-tall.png": "7ce4ba731042",
  "assets/map/mogadore-map-wide.png": "557a8dad255a",
  "loramie/": "2ef94beaea48",
  "assets/loramie-chart.png": "228a1f546d2f",
  "js/lake-map-data-loramie.js": "111027272086",
  "assets/map/loramie-map-tall.png": "53124225a5c0",
  "assets/map/loramie-map-wide.png": "deb0f997547a",
  "nimisila/": "437ce4a0242a",
  "assets/nimisila-chart.png": "ec73119c7718",
  "js/lake-map-data-nimisila.js": "48b680b5f546",
  "assets/map/nimisila-map-tall.png": "ba1aa383793b",
  "assets/map/nimisila-map-wide.png": "01d63520cf96",
  "cowan/": "99541c5f71be",
  "assets/cowan-chart.png": "9705f25dda90",
  "js/lake-map-data-cowan.js": "3e1241d65969",
  "assets/map/cowan-map-tall.png": "d5f31b62cf19",
  "assets/map/cowan-map-wide.png": "f37e386679d2",
  "acton/": "13d00c823054",
  "assets/acton-chart.png": "cf8d50b7fdf2",
  "js/lake-map-data-acton.js": "29f3e92adbb5",
  "assets/map/acton-map-tall.png": "bc35e309faab",
  "assets/map/acton-map-wide.png": "d1c411bc272a",
  "tappan/": "d4b564e40f08",
  "assets/tappan-chart.png": "92ac7e4c0244",
  "js/lake-map-data-tappan.js": "eacf9fee972c",
  "assets/map/tappan-map-tall.png": "7cdb8fee9f87",
  "assets/map/tappan-map-wide.png": "09831e023ccd",
  "piedmont/": "31da6148153b",
  "assets/piedmont-chart.png": "22532c56448f",
  "js/lake-map-data-piedmont.js": "2de172f96659",
  "assets/map/piedmont-map-tall.png": "41d69caa4595",
  "assets/map/piedmont-map-wide.png": "b0c39dae5f65",
  "clendening/": "0150edaafb82",
  "assets/clendening-chart.png": "8dd4bee562e7",
  "js/lake-map-data-clendening.js": "a58b82d8047a",
  "assets/map/clendening-map-tall.png": "4dbccaec5959",
  "assets/map/clendening-map-wide.png": "97b8c906d740",
  "atwood/": "57c72f18af1b",
  "assets/atwood-chart.png": "bd3b66838ed0",
  "js/lake-map-data-atwood.js": "c146d972779b",
  "assets/map/atwood-map-tall.png": "9dd21ad90ce3",
  "assets/map/atwood-map-wide.png": "3e10dc51356a",
  "charlesmill/": "63b08532e92a",
  "assets/charlesmill-chart.png": "768dbb404e8b",
  "js/lake-map-data-charlesmill.js": "8987eb7a258d",
  "assets/map/charlesmill-map-tall.png": "bf9ebbfcfa1a",
  "assets/map/charlesmill-map-wide.png": "68cf0cfd22f2",
  "pleasanthill/": "5eef1824cc5d",
  "assets/pleasanthill-chart.png": "28092b8e4ce5",
  "js/lake-map-data-pleasanthill.js": "3d4cae447b95",
  "assets/map/pleasanthill-map-tall.png": "0d1e720854ce",
  "assets/map/pleasanthill-map-wide.png": "9a55abbdc0e4",
  "beachcity/": "49a69cb1d7b4",
  "assets/beachcity-chart.png": "7116c969b477",
  "js/lake-map-data-beachcity.js": "dcdc5f0e2ae7",
  "assets/map/beachcity-map-tall.png": "e424f61d133c",
  "assets/map/beachcity-map-wide.png": "b146b52abe4a",
  "wingfoot/": "28fbc706670f",
  "assets/wingfoot-chart.png": "2b8e6ff1268a",
  "js/lake-map-data-wingfoot.js": "bb87f0d9acf3",
  "assets/map/wingfoot-map-tall.png": "c1ce380c5bba",
  "assets/map/wingfoot-map-wide.png": "10a8a2a71e8f",
  "eastbranch/": "b0dcddf928cd",
  "assets/eastbranch-chart.png": "e1643a053f6a",
  "js/lake-map-data-eastbranch.js": "df766c35979a",
  "assets/map/eastbranch-map-tall.png": "1be479b72836",
  "assets/map/eastbranch-map-wide.png": "32a67f51a58d",
  "guilford/": "d34a0de92294",
  "assets/guilford-chart.png": "0b2f53702f0a",
  "js/lake-map-data-guilford.js": "f2da1e4107cc",
  "assets/map/guilford-map-tall.png": "e3f8882c6aa5",
  "assets/map/guilford-map-wide.png": "9734ecd641e1",
  "highlandtown/": "7629be9784ea",
  "assets/highlandtown-chart.png": "484eac6a47f9",
  "js/lake-map-data-highlandtown.js": "4858b3b3da3d",
  "assets/map/highlandtown-map-tall.png": "be58591f52cf",
  "assets/map/highlandtown-map-wide.png": "c8eebeace78b",
  "punderson/": "c4714d0c3565",
  "assets/punderson-chart.png": "2d4546432478",
  "js/lake-map-data-punderson.js": "e54be8c559ce",
  "assets/map/punderson-map-tall.png": "bb10daaeeecf",
  "assets/map/punderson-map-wide.png": "6937a26a8398",
  "wellington/": "21fc6aeb6b8b",
  "assets/wellington-chart.png": "16ed1eac23b1",
  "js/lake-map-data-wellington.js": "396abb27c597",
  "assets/map/wellington-map-tall.png": "3718dfd9adb2",
  "assets/map/wellington-map-wide.png": "a0fbcd0c598d"
};
// END REVISIONS

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

// ---------------------------------------------------------------- precache with content hashes

// the precache key carries the file's hash, so two deploys' copies never collide
function revKey(path) { return new URL(path, SCOPE).href + "?__nbrev=" + (REVISIONS[path] || VERSION); }

function isHtmlPath(path) { return path === "./" || /\/$/.test(path) || /\.html$/i.test(path); }

// the same hash tools/sw-precache.py writes: sha256 of the bytes, HTML with its ?v= stamps blanked, first 12 hex
function hashOf(path, res) {
  if (!self.crypto || !crypto.subtle) return Promise.resolve(null);
  return res.arrayBuffer().then(function (buf) {
    if (isHtmlPath(path)) {
      var text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf);
      buf = new TextEncoder().encode(text.replace(/\?v=[^"'<>&#) \t\n\r\f]*/g, "?v="));
    }
    return crypto.subtle.digest("SHA-256", buf);
  }).then(function (d) {
    var h = Array.prototype.map.call(new Uint8Array(d), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    return h.slice(0, 12);
  }).catch(function () { return null; });
}

// before downloading, reuse a copy an older worker already has (the per VERSION caches up to v126), if its hash matches
function fromOldCaches(path, url, want) {
  if (!REVISIONS[path]) return Promise.resolve(null);
  return caches.keys().then(function (keys) {
    var old = keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== PRECACHE_CACHE && !isRuntime(k); });
    var i = 0;
    function next() {
      if (i >= old.length) return null;
      return caches.open(old[i++]).then(function (c) { return c.match(url); }).then(function (hit) {
        if (!hit) return next();
        return hashOf(path, hit.clone()).then(function (h) { return h === want ? hit : next(); });
      });
    }
    return next();
  }).catch(function () { return null; });
}

function download(path, url) {
  var want = REVISIONS[path];
  return fetch(new Request(url, { cache: "no-cache", credentials: "same-origin" })).then(function (res) {
    if (!res.ok) throw new Error(path + " " + res.status);
    if (!want) return res;
    return hashOf(path, res.clone()).then(function (h) {
      if (h === want || h === null) return res;
      // a cache between here and the server still had the last deploy's copy: ask past it once, then keep what comes
      return fetch(new Request(url + (url.indexOf("?") < 0 ? "?" : "&") + "nbrev=" + want, { cache: "reload", credentials: "same-origin" }))
        .then(function (r2) { return r2.ok ? r2 : res; }, function () { return res; });
    });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(PRECACHE_CACHE).then(function (cache) {
      return Promise.all(PRECACHE.map(function (path) {
        var key = revKey(path), url = new URL(path, SCOPE).href;
        return cache.match(key).then(function (have) {
          if (have) return;                                       // unchanged since an earlier worker saved it
          return fromOldCaches(path, url, REVISIONS[path]).then(function (old) {
            return old || download(path, url);
          }).then(function (res) {
            return clean(res).then(function (c) { return cache.put(key, c); });
          });
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

function isRuntime(name) { return name === RUNTIME.pages || name === RUNTIME.data || name === RUNTIME.assets; }

self.addEventListener("activate", function (event) {
  var wanted = {};
  PRECACHE.forEach(function (p) { wanted[revKey(p)] = true; });
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(PREFIX) === 0 && k !== PRECACHE_CACHE && !isRuntime(k)) return caches.delete(k);
      }));
    }).then(function () {
      return caches.open(PRECACHE_CACHE).then(function (cache) {
        return cache.keys().then(function (reqs) {
          return Promise.all(reqs.map(function (r) { if (!wanted[r.url]) return cache.delete(r); }));
        });
      });
    }).then(function () { return self.clients.claim(); })
  );
});

// ---------------------------------------------------------------- lookups

// the forms one page can be asked for: hoover/, hoover/index.html, /water and water.html
function variants(href) {
  var tries = [href];
  if (/\/$/.test(href)) tries.push(href + "index.html");
  else if (/\/index\.html$/.test(href)) tries.push(href.replace(/index\.html$/, ""));
  else if (/\.html$/.test(href)) tries.push(href.replace(/\.html$/, ""));
  else if (!/\.[a-z0-9]+$/i.test(href)) { tries.push(href + ".html"); tries.push(href + "/"); }
  return tries;
}

function precachePath(url) {
  var tries = variants(keyFor(url));
  for (var i = 0; i < tries.length; i++) {
    if (tries[i].indexOf(SCOPE) !== 0) continue;
    var p = tries[i].slice(SCOPE.length) || "./";
    if (Object.prototype.hasOwnProperty.call(REVISIONS, p) || PRECACHE.indexOf(p) !== -1) return p;
  }
  return null;
}

function fromPrecache(url) {
  var p = precachePath(url);
  if (!p) return Promise.resolve(undefined);
  return caches.open(PRECACHE_CACHE).then(function (c) { return c.match(revKey(p)); });
}

function fromRuntime(name, url) {
  var tries = variants(keyFor(url));
  return caches.open(name).then(function (cache) {
    var i = 0;
    function next() {
      if (i >= tries.length) return undefined;
      return cache.match(tries[i++]).then(function (r) { return r || next(); });
    }
    return next();
  });
}

// saved copy: data prefers the newest runtime copy; pages, CSS and JS prefer the precache (same deploy as the shell)
function saved(kind, url) {
  if (kind === "data") return fromRuntime(RUNTIME.data, url).then(function (r) { return r || fromPrecache(url); });
  return fromPrecache(url).then(function (r) { return r || fromRuntime(RUNTIME[kind], url); });
}

// keep each runtime cache to its newest LIMITS entries (put appends, so the oldest come first)
function trim(name, max) {
  return caches.open(name).then(function (cache) {
    return cache.keys().then(function (keys) {
      if (keys.length <= max) return;
      return Promise.all(keys.slice(0, keys.length - max).map(function (k) { return cache.delete(k); }));
    });
  });
}

function remember(kind, url, res) {
  var name = RUNTIME[kind], key = keyFor(url);
  return clean(res).then(function (c) {
    return caches.open(name).then(function (cache) {
      return cache.delete(key).then(function () { return cache.put(key, c); });
    });
  }).then(function () { return trim(name, LIMITS[kind]); }).catch(function () {});
}

function offlinePage() {
  return fromPrecache(new URL("offline.html", SCOPE)).then(function (res) {
    if (!res) return Response.error();
    // links in offline.html are written from the site root; a <base> keeps them right from any folder
    return res.text().then(function (html) {
      return new Response(html.replace("<head>", '<head><base href="' + SCOPE + '">'), {
        status: 200, headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    });
  });
}

// ---------------------------------------------------------------- strategies

// kind: "pages", "data" or "assets" (CSS and JS). A precached page, script or style is not saved again at runtime
// (its precache copy matches the shell); data is always saved, so the log and tournaments offline are the newest seen.
function networkFirst(event, url, kind) {
  var network = fetch(event.request).then(function (res) {
    if (res.ok && res.type === "basic" && (kind === "data" || !precachePath(url))) {
      event.waitUntil(remember(kind, url, res.clone()));
    }
    return res;
  });
  var timeout = new Promise(function (resolve) {
    setTimeout(function () { resolve(saved(kind, url)); }, NETWORK_TIMEOUT);
  });
  return Promise.race([
    network,
    timeout.then(function (hit) { return hit || network; })   // slow signal: use the saved copy if there is one
  ]).catch(function () {
    return saved(kind, url).then(function (hit) { return hit || (kind === "pages" ? offlinePage() : Response.error()); });
  });
}

function staleWhileRevalidate(event, url) {
  return fromPrecache(url).then(function (pre) {
    if (pre) return pre;                                      // precached art changes only with its hash
    return fromRuntime(RUNTIME.assets, url).then(function (hit) {
      var fresh = fetch(event.request).then(function (res) {
        if (res.ok && res.type === "basic") return remember("assets", url, res.clone()).then(function () { return res; });
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
  if (url.pathname.endsWith("/sw.js") || url.pathname === "/sw.js") return;
  var accept = req.headers.get("Accept") || "";
  if (req.mode === "navigate" || accept.indexOf("text/html") !== -1) {
    event.respondWith(networkFirst(event, url, "pages"));
    return;
  }
  if (rel(url).indexOf("data/") === 0) {                // data feeds: freshest first
    event.respondWith(networkFirst(event, url, "data"));
    return;
  }
  if (/\.(css|js)$/i.test(url.pathname)) {               // styles and scripts: always the same deploy as the page
    event.respondWith(networkFirst(event, url, "assets"));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, url));
});
