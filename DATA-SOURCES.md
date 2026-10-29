# Data sources (live data features)

Updated 2026-10-24 (ET): Tonight at Hoover gets the hourly strip, Tonight's bite, last light and moonset, 3 hour pressure change, storm heads up, feels like and dew point, and wind on the water.

Updated 2026-10-22 (ET): boardwalk added; What's biting now added.

Checked 2026-10-22 (ET). Only details confirmed by a source below are shown on the site. Anything missing was left out on purpose.

## Tonight at Hoover card (js/conditions.js)
- Forecast: National Weather Service API, `https://api.weather.gov/points/40.11,-82.88` resolves to office ILN (Wilmington, OH), gridpoint 89,88. Hourly forecast: `https://api.weather.gov/gridpoints/ILN/89,88/forecast/hourly`. Wind, air temp, rain chance (max of the next 12 hourly periods).
- Pressure trend: `https://api.weather.gov/stations/KCMH/observations`. KCMH (John Glenn Columbus International Airport, 39.99 N 82.88 W) is the first station NWS lists for gridpoint ILN 89,88 (`/gridpoints/ILN/89,88/stations`, next are KOSU and KDLZ). The card shows the change over the last 3 hours: the newest reading against the one closest to 3 hours earlier (used only when it is 2 to 4 hours older), from the same pressure field. Within 0.02 inHg is steady; 0.06 inHg or more in 3 hours counts as fast. Readings over an hour old get an "as of" time.
- Hourly strip: the hourly forecast periods from sunset (or from now, once the sun is down) through the period that starts at 2 AM ET. Hour, temperature, wind direction and speed, rain chance. Hidden if the hourly forecast can't be loaded.
- Storm heads up: thunder anywhere from now through 2 AM ET, from an hourly period whose `shortForecast` mentions thunder, or from the raw gridpoint `https://api.weather.gov/gridpoints/ILN/89,88` (`weather` lists thunderstorms, or `probabilityOfThunder` is 25% or more). When the alert banner (js/alerts.js) is showing a thunderstorm or tornado Watch or Warning, the line points to it instead of repeating it.
- Feels like and dew point: from the same hourly period as the Air value, so they always agree. Wind chill (NWS formula) at 50 F or below with wind over 3 mph, heat index (NWS Rothfusz regression with its adjustments) at 80 F and up, otherwise the air temperature. Dew point is the period's `dewpoint`.
- Wind on the water: the bank the current hourly wind blows toward, the opposite of where it comes from (a southwest wind pushes into the northeast bank). Hoover runs north to south, so north and south winds name the south and north ends. Skipped under 3 mph.
- Tonight's bite (rule of thumb, not a forecast; also in the comment above biteRating in js/conditions.js):
  - Pressure, last 3 hours at KCMH: falling slowly (0.02 to 0.06 inHg) +2, steady +1, rising slowly 0, falling fast 0, rising fast -1.
  - Wind, average sustained NWS hourly speed over tonight's window: under 3 mph 0, 3 to 12 mph +1, 13 to 18 mph 0, over 18 mph -2.
  - Moon: new or full (the principal phase falls tonight, or under 10% or over 90% lit) +1.
  - Water temp from USGS 03228400 when the gauge sends one: 55 to 80 F +1, 45 to 54 or 81 to 86 F 0, colder or warmer -1. Water temp alone never makes a rating; pressure or wind must be known.
  - 4 or more is Good, 2 or 3 is Fair, 1 or less is Tough. Thunder in tonight's window always makes it Tough.
