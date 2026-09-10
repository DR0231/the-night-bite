/* Whisperwood Vale — shared constants, palette, and fish data */

const TILE_SIZE = 16;

const TILE = {
  GRASS: 0,
  DIRT: 1,
  SHORE: 2,
  POND: 3,
  RIVER: 4,
  LAKE: 5,
  CAVE_WATER: 6,
  DOCK: 7,
  BRIDGE: 8,
  STONE: 9,
  CAVE_WALL: 10,
  CAVE_FLOOR: 11,
  WOOD: 12,
  MARSH: 13,
};

const CONFIG = {
  TILE: TILE_SIZE,
  VIEW_W: 640,
  VIEW_H: 360,
  MAP_W: 64,
  MAP_H: 50,
  /** World pixels per second — planted start/stop, no ice-skate. */
  PLAYER_SPEED: 76,
  PLAYER_ACCEL: 980,
  PLAYER_FRICTION: 1600,
  PLAYER_STOP_SPEED: 8,
  FACE_BIAS: 1.2,
  /** Collision sits at the feet so the sprite can overlap trees/canopy. */
  PLAYER_COL_W: 8,
  PLAYER_COL_H: 4,
  PLAYER_SPRITE_W: 48,
  PLAYER_SPRITE_H: 64,
  DAY_LENGTH: 330,
  START_HOUR: 6,
  FISH_RANGE: 28,
  CAST_DIST: 34,
  AQUARIUM_N: 4,
  AQUARIUM_N_UP: 8,
  COOLER_N: 6,
  PICK_RANGE: 18,
  NPC_RANGE: 30,
};

/* Single source of numbers for gameplay AND the F8 admin guide.
   Cursor: change values here (or on FISH/BAIT/RODS/MEALS/PERKS/SHOP_CATALOG/SPOTS).
   Do not copy these figures into admin-guide.js — it reads this object at runtime. */
const DESIGN = {
  millpondUnique: 10,
  millpondHearts: 2,
  npcHeartCap: 3,
  giftMinCaught: 2,
  xpFirstLand: 40,
  xpRecord: 18,
  xpQuest: 15,
  xpSpeciesToday: 10,
  xpRepeat: 2,
  xpRepeatCap: 8,
  xpSight: 4,
  dailyCoins: 18,
  dailyWorms: 3,
  needWarn: 25,
  hungerBarShrink: 20,
  passOutHunger: 15,
  emptyHookBite: 0.45,
  caveWrongBait: 0.42,
  preferBait: 1.25,
  wrongPreferBait: 0.72,
  hotspotBite: 1.35,
  hotspotWait: 0.78,
  homeShoreBite: 1.18,
  nightOwlBite: 1.15,
  nightOwlRest: 0.65,
  berryHunger: 12,
  lanternFuel: 6,
  lanternBurn: 0.12,
  lanternWarmth: 0.55,
  cloakWarmth: 0.7,
  weatheredWarmth: 0.65,
  foragerChance: 0.4,
  campfireRange: 28,
  campcookRestore: 1.2,
  seasonDays: 3,
  startCoins: 12,
  startBait: { worms: 8, crickets: 2, glow: 1 },
  perkOffer: 2,
  warps: [
    { id: "vale", label: "Vale spawn", map: "vale", x: 32.5, y: 26.2, dir: 0 },
    { id: "cottage", label: "Cottage", map: "cottage", x: 11, y: 12.2, dir: 3 },
    { id: "cave", label: "Crystal Cave", map: "cave", x: 18, y: 6.4, dir: 0 },
    { id: "marsh", label: "Millpond", map: "marsh", x: 8, y: 12, dir: 0, fifthWater: true },
    { id: "pond", label: "Pond dock", map: "vale", x: 19.4, y: 24.6, dir: 1 },
    { id: "lake", label: "Lake dock", map: "vale", x: 42.5, y: 24.4, dir: 2 },
    { id: "wren", label: "Wren’s stall", map: "vale", x: 35.8, y: 26.8, dir: 0 },
    { id: "bramble", label: "Bramble", map: "vale", x: 19.4, y: 24.6, dir: 1 },
    { id: "lark", label: "Lark", map: "vale", x: 42.5, y: 24.4, dir: 2 },
  ],
  phases: [
    { id: "dawn", label: "Dawn", hour: 6.2, range: [5, 8] },
    { id: "day", label: "Midday", hour: 11, range: [8, 16.5] },
    { id: "golden", label: "Dusk", hour: 17.6, range: [16.5, 19.5] },
    { id: "night", label: "Night", hour: 21.5, range: [19.5, 5] },
  ],
};

