/**
 * The Night Bite: "What's biting now" data for Alum Creek Lake and Buckeye Lake (12 months each).
 * Same shape as js/biting-data.js (Hoover). js/biting.js picks the set for the active lake (js/lakes.js).
 * Typical seasonal patterns only, not a fishing report. Nothing here is a reading or a regulation.
 *
 * Sources (checked 2026-10-24):
 *  · ODNR Alum Creek Lake Fishing Area: https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/alum-creek-lake-fishing-area
 *    (saugeye, muskellunge, crappie, bass; muskie are stocked here)
 *  · ODNR Buckeye Lake State Park: https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/buckeye-lake-state-park
 *    (saugeye, crappie, bluegill, yellow perch, channel catfish, bullhead, largemouth bass)
 *  · Outdoor News, "Alum Creek's big water worth the angling effort" (Jan 27, 2026): the coves north of the
 *    Cheshire Road bridge hold bass, crappie, saugeye and muskie
 *  · Mount Vernon News, "Central Ohio spring fishing forecast" (Mar 29, 2025): Buckeye is shallow and warms first in
 *    spring, crappie and saugeye in under 2 ft of water on bobbers and minnows; Alum smallmouth move up early
 *  · Best Fishing in America, Alum Creek Lake and Buckeye Lake guides (guide-level, used for typical structure only:
 *    Alum saugeye on dam riprap, Cheshire causeway rock and channel ledges; Buckeye saugeye on riprap and old towpath
 *    drop-offs, channel cats on flats near deeper holes after dark)
 */
