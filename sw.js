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
 *  · CSS and JS by deploy (v135): every page asks for them with ?v=<its deploy>. This deploy's come from the
 *    precache; a deploy a saved page still needs, from that deploy's kept copies; a newer deploy, from the network
 *    only. Saved pages carry their deploy and are only served with their own deploy's files, so a page never mixes
 *    two deploys, slow signal or offline. (Up to v11 these were cache first with no deploy check, which showed the
 *    multi-lake picker unstyled after a deploy; v12 to v134 were network first with a 4 second fallback, which
 *    could still pair a slow page or a slow styles.css with the other deploy.)
 *  · Fonts and images: precached ones straight from the precache (they change only with their hash). The rest
 *    are cache first in PREFIX + "assets" (newest 200, which also holds the lake only scripts): a request with
 *    ?v=<content hash> is served from that cache with no revalidate; an unversioned one is stale while revalidate.
 *    tools/stamp-assets.py writes the content hash on static font and image URLs, so a later long HTTP cache stays
 *    safe and a changed file gets a new URL.
 *  · Whisperwood is never touched: nothing under whisperwood/ (or whisperwood.html) is cached or intercepted.
 *  · Cross origin requests (NWS, USGS, links out) pass straight through. The page itself keeps the last good
 *    readings in localStorage and labels them "Offline. Last updated ..." (js/refresh.js, NightBiteOffline).
 *  · Activate deletes every other cache with this PREFIX (the old one per VERSION caches included) and precache
 *    entries no longer listed. Other sites on the same origin (other github.io projects) are left alone.
 *
 * Kill switch: see SERVICE-WORKER.md.
 */
