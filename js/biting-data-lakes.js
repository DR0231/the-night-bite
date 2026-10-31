/**
 * The Night Bite: "What's biting now" data for every lake but Hoover (12 months each).
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
 *  · Mount Vernon News, "Central Ohio spring fishing forecast" (Mar 29, 2025): Buckeye Lake is shallow and warms first in
 *    spring, crappie and saugeye in under 2 ft of water on bobbers and minnows; Alum smallmouth move up early
 *  · Best Fishing in America, Alum Creek Lake and Buckeye Lake guides (guide-level, used for typical structure only:
 *    Alum saugeye on dam riprap, Cheshire causeway rock and channel ledges; Buckeye Lake saugeye on riprap and old towpath
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
    { note: "Buckeye Lake is shallow and ices fast. Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Riprap and the slightly deeper water off the old towpath, slow jigs and minnows.", when: "Midday", night: false },
      { id: "black-crappie", where: "Docks, pilings and brush, minnows under a float.", when: "Midday", night: false } ] },
    { note: "Buckeye Lake is shallow and ices fast. Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Riprap on warm spells, minnows fished slow.", when: "Afternoon into dusk", night: false },
      { id: "yellow-perch", where: "Rock and weed edges, minnows or crawlers near the bottom.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Buckeye Lake warms first in central Ohio. Shallow cover in under 2 ft of water, bobbers and minnows.", when: "Afternoon", night: false },
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
    { note: "Buckeye Lake is shallow and ices fast. Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Riprap and slightly deeper water, slow jigs.", when: "Midday into dusk", night: false },
      { id: "yellow-perch", where: "Rock and weed edges, minnows near the bottom.", when: "Midday", night: false } ] }
  ]
};

/*
 * O'Shaughnessy Reservoir, Griggs Reservoir, Indian Lake and Delaware Lake (added 2026-10-29). Official sources only:
 *  · ODNR Fishing Tips by Species: https://ohiodnr.gov/discover-and-learn/education-training/wild-ohio-harvest-community/fishing-tips
 *    (the month by month "Seasonal Fishing Approaches" tables: timing, baits and structure for each species; hybrid
 *    striped bass are stocked in Griggs and O'Shaughnessy)
 *  · ODNR news, "Central Ohio is a Fishing Destination for Crappie, Bass, and Catfish" (June 12, 2026): Griggs hybrids
 *    over 20 inches, schools chasing shad at the surface in summer, gulls diving on shad, swimbaits, rattle traps, topwater
 *  · ODNR O'Shaughnessy and Griggs Reservoir Fishing Area pages (rock bottom in the south, mud and silt in the north;
 *    deepest water near the dams)
 *  · ODNR Indian Lake Fishing Area page and Indian Lake State Park page (saugeye, crappie, bass in shallow vegetation,
 *    bluegill over 8 inches, channel and flathead catfish, white bass spawning run near Moundwood; jetties at Old Field Beach)
 *  · ODNR Delaware Lake Fishing Area page and Delaware State Park page (crappie, bass, channel catfish, bluegill, white bass)
 * ODNR posts written fishing notes only for hybrid striped bass at O'Shaughnessy and Griggs, so their picks cover
 * hybrids only. The other species ODNR surveys record there show on the Species page without monthly picks.
 */
(function () {
  var COLD = "Cold water. Wear a life jacket on every early season boat trip.";
  var ICE = "Check ice and cold water safety before any winter trip.";
  function hybrids(lake, upstream) {
    var H = "hybrid-striped-bass";
    return {
      species: { "hybrid-striped-bass": "Hybrid striped bass" },
      months: [
        { note: ICE, picks: [{ id: H, where: "Deep water near the dam, deep points and creek mouths. Slow jigging spoons and tail spinners.", when: "Midday", night: false }] },
        { note: ICE, picks: [{ id: H, where: "Deep points and the deepest water near the dam. Spoons and tail spinners, fished slow.", when: "Midday", night: false }] },
        { note: COLD, picks: [{ id: H, where: "Moving " + upstream + " as the water warms. Minnow baits and crankbaits.", when: "Afternoon into dusk", night: false }] },
        { note: COLD, picks: [{ id: H, where: "Spawning run " + upstream + ". Minnow baits, crankbaits, spoons and jigs.", when: "Dusk", night: false }] },
        { picks: [{ id: H, where: "Back down the lake: creek mouths, deep points and shallow flats. Try a range of depths.", when: "Dawn and dusk", night: false }] },
        { picks: [{ id: H, where: "Schools chasing shad at the surface. Watch for diving gulls; swimbaits, rattle traps and topwater.", when: "Dawn, dusk and overcast days", night: false }] },
        { note: "Hybrids caught in water over 70°F die more often after release: land them fast and keep them in the water.", picks: [{ id: H, where: "Surface schools on shad, or live shad and cut bait on the bottom.", when: "Dawn and dusk", night: false }] },
        { note: "Hybrids caught in water over 70°F die more often after release: land them fast and keep them in the water.", picks: [{ id: H, where: "Surface schools on shad. Swimbaits, rattle traps and topwater.", when: "Dawn and dusk", night: false }] },
        { picks: [{ id: H, where: "Fish breaking the surface on shad. Shad crankbaits and flashy metal lures.", when: "Dusk", night: false }] },
        { picks: [{ id: H, where: "Moving shallower as the water cools. Spoons into bait schools, shad crankbaits, cut bait on the bottom.", when: "Afternoon into dusk", night: false }] },
        { picks: [{ id: H, where: "Schools of baitfish and the flats near them. Spoons and cut bait.", when: "Afternoon", night: false }] },
        { note: ICE, picks: [{ id: H, where: "Deep points, creek mouths and the deep water near the dam. Vertical jigging spoons.", when: "Midday", night: false }] }
      ]
    };
  }
  window.NightBiteBitingOshaughnessy = hybrids("oshaughnessy", "up the lake toward the Scioto River and Mill Creek arms at the north end");
  window.NightBiteBitingGriggs = hybrids("griggs", "up the lake toward the Scioto River at the north end");
})();

