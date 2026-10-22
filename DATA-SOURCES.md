# Data sources (live data features)

Updated 2026-10-22 (ET): boardwalk added; What's biting now added.

Checked 2026-10-22 (ET). Only details confirmed by a source below are shown on the site. Anything missing was left out on purpose.

## Tonight at Hoover card (js/conditions.js)
- Forecast: National Weather Service API, `https://api.weather.gov/points/40.11,-82.88` resolves to office ILN (Wilmington, OH), gridpoint 89,88. Hourly forecast: `https://api.weather.gov/gridpoints/ILN/89,88/forecast/hourly`. Wind, air temp, rain chance (max of the next 12 hourly periods).
- Pressure trend: `https://api.weather.gov/stations/KCMH/observations`. KCMH (John Glenn Columbus International Airport, 39.99 N 82.88 W) is the first station NWS lists for gridpoint ILN 89,88 (`/gridpoints/ILN/89,88/stations`, next are KOSU and KDLZ). Trend compares the newest barometric pressure with the reading closest to 12 hours earlier: rising or falling when the change is 1 hPa (about 0.03 inHg) or more, otherwise steady.
- Sunset and moonrise: computed in the browser (js/astro.js, port of SunCalc by Vladimir Agafonkin, BSD 2-Clause). Checked against the US Naval Observatory for 2026-10-22 and 23 at 40.11 N 82.88 W: sunset within 2 minutes, moonrise within 4 minutes.
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

## Offline and Add to Home Screen

No new data. The service worker (`sw.js`) caches this site's own files only; live NWS and USGS requests are never cached by it. The last good live readings are kept in the browser (localStorage) and shown offline with "Offline. Last updated HH:MM ET". Details and the plan for the live site are in SERVICE-WORKER.md.