var PREFIX = "nb-live-";
var VERSION = "v49-2026-11-20";
var SCOPE = new URL("./", self.location).href;
var NETWORK_TIMEOUT = 4000;
var PRECACHE_CACHE = PREFIX + "precache";
var RUNTIME = { pages: PREFIX + "pages", data: PREFIX + "data", assets: PREFIX + "assets" };
// one small manifest per deploy (its CSS and JS hashes), so a page saved under one deploy keeps that deploy's styles
// and scripts (see "Deploys never mix" in SERVICE-WORKER.md)
var DEPLOYS_CACHE = PREFIX + "deploys";
var DEPLOY_HEADER = "X-NB-Deploy";
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
  "js/lakes-boot.js",
  "js/log.js",
  "js/mode-toggle.js",
  "js/nav.js",
  "js/clean-url.js",
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
  "js/night-access.js",
  "js/your-water.js",
  "js/local-notes.js",
  "js/docks.js",
  "data/quick-facts.json",
  "data/bait-shops.json",
  "data/community-log.json",
  "data/tournaments.json",
  "assets/fonts/night-bite-pixel-bold.woff2",
  "assets/fonts/night-bite-pixel-regular.woff2",
  "assets/fonts/pixelify-sans-latin.woff2",
  "assets/fonts/pixelify-sans-latin-ext.woff2",
  "assets/fonts/source-serif-4-italic-latin.woff2",
  "assets/fonts/source-serif-4-italic-latin-ext.woff2",
  "assets/fonts/source-serif-4-latin.woff2",
  "assets/fonts/source-serif-4-latin-ext.woff2",
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
  "assets/tiles/kiser.png",
  "assets/tiles/hargus.png",
  "assets/tiles/stonelick.png",
  "assets/tiles/grant.png",
  "assets/tiles/lakewhite.png",
  "assets/tiles/lakerupert.png",
  "assets/tiles/jackson.png",
  "assets/tiles/wolfrun.png",
  "assets/tiles/tycoon.png",
  "assets/tiles/lakehope.png",
  "assets/tiles/findlayreservoirs.png",
  "assets/tiles/bresler.png",
  "assets/tiles/fergusonmetzger.png",
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
  "js/biting/hoover.js",
  "assets/map/hoover-map-tall.png",
  "assets/map/hoover-map-wide.png",
  "alum/",
  "assets/alum-chart.png",
  "js/lake-map-data-alum.js",
  "js/biting/alum.js",
  "assets/map/alum-map-tall.png",
  "assets/map/alum-map-wide.png",
  "buckeye/",
  "assets/buckeye-chart.png",
  "js/lake-map-data-buckeye.js",
  "js/biting/buckeye.js",
  "assets/map/buckeye-map-tall.png",
  "assets/map/buckeye-map-wide.png",
  "oshaughnessy/",
  "assets/oshaughnessy-chart.png",
  "js/lake-map-data-oshaughnessy.js",
  "js/biting/oshaughnessy.js",
  "assets/map/oshaughnessy-map-tall.png",
  "assets/map/oshaughnessy-map-wide.png",
  "griggs/",
  "assets/griggs-chart.png",
  "js/lake-map-data-griggs.js",
  "js/biting/griggs.js",
  "assets/map/griggs-map-tall.png",
  "assets/map/griggs-map-wide.png",
  "indian/",
  "assets/indian-chart.png",
  "js/lake-map-data-indian.js",
  "js/biting/indian.js",
  "assets/map/indian-map-tall.png",
  "assets/map/indian-map-wide.png",
  "delaware/",
  "assets/delaware-chart.png",
  "js/lake-map-data-delaware.js",
  "js/biting/delaware.js",
  "assets/map/delaware-map-tall.png",
  "assets/map/delaware-map-wide.png",
  "deercreek/",
  "assets/deercreek-chart.png",
  "js/lake-map-data-deercreek.js",
  "js/biting/deercreek.js",
  "assets/map/deercreek-map-tall.png",
  "assets/map/deercreek-map-wide.png",
  "madison/",
  "assets/madison-chart.png",
  "js/lake-map-data-madison.js",
  "js/biting/madison.js",
  "assets/map/madison-map-tall.png",
  "assets/map/madison-map-wide.png",
  "knox/",
  "assets/knox-chart.png",
  "js/lake-map-data-knox.js",
  "js/biting/knox.js",
  "assets/map/knox-map-tall.png",
  "assets/map/knox-map-wide.png",
  "clearfork/",
  "assets/clearfork-chart.png",
  "js/lake-map-data-clearfork.js",
  "js/biting/clearfork.js",
  "assets/map/clearfork-map-tall.png",
  "assets/map/clearfork-map-wide.png",
  "seneca/",
  "assets/seneca-chart.png",
  "js/lake-map-data-seneca.js",
  "js/biting/seneca.js",
  "assets/map/seneca-map-tall.png",
  "assets/map/seneca-map-wide.png",
  "dillon/",
  "assets/dillon-chart.png",
  "js/lake-map-data-dillon.js",
  "js/biting/dillon.js",
  "assets/map/dillon-map-tall.png",
  "assets/map/dillon-map-wide.png",
  "logan/",
  "assets/logan-chart.png",
  "js/lake-map-data-logan.js",
  "js/biting/logan.js",
  "assets/map/logan-map-tall.png",
  "assets/map/logan-map-wide.png",
  "saltfork/",
  "assets/saltfork-chart.png",
  "js/lake-map-data-saltfork.js",
  "js/biting/saltfork.js",
  "assets/map/saltfork-map-tall.png",
  "assets/map/saltfork-map-wide.png",
  "burroak/",
  "assets/burroak-chart.png",
  "js/lake-map-data-burroak.js",
  "js/biting/burroak.js",
  "assets/map/burroak-map-tall.png",
  "assets/map/burroak-map-wide.png",
  "dow/",
  "assets/dow-chart.png",
  "js/lake-map-data-dow.js",
  "js/biting/dow.js",
  "assets/map/dow-map-tall.png",
  "assets/map/dow-map-wide.png",
  "mosquito/",
  "assets/mosquito-chart.png",
  "js/lake-map-data-mosquito.js",
  "js/biting/mosquito.js",
  "assets/map/mosquito-map-tall.png",
  "assets/map/mosquito-map-wide.png",
  "berlin/",
  "assets/berlin-chart.png",
  "js/lake-map-data-berlin.js",
  "js/biting/berlin.js",
  "assets/map/berlin-map-tall.png",
  "assets/map/berlin-map-wide.png",
  "westbranch/",
  "assets/westbranch-chart.png",
  "js/lake-map-data-westbranch.js",
  "js/biting/westbranch.js",
  "assets/map/westbranch-map-tall.png",
  "assets/map/westbranch-map-wide.png",
  "pymatuning/",
  "assets/pymatuning-chart.png",
  "js/lake-map-data-pymatuning.js",
  "js/biting/pymatuning.js",
  "assets/map/pymatuning-map-tall.png",
  "assets/map/pymatuning-map-wide.png",
  "milton/",
  "assets/milton-chart.png",
  "js/lake-map-data-milton.js",
  "js/biting/milton.js",
  "assets/map/milton-map-tall.png",
  "assets/map/milton-map-wide.png",
  "leesville/",
  "assets/leesville-chart.png",
  "js/lake-map-data-leesville.js",
  "js/biting/leesville.js",
  "assets/map/leesville-map-tall.png",
  "assets/map/leesville-map-wide.png",
  "grandlakestmarys/",
  "assets/grandlakestmarys-chart.png",
  "js/lake-map-data-grandlakestmarys.js",
  "js/biting/grandlakestmarys.js",
  "assets/map/grandlakestmarys-map-tall.png",
  "assets/map/grandlakestmarys-map-wide.png",
  "caesarcreek/",
  "assets/caesarcreek-chart.png",
  "js/lake-map-data-caesarcreek.js",
  "js/biting/caesarcreek.js",
  "assets/map/caesarcreek-map-tall.png",
  "assets/map/caesarcreek-map-wide.png",
  "eastfork/",
  "assets/eastfork-chart.png",
  "js/lake-map-data-eastfork.js",
  "js/biting/eastfork.js",
  "assets/map/eastfork-map-tall.png",
  "assets/map/eastfork-map-wide.png",
  "cjbrown/",
  "assets/cjbrown-chart.png",
  "js/lake-map-data-cjbrown.js",
  "js/biting/cjbrown.js",
  "assets/map/cjbrown-map-tall.png",
  "assets/map/cjbrown-map-wide.png",
  "rockyfork/",
  "assets/rockyfork-chart.png",
  "js/lake-map-data-rockyfork.js",
  "js/biting/rockyfork.js",
  "assets/map/rockyfork-map-tall.png",
  "assets/map/rockyfork-map-wide.png",
  "ladue/",
  "assets/ladue-chart.png",
  "js/lake-map-data-ladue.js",
  "js/biting/ladue.js",
  "assets/map/ladue-map-tall.png",
  "assets/map/ladue-map-wide.png",
  "paintcreek/",
  "assets/paintcreek-chart.png",
  "js/lake-map-data-paintcreek.js",
  "js/biting/paintcreek.js",
  "assets/map/paintcreek-map-tall.png",
  "assets/map/paintcreek-map-wide.png",
  "portagelakes/",
  "assets/portagelakes-chart.png",
  "js/lake-map-data-portagelakes.js",
  "js/biting/portagelakes.js",
  "assets/map/portagelakes-map-tall.png",
  "assets/map/portagelakes-map-wide.png",
  "mogadore/",
  "assets/mogadore-chart.png",
  "js/lake-map-data-mogadore.js",
  "js/biting/mogadore.js",
  "assets/map/mogadore-map-tall.png",
  "assets/map/mogadore-map-wide.png",
  "loramie/",
  "assets/loramie-chart.png",
  "js/lake-map-data-loramie.js",
  "js/biting/loramie.js",
  "assets/map/loramie-map-tall.png",
  "assets/map/loramie-map-wide.png",
  "nimisila/",
  "assets/nimisila-chart.png",
  "js/lake-map-data-nimisila.js",
  "js/biting/nimisila.js",
  "assets/map/nimisila-map-tall.png",
  "assets/map/nimisila-map-wide.png",
  "cowan/",
  "assets/cowan-chart.png",
  "js/lake-map-data-cowan.js",
  "js/biting/cowan.js",
  "assets/map/cowan-map-tall.png",
  "assets/map/cowan-map-wide.png",
  "acton/",
  "assets/acton-chart.png",
  "js/lake-map-data-acton.js",
  "js/biting/acton.js",
  "assets/map/acton-map-tall.png",
  "assets/map/acton-map-wide.png",
  "tappan/",
  "assets/tappan-chart.png",
  "js/lake-map-data-tappan.js",
  "js/biting/tappan.js",
  "assets/map/tappan-map-tall.png",
  "assets/map/tappan-map-wide.png",
  "piedmont/",
  "assets/piedmont-chart.png",
  "js/lake-map-data-piedmont.js",
  "js/biting/piedmont.js",
  "assets/map/piedmont-map-tall.png",
  "assets/map/piedmont-map-wide.png",
  "clendening/",
  "assets/clendening-chart.png",
  "js/lake-map-data-clendening.js",
  "js/biting/clendening.js",
  "assets/map/clendening-map-tall.png",
  "assets/map/clendening-map-wide.png",
  "atwood/",
  "assets/atwood-chart.png",
  "js/lake-map-data-atwood.js",
  "js/biting/atwood.js",
  "assets/map/atwood-map-tall.png",
  "assets/map/atwood-map-wide.png",
  "charlesmill/",
  "assets/charlesmill-chart.png",
  "js/lake-map-data-charlesmill.js",
  "js/biting/charlesmill.js",
  "assets/map/charlesmill-map-tall.png",
  "assets/map/charlesmill-map-wide.png",
  "pleasanthill/",
  "assets/pleasanthill-chart.png",
  "js/lake-map-data-pleasanthill.js",
  "js/biting/pleasanthill.js",
  "assets/map/pleasanthill-map-tall.png",
  "assets/map/pleasanthill-map-wide.png",
  "beachcity/",
  "assets/beachcity-chart.png",
  "js/lake-map-data-beachcity.js",
  "js/biting/beachcity.js",
  "assets/map/beachcity-map-tall.png",
  "assets/map/beachcity-map-wide.png",
  "wingfoot/",
  "assets/wingfoot-chart.png",
  "js/lake-map-data-wingfoot.js",
  "js/biting/wingfoot.js",
  "assets/map/wingfoot-map-tall.png",
  "assets/map/wingfoot-map-wide.png",
  "eastbranch/",
  "assets/eastbranch-chart.png",
  "js/lake-map-data-eastbranch.js",
  "js/biting/eastbranch.js",
  "assets/map/eastbranch-map-tall.png",
  "assets/map/eastbranch-map-wide.png",
  "guilford/",
  "assets/guilford-chart.png",
  "js/lake-map-data-guilford.js",
  "js/biting/guilford.js",
  "assets/map/guilford-map-tall.png",
  "assets/map/guilford-map-wide.png",
  "highlandtown/",
  "assets/highlandtown-chart.png",
  "js/lake-map-data-highlandtown.js",
  "js/biting/highlandtown.js",
  "assets/map/highlandtown-map-tall.png",
  "assets/map/highlandtown-map-wide.png",
  "punderson/",
  "assets/punderson-chart.png",
  "js/lake-map-data-punderson.js",
  "js/biting/punderson.js",
  "assets/map/punderson-map-tall.png",
  "assets/map/punderson-map-wide.png",
  "wellington/",
  "assets/wellington-chart.png",
  "js/lake-map-data-wellington.js",
  "js/biting/wellington.js",
  "assets/map/wellington-map-tall.png",
  "assets/map/wellington-map-wide.png",
  "kiser/",
  "assets/kiser-chart.png",
  "js/lake-map-data-kiser.js",
  "js/biting/kiser.js",
  "assets/map/kiser-map-tall.png",
  "assets/map/kiser-map-wide.png",
  "hargus/",
  "assets/hargus-chart.png",
  "js/lake-map-data-hargus.js",
  "js/biting/hargus.js",
  "assets/map/hargus-map-tall.png",
  "assets/map/hargus-map-wide.png",
  "stonelick/",
  "assets/stonelick-chart.png",
  "js/lake-map-data-stonelick.js",
  "js/biting/stonelick.js",
  "assets/map/stonelick-map-tall.png",
  "assets/map/stonelick-map-wide.png",
  "grant/",
  "assets/grant-chart.png",
  "js/lake-map-data-grant.js",
  "js/biting/grant.js",
  "assets/map/grant-map-tall.png",
  "assets/map/grant-map-wide.png",
  "lakewhite/",
  "assets/lakewhite-chart.png",
  "js/lake-map-data-lakewhite.js",
  "js/biting/lakewhite.js",
  "assets/map/lakewhite-map-tall.png",
  "assets/map/lakewhite-map-wide.png",
  "lakerupert/",
  "assets/lakerupert-chart.png",
  "js/lake-map-data-lakerupert.js",
  "js/biting/lakerupert.js",
  "assets/map/lakerupert-map-tall.png",
  "assets/map/lakerupert-map-wide.png",
  "jackson/",
  "assets/jackson-chart.png",
  "js/lake-map-data-jackson.js",
  "js/biting/jackson.js",
  "assets/map/jackson-map-tall.png",
  "assets/map/jackson-map-wide.png",
  "wolfrun/",
  "assets/wolfrun-chart.png",
  "js/lake-map-data-wolfrun.js",
  "js/biting/wolfrun.js",
  "assets/map/wolfrun-map-tall.png",
  "assets/map/wolfrun-map-wide.png",
  "tycoon/",
  "assets/tycoon-chart.png",
  "js/lake-map-data-tycoon.js",
  "js/biting/tycoon.js",
  "assets/map/tycoon-map-tall.png",
  "assets/map/tycoon-map-wide.png",
  "lakehope/",
  "assets/lakehope-chart.png",
  "js/lake-map-data-lakehope.js",
  "js/biting/lakehope.js",
  "assets/map/lakehope-map-tall.png",
  "assets/map/lakehope-map-wide.png",
  "findlayreservoirs/",
  "assets/findlayreservoirs-chart.png",
  "js/lake-map-data-findlayreservoirs.js",
  "js/biting/findlayreservoirs.js",
  "assets/map/findlayreservoirs-map-tall.png",
  "assets/map/findlayreservoirs-map-wide.png",
  "bresler/",
  "assets/bresler-chart.png",
  "js/lake-map-data-bresler.js",
  "js/biting/bresler.js",
  "assets/map/bresler-map-tall.png",
  "assets/map/bresler-map-wide.png",
  "fergusonmetzger/",
  "assets/fergusonmetzger-chart.png",
  "js/lake-map-data-fergusonmetzger.js",
  "js/biting/fergusonmetzger.js",
  "assets/map/fergusonmetzger-map-tall.png",
  "assets/map/fergusonmetzger-map-wide.png",
  // END LAKE PRECACHE
];

