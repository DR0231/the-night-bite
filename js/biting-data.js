/**
 * The Night Bite: "What's biting now" data for the Species page (12 months, Hoover Reservoir).
 * Static and local, so the card works with no network. js/biting.js picks the month in America/New_York.
 * Each month lists the 2 or 3 best bets, catfish first wherever that's true (May to October nights).
 *
 * Sources (checked 2026-10-22):
 *  · The Night Bite species pages (Season, Time of day, Where on Hoover sections), /species/*.html
 *  · ODNR Hoover Reservoir Fishing Area, fishing forecast: https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/hoover-reservoir-fishing-area
 *    (channel, flathead and blue catfish; white bass spring run up Big Walnut Creek and schools on shad all year)
 *  · ODNR news, "Central Ohio is a Fishing Destination for Saugeye, Crappie, Bass, and Catfish" (May 29, 2025):
 *    Hoover crappie school on the edges of points near deep water after May, 1/16 oz jigs; catfish on the north end
 *    with cut bait from spring through summer
 *  · ODNR central Ohio release reprinted by Madison SWCD (Apr 26, 2022) and Lancaster Eagle-Gazette (Jun 13, 2024):
 *    best catfishing north of Sunbury Road, cut shad; crappie move to shore cover to spawn
 *  · ODNR Hoover Reservoir fishing map (contours at 894 ft): https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/hooverreservoir2.pdf
 *  · Columbus Recreation and Parks, Hoover Reservoir Parkland (10 hp, 10 mph, fishing access): https://columbusrecparks.com/parks/hoover-reservoir-parkland/
 *  · Depth ranges for channel catfish and crappie by season: A and A Fishing, Hoover Reservoir report (Rick Seaman, updated
 *    July 13, 2026), https://www.aa-fishing.com/oh/hoover-reservoir-fishing-report.html (a guide's report, used as typical ranges only)
 */
