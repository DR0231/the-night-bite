/* Journal entries live on Save.data.journal. Sightings unlock silhouettes. */

const Journal = {
  ensure(id) { return Save.ensureFish(id); },

  caughtOf(id) { return this.ensure(id).caught | 0; },

  known(id) {
    const e = this.ensure(id);
    return e.landed > 0 || e.hooked > 0 || e.gotAway > 0 || e.caught > 0;
  },

  landed(id) { return this.ensure(id).landed > 0; },

  count() { return FISH.filter((f) => this.landed(f.id)).length; },

  seenCount() { return FISH.filter((f) => this.known(f.id)).length; },

  recordLand(fish, inches) {
    const e = this.ensure(fish.id);
    const first = e.landed === 0;
    const record = inches > (e.biggest || 0);
    e.landed = (e.landed | 0) + 1;
    e.hooked = (e.hooked | 0) + 1;
    e.lastAt = Date.now();
    if (!e.firstAt) e.firstAt = e.lastAt;
    if (first) e.firstDay = Save.clockDay();
    if (record) e.biggest = inches;
    Save.pushLoose(fish.id);
    this._mastery(fish.spot);
    Save.mark("catch");
    try {
      if (typeof Stamps !== "undefined") {
        if (Journal.count() >= 10) Stamps.try("tenSpecies");
        if (fish.rarity === "Rare") Stamps.try("firstRare");
      }
    } catch (e) { /* stamps never block a land */ }
    return { first, record, inches };
  },

  recordHook(fish) {
    const e = this.ensure(fish.id);
    e.hooked = (e.hooked | 0) + 1;
  },

  recordMiss(fish) {
    if (!fish) return;
    const e = this.ensure(fish.id);
    e.gotAway = (e.gotAway | 0) + 1;
    e.hooked = Math.max(e.hooked | 0, 1);
    Save.mark("miss");
  },

  toggleFavorite(id) {
    const e = this.ensure(id);
    e.favorite = !e.favorite;
    if (e.favorite) {
      const f = FISH.find((x) => x.id === id);
      if (f) Save.data.player.favoriteSpot = f.spot;
    }
    Save.mark();
  },

  _mastery(spotId) {
    const need = FISH.filter((f) => f.spot === spotId);
    const ok = need.every((f) => this.landed(f.id));
    if (ok) Save.data.flags.spotMastery[spotId] = true;
  },

  hintLine(f) {
    if (!f) return "";
    const bits = [];
    if (f.rarity === "Rare") bits.push(f.sell >= 30 || f.nightOnly ? "ultra-rare" : "rare");
    if (f.rainOnly) bits.push("only in rain");
    if (f.nightOnly) bits.push("only at night");
    if (f.season) bits.push("best in " + f.season);
    if (f.baitBias) {
      let best = "", bestW = 0;
      for (const id of Object.keys(f.baitBias)) {
        if (f.baitBias[id] > bestW) { bestW = f.baitBias[id]; best = id; }
      }
      if (best && BAIT[best]) bits.push("likes " + BAIT[best].name);
    }
    if (f.bite) {
      let peak = "day", pv = -1;
      for (const k of ["dawn", "day", "golden", "night"]) {
        if ((f.bite[k] || 0) > pv) { pv = f.bite[k]; peak = k; }
      }
      const names = { dawn: "dawn", day: "midday", golden: "dusk", night: "night" };
      bits.push("bites most at " + names[peak]);
    }
    return bits.join(" · ");
  },

  /** One short "when" for a species: peak phase, plus night-only / rain / season if set. */
  whenLine(f) {
    const names = { dawn: "dawn", day: "midday", golden: "dusk", night: "night" };
    const bits = [];
    if (f.nightOnly) bits.push("night only");
    else if (f.bite) {
      let peak = null, pv = -1;
      for (const k of Object.keys(f.bite)) {
        if ((f.bite[k] || 0) > pv) { pv = f.bite[k]; peak = k; }
      }
      if (peak && names[peak]) bits.push(names[peak]);
    }
    if (f.rainOnly) bits.push("rain");
    if (f.season) bits.push(f.season);
    return bits.join(", ");
  },

  /** Water sign: every species with its best hour, rares marked, then the water's own line. */
  signText(spotId) {
    const s = SPOTS[spotId];
    if (!s) return "";
    const list = FISH.filter((f) => f.spot === spotId);
    const names = list.map((f) => {
      const bits = [];
      const when = this.whenLine(f);
      if (when) bits.push(when);
      if (f.rarity === "Rare") bits.push(f.sell >= 30 || f.nightOnly ? "ultra-rare" : "rare");
      return `${f.name}${bits.length ? ` (${bits.join(" · ")})` : ""}`;
    }).join("; ");
    return `${names}. ${s.flavor}`;
  },

  bestAt(spotId) {
    let best = null;
    for (const f of FISH) {
      if (f.spot !== spotId) continue;
      const e = this.ensure(f.id);
      if (!e.biggest) continue;
      if (!best || e.biggest > best.inches) best = { fish: f, inches: e.biggest };
    }
    return best;
  },

  load() { /* Save.load owns persistence */ },
  save() { Save.write(); },
};

