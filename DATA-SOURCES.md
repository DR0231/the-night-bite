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
- USGS 03228400, Hoover Reservoir at Central College OH, parameter 62614 (lake elevation, ft NGVD29), `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=03228400&parameterCd=62614&period=P7D`. Same gauge as js/usgs.js. Provisional.

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
| Species shown | saugeye, walleye, muskellunge, largemouth and smallmouth bass, white and black crappie, white bass, bluegill, channel catfish (ODNR Alum Creek Lake Fishing Area, https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/alum-creek-lake-fishing-area) | saugeye, largemouth bass, white and black crappie, bluegill, yellow perch, channel catfish, bullhead (ODNR Buckeye Lake State Park, https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/buckeye-lake-state-park) |

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

## Offline and Add to Home Screen

No new data. The service worker (`sw.js`) caches this site's own files only; live NWS, USGS and Corps of Engineers requests are never cached by it. The last good live readings are kept in the browser (localStorage) and shown offline with "Offline. Last updated HH:MM ET". Details and the plan for the live site are in SERVICE-WORKER.md.
