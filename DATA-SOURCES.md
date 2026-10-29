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

## Lake-aware Species (js/species-lake.js)

No new data. Which species live at each lake: `data-lakes` on each card (same lists as `js/lakes.js`). Biting now:
the current month's picks from `js/biting-data.js` / `js/biting-data-lakes.js`. Ramps and access: the lake's map data
places of type ramp or access, shown with their own source labels.

## Share card (js/tonight-tools.js)

No new data. The card copies the Right now strip (USGS or USACE gauge with its "Checked" time; bite rule of thumb
from the NWS forecast with its "Checked" time) and prints "--" for anything missing. Static per-lake OG images
(`assets/og/og-alum.png`, `og-buckeye.png`) are the site art with the lake's name, no live data.

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