const PALETTE = {
  grassHi: "#6aab4e",
  grass: "#478a3a",
  grassMid: "#357232",
  grassLo: "#245428",
  grassShadow: "#1a3c1e",
  dirtHi: "#c49a5a",
  dirt: "#a07840",
  dirtLo: "#7a5830",
  dirtPebble: "#b8a078",
  shore: "#8a7a48",
  pond: "#1a5c62",
  pondDeep: "#0d3a42",
  pondHi: "#3a9aa0",
  river: "#2a8ec8",
  riverDeep: "#176a9c",
  riverHi: "#7ad4ee",
  lake: "#1a3e7a",
  lakeDeep: "#0c2458",
  lakeHi: "#4a7ab0",
  caveWater: "#4ab8ff",
  caveDeep: "#1a68c8",
  caveHi: "#b8f4ff",
  stoneHi: "#8a9098",
  stone: "#6a7078",
  stoneLo: "#4a5058",
  caveWall: "#2a3038",
  woodHi: "#b07a48",
  wood: "#8a5a32",
  woodLo: "#5a381c",
  hairLo: "#3d2314",
  hair: "#6b3e22",
  hairHi: "#a56b3c",
  skinHi: "#f0c4a0",
  skin: "#d4a07c",
  skinLo: "#b07858",
  shirtHi: "#7ee0d2",
  shirt: "#3aa89c",
  shirtLo: "#247a72",
  pants: "#7a5340",
  pantsLo: "#5c3c2e",
  boot: "#3a2418",
  bootLo: "#241610",
  packHi: "#8a8f5a",
  pack: "#6d7a3e",
  packLo: "#4a542c",
  belt: "#4a3020",
  buckle: "#c4a44a",
  bobberRed: "#e23a3a",
  bobberWhite: "#f4f0e8",
  line: "rgba(236, 232, 214, 0.92)",
};

const WATER_TILES = new Set([
  TILE.POND, TILE.RIVER, TILE.LAKE, TILE.CAVE_WATER, TILE.MARSH,
]);

const WALKABLE = new Set([
  TILE.GRASS, TILE.DIRT, TILE.SHORE, TILE.DOCK, TILE.BRIDGE,
  TILE.STONE, TILE.CAVE_FLOOR, TILE.WOOD,
]);

/** Two bite "feels": still water vs moving water. */
const FISHING_FEEL = {
  still: {
    waitMin: 1.8,
    waitMax: 4.2,
    nibbleCount: [2, 3],
    nibbleGap: 0.38,
    bobAmp: 0.7,
    bobSpeed: 1.85,
    drift: 0,
    hookWindow: 1.25,
    yank: 0.55,
  },
  moving: {
    waitMin: 1.1,
    waitMax: 2.8,
    nibbleCount: [1, 2],
    nibbleGap: 0.2,
    bobAmp: 1.05,
    bobSpeed: 2.8,
    drift: 7.5,
    hookWindow: 0.85,
    yank: 1.8,
  },
};

