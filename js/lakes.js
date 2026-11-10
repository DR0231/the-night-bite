/**
 * The Night Bite: per-lake settings and the active lake.
 * Loaded in <head> on every page (before any other script), so html[data-lake] is set before first paint and the
 * lake-only blocks ([data-for="alum"] and so on, see css/styles.css) never flash the wrong lake.
 *
 * Active lake: ?lake=<id> in the URL first, then localStorage "nb-lake" (the last water chosen on this device, the id
 * only), then Hoover for pages that need a lake before one is chosen.
 * Home pages have their own address per lake: <id>/ for every lake, Hoover too (hoover/, alum/, buckeye/ ...). Those
 * index.html files are built from tools/lake-home.html by tools/build-lake-pages.py and carry
 * <meta name="nb-home" content="<id>">. On a lake's own home page that lake always wins and becomes the saved lake, so a
 * shared link like berlin/ opens Berlin and remembers it.
 * The site root (<meta name="nb-root">) is the water picker. With a saved lake (or a ?lake= link) it goes straight to that
 * lake's home page (location.replace, here in <head>, before anything paints); ?pick keeps the picker open instead.
 * "Just browsing" (hoover/?browse) opens Hoover's home page without saving it; see "browsing" below.
 * Other pages keep ?lake= in the address bar for every lake but Hoover, a clean URL for Hoover, and once a lake is
 * chosen their Home links point at that lake's home page.
 *
 * Also the shared gauge fetchers: USGS (usgsLatest, usgsSeries: new Water Data API first, legacy IV as fallback) and the
 * Corps CWMS API (cwmsFor, Alum Creek, Delaware Lake, Deer Creek Lake, Dillon Lake and Burr Oak Lake), plus the Corps outflow water
 * temperature where pool.outflow is set (outflowTemp: Alum Creek, Deer Creek Lake), always labelled outflow, never lake surface. Madison Lake, Knox Lake,
 * Clear Fork Reservoir, Lake Logan, Salt Fork Lake and Dow Lake have no public lake gauge (pool.src null): nothing is fetched and the pool card says so.
 * Pymatuning Lake has a USGS gauge that stopped reporting (pool.src null plus pool.stale): the pool card names the gauge and its last date, never its old reading as current. js/usgs.js, js/pool-trend.js and js/lake-picker.js all use them.
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
      /* nb:hoover-ramps (tools/build-hoover-ramps.py) */ spots: ["Oxbow Road ramp", "Sunbury Road ramp", "Twin Bridges ramp", "Red Bank ramp", "Walnut Street ramp", "Hoover Mudflats Boardwalk"], spotAliases: {"Oxbow (upper ramp)": "Oxbow Road ramp", "Oxbow": "Oxbow Road ramp", "Redbank (middle ramp)": "Red Bank ramp", "Redbank": "Red Bank ramp", "Maxtown": "Red Bank ramp", "Maxtown ramp": "Red Bank ramp", "Walnut Road (lower ramp)": "Walnut Street ramp", "Walnut Road": "Walnut Street ramp", "Walnut Road (public)": "Walnut Street ramp", "Other / not sure": "Other public area", "Other public / not sure": "Other public area"},
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
        temp: null,     // lake surface temperature: none posted
        // USACE outflow water temperature, hourly (CWMS LRH, checked Nov. 9, 2026). Shown labelled "outflow" on the pool
        // card and the glance strip, never as lake surface temperature, and never fed to the bite rating.
        outflow: { office: "LRH", ts: "AlumCr-Outflow.Temp-Water.Inst.1Hour.0.OBS", url: "https://water.usace.army.mil/office/lrh/project/alumcr" },
        fullPool: 888,
        gaugeUrl: "https://water.usace.army.mil/overview/lrh/locations/alumcr",
        snapshot: { line: "886.45 ft · 60°F outflow · ~1.5 ft below full pool", at: "2026-11-09T15:00:00-05:00", when: "2026-11-09 15:00 ET" }
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
        temp: null,     // lake surface temperature: none posted
        // USACE outflow water temperature, hourly (CWMS LRH, checked Nov. 9, 2026): labelled "outflow", never lake surface, not in the bite rating
        outflow: { office: "LRH", ts: "DeerCr-Outflow.Temp-Water.Inst.1Hour.0.OBS", url: "https://water.usace.army.mil/office/lrh/project/deercr" },
        fullPool: 810.5,   // ODNR fishing map pool
        gaugeUrl: "https://water.usace.army.mil/overview/lrh/locations/deercr",
        snapshot: { line: "802.19 ft · 53°F outflow · ~8.3 ft below full pool", at: "2026-11-09T15:00:00-05:00", when: "2026-11-09 15:00 ET" }
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
    },
    seneca: {
      id: "seneca",
      name: "Seneca Lake",
      short: "Seneca Lake",
      area: "East central Ohio",
      lat: 39.91, lng: -81.4,
      region: "southeast", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Seneca", "Seneca Lake Park", "Senecaville", "Senecaville Lake", "MWCD"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03141000", param: "62614", temp: null,   // Seneca Lake near Senecaville: lake elevation only, no water temp
        fullPool: 832,     // ODNR fishing map summer pool
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03141000/",
        snapshot: { line: "832.74 ft · no temp · ~0.7 ft above full pool", at: "2026-10-31T11:15:00-04:00", when: "2026-10-31 11:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/32,37/forecast/hourly",
        point: "https://api.weather.gov/points/39.91,-81.4",
        grid: "https://api.weather.gov/gridpoints/PBZ/32,37",
        station: "KZZV", stationName: "Zanesville airport (KZZV)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.91&lon=-81.4"
      },
      alerts: { zones: "OHC121,OHC059,OHZ068,OHZ058", counties: "the Seneca Lake area" },
      push: null,
      map: { data: "NightBiteMapDataSeneca", chart: "assets/seneca-chart.png" },
      spots: ["Seneca Lake Marina ramp", "Lake Park ramps", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "blue-catfish", "white-bass", "largemouth-bass", "smallmouth-bass", "white-crappie", "black-crappie", "bluegill", "yellow-perch"]
    },
    dillon: {
      id: "dillon",
      name: "Dillon Lake",
      short: "Dillon Lake",
      area: "East central Ohio",
      lat: 40.02, lng: -82.12,
      region: "southeast", owner: "US Army Corps of Engineers",
      aliases: ["Dillon", "Dillon State Park", "Dillon Reservoir", "Nashport", "Zanesville"],
      pool: {
        // no USGS lake gauge; the Corps of Engineers posts the lake level every 15 minutes
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "Dillon-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // no public lake temperature gauge
        fullPool: 737,     // ODNR fishing map summer pool
        gaugeUrl: "https://water.usace.army.mil/overview/lrh/locations/dillon",
        snapshot: { line: "737.38 ft · no temp · ~0.4 ft above full pool", at: "2026-10-31T11:15:00-04:00", when: "2026-10-31 11:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/6,40/forecast/hourly",
        point: "https://api.weather.gov/points/40.02,-82.12",
        grid: "https://api.weather.gov/gridpoints/PBZ/6,40",
        station: "KZZV", stationName: "Zanesville airport (KZZV)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.02&lon=-82.12"
      },
      alerts: { zones: "OHC119,OHZ057", counties: "the Dillon Lake area" },
      push: null,
      map: { data: "NightBiteMapDataDillon", chart: "assets/dillon-chart.png" },
      spots: ["Marina ramp (east arm)", "Big Run ramp", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "hybrid-striped-bass", "blue-catfish", "channel-catfish", "largemouth-bass", "smallmouth-bass", "white-crappie", "black-crappie", "bluegill"]
    },
    logan: {
      id: "logan",
      name: "Lake Logan",
      short: "Lake Logan",
      area: "Southeast Ohio",
      lat: 39.538, lng: -82.466,
      region: "southeast", owner: "ODNR Ohio State Parks",
      aliases: ["Logan", "Lake Logan State Park", "Hocking Lake", "Hocking Hills"],
      pool: {
        // no public lake level or temperature gauge: the pool card says so, nothing is fetched
        src: null, srcName: null,
        temp: null,
        fullPool: 759,     // ODNR fishing map summer pool
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/105,64/forecast/hourly",
        point: "https://api.weather.gov/points/39.538,-82.466",
        grid: "https://api.weather.gov/gridpoints/ILN/105,64",
        station: "KLHQ", stationName: "Lancaster airport (KLHQ)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.538&lon=-82.466"
      },
      alerts: { zones: "OHC073,OHZ074", counties: "the Lake Logan area" },
      push: null,
      map: { data: "NightBiteMapDataLogan", chart: "assets/logan-chart.png" },
      spots: ["Main ramp (southeast side)", "Beach ramp (north shore)", "Below the dam", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "channel-catfish", "largemouth-bass", "muskellunge", "bluegill", "black-crappie", "white-crappie"]
    },
    saltfork: {
      id: "saltfork",
      name: "Salt Fork Lake",
      short: "Salt Fork Lake",
      area: "East central Ohio",
      lat: 40.11, lng: -81.54,
      region: "southeast", owner: "ODNR Ohio State Parks",
      aliases: ["Salt Fork", "Salt Fork State Park", "Saltfork", "Cambridge", "Kimbolton"],
      pool: {
        // no public lake level or temperature gauge: the pool card says so, nothing is fetched
        src: null, srcName: null,
        temp: null,
        fullPool: 800,     // ODNR fishing map summer pool
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/26,46/forecast/hourly",
        point: "https://api.weather.gov/points/40.11,-81.54",
        grid: "https://api.weather.gov/gridpoints/PBZ/26,46",
        station: "KZZV", stationName: "Zanesville airport (KZZV)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.11&lon=-81.54"
      },
      alerts: { zones: "OHC059,OHZ058", counties: "the Salt Fork Lake area" },
      push: null,
      map: { data: "NightBiteMapDataSaltfork", chart: "assets/saltfork-chart.png" },
      spots: ["Sugartree Marina ramp", "Morning Glory ramp", "Bank (other)", "Kayak launch"],
      species: ["muskellunge", "saugeye", "walleye", "largemouth-bass", "smallmouth-bass", "white-bass", "white-crappie", "black-crappie", "bluegill", "yellow-perch"]
    },
    burroak: {
      id: "burroak",
      name: "Burr Oak Lake",
      short: "Burr Oak Lake",
      area: "Southeast Ohio",
      lat: 39.535, lng: -82.04,
      region: "southeast", owner: "ODNR Ohio State Parks",
      aliases: ["Burr Oak", "Burr Oak State Park", "Burr Oak Reservoir", "Tom Jenkins Dam", "Glouster"],
      pool: {
        // no USGS lake gauge; the Corps of Engineers posts the level behind Tom Jenkins Dam every 15 minutes
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "TomJenkins-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // no public lake temperature gauge
        fullPool: 721,     // ODNR fishing map summer pool
        gaugeUrl: "https://water.usace.army.mil/overview/lrh/locations/tomjenkins",
        snapshot: { line: "721.73 ft · no temp · ~0.7 ft above full pool", at: "2026-10-31T11:30:00-04:00", when: "2026-10-31 11:30 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/RLX/43,119/forecast/hourly",
        point: "https://api.weather.gov/points/39.535,-82.04",
        grid: "https://api.weather.gov/gridpoints/RLX/43,119",
        station: "KUNI", stationName: "Ohio University airport, Albany (KUNI)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.535&lon=-82.04"
      },
      alerts: { zones: "OHC115,OHC009,OHZ067,OHZ075", counties: "the Burr Oak Lake area" },
      push: null,
      map: { data: "NightBiteMapDataBurroak", chart: "assets/burroak-chart.png" },
      spots: ["Dock 1 ramp", "Lodge ramp", "Dock 4 ramp", "Dock 3 ramp", "Bank (other)", "Kayak launch"],
      species: ["largemouth-bass", "white-crappie", "black-crappie", "channel-catfish", "blue-catfish", "flathead-catfish", "bluegill"]
    },
    dow: {
      id: "dow",
      name: "Dow Lake",
      short: "Dow Lake",
      area: "Southeast Ohio",
      lat: 39.345, lng: -82.03,
      region: "southeast", owner: "ODNR Ohio State Parks",
      aliases: ["Dow", "Strouds Run", "Strouds Run State Park", "Athens"],
      pool: {
        // no public lake level or temperature gauge: the pool card says so, nothing is fetched
        src: null, srcName: null,
        temp: null,
        fullPool: 660,     // ODNR fishing map summer pool
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/RLX/44,111/forecast/hourly",
        point: "https://api.weather.gov/points/39.345,-82.03",
        grid: "https://api.weather.gov/gridpoints/RLX/44,111",
        station: "KUNI", stationName: "Ohio University airport, Albany (KUNI)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.345&lon=-82.03"
      },
      alerts: { zones: "OHC009,OHZ075", counties: "the Dow Lake area" },
      push: null,
      map: { data: "NightBiteMapDataDow", chart: "assets/dow-chart.png" },
      spots: ["Boat ramp (northeast edge)", "Bank by the dam", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "largemouth-bass", "white-crappie", "channel-catfish"]
    },
    mosquito: {
      id: "mosquito",
      name: "Mosquito Creek Lake",
      short: "Mosquito Creek Lake",
      area: "Northeast Ohio",
      lat: 41.33, lng: -80.76,
      region: "northeast", owner: "US Army Corps of Engineers",
      aliases: ["Mosquito", "Mosquito Lake", "Mosquito Lake State Park", "Cortland", "Mosquito Creek Reservoir"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03095000", param: "62615", temp: null,   // USGS 03095000 Mosquito Creek Lake near Cortland: lake elevation (62615, NAVD88), no water temp
        fullPool: 901,     // ODNR fishing map summer pool
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03095000/",
        snapshot: { line: "898.77 ft · no temp · ~2.2 ft below full pool", at: "2026-11-03T10:45:00-05:00", when: "2026-11-03 10:45 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/116,61/forecast/hourly",
        point: "https://api.weather.gov/points/41.33,-80.76",
        grid: "https://api.weather.gov/gridpoints/CLE/116,61",
        station: "KYNG",
        stationName: "Youngstown, Youngstown-Warren Regional Airport (KYNG)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.33&lon=-80.76"
      },
      alerts: { zones: "OHC155,OHZ023", counties: "the Mosquito Creek Lake area" },
      push: null,
      map: { data: "NightBiteMapDataMosquito", chart: "assets/mosquito-chart.png" },
      spots: ["SR 305 main ramp", "Causeway ramp (SR 88)", "Marina ramp", "Bank (other)", "Kayak launch"],
      species: ["walleye", "black-crappie", "white-crappie", "yellow-perch", "largemouth-bass", "channel-catfish", "bluegill"]
    },
    berlin: {
      id: "berlin",
      name: "Berlin Lake",
      short: "Berlin Lake",
      area: "Northeast Ohio",
      lat: 41.02, lng: -81.02,
      region: "northeast", owner: "US Army Corps of Engineers",
      aliases: ["Berlin", "Berlin Reservoir", "Berlin Center", "Deerfield", "Mill Creek"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03090000", param: "62615", temp: null,   // USGS 03090000 Berlin Lake near Berlin Center: lake elevation (62615, NAVD88), no water temp
        fullPool: 1024,     // Corps summer pool (top of conservation 1,024.01 ft); the ODNR map's 832 ft label is on another datum
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03090000/",
        snapshot: { line: "1016.08 ft · no temp · ~7.9 ft below full pool", at: "2026-11-03T11:00:00-05:00", when: "2026-11-03 11:00 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/109,46/forecast/hourly",
        point: "https://api.weather.gov/points/41.02,-81.02",
        grid: "https://api.weather.gov/gridpoints/CLE/109,46",
        station: "KYNG",
        stationName: "Youngstown, Youngstown-Warren Regional Airport (KYNG)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.02&lon=-81.02"
      },
      alerts: { zones: "OHC133,OHC099,OHC151,OHZ022,OHZ033,OHZ032", counties: "the Berlin Lake area" },
      push: null,
      map: { data: "NightBiteMapDataBerlin", chart: "assets/berlin-chart.png" },
      spots: ["Bonner Road ramp", "Mill Creek ramp", "German Church Road ramp", "Bank (other)", "Kayak launch"],
      species: ["walleye", "white-bass", "smallmouth-bass", "largemouth-bass", "black-crappie", "white-crappie", "channel-catfish"]
    },
    westbranch: {
      id: "westbranch",
      name: "West Branch Reservoir",
      short: "West Branch",
      area: "Northeast Ohio",
      lat: 41.14, lng: -81.11,
      region: "northeast", owner: "US Army Corps of Engineers",
      aliases: ["West Branch", "West Branch State Park", "Kirwan", "Michael J. Kirwan Reservoir", "Kirwan Reservoir", "Ravenna"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03092450", param: "62615", temp: null,   // USGS 03092450 West Branch Mahoning River at Kirwan Reservoir: lake elevation (62615, NAVD88), no water temp
        fullPool: 985.5,     // ODNR fishing map summer pool (Corps dock map: 985.06 summer, 980.56 winter)
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03092450/",
        snapshot: { line: "980.44 ft · no temp · ~5.1 ft below full pool", at: "2026-11-03T11:15:00-05:00", when: "2026-11-03 11:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/105,51/forecast/hourly",
        point: "https://api.weather.gov/points/41.14,-81.11",
        grid: "https://api.weather.gov/gridpoints/CLE/105,51",
        station: "KAKR",
        stationName: "Akron Fulton airport (KAKR)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.14&lon=-81.11"
      },
      alerts: { zones: "OHC133,OHZ022", counties: "the West Branch area" },
      push: null,
      map: { data: "NightBiteMapDataWestbranch", chart: "assets/westbranch-chart.png" },
      spots: ["East ramp", "West ramp", "Knapp Road ramp", "Marina fishing pier", "Bank (other)", "Kayak launch"],
      species: ["muskellunge", "walleye", "blue-catfish", "channel-catfish", "largemouth-bass", "smallmouth-bass", "white-bass", "black-crappie", "white-crappie", "yellow-perch", "bluegill", "bullhead"]
    },
    pymatuning: {
      id: "pymatuning",
      name: "Pymatuning Lake",
      short: "Pymatuning",
      area: "Northeast Ohio",
      lat: 41.58, lng: -80.525,
      region: "northeast", owner: "Pennsylvania (managed with ODNR)",
      aliases: ["Pymatuning", "Pymatuning Reservoir", "Pymatuning State Park", "Andover", "Jamestown"],
      pool: {
        src: null, srcName: null, temp: null,   // USGS 03100500 at Pymatuning Dam has posted nothing since June 4, 2026: no live level
        fullPool: 1008,    // ODNR fishing map summer pool
        gaugeUrl: null,
        stale: { site: "03100500", last: "1008.12 ft", lastWhen: "June 4, 2026", url: "https://waterdata.usgs.gov/monitoring-location/USGS-03100500/" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/123,73/forecast/hourly",
        point: "https://api.weather.gov/points/41.58,-80.525",
        grid: "https://api.weather.gov/gridpoints/CLE/123,73",
        station: "KGKJ",
        stationName: "Port Meadville Airport (KGKJ)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.58&lon=-80.525"
      },
      alerts: { zones: "OHC007,OHZ014", counties: "the Pymatuning area" },
      push: null,
      map: { data: "NightBiteMapDataPymatuning", chart: "assets/pymatuning-chart.png" },
      spots: ["Padanaram ramp", "Birches Landing ramp", "Campground ramp", "Bank (other)", "Kayak launch"],
      species: ["walleye", "muskellunge", "yellow-perch", "black-crappie", "white-crappie", "white-bass", "largemouth-bass", "smallmouth-bass", "channel-catfish", "bluegill"]
    },
    milton: {
      id: "milton",
      name: "Lake Milton",
      short: "Lake Milton",
      area: "Northeast Ohio",
      lat: 41.1, lng: -80.98,
      region: "northeast", owner: "ODNR Ohio State Parks",
      aliases: ["Milton", "Lake Milton State Park", "Milton Reservoir", "Craig Beach", "Pricetown"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03091000", param: "62615", temp: null,   // USGS 03091000 Lake Milton at Lake Milton: lake elevation (62615, NAVD88), no water temp
        fullPool: 948,     // ODNR fishing map summer pool; fall drawdown of about 8 ft from Oct. 15
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03091000/",
        snapshot: { line: "944.02 ft · no temp · ~4.0 ft below full pool", at: "2026-11-03T10:45:00-05:00", when: "2026-11-03 10:45 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/110,50/forecast/hourly",
        point: "https://api.weather.gov/points/41.1,-80.98",
        grid: "https://api.weather.gov/gridpoints/CLE/110,50",
        station: "KYNG",
        stationName: "Youngstown, Youngstown-Warren Regional Airport (KYNG)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.1&lon=-80.98"
      },
      alerts: { zones: "OHC099,OHZ033", counties: "the Lake Milton area" },
      push: null,
      map: { data: "NightBiteMapDataMilton", chart: "assets/milton-chart.png" },
      spots: ["Robinson Point ramp", "Pointview ramp", "Miller's Landing ramp", "Bank (other)", "Kayak launch"],
      species: ["walleye", "muskellunge", "white-bass", "smallmouth-bass", "largemouth-bass", "black-crappie", "white-crappie", "channel-catfish", "bluegill", "yellow-perch", "bullhead"]
    },
    leesville: {
      id: "leesville",
      name: "Leesville Lake",
      short: "Leesville Lake",
      area: "East central Ohio",
      lat: 40.48, lng: -81.17,
      region: "northeast", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Leesville", "Leesville Lake Park", "MWCD", "Bowerston", "North Fork", "South Fork"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03120000", param: "62614", temp: null,   // USGS 03120000 Leesville Lake near Bowerston: lake elevation (62614), no water temp
        fullPool: 963,     // Corps summer pool; the ODNR map's 997 ft label is on another datum
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03120000/",
        snapshot: { line: "962.49 ft · no temp · ~0.5 ft below full pool", at: "2026-11-03T11:15:00-05:00", when: "2026-11-03 11:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/37,64/forecast/hourly",
        point: "https://api.weather.gov/points/40.48,-81.17",
        grid: "https://api.weather.gov/gridpoints/PBZ/37,64",
        station: "KPHD",
        stationName: "Harry Clever Field Airport (KPHD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.48&lon=-81.17"
      },
      alerts: { zones: "OHC019,OHZ040", counties: "the Leesville Lake area" },
      push: null,
      map: { data: "NightBiteMapDataLeesville", chart: "assets/leesville-chart.png" },
      spots: ["South Fork Marina ramp", "North Fork Marina ramp", "Bank (other)", "Kayak launch"],
      species: ["muskellunge", "saugeye", "hybrid-striped-bass", "largemouth-bass", "smallmouth-bass", "black-crappie", "white-crappie", "channel-catfish", "bluegill", "yellow-perch"]
    },
    grandlakestmarys: {
      id: "grandlakestmarys",
      name: "Grand Lake St. Marys",
      short: "Grand Lake St. Marys",
      area: "West central Ohio",
      lat: 40.52, lng: -84.5,
      region: "northwest", owner: "ODNR Ohio State Parks",
      aliases: ["Grand Lake", "GLSM", "Grand Lake St Marys", "Grand Lake Saint Marys", "Grand Lake St. Marys State Park", "Celina", "St. Marys", "Montezuma"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "403204084342601", param: "62614", temp: null,   // USGS 403204084342601 Grand Lake St Marys near Celina: lake elevation (62614, NGVD29), no water temp
        fullPool: 871,     // ODNR fishing map normal summer pool (2 ft contours)
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-403204084342601/",
        snapshot: { line: "870.79 ft · no temp · ~0.2 ft below full pool", at: "2026-11-09T15:15:00-05:00", when: "2026-11-09 15:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/31,102/forecast/hourly",
        point: "https://api.weather.gov/points/40.52,-84.5",
        grid: "https://api.weather.gov/gridpoints/ILN/31,102",
        station: "KAXV",
        stationName: "Wapakoneta airport (KAXV)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.52&lon=-84.5"
      },
      alerts: { zones: "OHC107,OHZ034", counties: "the Grand Lake St. Marys area" },
      push: null,
      map: { data: "NightBiteMapDataGrandlakestmarys", chart: "assets/grandlakestmarys-chart.png" },
      spots: ["Marina ramp", "Fries Channel ramp", "Boat Club ramp", "Campground ramp", "West Bank ramp", "Its It ramp", "Windy Point ramp", "Mercelina Park ramp", "Montezuma ramp", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "walleye", "black-crappie", "white-crappie", "yellow-perch", "channel-catfish", "flathead-catfish", "largemouth-bass", "bluegill", "bullhead", "common-carp"]
    },
    caesarcreek: {
      id: "caesarcreek",
      name: "Caesar Creek Lake",
      short: "Caesar Creek Lake",
      area: "Southwest Ohio",
      lat: 39.53, lng: -83.99,
      region: "southwest", owner: "US Army Corps of Engineers; ODNR Ohio State Parks",
      aliases: ["Caesar Creek", "Caesar Creek Reservoir", "Caesars Creek", "Caesar Creek State Park", "Waynesville", "Harveysburg"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03242340", param: "62614", temp: null,   // USGS 03242340 Caesar Creek Lake near Wellman: lake elevation (62614), no water temp
        // no live lake temperature: the Corps posts a dated temperature profile only (USACE Louisville District, checked Nov. 9, 2026).
        // Named with its date and link on the pool card and the glance strip, never shown as live and never fed to the bite rating.
        // The unlabeled daily CWMS series CaesarCreek.Temp-Water.Inst.~1Day.0.lrldlb-raw is not used.
        profile: { date: "2026-10-19", short: "Oct. 19", long: "Oct. 19, 2026", url: "https://www.lrl-wc.usace.army.mil/reports/wq/CCK.html" },
        fullPool: 849,     // ODNR fishing map normal summer pool; Corps top of conservation 849 ft (846 winter)
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03242340/",
        snapshot: { line: "846.91 ft · Corps profile Oct. 19 · ~2.1 ft below full pool", at: "2026-11-09T14:45:00-05:00", when: "2026-11-09 14:45 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/52,59/forecast/hourly",
        point: "https://api.weather.gov/points/39.53,-83.99",
        grid: "https://api.weather.gov/gridpoints/ILN/52,59",
        station: "KGDK",
        stationName: "Xenia airport (KGDK)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.53&lon=-83.99"
      },
      alerts: { zones: "OHC165,OHZ071", counties: "the Caesar Creek Lake area" },
      push: null,
      map: { data: "NightBiteMapDataCaesarcreek", chart: "assets/caesarcreek-chart.png" },
      spots: ["Wellman Meadows ramp", "Furnas Shores ramp", "North Pool ramp", "Campground ramp", "Haines ramp, Young Rd", "Dam and tailwater (Corps)", "Bank (other)", "Kayak launch"],
      species: ["muskellunge", "saugeye", "blue-catfish", "channel-catfish", "largemouth-bass", "smallmouth-bass", "white-bass", "black-crappie", "white-crappie", "yellow-perch"]
    },
    eastfork: {
      id: "eastfork",
      name: "East Fork Lake",
      short: "East Fork Lake",
      area: "Southwest Ohio",
      lat: 39.02, lng: -84.13,
      region: "southwest", owner: "US Army Corps of Engineers; ODNR Ohio State Parks",
      aliases: ["East Fork", "William H. Harsha Lake", "Harsha Lake", "Lake Harsha", "William H Harsha Lake", "East Fork State Park", "Batavia", "Bethel"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03247040", param: "62614", temp: null,   // USGS 03247040 East Fork Lake near Bantam: lake elevation (62614), no water temp
        // USACE outflow water temperature: the William H. Harsha Lake tailwater series, every 15 minutes (CWMS LRL, checked Nov. 9, 2026).
        // Labelled "outflow" everywhere, never lake surface temperature, never fed to the bite rating. The Corps also posts a dated
        // temperature profile (latest Oct. 16, 2026, https://www.lrl-wc.usace.army.mil/reports/wq/EFR.html), named on the pool card.
        outflow: { office: "LRL", ts: "WHHarshaTW.Temp-Water.Inst.15Minutes.0.USGS-raw", url: "https://cwms-data.usace.army.mil/cwms-data/timeseries?office=LRL&name=WHHarshaTW.Temp-Water.Inst.15Minutes.0.USGS-raw" },
        fullPool: 733,     // ODNR fishing map summer pool; ODNR winter pool 729 ft
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03247040/",
        snapshot: { line: "730.31 ft · 66°F outflow · ~2.7 ft below full pool", at: "2026-11-09T15:30:00-05:00", when: "2026-11-09 15:30 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/49,35/forecast/hourly",
        point: "https://api.weather.gov/points/39.02,-84.13",
        grid: "https://api.weather.gov/gridpoints/ILN/49,35",
        station: "KI69",
        stationName: "Batavia airport (KI69)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.02&lon=-84.13"
      },
      alerts: { zones: "OHC025,OHZ078", counties: "the East Fork Lake area" },
      push: null,
      map: { data: "NightBiteMapDataEastfork", chart: "assets/eastfork-chart.png" },
      spots: ["North Shore ramp", "Campground ramp", "Slade Road ramp", "Tate ramp", "Reisinger ramp", "Tunnel Mill ramp", "Hand launch (main beach)", "Bank (other)", "Kayak launch"],
      species: ["largemouth-bass", "smallmouth-bass", "black-crappie", "white-crappie", "bluegill", "hybrid-striped-bass", "saugeye", "blue-catfish", "white-bass"]
    },
    cjbrown: {
      id: "cjbrown",
      name: "C.J. Brown Reservoir",
      short: "C.J. Brown",
      area: "Southwest Ohio",
      lat: 39.968, lng: -83.729,
      region: "southwest", owner: "US Army Corps of Engineers; ODNR Ohio State Parks",
      aliases: ["C.J. Brown", "CJ Brown", "Clarence J. Brown Reservoir", "CJ Brown Reservoir", "Buck Creek", "Buck Creek Lake", "Buck Creek State Park", "Springfield"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03268090", param: "62614", temp: null,   // USGS 03268090 Clarence J Brown Reservoir near Springfield: lake elevation (62614, NGVD29), no water temp
        // no live lake temperature: the Corps posts a dated temperature profile only (USACE Louisville District, checked Nov. 9, 2026).
        // Named with its date and link on the pool card and the glance strip, never shown as live and never fed to the bite rating.
        // The unlabeled daily CWMS series is not used. USGS 03268100 (Buck Creek below the dam) is a stream gauge and is not used either.
        profile: { date: "2026-10-07", short: "Oct. 7", long: "Oct. 7, 2026", url: "https://www.lrl-wc.usace.army.mil/reports/wq/CBR.html" },
        fullPool: 1012,     // ODNR fishing map normal summer pool (5 ft contours)
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03268090/",
        snapshot: { line: "1009.89 ft · Corps profile Oct. 7 · ~2.1 ft below full pool", at: "2026-11-09T18:45:00-05:00", when: "2026-11-09 18:45 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/60,79/forecast/hourly",
        point: "https://api.weather.gov/points/39.968,-83.729",
        grid: "https://api.weather.gov/gridpoints/ILN/60,79",
        station: "KSGH",
        stationName: "Springfield airport (KSGH)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.968&lon=-83.729"
      },
      alerts: { zones: "OHC023,OHZ053", counties: "the C.J. Brown area" },
      push: null,
      map: { data: "NightBiteMapDataCjbrown", chart: "assets/cjbrown-chart.png" },
      spots: ["Main ramp (Buck Creek Lane)", "Marina ramp", "North End ramp", "Corps area, Grant Rd", "Marina fishing pier", "Bank (other)", "Kayak launch"],
      species: ["walleye", "saugeye", "muskellunge", "largemouth-bass", "smallmouth-bass", "white-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish"]
    },
    rockyfork: {
      id: "rockyfork",
      name: "Rocky Fork Lake",
      short: "Rocky Fork",
      area: "Southwest Ohio",
      lat: 39.186, lng: -83.482,
      region: "southwest", owner: "ODNR Ohio State Parks",
      aliases: ["Rocky Fork", "Rocky Fork State Park", "Hillsboro"],
      pool: {
        // no public lake level or temperature gauge (USGS 391111083263200 was a 1975 water quality site only)
        src: null, srcName: null,
        temp: null,
        fullPool: 880,    // ODNR fishing map summer pool (3 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/71,45/forecast/hourly",
        point: "https://api.weather.gov/points/39.186,-83.482",
        grid: "https://api.weather.gov/gridpoints/ILN/71,45",
        station: "KILN",
        stationName: "Wilmington airport (KILN)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.186&lon=-83.482"
      },
      alerts: { zones: "OHC071,OHZ080", counties: "the Rocky Fork area" },
      push: null,
      map: { data: "NightBiteMapDataRockyfork", chart: "assets/rockyfork-chart.png" },
      spots: ["North Beach ramp", "Campground ramp", "East Shore ramp", "East Shore Drive ramp", "South Beach ramp", "Fishermans Wharf ramp", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "largemouth-bass", "black-crappie", "white-crappie", "white-bass", "channel-catfish", "flathead-catfish", "bluegill", "yellow-perch", "common-carp"]
    },
    ladue: {
      id: "ladue",
      name: "LaDue Reservoir",
      short: "LaDue",
      area: "Northeast Ohio",
      lat: 41.379, lng: -81.217,
      region: "northeast", owner: "City of Akron; fishery managed by ODNR Division of Wildlife",
      aliases: ["LaDue", "La Due", "Ladue Reservoir", "La Due Reservoir", "Wendell R. LaDue Reservoir", "Auburn"],
      pool: {
        // no public lake level or temperature gauge (USGS 04201900 Ladue Reservoir near Burton posts no data)
        src: null, srcName: null,
        temp: null,
        fullPool: 1127,    // ODNR fishing map summer pool (3 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/100,61/forecast/hourly",
        point: "https://api.weather.gov/points/41.379,-81.217",
        grid: "https://api.weather.gov/gridpoints/CLE/100,61",
        station: "KBKL",
        stationName: "Cleveland Burke Lakefront airport (KBKL)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.379&lon=-81.217"
      },
      alerts: { zones: "OHC055,OHZ013", counties: "the LaDue area" },
      push: null,
      map: { data: "NightBiteMapDataLadue", chart: "assets/ladue-chart.png" },
      spots: ["SR 44 ramp", "Auburn Rd ramp", "Boat house, Valley Rd", "Bank (other)", "Kayak launch"],
      species: ["walleye", "saugeye", "largemouth-bass", "smallmouth-bass", "black-crappie", "white-crappie", "channel-catfish", "bluegill", "yellow-perch"]
    },
    paintcreek: {
      id: "paintcreek",
      name: "Paint Creek Lake",
      short: "Paint Creek",
      area: "Southwest Ohio",
      lat: 39.269, lng: -83.397,
      region: "southwest", owner: "US Army Corps of Engineers; ODNR Ohio State Parks",
      aliases: ["Paint Creek", "Paint Creek State Park", "Bainbridge", "Greenfield"],
      pool: {
        // no live USGS gauge on the lake (USGS 03232460 posts no data); the Corps of Engineers posts the lake level every 15 minutes
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "PaintCr-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // lake surface temperature: none posted
        // USACE outflow water temperature, hourly (CWMS LRH, checked Nov. 9, 2026): labelled "outflow", never lake surface, not in the bite rating
        outflow: { office: "LRH", ts: "PaintCr-Outflow.Temp-Water.Inst.1Hour.0.OBS", url: "https://water.usace.army.mil/office/lrh/project/paintcr" },
        fullPool: 798,     // ODNR fishing map normal summer pool; the Corps rule curve holds 798 ft in summer and 787.5 ft in winter
        gaugeUrl: "https://water.usace.army.mil/office/lrh/project/paintcr",
        snapshot: { line: "793.58 ft · 56°F outflow · ~4.4 ft below full pool", at: "2026-11-09T19:30:00-05:00", when: "2026-11-09 19:30 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/74,49/forecast/hourly",
        point: "https://api.weather.gov/points/39.269,-83.397",
        grid: "https://api.weather.gov/gridpoints/ILN/74,49",
        station: "KI23",
        stationName: "Washington Court House airport (KI23)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.269&lon=-83.397"
      },
      alerts: { zones: "OHC071,OHZ080", counties: "the Paint Creek area" },
      push: null,
      map: { data: "NightBiteMapDataPaintcreek", chart: "assets/paintcreek-chart.png" },
      spots: ["Taylor Rd ramp (campground)", "Deer Park ramp", "Rattlesnake ramp", "Marina", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "largemouth-bass", "white-bass", "black-crappie", "white-crappie", "channel-catfish", "bluegill"]
    },
    portagelakes: {
      id: "portagelakes",
      name: "Portage Lakes",
      short: "Portage Lakes",
      area: "Northeast Ohio",
      lat: 40.985, lng: -81.54,
      region: "northeast", owner: "ODNR Ohio State Parks",
      aliases: ["Portage Lakes", "Turkeyfoot Lake", "Turkeyfoot", "East Reservoir", "West Reservoir", "North Reservoir", "Long Lake", "Rex Lake", "Portage Lakes State Park", "Akron", "New Franklin"],
      pool: {
        // no public lake level or temperature gauge (USGS 405747081321700 was a 1977 water quality site; the Long Lake feeder gauge is on the canal)
        src: null, srcName: null,
        temp: null,
        fullPool: null,    // the ODNR fishing map prints no pool elevation
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/91,42/forecast/hourly",
        point: "https://api.weather.gov/points/40.985,-81.54",
        grid: "https://api.weather.gov/gridpoints/CLE/91,42",
        station: "KAKR",
        stationName: "Akron Fulton airport (KAKR)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.985&lon=-81.54"
      },
      alerts: { zones: "OHC153,OHZ021", counties: "the Portage Lakes area" },
      push: null,
      map: { data: "NightBiteMapDataPortagelakes", chart: "assets/portagelakes-chart.png" },
      spots: ["Turkeyfoot ramp (New Ramp)", "Old State Park ramp", "North Reservoir ramp", "Long Lake ramp", "New Ramp fishing pier", "Bank (other)", "Kayak launch"],
      species: ["largemouth-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "bullhead", "common-carp"]
    },
    mogadore: {
      id: "mogadore",
      name: "Mogadore Reservoir",
      short: "Mogadore",
      area: "Northeast Ohio",
      lat: 41.062, lng: -81.35,
      region: "northeast", owner: "City of Akron; fishery managed by ODNR Division of Wildlife",
      aliases: ["Mogadore", "Mogadore Lake", "Mogadore Reservoir Fishing Area"],
      pool: {
        // no public lake level or temperature gauge (USGS 04203990 Mogadore Reservoir at Mogadore posts no data)
        src: null, srcName: null,
        temp: null,
        fullPool: 1090,    // ODNR fishing map summer pool (3 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/97,46/forecast/hourly",
        point: "https://api.weather.gov/points/41.062,-81.35",
        grid: "https://api.weather.gov/gridpoints/CLE/97,46",
        station: "KAKR",
        stationName: "Akron Fulton airport (KAKR)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.062&lon=-81.35"
      },
      alerts: { zones: "OHC133,OHZ022", counties: "the Mogadore area" },
      push: null,
      map: { data: "NightBiteMapDataMogadore", chart: "assets/mogadore-chart.png" },
      spots: ["Boat house, SR 43", "Ticknor Rd ramp", "Boat stake area, Lansinger Rd", "Bank (other)", "Kayak launch"],
      species: ["largemouth-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish"]
    },
    loramie: {
      id: "loramie",
      name: "Lake Loramie",
      short: "Lake Loramie",
      area: "West central Ohio",
      lat: 40.376, lng: -84.323,
      region: "northwest", owner: "ODNR Ohio State Parks",
      aliases: ["Loramie", "Lake Loramie State Park", "Minster", "Fort Loramie"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03261800", param: "62615", temp: null,   // USGS 03261800 Lake Loramie near Fort Loramie: lake elevation (62615, NAVD88), no water temp
        fullPool: 955,     // ODNR fishing map normal summer pool (2 ft contours); the map names no datum and USGS reads in NAVD88, so the difference is approximate
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03261800/",
        snapshot: { line: "953.81 ft · no temp · ~1.2 ft below full pool", at: "2026-11-09T19:00:00-05:00", when: "2026-11-09 19:00 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/38,96/forecast/hourly",
        point: "https://api.weather.gov/points/40.376,-84.323",
        grid: "https://api.weather.gov/gridpoints/ILN/38,96",
        station: "KAXV",
        stationName: "Wapakoneta airport (KAXV)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.376&lon=-84.323"
      },
      alerts: { zones: "OHC149,OHZ043", counties: "the Lake Loramie area" },
      push: null,
      map: { data: "NightBiteMapDataLoramie", chart: "assets/loramie-chart.png" },
      spots: ["Campground ramp", "West Bank ramp", "Earl's Island ramp", "Filburn's ramp", "Luthman Rd ramp", "Schmitmeyer-Baker access", "Fishing pier", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "largemouth-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "bullhead", "common-carp"]
    },
    nimisila: {
      id: "nimisila",
      name: "Nimisila Reservoir",
      short: "Nimisila",
      area: "Northeast Ohio",
      lat: 40.938, lng: -81.523,
      region: "northeast", owner: "ODNR Division of Wildlife (fishery); Summit Metro Parks manages the park land",
      aliases: ["Nimisila", "Nimisila Lake", "Lake Nimisila", "Nimisila Reservoir Fishing Area", "New Franklin"],
      pool: {
        // no public lake level or temperature gauge (USGS 03116400 Nimisila Reservoir near Barberton posts no data); ODNR says the lake is being lowered for a dam study (Nov. 3, 2026)
        src: null, srcName: null,
        temp: null,
        fullPool: 871,    // ODNR fishing map summer pool (5 ft contours); the lake is being lowered (ODNR, Nov. 3, 2026)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/92,40/forecast/hourly",
        point: "https://api.weather.gov/points/40.938,-81.523",
        grid: "https://api.weather.gov/gridpoints/CLE/92,40",
        station: "KCAK",
        stationName: "Akron Canton airport (KCAK)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.938&lon=-81.523"
      },
      alerts: { zones: "OHC153,OHZ021", counties: "the Nimisila area" },
      push: null,
      map: { data: "NightBiteMapDataNimisila", chart: "assets/nimisila-chart.png" },
      spots: ["C1 ramp", "C6 ramp", "CG ramp", "SM2 ramp", "Bank (other)", "Kayak launch"],
      species: ["walleye", "saugeye", "largemouth-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish"]
    },
    cowan: {
      id: "cowan",
      name: "Cowan Lake",
      short: "Cowan Lake",
      area: "Southwest Ohio",
      lat: 39.388, lng: -83.895,
      region: "southwest", owner: "ODNR Ohio State Parks",
      aliases: ["Cowan", "Cowan Lake State Park", "Wilmington", "Clarksville"],
      pool: {
        // no public lake level or temperature gauge (USGS 03243800 Cowan Lake near Clarksville has one 1980 sample); ODNR is drawing the lake down 13.5 ft from Nov. 1, 2026 for dam work
        src: null, srcName: null,
        temp: null,
        fullPool: 960,    // ODNR fishing map summer pool (5 ft contours); the lake is being drawn down 13.5 ft through 2028 (ODNR)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/56,53/forecast/hourly",
        point: "https://api.weather.gov/points/39.388,-83.895",
        grid: "https://api.weather.gov/gridpoints/ILN/56,53",
        station: "KILN",
        stationName: "Wilmington airport (KILN)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.388&lon=-83.895"
      },
      alerts: { zones: "OHC027,OHZ072", counties: "the Cowan Lake area" },
      push: null,
      map: { data: "NightBiteMapDataCowan", chart: "assets/cowan-chart.png" },
      spots: ["West End ramp", "South Shore Marina", "Campground ramp", "East End ramp", "Pine Tree fishing pier", "Bank (other)", "Kayak launch"],
      species: ["largemouth-bass", "saugeye", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "flathead-catfish"]
    },
    acton: {
      id: "acton",
      name: "Acton Lake",
      short: "Acton Lake",
      area: "Southwest Ohio",
      lat: 39.572, lng: -84.751,
      region: "southwest", owner: "ODNR Ohio State Parks",
      aliases: ["Acton", "Hueston Woods", "Hueston Woods State Park", "Oxford", "College Corner"],
      pool: {
        // no public lake level or temperature gauge (USGS 03272450 Acton Lake near Oxford posts no data)
        src: null, srcName: null,
        temp: null,
        fullPool: 863,    // ODNR fishing map summer pool (3 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/ILN/26,59/forecast/hourly",
        point: "https://api.weather.gov/points/39.572,-84.751",
        grid: "https://api.weather.gov/gridpoints/ILN/26,59",
        station: "KOXD",
        stationName: "Oxford airport (KOXD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=39.572&lon=-84.751"
      },
      alerts: { zones: "OHC135,OHZ060", counties: "the Acton Lake area" },
      push: null,
      map: { data: "NightBiteMapDataActon", chart: "assets/acton-chart.png" },
      spots: ["Main ramp", "Marina", "Lodge courtesy docks", "West shore fishing pier", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "largemouth-bass", "white-crappie", "black-crappie", "bluegill"]
    },
    tappan: {
      id: "tappan",
      name: "Tappan Lake",
      short: "Tappan Lake",
      area: "East central Ohio",
      lat: 40.342, lng: -81.173,
      region: "southeast", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Tappan", "Tappan Lake Park", "Deersville", "Scio", "MWCD"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03128000", param: "62614", temp: null,   // USGS 03128000 Tappan Lake at Tappan: lake elevation (62614, NGVD29), no water temp
        fullPool: 899.3,     // ODNR fishing map normal summer pool (3 ft contours); MWCD normal pool 899.30 ft
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03128000/",
        snapshot: { line: "898.95 ft · no temp · ~0.4 ft below full pool", at: "2026-11-09T20:15:00-05:00", when: "2026-11-09 20:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/37,57/forecast/hourly",
        point: "https://api.weather.gov/points/40.342,-81.173",
        grid: "https://api.weather.gov/gridpoints/PBZ/37,57",
        station: "KPHD",
        stationName: "Harry Clever Field Airport (KPHD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.342&lon=-81.173"
      },
      alerts: { zones: "OHC067,OHZ049", counties: "the Tappan Lake area" },
      push: null,
      map: { data: "NightBiteMapDataTappan", chart: "assets/tappan-chart.png" },
      spots: ["Tappan Lake Park ramp", "US 250 ramp", "Fire Station ramps", "Tappan Lake Marina", "Fishing piers", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "largemouth-bass", "smallmouth-bass", "white-bass", "white-crappie", "black-crappie", "bluegill", "channel-catfish", "yellow-perch"]
    },
    piedmont: {
      id: "piedmont",
      name: "Piedmont Lake",
      short: "Piedmont Lake",
      area: "East central Ohio",
      lat: 40.146, lng: -81.186,
      region: "southeast", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Piedmont", "Piedmont Marina", "Freeport", "MWCD"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03125500", param: "62614", temp: null,   // USGS 03125500 Piedmont Lake at Piedmont: lake elevation (62614, NGVD29), no water temp
        fullPool: 913,     // ODNR fishing map pool (3 ft contours); ODNR and MWCD give 913 ft
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03125500/",
        snapshot: { line: "912.19 ft · no temp · ~0.8 ft below full pool", at: "2026-11-09T20:15:00-05:00", when: "2026-11-09 20:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/38,49/forecast/hourly",
        point: "https://api.weather.gov/points/40.146,-81.186",
        grid: "https://api.weather.gov/gridpoints/PBZ/38,49",
        station: "KPHD",
        stationName: "Harry Clever Field Airport (KPHD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.146&lon=-81.186"
      },
      alerts: { zones: "OHC013,OHZ059", counties: "the Piedmont Lake area" },
      push: null,
      map: { data: "NightBiteMapDataPiedmont", chart: "assets/piedmont-chart.png" },
      spots: ["Piedmont Marina", "Reynolds Rd ramp and pier", "Kirkwood ramp", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "muskellunge", "walleye", "largemouth-bass", "smallmouth-bass", "white-bass", "white-crappie", "black-crappie", "bluegill"]
    },
    clendening: {
      id: "clendening",
      name: "Clendening Lake",
      short: "Clendening Lake",
      area: "East central Ohio",
      lat: 40.26, lng: -81.218,
      region: "southeast", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Clendening", "Clendening Marina", "Tippecanoe", "Freeport", "MWCD"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03126500", param: "62614", temp: null,   // USGS 03126500 Clendening Lake at Tippecanoe: lake elevation (62614, NGVD29), no water temp
        fullPool: 898,     // ODNR fishing map pool (5 ft contours); MWCD normal pool 898.00 ft
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03126500/",
        snapshot: { line: "897.92 ft · no temp · ~0.1 ft below full pool", at: "2026-11-09T20:15:00-05:00", when: "2026-11-09 20:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/36,54/forecast/hourly",
        point: "https://api.weather.gov/points/40.26,-81.218",
        grid: "https://api.weather.gov/gridpoints/PBZ/36,54",
        station: "KPHD",
        stationName: "Harry Clever Field Airport (KPHD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.26&lon=-81.218"
      },
      alerts: { zones: "OHC067,OHZ049", counties: "the Clendening Lake area" },
      push: null,
      map: { data: "NightBiteMapDataClendening", chart: "assets/clendening-chart.png" },
      spots: ["Clendening Marina", "Simpson Rd ramp", "County Rd 6 ramp", "Fishing pier", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "blue-catfish", "channel-catfish", "largemouth-bass", "white-bass", "white-crappie"]
    },
    atwood: {
      id: "atwood",
      name: "Atwood Lake",
      short: "Atwood Lake",
      area: "East central Ohio",
      lat: 40.544, lng: -81.239,
      region: "northeast", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Atwood", "Atwood Lake Park", "Dellroy", "Mineral City", "MWCD"],
      pool: {
        src: "usgs", srcName: "USGS",
        site: "03121000", param: "62614", temp: null,   // USGS 03121000 Atwood Lake near New Cumberland: lake elevation (62614, NGVD29), no water temp
        fullPool: 928,     // ODNR fishing map pool (3 ft contours); MWCD normal pool 928.00 ft
        gaugeUrl: "https://waterdata.usgs.gov/monitoring-location/USGS-03121000/",
        snapshot: { line: "927.56 ft · no temp · ~0.4 ft below full pool", at: "2026-11-09T20:15:00-05:00", when: "2026-11-09 20:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/34,66/forecast/hourly",
        point: "https://api.weather.gov/points/40.544,-81.239",
        grid: "https://api.weather.gov/gridpoints/PBZ/34,66",
        station: "KPHD",
        stationName: "Harry Clever Field Airport (KPHD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.544&lon=-81.239"
      },
      alerts: { zones: "OHC019,OHZ040", counties: "the Atwood Lake area" },
      push: null,
      map: { data: "NightBiteMapDataAtwood", chart: "assets/atwood-chart.png" },
      spots: ["Shop Rd ramp", "Atwood Marina West", "East marina", "Beach courtesy docks", "Fishing piers", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "blue-catfish", "channel-catfish", "largemouth-bass", "smallmouth-bass", "white-bass", "white-crappie", "black-crappie", "yellow-perch"]
    },
    charlesmill: {
      id: "charlesmill",
      name: "Charles Mill Lake",
      short: "Charles Mill",
      area: "Central Ohio",
      lat: 40.764, lng: -82.378,
      region: "central", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Charles Mill", "Charles Mill Reservoir", "Charles Mill Lake Park", "Mifflin", "Mansfield", "MWCD"],
      pool: {
        // USACE CWMS LRH CharlesMill-Lake.Elev, 15 minute lake elevation (USGS 03129500 posts no data); no water temp
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "CharlesMill-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // lake surface temperature: none posted
        fullPool: 997,     // ODNR fishing map pool (3 ft contours); MWCD normal pool 997.00 ft
        gaugeUrl: "https://water.usace.army.mil/office/lrh/basin/mus",
        snapshot: { line: "996.22 ft · no temp · ~0.8 ft below full pool", at: "2026-11-09T20:15:00-05:00", when: "2026-11-09 20:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/63,30/forecast/hourly",
        point: "https://api.weather.gov/points/40.764,-82.378",
        grid: "https://api.weather.gov/gridpoints/CLE/63,30",
        station: "KMFD",
        stationName: "Mansfield airport (KMFD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.764&lon=-82.378"
      },
      alerts: { zones: "OHC005,OHZ030", counties: "the Charles Mill area" },
      push: null,
      map: { data: "NightBiteMapDataCharlesmill", chart: "assets/charlesmill-chart.png" },
      spots: ["SR 430 ramp", "Charles Mill Marina", "Fishing pier", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "hybrid-striped-bass", "largemouth-bass", "white-crappie", "black-crappie", "channel-catfish"]
    },
    pleasanthill: {
      id: "pleasanthill",
      name: "Pleasant Hill Lake",
      short: "Pleasant Hill",
      area: "Central Ohio",
      lat: 40.636, lng: -82.349,
      region: "central", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Pleasant Hill", "Pleasant Hill Reservoir", "Pleasant Hill Lake Park", "Perrysville", "Mohican", "MWCD"],
      pool: {
        // USACE CWMS LRH PleasantHill-Lake.Elev, 15 minute lake elevation (USGS 03133000 posts no data); no water temp
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "PleasantHill-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // lake surface temperature: none posted
        fullPool: 1020,     // ODNR fishing map pool (3 ft contours); MWCD normal pool 1020.00 ft
        gaugeUrl: "https://water.usace.army.mil/office/lrh/basin/mus",
        snapshot: { line: "1020.80 ft · no temp · ~0.8 ft above full pool", at: "2026-11-09T20:15:00-05:00", when: "2026-11-09 20:15 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/65,24/forecast/hourly",
        point: "https://api.weather.gov/points/40.636,-82.349",
        grid: "https://api.weather.gov/gridpoints/CLE/65,24",
        station: "KMFD",
        stationName: "Mansfield airport (KMFD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.636&lon=-82.349"
      },
      alerts: { zones: "OHC139,OHZ029", counties: "the Pleasant Hill area" },
      push: null,
      map: { data: "NightBiteMapDataPleasanthill", chart: "assets/pleasanthill-chart.png" },
      spots: ["Pleasant Hill Marina ramp", "Beach area", "Fishing piers", "Bank (other)", "Kayak launch"],
      species: ["saugeye", "largemouth-bass", "smallmouth-bass", "white-bass", "white-crappie", "black-crappie", "bluegill", "channel-catfish", "bullhead", "yellow-perch"]
    },
    beachcity: {
      id: "beachcity",
      name: "Beach City Lake",
      short: "Beach City",
      area: "East central Ohio",
      lat: 40.632, lng: -81.569,
      region: "northeast", owner: "Muskingum Watershed Conservancy District",
      aliases: ["Beach City", "Beach City Reservoir", "Beach City Dam", "Dundee", "Brewster", "MWCD"],
      pool: {
        // USACE CWMS LRH BeachCity-Lake.Elev, 15 minute lake elevation (USGS 03123500 posts no data); no water temp
        src: "cwms", srcName: "USACE",
        office: "LRH", ts: "BeachCity-Lake.Elev.Inst.15Minutes.0.OBS",
        temp: null,     // lake surface temperature: none posted
        fullPool: 948,     // MWCD conservation (normal) pool; no ODNR contour map
        gaugeUrl: "https://water.usace.army.mil/office/lrh/basin/mus",
        snapshot: { line: "948.37 ft · no temp · ~0.4 ft above full pool", at: "2026-11-09T19:30:00-05:00", when: "2026-11-09 19:30 ET" }
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/23,69/forecast/hourly",
        point: "https://api.weather.gov/points/40.632,-81.569",
        grid: "https://api.weather.gov/gridpoints/PBZ/23,69",
        station: "KPHD",
        stationName: "Harry Clever Field Airport (KPHD)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.632&lon=-81.569"
      },
      alerts: { zones: "OHC157,OHZ039", counties: "the Beach City area" },
      push: null,
      map: { data: "NightBiteMapDataBeachcity", chart: "assets/beachcity-chart.png" },
      spots: ["Dam day use area", "Below the dam", "Bank (other)"],
      species: ["saugeye", "largemouth-bass", "white-crappie", "black-crappie", "bluegill", "bullhead", "common-carp"]
    },
    wingfoot: {
      id: "wingfoot",
      name: "Wingfoot Lake",
      short: "Wingfoot",
      area: "Northeast Ohio",
      lat: 41.016, lng: -81.36,
      region: "northeast", owner: "ODNR (Division of Wildlife and Ohio State Parks)",
      aliases: ["Wingfoot", "Wingfoot Lake State Park", "Wingfoot Lake Wildlife Area", "Suffield", "Goodyear"],
      pool: {
        // no public lake level or temperature gauge (USGS 410106081222500 Wingfoot Lk Goodyear Tire is a sampling site, no live data)
        src: null, srcName: null,
        temp: null,
        fullPool: 1162,    // ODNR fishing map summer pool (3 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/97,44/forecast/hourly",
        point: "https://api.weather.gov/points/41.016,-81.36",
        grid: "https://api.weather.gov/gridpoints/CLE/97,44",
        station: "KAKR",
        stationName: "Akron, Akron Fulton International Airport (KAKR)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.016&lon=-81.36"
      },
      alerts: { zones: "OHC133,OHZ022", counties: "the Wingfoot area" },
      push: null,
      map: { data: "NightBiteMapDataWingfoot", chart: "assets/wingfoot-chart.png" },
      spots: ["Northeast launch (wildlife area)", "Northwest launch, Farr Ln", "Accessible pier", "Paddle dock", "Bank (other)"],
      species: ["largemouth-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish"]
    },
    eastbranch: {
      id: "eastbranch",
      name: "East Branch Reservoir",
      short: "East Branch",
      area: "Northeast Ohio",
      lat: 41.52, lng: -81.098,
      region: "northeast", owner: "City of Akron (water supply); Headwaters Park leased to Geauga Park District",
      aliases: ["East Branch", "Headwaters Park", "Cuyahoga River headwaters", "Burton", "Claridon", "Huntsburg"],
      pool: {
        // no public lake level or temperature gauge (USGS 413016081054200 East Branch Re above the dam is a sampling site); not a Corps lake
        src: null, srcName: null,
        temp: null,
        fullPool: null,    // no ODNR fishing map found; no pool elevation
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/104,68/forecast/hourly",
        point: "https://api.weather.gov/points/41.52,-81.098",
        grid: "https://api.weather.gov/gridpoints/CLE/104,68",
        station: "KHZY",
        stationName: "Ashtabula airport (KHZY)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.52&lon=-81.098"
      },
      alerts: { zones: "OHC055,OHZ013", counties: "the East Branch area" },
      push: null,
      map: { data: "NightBiteMapDataEastbranch", chart: "assets/eastbranch-chart.png" },
      spots: ["Headwaters Park launch", "West shore, Buckeye Trail", "Bank (other)"],
      species: ["largemouth-bass"]
    },
    guilford: {
      id: "guilford",
      name: "Guilford Lake",
      short: "Guilford",
      area: "Northeast Ohio",
      lat: 40.8, lng: -80.88,
      region: "northeast", owner: "ODNR Ohio State Parks",
      aliases: ["Guilford", "Guilford Lake State Park", "Lisbon", "Hanoverton"],
      pool: {
        // no public lake level or temperature gauge (USGS 404742080522000 and 404746080520900 are sampling sites); ODNR has the lake about 20 ft down for dam work (Nov. 3, 2026 update)
        src: null, srcName: null,
        temp: null,
        fullPool: 1090,    // ODNR fishing map summer pool (3 ft contours); drawn down about 20 ft for dam work (ODNR)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/45,79/forecast/hourly",
        point: "https://api.weather.gov/points/40.8,-80.88",
        grid: "https://api.weather.gov/gridpoints/PBZ/45,79",
        station: "KBVI",
        stationName: "Beaver Falls, Pa. airport (KBVI)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.8&lon=-80.88"
      },
      alerts: { zones: "OHC029,OHZ041", counties: "the Guilford area" },
      push: null,
      map: { data: "NightBiteMapDataGuilford", chart: "assets/guilford-chart.png" },
      spots: ["Dam ramp", "Campground ramp", "Red Maple ramp", "Hanna Dr pier", "Bank (other)"],
      species: ["largemouth-bass", "black-crappie", "white-crappie", "bluegill", "channel-catfish", "hybrid-striped-bass"]
    },
    highlandtown: {
      id: "highlandtown",
      name: "Highlandtown Lake",
      short: "Highlandtown",
      area: "Northeast Ohio",
      lat: 40.64, lng: -80.765,
      region: "northeast", owner: "ODNR Division of Wildlife",
      aliases: ["Highlandtown", "Highlandtown Wildlife Area", "Salineville", "Lisbon"],
      pool: {
        // no public lake level or temperature gauge (USGS 403815080450100 Highlandtown Re above the dam is a sampling site)
        src: null, srcName: null,
        temp: null,
        fullPool: 1070,    // ODNR fishing map summer pool (3 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/PBZ/50,72/forecast/hourly",
        point: "https://api.weather.gov/points/40.64,-80.765",
        grid: "https://api.weather.gov/gridpoints/PBZ/50,72",
        station: "KBVI",
        stationName: "Beaver Falls, Pa. airport (KBVI)",
        page: "https://forecast.weather.gov/MapClick.php?lat=40.64&lon=-80.765"
      },
      alerts: { zones: "OHC029,OHZ041", counties: "the Highlandtown area" },
      push: null,
      map: { data: "NightBiteMapDataHighlandtown", chart: "assets/highlandtown-chart.png" },
      spots: ["North ramp", "South ramp", "Bank (other)"],
      species: ["largemouth-bass", "black-crappie", "white-crappie", "bluegill", "yellow-perch", "channel-catfish"]
    },
    punderson: {
      id: "punderson",
      name: "Punderson Lake",
      short: "Punderson",
      area: "Northeast Ohio",
      lat: 41.455, lng: -81.208,
      region: "northeast", owner: "ODNR Ohio State Parks",
      aliases: ["Punderson", "Punderson State Park", "Newbury", "Burton", "Punderson Manor"],
      pool: {
        // no public lake level or temperature gauge (USGS 412718081122600 Punderson Lk at midpoint is a sampling site)
        src: null, srcName: null,
        temp: null,
        fullPool: 1144,    // ODNR fishing map summer pool (5 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/100,65/forecast/hourly",
        point: "https://api.weather.gov/points/41.455,-81.208",
        grid: "https://api.weather.gov/gridpoints/CLE/100,65",
        station: "KBKL",
        stationName: "Cleveland, Burke Lakefront Airport (KBKL)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.455&lon=-81.208"
      },
      alerts: { zones: "OHC055,OHZ013", counties: "the Punderson area" },
      push: null,
      map: { data: "NightBiteMapDataPunderson", chart: "assets/punderson-chart.png" },
      spots: ["Launch ramp", "Fishing pier", "Bank (other)", "Kayak rental"],
      species: ["largemouth-bass", "bluegill", "channel-catfish"]
    },
    wellington: {
      id: "wellington",
      name: "Wellington Upground Reservoir",
      short: "Wellington",
      area: "Northeast Ohio",
      lat: 41.157, lng: -82.233,
      region: "northeast", owner: "Village of Wellington; ODNR Division of Wildlife fishing agreement",
      aliases: ["Wellington", "Wellington Reservoir", "Wellington Upground", "Jones Road"],
      pool: {
        // no public lake level or temperature gauge (USGS Wellington Re sites are sampling sites)
        src: null, srcName: null,
        temp: null,
        fullPool: 885,    // ODNR fishing map summer pool (3 ft contours)
        gaugeUrl: null
      },
      nws: {
        hourly: "https://api.weather.gov/gridpoints/CLE/66,48/forecast/hourly",
        point: "https://api.weather.gov/points/41.157,-82.233",
        grid: "https://api.weather.gov/gridpoints/CLE/66,48",
        station: "KLPR",
        stationName: "Lorain / Elyria airport (KLPR)",
        page: "https://forecast.weather.gov/MapClick.php?lat=41.157&lon=-82.233"
      },
      alerts: { zones: "OHC093,OHZ010", counties: "the Wellington area" },
      push: null,
      map: { data: "NightBiteMapDataWellington", chart: "assets/wellington-chart.png" },
      spots: ["Jones Rd launch", "Bank (other)"],
      species: ["yellow-perch", "largemouth-bass", "smallmouth-bass", "black-crappie", "channel-catfish"]
    }
  };
  var ORDER = ["hoover", "alum", "buckeye", "oshaughnessy", "griggs", "indian", "delaware", "deercreek", "madison", "knox", "clearfork", "seneca", "dillon", "logan", "saltfork", "burroak", "dow", "mosquito", "berlin", "westbranch", "pymatuning", "milton", "leesville", "grandlakestmarys", "caesarcreek", "eastfork", "cjbrown", "rockyfork", "ladue", "paintcreek", "portagelakes", "mogadore", "loramie", "nimisila", "cowan", "acton", "tappan", "piedmont", "clendening", "atwood", "charlesmill", "pleasanthill", "beachcity", "wingfoot", "eastbranch", "guilford", "highlandtown", "punderson", "wellington"];
  // picker regions, in this order (js/lake-picker.js). A region with no lakes yet is hidden. Every lake above sets
  // region to one of these ids; lat and lng above (the lake's NWS forecast point, on the water) give Near me distances.
  var REGIONS = [
    { id: "central", name: "Central Ohio" },
    { id: "southeast", name: "East and Southeast Ohio" },
    { id: "northeast", name: "Northeast Ohio" },
    { id: "northwest", name: "Northwest Ohio" },
    { id: "southwest", name: "Southwest Ohio" },
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
  // a lake's home page: <id>/ for every lake (the site root is the water picker)
  function homeFor(lake) { return BASE + lake + "/"; }

  var homeMeta = document.querySelector('meta[name="nb-home"]');
  var homeLake = homeMeta ? valid(homeMeta.getAttribute("content")) : null;   // set on the lake home pages only
  var atRoot = !!document.querySelector('meta[name="nb-root"]');               // the water picker at the site root
  var fromUrl = null, stored = null, pick = false, browse = false;
  try { var qs = new URLSearchParams(location.search); fromUrl = valid(qs.get("lake")); pick = qs.has("pick"); browse = qs.has("browse"); } catch (e) {}
  try { stored = valid(localStorage.getItem(KEY)); } catch (e) {}
  // "Just browsing" on the picker opens hoover/?browse: look around without saving it as your water. The flag lives in
  // this tab (sessionStorage) so in-page links on that home page don't save it either; opening any other water ends it.
  var browsing = false;
  try {
    if (homeLake && browse) sessionStorage.setItem("nb-browse", homeLake);
    browsing = !!homeLake && sessionStorage.getItem("nb-browse") === homeLake;
    if (homeLake && !browsing) sessionStorage.removeItem("nb-browse");
  } catch (e) { browsing = !!homeLake && browse; }
  var id = homeLake || fromUrl || stored || "hoover";
  var chosen = !!((homeLake && !browsing) || fromUrl || stored);   // false until this device has picked a water
  if (id !== stored && (fromUrl || (homeLake && !browsing))) { try { localStorage.setItem(KEY, id); } catch (e) {} }

  // the water picker with a water already chosen: open that lake's own address instead (?pick shows the picker)
  if (atRoot && (fromUrl || stored) && !pick && BASE) {
    try { location.replace(homeFor(id) + location.hash); } catch (e) {}
  }

  // keep the address bar honest: a lake's home page has no ?lake=; elsewhere ?lake= for every lake but Hoover
  try {
    var u = new URL(location.href), had = u.searchParams.get("lake"), hadBrowse = u.searchParams.has("browse");
    if (id === "hoover" || homeLake || atRoot) u.searchParams.delete("lake"); else u.searchParams.set("lake", id);
    if (homeLake) u.searchParams.delete("browse");
    if (had !== u.searchParams.get("lake") || (hadBrowse && homeLake)) history.replaceState(history.state, "", u.href);
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

  // USACE outflow water temperature (pool.outflow: CWMS office + time series, hourly or 15 minute). Asked for in
  // English units; a series that comes back in C is converted. The newest reading of the last few hours, or null.
  // Labelled "outflow" wherever it shows; js/usgs.js never hands it to the bite rating as lake surface temperature.
  function outflowTemp(lake, hours) {
    var O = LAKES[lake] && LAKES[lake].pool && LAKES[lake].pool.outflow;
    if (!O) return Promise.resolve(null);
    var begin = new Date(Date.now() - (hours || 6) * 36e5).toISOString().replace(/\.\d+Z$/, "Z");
    var url = "https://cwms-data.usace.army.mil/cwms-data/timeseries?office=" + O.office + "&name=" + encodeURIComponent(O.ts) +
      "&unit=EN&begin=" + begin + "&page-size=1000";
    return fetch(url, { headers: { Accept: "application/json;version=2" } })
      .then(function (r) { if (!r.ok) throw new Error("cwms " + r.status); return r.json(); })
      .then(function (j) {
        var c = /^(C|degC|celsius)$/i.test(String(j.units || "")), last = null;
        (j.values || []).forEach(function (row) {
          var v = row && row[1];
          if (typeof v === "number" && isFinite(v)) last = row;
        });
        if (!last) return null;
        var f = c ? last[1] * 9 / 5 + 32 : last[1];
        if (f < 28 || f > 100) return null;   // not a water temperature: show nothing rather than a bad number
        return { f: Math.round(f * 10) / 10, c: Math.round((f - 32) * 5 / 9 * 10) / 10, dateTime: new Date(last[0]).toISOString() };
      });
  }

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

  // a saved spot name as the page shows it now (old Hoover ramp spellings map to the official names)
  function spotName(lake, name) {
    var al = LAKES[lake || "hoover"] && LAKES[lake || "hoover"].spotAliases;
    return (al && name && Object.prototype.hasOwnProperty.call(al, name)) ? al[name] : name;
  }
  window.NightBiteLakes = { all: LAKES, order: ORDER, regions: REGIONS, speciesNames: SPECIES, storageKey: KEY, hrefFor: hrefFor, homeFor: homeFor, base: BASE, cwmsFor: cwmsFor,
    usgsLatest: usgsLatest, usgsSeries: usgsSeries, bitingVar: bitingVar, mapFile: mapFile, spotName: spotName };
  window.NightBiteLake = { id: id, cfg: LAKES[id], key: key, cwms: cwms, outflow: function (h) { return outflowTemp(id, h); }, home: homeLake, chosen: chosen, root: atRoot, browsing: browsing };

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
    }
    // Once a water is chosen, Home links (logo, nav, footer) go straight to that lake's home page; before that they
    // open the water picker at the root. Links that pick a lake (a[data-lake], the picker rows) are left alone:
    // rewriting those once sent the Hoover link to the lake already open (v42, v43). The picker page keeps its own.
    if (chosen && !atRoot) {
      var root0 = BASE.replace(/[?#].*$/, ""), links = document.querySelectorAll("a[href]:not([data-lake])");
      for (var j = 0; j < links.length; j++) {
        var a = links[j], h = a.href.replace(/[?#].*$/, "");
        if (/[?&]pick\b/.test(a.search)) continue;   // "Pick your water" links (./?pick) keep the picker
        if (h === root0 || h === root0 + "index.html" || h === root0 + "index") a.href = homeFor(id) + (a.hash || "");
      }
    }
    root.classList.add("lk-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill);
  else fill();
})();
