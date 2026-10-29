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