const SPOTS = {
  pond: {
    id: "pond",
    name: "Calm Pond",
    mood: "still",
    minigame: "timing",
    flavor: "Still water. Slow, patient bites.",
  },
  river: {
    id: "river",
    name: "Rocky River",
    mood: "moving",
    minigame: "timingFast",
    flavor: "The current tugs the line.",
  },
  lake: {
    id: "lake",
    name: "Deep Misty Lake",
    mood: "moving",
    minigame: "tension",
    flavor: "Deep water. Sudden, heavy takes.",
  },
  cave: {
    id: "cave",
    name: "Crystal Cave Pool",
    mood: "still",
    minigame: "tensionErratic",
    flavor: "A hidden cave lake. Glow-lit, gentle strikes.",
  },
  marsh: {
    id: "marsh",
    name: "Misty Millpond",
    mood: "still",
    minigame: "timing",
    flavor: "Quiet marsh water beyond the east raft.",
  },
};

const FISH = [
  { id: "sunperch", name: "Sunperch", spot: "pond", rarity: "Common",
    color: "#e0b44a", desc: "A bright little sun-lover of the lily shallows.",
    size: [4, 9], sell: 6, bite: { dawn: 1.1, day: 1.2, golden: 1, night: 0.4 },
    baitBias: { worms: 2.0, crickets: 0.45, glow: 0.25, berryblend: 2.2, glowplus: 0.2 } },
  { id: "lilykoi", name: "Lily Koi", spot: "pond", rarity: "Uncommon",
    color: "#e8786a", desc: "Painted flanks that mimic floating pads.",
    size: [6, 12], sell: 14, season: "spring", bite: { dawn: 1, day: 1, golden: 1.2, night: 0.5 },
    baitBias: { worms: 1.2, crickets: 0.5, glow: 0.3, berryblend: 1.8, glowplus: 0.25 } },
  { id: "padskipper", name: "Pad Skipper", spot: "pond", rarity: "Common",
    color: "#8cc85a", desc: "A jumpy greenling that skims the lily rims.",
    size: [3, 7], sell: 5, bite: { dawn: 1.2, day: 1, golden: 0.8, night: 0.3 },
    baitBias: { worms: 1.8, crickets: 0.6, glow: 0.25, berryblend: 1.5, glowplus: 0.2 } },
  { id: "rainpearl", name: "Rain Pearl", spot: "pond", rarity: "Uncommon",
    color: "#c8e8f0", desc: "A dewdrop of a fish that only stirs in rain.",
    size: [5, 10], sell: 16, rainOnly: true, bite: { dawn: 1, day: 1, golden: 1, night: 1 },
    baitBias: { worms: 1.0, crickets: 0.7, glow: 0.5, berryblend: 1.4, glowplus: 0.4 } },
  { id: "stonetrout", name: "Stone Trout", spot: "river", rarity: "Common",
    color: "#8aa0b4", desc: "Speckled like river granite, quick as the current.",
    size: [7, 14], sell: 8, bite: { dawn: 1.1, day: 1, golden: 1, night: 0.6 },
    baitBias: { worms: 1.3, crickets: 1.9, glow: 0.35, berryblend: 1.0, glowplus: 0.3 } },
  { id: "swiftdarter", name: "Swift Darter", spot: "river", rarity: "Uncommon",
    color: "#3cb4d4", desc: "A silver streak that hits the bobber hard.",
    size: [5, 11], sell: 15, bite: { dawn: 0.8, day: 1.2, golden: 1.1, night: 0.5 },
    baitBias: { worms: 0.7, crickets: 2.1, glow: 0.4, berryblend: 0.6, glowplus: 0.35 } },
  { id: "amberdace", name: "Amber Dace", spot: "river", rarity: "Uncommon",
    color: "#e0a048", desc: "Warm-sided and fond of crickets in the riffles.",
    size: [6, 12], sell: 13, bite: { dawn: 1, day: 1.1, golden: 1.2, night: 0.4 },
    baitBias: { worms: 0.8, crickets: 2.2, glow: 0.3, berryblend: 1.1, glowplus: 0.25 } },
  { id: "mistbass", name: "Mist Bass", spot: "lake", rarity: "Common",
    color: "#3a5a8a", desc: "Lurks under the lake fog until dusk.",
    size: [8, 16], sell: 10, bite: { dawn: 0.7, day: 0.9, golden: 1.3, night: 1.1 },
    baitBias: { worms: 1.7, crickets: 0.8, glow: 0.5, berryblend: 1.3, glowplus: 0.45 } },
  { id: "moonfin", name: "Moonfin", spot: "lake", rarity: "Rare",
    color: "#c8d8f0", desc: "Pale fins that catch starlight on open water.",
    size: [10, 18], sell: 28, season: "autumn", bite: { dawn: 0.4, day: 0.3, golden: 1.2, night: 1.6 },
    baitBias: { worms: 0.6, crickets: 0.4, glow: 1.6, berryblend: 0.7, glowplus: 1.9 } },
  { id: "nighteel", name: "Night Eel", spot: "lake", rarity: "Rare",
    color: "#2a3048", desc: "A ribbon of dark water. Only after the lamps go out.",
    size: [12, 22], sell: 32, nightOnly: true, bite: { dawn: 0, day: 0, golden: 0.4, night: 1.8 },
    baitBias: { worms: 0.5, crickets: 0.35, glow: 1.8, berryblend: 0.4, glowplus: 2.0 } },
  { id: "glowminnow", name: "Glow Minnow", spot: "cave", rarity: "Common",
    color: "#6ae0ff", desc: "A tiny lantern with fins, born in crystal water.",
    size: [3, 6], sell: 9, bite: { dawn: 1, day: 1, golden: 1, night: 1.1 },
    baitBias: { worms: 0.35, crickets: 0.3, glow: 2.0, berryblend: 0.35, glowplus: 2.2 } },
  { id: "crystalfin", name: "Crystalfin", spot: "cave", rarity: "Rare",
    color: "#a8f0ff", desc: "Translucent body, lit from within by cave-light.",
    size: [8, 15], sell: 30, season: "winter", bite: { dawn: 0.8, day: 0.8, golden: 1, night: 1.3 },
    baitBias: { worms: 0.25, crickets: 0.2, glow: 1.7, berryblend: 0.25, glowplus: 2.3 } },
  { id: "fogperch", name: "Fog Perch", spot: "marsh", rarity: "Common",
    color: "#6a8870", desc: "A quiet millpond regular, the color of wet reeds.",
    size: [5, 10], sell: 8, bite: { dawn: 1.2, day: 1, golden: 1, night: 0.7 },
    baitBias: { worms: 1.8, crickets: 0.7, glow: 0.4, berryblend: 1.6, glowplus: 0.35 } },
  { id: "bogwhisker", name: "Bog Whisker", spot: "marsh", rarity: "Uncommon",
    color: "#8a6a48", desc: "Catfish of the flooded mill race.",
    size: [9, 16], sell: 18, bite: { dawn: 0.8, day: 1, golden: 1.1, night: 1.2 },
    baitBias: { worms: 1.9, crickets: 0.9, glow: 0.5, berryblend: 1.2, glowplus: 0.4 } },
  { id: "millfin", name: "Millfin", spot: "marsh", rarity: "Uncommon",
    color: "#90b090", desc: "Said to remember the old wheel’s turning.",
    size: [7, 13], sell: 20, bite: { dawn: 1, day: 1.1, golden: 1.2, night: 0.6 },
    baitBias: { worms: 1.4, crickets: 0.8, glow: 0.45, berryblend: 1.5, glowplus: 0.4 } },
  { id: "pearlcarp", name: "Pearl Carp", spot: "marsh", rarity: "Rare",
    color: "#e8d8c8", desc: "A pale rumor of the east marsh.",
    size: [11, 20], sell: 36, bite: { dawn: 0.5, day: 0.6, golden: 1.1, night: 1.4 },
    baitBias: { worms: 0.7, crickets: 0.5, glow: 1.5, berryblend: 1.0, glowplus: 1.8 } },
];

