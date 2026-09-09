/* Fisher rank 1–8. XP from journal-quality moments, not a grind toast. */

const Skills = {
  offering: false,

  get data() { return Save.data.skills; },

  rank() { return (this.data && this.data.rank) || 1; },

  has(id) {
    return !!(this.data && this.data.perks && this.data.perks.indexOf(id) >= 0);
  },

  xpToNext() {
    if (this.rank() >= 8) return 0;
    return RANK_NEED[this.rank() - 1] || 0;
  },

  barMult() {
    let m = 1;
    if (this.has("steadyhands")) m += 0.12;
    const meal = Survival.meal();
    if (meal && meal.buff === "steady") m += 0.12;
    return m;
  },

  tensionMult() {
    return this.has("ironwrist") ? 1.2 : 1;
  },

  needMult() {
    return this.has("ironwrist") ? 0.9 : 1;
  },

  perkNames() {
    return ((this.data && this.data.perks) || []).map((id) => (PERKS[id] ? PERKS[id].name : id));
  },

  awardFromLand(fish, rec, questBonus) {
    if (!fish || !this.data) return;
    rec = rec || {};
    let xp = 0;
    if (rec.first) xp += 40;
    if (rec.record) xp += 18;
    if (questBonus) xp += 15;
    const today = this.data.speciesToday || (this.data.speciesToday = {});
    if (!today[fish.id]) {
      xp += 10;
      today[fish.id] = 1;
    } else {
      const rep = this.data.repeatsToday || (this.data.repeatsToday = { total: 0 });
      rep.total = (rep.total | 0) + 1;
      if (rep.total <= 8) xp += 2;
    }
    this._addXp(xp);
  },

  awardFromMiss(fish) {
    if (!fish || !this.data) return;
    const e = Journal.ensure(fish.id);
    if ((e.landed | 0) > 0) return;
    const seen = this.data.sightXp || (this.data.sightXp = {});
    if (seen[fish.id]) return;
    seen[fish.id] = 1;
    this._addXp(4);
  },

  _addXp(n) {
    if (this.rank() >= 8) return;
    if (n > 0) this.data.xp = (this.data.xp | 0) + n;
    if (this.offering) return;
    const need = this.xpToNext();
    if (this.rank() < 8 && this.data.xp >= need) {
      this.data.xp -= need;
      this.data.rank = Math.min(8, this.rank() + 1);
      if (this.rank() >= 8) this.data.xp = 0;
      this._giveRankKit();
      this._offerPerks();
    }
  },

  _giveRankKit() {
    if (this.rank() >= 3 && !Save.data.flags.gotCampKit) {
      Save.data.flags.gotCampKit = true;
      Save.data.inventory.items.campfireKit = (Save.data.inventory.items.campfireKit | 0) + 1;
    }
  },

  _offerPerks() {
    const have = this.data.perks || [];
    const pool = Object.keys(PERKS).filter((id) => have.indexOf(id) < 0);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    this.data.offered = pool.slice(0, 2);
    this._showOffer();
  },

  _showOffer() {
    const el = document.getElementById("rank-up");
    const body = document.getElementById("rank-up-body");
    if (!el || !body) return;
    this.offering = true;
    UI.closeJournal();
    Inventory.close();
    Shop.close();
    Board.close();
    Mail.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Tank !== "undefined") Tank.close();
    const offered = this.data.offered || [];
    const btns = offered.map((id) => {
      const p = PERKS[id];
      return `<button type="button" data-perk="${id}"><strong>${p.name}</strong><span>${p.desc}</span></button>`;
    }).join("");
    body.innerHTML = `
      <p class="journal-sub">Fisher rank ${this.rank()}</p>
      <p>Your hands know the water a little better. Choose one.</p>
      <div class="perk-picks">${btns || "<p>Every habit you needed, you already have.</p>"}</div>`;
    el.classList.remove("hidden");
    body.querySelectorAll("[data-perk]").forEach((b) => {
      b.addEventListener("click", () => this.pick(b.dataset.perk));
    });
    if (!offered.length) {
      const done = document.createElement("button");
      done.type = "button";
      done.textContent = "Continue";
      done.addEventListener("click", () => this.pick(""));
      body.appendChild(done);
    }
  },

  pick(id) {
    if (id && PERKS[id] && !this.has(id)) this.data.perks.push(id);
    this.data.offered = [];
    this.offering = false;
    const el = document.getElementById("rank-up");
    if (el) el.classList.add("hidden");
    if (this.rank() >= 3 && Save.data.flags.gotCampKit && (Save.data.inventory.items.campfireKit | 0) > 0) {
      UI.toastNote(`Fisher rank ${this.rank()}. A campfire kit is in the pack.`);
    } else {
      UI.toastNote(`Fisher rank ${this.rank()}.`);
    }
    Save.mark("rank");
    if (this.rank() < 8 && this.data.xp >= this.xpToNext()) this._addXp(0);
  },

  close() {
    /* Rank-up waits for a pick. */
  },

  line() {
    const names = this.perkNames();
    const next = this.rank() >= 8 ? "max" : `${this.data.xp | 0} / ${this.xpToNext()} toward the next rank`;
    return `Fisher rank ${this.rank()}${names.length ? " — " + names.join(", ") : ""}. ${next}.`;
  },
};