window.NightBiteBitingAlum = {
  species: {
    "saugeye": "Saugeye", "black-crappie": "Crappie", "muskellunge": "Muskellunge",
    "smallmouth-bass": "Smallmouth bass", "largemouth-bass": "Largemouth bass", "channel-catfish": "Channel catfish"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper channel ledges and the dam riprap, fished slow with jigs or blade baits.", when: "Midday, the warmest hours", night: false },
      { id: "black-crappie", where: "Deep brush and wood off the old creek channel, fished slow and vertical.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Dam riprap and rocky causeway banks on warm spells, slow jigs and minnows.", when: "Afternoon into dusk", night: false },
      { id: "black-crappie", where: "Deep wood in the coves north of Cheshire Road, small jigs under a slip float.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "Rocky banks and riprap as the water warms, jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "smallmouth-bass", where: "Rock and points that warm first. Jerkbaits, tubes and ned rigs, fished slow.", when: "Warm afternoons", night: false },
      { id: "black-crappie", where: "Moving toward the northern coves and shallow wood.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Protected coves and shallow wood north of Cheshire Road, minnows or small jigs under a float.", when: "Afternoon into dusk", night: false },
      { id: "saugeye", where: "Rocky banks and the causeway riprap, jigs and minnows.", when: "Dusk and after dark", night: true },
      { id: "muskellunge", where: "Warming coves and the Big Run arm in spring, slow baits.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "black-crappie", where: "Spawning in the coves, then sliding back to brush and wood.", when: "Morning and dusk", night: false },
      { id: "largemouth-bass", where: "Cove cover and shoreline wood in the no wake north end.", when: "Morning and dusk", night: false },
      { id: "channel-catfish", where: "Upper lake flats and creek mouths after rain, cut bait or crawlers.", when: "After dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats near the old creek channel, cut bait or crawlers on the bottom.", when: "After dark", night: true },
      { id: "saugeye", where: "Points, causeway rock and channel ledges, crawler harnesses or cranks.", when: "Dusk and after dark", night: true },
      { id: "smallmouth-bass", where: "Rock and points on the main lake.", when: "Morning", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Channel edges and flats off the creek channel, cut bait on the bottom.", when: "After dark", night: true },
      { id: "saugeye", where: "Deeper ledges and submerged roads by day, rock banks at night.", when: "After dark", night: true },
      { id: "muskellunge", where: "Trolling the causeways, dam riprap and cove mouths.", when: "Low light", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Channel edges and flats, cut bait or crawlers.", when: "After dark", night: true },
      { id: "saugeye", where: "Rock banks and the causeway riprap after sunset.", when: "After dark", night: true },
      { id: "black-crappie", where: "Deeper brush and wood, small jigs.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and riprap as the water cools, jigs and cranks.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats near the channel, cut bait.", when: "After dark", night: true },
      { id: "muskellunge", where: "Weed edges, cove mouths and causeways as the fall bite starts.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "muskellunge", where: "The fall muskie push. Weed edges, cover and cove mouths, big bucktails and plugs.", when: "Afternoon into dusk", night: false },
      { id: "saugeye", where: "Rocky banks, riprap and channel ledges, jigs and minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Docks, brush and standing wood in deeper water.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "saugeye", where: "Dam riprap and causeway rock, jigs and blade baits.", when: "Dusk and after dark", night: true },
      { id: "muskellunge", where: "Late fall fish on main lake points and causeways.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Dam riprap and deeper ledges, slow jigs.", when: "Midday into dusk", night: false },
      { id: "black-crappie", where: "Deep wood off the channel.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingBuckeye = {
  species: {
    "saugeye": "Saugeye", "black-crappie": "Crappie", "bluegill": "Bluegill / sunfish",
    "yellow-perch": "Yellow perch", "channel-catfish": "Channel catfish", "largemouth-bass": "Largemouth bass"
  },
  months: [
    { note: "Buckeye is shallow and ices fast. Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Riprap and the slightly deeper water off the old towpath, slow jigs and minnows.", when: "Midday", night: false },
      { id: "black-crappie", where: "Docks, pilings and brush, minnows under a float.", when: "Midday", night: false } ] },
    { note: "Buckeye is shallow and ices fast. Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Riprap on warm spells, minnows fished slow.", when: "Afternoon into dusk", night: false },
      { id: "yellow-perch", where: "Rock and weed edges, minnows or crawlers near the bottom.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Buckeye warms first in central Ohio. Shallow cover in under 2 ft of water, bobbers and minnows.", when: "Afternoon", night: false },
      { id: "saugeye", where: "Shallow rock and riprap, live minnows or small swimbaits.", when: "Dusk and after dark", night: true } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Shallow docks, stumps and brush, minnows or small jigs under a float.", when: "Afternoon into dusk", night: false },
      { id: "saugeye", where: "Riprap and hard bottom, jigs and minnows.", when: "Dusk and after dark", night: true },
      { id: "bluegill", where: "Warming shallow bays and docks.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "bluegill", where: "Spawning beds in shallow bays and around docks, small baits.", when: "Morning and evening", night: false },
      { id: "black-crappie", where: "Sliding back from the banks to docks and brush.", when: "Morning and dusk", night: false },
      { id: "channel-catfish", where: "Flats near the deeper holes, crawlers or cut bait.", when: "After dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Shallow flats near deeper holes, cut bait, crawlers or liver on the bottom.", when: "After dark", night: true },
      { id: "bluegill", where: "Docks, weeds and shallow cover.", when: "Morning and evening", night: false },
      { id: "largemouth-bass", where: "Docks and shoreline cover.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats near the deeper holes, cut bait on the bottom.", when: "After dark", night: true },
      { id: "saugeye", where: "Riprap and old towpath drop-offs, crawler harnesses or cranks.", when: "Dusk and after dark", night: true },
      { id: "bluegill", where: "Docks and shade.", when: "Morning", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats and holes, cut bait or crawlers.", when: "After dark", night: true },
      { id: "saugeye", where: "Riprap and hard bottom after sunset.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Docks and shade.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Riprap, bridge and culvert edges as the water cools.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats near the deeper holes.", when: "After dark", night: true },
      { id: "black-crappie", where: "Docks, brush and pilings.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Riprap, bridge and culvert edges and the deeper water off the towpath. Jigs with minnows or chartreuse twisters.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Docks, brush, stumps and pilings, small jigs or minnows.", when: "Afternoon", night: false },
      { id: "yellow-perch", where: "Rock and weed edges, minnows or crawlers. Less steady than crappie.", when: "Midday", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "saugeye", where: "Riprap and hard bottom, jigs and minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Docks and brush.", when: "Afternoon", night: false } ] },
    { note: "Buckeye is shallow and ices fast. Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Riprap and slightly deeper water, slow jigs.", when: "Midday into dusk", night: false },
      { id: "yellow-perch", where: "Rock and weed edges, minnows near the bottom.", when: "Midday", night: false } ] }
  ]
};