const SEASONS = ["spring", "summer", "autumn", "winter"];

const WEATHERS = {
  clear: { id: "clear", name: "Clear", line: "The vale is bright and still.", bite: 1 },
  rain: { id: "rain", name: "Rain", line: "Rain dimples every pool.", bite: 1.28 },
  mist: { id: "mist", name: "Mist", line: "The mist is in tonight.", bite: 1.12 },
  heat: { id: "heat", name: "Heat", line: "The air shimmers over the water.", bite: 0.82 },
  frost: { id: "frost", name: "Frost", line: "A thin frost laces the reeds.", bite: 0.88 },
};

const RODS = {
  willow: { id: "willow", name: "Willow Rod", bar: 1, speed: 1, tension: 1, reach: 1, caveLuck: 1,
    desc: "A balanced starter rod." },
  finch: { id: "finch", name: "River Finch", bar: 0.82, speed: 1.28, tension: 0.92, reach: 0.84, caveLuck: 1,
    desc: "A quicker bar, shorter casts.", cost: 120, requireFish: "swiftdarter" },
  spine: { id: "spine", name: "Cave Spine", bar: 1.06, speed: 0.9, tension: 1.38, reach: 1, caveLuck: 1.35,
    desc: "Steady hands in the dark.", cost: 160, requireFish: "crystalfin" },
};