const Stamps = {
  _pending: "",

  _bag() {
    if (!Save.data || !Save.data.flags) return {};
    const bag = Save.data.flags.stamps;
    if (!bag || typeof bag !== "object" || Array.isArray(bag)) {
      Save.data.flags.stamps = {};
      return Save.data.flags.stamps;
    }
    return bag;
  },

  _def(id) {
    return (typeof STAMPS !== "undefined" ? STAMPS : []).find((s) => s.id === id) || null;
  },

  dayOf(id) {
    const v = this._bag()[id];
    return v == null ? 0 : (v | 0);
  },

  has(id) {
    return this.dayOf(id) > 0;
  },

  list() {
    const rows = typeof STAMPS !== "undefined" ? STAMPS : [];
    return rows.map((s) => ({ id: s.id, title: s.title, day: this.dayOf(s.id) || 0 }));
  },

  unlockedCount() {
    return this.list().filter((s) => s.day > 0).length;
  },

  /** Earliest unlocked stamp: lowest vale day, then table order. Null if none. */
  earliest() {
    const rows = typeof STAMPS !== "undefined" ? STAMPS : [];
    let best = null;
    for (let i = 0; i < rows.length; i++) {
      const day = this.dayOf(rows[i].id);
      if (!day) continue;
      if (!best || day < best.day || (day === best.day && i < best.index)) {
        best = { id: rows[i].id, title: rows[i].title, day, index: i };
      }
    }
    return best;
  },

  _earned(id) {
    if (!Save.data) return false;
    if (id === "tenSpecies") return Journal.count() >= 10;
    if (id === "firstRare") return FISH.some((f) => f.rarity === "Rare" && Journal.landed(f.id));
    if (id === "firstCook") {
      const cooked = Save.data.flags.cooked || {};
      return Object.keys(cooked).some((k) => cooked[k]);
    }
    if (id === "firstPassOut") {
      if ((Save.data.flags.passedOutDay | 0) > 0) return true;
      return (Save.data.recap || []).some((r) => r.reason === "passout");
    }
    if (id === "marshOpen") return !!Save.data.flags.fifthWater;
    if (id === "millQuiet") return Save.data.flags.millSpine === "done";
    return false;
  },

  _fight() {
    return typeof Fishing !== "undefined" && Fishing.state === "play";
  },

  _announce(id) {
    const def = this._def(id);
    if (!def) return;
    if (this._fight()) {
      this._pending = this._pending || id;
      return;
    }
    if (typeof UI !== "undefined" && UI.toastT > 0) {
      this._pending = this._pending || id;
      return;
    }
    UI.toastNote("Certificate: " + def.title);
  },

  try(id) {
    if (!this._def(id)) return false;
    const bag = this._bag();
    if (bag[id]) return false;
    bag[id] = ((Save.data.clock && Save.data.clock.day) | 0) || 1;
    Save.mark("stamp");
    this._announce(id);
    return true;
  },

  reconcile() {
    const rows = typeof STAMPS !== "undefined" ? STAMPS : [];
    const bag = this._bag();
    let added = false;
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i].id;
      if (bag[id]) continue;
      if (!this._earned(id)) continue;
      bag[id] = ((Save.data.clock && Save.data.clock.day) | 0) || 1;
      added = true;
    }
    if (added) Save.write();
  },

  flush() {
    if (!this._pending) return;
    if (this._fight()) return;
    if (typeof UI !== "undefined" && UI.toastT > 0) return;
    const id = this._pending;
    this._pending = "";
    const def = this._def(id);
    if (def) UI.toastNote("Certificate: " + def.title);
  },
};