window.NightBiteBitingIndian = {
  species: {
    "saugeye": "Saugeye", "black-crappie": "Crappie", "largemouth-bass": "Largemouth bass", "bluegill": "Bluegill",
    "channel-catfish": "Channel catfish", "flathead-catfish": "Flathead catfish", "white-bass": "White bass", "yellow-perch": "Yellow perch"
  },
  months: [
    { note: "Indian Lake is shallow and ices early. Check ice and cold water safety before any winter trip.", picks: [
      { id: "bluegill", where: "Through the ice: small ice jigs with a wax worm near the bottom or around vegetation.", when: "Midday", night: false },
      { id: "yellow-perch", where: "Deeper water near the bottom, small jigs with minnows or wax worms.", when: "Midday", night: false },
      { id: "saugeye", where: "Shallow bars at twilight in open water, or nearby deeper water by day. Jigs with minnows.", when: "Dusk", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "bluegill", where: "Through the ice, jigging small jigs tipped with wax worms.", when: "Midday", night: false },
      { id: "yellow-perch", where: "Deeper water near the bottom.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "Riprap and large shallow bars as the water warms. Jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving toward spawning areas along channels. Minnows under bobbers around wood.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Shallow wood near spawning areas. Small jigs or minnows under a bobber.", when: "Afternoon into dusk", night: false },
      { id: "yellow-perch", where: "Moving in shore to spawn in mid April. Small minnows near the bottom from the bank.", when: "Morning", night: false },
      { id: "saugeye", where: "Riprap and bars, jigs and minnows.", when: "Dusk and after dark", night: true } ] },
    { picks: [
      { id: "white-bass", where: "Spawning run up the South Fork of the Great Miami River near Moundwood. Jigs, spoons and spinners.", when: "Afternoon", night: false },
      { id: "bluegill", where: "Spawning beds in 1 to 2 ft of water. Wax worms or crickets.", when: "Morning", night: false },
      { id: "largemouth-bass", where: "Shallow vegetation and points. Spinnerbaits and medium crankbaits.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Shallow flats next to deeper holes. Chicken liver, shrimp or crawlers on the bottom.", when: "After dark", night: true },
      { id: "flathead-catfish", where: "Live fish on the bottom near wood and holes.", when: "After dark", night: true },
      { id: "saugeye", where: "Weed beds, stumps and shallow bars. Crawler harnesses or shad cranks.", when: "Dusk and after dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper holes and near the swimming beaches.", when: "After dark", night: true },
      { id: "flathead-catfish", where: "Live fish near wood and holes.", when: "After dark", night: true },
      { id: "white-bass", where: "Schools chasing shad at the surface on calm nights. Small spoons and spinners.", when: "After dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper holes, cut bait or crawlers.", when: "After dark", night: true },
      { id: "bluegill", where: "Shallow water in the evening, poppers or wax worms.", when: "Dusk", night: false },
      { id: "white-bass", where: "Surface schools on calm nights.", when: "After dark", night: true } ] },
    { picks: [
      { id: "saugeye", where: "Riprap and large points as the water cools. Diving crankbaits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving back shallow to wood and baitfish.", when: "Afternoon", night: false },
      { id: "channel-catfish", where: "Flats near deeper water.", when: "After dark", night: true } ] },
    { picks: [
      { id: "saugeye", where: "Very shallow at sunset on riprap and gravel points. Rat-L-Traps and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Shallow wood and baitfish. Marabou jigs and minnows under a bobber.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Following baitfish into coves and secondary points.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "saugeye", where: "Riprap and shallow points at sunset. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "yellow-perch", where: "Near the bottom with small minnows.", when: "Midday", night: false } ] },
    { note: "Indian Lake is shallow and ices early. Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Shallow bars at twilight in open water. Jigs with minnows.", when: "Dusk", night: false },
      { id: "bluegill", where: "Near the bottom or around vegetation, small jigs and wax worms.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingDelaware = {
  species: {
    "black-crappie": "Crappie", "largemouth-bass": "Largemouth bass", "smallmouth-bass": "Smallmouth bass",
    "channel-catfish": "Channel catfish", "bluegill": "Bluegill", "white-bass": "White bass"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "black-crappie", where: "Deep creek channel edges with wood or rock. Minnows or light jigs, very slow.", when: "Midday", night: false },
      { id: "white-bass", where: "Open water. Vertical jigging small spoons or minnows.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "black-crappie", where: "Deep creek beds near drop offs with cover, very slow.", when: "Midday", night: false },
      { id: "channel-catfish", where: "Deeper water; dead minnows on the bottom, left still.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Moving up creek channels toward spawning areas. Minnows under bobbers around wood.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Secondary points, brush and stumps. Jigs and creature baits.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Woody cover near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false },
      { id: "white-bass", where: "Mouths of the feeder streams. Small jigs and spinners.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Secondary points and brushy areas.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "white-bass", where: "Spawning run up the feeder streams. Jigs, spoons and spinners.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Spawned out, sliding back to points and fallen trees.", when: "Morning and dusk", night: false },
      { id: "smallmouth-bass", where: "Rocky bottom. Tubes and twister tail jigs.", when: "Morning", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Shallow flats next to deeper holes. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Main lake points with riprap or hard bottom. Crankbaits and spinnerbaits.", when: "Dawn and dusk", night: false },
      { id: "bluegill", where: "Shallow water in the evening, poppers or worms.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper holes and near the swim beach.", when: "After dark", night: true },
      { id: "black-crappie", where: "Suspended over main lake points; moves shallower at night to feed.", when: "Dusk", night: false },
      { id: "white-bass", where: "Schools chasing shad at the surface on calm days.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Points with riprap or hard bottom, near baitfish.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "black-crappie", where: "Moving back shallow to wood and baitfish. Marabou jigs and minnows.", when: "Afternoon", night: false },
      { id: "channel-catfish", where: "Schooling up near flats beside deeper water and feeder streams.", when: "After dark", night: true },
      { id: "smallmouth-bass", where: "Rock and cover. Tubes, spinners and jigs in light colors.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "black-crappie", where: "Woody cover and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Backs of coves and secondary points, following baitfish.", when: "Afternoon", night: false },
      { id: "white-bass", where: "Open water schools on baitfish.", when: "Dusk", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "black-crappie", where: "Woody cover in deeper water.", when: "Afternoon", night: false },
      { id: "channel-catfish", where: "Flats beside deeper water and feeder streams.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "black-crappie", where: "Deep creek beds near drop offs with cover, very slow.", when: "Midday", night: false },
      { id: "largemouth-bass", where: "Deep points and drops with baitfish. Jigging spoons.", when: "Midday", night: false } ] }
  ]
};

/*
 * Deer Creek Lake, Madison Lake, Knox Lake and Clear Fork Reservoir (added 2026-10-30). Official sources only:
 *  · ODNR Fishing Tips by Species (the month by month "Seasonal Fishing Approaches" tables), as above
 *  · ODNR Deer Creek Lake Fishing Area and Deer Creek State Park pages (early spring saugeye below the dam; catfish,
 *    largemouth and crappie; level changes up to 20 ft) and ODNR Fish Stocking (saugeye every year)
 *  · ODNR Madison Lake State Park page (bass, bluegill, crappie, channel catfish, bullhead; electric motors only)
 *  · ODNR Knox Lake Fishing Area page (largemouth, trophy flatheads, crappie, bluegill, channel catfish, yellow perch;
 *    rock and gravel lower lake, standing timber upper lake, felled trees on the lower shoreline)
 *  · ODNR Clear Fork Reservoir Fishing Area page (stumps in the shallow upper end, islands mid-lake, deeper open
 *    lower end) and ODNR Fish Stocking (muskellunge every year)
 * Species with no lake notes (smallmouth at Deer Creek, for one) show on the Species page without monthly picks.
 */
window.NightBiteBitingDeercreek = {
  species: {
    "saugeye": "Saugeye", "black-crappie": "Crappie", "largemouth-bass": "Largemouth bass",
    "channel-catfish": "Channel catfish", "bluegill": "Bluegill", "white-bass": "White bass"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows, fished slow.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep channel edges with cover. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Below the dam and deep water near it. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip. The level can change fast after rain.", picks: [
      { id: "saugeye", where: "Below the dam: the early spring bite ODNR names. Jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving toward spawning areas. Minnows under bobbers around wood.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip. The level can change fast after rain.", picks: [
      { id: "saugeye", where: "Below the dam and riprap. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Woody cover near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false },
      { id: "white-bass", where: "Mouths of the feeder streams. Small jigs and spinners.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "white-bass", where: "Spawning run up the feeder streams. Jigs, spoons and spinners.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Shallow cover and points. Spinnerbaits and medium crankbaits.", when: "Morning and dusk", night: false },
      { id: "bluegill", where: "Spawning beds in 1 to 2 ft of water. Wax worms or crickets.", when: "Morning", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Shallow flats next to deeper holes. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "saugeye", where: "Points and flats. Crawler harnesses or shad cranks.", when: "Dusk and after dark", night: true },
      { id: "bluegill", where: "Shallow water in the evening, poppers or worms.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper holes and near the swim beach.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Points with riprap or hard bottom. Crankbaits and spinnerbaits.", when: "Dawn and dusk", night: false },
      { id: "white-bass", where: "Schools chasing shad at the surface on calm days.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "saugeye", where: "Points and riprap, crawler harnesses.", when: "Dusk and after dark", night: true } ] },
    { picks: [
      { id: "saugeye", where: "Riprap and large points as the water cools. Diving crankbaits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving back shallow to wood and baitfish.", when: "Afternoon", night: false },
      { id: "channel-catfish", where: "Flats near deeper water and feeder streams.", when: "After dark", night: true } ] },
    { note: "Fall drawdown: the lake drops toward winter pool. Check the Corps level before you launch.", picks: [
      { id: "saugeye", where: "Very shallow at sunset on riprap and points. Rat-L-Traps and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Woody cover and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Following baitfish into coves and secondary points.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan. The lake is drawn down toward winter pool.", picks: [
      { id: "saugeye", where: "Riprap and points at sunset, and below the dam. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Woody cover in deeper water.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Below the dam and deep water near it. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingMadison = {
  species: {
    "largemouth-bass": "Largemouth bass", "black-crappie": "Crappie", "bluegill": "Bluegill",
    "channel-catfish": "Channel catfish", "bullhead": "Bullhead"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "bluegill", where: "Through the ice: small jigs with a wax worm near the bottom.", when: "Midday", night: false },
      { id: "black-crappie", where: "The deepest water along the old stream channel. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "bluegill", where: "Through the ice, jigging small jigs tipped with wax worms.", when: "Midday", night: false },
      { id: "black-crappie", where: "Deep water near the dam, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Moving toward shallow cover. Minnows under bobbers.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Warming shallows on sunny days. Jigs and slow baits.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Shallow cover near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false },
      { id: "bullhead", where: "Shallow, warming water. Crawlers on the bottom.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shallow cover. Spinnerbaits and jigs.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "bluegill", where: "Spawning beds in 1 to 2 ft of water. Wax worms or crickets.", when: "Morning", night: false },
      { id: "largemouth-bass", where: "Shallow cover and points. Spinnerbaits and soft plastics.", when: "Morning and dusk", night: false },
      { id: "bullhead", where: "Shallow edges, crawlers on the bottom.", when: "After dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to the old stream channel. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "bullhead", where: "Shallow edges, crawlers on the bottom.", when: "After dark", night: true },
      { id: "bluegill", where: "Shallow water in the evening, poppers or worms.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shallow cover and shade. Topwater at first and last light.", when: "Dawn and dusk", night: false },
      { id: "bullhead", where: "Shallow edges after dark.", when: "After dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "bluegill", where: "Shallow cover, worms under a small float.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "black-crappie", where: "Moving back shallow to cover and baitfish.", when: "Afternoon", night: false },
      { id: "channel-catfish", where: "Flats near the old stream channel.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shallow cover as the water cools.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "black-crappie", where: "Cover and baitfish. Jigs and minnows under a bobber.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Following baitfish into the shallows.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "black-crappie", where: "Deeper water along the old stream channel.", when: "Afternoon", night: false },
      { id: "bluegill", where: "Deeper water, small jigs near the bottom.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "black-crappie", where: "Deep water near the dam, very slow.", when: "Midday", night: false },
      { id: "bluegill", where: "Near the bottom, small jigs and wax worms.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingKnox = {
  species: {
    "largemouth-bass": "Largemouth bass", "flathead-catfish": "Flathead catfish", "black-crappie": "Crappie",
    "bluegill": "Bluegill", "channel-catfish": "Channel catfish", "yellow-perch": "Yellow perch"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "bluegill", where: "Through the ice: small ice jigs with a wax worm near the bottom.", when: "Midday", night: false },
      { id: "yellow-perch", where: "Deeper water near the dam, small jigs with minnows near the bottom.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "yellow-perch", where: "Deeper water near the bottom.", when: "Midday", night: false },
      { id: "black-crappie", where: "Deep water by the felled trees in the lower lake, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Moving toward the standing timber in the upper lake. Minnows under bobbers.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Rock and gravel in the lower lake on sunny days. Jigs and slow crankbaits.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Standing timber and felled trees. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false },
      { id: "yellow-perch", where: "Moving shallow to spawn. Small minnows near the bottom.", when: "Morning", night: false },
      { id: "largemouth-bass", where: "Wood and rock. Jigs and creature baits. Keep only 18 inches and up.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "largemouth-bass", where: "Shallow wood in the upper lake and felled trees in the lower. Spinnerbaits and soft plastics.", when: "Morning and dusk", night: false },
      { id: "bluegill", where: "Spawning beds in 1 to 2 ft of water. Wax worms or crickets.", when: "Morning", night: false },
      { id: "black-crappie", where: "Spawned out, sliding back to timber edges.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "flathead-catfish", where: "Live fish on the bottom near timber and the deeper holes. Heavy line.", when: "After dark", night: true },
      { id: "channel-catfish", where: "Flats next to deeper water. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Timber edges and points. Topwater at first and last light.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "flathead-catfish", where: "Live fish near wood and holes.", when: "After dark", night: true },
      { id: "channel-catfish", where: "Flats next to deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "bluegill", where: "Shallow water in the evening, poppers or worms.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "flathead-catfish", where: "Live fish near wood and the deepest water by the dam.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shade and timber, plastic worms worked slow.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "largemouth-bass", where: "Following baitfish as the water cools. Crankbaits and spinnerbaits.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Moving back shallow to wood and baitfish.", when: "Afternoon", night: false },
      { id: "channel-catfish", where: "Flats near deeper water.", when: "After dark", night: true } ] },
    { picks: [
      { id: "largemouth-bass", where: "Secondary points and timber edges, following baitfish.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Timber and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false },
      { id: "yellow-perch", where: "Near the bottom with small minnows.", when: "Midday", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "black-crappie", where: "Deeper water by the felled trees.", when: "Afternoon", night: false },
      { id: "yellow-perch", where: "Near the bottom with small minnows.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "yellow-perch", where: "Deeper water near the dam, near the bottom.", when: "Midday", night: false },
      { id: "bluegill", where: "Near the bottom, small jigs and wax worms.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingClearfork = {
  species: {
    "muskellunge": "Muskellunge", "largemouth-bass": "Largemouth bass", "black-crappie": "Crappie",
    "channel-catfish": "Channel catfish"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "black-crappie", where: "Deep, open water in the lower lake. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "black-crappie", where: "Deep water near the lower lake drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Moving toward the stumps in the shallow upper end. Minnows under bobbers.", when: "Afternoon", night: false },
      { id: "muskellunge", where: "Warming shallows in the upper end. Slow jerkbaits and small swimbaits.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "black-crappie", where: "Stumps in the upper end. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false },
      { id: "largemouth-bass", where: "Stumps and island shorelines. Jigs and creature baits.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "largemouth-bass", where: "Stumps in the upper end and the islands mid-lake. Spinnerbaits and soft plastics.", when: "Morning and dusk", night: false },
      { id: "muskellunge", where: "Island points and stump edges. Bucktails and jerkbaits.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Spawned out, sliding back to stumps and points.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper water. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Island points and stumps. Topwater at first and last light.", when: "Dawn and dusk", night: false },
      { id: "muskellunge", where: "Island points and stump edges, big baits.", when: "Dawn and dusk", night: false } ] },
    { note: "Muskie in warm water: land them fast and keep them in the water.", picks: [
      { id: "channel-catfish", where: "Flats next to deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shade, deeper island edges, plastic worms worked slow.", when: "Dawn and dusk", night: false } ] },
    { note: "Muskie in warm water: land them fast and keep them in the water.", picks: [
      { id: "channel-catfish", where: "Flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Island edges and stumps at first and last light.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "muskellunge", where: "Island points and the edges of the deeper lower lake as the water cools. Big baits.", when: "Afternoon into dusk", night: false },
      { id: "black-crappie", where: "Moving back shallow to stumps and baitfish.", when: "Afternoon", night: false },
      { id: "channel-catfish", where: "Flats near deeper water.", when: "After dark", night: true } ] },
    { picks: [
      { id: "muskellunge", where: "Fall feed: island points and drop offs. Big swimbaits and jerkbaits.", when: "Afternoon into dusk", night: false },
      { id: "black-crappie", where: "Stumps and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Following baitfish to points and islands.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "muskellunge", where: "Deeper drop offs in the lower lake. Slow, big baits.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Deeper water in the lower lake.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "black-crappie", where: "Deep, open water in the lower lake, very slow.", when: "Midday", night: false } ] }
  ]
};

/*
 * Seneca Lake, Dillon Lake, Lake Logan, Salt Fork Lake, Burr Oak Lake and Dow Lake (added 2026-10-31). Official sources only:
 *  · ODNR Fishing Tips by Species (the month by month "Seasonal Fishing Approaches" tables), as above
 *  · ODNR Seneca Lake Fishing Area page and ODNR Fish Stocking (saugeye every year, blue catfish most years); MWCD Seneca Lake page
 *  · ODNR Dillon Lake Fishing Area and Dillon State Park pages (largemouth, bluegill, crappie, saugeye, hybrid striped bass,
 *    catfish) and ODNR Fish Stocking (saugeye and hybrids every year, blue catfish since 2022)
 *  · ODNR Lake Logan Fishing Area and Lake Logan State Park pages (bluegill, crappie, bass, muskie, catfish; shallow headwaters)
 *  · ODNR Salt Fork Lake Fishing Area and Salt Fork State Park pages (largemouth, crappie, bluegill, walleye, muskie; standing
 *    timber in the bays, boulder shorelines, an artificial reef on the north branch) and ODNR Fish Stocking (muskie, saugeye)
 *  · ODNR Burr Oak Lake Fishing Area page (its fishing forecast: largemouth, crappie, sunfish, channel and flathead catfish)
 *    and ODNR Fish Stocking (channel and blue catfish)
 *  · ODNR Dow Lake Fishing Area and Strouds Run State Park pages (largemouth and crappie) and ODNR Fish Stocking (saugeye)
 *  · ODNR fish surveys (the Waterbody Report) for which species are recorded at each lake
 * Species with no monthly picks (smallmouth at Seneca, for one) show on the Species page without picks.
 */
window.NightBiteBitingSeneca = {
  species: {
    "saugeye": "Saugeye", "black-crappie": "Crappie", "largemouth-bass": "Largemouth bass", "blue-catfish": "Blue catfish", "white-bass": "White bass", "bluegill": "Bluegill", "yellow-perch": "Yellow perch"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows, fished slow.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deep water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "Riprap at the dam and rocky points as the water starts to warm. Jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving toward spawning areas. Minnows under bobbers around woody cover.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "Riprap at the dam and rocky points. Jigs with minnows or small crankbaits.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Woody cover near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false },
      { id: "largemouth-bass", where: "Warming shallows on the north facing banks. Slow crankbaits and jigs.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "black-crappie", where: "Shallow woody cover on the spawn. Minnows under a float.", when: "Morning and dusk", night: false },
      { id: "largemouth-bass", where: "Shallow cover and points. Spinnerbaits and medium crankbaits.", when: "Morning and dusk", night: false },
      { id: "white-bass", where: "Spawning run up the feeder streams. Jigs, spoons and spinners.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and flats. Crawler harnesses or shad cranks.", when: "Dusk and after dark", night: true },
      { id: "blue-catfish", where: "Channel edges and flats near deeper water. Cut shad.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Woody cover and weed edges. Topwater early, plastics later.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "blue-catfish", where: "Channel edges near deeper water. Cut shad or skipjack.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Points and woody cover. Crankbaits and spinnerbaits.", when: "Dawn and dusk", night: false },
      { id: "white-bass", where: "Schools chasing shad at the surface on calm days.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and Riprap at the dam and rocky points, crawler harnesses.", when: "Dusk and after dark", night: true },
      { id: "largemouth-bass", where: "Shade and deeper edges. Plastic worms and jigs.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Riprap at the dam and rocky points and large points as the water cools. Diving crankbaits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "blue-catfish", where: "Deeper flats as the water cools. Cut bait.", when: "After dark", night: true },
      { id: "black-crappie", where: "Moving back shallow to woody cover and baitfish.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Very shallow at sunset on Riprap at the dam and rocky points and points. Rattle baits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Woody cover and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false },
      { id: "largemouth-bass", where: "Following baitfish into coves and secondary points.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan. Check the USGS level before you launch.", picks: [
      { id: "saugeye", where: "Riprap at the dam and rocky points and points at sunset. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "blue-catfish", where: "Deep channel edges. Fresh cut shad, fished slow.", when: "After dark", night: true },
      { id: "black-crappie", where: "Woody cover in deeper water.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingDillon = {
  species: {
    "saugeye": "Saugeye", "hybrid-striped-bass": "Hybrid striped bass", "black-crappie": "Crappie", "largemouth-bass": "Largemouth bass", "channel-catfish": "Channel catfish", "blue-catfish": "Blue catfish", "bluegill": "Bluegill"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows, fished slow.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deep water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip. The level can change fast after rain.", picks: [
      { id: "saugeye", where: "Riprap and rocky banks as the water starts to warm. Jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving toward spawning areas. Minnows under bobbers around woody cover in the coves.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip. The level can change fast after rain.", picks: [
      { id: "saugeye", where: "Riprap and rocky banks. Jigs with minnows or small crankbaits.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Woody cover in the coves near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false },
      { id: "largemouth-bass", where: "Warming shallows on the north facing banks. Slow crankbaits and jigs.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats as the water warms. Crawlers or cut bait.", when: "After dark", night: true },
      { id: "hybrid-striped-bass", where: "Points and open water chasing shad. Swimbaits and spoons.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Shallow woody cover in the coves on the spawn. Minnows under a float.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and flats. Crawler harnesses or shad cranks.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats next to deeper holes. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "blue-catfish", where: "Channel edges and flats near deeper water. Cut shad.", when: "After dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper water.", when: "After dark", night: true },
      { id: "blue-catfish", where: "Channel edges near deeper water. Cut shad or skipjack.", when: "After dark", night: true },
      { id: "hybrid-striped-bass", where: "Schools busting shad at the surface; watch for gulls.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and Riprap and rocky banks, crawler harnesses.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shade and deeper edges. Plastic worms and jigs.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Riprap and rocky banks and large points as the water cools. Diving crankbaits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats near deeper water and feeder streams.", when: "After dark", night: true },
      { id: "blue-catfish", where: "Deeper flats as the water cools. Cut bait.", when: "After dark", night: true } ] },
    { picks: [
      { id: "saugeye", where: "Very shallow at sunset on Riprap and rocky banks and points. Rattle baits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "hybrid-striped-bass", where: "Points and flats chasing shad as the water cools.", when: "Afternoon into dusk", night: false },
      { id: "black-crappie", where: "Woody cover in the coves and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan. Check the Corps level before you launch.", picks: [
      { id: "saugeye", where: "Riprap and rocky banks and points at sunset. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "blue-catfish", where: "Deep channel edges. Fresh cut shad, fished slow.", when: "After dark", night: true },
      { id: "black-crappie", where: "Woody cover in the coves in deeper water.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingLogan = {
  species: {
    "saugeye": "Saugeye", "largemouth-bass": "Largemouth bass", "black-crappie": "Crappie", "channel-catfish": "Channel catfish", "bluegill": "Bluegill", "muskellunge": "Muskie"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows, fished slow.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deep water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "The dam face and points as the water starts to warm. Jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving toward spawning areas. Minnows under bobbers around woody cover.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "The dam face and points. Jigs with minnows or small crankbaits.", when: "Dusk and after dark", night: true },
      { id: "largemouth-bass", where: "Warming shallows on the north facing banks. Slow crankbaits and jigs.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Woody cover near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Shallow flats as the water warms. Crawlers or cut bait.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shallow cover and points. Spinnerbaits and medium crankbaits.", when: "Morning and dusk", night: false },
      { id: "black-crappie", where: "Shallow woody cover on the spawn. Minnows under a float.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and flats. Crawler harnesses or shad cranks.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Shallow flats next to deeper holes. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Woody cover and weed edges. Topwater early, plastics later.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Shallow flats next to deeper water.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Points and woody cover. Crankbaits and spinnerbaits.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and The dam face and points, crawler harnesses.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Shallow flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shade and deeper edges. Plastic worms and jigs.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "The dam face and points and large points as the water cools. Diving crankbaits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Shallow flats near deeper water and feeder streams.", when: "After dark", night: true },
      { id: "black-crappie", where: "Moving back shallow to woody cover and baitfish.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Very shallow at sunset on The dam face and points and points. Rattle baits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "largemouth-bass", where: "Following baitfish into coves and secondary points.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Woody cover and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "saugeye", where: "The dam face and points and points at sunset. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Woody cover in deeper water.", when: "Afternoon", night: false },
      { id: "muskellunge", where: "Points and cove mouths. Big baits, fished slow.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingSaltfork = {
  species: {
    "saugeye": "Saugeye", "muskellunge": "Muskie", "largemouth-bass": "Largemouth bass", "black-crappie": "Crappie", "walleye": "Walleye", "bluegill": "Bluegill", "white-bass": "White bass", "yellow-perch": "Yellow perch"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows, fished slow.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deep water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "Boulder banks and the north branch reef as the water starts to warm. Jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "walleye", where: "Boulder banks and the north branch reef as the water warms. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "black-crappie", where: "Moving toward spawning areas. Minnows under bobbers around standing timber in the bays.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "Boulder banks and the north branch reef. Jigs with minnows or small crankbaits.", when: "Dusk and after dark", night: true },
      { id: "largemouth-bass", where: "Warming shallows on the north facing banks. Slow crankbaits and jigs.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Standing timber in the bays near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false } ] },
    { picks: [
      { id: "largemouth-bass", where: "Shallow cover and points. Spinnerbaits and medium crankbaits.", when: "Morning and dusk", night: false },
      { id: "black-crappie", where: "Shallow standing timber in the bays on the spawn. Minnows under a float.", when: "Morning and dusk", night: false },
      { id: "bluegill", where: "Spawning beds in 1 to 2 ft of water. Wax worms or crickets.", when: "Morning", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and flats. Crawler harnesses or shad cranks.", when: "Dusk and after dark", night: true },
      { id: "muskellunge", where: "Weed edges and points. Big bucktails and topwater.", when: "Dawn and dusk", night: false },
      { id: "largemouth-bass", where: "Standing timber in the bays and weed edges. Topwater early, plastics later.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "largemouth-bass", where: "Points and standing timber in the bays. Crankbaits and spinnerbaits.", when: "Dawn and dusk", night: false },
      { id: "white-bass", where: "Schools chasing shad at the surface on calm days.", when: "Dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and Boulder banks and the north branch reef, crawler harnesses.", when: "Dusk and after dark", night: true },
      { id: "largemouth-bass", where: "Shade and deeper edges. Plastic worms and jigs.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Boulder banks and the north branch reef and large points as the water cools. Diving crankbaits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "muskellunge", where: "Weed edges and points as the water cools. Big baits.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Moving back shallow to standing timber in the bays and baitfish.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Very shallow at sunset on Boulder banks and the north branch reef and points. Rattle baits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "walleye", where: "Points and Boulder banks and the north branch reef at sunset. Jigs or crankbaits.", when: "Dusk and after dark", night: true },
      { id: "muskellunge", where: "Weed edges, points and cove mouths. Big baits, fished slow as the water cools.", when: "Afternoon into dusk", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "saugeye", where: "Boulder banks and the north branch reef and points at sunset. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "muskellunge", where: "Points and cove mouths. Big baits, fished slow.", when: "Afternoon", night: false },
      { id: "black-crappie", where: "Standing timber in the bays in deeper water.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "black-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingBurroak = {
  species: {
    "largemouth-bass": "Largemouth bass", "white-crappie": "Crappie", "channel-catfish": "Channel catfish", "blue-catfish": "Blue catfish", "flathead-catfish": "Flathead catfish", "bluegill": "Bluegill"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "white-crappie", where: "Deep cover near drop offs. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "white-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip. The level can change fast after rain.", picks: [
      { id: "white-crappie", where: "Moving toward spawning areas. Minnows under bobbers around woody cover.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip. The level can change fast after rain.", picks: [
      { id: "largemouth-bass", where: "Warming shallows on the north facing banks. Slow crankbaits and jigs.", when: "Afternoon", night: false },
      { id: "white-crappie", where: "Woody cover near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats as the water warms. Crawlers or cut bait.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shallow cover and points. Spinnerbaits and medium crankbaits.", when: "Morning and dusk", night: false },
      { id: "white-crappie", where: "Shallow woody cover on the spawn. Minnows under a float.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper holes. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "blue-catfish", where: "Channel edges and flats near deeper water. Cut shad.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Woody cover and weed edges. Topwater early, plastics later.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper water.", when: "After dark", night: true },
      { id: "blue-catfish", where: "Channel edges near deeper water. Cut shad or skipjack.", when: "After dark", night: true },
      { id: "flathead-catfish", where: "Deep wood and holes. Live bait only.", when: "After dark", night: true } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shade and deeper edges. Plastic worms and jigs.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats near deeper water and feeder streams.", when: "After dark", night: true },
      { id: "blue-catfish", where: "Deeper flats as the water cools. Cut bait.", when: "After dark", night: true },
      { id: "white-crappie", where: "Moving back shallow to woody cover and baitfish.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "largemouth-bass", where: "Following baitfish into coves and secondary points.", when: "Afternoon", night: false },
      { id: "white-crappie", where: "Woody cover and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan. Check the Corps level before you launch.", picks: [
      { id: "blue-catfish", where: "Deep channel edges. Fresh cut shad, fished slow.", when: "After dark", night: true },
      { id: "white-crappie", where: "Woody cover in deeper water.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "white-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] }
  ]
};

window.NightBiteBitingDow = {
  species: {
    "saugeye": "Saugeye", "largemouth-bass": "Largemouth bass", "white-crappie": "Crappie", "channel-catfish": "Channel catfish"
  },
  months: [
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows, fished slow.", when: "Dusk", night: false },
      { id: "white-crappie", where: "Deep cover near drop offs. Minnows or light jigs, very slow.", when: "Midday", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deep water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "white-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "The dam face and points as the water starts to warm. Jigs tipped with minnows.", when: "Dusk and after dark", night: true },
      { id: "white-crappie", where: "Moving toward spawning areas. Minnows under bobbers around woody cover.", when: "Afternoon", night: false } ] },
    { note: "Cold water. Wear a life jacket on every early season boat trip.", picks: [
      { id: "saugeye", where: "The dam face and points. Jigs with minnows or small crankbaits.", when: "Dusk and after dark", night: true },
      { id: "largemouth-bass", where: "Warming shallows on the north facing banks. Slow crankbaits and jigs.", when: "Afternoon", night: false },
      { id: "white-crappie", where: "Woody cover near spawning areas. Small jigs and minnows under a float.", when: "Afternoon into dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats as the water warms. Crawlers or cut bait.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shallow cover and points. Spinnerbaits and medium crankbaits.", when: "Morning and dusk", night: false },
      { id: "white-crappie", where: "Shallow woody cover on the spawn. Minnows under a float.", when: "Morning and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and flats. Crawler harnesses or shad cranks.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats next to deeper holes. Chicken liver, shrimp or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Woody cover and weed edges. Topwater early, plastics later.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "channel-catfish", where: "Flats next to deeper water.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Points and woody cover. Crankbaits and spinnerbaits.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Points and The dam face and points, crawler harnesses.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats near deeper water, cut bait or crawlers.", when: "After dark", night: true },
      { id: "largemouth-bass", where: "Shade and deeper edges. Plastic worms and jigs.", when: "Dawn and dusk", night: false } ] },
    { picks: [
      { id: "saugeye", where: "The dam face and points and large points as the water cools. Diving crankbaits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "channel-catfish", where: "Flats near deeper water and feeder streams.", when: "After dark", night: true },
      { id: "white-crappie", where: "Moving back shallow to woody cover and baitfish.", when: "Afternoon", night: false } ] },
    { picks: [
      { id: "saugeye", where: "Very shallow at sunset on The dam face and points and points. Rattle baits and jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "largemouth-bass", where: "Following baitfish into coves and secondary points.", when: "Afternoon", night: false },
      { id: "white-crappie", where: "Woody cover and baitfish schools. Jigs and minnows under a bobber.", when: "Afternoon", night: false } ] },
    { note: "Cold water and long nights. Wear a life jacket and tell someone your plan.", picks: [
      { id: "saugeye", where: "The dam face and points and points at sunset. Jigs with minnows.", when: "Dusk and after dark", night: true },
      { id: "white-crappie", where: "Woody cover in deeper water.", when: "Afternoon", night: false } ] },
    { note: "Check ice and cold water safety before any winter trip.", picks: [
      { id: "saugeye", where: "Deeper water near the dam. Jigs with minnows.", when: "Dusk", night: false },
      { id: "white-crappie", where: "Deep cover near drop offs, very slow.", when: "Midday", night: false } ] }
  ]
};