const BAIT = {
  worms: { id: "worms", name: "Worms", prefer: "pond", desc: "Everyday bait from the path edges." },
  crickets: { id: "crickets", name: "Crickets", prefer: "river", desc: "River hoppers love these." },
  glow: { id: "glow", name: "Glow bait", prefer: "cave", strong: true, desc: "A jar of cave-light paste." },
  berries: { id: "berries", name: "Vale berries", prefer: "", desc: "For the packing bench, not the hook." },
  crystal: { id: "crystal", name: "Crystal mote", prefer: "", desc: "A chip of cave-light." },
  berryblend: { id: "berryblend", name: "Berry blend", prefer: "pond", bonus: 1.22, desc: "Worms mashed with vale berries." },
  glowplus: { id: "glowplus", name: "Bright glow", prefer: "cave", strong: true, bonus: 1.28, desc: "Glow bait with a crystal mote." },
};

const HOOK_BAIT = ["worms", "crickets", "glow", "berryblend", "glowplus"];

const SHOP_CATALOG = [
  { kind: "bait", id: "worms", price: 4, stock: 12 },
  { kind: "bait", id: "crickets", price: 6, stock: 8 },
  { kind: "bait", id: "glow", price: 10, stock: 4 },
  { kind: "rod", id: "finch", price: 120, requireFish: "swiftdarter" },
  { kind: "rod", id: "spine", price: 160, requireFish: "crystalfin" },
  { kind: "upgrade", id: "tank", name: "Larger tank", requireFish: "moonfin",
    desc: "Donate a moonfin to widen the cottage aquarium." },
  { kind: "item", id: "campfireKit", name: "Campfire kit", price: 28, minRank: 3, stock: 1,
    desc: "One small fire on vale grass. Warmth until dawn." },
  { kind: "item", id: "cloak", name: "Wool cloak", price: 80, minRank: 4,
    desc: "A little warmth in rain and frost." },
  { kind: "item", id: "lantern", name: "Lantern", price: 55, minRank: 5, requireBait: "crystal",
    desc: "A crystal for the lamp. Night is kinder while it burns." },
];