// tools/sw-precache.py writes this block (stamp-version.py and promote.py run it). Don't edit it by hand.
// BEGIN REVISIONS
var REVISIONS = {
  "./": "231968a8a43d",
  "offline.html": "8fc28143fcae",
  "site.webmanifest": "a7e2879bb55a",
  "favicon.svg": "a4203bb6ec2d",
  "favicon.ico": "ec8fafebba48",
  "apple-touch-icon.png": "ae1b52f0a95b",
  "css/styles.css": "3328d7a28751",
  "js/alerts.js": "b41431d3558c",
  "js/astro.js": "a3ec0945f030",
  "js/night-rules.js": "c14111456232",
  "js/i18n.js": "29c05b8d2452",
  "js/bait-nearby.js": "b75e87af32d4",
  "js/biting.js": "2035244affef",
  "js/community-log.js": "62217f38aaa5",
  "js/conditions.js": "f471b830969c",
  "js/get-app.js": "8345fce8e5c8",
  "js/glance.js": "955d3169a3c9",
  "js/home-log.js": "b0cf7771714e",
  "js/hoover-map-data.js": "34a54a22f7ab",
  "js/hoover-map.js": "f01d585f0d9d",
  "js/ice-species.js": "4f21ddf4e05e",
  "js/install-tip.js": "3ca2d78397d1",
  "js/lake-picker.js": "b89008e0dbeb",
  "js/water-picker.js": "b48ce9fb2f0d",
  "js/lake-snapshot.js": "79e1111b8d18",
  "js/lakes.js": "eb1a1993ce27",
  "js/lakes-boot.js": "dec578da1165",
  "js/log.js": "966237501387",
  "js/mode-toggle.js": "842ee5852866",
  "js/nav.js": "85c14199105b",
  "js/clean-url.js": "7617fbcc7fd0",
  "js/a11y-boot.js": "dce50da82642",
  "js/a11y.js": "b7ac838a471a",
  "js/updates-draft.js": "954b481592ef",
  "js/pack-list.js": "f9a5e5d83c93",
  "js/pool-readout.js": "9ce9ff4ef6cb",
  "js/pool-trend.js": "a024c0a2ed48",
  "js/refresh.js": "5b0ca98fef84",
  "js/species-filter.js": "454f000c5ba6",
  "js/species-lake.js": "e58c74799c1c",
  "js/sticky-nav.js": "320454e88b43",
  "js/sw-update.js": "626f1e2076eb",
  "js/tonight-tools.js": "a7a6cf64125b",
  "js/tournaments.js": "f3ea2dbe151b",
  "js/usgs.js": "c3f519eee62d",
  "js/water.js": "23040b9980b5",
  "js/visits.js": "e0f046529c59",
  "js/scrollspy.js": "1b056c72b92f",
  "js/fold-anchors.js": "121638322787",
  "js/night-access.js": "1722e157a2c9",
  "js/your-water.js": "da7865eb55a2",
  "js/local-notes.js": "d68fc177c5f1",
  "js/docks.js": "a1a7f6febfb1",
  "data/quick-facts.json": "ad3082eedd5a",
  "data/bait-shops.json": "2a13412f3883",
  "data/community-log.json": "11d7942a8e63",
  "data/tournaments.json": "d843f370ad46",
  "assets/fonts/night-bite-pixel-bold.woff2": "3e683f59654f",
  "assets/fonts/night-bite-pixel-regular.woff2": "1458fee0d42d",
  "assets/fonts/pixelify-sans-latin.woff2": "9c367c6a9e26",
  "assets/fonts/pixelify-sans-latin-ext.woff2": "0afa0101fd8c",
  "assets/fonts/source-serif-4-italic-latin.woff2": "f97463f721a8",
  "assets/fonts/source-serif-4-italic-latin-ext.woff2": "a98065d414c1",
  "assets/fonts/source-serif-4-latin.woff2": "88c3215f1779",
  "assets/fonts/source-serif-4-latin-ext.woff2": "0eca99f28f44",
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
  "assets/tiles/kiser.png": "5a12ed596ccc",
  "assets/tiles/hargus.png": "b0b0c3ba3e55",
  "assets/tiles/stonelick.png": "1ee61c760b42",
  "assets/tiles/grant.png": "24cb3bd29fa4",
  "assets/tiles/lakewhite.png": "3c199ba9de86",
  "assets/tiles/lakerupert.png": "cdb60b78a1bd",
  "assets/tiles/jackson.png": "26a6a60f88d5",
  "assets/tiles/wolfrun.png": "ff554c4193d2",
  "assets/tiles/tycoon.png": "77e95a1ca5ea",
  "assets/tiles/lakehope.png": "5ae80c5d5366",
  "assets/tiles/findlayreservoirs.png": "23f2a22d3407",
  "assets/tiles/bresler.png": "ddf366d52ce8",
  "assets/tiles/fergusonmetzger.png": "f115d0397b26",
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
  "hoover/": "77dcb45e44b3",
  "assets/hoover-chart.png": "fe743cba0221",
  "js/biting/hoover.js": "7205a1f4077d",
  "assets/map/hoover-map-tall.png": "8ccedbbfb7ab",
  "assets/map/hoover-map-wide.png": "1330bbed1c9a",
  "alum/": "3bba3354668a",
  "assets/alum-chart.png": "c16bd4b47fe9",
  "js/lake-map-data-alum.js": "d3477ac2f959",
  "js/biting/alum.js": "6ade0ece8c7f",
  "assets/map/alum-map-tall.png": "6690ef553cf0",
  "assets/map/alum-map-wide.png": "764c9fd37d01",
  "buckeye/": "1a42f954d392",
  "assets/buckeye-chart.png": "bfe2966578a3",
  "js/lake-map-data-buckeye.js": "7781547d9636",
  "js/biting/buckeye.js": "24951d36fadb",
  "assets/map/buckeye-map-tall.png": "64957d8aef76",
  "assets/map/buckeye-map-wide.png": "5025bb2f3a4f",
  "oshaughnessy/": "4a97a3c31d1e",
  "assets/oshaughnessy-chart.png": "3b40fae44c40",
  "js/lake-map-data-oshaughnessy.js": "1901aeeef26e",
  "js/biting/oshaughnessy.js": "2d70498b6974",
  "assets/map/oshaughnessy-map-tall.png": "17fa0ebfc502",
  "assets/map/oshaughnessy-map-wide.png": "81aa41f82d1f",
  "griggs/": "79fc97166573",
  "assets/griggs-chart.png": "8a264a3b7c7d",
  "js/lake-map-data-griggs.js": "71177e706386",
  "js/biting/griggs.js": "c6c3d8f3be07",
  "assets/map/griggs-map-tall.png": "ce164fce175f",
  "assets/map/griggs-map-wide.png": "a2ea510cefdf",
  "indian/": "e849c97d69fe",
  "assets/indian-chart.png": "84b8f17a1d85",
  "js/lake-map-data-indian.js": "075d512561b5",
  "js/biting/indian.js": "f16ad79a3af2",
  "assets/map/indian-map-tall.png": "2326904e34ad",
  "assets/map/indian-map-wide.png": "f9de608ea45c",
  "delaware/": "07f5e45b1b09",
  "assets/delaware-chart.png": "c998d5020831",
  "js/lake-map-data-delaware.js": "180a09127c3e",
  "js/biting/delaware.js": "828d85d3dcfc",
  "assets/map/delaware-map-tall.png": "cf176edc91f6",
  "assets/map/delaware-map-wide.png": "1a4b178ec53b",
  "deercreek/": "8e986c73c228",
  "assets/deercreek-chart.png": "092a1b944384",
  "js/lake-map-data-deercreek.js": "5195cf735cc8",
  "js/biting/deercreek.js": "54668962b1f1",
  "assets/map/deercreek-map-tall.png": "5654e0f59db7",
  "assets/map/deercreek-map-wide.png": "94741d413ed8",
  "madison/": "0874c153038c",
  "assets/madison-chart.png": "d3766badfbd1",
  "js/lake-map-data-madison.js": "e45825c919e8",
  "js/biting/madison.js": "0eda8fc065eb",
  "assets/map/madison-map-tall.png": "444806e561ae",
  "assets/map/madison-map-wide.png": "95878b3ea30f",
  "knox/": "15eedda5f395",
  "assets/knox-chart.png": "025d6bb15f45",
  "js/lake-map-data-knox.js": "b3ba24373db5",
  "js/biting/knox.js": "9c270393689a",
  "assets/map/knox-map-tall.png": "4fc3e6e27e1e",
  "assets/map/knox-map-wide.png": "979e6ba7ddfb",
  "clearfork/": "1576b1578e32",
  "assets/clearfork-chart.png": "71d6124a936a",
  "js/lake-map-data-clearfork.js": "2c356cae420e",
  "js/biting/clearfork.js": "9eed8ff2ee4f",
  "assets/map/clearfork-map-tall.png": "0bbdf6e67c04",
  "assets/map/clearfork-map-wide.png": "70e32449565e",
  "seneca/": "2bd389969f29",
  "assets/seneca-chart.png": "30b242bf47e0",
  "js/lake-map-data-seneca.js": "d102fc230de7",
  "js/biting/seneca.js": "f3ed073b7387",
  "assets/map/seneca-map-tall.png": "90ccd70ec71d",
  "assets/map/seneca-map-wide.png": "86379360b101",
  "dillon/": "7717927a799c",
  "assets/dillon-chart.png": "5acb4d046c23",
  "js/lake-map-data-dillon.js": "f13ecc14aa94",
  "js/biting/dillon.js": "830399143f6c",
  "assets/map/dillon-map-tall.png": "29d7f7030500",
  "assets/map/dillon-map-wide.png": "c9b315494172",
  "logan/": "4751c7538d0d",
  "assets/logan-chart.png": "f2e49674592a",
  "js/lake-map-data-logan.js": "caf4e1e4d2ca",
  "js/biting/logan.js": "400893480d95",
  "assets/map/logan-map-tall.png": "974c448fa6a8",
  "assets/map/logan-map-wide.png": "4dc4302101c2",
  "saltfork/": "3987e5f0cc54",
  "assets/saltfork-chart.png": "00c70968ea52",
  "js/lake-map-data-saltfork.js": "846534aa0e1f",
  "js/biting/saltfork.js": "d839afaee077",
  "assets/map/saltfork-map-tall.png": "86b0df903f84",
  "assets/map/saltfork-map-wide.png": "fc75e61e3fff",
  "burroak/": "a3ef38c8cfb0",
  "assets/burroak-chart.png": "dfd696e071e0",
  "js/lake-map-data-burroak.js": "23e32c2e9daa",
  "js/biting/burroak.js": "78129464db80",
  "assets/map/burroak-map-tall.png": "e18358a3c235",
  "assets/map/burroak-map-wide.png": "9a456fa305f4",
  "dow/": "91640ce324a8",
  "assets/dow-chart.png": "9dea67521582",
  "js/lake-map-data-dow.js": "d3e09b820606",
  "js/biting/dow.js": "a1f240384980",
  "assets/map/dow-map-tall.png": "c6ee1b4bfdcc",
  "assets/map/dow-map-wide.png": "1282bad36e66",
  "mosquito/": "4a695539b594",
  "assets/mosquito-chart.png": "fbcd2e567bbb",
  "js/lake-map-data-mosquito.js": "9b00b93864fe",
  "js/biting/mosquito.js": "a838e2c7b1ae",
  "assets/map/mosquito-map-tall.png": "0ec97542cfcb",
  "assets/map/mosquito-map-wide.png": "5f9c8adca6e1",
  "berlin/": "a1f2db14efc6",
  "assets/berlin-chart.png": "b830fa015fb7",
  "js/lake-map-data-berlin.js": "5952b8eda982",
  "js/biting/berlin.js": "31162a09a434",
  "assets/map/berlin-map-tall.png": "8bda38969671",
  "assets/map/berlin-map-wide.png": "f06db7bafa09",
  "westbranch/": "5f3e7a330d31",
  "assets/westbranch-chart.png": "882121f583eb",
  "js/lake-map-data-westbranch.js": "e005a7ba637a",
  "js/biting/westbranch.js": "fff129984e87",
  "assets/map/westbranch-map-tall.png": "1e08f8cc8cb5",
  "assets/map/westbranch-map-wide.png": "28227371f1b1",
  "pymatuning/": "4c99992d4c5c",
  "assets/pymatuning-chart.png": "cc48ee19f208",
  "js/lake-map-data-pymatuning.js": "3f016fbb89aa",
  "js/biting/pymatuning.js": "5f2d1dbca390",
  "assets/map/pymatuning-map-tall.png": "c7d15d6af5fb",
  "assets/map/pymatuning-map-wide.png": "6cb0238db655",
  "milton/": "0b29d51ef9f8",
  "assets/milton-chart.png": "86d5f99e27e1",
  "js/lake-map-data-milton.js": "9a99f43c4771",
  "js/biting/milton.js": "79f93a79bb98",
  "assets/map/milton-map-tall.png": "99dad2407b96",
  "assets/map/milton-map-wide.png": "f53f78b14569",
  "leesville/": "24e39ffd63b0",
  "assets/leesville-chart.png": "f9e088059c15",
  "js/lake-map-data-leesville.js": "225dc9ee359a",
  "js/biting/leesville.js": "4438c66a8ff3",
  "assets/map/leesville-map-tall.png": "6c1554562cd4",
  "assets/map/leesville-map-wide.png": "1e7cf0bdfe35",
  "grandlakestmarys/": "93b9012b8f11",
  "assets/grandlakestmarys-chart.png": "b09d980eba98",
  "js/lake-map-data-grandlakestmarys.js": "e7b5fc5a1da7",
  "js/biting/grandlakestmarys.js": "e38f367dc61e",
  "assets/map/grandlakestmarys-map-tall.png": "3a1658e2596a",
  "assets/map/grandlakestmarys-map-wide.png": "8ee5a67cbc3a",
  "caesarcreek/": "0799f0f717a4",
  "assets/caesarcreek-chart.png": "29e57056cc97",
  "js/lake-map-data-caesarcreek.js": "e476e924fc03",
  "js/biting/caesarcreek.js": "b0cb22a7ec8c",
  "assets/map/caesarcreek-map-tall.png": "184424f54ae3",
  "assets/map/caesarcreek-map-wide.png": "004ee69b5927",
  "eastfork/": "98258cefd904",
  "assets/eastfork-chart.png": "a13ff7f07bd6",
  "js/lake-map-data-eastfork.js": "153c7cbe3b69",
  "js/biting/eastfork.js": "425832c7fdb6",
  "assets/map/eastfork-map-tall.png": "f7806350d292",
  "assets/map/eastfork-map-wide.png": "47951587ddcc",
  "cjbrown/": "f4b022c5f851",
  "assets/cjbrown-chart.png": "5cd4d674053d",
  "js/lake-map-data-cjbrown.js": "a0a7548f200f",
  "js/biting/cjbrown.js": "95e29b06dbb3",
  "assets/map/cjbrown-map-tall.png": "2b9d57dfc4a3",
  "assets/map/cjbrown-map-wide.png": "fe941203b2e4",
  "rockyfork/": "5ae60c0b1120",
  "assets/rockyfork-chart.png": "d25868daf005",
  "js/lake-map-data-rockyfork.js": "d400c417ae29",
  "js/biting/rockyfork.js": "fa245187d73d",
  "assets/map/rockyfork-map-tall.png": "5d21225b0589",
  "assets/map/rockyfork-map-wide.png": "0c8f026eb1f3",
  "ladue/": "620e5d5c5c52",
  "assets/ladue-chart.png": "25c5f2b830a4",
  "js/lake-map-data-ladue.js": "8f9dedd8d729",
  "js/biting/ladue.js": "efb1def845a4",
  "assets/map/ladue-map-tall.png": "13e4125e1e35",
  "assets/map/ladue-map-wide.png": "38d5e5827892",
  "paintcreek/": "06955312d250",
  "assets/paintcreek-chart.png": "5ff440009e16",
  "js/lake-map-data-paintcreek.js": "549f08bca087",
  "js/biting/paintcreek.js": "f2468f9c8f40",
  "assets/map/paintcreek-map-tall.png": "c8e40efa53d4",
  "assets/map/paintcreek-map-wide.png": "441b1eaa4e1d",
  "portagelakes/": "09ea2a8a2cf0",
  "assets/portagelakes-chart.png": "30a8f8f2ef6a",
  "js/lake-map-data-portagelakes.js": "e9533cd8d3f1",
  "js/biting/portagelakes.js": "d2e9c58f7364",
  "assets/map/portagelakes-map-tall.png": "3cb868942cf0",
  "assets/map/portagelakes-map-wide.png": "62d1be84e5dc",
  "mogadore/": "d1c39b1ef078",
  "assets/mogadore-chart.png": "d3af6b763190",
  "js/lake-map-data-mogadore.js": "802298d33beb",
  "js/biting/mogadore.js": "9a4bc4112ced",
  "assets/map/mogadore-map-tall.png": "7ce4ba731042",
  "assets/map/mogadore-map-wide.png": "557a8dad255a",
  "loramie/": "84372b58d241",
  "assets/loramie-chart.png": "228a1f546d2f",
  "js/lake-map-data-loramie.js": "9ee9cb89fc7d",
  "js/biting/loramie.js": "ffd4cfa2a91b",
  "assets/map/loramie-map-tall.png": "53124225a5c0",
  "assets/map/loramie-map-wide.png": "deb0f997547a",
  "nimisila/": "a00858784e20",
  "assets/nimisila-chart.png": "ec73119c7718",
  "js/lake-map-data-nimisila.js": "2a57b1d6d12b",
  "js/biting/nimisila.js": "e92f55f47f6d",
  "assets/map/nimisila-map-tall.png": "ba1aa383793b",
  "assets/map/nimisila-map-wide.png": "01d63520cf96",
  "cowan/": "c41b07c7dd23",
  "assets/cowan-chart.png": "9705f25dda90",
  "js/lake-map-data-cowan.js": "4d37ed8ccbd7",
  "js/biting/cowan.js": "eb6b1eb6d023",
  "assets/map/cowan-map-tall.png": "d5f31b62cf19",
  "assets/map/cowan-map-wide.png": "f37e386679d2",
  "acton/": "aa519bbe0baf",
  "assets/acton-chart.png": "cf8d50b7fdf2",
  "js/lake-map-data-acton.js": "c26bd1247b6c",
  "js/biting/acton.js": "f4872d3d5495",
  "assets/map/acton-map-tall.png": "bc35e309faab",
  "assets/map/acton-map-wide.png": "d1c411bc272a",
  "tappan/": "8d7b19178307",
  "assets/tappan-chart.png": "92ac7e4c0244",
  "js/lake-map-data-tappan.js": "ebcb71d388e8",
  "js/biting/tappan.js": "2ef14eaa695f",
  "assets/map/tappan-map-tall.png": "7cdb8fee9f87",
  "assets/map/tappan-map-wide.png": "09831e023ccd",
  "piedmont/": "3a1c25d56e08",
  "assets/piedmont-chart.png": "22532c56448f",
  "js/lake-map-data-piedmont.js": "902a46b07b91",
  "js/biting/piedmont.js": "813a57a3cff0",
  "assets/map/piedmont-map-tall.png": "41d69caa4595",
  "assets/map/piedmont-map-wide.png": "b0c39dae5f65",
  "clendening/": "184e886ac1f9",
  "assets/clendening-chart.png": "8dd4bee562e7",
  "js/lake-map-data-clendening.js": "cdd0038afac5",
  "js/biting/clendening.js": "392dd834db91",
  "assets/map/clendening-map-tall.png": "4dbccaec5959",
  "assets/map/clendening-map-wide.png": "97b8c906d740",
  "atwood/": "49ed043b7b26",
  "assets/atwood-chart.png": "bd3b66838ed0",
  "js/lake-map-data-atwood.js": "3842666b3467",
  "js/biting/atwood.js": "48af2327fb6a",
  "assets/map/atwood-map-tall.png": "9dd21ad90ce3",
  "assets/map/atwood-map-wide.png": "3e10dc51356a",
  "charlesmill/": "dd8a19cb4d5b",
  "assets/charlesmill-chart.png": "768dbb404e8b",
  "js/lake-map-data-charlesmill.js": "2f21d90ded61",
  "js/biting/charlesmill.js": "25e23c54a3da",
  "assets/map/charlesmill-map-tall.png": "bf9ebbfcfa1a",
  "assets/map/charlesmill-map-wide.png": "68cf0cfd22f2",
  "pleasanthill/": "d8362b766f53",
  "assets/pleasanthill-chart.png": "28092b8e4ce5",
  "js/lake-map-data-pleasanthill.js": "7234942bf7cf",
  "js/biting/pleasanthill.js": "8ca32c73242f",
  "assets/map/pleasanthill-map-tall.png": "0d1e720854ce",
  "assets/map/pleasanthill-map-wide.png": "9a55abbdc0e4",
  "beachcity/": "5428aeea73e6",
  "assets/beachcity-chart.png": "7116c969b477",
  "js/lake-map-data-beachcity.js": "57bff953f033",
  "js/biting/beachcity.js": "0af313b0bcde",
  "assets/map/beachcity-map-tall.png": "e424f61d133c",
  "assets/map/beachcity-map-wide.png": "b146b52abe4a",
  "wingfoot/": "ea91d251e5d4",
  "assets/wingfoot-chart.png": "2b8e6ff1268a",
  "js/lake-map-data-wingfoot.js": "b91d99837b5d",
  "js/biting/wingfoot.js": "10388d13a23e",
  "assets/map/wingfoot-map-tall.png": "c1ce380c5bba",
  "assets/map/wingfoot-map-wide.png": "10a8a2a71e8f",
  "eastbranch/": "4fbf2bc645d5",
  "assets/eastbranch-chart.png": "e1643a053f6a",
  "js/lake-map-data-eastbranch.js": "03405143a1ca",
  "js/biting/eastbranch.js": "8a8ff80f9f38",
  "assets/map/eastbranch-map-tall.png": "1be479b72836",
  "assets/map/eastbranch-map-wide.png": "32a67f51a58d",
  "guilford/": "8819a1395e58",
  "assets/guilford-chart.png": "0b2f53702f0a",
  "js/lake-map-data-guilford.js": "89846a9e0364",
  "js/biting/guilford.js": "97e92e31fb56",
  "assets/map/guilford-map-tall.png": "e3f8882c6aa5",
  "assets/map/guilford-map-wide.png": "9734ecd641e1",
  "highlandtown/": "caabdf4bccbd",
  "assets/highlandtown-chart.png": "484eac6a47f9",
  "js/lake-map-data-highlandtown.js": "db3e1564d27f",
  "js/biting/highlandtown.js": "4e4eee5f8b51",
  "assets/map/highlandtown-map-tall.png": "be58591f52cf",
  "assets/map/highlandtown-map-wide.png": "c8eebeace78b",
  "punderson/": "fde829d4437e",
  "assets/punderson-chart.png": "2d4546432478",
  "js/lake-map-data-punderson.js": "9376fc972e56",
  "js/biting/punderson.js": "58177dd08932",
  "assets/map/punderson-map-tall.png": "bb10daaeeecf",
  "assets/map/punderson-map-wide.png": "6937a26a8398",
  "wellington/": "00ef93d85946",
  "assets/wellington-chart.png": "16ed1eac23b1",
  "js/lake-map-data-wellington.js": "3505ca50f1d6",
  "js/biting/wellington.js": "aa5fe79e5d1e",
  "assets/map/wellington-map-tall.png": "3718dfd9adb2",
  "assets/map/wellington-map-wide.png": "a0fbcd0c598d",
  "kiser/": "ed0933fddfc1",
  "assets/kiser-chart.png": "6a8043b072f6",
  "js/lake-map-data-kiser.js": "9f648d0ee1ad",
  "js/biting/kiser.js": "5379f0e7680e",
  "assets/map/kiser-map-tall.png": "522208b9f6e4",
  "assets/map/kiser-map-wide.png": "1e676d9e24aa",
  "hargus/": "d5f7b6dbf2ae",
  "assets/hargus-chart.png": "f7e976a9db8d",
  "js/lake-map-data-hargus.js": "6130458a567f",
  "js/biting/hargus.js": "2a3053706451",
  "assets/map/hargus-map-tall.png": "29d846786107",
  "assets/map/hargus-map-wide.png": "d4bc81fca805",
  "stonelick/": "0422e80d2495",
  "assets/stonelick-chart.png": "6cae87db00da",
  "js/lake-map-data-stonelick.js": "d7b518629b63",
  "js/biting/stonelick.js": "2d6897458667",
  "assets/map/stonelick-map-tall.png": "3d48a79769b8",
  "assets/map/stonelick-map-wide.png": "195d93b5a95c",
  "grant/": "99f2cc71b7f1",
  "assets/grant-chart.png": "d6c119931438",
  "js/lake-map-data-grant.js": "3b2dc8a3ef4e",
  "js/biting/grant.js": "cde49a110fb9",
  "assets/map/grant-map-tall.png": "9eaa7d379111",
  "assets/map/grant-map-wide.png": "110d2eb043b2",
  "lakewhite/": "70f116dac373",
  "assets/lakewhite-chart.png": "d9f70bf0fff7",
  "js/lake-map-data-lakewhite.js": "c4e49b70625d",
  "js/biting/lakewhite.js": "6a13cfdfb656",
  "assets/map/lakewhite-map-tall.png": "76753f37d53b",
  "assets/map/lakewhite-map-wide.png": "4500d8885ea8",
  "lakerupert/": "af9692b10d3b",
  "assets/lakerupert-chart.png": "575bbb9374a3",
  "js/lake-map-data-lakerupert.js": "d3eaf48ab9a6",
  "js/biting/lakerupert.js": "c36264282233",
  "assets/map/lakerupert-map-tall.png": "ccca05a4eeaa",
  "assets/map/lakerupert-map-wide.png": "8005a1bffef8",
  "jackson/": "5224740cf82e",
  "assets/jackson-chart.png": "daf394aebdf6",
  "js/lake-map-data-jackson.js": "7db24cddcc01",
  "js/biting/jackson.js": "eebde2fc62c2",
  "assets/map/jackson-map-tall.png": "521692247685",
  "assets/map/jackson-map-wide.png": "ce8819d51e44",
  "wolfrun/": "58bac550e0bd",
  "assets/wolfrun-chart.png": "93068d6a60fc",
  "js/lake-map-data-wolfrun.js": "26664bab9c14",
  "js/biting/wolfrun.js": "a622222f5cc4",
  "assets/map/wolfrun-map-tall.png": "68acf311e6aa",
  "assets/map/wolfrun-map-wide.png": "0ef678780f18",
  "tycoon/": "3f72b3602bc0",
  "assets/tycoon-chart.png": "a598d96631cd",
  "js/lake-map-data-tycoon.js": "fb9338f2f39b",
  "js/biting/tycoon.js": "b01dc35f94ba",
  "assets/map/tycoon-map-tall.png": "970277eda22a",
  "assets/map/tycoon-map-wide.png": "fc68bba7d776",
  "lakehope/": "8c7d35d8e86d",
  "assets/lakehope-chart.png": "b018be152841",
  "js/lake-map-data-lakehope.js": "80b1311a42f4",
  "js/biting/lakehope.js": "80af89c8a14a",
  "assets/map/lakehope-map-tall.png": "682266708b92",
  "assets/map/lakehope-map-wide.png": "5c4d97727e39",
  "findlayreservoirs/": "684c0512e824",
  "assets/findlayreservoirs-chart.png": "6c507436c500",
  "js/lake-map-data-findlayreservoirs.js": "e3c859f11db1",
  "js/biting/findlayreservoirs.js": "81c9f6059f2e",
  "assets/map/findlayreservoirs-map-tall.png": "55dc3b7afe5d",
  "assets/map/findlayreservoirs-map-wide.png": "8330efb19879",
  "bresler/": "893a956f57f1",
  "assets/bresler-chart.png": "09cec0a0120a",
  "js/lake-map-data-bresler.js": "f667b2f03dde",
  "js/biting/bresler.js": "f589b0d3bfe9",
  "assets/map/bresler-map-tall.png": "9525856792ac",
  "assets/map/bresler-map-wide.png": "47b54a4a600b",
  "fergusonmetzger/": "8770c64e361f",
  "assets/fergusonmetzger-chart.png": "816292c0879a",
  "js/lake-map-data-fergusonmetzger.js": "ebe1653a06dc",
  "js/biting/fergusonmetzger.js": "dcf60ec85569",
  "assets/map/fergusonmetzger-map-tall.png": "8255f68e582b",
  "assets/map/fergusonmetzger-map-wide.png": "5313caf7a9a5"
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
function revKeyWith(path, rev) { return new URL(path, SCOPE).href + "?__nbrev=" + rev; }
function revKey(path) { return revKeyWith(path, REVISIONS[path] || VERSION); }

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
  // before anything new goes in: which deploy the running worker is, and the precache keys it left (its own files)
  var before = Promise.all([activeVersion(), caches.open(PRECACHE_CACHE).then(function (c) { return c.keys(); })])
    .catch(function () { return [null, []]; });
  event.waitUntil(
    before.then(function () { return caches.open(PRECACHE_CACHE); }).then(function (cache) {
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
    }).then(function () { return before; }).then(function (b) { return writeManifests(b[0], b[1]); })
      .then(function () { return self.skipWaiting(); })
  );
});

