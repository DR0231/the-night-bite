/* One localStorage blob. Migrates whisperwood-journal on first load. */

const Save = {
  data: null,
  _timer: 0,

  blankJournalEntry() {
    return { caught: 0, biggest: 0, firstAt: 0, lastAt: 0, hooked: 0, landed: 0, gotAway: 0, shiny: 0, favorite: false };
  },

  fresh(seed) {
    const worldSeed = (seed == null ? (Math.random() * 0xffffffff) : seed) | 0;
    const journal = Object.create(null);
    for (const f of FISH) journal[f.id] = this.blankJournalEntry();
    const npcs = Object.create(null);
    for (const n of NPC_DATA) npcs[n.id] = { hearts: 0, lastCatchRemembered: "", giftedToday: 0 };
    return {
      version: 1,
      worldSeed,
      playTime: 0,
      clock: {
        seconds: CONFIG.START_HOUR / 24 * CONFIG.DAY_LENGTH,
        day: 1,
        season: "spring",
        weather: "clear",
        weatherUntil: 14,
        forecast: ["clear", "mist", "rain"],
        hotspot: "pond",
      },
      player: {
        map: "vale", x: 0, y: 0, dir: 0,
        coins: 12, favoriteSpot: "pond", lastLogoutAt: Date.now(),
        hunger: 100, warmth: 100, rest: 100,
      },
      inventory: {
        rodId: "willow", ownedRods: ["willow"],
        lineId: "gut", lureId: "",
        bait: { worms: 8, crickets: 2, glow: 1, berries: 0, crystal: 0, berryblend: 0, glowplus: 0 },
        equippedBait: "worms",
        items: { tank: 0, cloak: 0, lantern: 0, lanternFuel: 0, campfireKit: 0 },
        meals: { panperch: 0, dawntea: 0, riverstew: 0, cavebroth: 0 },
        mealId: "",
        mealUntilDay: 0,
        lanternOn: false,
      },
      skills: { rank: 1, xp: 0, perks: [], offered: [], repeatsToday: { total: 0 }, speciesToday: {}, sightXp: {} },
      journal,
      cottage: { aquarium: [], trophies: [], mail: [], weeds: 0, decor: {}, visited: false },
      npcs,
      quests: {
        active: [], done: [],
        daily: { day: 0, fish: "", done: false, text: "" },
        rumor: { day: 0, fish: "", spot: "", text: "" },
        derby: { key: "", mood: "still", landed: 0, goal: 8 },
      },
      flags: { fifthWater: false, spotMastery: {}, introComplete: false, mute: false, campfire: false, passedOutDay: 0, cooked: {}, gotCampKit: false },
      recap: [],
    };
  },

  load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        this.data = this._migrate(JSON.parse(raw));
      } catch (e) {
        this.data = this.fresh();
      }
    } else {
      this.data = this.fresh();
      this._ingestOldJournal();
    }
    this._ensureFish();
    return this.data;
  },

  _ingestOldJournal() {
    try {
      const raw = localStorage.getItem(OLD_JOURNAL_KEY);
      if (!raw) return;
      const old = JSON.parse(raw) || {};
      for (const id of Object.keys(old)) {
        const n = old[id] | 0;
        if (!n) continue;
        const e = this.ensureFish(id);
        e.caught = n;
        e.landed = n;
        e.hooked = Math.max(e.hooked, n);
        e.biggest = e.biggest || 6;
      }
    } catch (e) { /* ignore */ }
  },

  _migrate(d) {
    const base = this.fresh(d.worldSeed);
    const out = Object.assign({}, base, d);
    out.clock = Object.assign({}, base.clock, d.clock || {});
    out.player = Object.assign({}, base.player, d.player || {});
    if (out.player.hunger == null) out.player.hunger = 100;
    if (out.player.warmth == null) out.player.warmth = 100;
    if (out.player.rest == null) out.player.rest = 100;
    out.inventory = Object.assign({}, base.inventory, d.inventory || {});
    out.inventory.bait = Object.assign({}, base.inventory.bait, (d.inventory && d.inventory.bait) || {});
    out.inventory.items = Object.assign({}, base.inventory.items, (d.inventory && d.inventory.items) || {});
    out.inventory.meals = Object.assign({}, base.inventory.meals, (d.inventory && d.inventory.meals) || {});
    out.skills = Object.assign({}, base.skills, d.skills || {});
    out.skills.repeatsToday = Object.assign({ total: 0 }, (d.skills && d.skills.repeatsToday) || {});
    out.skills.speciesToday = Object.assign({}, (d.skills && d.skills.speciesToday) || {});
    out.skills.sightXp = Object.assign({}, (d.skills && d.skills.sightXp) || {});
    if (!Array.isArray(out.skills.perks)) out.skills.perks = [];
    if (!Array.isArray(out.skills.offered)) out.skills.offered = [];
    if (!out.skills.rank) out.skills.rank = 1;
    out.cottage = Object.assign({}, base.cottage, d.cottage || {});
    out.npcs = Object.assign({}, base.npcs, d.npcs || {});
    out.quests = Object.assign({}, base.quests, d.quests || {});
    out.flags = Object.assign({}, base.flags, d.flags || {});
    out.flags.cooked = Object.assign({}, base.flags.cooked, (d.flags && d.flags.cooked) || {});
    out.journal = Object.assign(Object.create(null), base.journal, d.journal || {});
    if (!Array.isArray(out.inventory.ownedRods)) out.inventory.ownedRods = ["willow"];
    return out;
  },

  _ensureFish() {
    for (const f of FISH) {
      if (!this.data.journal[f.id]) this.data.journal[f.id] = this.blankJournalEntry();
    }
  },

  ensureFish(id) {
    if (!this.data.journal[id]) this.data.journal[id] = this.blankJournalEntry();
    return this.data.journal[id];
  },

  applyToWorld() {
    const d = this.data;
    TimeCycle.seconds = d.clock.seconds;
    TimeCycle.day = d.clock.day;
    if (d.player.map && World.maps[d.player.map]) World.use(d.player.map);
    if (d.player.x || d.player.y) {
      Player.x = d.player.x;
      Player.y = d.player.y;
      Player.dir = d.player.dir || 0;
    }
    AudioFX.muted = !!d.flags.mute;
  },

  pullFromWorld() {
    const d = this.data;
    d.clock.seconds = TimeCycle.seconds;
    d.clock.day = TimeCycle.day || d.clock.day;
    d.player.map = World.id;
    d.player.x = Player.x;
    d.player.y = Player.y;
    d.player.dir = Player.dir;
    d.player.lastLogoutAt = Date.now();
  },

  write() {
    try {
      this.pullFromWorld();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) { /* quota */ }
  },

  mark(reason) {
    this.write();
    this._pushRecap(reason);
  },

  _pushRecap(reason) {
    if (!reason) return;
    const rec = this.data.recap || [];
    rec.unshift({ t: Date.now(), reason });
    this.data.recap = rec.slice(0, 8);
  },

  returning() {
    const last = this.data.player.lastLogoutAt || 0;
    if (!last) return false;
    const hours = (Date.now() - last) / 3600000;
    return hours > 3 || (TimeCycle.day || 1) > 1;
  },

  exportJson() {
    this.pullFromWorld();
    return JSON.stringify(this.data, null, 2);
  },

  importJson(text) {
    const parsed = JSON.parse(text);
    this.data = this._migrate(parsed);
    this._ensureFish();
    this.write();
  },

  resetFreshKeepingMute() {
    const mute = !!(this.data && this.data.flags && this.data.flags.mute);
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    this.data = this.fresh();
    this.data.flags.mute = mute;
    AudioFX.muted = mute;
    this.write();
  },

  dayRng(salt) {
    const d = this.data;
    const hour = (TimeCycle.hour | 0);
    const w = Utils.hash(d.clock.weather.length, hour);
    const n = (d.worldSeed ^ (d.clock.day * 2654435761) ^ Utils.hash(salt, hour) ^ w) >>> 0;
    return mulberry32(n);
  },
};
