/**
 * The Night Bite: per-lake settings and the active lake.
 * Loaded in <head> on every page (before any other script), so html[data-lake] is set before first paint and the
 * lake-only blocks ([data-for="alum"] and so on, see css/styles.css) never flash the wrong lake.
 *
 * Active lake: ?lake=hoover|alum|buckeye|oshaughnessy|griggs|indian|delaware|deercreek|madison|knox|clearfork in the URL first, then localStorage "nb-lake", then Hoover (the default).
 * Home pages have their own address per lake: Hoover at the site root, every other lake at <id>/ (alum/, buckeye/,
 * oshaughnessy/, griggs/, indian/, delaware/, deercreek/, madison/, knox/, clearfork/). Those index.html files are built from index.html by tools/build-lake-pages.py
 * and carry <meta name="nb-home" content="<id>">. On a lake's own home page that lake always wins. At the root, a ?lake= link
 * or a saved choice of another lake goes straight to that lake's address (location.replace, before anything
 * paints). Other pages keep ?lake= in the address bar for every lake but Hoover, a clean URL for Hoover, and their
 * Home links point at the chosen lake's home page.
 *
 * Also the shared gauge fetchers: USGS (usgsLatest, usgsSeries: new Water Data API first, legacy IV as fallback) and the
 * Corps CWMS API (cwmsFor, Alum Creek, Delaware Lake and Deer Creek Lake). Madison Lake, Knox Lake and Clear Fork Reservoir have
 * no public lake gauge (pool.src null): nothing is fetched and the pool card says so. js/usgs.js, js/pool-trend.js and js/lake-picker.js all use them.
 *
 * Adding a lake: one entry in LAKES plus its id in ORDER. The picker (js/lake-picker.js) reads name, short, aliases
 * (search), region, lat and lng (Near me) and pool (its Live level and Live temp tags) from that entry.
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
      area: "Central Ohio",
      lat: 40.11, lng: -82.88,
      region: "central", owner: "City of Columbus",
      aliases: ["Hoover", "Hoover Dam", "Big Walnut"],
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
      alerts: { zones: "OHC041,OHC049,OHZ046,OHZ055", counties: "the Hoover area" },
      push: null,      // null: js/conditions.js keeps its own Hoover list (north to south lake)
      map: { data: "NightBiteMapData", chart: "assets/hoover-chart.png" },
      spots: ["Oxbow (upper ramp)", "Redbank (middle ramp)", "Walnut Road (lower ramp)", "Bank (upper)", "Bank (middle)", "Bank (lower)", "Maxtown", "Marina / lower marina"],
      species: ["channel-catfish", "blue-catfish", "flathead-catfish", "largemouth-bass", "smallmouth-bass", "black-crappie", "white-crappie", "bluegill", "white-bass", "hybrid-striped-bass", "saugeye", "walleye", "common-carp", "longnose-gar", "yellow-perch"]   // + yellow perch: ODNR Waterbody Report survey data
    },
    alum: {
      id: "alum",
      name: "Alum Creek Lake",
      short: "Alum Creek",
      area: "Central Ohio",
      lat: 40.24, lng: -82.97,
      region: "central", owner: "US Army Corps of Engineers",
      aliases: ["Alum", "Alum Creek State Park"],
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
      alerts: { zones: "OHC041,OHZ046", counties: "the Alum Creek area" },
      push: null,      // Alum Creek also runs north to south, so the Hoover wording fits
      map: { data: "NightBiteMapDataAlum", chart: "assets/alum-chart.png" },
      spots: ["New Galena ramp", "Marina ramp (Hollenback Rd)", "Cheshire ramp", "Howard ramp", "Bank (south, main lake)", "Bank (middle)", "Bank (north, no wake)", "Kayak launch"],
      species: ["saugeye", "walleye", "muskellunge", "largemouth-bass", "smallmouth-bass", "white-crappie", "black-crappie", "white-bass", "bluegill", "channel-catfish", "yellow-perch", "blue-catfish"]   // perch: ODNR Waterbody Report; blue cats: ODNR stocking 2023 to 2025
    },
    buckeye: {
      id: "buckeye",
      name: "Buckeye Lake",
      short: "Buckeye Lake",
      area: "Central Ohio",
      lat: 39.93, lng: -82.49,
      region: "central", owner: "ODNR",
      aliases: ["Buckeye Lake State Park"],
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
      alerts: { zones: "OHC089,OHC045,OHC127,OHZ056,OHZ065,OHZ066", counties: "the Buckeye Lake area" },
      // Buckeye Lake runs west southwest to east northeast: north and south winds name a shore, east and west winds name an end
      push: ["into the south shore", "toward the southwest end", "toward the west end", "into the northwest shore",
        "into the north shore", "toward the northeast end", "toward the east end", "into the southeast shore"],
      map: { data: "NightBiteMapDataBuckeye", chart: "assets/buckeye-chart.png" },
      spots: ["North Shore ramp", "Liebs Island ramp", "Fairfield Beach ramp", "Mud Island pier", "Bank (north shore)", "Bank (south shore)", "Canal / Millersport"],
      species: ["saugeye", "largemouth-bass", "white-crappie", "black-crappie", "bluegill", "yellow-perch", "channel-catfish", "bullhead", "hybrid-striped-bass", "white-bass"]   // hybrids and white bass: ODNR Waterbody Report; hybrids also ODNR stocking
    },
    oshaughnessy: {
      id: "oshaughnessy",
      name: "O'Shaughnessy Reservoir",
      short: "O'Shaughnessy",
      area: "Central Ohio",
      lat: 40.20, lng: -83.14,
      region: "central", owner: "City of Columbus",
      aliases: ["OShaughnessy", "O Shaughnessy", "Shaughnessy", "Scioto"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03220500", param: "62614",   // Scioto River at O'Shaughnessy Dam near Dublin: reservoir elevation
        temp: null,     // level only; City of Columbus: "Reservoir temperatures are not monitored"
        fullPool: 848.5,  // City of Columbus: O'Shaughnessy Dam crest 848.50 ft (ODNR map depths use 847.9 ft)
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03220500/",
        snapshot: { line: "848.44 ft · no temp · ~0.1 ft below full pool", at: "2026-10-29T12:00:00-04:00", when: "2026-10-29 12:00 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/79,92/forecast/hourly",
        point: "https://api.weather.gov/points/40.2,-83.14",
        grid: "https://api.weather.gov/gridpoints/ILN/79,92",
        station: "KDLZ", stationName: "Delaware airport (KDLZ)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.20&lon=-83.14"
      },
      alerts: { zones: "OHC041,OHZ046", counties: "the O'Shaughnessy area" },
      push: null,      // runs north to south like Hoover
      map: { data: "NightBiteMapDataOshaughnessy", chart: "assets/oshaughnessy-chart.png" },
      spots: ["Home Road ramp", "Twin Lakes launch", "Bellepoint ramp", "Bank (south, near the dam)", "Bank (middle)", "Bank (north)", "Kayak launch"],
      species: ["hybrid-striped-bass", "saugeye", "blue-catfish", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "largemouth-bass", "smallmouth-bass", "white-bass"]   // ODNR Waterbody Report surveys; hybrids, saugeye and blue cats also ODNR stocking
    },
    griggs: {
      id: "griggs",
      name: "Griggs Reservoir",
      short: "Griggs",
      area: "Central Ohio",
      lat: 40.03, lng: -83.095,
      region: "central", owner: "City of Columbus",
      aliases: ["Griggs", "Scioto"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03221500", param: "62614", temp: "00010",   // Scioto River at Griggs Dam: reservoir elevation and water temp
        fullPool: 756.18,  // City of Columbus: Griggs Dam crest 756.18 ft (ODNR map depths use 757 ft)
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03221500/",
        snapshot: { line: "755.64 ft · 59°F · ~0.5 ft below full pool", at: "2026-10-29T12:45:00-04:00", when: "2026-10-29 12:45 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/81,84/forecast/hourly",
        point: "https://api.weather.gov/points/40.03,-83.095",
        grid: "https://api.weather.gov/gridpoints/ILN/81,84",
        station: "KOSU", stationName: "Ohio State airport (KOSU)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.03&lon=-83.095"
      },
      alerts: { zones: "OHC049,OHZ055", counties: "the Griggs area" },
      push: null,      // runs north to south like Hoover
      map: { data: "NightBiteMapDataGriggs", chart: "assets/griggs-chart.png" },
      spots: ["Griggs boat launch (Fishinger Rd)", "Griggs marina docks", "Bank (east side park)", "Bank (west side, south of Fishinger Rd)", "Bank (north)", "Kayak launch"],
      species: ["hybrid-striped-bass", "saugeye", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "largemouth-bass", "smallmouth-bass", "white-bass"]   // ODNR Waterbody Report surveys; hybrids also ODNR stocking and the 2026 central Ohio forecast
    },
    indian: {
      id: "indian",
      name: "Indian Lake",
      short: "Indian Lake",
      area: "West central Ohio",
      lat: 40.49, lng: -83.89,
      region: "central", owner: "ODNR",
      aliases: ["Indian", "Indian Lake State Park", "Russells Point"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03260500", param: "62614", temp: "00010",   // Indian Lake at Russells Point: lake elevation and water temp
        fullPool: 996.3,
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03260500/",
        snapshot: { line: "996.02 ft · 61°F · ~0.3 ft below full pool", at: "2026-10-29T13:00:00-04:00", when: "2026-10-29 13:00 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/52,103/forecast/hourly",
        point: "https://api.weather.gov/points/40.49,-83.89",
        grid: "https://api.weather.gov/gridpoints/ILN/52,103",
        station: "KEDJ", stationName: "Bellefontaine airport (KEDJ)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.49&lon=-83.89"
      },
      alerts: { zones: "OHC091,OHZ044", counties: "the Indian Lake area" },
      // Indian Lake is a wide, round lake: every wind direction names the shore it blows into
      push: ["into the south shore", "into the southwest shore", "into the west shore", "into the northwest shore",
        "into the north shore", "into the northeast shore", "into the east shore", "into the southeast shore"],
      map: { data: "NightBiteMapDataIndian", chart: "assets/indian-chart.png" },
      spots: ["Moundwood ramp", "Lakeview Harbor ramp", "Blackhawk ramp", "Chippewa ramp", "Cranetown Island ramp", "Old Field Beach jetties", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "black-crappie", "white-crappie", "largemouth-bass", "bluegill", "channel-catfish", "flathead-catfish", "white-bass", "walleye", "yellow-perch", "smallmouth-bass"]   // + smallmouth: ODNR Waterbody Report survey data
    },
    delaware: {
      id: "delaware",
      name: "Delaware Lake",
      short: "Delaware Lake",
      area: "Central Ohio",
      lat: 40.385, lng: -83.055,
      region: "central", owner: "US Army Corps of Engineers",
      aliases: ["Delaware", "Delaware State Park"],
      pool: {
        // no USGS lake gauge; the Corps of Engineers posts the lake level every 15 minutes (same as Alum Creek)
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "Delaware-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // no public lake temperature gauge
        fullPool: 915,
        gaugeUrl: "https://water.usace.army.mil/overview/lrh/locations/delaware",
        snapshot: { line: "915.18 ft · no temp · ~0.2 ft above full pool", at: "2026-10-29T13:15:00-04:00", when: "2026-10-29 13:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/81,100/forecast/hourly",
        point: "https://api.weather.gov/points/40.385,-83.055",
        grid: "https://api.weather.gov/gridpoints/ILN/81,100",
        station: "KDLZ", stationName: "Delaware airport (KDLZ)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.385&lon=-83.055"
      },
      alerts: { zones: "OHC041,OHZ046", counties: "the Delaware Lake area" },
      push: null,      // runs north to south like Hoover
      map: { data: "NightBiteMapDataDelaware", chart: "assets/delaware-chart.png" },
      spots: ["Main marina ramp", "Southwest launch", "Sherwood Road ramp (east)", "Bank (dam area)", "Bank (other)", "Kayak launch"],
      species: ["black-crappie", "white-crappie", "largemouth-bass", "smallmouth-bass", "channel-catfish", "bluegill", "white-bass"]
    },
    deercreek: {
      id: "deercreek",
      name: "Deer Creek Lake",
      short: "Deer Creek Lake",
      area: "Central Ohio",
      lat: 39.62, lng: -83.24,
      region: "central", owner: "US Army Corps of Engineers",
      aliases: ["Deer Creek", "Deer Creek State Park", "Deer Creek Reservoir", "Mt. Sterling"],
      pool: {
        // no USGS lake gauge; the Corps of Engineers posts the lake level every 15 minutes (same as Alum Creek).
        // ODNR draws it down about 14 ft to winter pool Oct. 1 to Nov. 30, so fall readings sit well below full pool.
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "DeerCr-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // no public lake temperature gauge (the Corps posts an outflow temp only)
        fullPool: 810.5,   // ODNR fishing map pool
        gaugeUrl: "https://water.usace.army.mil/overview/lrh/locations/deercr",
        snapshot: { line: "804.72 ft · no temp · ~5.8 ft below full pool", at: "2026-10-30T10:30:00-04:00", when: "2026-10-30 10:30 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/78,65/forecast/hourly",
        point: "https://api.weather.gov/points/39.62,-83.24",
        grid: "https://api.weather.gov/gridpoints/ILN/78,65",
        station: "KI23", stationName: "Washington Court House airport (KI23)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.62&lon=-83.24"
      },
      alerts: { zones: "OHC129,OHC047,OHZ064,OHZ063", counties: "the Deer Creek Lake area" },
      push: null,
      map: { data: "NightBiteMapDataDeercreek", chart: "assets/deercreek-chart.png" },
      spots: ["Marina ramp (west)", "Ramp by the dam", "Below the dam", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "black-crappie", "white-crappie", "largemouth-bass", "smallmouth-bass", "channel-catfish", "bluegill", "white-bass"]
    },
    madison: {
      id: "madison",
      name: "Madison Lake",
      short: "Madison Lake",
      area: "Central Ohio",
      lat: 39.875, lng: -83.376,
      region: "central", owner: "ODNR Ohio State Parks",
      aliases: ["Madison", "Madison Lake State Park", "London"],
      pool: {
        // no public lake level or temperature gauge (USGS or Corps): the pool card says so, nothing is fetched
        src: null, srcName: null,
        temp: null,
        fullPool: 965,     // ODNR fishing map summer pool
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/72,76/forecast/hourly",
        point: "https://api.weather.gov/points/39.875,-83.376",
        grid: "https://api.weather.gov/gridpoints/ILN/72,76",
        station: "KUYF", stationName: "London airport (KUYF)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.875&lon=-83.376"
      },
      alerts: { zones: "OHC097,OHZ054", counties: "the Madison Lake area" },
      push: null,
      map: { data: "NightBiteMapDataMadison", chart: "assets/madison-chart.png" },
      spots: ["Launch ramp", "Bank by the ramp", "Bank (other)", "Kayak launch"],
      species: ["largemouth-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "bullhead"]
    },
    knox: {
      id: "knox",
      name: "Knox Lake",
      short: "Knox Lake",
      area: "Central Ohio",
      lat: 40.507, lng: -82.506,
      region: "central", owner: "ODNR Division of Wildlife",
      aliases: ["Knox", "Knox Lake Fishing Area", "Fredericktown", "Kokosing"],
      pool: {
        // no public lake level or temperature gauge (the USGS Kokosing River gauge is on the river, not the lake)
        src: null, srcName: null,
        temp: null,
        fullPool: 1100,    // ODNR fishing map summer pool
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/60,17/forecast/hourly",
        point: "https://api.weather.gov/points/40.507,-82.506",
        grid: "https://api.weather.gov/gridpoints/CLE/60,17",
        station: "KMFD", stationName: "Mansfield airport (KMFD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.507&lon=-82.506"
      },
      alerts: { zones: "OHC083,OHZ047", counties: "the Knox Lake area" },
      push: null,
      map: { data: "NightBiteMapDataKnox", chart: "assets/knox-chart.png" },
      spots: ["Marina ramp (lower lake)", "Upper lake ramp", "Carry-in access", "Bank (other)", "Kayak launch"],
      species: ["largemouth-bass", "flathead-catfish", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "yellow-perch"]
    },
    clearfork: {
      id: "clearfork",
      name: "Clear Fork Reservoir",
      short: "Clear Fork",
      area: "Central Ohio",
      lat: 40.71, lng: -82.63,
      region: "central", owner: "City of Mansfield",
      aliases: ["Clear Fork", "Clearfork", "Clear Fork Lake", "Mansfield", "Lexington"],
      pool: {
        // no public lake level or temperature gauge: the pool card says so, nothing is fetched
        src: null, srcName: null,
        temp: null,
        fullPool: 1202,    // ODNR fishing map summer pool (the City lists the spillway at 1202 ft)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/55,26/forecast/hourly",
        point: "https://api.weather.gov/points/40.71,-82.63",
        grid: "https://api.weather.gov/gridpoints/CLE/55,26",
        station: "KMFD", stationName: "Mansfield airport (KMFD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.71&lon=-82.63"
      },
      alerts: { zones: "OHC139,OHC117,OHZ029,OHZ037", counties: "the Clear Fork Reservoir area" },
      push: null,
      map: { data: "NightBiteMapDataClearfork", chart: "assets/clearfork-chart.png" },
      spots: ["Ramp and marina (south side)", "Picnic area pier", "Bank (south shore)", "Bank (other)", "Kayak launch"],
      species: ["muskellunge", "largemouth-bass", "black-crappie", "white-crappie", "channel-catfish"]
    }
  };
  var ORDER = ["hoover", "alum", "buckeye", "oshaughnessy", "griggs", "indian", "delaware", "deercreek", "madison", "knox", "clearfork"];
  // picker regions, in this order (js/lake-picker.js). A region with no lakes yet is hidden. Every lake above sets
  // region to one of these ids; lat and lng above (the lake's NWS forecast point, on the water) give Near me distances.
  var REGIONS = [
    { id: "central", name: "Central Ohio" },
    { id: "northeast", name: "Northeast Ohio" },
    { id: "northwest", name: "Northwest Ohio" },
    { id: "southwest", name: "Southwest Ohio" },
    { id: "southeast", name: "Southeast Ohio" },
    { id: "erie", name: "Lake Erie" }
  ];
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

  // site root, so pages in species/ and alum/ can find assets (lakes.js is always loaded as <root>/js/lakes.js)
  var BASE = "";
  try { BASE = document.currentScript.src.replace(/js\/lakes\.js(\?.*)?$/, ""); } catch (e) {}
  // a lake's home page: the root for Hoover, <id>/ for the others
  function homeFor(lake) { return BASE + (lake === "hoover" ? "" : lake + "/"); }

  var homeMeta = document.querySelector('meta[name="nb-home"]');
  var homeLake = homeMeta ? valid(homeMeta.getAttribute("content")) : null;   // set on the lake home pages only
  var fromUrl = null, stored = null;
  try { fromUrl = valid(new URLSearchParams(location.search).get("lake")); } catch (e) {}
  try { stored = valid(localStorage.getItem(KEY)); } catch (e) {}
  var id = homeLake && homeLake !== "hoover" ? homeLake : (fromUrl || stored || "hoover");
  if (id !== stored && (fromUrl || (homeLake && homeLake !== "hoover"))) { try { localStorage.setItem(KEY, id); } catch (e) {} }

  // the root home page with another lake chosen: open that lake's own address instead
  if (homeLake === "hoover" && id !== "hoover" && BASE) {
    try { location.replace(homeFor(id) + location.hash); } catch (e) {}
  }

  // keep the address bar honest: a lake's home page has no ?lake=; elsewhere ?lake= for every lake but Hoover
  try {
    var u = new URL(location.href);
    if (id === "hoover" || homeLake) u.searchParams.delete("lake"); else u.searchParams.set("lake", id);
    if (u.href !== location.href) history.replaceState(history.state, "", u.href);
  } catch (e) {}

  var root = document.documentElement;
  root.setAttribute("data-lake", id);
  // hide every other lake's blocks (data-for, data-lakes) before first paint; generated from the id, so a new lake needs no CSS
  try {
    var hide = document.createElement("style");
    hide.textContent = 'html[data-lake="' + id + '"] [data-for]:not([data-for~="' + id + '"]),html[data-lake="' + id + '"] [data-lakes]:not([data-lakes~="' + id + '"]){display:none!important}';
    (document.head || root).appendChild(hide);
  } catch (e) {}
  root.style.setProperty("--lake-short", '"' + LAKES[id].short + '"');

  // same page, other lake (the picker navigates here; a cross-document view transition fades between them).
  // On a home page that is the other lake's home page.
  function hrefFor(next) {
    if (homeLake) return homeFor(next);
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

  // USGS lake gauges (Hoover, Buckeye Lake, O'Shaughnessy, Griggs, Indian Lake). The legacy WaterServices IV API (waterservices.usgs.gov/nwis/iv) slows down
  // from Nov. 16, 2026 and is switched off Feb. 22, 2027 (DATA-SOURCES.md). So every reading asks the new USGS Water
  // Data API first (api.waterdata.usgs.gov/ogcapi, public, CORS open, no key) and only tries the legacy API if the
  // new one errors, rate limits or takes longer than 8 seconds. Both give the same provisional readings; the legacy
  // fallback can be deleted after Feb. 22, 2027. window.NightBiteUsgsVia says which one answered last (for testing).
  var USGS_API = "https://api.waterdata.usgs.gov/ogcapi/v1/collections/";
  var USGS_IV = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=";
  function getJson(url, ms) {
    var ctl = ms && window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms) : 0;
    return fetch(url, ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) { clearTimeout(timer); return j; }, function (e) { clearTimeout(timer); throw e; });
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) && n > -9999 ? n : null; }
  function via(which, x) { window.NightBiteUsgsVia = which; return x; }
  // legacy IV JSON: { code: [{ value, dateTime }] } oldest first
  function ivSeries(json) {
    var out = {}, ts = (json && json.value && json.value.timeSeries) || [];
    ts.forEach(function (s) {
      try {
        var code = String(s.variable.variableCode[0].value), list = [];
        (s.values[0].value || []).forEach(function (v) { var n = num(v.value); if (n !== null) list.push({ value: n, dateTime: v.dateTime }); });
        out[code] = list;
      } catch (e) {}
    });
    return out;
  }
  // latest reading per parameter code: { "62614": { value, dateTime }, "00010": {...} }; a code with no reading is left out
  function usgsLatest(site, codes) {
    var url = USGS_API + "latest-continuous/items?f=json&monitoring_location_id=USGS-" + site + "&parameter_code=" + codes.join(",") +
      "&skipGeometry=true&properties=parameter_code,time,value";
    return getJson(url, 8000).then(function (j) {
      var out = {};
      (j.features || []).forEach(function (f) {
        var p = f && f.properties, n = p && num(p.value);
        if (n === null || !p.time) return;
        var prev = out[p.parameter_code];
        if (!prev || new Date(p.time) > new Date(prev.dateTime)) out[p.parameter_code] = { value: n, dateTime: p.time };
      });
      if (!out[codes[0]]) throw new Error("no reading");
      return via("ogcapi", out);
    }).catch(function () {
      return getJson(USGS_IV + site + "&parameterCd=" + codes.join(",")).then(function (j) {
        var s = ivSeries(j), out = {};
        codes.forEach(function (c) { if (s[c] && s[c].length) out[c] = s[c][s[c].length - 1]; });
        return via("waterservices", out);
      });
    });
  }
  // one parameter over the last `days` days: [{ t, v, iso }] oldest first, the same shape as cwmsFor()
  function usgsSeries(site, code, days) {
    var url = USGS_API + "continuous/items?f=json&monitoring_location_id=USGS-" + site + "&parameter_code=" + code +
      "&time=P" + days + "D&skipGeometry=true&properties=time,value&limit=5000";
    function pts(list) { return list.map(function (r) { return { t: new Date(r.dateTime).valueOf(), v: r.value, iso: r.dateTime }; }); }
    return getJson(url, 8000).then(function (j) {
      var list = [];
      (j.features || []).forEach(function (f) { var p = f && f.properties, n = p && num(p.value); if (n !== null && p.time) list.push({ value: n, dateTime: p.time }); });
      if (!list.length) throw new Error("no readings");
      list.sort(function (a, b) { return new Date(a.dateTime) - new Date(b.dateTime); });
      return via("ogcapi", pts(list));
    }).catch(function () {
      return getJson(USGS_IV + site + "&parameterCd=" + code + "&period=P" + days + "D").then(function (j) {
        return via("waterservices", pts(ivSeries(j)[code] || []));
      });
    });
  }

  // per-lake data files: "what's biting" (js/biting-data.js for Hoover, js/biting-data-lakes.js for the rest) and the
  // map data (js/hoover-map-data.js, js/lake-map-data-<id>.js). One rule for every lake, so a new lake needs no edits here.
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function bitingVar(lake) { return lake === "hoover" ? "NightBiteBiting" : "NightBiteBiting" + cap(lake); }
  function mapFile(lake) { return lake === "hoover" ? "hoover-map-data.js" : "lake-map-data-" + lake + ".js"; }

  window.NightBiteLakes = { all: LAKES, order: ORDER, regions: REGIONS, speciesNames: SPECIES, storageKey: KEY, hrefFor: hrefFor, homeFor: homeFor, base: BASE, cwmsFor: cwmsFor,
    usgsLatest: usgsLatest, usgsSeries: usgsSeries, bitingVar: bitingVar, mapFile: mapFile };
  window.NightBiteLake = { id: id, cfg: LAKES[id], key: key, cwms: cwms, home: homeLake };

  // Lake switches only (js/lake-picker.js sets the flag): a short cross-fade into the new page.
  // Registered here in <head> so it is in place before the first frame; every other navigation stays instant.
  // revealing: true from the first frame until this page's own fade in has finished. A switch picked inside that
  // window skips its fade out, so two fades never overlap (Chrome aborts the second with "Page already revealed").
  var revealing = true;
  function revealed() { revealing = false; }
  function vt(e, clear) {
    var switching = false;
    try { switching = sessionStorage.getItem("nb-lake-switch") === "1"; if (clear) sessionStorage.removeItem("nb-lake-switch"); } catch (er) {}
    var t = e.viewTransition;
    if (!t) { if (clear) revealed(); return; }
    // a skipped or interrupted fade (quick lake switches) rejects these; nothing to do, so keep the console quiet
    var quiet = function () {};
    try { [t.ready, t.finished, t.updateCallbackDone].forEach(function (pr) { if (pr && pr.catch) pr.catch(quiet); }); } catch (er) {}
    var busy = !clear && (revealing || document.activeViewTransition);
    if (!switching || busy) { try { t.skipTransition(); } catch (er) {} }
    if (clear) { try { t.finished.then(revealed, revealed); } catch (er) { revealed(); } }
  }
  window.addEventListener("pagereveal", function (e) { vt(e, true); });
  // back or forward from the browser cache shows this page's lake again, so make it the saved lake too; otherwise the
  // next Water or Species link would open whichever lake was picked last on another page
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { try { if (localStorage.getItem(KEY) !== id) localStorage.setItem(KEY, id); } catch (er) {} }
  });
  window.addEventListener("pageswap", function (e) { vt(e, false); });

  // fill [data-lk="name|short|area"] once the page is parsed (Hoover markup already says Hoover)
  function fill() {
    if (id !== "hoover") {
      var nodes = document.querySelectorAll("[data-lk]");
      for (var i = 0; i < nodes.length; i++) {
        var v = LAKES[id][nodes[i].getAttribute("data-lk")];
        if (typeof v === "string" && nodes[i].textContent !== v) nodes[i].textContent = v;
      }
      // Home links (logo, nav, footer) go straight to this lake's home page. Links that pick a lake (a[data-lake], the
      // picker rows) are left alone: rewriting those once sent the Hoover link to the lake already open (v42, v43).
      var root0 = BASE.replace(/[?#].*$/, ""), links = document.querySelectorAll("a[href]:not([data-lake])");
      for (var j = 0; j < links.length; j++) {
        var a = links[j], h = a.href.replace(/[?#].*$/, "");
        if (h === root0 || h === root0 + "index.html" || h === root0 + "index") a.href = homeFor(id) + (a.hash || "");
      }
    }
    root.classList.add("lk-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill);
  else fill();
})();
