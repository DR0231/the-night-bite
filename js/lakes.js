/**
 * The Night Bite: per-lake settings and the active lake.
 * Loaded in <head> on every page (before any other script), so html[data-lake] is set before first paint and the
 * lake-only blocks ([data-for="alum"] and so on, see css/styles.css) never flash the wrong lake.
 *
 * Active lake: ?lake=hoover|alum|buckeye in the URL first, then localStorage "nb-lake", then Hoover (the default).
 * Hoover keeps a clean URL. Other lakes keep ?lake= in the address bar, so a shared link opens the same lake.
 *
 * Every value below has a source in DATA-SOURCES.md. Hoover's values are exactly the ones the scripts used before
 * this file existed (js/usgs.js, js/pool-trend.js, js/conditions.js, js/alerts.js); those scripts fall back to the
 * same Hoover values if this file is missing.
 */
(function () {
  var LAKES = {
    hoover: {
      id: "hoover",
      name: "Hoover Reservoir",
      short: "Hoover",
      area: "Delaware / Franklin County",
      lat: 40.11, lng: -82.88,
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03228400", param: "62614", temp: "00010",
        fullPool: 894,
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03228400/"
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/89,88/forecast/hourly",
        point: "https://api.weather.gov/points/40.11,-82.88",
        grid: "https://api.weather.gov/gridpoints/ILN/89,88",
        station: "KCMH", stationName: "Columbus airport (KCMH)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.11&lon=-82.88"
      },
      alerts: { zones: "OHC041,OHC049,OHZ046,OHZ055", counties: "Delaware or Franklin County" },
      push: null,      // null: js/conditions.js keeps its own Hoover list (north to south lake)
      map: { data: "NightBiteMapData", chart: "assets/hoover-chart.png" },
      spots: ["Oxbow (upper ramp)", "Redbank (middle ramp)", "Walnut Road (lower ramp)", "Bank (upper)", "Bank (middle)", "Bank (lower)", "Maxtown", "Marina / lower marina"],
      species: ["channel-catfish", "blue-catfish", "flathead-catfish", "largemouth-bass", "smallmouth-bass", "black-crappie", "white-crappie", "bluegill", "white-bass", "hybrid-striped-bass", "saugeye", "walleye", "common-carp", "longnose-gar"]
    },
    alum: {
      id: "alum",
      name: "Alum Creek Lake",
      short: "Alum Creek",
      area: "Delaware County",
      lat: 40.24, lng: -82.97,
      pool: {
        // no USGS gauge on the lake itself; the Corps of Engineers posts the lake level every 15 minutes
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "AlumCr-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // no public lake temperature gauge (the Corps temp sensor is in the outflow, below the dam)
        fullPool: 888,
        gaugeUrl: "https://water.usace.army.mil/overview/lrh/locations/alumcr",
        snapshot: { line: "887.27 ft · no temp · ~0.7 ft below full pool", at: "2026-10-24T02:45:00-04:00", when: "2026-10-24 02:45 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/85,94/forecast/hourly",
        point: "https://api.weather.gov/points/40.24,-82.97",
        grid: "https://api.weather.gov/gridpoints/ILN/85,94",
        station: "KDLZ", stationName: "Delaware airport (KDLZ)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.24&lon=-82.97"
      },
      alerts: { zones: "OHC041,OHZ046", counties: "Delaware County" },
      push: null,      // Alum Creek also runs north to south, so the Hoover wording fits
      map: { data: "NightBiteMapDataAlum", chart: "assets/alum-chart.png" },
      spots: ["New Galena ramp", "Marina ramp (Hollenback Rd)", "Cheshire ramp", "Howard ramp", "Bank (south, main lake)", "Bank (middle)", "Bank (north, no wake)", "Kayak launch"],
      species: ["saugeye", "walleye", "muskellunge", "largemouth-bass", "smallmouth-bass", "white-crappie", "black-crappie", "white-bass", "bluegill", "channel-catfish"]
    },
    buckeye: {
      id: "buckeye",
      name: "Buckeye Lake",
      short: "Buckeye",
      area: "Licking, Fairfield and Perry Counties",
      lat: 39.93, lng: -82.49,
      pool: {
        src: "usgs", srcName: "USGS",
        site: "395540082291600", param: "62614",
        temp: null,     // the USGS lake gauge measures level only
        fullPool: 891.75,
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-395540082291600/",
        snapshot: { line: "891.45 ft · no temp · ~0.3 ft below full pool", at: "2026-10-24T02:30:00-04:00", when: "2026-10-24 02:30 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/103,81/forecast/hourly",
        point: "https://api.weather.gov/points/39.93,-82.49",
        grid: "https://api.weather.gov/gridpoints/ILN/103,81",
        station: "KVTA", stationName: "Newark airport (KVTA)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.93&lon=-82.49"
      },
      alerts: { zones: "OHC089,OHC045,OHC127,OHZ056,OHZ065,OHZ066", counties: "Licking, Fairfield or Perry County" },
      // Buckeye runs west southwest to east northeast: north and south winds name a shore, east and west winds name an end
      push: ["into the south shore", "toward the southwest end", "toward the west end", "into the northwest shore",
        "into the north shore", "toward the northeast end", "toward the east end", "into the southeast shore"],
      map: { data: "NightBiteMapDataBuckeye", chart: "assets/buckeye-chart.png" },
      spots: ["North Shore ramp", "Liebs Island ramp", "Fairfield Beach ramp", "Mud Island pier", "Bank (north shore)", "Bank (south shore)", "Canal / Millersport"],
      species: ["saugeye", "largemouth-bass", "white-crappie", "black-crappie", "bluegill", "yellow-perch", "channel-catfish", "bullhead"]
    }
  };
  var ORDER = ["hoover", "alum", "buckeye"];
  // display names for the species ids above (the log's species lists use these)
  var SPECIES = {
    "channel-catfish": "Channel catfish", "blue-catfish": "Blue catfish", "flathead-catfish": "Flathead catfish",
    "largemouth-bass": "Largemouth bass", "smallmouth-bass": "Smallmouth bass", "black-crappie": "Black crappie",
    "white-crappie": "White crappie", "bluegill": "Bluegill / sunfish", "white-bass": "White bass",
    "hybrid-striped-bass": "Hybrid striped bass", "saugeye": "Saugeye", "walleye": "Walleye", "common-carp": "Common carp",
    "longnose-gar": "Longnose gar", "muskellunge": "Muskellunge", "yellow-perch": "Yellow perch", "bullhead": "Bullhead"
  };
  var KEY = "nb-lake";

  function valid(id) { return Object.prototype.hasOwnProperty.call(LAKES, id) ? id : null; }
  var fromUrl = null, stored = null;
  try { fromUrl = valid(new URLSearchParams(location.search).get("lake")); } catch (e) {}
  try { stored = valid(localStorage.getItem(KEY)); } catch (e) {}
  var id = fromUrl || stored || "hoover";
  if (fromUrl && fromUrl !== stored) { try { localStorage.setItem(KEY, fromUrl); } catch (e) {} }

  // keep the address bar honest: ?lake= for Alum Creek and Buckeye, a clean URL for Hoover
  try {
    var u = new URL(location.href);
    if (id === "hoover") u.searchParams.delete("lake"); else u.searchParams.set("lake", id);
    if (u.href !== location.href) history.replaceState(history.state, "", u.href);
  } catch (e) {}

  var root = document.documentElement;
  root.setAttribute("data-lake", id);
  root.style.setProperty("--lake-short", '"' + LAKES[id].short + '"');

  // same page, other lake (the picker navigates here; a cross-document view transition fades between them)
  function hrefFor(next) {
    var u = new URL(location.href);
    if (next === "hoover") u.searchParams.delete("lake"); else u.searchParams.set("lake", next);
    return u.href;
  }
  // storage keys: Hoover keeps its original names, other lakes get a suffix so readings never mix
  function key(base) { return id === "hoover" ? base : base + "-" + id; }

  // Corps of Engineers lake level (CWMS Data API, public, CORS open) for lakes with pool.src "cwms".
  // Resolves to [{ t, v, iso }] oldest first, values rounded to 0.01 ft. Provisional, like USGS IV data.
  function cwmsFor(lake, hours) {
    var P = LAKES[lake].pool;
    var begin = new Date(Date.now() - hours * 36e5).toISOString().replace(/\.\d+Z$/, "Z");
    var url = "https://cwms-data.usace.army.mil/cwms-data/timeseries?office=" + P.office + "&name=" + encodeURIComponent(P.ts) +
      "&begin=" + begin + "&page-size=1000";
    return fetch(url, { headers: { Accept: "application/json;version=2" } })
      .then(function (r) { if (!r.ok) throw new Error("cwms " + r.status); return r.json(); })
      .then(function (j) {
        var out = [];
        (j.values || []).forEach(function (row) {
          var v = row && row[1];
          if (typeof v === "number" && isFinite(v) && v > 0) out.push({ t: row[0], v: Math.round(v * 100) / 100, iso: new Date(row[0]).toISOString() });
        });
        return out;
      });
  }
  function cwms(hours) { return cwmsFor(id, hours); }

  // site root, so pages in species/ can find assets (lakes.js is always loaded as <root>/js/lakes.js)
  var BASE = "";
  try { BASE = document.currentScript.src.replace(/js\/lakes\.js(\?.*)?$/, ""); } catch (e) {}

  window.NightBiteLakes = { all: LAKES, order: ORDER, speciesNames: SPECIES, storageKey: KEY, hrefFor: hrefFor, base: BASE, cwmsFor: cwmsFor };
  window.NightBiteLake = { id: id, cfg: LAKES[id], key: key, cwms: cwms };

  // Lake switches only (js/lake-picker.js sets the flag): a short cross-fade into the new page.
  // Registered here in <head> so it is in place before the first frame; every other navigation stays instant.
  function vt(e, clear) {
    var switching = false;
    try { switching = sessionStorage.getItem("nb-lake-switch") === "1"; if (clear) sessionStorage.removeItem("nb-lake-switch"); } catch (er) {}
    if (e.viewTransition && !switching) e.viewTransition.skipTransition();
  }
  window.addEventListener("pagereveal", function (e) { vt(e, true); });
  window.addEventListener("pageswap", function (e) { vt(e, false); });

  // fill [data-lk="name|short|area"] once the page is parsed (Hoover markup already says Hoover)
  function fill() {
    if (id !== "hoover") {
      var nodes = document.querySelectorAll("[data-lk]");
      for (var i = 0; i < nodes.length; i++) {
        var v = LAKES[id][nodes[i].getAttribute("data-lk")];
        if (typeof v === "string") nodes[i].textContent = v;
      }
    }
    root.classList.add("lk-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill);
  else fill();
})();