- Sunset, last light (end of civil twilight, Sun 6 degrees down), moonrise and moonset: computed in the browser (js/astro.js, port of SunCalc by Vladimir Agafonkin, BSD 2-Clause, with the Moon's position from the Meeus main terms and the standard parallax corrected rise and set altitude). Checked against the US Naval Observatory (aa.usno.navy.mil rstt/oneday) at 40.11 N 82.88 W for 2026-10-24, 10-25, 10-28, 11-02 and 11-10: sunset and last light within 2 minutes, moonrise and moonset within 2 minutes.
- Fallback when NWS can't be reached: "Weather unavailable, check weather.gov" with a link to the NWS point forecast.

## Alert banner (js/alerts.js, every page)
- `https://api.weather.gov/alerts/active?zone=OHC041,OHC049,OHZ046,OHZ055` (Delaware and Franklin County zones, plus their forecast zones from `/points`). Shown only for an active Warning or Watch.

## 7 day pool trend (js/pool-trend.js)
- USGS 03228400, Hoover Reservoir at Central College OH, parameter 62614 (lake elevation, ft NGVD29), `https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items?f=json&monitoring_location_id=USGS-03228400&parameter_code=62614&time=P7D&skipGeometry=true&properties=time,value&limit=5000`, fallback `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=03228400&parameterCd=62614&period=P7D`. Same gauge as js/usgs.js. Provisional.

## USGS Water Data APIs (js/lakes.js: usgsLatest, usgsSeries), switched Oct. 27, 2026
- Every USGS read (Tonight card, Right now strip, lake picker, pool trend) goes through js/lakes.js. First try: the new USGS Water Data OGC API, `https://api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items` (latest values) and `.../continuous/items` (7 day series), 8 second timeout, no API key (rate limited per IP by api.data.gov).
- Fallback: the legacy WaterServices IV API (`waterservices.usgs.gov/nwis/iv`). USGS adds a 2 second delay to it from Nov. 16, 2026 and turns it off Feb. 22, 2027 (https://waterdata.usgs.gov/blog/wdfn-waterservices-degradation/). Remove the fallback and its CSP host then.
- If both fail: the saved offline reading, then "unavailable, check USGS".
- Parity check, Oct. 27, 2026: Hoover 62614 890.60 ft and 00010 18.0 C, Buckeye 62614 891.45 ft, same in both APIs; 7 day series had the same point counts (Hoover 167, Buckeye 667).
- `window.NightBiteUsgsVia` shows which API answered last ("ogcapi" or "waterservices").

## Map pins (js/hoover-map-data.js)
Map art: the same traced outline as assets/hoover-chart.png (trace of a Google Maps screenshot, web mercator, north up). The trace was georeferenced to the OpenStreetMap Hoover Reservoir polygon (relation 241088, IoU 0.89), and each pin is the real lat/lng projected through that fit. Ramps within 2.5 map pixels of the traced shore are snapped onto it; Oxbow sits in a cove the trace filled in, so it keeps its true position.

Park hours line: Columbus Recreation and Parks, Hoover Reservoir Parkland page (7 a.m. to 11 p.m.), https://columbusrecparks.com/parks/hoover-reservoir-parkland/

| Place | Shown | Sources |
|---|---|---|
| Oxbow Road ramp | 8401 Oxbow Rd, Westerville 43082; parking | Columbus Rec and Parks Hoover Reservoir map PDF (launch ramp "OX"), https://columbusrecparks.com/wp-content/uploads/2025/09/Hoover-Reservoir-Map.pdf ; Hoover Oxbow Nature Preserve management plan 2023 (address, boat ramp, parking lots), https://columbusrecparks.com/wp-content/uploads/2023/04/Hoover-Oxbow-Nature-Preserve-Management-Plan-2023_compressed.pdf ; OpenStreetMap slipway way 1560889576, parking ways 1560889572 and 1560889574 ; aa-fishing.com ramp list (paved parking) |
| Sunbury Road ramp | 4995 Sunbury Rd, Westerville 43082; parking | City map PDF (launch ramp "BR" at the Sunbury Rd causeway) ; Google Maps listing "Sunbury Road Boat Ramp" (address, 40.175435, -82.874401) ; aa-fishing.com (south end of the Sunbury Road bridge, paved parking) |
| Twin Bridges ramp | 4748 Red Bank Rd, Galena 43021; parking; portable restroom | City map PDF ("TB") ; OpenStreetMap slipway way 1191434280 "Twin Bridge Boat Ramp", parking way 1191434279, portable toilet node 12860900199 ; Hoover Adventures launch guide (address), https://hooveradventures.com/reservations ; aa-fishing.com |
| Red Bank ramp (Maxtown Rd) | parking | City map PDF ("RB", with marina and reservable shelter) ; OpenStreetMap slipway node 7555378659, parking ways 1247364176 to 1247364180 ; aa-fishing.com (off Maxtown Road, paved parking) |
| Walnut Street ramp | parking | City map PDF ("WR") ; OpenStreetMap slipway way 396983323, parking node 3368880530 ; aa-fishing.com (off E Walnut St, paved parking) |
| Old Dutchman Bait & Tackle | 904 S Sunbury Rd, Westerville 43081; (614) 891-2653; live and frozen bait, tackle, licenses | Google Business Profile via https://www.ohiofishing.guide/bait-shops/old-dutchman-bait-tackle/ (address, phone, 40.1015667, -82.8880828) ; The Old Dutchman Facebook page (bait list, licenses, 0.25 mile south of the dam) |
| Red Bank Food & Beverage and Bait | 7001 Sunbury Rd, Westerville 43082; (614) 776-5120; customer parking | Google Business Profile via https://www.ohiofishing.guide/bait-shops/red-bank-food-beverage-and-bait/ (address, phone, 40.1453361, -82.8822167) ; Waze place listing (address, phone, customer parking) |
| Hoover Mudflats Boardwalk (new pin type: boardwalk, shore access) | Off Front St, Galena 43021 (city public access Area M); parking lot at the entrance; restroom; 7 a.m. to 11 p.m.; rebuilt 1,500 ft timber boardwalk opened March 18, 2026, wide platform with benches at the end; casting a line is a listed use; pier net tip | Columbus Rec and Parks project page, https://columbusrecparks.com/connect/about/capital-improvement-projects/hoover-mudflats-boardwalk/ (name, reopened March 18, 2026, 1,500 ft, off the Mudflats parking lot, "casting a line") ; Delaware Gazette 2026-08-01, https://www.delgazette.com/2026/08/01/village-building-bridges/ (same city statement) ; Birding Hotspots, Hoover Nature Preserve Boardwalk Area M, https://birdinghotspots.org/hotspot/L449142 (Front Street, Galena; boardwalk starts from the parking lot; restrooms on site) ; TrekOhio, https://trekohio.com/franklin/ (West St. and Front St., Galena; 40.213776, -82.88026, used for the pin and Directions) ; Google listing via https://hoover-mudflats.edan.io/ (Front St, Galena; 40.214, -82.8801; 7 a.m. to 11 p.m., same as the city park hours) ; Columbus Audubon, https://columbusaudubon.org/the-life-death-and-rebirth-of-the-hoover-boardwalk/ (platform with benches at the end) ; AllTrails 2026 visitor reviews (free lot, bathrooms available, popular with people fishing) ; OpenStreetMap parking ways 1227037970 to 1227037978 by Front St (the new boardwalk itself isn't mapped in OSM yet) |

Pier net tip: the boardwalk card and the Gear page (catfish bank card and the bank packing list) suggest a pier net (bridge net) when fishing from the boardwalk or a bridge. That is gear advice, not a sourced fact.

The boardwalk pin is placed at the TrekOhio coordinate and snapped 1.6 to 1.9 map pixels onto the traced north shore.

Left out:
- "Lit at night" for every ramp: no source says either way.
- Restrooms at Oxbow, Sunbury Road, Red Bank and Walnut: not confirmed for those exact sites (an OpenStreetMap pit toilet near Sunbury Rd is about 0.5 mile from the ramp, so it wasn't used).
- Shop hours: listings disagree (Old Dutchman shows 6 or 7 a.m. opening depending on the source).
- Cheshire Market (5094 Cheshire Rd, Galena, live bait): real, but it is by Alum Creek, off this map.
- Canoe and kayak only launches on the city map (sites "B" and "E") and the Hoover Dam marina: not boat ramps, so not pinned yet.

## What's biting now (Species page)

| Feature | What it shows | Sources |
|---|---|---|
| What's biting now card (`js/biting-data.js`, `js/biting.js`) | The current month (device clock, America/New_York) and the 2 or 3 best bets at Hoover, each with typical depth or spot and time of day or night, linked to the species page. Catfish first from May to October nights. Static data, works with no network. "Changes each month." | The Night Bite species pages (Season, Time of day, Where on Hoover sections) ; ODNR Hoover Reservoir Fishing Area forecast, https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/hoover-reservoir-fishing-area (three catfish species, white bass spring run up Big Walnut Creek and schools on shad) ; ODNR news May 29, 2025, "Central Ohio is a Fishing Destination for Saugeye, Crappie, Bass, and Catfish", https://ohiodnr.gov/wps/portal/gov/odnr/discover-and-learn/safety-conservation/about-ODNR/news/central-ohio-is-a-fishing-destination-for-saugeye-crappie-bass-catfish (crappie on point edges near deep water after May, 1/16 oz jigs; catfish on the north end with cut bait spring through summer) ; ODNR central Ohio release as reprinted by Madison SWCD, Apr 26, 2022, https://www.madisonsoilandwater.com/news-events/newsroom2.html/article/2022/04/26/central-ohio-offers-fantastic-saugeye-and-crappie-fishing (best catfishing north of Sunbury Road, cut shad) and Lancaster Eagle-Gazette, Jun 13, 2024 (crappie to shore cover to spawn) ; ODNR Hoover fishing map (894 ft contours), https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/hooverreservoir2.pdf ; Columbus Rec and Parks, Hoover Reservoir Parkland, https://columbusrecparks.com/parks/hoover-reservoir-parkland/ ; seasonal depth ranges for channel catfish and crappie from A and A Fishing's Hoover report (Rick Seaman, updated July 13, 2026), https://www.aa-fishing.com/oh/hoover-reservoir-fishing-report.html, used as typical ranges only |

These are typical seasonal patterns, not a fishing report. Winter months add a line to check ice and cold water safety.

## Lakes: Alum Creek Lake and Buckeye Lake

Hoover stays the default. The active lake comes from `?lake=hoover|alum|buckeye`, then localStorage `nb-lake`, then Hoover. Per lake settings live in `js/lakes.js`. Readings, saved snapshots and caches for other lakes use their own storage keys (`-alum`, `-buckeye` suffix), so they never mix with Hoover.

| Setting | Alum Creek Lake | Buckeye Lake |
|---|---|---|
| Lake level | US Army Corps of Engineers, Huntington District (LRH), CWMS Data API time series `AlumCr-Lake.Elev.Inst.15Minutes.0.OBS`, https://cwms-data.usace.army.mil/cwms-data/timeseries (public, CORS open, provisional). Page: https://water.usace.army.mil/overview/lrh/locations/alumcr . There is no USGS gauge on the lake. | USGS 395540082291600, Buckeye Lake, param 62614 (lake elevation, provisional), https://waterdata.usgs.gov/monitoring-location/USGS-395540082291600/ |
| Water temp | None. No public lake temp gauge (the Corps temp sensor is in the outflow below the dam), so the site says "No public water temp gauge". | None. The USGS gauge measures level only. |
| Map pool (contour datum) | 888 ft normal summer pool, 5 ft contours, surveyed 2001, 3,330 acres: ODNR fishing map https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/alumcreeklake2.pdf | 891.75 ft normal summer pool, 2 ft contours, surveyed 1998, 2,873 acres, 300 ft no wake zone: ODNR fishing map https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/buckeyelake2.pdf |
| Tonight forecast | NWS grid ILN 85,94 (https://api.weather.gov/points/40.24,-82.97) | NWS grid ILN 103,81 (https://api.weather.gov/points/39.93,-82.49) |
| Barometer / observations | KDLZ, Delaware airport (sea level pressure is null there, so the existing fallback to station pressure is used) | KVTA, Newark airport (same fallback) |
| Alerts | Delaware County: OHC041, OHZ046 | Licking, Fairfield, Perry: OHC089, OHC045, OHC127, OHZ056, OHZ065, OHZ066 |
| Wind wording | Same north to south wording as Hoover (the lake also runs north to south) | Own list: the lake runs west southwest to east northeast |
| Boating rules shown | Unlimited horsepower on the south main lake, no wake north of Cheshire Road (USACE Alum Creek recreation page; follow the buoys) | No wake within 300 ft of any land mass and in marked areas (ODNR fishing map) |
| Species shown | saugeye, walleye, muskellunge, largemouth and smallmouth bass, white and black crappie, white bass, bluegill, channel catfish (ODNR Alum Creek Lake Fishing Area, https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/alum-creek-lake-fishing-area); yellow perch (ODNR Waterbody Report survey data); blue catfish (ODNR Fish Stocking, 2023 to 2025) | saugeye, largemouth bass, white and black crappie, bluegill, yellow perch, channel catfish, bullhead (ODNR Buckeye Lake State Park, https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/buckeye-lake-state-park); hybrid striped bass and white bass (ODNR Waterbody Report survey data; hybrids also ODNR Fish Stocking and ODNR Fishing Tips) |

Regulations (2026–27): ODNR Fishing Regulations 2026–27 (https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/laws-regs-licenses/OhioFishingRegs_English.pdf) and the Ohio Administrative Code. Alum Creek Lake and Buckeye Lake appear only in the crappie rules: 30 crappie a day, OAC 1501:31-13-08(L), and a 9″ minimum, OAC 1501:31-13-09(H) (https://codes.ohio.gov/ohio-administrative-code/rule-1501:31-13-08 and rule-1501:31-13-09). Everything else is statewide: muskellunge 1 a day (13-08(B)), no muskie length rule in 13-09; yellow perch 30 a day (13-08(H)); bass 5 a day, 12″; walleye, sauger and saugeye 6 combined, no minimum at either lake; bullhead not on the limits table.

Map pins (`js/lake-map-data-alum.js`, `js/lake-map-data-buckeye.js`, built by a local script from the sources below; shorelines traced from OpenStreetMap, not for navigation):

| Lake | Pin | Address | Sources |
|---|---|---|---|
| Alum Creek | New Galena ramp (ramp) | 4550 Africa Rd, Galena, OH 43021 | USACE Alum Creek Lake recreation page (five ramps, four public; life jacket loaners at New Galena, Cheshire and Marina) ; Destination Delaware County, New Galena Boat Ramp (address, parking, south end access) ; OpenStreetMap slipway node 1729423321 (coordinates) |
| Alum Creek | Marina ramp (Hollenback Rd) (ramp) | Hollenback Rd, west side of the lake | USACE Alum Creek Lake recreation page (The Marina on Hollenback Road ramp, life jacket loaners) ; ODNR Alum Creek State Park page (full service marina on Hollenback Road, west side, (740) 548-6056) ; OpenStreetMap slipway way 1156487629 (coordinates) |
| Alum Creek | Cheshire ramp (ramp) | Off Africa Rd, just north of the Cheshire Rd bridge (east side) | USACE Alum Creek Lake recreation page (Cheshire ramp, no wake north of Cheshire Road, life jacket loaners) ; Public Lands, Paddling Alum Creek Lake (just above the Cheshire Road bridge off Africa Road, paved parking, restrooms, docks) ; OpenStreetMap slipway way 396982092 (coordinates) |
| Alum Creek | Howard ramp (ramp) | Howard Rd, east side | USACE Alum Creek Lake recreation page (Howard Boat Ramp, Howard Road) ; Public Lands, Paddling Alum Creek Lake (Howard Road launch, paved parking, restrooms, docks) ; OpenStreetMap slipway way 1339955300 and parking way 1339955303 (coordinates) |
| Alum Creek | Cheshire Market bait shop (shop) | 5094 Cheshire Rd, Galena, OH 43021 | Cheshire Market website, Bait Shop page (live bait, tackle, phone, pickup and delivery) ; Columbus on the Cheap, Alum Creek State Park guide (5094 Cheshire Rd, Galena) ; US Census Geocoder (coordinates from the street address) |
| Alum Creek | Alum Creek Drive Thru (shop) | 6999 OH-37, Sunbury, OH 43074 | Google Business Profile via ohiofishing.guide (name, bait shop, address, phone) ; US Census Geocoder (coordinates from the street address) |
| Buckeye Lake | North Shore ramp (ramp) | Village of Buckeye Lake, north shore | ODNR Buckeye Lake State Park page (three launch ramps: North Shore, Liebs Island, Fairfield Beach) ; ODNR Buckeye Lake fishing map (boat ramp symbols) ; OpenStreetMap slipway node 2051781951 (coordinates) |
| Buckeye Lake | Liebs Island ramp (ramp) | Liebs Island Rd NE, Millersport, OH 43046 (near the park office) | ODNR Buckeye Lake State Park page (Liebs Island ramp near the park office) ; OpenStreetMap slipway way 1394453434 (coordinates) ; US Census Geocoder (park office address) |
| Buckeye Lake | Fairfield Beach ramp (ramp) | 5300 Lake Shore Dr NE, Thornville, OH 43076 | ODNR Buckeye Lake State Park page (Fairfield Beach ramp, south side) ; Visit Buckeye Lake listing, Fairfield Beach Boat Ramp (address) ; US Census Geocoder (coordinates from the street address, approximate) |
| Buckeye Lake | Mud Island fishing access (access) | Mud Island, off Lakeside Rd, Millersport | ODNR Buckeye Lake State Park page (fishing pier on Mud Island) ; ODNR Buckeye Lake fishing map (fishing access and parking symbols at Mud Island) ; OpenStreetMap peninsula way 38132617 (Mud Island coordinates) |
| Buckeye Lake | North Shore Bait & Tackle (shop) | 5187 Walnut Rd, Buckeye Lake, OH 43008 | Escape to Buckeye Lake directory, North Shore Bait & Tackle (address, phone) ; MapQuest listing (address) ; US Census Geocoder (coordinates from the street address) |
| Buckeye Lake | Millersport Drive Thru, Deli & Bait Shop (shop) | 12325 Lancaster St, Millersport, OH 43046 | Visit Fairfield County listing (live bait, tackle, address, phone, hours) ; US Census Geocoder (coordinates from the street address) |

What's biting now and species "Where" notes for these lakes (`js/biting-data-lakes.js`, species pages): ODNR lake pages above; Outdoor News, Jan 27, 2026, https://www.outdoornews.com/2026/01/27/alum-creeks-big-water-worth-the-angling-effort-in-delaware-county-ohio/ (coves north of the Cheshire Road bridge); Mount Vernon News, Mar 29, 2025, https://mountvernonnews.com/central-ohio-spring-fishing-forecast-buckeye-lake-alum-creek-knox-lake-and-pleasant-hill-lake (Buckeye warms first, crappie and saugeye in under 2 ft; Alum smallmouth move up early); Best Fishing in America lake guides (https://www.bestfishinginamerica.com/ohio-alum-creek-lake-fishing.html, https://www.bestfishinginamerica.com/ohio-buckeye-lake-fishing.html), used for typical structure only. Typical patterns, not a fishing report.

Gaps (said on the site, never filled in):
- No public water temperature for either lake.
- Alum Creek's lake level is the Corps of Engineers reading, not USGS; values are provisional.
- Ramp lighting, restrooms and shop hours are not shown unless a source says so.
- No community trips logged at either lake yet; the sample trip is Hoover's.
- Structure notes for these lakes are reference notes, not first-hand nights.

## Lakes: O'Shaughnessy Reservoir, Griggs Reservoir, Indian Lake and Delaware Lake, checked Oct. 29, 2026

Same system as Alum Creek and Buckeye Lake: `?lake=oshaughnessy|griggs|indian|delaware`, home pages at `/oshaughnessy/`, `/griggs/`, `/indian/`, `/delaware/` (built by `tools/build-lake-pages.py`), per lake settings in `js/lakes.js`, storage keys with the lake's own suffix. USGS site IDs and parameters were checked against the USGS Water Data API on Oct. 29, 2026.

| Setting | O'Shaughnessy Reservoir | Griggs Reservoir | Indian Lake | Delaware Lake |
|---|---|---|---|---|
| Owner (boating rules) | City of Columbus | City of Columbus | ODNR (state park lake) | US Army Corps of Engineers; ODNR runs the state park |
| Lake level | USGS 03220500, Scioto River at O'Shaughnessy Dam near Dublin, param 62614 (provisional). https://waterdata.usgs.gov/monitoring-location/USGS-03220500/ | USGS 03221500, Scioto River at Griggs Dam, param 62614 (provisional). https://waterdata.usgs.gov/monitoring-location/USGS-03221500/ | USGS 03260500, Indian Lake at Russells Point, param 62614 (provisional). https://waterdata.usgs.gov/monitoring-location/USGS-03260500/ | USACE Huntington District (LRH), CWMS time series `Delaware-Lake.Elev.Inst.15Minutes.0.OBS`, https://cwms-data.usace.army.mil/cwms-data/timeseries . Page: https://water.usace.army.mil/overview/lrh/locations/delaware |
| Water temp | None. The City of Columbus FAQ says "Reservoir temperatures are not monitored", and the USGS site has no temp. | USGS 03221500 param 00010 | USGS 03260500 param 00010 | None. No public lake temp gauge. |
| Full pool used | 848.5 ft, City of Columbus dam crest (ODNR map depths use 847.9 ft) | 756.18 ft, City of Columbus dam crest (ODNR map depths use 757 ft) | 996.3 ft, ODNR fishing map | 915 ft, ODNR fishing map |
| Map pool (contour datum) | 847.9 ft, 10 ft contours, surveyed 2003, 896 acres: https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/oshaughnessyreservoir2.pdf | 757 ft, 3 ft contours, surveyed 2006, 387 acres: .../wildlife/maps/griggsreservoir2.pdf | 996.3 ft, 2 ft contours, surveyed 1999, 5,157 acres, 300 ft no wake zone: .../wildlife/maps/indianlake2.pdf | 915 ft, 3 ft contours, surveyed 1999, 1,215 acres: .../wildlife/maps/delawarelake2.pdf |
| Tonight forecast | NWS grid ILN 79,92 | NWS grid ILN 81,84 | NWS grid ILN 52,103 | NWS grid ILN 81,100 |
| Barometer / observations | KDLZ, Delaware airport | KOSU, Ohio State airport | KEDJ, Bellefontaine airport | KDLZ, Delaware airport |
| Alerts | OHC041, OHZ046 | OHC049, OHZ055 | OHC091, OHZ044 | OHC041, OHZ046 |
| Wind wording | Hoover's north to south list | Hoover's north to south list | Own list (a round lake: "into the south shore" and so on) | Hoover's north to south list |
| Boating rules shown | Columbus Recreation and Parks: unlimited horsepower, 40 mph limit; no jet skis, tubing or swimming in any City reservoir | Same as O'Shaughnessy | ODNR Indian Lake pages: no horsepower limit; 300 ft no wake zone from the ODNR map | ODNR Delaware Lake Fishing Area and Delaware State Park pages: unlimited horsepower |
| Species shown | hybrid striped bass, saugeye, blue catfish, black and white crappie, bluegill, channel catfish, largemouth and smallmouth bass, white bass (ODNR Waterbody Report survey data; hybrids, saugeye and blue catfish also ODNR Fish Stocking) | hybrid striped bass, saugeye, black and white crappie, bluegill, channel catfish, largemouth and smallmouth bass, white bass (ODNR Waterbody Report survey data; hybrids also ODNR Fishing Tips and the 2026 central Ohio forecast) | saugeye, black and white crappie, largemouth bass, bluegill, channel and flathead catfish, white bass, walleye, yellow perch (ODNR Indian Lake Fishing Area); smallmouth bass (ODNR Waterbody Report survey data) | black and white crappie, largemouth and smallmouth bass, channel catfish, bluegill, white bass (ODNR Delaware Lake Fishing Area) |

Regulations (2026–27, ODNR Fishing Regulations PDF above): the 30 crappie, 9″ minimum site rule lists Delaware, Indian and O'Shaughnessy, not Griggs, so Griggs crappie follow the statewide pattern (no daily limit, no minimum). Hybrid, striped and white bass are statewide: 30 combined, no more than 4 over 15″. Walleye, sauger and saugeye: 6 combined, no minimum at any of the four.

Hybrid stocking at O'Shaughnessy and Griggs: ODNR Fishing Tips, Hybrid Striped Bass (https://ohiodnr.gov/discover-and-learn/education-training/wild-ohio-harvest-community/fishing-tips): "the Division stocks hybrids in Buckeye, Charles Mill, Dillon, East Fork, Griggs, Kiser and O'Shaughnessy". The site does not list hybrids at Buckeye Lake (pre-existing; see open questions in the build notes).

Map pins (`js/lake-map-data-oshaughnessy.js`, `-griggs.js`, `-indian.js`, `-delaware.js`; shorelines traced from OpenStreetMap, not for navigation; "approximate position" means no surveyed point was found):

| Lake | Pin | Address | Sources |
|---|---|---|---|
| O'Shaughnessy | Home Road ramp and marina (ramp) | SR 257 (Riverside Dr) at Home Rd, east side | City of Columbus Recreation and Parks, O'Shaughnessy Reservoir page and reservoir map (launch ramp at map point M, public boat docks, hours 7 a.m. to 11 p.m.) ; ODNR O'Shaughnessy Reservoir Fishing Area page (access along SR 257 at Home Road) ; OpenStreetMap roads (Home Rd and SR 257, approximate position) |
| O'Shaughnessy | Twin Lakes launch (access) | SR 257, east side, south of Clark Shaw Rd | ODNR O'Shaughnessy Reservoir Fishing Area page (parking lots and boat ramps in the Twin Lakes area) ; City of Columbus Recreation and Parks, O'Shaughnessy Reservoir page reservoir map (canoe and kayak launch, map point O) ; OpenStreetMap roads (approximate position) |
| O'Shaughnessy | Bellepoint ramp (ramp) | Bellepoint, north end of the reservoir | ODNR O'Shaughnessy Reservoir Fishing Area page (access in Bellepoint; mud and silt bottom in the north) ; City of Columbus Recreation and Parks, O'Shaughnessy Reservoir page reservoir map (launch ramp, map point Q) ; OpenStreetMap slipway way 1531505383 (coordinates) |
| Griggs | Griggs boat launch (south of Fishinger Rd) (ramp) | Griggs Park, Riverside Dr (US 33), east side, just south of Fishinger Rd | City of Columbus Recreation and Parks, Griggs Park page (boat launch, park hours 7 a.m. to 11 p.m., Trabue-Murphy ramp closed since July 2025) ; ODNR Griggs Reservoir Fishing Area page (park along the east side, boat launch) ; OpenStreetMap slipway node 332451317 (coordinates) |
| Griggs | Griggs marina and public boat docks (access) | Griggs Park, 2933 Riverside Dr, Columbus, OH 43221 | City of Columbus Recreation and Parks, Griggs Park page (address, public boat docks) ; City of Columbus Recreation and Parks, Marinas and Docks page (dock permits, (614) 645-3337) ; ODNR Griggs Reservoir Fishing Area page (depths over 20 ft near the dam) ; OpenStreetMap marina way 30170471 (coordinates) |
| Indian Lake | Moundwood Marina ramp (ramp) | South side of Indian Lake | ODNR Indian Lake State Park page (six lane ramp, courtesy docks, trailer parking, seasonal restroom, accessible kayak launch) ; ODNR Indian Lake Fishing Area page (white bass spawning run near the Moundwood access) ; OpenStreetMap slipway node 9170237619 (coordinates) |
| Indian Lake | Lakeview Harbor ramp (ramp) | Southwest side of Indian Lake | ODNR Indian Lake State Park page (two lane ramp, 24 transient and courtesy docks, trailer parking, seasonal restroom) ; OpenStreetMap slipway node 9170237618 (coordinates) |
| Indian Lake | Blackhawk Marina ramp (ramp) | West side of Indian Lake | ODNR Indian Lake State Park page (two lane ramp, seawall tie ups, trailer parking, seasonal restroom) ; OpenStreetMap node 6308630798 (coordinates) |
| Indian Lake | Chippewa Marina ramp (ramp) | North side of Indian Lake | ODNR Indian Lake State Park page (two lane ramp, trailer parking, seasonal restroom) ; OpenStreetMap node 6308624834 (coordinates) |
| Indian Lake | Cranetown Island ramp (ramp) | On the islands near the Pew Island walking trail | ODNR Indian Lake State Park page (one lane ramp, 4 courtesy docks, 6 trailer spaces) ; ODNR Indian Lake fishing map (ramp symbol, approximate position) |
| Indian Lake | Old Field Beach fishing jetties (access) | 11252 State Route 235 N, Lakeview, OH 43331 | ODNR Indian Lake State Park page (large fishing jetties at the main beach, Old Field Beach address, park hours 6 a.m. to 11 p.m.) ; US Census Geocoder (11252 State Route 235 N, directions point) ; OpenStreetMap beach way 392165350 (coordinates) |
| Delaware Lake | Main marina ramp (ramp) | Delaware State Park, 5202 US Highway 23 N, Delaware, OH 43015 | ODNR Delaware State Park page (marina, phones, life jacket loaners, boat camping, park hours sunrise to sunset, park address) ; USACE Delaware Lake page (launch ramps at Delaware Marina) ; OpenStreetMap slipway way 1562271171 (coordinates) |
| Delaware Lake | Sherwood Road ramp (east side) (ramp) | Sherwood Rd, east side of the lake | ODNR Delaware State Park page (three boat ramps around the lake) ; ODNR Delaware Lake fishing map (ramp symbol) ; OpenStreetMap way 1562271169, Sherwood Road Boat Ramp (coordinates) |
| Delaware Lake | Southwest launch area (ramp) | Southwest side, inside Delaware State Park | ODNR Delaware State Park page (accessible kayak and canoe launch at the Southwest launch area, life jacket loaners at the Southwest docks) ; ODNR Delaware Lake fishing map (ramp symbol), moved to the nearest OpenStreetMap shoreline point (approximate position) |

No bait shop pins for these four yet: no official source was used for shops.

Stocking & surveys (stocking.html): Indian Lake and Delaware Lake use the same ODNR District lake PDFs as Hoover and Alum Creek (Indian saugeye stocking; Indian saugeye, crappie and largemouth bass growth; Delaware crappie and largemouth bass growth; channel catfish surveys linked; Indian 2014 and Delaware 2016 angler surveys). ODNR posts no stocking table for Delaware Lake, and no lake PDFs for O'Shaughnessy or Griggs; those blocks say so and link the ODNR fishing area page and the hybrid stocking line above.

Dock season (data/docks.json): City of Columbus Marinas and Docks (O'Shaughnessy and Griggs marina docks May 1 to Oct. 31, 614-645-3337), Facility Alerts (Trabue-Murphy ramp at Griggs closed), Griggs Park and O'Shaughnessy Reservoir park pages; ODNR Indian Lake State Park (office 937-843-2717) and Delaware State Park (office 740-363-4561) pages; ODNR Winter Drawdowns (Delaware 5 ft, Oct. 1 to Nov. 1, 2025, refill Mar. 1 to Apr. 1, 2026, start postponed by the Corps to after Dec. 1, 2025 for drought; no Indian Lake row). All are in the `watch` list for `tools/check-docks.py`.

Gaps (said on the site, never filled in):
- No public water temperature at O'Shaughnessy or Delaware Lake.
- Delaware Lake's level is the Corps of Engineers reading, not USGS; values are provisional.
- ODNR posts no written fishing forecast for O'Shaughnessy or Griggs. Their species lists come from ODNR Waterbody Report survey data and ODNR stocking records, with no size or catch notes.
- No 2026 dock pull or drawdown dates posted for these four on Oct. 29, 2026.
- No community trips logged at these lakes yet.

## Lake-aware Species (js/species-lake.js)

Which species live at each lake: the `species` list for each lake in `js/lakes.js` (the script also rewrites
`data-lakes` on each card from it, and the HTML carries the same lists for the no JS view). Order on the page: this
month's Biting now picks first (from `js/biting-data.js` / `js/biting-data-lakes.js`), then every other species on the
lake's list, then a closed "Not at <lake>" dropdown with species that no ODNR record lists at that lake. Ramps and
access: the lake's map data places of type ramp or access, shown with their own source labels.

Species lists, checked Oct. 29, 2026 (a species is listed at a lake only when an official ODNR source shows it there):
- ODNR fishing area and state park pages (linked in the lake tables above).
- ODNR Waterbody Report (fish survey data, 2011 to 2026), filter Location Name: https://analytics.das.ohio.gov/t/DOPPUB/views/WaterbodyReport/WaterbodyReport
- ODNR Fish Stocking: https://analytics.das.ohio.gov/t/DOPPUB/views/ODNR_Fish_Stocking/FishStocking
- ODNR Fishing Tips (hybrid striped bass stocked in Buckeye Lake, Griggs and O'Shaughnessy, among others).
Added Oct. 29, 2026 from these: yellow perch at Hoover and Alum Creek; blue catfish at Alum Creek (stocked 2023 to 2025)
and O'Shaughnessy (stocked 2022, 2023, 2025); hybrid striped bass and white bass at Buckeye Lake; saugeye, crappie,
bluegill, channel catfish, largemouth and smallmouth bass and white bass at O'Shaughnessy and Griggs; smallmouth bass at
Indian Lake. Delaware Lake unchanged (ODNR stocked saugeye there only through 2009, and no survey since 2011 records them).

## Share card (js/tonight-tools.js)

No new data. The card copies the Right now strip (USGS or USACE gauge with its "Checked" time; bite rule of thumb
from the NWS forecast with its "Checked" time) and prints "--" for anything missing. Static per-lake OG images
(`assets/og/og-<lake>.png` for every lake but Hoover) are the site art with the lake's name, no live data.

## Dock season (water.html#docks), checked Oct. 28, 2026

Built from `data/docks.json` by `tools/build-docks.py` (then `tools/stamp-version.py`). `js/docks.js` flips an
"ending" line to its after text once the date passes in Columbus, and flags a check older than 14 days. No fetches.

- Hoover: Columbus Recreation and Parks, Marinas & Docks: public dock season May 1 to Oct. 31 at the Griggs, Hoover
  and O'Shaughnessy marinas, dock office 614-645-3337.
  https://columbusrecparks.com/facilities/rentals/marinas-and-docks/ . Facility Alerts (no Hoover item on Oct. 28):
  https://columbusrecparks.com/facilities/alerts/ . Hoover Reservoir Parkland (Watershed Management 614-645-1721):
  https://columbusrecparks.com/parks/hoover-reservoir-parkland/ . Last year, news only: The Westerville News, Nov. 1,
  2025, "The final sailboats were removed from Hoover Reservoir's city docks Friday" (Oct. 31, 2025):
  https://www.thewestervillenews.com/p/summer-ends-when-boats-leave-hoover . No ramp dock pull date is posted.
- Alum Creek: ODNR Alum Creek State Park (office 740-548-4631, dock lottery), Alum Creek Marina docking page
  (12 transient slips, max 4 days; April and October hours Sat. and Sun. only, 9 am to 6 pm; 740-548-6056).
  https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/alum-creek-state-park and https://www.alumcreekmarina.net/docking.html
- Buckeye Lake: ODNR Buckeye Lake State Park (office 740-527-4218; lottery docks at Fairfield Beach).
  https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/buckeye-lake-state-park
- Drawdowns: ODNR, Winter Drawdowns at Ohio State Park Lakes (page dated June 24, 2024; table still shows the
  2025 to 2026 winter on Oct. 28, 2026): Alum Creek 3 ft, 10/01/25 to 11/01/25, refill 03/15/26 to 04/15/26, flood
  control (Corps of Engineers); Buckeye Lake 3 ft, 11/15/25 to 12/15/25, refill 03/01/26 to 05/01/26, dock maintenance,
  seawall repair, shoreline maintenance.
  https://ohiodnr.gov/discover-and-learn/land-water/inland-lakes/osp-winter-drawdowns
- No 2026 dock pull dates are posted for any of the three on Oct. 28, 2026.
- Watching: `python3 tools/check-docks.py` reads every page in the `watch` list of `data/docks.json` and compares
  the dock, ramp, closure and drawdown sentences with `tools/docks-watch-state.json`. Last line `RESULT: CHANGED n`
  means read the +/- lines and the page, update `data/docks.json` (and `checked`), rebuild, then rerun with
  `--update` and commit the new baseline. ODNR and Columbus also post on Facebook; those are not watched.

## Ice season (ice.html), checked Oct. 27, 2026

- ODNR Ice Fishing Safety: https://ohiodnr.gov/discover-and-learn/safety-conservation/recreational-safety/ice-fishing-safety
  ("No ice is safe ice", safety tips, six tip-ups labeled with name and address, Buckeye Lake as a saugeye ice lake).
- ODNR Ice Thickness Guidelines: https://ohiodnr.gov/discover-and-learn/safety-conservation/recreational-safety/ice-thickness-guidelines
  (linked only; no thickness numbers on the site).
- City of Columbus Watershed Management (Hoover "subject to significant water level fluctuation", 614-645-1721):
  https://www.columbus.gov/Services/Columbus-Water-Power/About-Columbus-Water-Power/The-Division-of-Water/Reservoir-Land-Stewardship-Program/About-the-Columbus-Watershed-Management-Section
- Winter species: December to February picks from the site's own biting data. No ice reports, ever.

## Offline and Add to Home Screen

No new data. The service worker (`sw.js`) caches this site's own files only; live NWS, USGS and Corps of Engineers requests are never cached by it. The last good live readings are kept in the browser (localStorage) and shown offline with "Offline. Last updated HH:MM ET". Details and the plan for the live site are in SERVICE-WORKER.md.

## Stocking & surveys (stocking.html), checked Oct. 27, 2026
- ODNR District 1 lake PDFs, `https://ohiodnr.gov/static/documents/wildlife/fishing-forecasts-reports/d1/lakes/<Lake> <Species> Stocking|Survey up20.pdf` and the Angler Survey PDFs. Data through 2019; files last modified Mar. 15, 2024 on ODNR's server. Values copied by hand from the PDF tables and checked against the rendered PDF.
- Hoover: saugeye, blue catfish and walleye stocking; saugeye, crappie and largemouth bass length at age with ODNR's statewide average; 2016 angler survey. Alum Creek: saugeye and muskellunge stocking; the same three growth tables; 2018 angler survey.
- Not copied: catch rate bar charts (images only, linked); channel catfish growth tables (ages don't line up cleanly, linked).
- Forecast bullets: summarized from the Fishing Forecast on each ODNR fishing area page (hoover-reservoir-fishing-area, alum-creek-lake-fishing-area). Undated by ODNR.
- Buckeye Lake: ODNR's fishing area page posts no stocking, survey or forecast data. Lake facts (built about 1830, about 2,873 acres, average about 6 ft, max about 14 ft) are from that page.
- Newer stocking (2020 on): ODNR Fish Stocking Database on DataOhio, https://ohiodnr.gov/buy-and-apply/hunting-fishing-boating/fishing-resources/fish-stocking-records . Linked, not copied.
- Habitat map: links to ODNR's Interactive Ohio Lake Fishing Map (ArcGIS Experience, deep link per lake) and ODNR's lake depth map PDFs (dam.assets.ohio.gov .../wildlife/maps/hooverreservoir2.pdf, alumcreeklake2.pdf, buckeyelake2.pdf). Nothing hosted or traced; reuse terms for the GIS service were not found.
- Built by tools/build-stocking.py (values live in the script). Edit there, run it, then tools/stamp-version.py.

## Lake rules, water quality and Buckeye facts (preview, Phase 2)

Checked Oct. 27, 2026. Copied only from the agency that runs each lake; nothing is paraphrased into a new rule.

- Hoover boating rules (water.html#rules): Columbus City Code 921.01 (https://library.municode.com/oh/columbus/codes/code_of_ordinances?nodeId=TIT9STPAPUPRCO_CH921WARE): 10 hp, 8 to 22 ft (sail to 25 ft), 10 mph, idle within 100 ft of shore, motors over 10 hp tilted or prop removed, no water skiing, no boating within 100 ft downriver of the dam; 921.01-1(F) bans personal watercraft. Columbus Rec and Parks Hoover page (https://columbusrecparks.com/parks/hoover-reservoir-parkland/) lists 9.9 hp max, no wakeboarding, tubing or swimming in any City reservoir.
- Alum Creek: ODNR Alum Creek Lake Fishing Area page: unlimited horsepower, portions of the lake are no wake zones.
- Buckeye Lake: ODNR Buckeye Lake Fishing Area page: no horsepower restrictions; built about 1830, about 6 ft average and 14 ft max depth, relatively flat bottom with little woody cover. 2,873 acres and the 300 ft no wake zone are from the ODNR fishing map (buckeyelake2.pdf).
- Fishing seasons and limits are not copied. The "Check official regs" button links ODNR's Ohio Fishing Regulations PDF.
- Water quality (water.html#water-quality): links only, to ODH BeachGuard (https://publicapps.odh.ohio.gov/beachguardpublic/) and Ohio EPA harmful algal blooms (https://epa.ohio.gov/monitor-pollution/pollution-issues/harmful-algae-blooms). No advisory status is fetched or shown.
- Species stocking lines (tools/build-species-stocking-lines.py): one line on saugeye, blue catfish, walleye, muskellunge, black and white crappie, largemouth bass and channel catfish pages, copied from the same ODNR PDFs as /stocking, linking to it for that lake. None on Buckeye, which has no ODNR tables.

## Tonight, in short and Local notes (preview, Phase 3)

- "Tonight, in short" (home Tonight card, js/conditions.js renderLine) restates numbers already on the page in one line: sunset (or "after dark now"), tonight's NWS hourly wind range and top rain chance from sunset to 2 AM, storms if the storm line found any, the KCMH 3 hour pressure trend, the gauge water temp when there is one, and the pool card's "below full pool" figure and 7 day trend word. No score, no prediction; it hides when none of those are loaded. The separate "Tonight's bite" rule of thumb line is unchanged.
- Local notes (water.html#notes) holds the owner's own notes. It ships with placeholder slots marked "Sample note, replace with your own" and no content. See LOCAL-NOTES.md.
- ODNR fishing map layers (DOW_LakeFishing MapServer) are not embedded: the service publishes no copyright, description or reuse terms, so the site stays link only. The legacy USGS waterservices fallback stays in place.