window.NightBiteBiting = {
  species: {
    "channel-catfish": "Channel catfish",
    "blue-catfish": "Blue catfish",
    "flathead-catfish": "Flathead catfish",
    "black-crappie": "Crappie",
    "saugeye": "Saugeye",
    "white-bass": "White bass"
  },
  months: [
    { // January
      note: "Check ice and cold water safety before any winter trip.",
      picks: [
        { id: "black-crappie", where: "Deep schools over brush and channel swings, 15 to 25 ft, fished slow and vertical from a boat.", when: "Midday, the warmest hours", night: false },
        { id: "channel-catfish", where: "Deep holes and channel ledges, 20 to 30 ft. Cut bait, fished slow.", when: "Midday into afternoon. Day can beat night in cold water", night: false },
        { id: "saugeye", where: "Breaks and channel edges, slow and deep.", when: "Dusk and after dark", night: true }
      ]
    },
    { // February
      note: "Check ice and cold water safety before any winter trip.",
      picks: [
        { id: "black-crappie", where: "Still deep, 15 to 25 ft, holding near brush and channel edges.", when: "Midday, the warmest hours", night: false },
        { id: "saugeye", where: "Riprap and breaks near the ramps, slow presentations until the water warms.", when: "Dusk into dark on milder days", night: true },
        { id: "channel-catfish", where: "Deep holes, 20 to 30 ft, near the dam basin and the old Big Walnut channel.", when: "Midday into afternoon", night: false }
      ]
    },
    { // March
      picks: [
        { id: "saugeye", where: "Riprap, points and breaks as the water warms. Shallow low light bites start.", when: "Dusk and after dark", night: true },
        { id: "black-crappie", where: "Moving toward the upper arms and Oxbow, on brush and wood, shallower as it warms.", when: "Afternoon, when the water is warmest", night: false },
        { id: "channel-catfish", where: "Mud line banks on the north end warm first. A slow start.", when: "Late afternoon into evening", night: false }
      ]
    },
    { // April
      picks: [
        { id: "white-bass", where: "Spring run up Big Walnut Creek, from public banks and bridges only.", when: "Daytime and dusk while the run is on", night: false },
        { id: "black-crappie", where: "Shallow banks and cover in the upper arms and Oxbow. Peak bank fishing.", when: "Dawn and dusk", night: false },
        { id: "channel-catfish", where: "Warming coves and flats, 5 to 20 ft, north of Sunbury Road.", when: "Late evening into dark", night: true }
      ]
    },
    { // May
      picks: [
        { id: "channel-catfish", where: "Pre-spawn push to the shallows. North end flats and banks, cut bait or crawlers.", when: "After dark, the night bank bite picks up", night: true },
        { id: "blue-catfish", where: "North end channel edges with cut shad, from spring through summer.", when: "Night and low light", night: true },
        { id: "black-crappie", where: "Shore cover for the spawn, then the edges of points near deep water.", when: "Dawn and dusk", night: false }
      ]
    },
    { // June
      picks: [
        { id: "channel-catfish", where: "Flats next to drops by Walnut Road, Oxbow and the upper arms.", when: "After dark, once boat traffic dies", night: true },
        { id: "flathead-catfish", where: "Timber, rock and channel bends, with live or fresh bait.", when: "Night. Prime season starts", night: true },
        { id: "black-crappie", where: "Schools on the edges of points near deep water. Small 1/16 oz jigs.", when: "Dawn and dusk", night: false }
      ]
    },
    { // July
      picks: [
        { id: "channel-catfish", where: "Classic night fishery. Public flats near Walnut Road and the quiet upper arms.", when: "After dark, the best window", night: true },
        { id: "flathead-catfish", where: "Big flats hunt timber and channel bends. Live bait near cover.", when: "Night, prime time", night: true },
        { id: "blue-catfish", where: "Deeper basin and the old Big Walnut channel, cut bait.", when: "Night", night: true }
      ]
    },
    { // August
      picks: [
        { id: "channel-catfish", where: "Flats near drops and channel cuts, cut bait or crawlers.", when: "After dark", night: true },
        { id: "flathead-catfish", where: "Wood, rock and channel bends, live or fresh bait.", when: "Night", night: true },
        { id: "white-bass", where: "Open water schools chasing shad. Watch for birds and surface busts.", when: "Dawn and dusk, or whenever shad are busting", night: false }
      ]
    },
    { // September
      picks: [
        { id: "channel-catfish", where: "Feed up before the cool down. Flats and creek channels, 8 to 20 ft.", when: "Dusk into dark", night: true },
        { id: "blue-catfish", where: "Strong feed windows as the water cools. Channel edges and the dam basin.", when: "Night", night: true },
        { id: "saugeye", where: "Feeding along breaks and points as fall starts.", when: "Dusk and after dark", night: true }
      ]
    },
    { // October
      picks: [
        { id: "channel-catfish", where: "Moving to mid depth flats and channel edges. Cut bait or crawlers.", when: "Evening into dark", night: true },
        { id: "black-crappie", where: "Following bait into creeks and arms. Brush and wood, 5 to 12 ft.", when: "Dawn and dusk", night: false },
        { id: "saugeye", where: "Points, riprap and channel edges, best with some wind.", when: "Dusk and after dark", night: true }
      ]
    },
    { // November
      picks: [
        { id: "blue-catfish", where: "Fall feed on deep channel edges and the dam basin, cut shad.", when: "Night and gray days", night: true },
        { id: "saugeye", where: "Breaks and riprap as the water cools.", when: "Dusk and after dark", night: true },
        { id: "black-crappie", where: "Sliding deeper to points, creek channels and brush piles, 15 to 20 ft.", when: "Midday to afternoon", night: false }
      ]
    },
    { // December
      note: "Check ice and cold water safety before any winter trip.",
      picks: [
        { id: "black-crappie", where: "Deep schools, 15 to 25 ft, fished slow and vertical from a boat.", when: "Midday", night: false },
        { id: "channel-catfish", where: "Deep holes and ledges, 20 to 30 ft. Slow cut bait.", when: "Midday and afternoon. Night slows in cold water", night: false },
        { id: "saugeye", where: "Slow and deep along breaks.", when: "Dusk", night: true }
      ]
    }
  ]
};
