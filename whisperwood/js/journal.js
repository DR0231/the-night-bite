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
    if (record) e.biggest = inches;
    Save.pushLoose(fish.id);
    this._mastery(fish.spot);
    Save.mark("catch");
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

  signText(spotId) {
    const s = SPOTS[spotId];
    if (!s) return "";
    const list = FISH.filter((f) => f.spot === spotId);
    const names = list.map((f) => {
      const tag = f.rarity === "Rare" ? (f.sell >= 30 || f.nightOnly ? " (ultra-rare)" : " (rare)") : "";
      return f.name + tag;
    }).join(", ");
    const rares = list.filter((f) => f.rarity === "Rare");
    const extra = rares.map((f) => `${f.name}: ${this.hintLine(f)}`).filter(Boolean).join(" · ");
    return `${s.name}. Catch: ${names}. ${s.flavor}${extra ? " Hints — " + extra : ""}`;
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