function isRuntime(name) { return name === RUNTIME.pages || name === RUNTIME.data || name === RUNTIME.assets || name === DEPLOYS_CACHE; }

// ---------------------------------------------------------------- deploys: which copy of a style or script a page needs
//
// Every page links its CSS and JS with ?v=<deploy> (tools/stamp-version.py), so a request names the deploy its page
// came from. This worker answers its own deploy from its precache, another deploy it still keeps from that deploy's
// copies, and a deploy it doesn't know (a newer one) only from the network. Saved pages carry their deploy in a
// header, and a saved page is only served when its deploy's files are all still here. Nothing ever pairs one
// deploy's HTML with another deploy's styles or scripts.

function isCode(path) { return /\.(css|js)$/i.test(path); }
function manifestKey(v) { return SCOPE + "__nbdeploy/" + encodeURIComponent(v); }

// the deploy a page was built for: the ?v= stamp on its own styles and scripts
function stampOf(html) {
  var m = /(?:css|js)\/[\w.\/-]+\.(?:css|js)\?v=([^"'<>&#) \t\n\r\f]+)/.exec(html);
  return m ? m[1] : null;
}

// a precached page is this deploy's page (its hash ignores the stamps), so it asks for this deploy's files
function restamp(res) {
  return res.text().then(function (html) {
    var h = new Headers(res.headers);
    h.delete("Content-Length");
    return new Response(html.replace(/(\.(?:css|js))\?v=[^"'<>&#) \t\n\r\f]*/g, "$1?v=" + encodeURIComponent(VERSION)), {
      status: res.status, statusText: res.statusText, headers: h
    });
  });
}

var manifests = {};
function readManifest(v) {
  if (!v) return Promise.resolve(null);
  if (v === VERSION) return Promise.resolve(ownFiles());
  if (manifests[v]) return manifests[v];
  manifests[v] = caches.open(DEPLOYS_CACHE).then(function (c) { return c.match(manifestKey(v)); })
    .then(function (r) { return r ? r.json() : null; }).then(function (m) { return m && m.files ? m.files : null; })
    .catch(function () { return null; });
  return manifests[v];
}

function ownFiles() {
  var m = {};
  PRECACHE.forEach(function (p) { if (isCode(p)) m[p] = REVISIONS[p] || VERSION; });
  return m;
}

// ask the running (older) worker which deploy it is; v19 and newer answer nb-hello
function activeVersion() {
  var a = self.registration && self.registration.active;
  if (!a || typeof MessageChannel === "undefined") return Promise.resolve(null);
  return new Promise(function (resolve) {
    var ch = new MessageChannel();
    ch.port1.onmessage = function (e) { resolve((e.data && e.data.version) || null); };
    try { a.postMessage({ type: "nb-hello" }, [ch.port2]); } catch (e) { resolve(null); }
    setTimeout(function () { resolve(null); }, 1500);
  });
}

// this deploy's manifest, plus one for the deploy before it when that worker didn't write one (up to v134 / live
// v41): its files are the precache keys it left, one per path (a path with two keys is left out, see N4)
function writeManifests(prev, keysBefore) {
  return caches.open(DEPLOYS_CACHE).then(function (c) {
    var own = c.put(manifestKey(VERSION), new Response(JSON.stringify({ version: VERSION, files: ownFiles() }),
      { headers: { "Content-Type": "application/json" } }));
    if (!prev || prev === VERSION) return own;
    return Promise.all([own, c.match(manifestKey(prev)).then(function (have) {
      if (have) return;
      var found = {}, files = {};
      (keysBefore || []).forEach(function (r) {
        var i = r.url.indexOf("?__nbrev=");
        if (i < 0 || r.url.indexOf(SCOPE) !== 0) return;
        var p = r.url.slice(SCOPE.length, i);
        if (!isCode(p)) return;
        (found[p] = found[p] || []).push(r.url.slice(i + 9));
      });
      Object.keys(found).forEach(function (p) { if (found[p].length === 1) files[p] = found[p][0]; });
      if (!Object.keys(files).length) return;
      return c.put(manifestKey(prev), new Response(JSON.stringify({ version: prev, files: files, from: "precache" }),
        { headers: { "Content-Type": "application/json" } }));
    })]);
  }).catch(function () {});
}

// the deploy of a saved page: its header, or (pages saved before v135) the stamp in the page itself
function deployOf(res) {
  var d = res.headers.get(DEPLOY_HEADER);
  if (d) return Promise.resolve(d);
  return res.clone().text().then(stampOf, function () { return null; });
}

// every precache key a deploy needs that this deploy doesn't (its changed files)
function extraKeys(files) {
  var out = [];
  Object.keys(files || {}).forEach(function (p) {
    if (files[p] !== (REVISIONS[p] || VERSION)) out.push(revKeyWith(p, files[p]));
  });
  return out;
}

// a saved page of deploy d can be served when d is this deploy, or d's changed files are all still kept
function complete(d) {
  if (!d || d === VERSION) return Promise.resolve(true);
  return readManifest(d).then(function (files) {
    if (!files) return false;
    return caches.open(PRECACHE_CACHE).then(function (c) {
      return Promise.all(extraKeys(files).map(function (k) { return c.match(k); }));
    }).then(function (hits) { return hits.every(Boolean); });
  }).catch(function () { return false; });
}

// the deploys the saved pages still need, so activate keeps their changed files (and nothing else)
function neededDeploys() {
  return caches.open(RUNTIME.pages).then(function (c) {
    return c.keys().then(function (reqs) {
      return Promise.all(reqs.map(function (r) { return c.match(r).then(function (res) { return res ? deployOf(res) : null; }); }));
    });
  }).then(function (ds) {
    var set = {};
    ds.forEach(function (d) { if (d && d !== VERSION) set[d] = true; });
    return Object.keys(set);
  }).catch(function () { return []; });
}

self.addEventListener("activate", function (event) {
  var wanted = {};
  PRECACHE.forEach(function (p) { wanted[revKey(p)] = true; });
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(PREFIX) === 0 && k !== PRECACHE_CACHE && !isRuntime(k)) return caches.delete(k);
      }));
    }).then(neededDeploys).then(function (need) {
      // keep the changed files of every deploy a saved page still needs; drop the other deploys' manifests
      return caches.open(DEPLOYS_CACHE).then(function (dc) {
        return dc.keys().then(function (reqs) {
          var keep = {}; keep[manifestKey(VERSION)] = true;
          need.forEach(function (d) { keep[manifestKey(d)] = true; });
          return Promise.all(reqs.map(function (r) { if (!keep[r.url]) return dc.delete(r); }));
        });
      }).then(function () {
        return Promise.all(need.map(function (d) {
          return readManifest(d).then(function (files) { extraKeys(files).forEach(function (k) { wanted[k] = true; }); });
        }));
      });
    }).then(function () {
      manifests = {};
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
  if (kind === "pages") return savedPage(url);
  return fromPrecache(url).then(function (r) { return r || fromRuntime(RUNTIME[kind], url); });
}

// a saved page, only when its styles and scripts are here too: the precached copy (this deploy, stamped to match),
// else the pages cache copy if its deploy's files are all kept. Otherwise nothing, so the caller waits for the
// network or shows offline.html, never an old page dressed in new styles (N2).
function savedPage(url) {
  return fromPrecache(url).then(function (pre) {
    if (pre) return restamp(pre);
    return fromRuntime(RUNTIME.pages, url).then(function (hit) {
      if (!hit) return undefined;
      return deployOf(hit).then(complete).then(function (ok) { return ok ? hit : undefined; });
    });
  });
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

// a saved page or script carries its deploy (DEPLOY_HEADER): a page its ?v= stamp, a script the ?v= it was asked with
function tagged(kind, url, res) {
  if (kind === "data") return Promise.resolve(res);
  var get = kind === "pages" ? res.clone().text().then(stampOf) : Promise.resolve(url.searchParams.get("v"));
  return get.then(function (d) {
    if (!d) return res;
    return res.blob().then(function (b) {
      var h = new Headers(res.headers);
      h.set(DEPLOY_HEADER, d);
      return new Response(b, { status: res.status, statusText: res.statusText, headers: h });
    });
  });
}

function remember(kind, url, res) {
  var name = RUNTIME[kind], key = keyFor(url);
  return clean(res).then(function (c) { return tagged(kind, url, c); }).then(function (c) {
    return caches.open(name).then(function (cache) {
      return cache.delete(key).then(function () { return cache.put(key, c); });
    });
  }).then(function () { return trim(name, LIMITS[kind]); }).catch(function () {});
}

function offlinePage() {
  return fromPrecache(new URL("offline.html", SCOPE)).then(function (res) {
    if (!res) return Response.error();
    // links in offline.html are written from the site root; a <base> keeps them right from any folder, and its
    // styles are asked for as this deploy's (the precached copy may carry an older stamp)
    return res.text().then(function (html) {
      html = html.replace(/(\.(?:css|js))\?v=[^"'<>&#) \t\n\r\f]*/g, "$1?v=" + encodeURIComponent(VERSION));
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

// CSS and JS, by the deploy the page asked for (?v=). This deploy: the precached copy, which install checked against
// its hash. A deploy this worker still keeps (a saved page of the last deploy, or a tab left open across the
// update): that deploy's copy. A deploy it doesn't know, which is a newer one whose page came from the network
// before this worker updated: the network only, however slow, since every copy here is older (N1). Only with no
// network at all does that page get a saved copy, and then the page is told to heal (js/sw-update.js reloads once).
function code(event, url) {
  var want = url.searchParams.get("v");
  var path = precachePath(url);
  if (!want || want === VERSION) {
    if (!path) return networkFirst(event, url, "assets");
    return fromPrecache(url).then(function (hit) { return hit || networkFirst(event, url, "assets"); });
  }
  return readManifest(want).then(function (files) {
    var p = path || rel(new URL(keyFor(url)));
    if (!files || !files[p]) return otherDeploy(event, url, want);
    return caches.open(PRECACHE_CACHE).then(function (c) { return c.match(revKeyWith(p, files[p])); })
      .then(function (hit) { return hit || otherDeploy(event, url, want); });
  });
}

function otherDeploy(event, url, want) {
  return fetch(event.request).then(function (res) {
    if (res.ok && res.type === "basic" && !precachePath(url)) event.waitUntil(remember("assets", url, res.clone()));
    return res;
  }).catch(function () {
    return fromRuntime(RUNTIME.assets, url).then(function (hit) {
      if (hit && hit.headers.get(DEPLOY_HEADER) === want) return hit;
      return saved("assets", url).then(function (any) {
        if (!any) return Response.error();
        tellMixed(event);
        return any;
      });
    });
  });
}

// the page got a style or script from another deploy (no network for its own): ask it to reload once
var mixed = {};
function tellMixed(event) {
  var id = event.clientId;
  if (!id) return;
  mixed[id] = true;
  event.waitUntil(self.clients.get(id).then(function (c) {
    if (c) c.postMessage({ type: "nb-mixed", version: VERSION });
  }).catch(function () {}));
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

// fonts and images: precache first, then the assets runtime cache. A ?v= content hash (tools/stamp-assets.py) means
// the file is immutable, so a cached copy is returned with no revalidate. Unversioned requests (a dynamic URL that
// was not stamped) stay stale while revalidate. Live readings never come through here: data/ is network first, and
// NWS/USGS/Corps requests are cross origin and are not intercepted.
function isFontOrImage(url) {
  return /\.(woff2|png|svg|ico|jpe?g|webp|gif)$/i.test(url.pathname);
}

function cacheFirstAsset(event, url) {
  return fromPrecache(url).then(function (pre) {
    if (pre) return pre;
    return fromRuntime(RUNTIME.assets, url).then(function (hit) {
      if (hit && url.searchParams.get("v")) return hit;       // content-hashed URL: immutable
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

// js/sw-update.js asks before it heals a page. "by-deploy" (v135 and newer): this worker hands each page the styles
// and scripts of its own deploy, so a page it served needs no reload unless it says "mixed" (no network for a newer
// deploy's files). Workers v19 to v134 (live v41) answered "network-first", which their 4 second fallback could break.
self.addEventListener("message", function (event) {
  var d = event.data;
  if (d && d.type === "nb-hello" && event.ports && event.ports[0]) {
    var id = event.source && event.source.id;
    event.ports[0].postMessage({ version: VERSION, assets: "by-deploy", mixed: !!(id && mixed[id]) });
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
    event.respondWith(code(event, url));
    return;
  }
  if (isFontOrImage(url)) {
    event.respondWith(cacheFirstAsset(event, url));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, url));
});
