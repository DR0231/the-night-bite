/**
 * The Night Bite: tiny head boot. Sets html[data-lake], hides other lakes' blocks, and (on the water picker)
 * sends a saved pick to that lake's home before first paint. Loaded sync in <head>, after the stylesheet
 * link, so first paint is not held up by js/lakes.js (the full lake list, gauge helpers and Home-link
 * rewriting load deferred). SHORTS is written by tools/build-lakes-boot.py from js/lakes.js.
 *
 * Same rules as js/lakes.js: ?lake= first, then localStorage "nb-lake", then Hoover; a lake home
 * (<meta name="nb-home">) always wins; ?pick keeps the picker open; hoover/?browse looks around without saving.
 */
(function () {
  /* nb:lakes-boot-data (tools/build-lakes-boot.py) */
  var SHORTS = {
    "hoover": "Hoover",
    "alum": "Alum Creek",
    "buckeye": "Buckeye Lake",
    "oshaughnessy": "O'Shaughnessy",
    "griggs": "Griggs",
    "indian": "Indian Lake",
    "delaware": "Delaware Lake",
    "deercreek": "Deer Creek Lake",
    "madison": "Madison Lake",
    "knox": "Knox Lake",
    "clearfork": "Clear Fork",
    "seneca": "Seneca Lake",
    "dillon": "Dillon Lake",
    "logan": "Lake Logan",
    "saltfork": "Salt Fork Lake",
    "burroak": "Burr Oak Lake",
    "dow": "Dow Lake",
    "mosquito": "Mosquito Creek Lake",
    "berlin": "Berlin Lake",
    "westbranch": "West Branch",
    "pymatuning": "Pymatuning",
    "milton": "Lake Milton",
    "leesville": "Leesville Lake",
    "grandlakestmarys": "Grand Lake St. Marys",
    "caesarcreek": "Caesar Creek Lake",
    "eastfork": "East Fork Lake",
    "cjbrown": "C.J. Brown",
    "rockyfork": "Rocky Fork",
    "ladue": "LaDue",
    "paintcreek": "Paint Creek",
    "portagelakes": "Portage Lakes",
    "mogadore": "Mogadore",
    "loramie": "Lake Loramie",
    "nimisila": "Nimisila",
    "cowan": "Cowan Lake",
    "acton": "Acton Lake",
    "tappan": "Tappan Lake",
    "piedmont": "Piedmont Lake",
    "clendening": "Clendening Lake",
    "atwood": "Atwood Lake",
    "charlesmill": "Charles Mill",
    "pleasanthill": "Pleasant Hill",
    "beachcity": "Beach City",
    "wingfoot": "Wingfoot",
    "eastbranch": "East Branch",
    "guilford": "Guilford",
    "highlandtown": "Highlandtown",
    "punderson": "Punderson",
    "wellington": "Wellington",
    "kiser": "Kiser",
    "hargus": "Hargus",
    "stonelick": "Stonelick",
    "grant": "Grant Lake",
    "lakewhite": "Lake White",
    "lakerupert": "Rupert",
    "jackson": "Jackson Lake",
    "wolfrun": "Wolf Run",
    "tycoon": "Tycoon",
    "lakehope": "Lake Hope",
    "findlayreservoirs": "Findlay",
    "bresler": "Bresler",
    "fergusonmetzger": "Ferguson & Metzger"
  };
  /* /nb:lakes-boot-data */

  function valid(id) { return Object.prototype.hasOwnProperty.call(SHORTS, id) ? id : null; }

  var BASE = "";
  try { BASE = document.currentScript.src.replace(/js\/lakes-boot\.js(\?.*)?$/, ""); } catch (e) {}
  function homeFor(lake) { return BASE + lake + "/"; }

  var homeMeta = document.querySelector('meta[name="nb-home"]');
  var homeLake = homeMeta ? valid(homeMeta.getAttribute("content")) : null;
  var atRoot = !!document.querySelector('meta[name="nb-root"]');
  var fromUrl = null, stored = null, pick = false, browse = false;
  try {
    var qs = new URLSearchParams(location.search);
    fromUrl = valid(qs.get("lake"));
    pick = qs.has("pick");
    browse = qs.has("browse");
  } catch (e) {}
  try { stored = valid(localStorage.getItem("nb-lake")); } catch (e) {}
  var browsing = false;
  try {
    if (homeLake && browse) sessionStorage.setItem("nb-browse", homeLake);
    browsing = !!homeLake && sessionStorage.getItem("nb-browse") === homeLake;
    if (homeLake && !browsing) sessionStorage.removeItem("nb-browse");
  } catch (e) { browsing = !!homeLake && browse; }
  var id = homeLake || fromUrl || stored || "hoover";
  if (id !== stored && (fromUrl || (homeLake && !browsing))) { try { localStorage.setItem("nb-lake", id); } catch (e) {} }

  if (atRoot && (fromUrl || stored) && !pick && BASE) {
    try { location.replace(homeFor(id) + location.hash); } catch (e) {}
  }

  try {
    var u = new URL(location.href), had = u.searchParams.get("lake"), hadBrowse = u.searchParams.has("browse");
    if (id === "hoover" || homeLake || atRoot) u.searchParams.delete("lake"); else u.searchParams.set("lake", id);
    if (homeLake) u.searchParams.delete("browse");
    if (had !== u.searchParams.get("lake") || (hadBrowse && homeLake)) history.replaceState(history.state, "", u.href);
  } catch (e) {}

  var root = document.documentElement;
  root.setAttribute("data-lake", id);
  try {
    var hide = document.createElement("style");
    hide.textContent = 'html[data-lake="' + id + '"] [data-for]:not([data-for~="' + id + '"]),html[data-lake="' + id + '"] [data-lakes]:not([data-lakes~="' + id + '"]){display:none!important}';
    (document.head || root).appendChild(hide);
  } catch (e) {}
  if (SHORTS[id]) root.style.setProperty("--lake-short", '"' + SHORTS[id] + '"');
})();