const MEALS = {
  panperch:    { id: "panperch",    name: "Pan perch",     need: { anyCommonFish: 1 }, hunger: 45, warmth: 8,  rest: 0,  buff: null,   desc: "Any common fish in the pan." },
  dawntea:     { id: "dawntea",     name: "Dawn tea",      need: { berries: 1 }, hunger: 8, warmth: 22, rest: 28, buff: "tea",    desc: "Berries in the kettle." },
  riverstew:   { id: "riverstew",   name: "River stew",    need: { stonetrout: 1, berries: 1 }, hunger: 40, warmth: 12, rest: 8, buff: "steady", desc: "Wider timing until you sleep." },
  cavebroth:   { id: "cavebroth",   name: "Cave broth",    need: { glowminnow: 1, crystal: 1 }, hunger: 30, warmth: 40, rest: 6, buff: "warm",   desc: "Holds warmth in cave and frost." },
  mistskillet: { id: "mistskillet", name: "Mist skillet",  need: { mistbass: 1 }, hunger: 42, warmth: 10, rest: 4,  buff: null,   desc: "Lake everyday fill." },
  reedchowder: { id: "reedchowder", name: "Reed chowder",  need: { fogperch: 1, berries: 1 }, hunger: 38, warmth: 18, rest: 10, buff: "tea",    desc: "Marsh evening." },
  amberpot:    { id: "amberpot",    name: "Amber pot",     need: { amberdace: 1, berries: 1 }, hunger: 36, warmth: 14, rest: 12, buff: "steady", desc: "River uncommon." },
  moonkettle:  { id: "moonkettle",  name: "Moon kettle",   need: { moonfin: 1, crystal: 1 }, hunger: 28, warmth: 20, rest: 22, buff: "warm",   desc: "Rare frost treat." },
};

const RANK_NEED = [80, 140, 220, 320, 440, 580, 740];

const PERKS = {
  steadyhands: { id: "steadyhands", name: "Steady hands", desc: "A wider timing bar." },
  ironwrist:   { id: "ironwrist",   name: "Iron wrist", desc: "The tension band is more forgiving." },
  nightowl:    { id: "nightowl",    name: "Night owl", desc: "Night costs less rest, and night bites come easier." },
  weathered:   { id: "weathered",   name: "Weathered", desc: "Rain and frost take less warmth." },
  forager:     { id: "forager",     name: "Forager", desc: "Sometimes the path yields a little extra." },
  campcook:    { id: "campcook",    name: "Camp cook", desc: "Meals restore more and last an extra sleep." },
  homeshore:   { id: "homeshore",   name: "Home shore", desc: "Your favorite water bites like a mild hotspot." },
  softlanding: { id: "softlanding", name: "Soft landing", desc: "Waking in the reeds costs no bait." },
};

const NPC_DATA = [
  {
    id: "wren", name: "Wren", role: "shop",
    x: 35.8 * 16, y: 26.8 * 16,
    color: "#c45a5a",
    greet: "Need bait? The board by my stall has today’s ask.",
    hearts: [
      "Bring me something river-bright and I’ll remember you.",
      "Your casts have a nicer arc these days.",
      "The stall’s yours as much as mine. Don’t skip the board.",
    ],
  },
  {
    id: "bramble", name: "Bramble", role: "fisher",
    x: 19.4 * 16, y: 24.6 * 16,
    color: "#5a8a48",
    greet: "Pond’s kind if you wait. I like a patient neighbor.",
    hearts: [
      "A sunperch for the pan wouldn’t go amiss.",
      "You sit the way old fishers sit. I like that.",
      "If the millpond opens, take berries. The marsh is shy.",
    ],
  },
  {
    id: "lark", name: "Lark", role: "rumor",
    x: 42.5 * 16, y: 24.4 * 16,
    color: "#7a6ab0",
    greet: "I collect almosts. The ones that got away still count.",
    hearts: [
      "Tell me if the lake coughs up a rumor.",
      "You listen to water. That’s rarer than moonfin.",
      "Some nights the mist is a door. I wouldn’t miss it.",
    ],
  },
];

const DAILY_ASKS = [
  { spot: "pond", fish: "sunperch", text: "Bring a Sunperch before dusk." },
  { spot: "pond", fish: "padskipper", text: "A Pad Skipper for Bramble’s pan." },
  { spot: "river", fish: "stonetrout", text: "A Stone Trout from the north river." },
  { spot: "river", fish: "swiftdarter", text: "Land a Swift Darter before night." },
  { spot: "lake", fish: "mistbass", text: "A Mist Bass off the east dock." },
  { spot: "cave", fish: "glowminnow", text: "A Glow Minnow from the cave lake." },
];

const SAVE_KEY = "whisperwood-save-v1";
const OLD_JOURNAL_KEY = "whisperwood-journal";
