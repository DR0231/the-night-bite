/* One localStorage blob. Migrates whisperwood-journal on first load. */

const Save = {
  data: null,
  _timer: 0,
  _keepData: false,

  blankJournalEntry() {
    return { caught: 0, biggest: 0, firstAt: 0, lastAt: 0, hooked: 0, landed: 0, gotAway: 0, shiny: 0, favorite: false, firstDay: 0 };
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
        coins: DESIGN.startCoins, favoriteSpot: "pond", lastLogoutAt: Date.now(),
        hunger: 100, warmth: 100, rest: 100,
      },
      inventory: {
        rodId: "willow", ownedRods: ["willow"],
        lineId: "gut", lureId: "",
        bait: Object.assign({ worms: 0, crickets: 0, glow: 0, berries: 0, millreed: 0, saltberries: 0, crystal: 0, berryblend: 0, glowplus: 0, rainworms: 0 }, DESIGN.startBait),
        equippedBait: "worms",
        items: { tank: 0, cloak: 0, lantern: 0, lanternFuel: 0, campfireKit: 0 },
        meals: { panperch: 0, dawntea: 0, riverstew: 0, cavebroth: 0, mistskillet: 0, reedchowder: 0, amberpot: 0, moonkettle: 0, saltskillet: 0, galechowder: 0 },
        mealId: "",
        mealUntilDay: 0,
        lanternOn: false,
        loose: [],
        stew: 0,
        stewFrom: { plain: 0 },
      },
      skills: { rank: 1, xp: 0, perks: [], offered: [], repeatsToday: { total: 0 }, speciesToday: {}, sightXp: {} },
      journal,
      cottage: { aquarium: [], trophies: [], mail: [], weeds: 0, decor: {}, visited: false, cooler: [] },
      npcs,
      quests: {
        active: [], done: [],
        daily: { day: 0, fish: "", done: false, text: "" },
        rumor: { day: 0, fish: "", spot: "", text: "" },
        derby: { key: "", mood: "still", landed: 0, goal: 8 },
      },
      flags: { fifthWater: false, spotMastery: {}, introComplete: false, mute: false, campfire: false, passedOutDay: 0, cooked: {}, gotCampKit: false, millSpine: "none", stamps: {}, islandOpen: false, onboard: {}, stewLetter: false },
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
    /* Legacy journal import lands fish after migrate. A save that already fished does not get the first-evening nudges. */
    if (this.data.cottage && this.data.cottage.visited) this.data.flags.onboard.done = true;
    for (const id of Object.keys(this.data.journal)) {
      const row = this.data.journal[id];
      if (row && (row.landed | 0) > 0) { this.data.flags.onboard.done = true; break; }
    }
    try { this.syncCaught(); } catch (e) { /* pack counts optional at boot */ }
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
        const day = (this.data.clock.day | 0) || 1;
        const loose = this.loose();
        for (let i = 0; i < n; i++) loose.push({ id, day });
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
    for (const k of ["aquarium", "trophies", "mail"]) {
      if (!Array.isArray(out.cottage[k])) out.cottage[k] = [];
    }
    const srcDecor = (d.cottage && d.cottage.decor) || out.cottage.decor;
    out.cottage.decor = (srcDecor && typeof srcDecor === "object" && !Array.isArray(srcDecor))
      ? Object.assign({}, srcDecor)
      : {};
    if (typeof COTTAGE_DECOR !== "undefined") {
      for (const id of Object.keys(out.cottage.decor)) {
        const v = out.cottage.decor[id];
        const def = COTTAGE_DECOR[id];
        if (v === true && def) out.cottage.decor[id] = { x: def.x, y: def.y, facing: def.facing || 0 };
        else if (v && typeof v === "object" && v.facing == null && def) v.facing = def.facing || 0;
      }
    }
    out.npcs = Object.assign({}, base.npcs, d.npcs || {});
    for (const id of Object.keys(base.npcs)) {
      out.npcs[id] = Object.assign({}, base.npcs[id], (d.npcs && d.npcs[id]) || {});
    }
    out.quests = Object.assign({}, base.quests, d.quests || {});
    for (const k of ["daily", "rumor", "derby"]) {
      out.quests[k] = Object.assign({}, base.quests[k], (d.quests && d.quests[k]) || {});
    }
    if (!Array.isArray(out.quests.active)) out.quests.active = [];
    if (!Array.isArray(out.quests.done)) out.quests.done = [];
    out.flags = Object.assign({}, base.flags, d.flags || {});
    out.flags.cooked = Object.assign({}, base.flags.cooked, (d.flags && d.flags.cooked) || {});
    const spineOk = { none: 1, heard: 1, opened: 1, visited: 1, done: 1 };
    if (!spineOk[out.flags.millSpine]) out.flags.millSpine = "none";
    if (out.flags.islandOpen !== true) out.flags.islandOpen = false;
    if (!out.flags.onboard || typeof out.flags.onboard !== "object") out.flags.onboard = {};
    /* Older saves never saw the nudges; anyone who has played a while does not need them. */
    if ((out.playTime || 0) > (DESIGN.onboardWindow || 600)) out.flags.onboard.done = true;
    const cookedAny = out.flags.cooked && Object.keys(out.flags.cooked).some((k) => out.flags.cooked[k]);
    if (cookedAny) out.flags.stewLetter = true;
    else if (out.flags.stewLetter !== true) out.flags.stewLetter = false;
    const srcStamps = (d.flags && d.flags.stamps) || out.flags.stamps;
    out.flags.stamps = (srcStamps && typeof srcStamps === "object" && !Array.isArray(srcStamps))
      ? Object.assign({}, srcStamps)
      : {};
    out.journal = Object.assign(Object.create(null), base.journal, d.journal || {});
    /* A cottage visit or any landed fish means the nudges would be late. Do not invent a first-land day for rows that never stored one. */
    if (out.cottage && out.cottage.visited) out.flags.onboard.done = true;
    for (const id of Object.keys(out.journal)) {
      const row = out.journal[id];
      if (row && (row.landed | 0) > 0) { out.flags.onboard.done = true; break; }
    }
    if (!Array.isArray(out.inventory.ownedRods)) out.inventory.ownedRods = ["willow"];
    const srcInv = d.inventory || {};
    if (!Array.isArray(srcInv.loose)) {
      out.inventory.loose = [];
      const day = (out.clock.day | 0) || 1;
      for (const f of FISH) {
        const n = (out.journal[f.id] && out.journal[f.id].caught) | 0;
        for (let i = 0; i < n; i++) out.inventory.loose.push({ id: f.id, day });
      }
      out.cottage.cooler = [];
      out.inventory.stew = srcInv.stew | 0;
    } else {
      if (!Array.isArray(out.cottage.cooler)) out.cottage.cooler = [];
      if (out.inventory.stew == null) out.inventory.stew = 0;
      out.inventory.stew = out.inventory.stew | 0;
    }
    /* Fresh data always has an empty stewFrom. Only a stewFrom that arrived on the save is real. */
    const srcFrom = srcInv.stewFrom;
    if (!srcFrom || typeof srcFrom !== "object" || Array.isArray(srcFrom)) {
      out.inventory.stewFrom = { plain: out.inventory.stew | 0 };
    } else {
      const bag = {};
      let sum = 0;
      for (const k of Object.keys(srcFrom)) {
        const n = srcFrom[k] | 0;
        if (n > 0) bag[k] = n;
        sum += n;
      }
      if (!Object.keys(bag).length) bag.plain = 0;
      out.inventory.stewFrom = bag;
      out.inventory.stew = sum;
    }
    this._syncCaughtOn(out);
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
      Player.dir = d.player.dir || 0;
      // Maps can change between visits: never load into water, a wall, or a door box.
      const p = World.settlePoint(d.player.x, d.player.y, Player.dir);
      Player.x = p.x;
      Player.y = p.y;
    }
    AudioFX.muted = !!d.flags.mute;
  },

  pullFromWorld() {
    if (this._keepData) return;
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
    this._keepData = true;
    this._ensureFish();
    this.syncCaught();
    try { if (typeof Stamps !== "undefined") Stamps.reconcile(); } catch (e) { /* stamps optional */ }
    try { if (typeof Island !== "undefined") Island.sync(true); } catch (e) { /* island gate optional */ }
    this.write();
  },

  resetFreshKeepingMute() {
    const mute = !!(this.data && this.data.flags && this.data.flags.mute);
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    this.data = this.fresh();
    this._keepData = true;
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

  clockDay() {
    return ((this.data && this.data.clock && this.data.clock.day) | 0) || 1;
  },

  loose() {
    if (!this.data) return [];
    if (!this.data.inventory) this.data.inventory = {};
    if (!Array.isArray(this.data.inventory.loose)) this.data.inventory.loose = [];
    return this.data.inventory.loose;
  },

  cooler() {
    if (!this.data) return [];
    if (!this.data.cottage) this.data.cottage = {};
    if (!Array.isArray(this.data.cottage.cooler)) this.data.cottage.cooler = [];
    return this.data.cottage.cooler;
  },

  stewCount() {
    return (this.data && this.data.inventory && this.data.inventory.stew) | 0;
  },

  stewBag() {
    const inv = this.data && this.data.inventory;
    if (!inv) return { plain: 0 };
    if (!inv.stewFrom || typeof inv.stewFrom !== "object" || Array.isArray(inv.stewFrom)) {
      inv.stewFrom = { plain: inv.stew | 0 };
    }
    return inv.stewFrom;
  },

  syncStewTotal() {
    const bag = this.stewBag();
    let n = 0;
    for (const k of Object.keys(bag)) n += bag[k] | 0;
    this.data.inventory.stew = n;
    return n;
  },

  addStew(spot) {
    const bag = this.stewBag();
    const key = spot && typeof SPOTS !== "undefined" && SPOTS[spot] ? spot : "plain";
    bag[key] = (bag[key] | 0) + 1;
    return this.syncStewTotal();
  },

  /** Plain stock first, then any water. Total stays equal to the breakdown. */
  spendStew(n) {
    let left = n | 0;
    const bag = this.stewBag();
    const order = ["plain"].concat(Object.keys(typeof SPOTS !== "undefined" ? SPOTS : {}));
    for (let i = 0; i < order.length && left > 0; i++) {
      const k = order[i];
      const have = bag[k] | 0;
      const take = Math.min(have, left);
      if (take > 0) { bag[k] = have - take; left -= take; }
    }
    return this.syncStewTotal();
  },

  stewLine() {
    const bag = this.stewBag();
    const bits = [];
    if ((bag.plain | 0) > 0) bits.push("Stew ×" + (bag.plain | 0));
    const keys = Object.keys(typeof SPOTS !== "undefined" ? SPOTS : {});
    for (let i = 0; i < keys.length; i++) {
      const n = bag[keys[i]] | 0;
      if (n > 0) bits.push(SPOTS[keys[i]].name + " ×" + n);
    }
    if (!bits.length) bits.push("Stew ×0");
    return bits.join(" · ");
  },

  coolerCap() {
    return (typeof CONFIG !== "undefined" && CONFIG.COOLER_N) ? CONFIG.COOLER_N : 6;
  },

  countIn(list, id) {
    let n = 0;
    if (!list) return 0;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) n++;
    return n;
  },

  countLoose(id) { return this.countIn(this.loose(), id); },
  countCooler(id) { return this.countIn(this.cooler(), id); },

  _syncCaughtOn(data) {
    if (!data || !data.journal) return;
    if (!data.inventory) data.inventory = {};
    const loose = data.inventory.loose || [];
    const cooler = (data.cottage && data.cottage.cooler) || [];
    for (const f of FISH) {
      if (!data.journal[f.id]) data.journal[f.id] = this.blankJournalEntry();
      data.journal[f.id].caught = this.countIn(loose, f.id) + this.countIn(cooler, f.id);
    }
  },

  syncCaught() {
    if (!this.data) return;
    this._syncCaughtOn(this.data);
  },

  unitAge(u) {
    return Math.max(0, this.clockDay() - ((u && u.day) | 0));
  },

  freshness(u) {
    return this.unitAge(u) >= 2 ? "soft" : "fresh";
  },

  sellPrice(u) {
    const f = FISH.find((x) => x.id === u.id);
    const base = (f && f.sell) || 6;
    if (this.unitAge(u) >= 2) return Math.max(1, Math.floor(base * 0.5));
    return base;
  },

  oldestLoose(id) {
    const list = this.loose();
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  },

  pushLoose(id, day) {
    this.loose().push({ id, day: day != null ? day : this.clockDay() });
    this.syncCaught();
  },

  takeOldestLoose(id) {
    const list = this.loose();
    const i = list.findIndex((u) => u.id === id);
    if (i < 0) return null;
    return list.splice(i, 1)[0];
  },

  takeOldestCommon() {
    const list = this.loose();
    const i = list.findIndex((u) => {
      const f = FISH.find((x) => x.id === u.id);
      return f && f.rarity === "Common";
    });
    if (i < 0) return null;
    return list.splice(i, 1)[0];
  },

  countLooseCommon() {
    let n = 0;
    for (const u of this.loose()) {
      const f = FISH.find((x) => x.id === u.id);
      if (f && f.rarity === "Common") n++;
    }
    return n;
  },

  spoilLoose() {
    if (!this.data) return 0;
    const dayNow = this.clockDay();
    const keep = [];
    let n = 0;
    let spot = "";
    let mixed = false;
    for (const u of this.loose()) {
      if (dayNow - (u.day | 0) >= 3) {
        const f = FISH.find((x) => x.id === u.id);
        const id = f && f.spot ? f.spot : "plain";
        this.addStew(id);
        if (!n) spot = id;
        else if (spot !== id) mixed = true;
        n++;
      } else {
        keep.push(u);
      }
    }
    this.data.inventory.loose = keep;
    this.syncCaught();
    if (n && typeof UI !== "undefined" && UI.toastNote) {
      const named = !mixed && spot && SPOTS[spot];
      UI.toastNote(named ? `Some fish went soft — ${SPOTS[spot].name} stew.` : "Some fish went soft — good for stew.");
    }
    if (n) {
      try { if (typeof AudioFX !== "undefined") AudioFX.soft(); } catch (e) { /* tick optional */ }
    }
    return n;
  },
};
