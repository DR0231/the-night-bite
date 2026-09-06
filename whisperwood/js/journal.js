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
    e.caught = (e.caught | 0) + 1;
    e.landed = (e.landed | 0) + 1;
    e.hooked = (e.hooked | 0) + 1;
    e.lastAt = Date.now();
    if (!e.firstAt) e.firstAt = e.lastAt;
    if (record) e.biggest = inches;
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
    Save.mark();
  },

  _mastery(spotId) {
    const need = FISH.filter((f) => f.spot === spotId);
    const ok = need.every((f) => this.landed(f.id));
    if (ok) Save.data.flags.spotMastery[spotId] = true;
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
