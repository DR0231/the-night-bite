/* Cottage interior map, sleep, aquarium, trophies, packing bench. */

const Cottage = {
  build() {
    const tw = 22, th = 16;
    return World._buildMap(tw, th, TILE.CAVE_WALL, ({ set, addSolid, addDeco, spots, portals }) => {
      for (let y = 2; y <= 13; y++) for (let x = 2; x <= 19; x++) set(x, y, TILE.WOOD);
      for (let x = 9; x <= 12; x++) {
        set(x, 14, TILE.WOOD);
        set(x, 15, TILE.WOOD);
      }
      addDeco("bed", 7.2 * TILE_SIZE, 6.2 * TILE_SIZE);
      addSolid(5.0 * TILE_SIZE, 4.8 * TILE_SIZE, 60, 20, "bed");
      addDeco("tank", 16 * TILE_SIZE, 5.2 * TILE_SIZE);
      addDeco("trophy", 11 * TILE_SIZE, 3.6 * TILE_SIZE);
      addDeco("certificate", 8.4 * TILE_SIZE, 4.2 * TILE_SIZE);
      addDeco("dayclock", 14.2 * TILE_SIZE, 4.0 * TILE_SIZE);
      addDeco("bench", 5.5 * TILE_SIZE, 11 * TILE_SIZE);
      addSolid(4.6 * TILE_SIZE, 10.2 * TILE_SIZE, 22, 10, "bench");
      addDeco("calendar", 16.5 * TILE_SIZE, 11 * TILE_SIZE);
      addDeco("mailtray", 12.5 * TILE_SIZE, 11.2 * TILE_SIZE);
      addDeco("crate", 18.2 * TILE_SIZE, 12.4 * TILE_SIZE);
      addSolid(18.2 * TILE_SIZE - 5, 12.4 * TILE_SIZE - 4, 10, 6, "crate");
      if (typeof COTTAGE_DECOR !== "undefined") {
        for (const id of Object.keys(COTTAGE_DECOR)) {
          const d = COTTAGE_DECOR[id];
          addDeco(d.sprite || id, d.x, d.y, { slot: id, floor: !!d.floor });
        }
      }
      portals.push({
        x: 9 * TILE_SIZE, y: 14.2 * TILE_SIZE, w: 4 * TILE_SIZE, h: 1.6 * TILE_SIZE,
        to: "vale", spawn: { x: 28 * TILE_SIZE, y: 25.6 * TILE_SIZE }, dir: 0,
        hint: "Walk out to the vale",
      });
      return { x: 11 * TILE_SIZE, y: 12 * TILE_SIZE };
    });
  },

  near(kind) {
    const spots = {
      bed: { x: 7.2 * TILE_SIZE, y: 6.2 * TILE_SIZE, r: 30 },
      tank: { x: 16 * TILE_SIZE, y: 5.2 * TILE_SIZE, r: 22 },
      trophy: { x: 11 * TILE_SIZE, y: 3.6 * TILE_SIZE, r: 20 },
      certificate: { x: 8.4 * TILE_SIZE, y: 4.2 * TILE_SIZE, r: 16 },
      dayclock: { x: 14.2 * TILE_SIZE, y: 4.0 * TILE_SIZE, r: 16 },
      bench: { x: 5.5 * TILE_SIZE, y: 11 * TILE_SIZE, r: 28 },
      calendar: { x: 16.5 * TILE_SIZE, y: 11 * TILE_SIZE, r: 20 },
      mailtray: { x: 12.5 * TILE_SIZE, y: 11.2 * TILE_SIZE, r: 18 },
      crate: { x: 18.2 * TILE_SIZE, y: 12.4 * TILE_SIZE, r: 22 },
    };
    const s = spots[kind];
    return s && Utils.dist(Player.x, Player.y, s.x, s.y) < s.r;
  },

  snapToBed() {
    Player.x = 7.2 * TILE_SIZE + 4;
    Player.y = 6.2 * TILE_SIZE - 8;
    Player.dir = 2;
    Player.vx = 0;
    Player.vy = 0;
    Save.data.player.x = Player.x;
    Save.data.player.y = Player.y;
    Save.data.player.dir = Player.dir;
  },

  wakeBesideBed() {
    Player.x = 10.4 * TILE_SIZE;
    Player.y = 7.6 * TILE_SIZE;
    Player.dir = 0;
    Player.vx = 0;
    Player.vy = 0;
    Player.sleeping = false;
    Save.data.player.x = Player.x;
    Save.data.player.y = Player.y;
    Save.data.player.dir = Player.dir;
  },

  hint() {
    if (World.id !== "cottage") return "";
    if (this.carry) return "E place · R rotate · F flip · -/+ size";
    if (this.sitting) return "Press E to stand";
    if (this.nearSlot("chair")) return "E sit · Q pick up";
    const slot = this.nearAnySlot();
    if (slot) return "E or Q to pick up";
    if (this.near("bed")) return "Press E to sleep until dusk or dawn";
    if (this.near("bench")) return "Press E — packing bench (cook & bait)";
    if (this.near("crate")) return "Press E — cottage cooler";
    if (this.near("calendar")) return "Press E to read the forecast board";
    if (this.near("mailtray")) return "Press E to check the mail tray";
    if (this.near("tank")) {
      const aq = Save.data.cottage.aquarium || [];
      if (aq.length || this.tuckable()) return "Press E to manage the tank";
    }
    if (this.near("certificate")) return "Press E to read your fisher certificate";
    if (this.near("dayclock")) {
      return Save.data.inventory.items.dayclock
        ? "Press E — the sundial"
        : "A blank nail. Wren sells a cottage sundial.";
    }
    if (this.near("trophy")) return "Press E to manage the wall mount";
    return "";
  },

  decorBag() {
    if (!Save.data.cottage.decor || typeof Save.data.cottage.decor !== "object" || Array.isArray(Save.data.cottage.decor)) {
      Save.data.cottage.decor = {};
    }
    return Save.data.cottage.decor;
  },

  decorOn() {
    return !!(typeof DESIGN !== "undefined" && DESIGN.decorOn);
  },

  hasSlot(id) {
    if (!this.decorOn()) return false;
    const v = this.decorBag()[id];
    return !!(v && v !== false);
  },

  slotPos(id) {
    const v = this.decorBag()[id];
    const def = typeof COTTAGE_DECOR !== "undefined" ? COTTAGE_DECOR[id] : null;
    if (v && typeof v === "object" && v.x != null) {
      return {
        x: v.x, y: v.y,
        facing: v.facing != null ? v.facing : (def && def.facing) || 0,
        flip: !!v.flip,
        scale: v.scale != null ? v.scale : 1,
      };
    }
    if (def) return { x: def.x, y: def.y, facing: def.facing || 0, flip: false, scale: 1 };
    return { x: Player.x, y: Player.y, facing: Player.dir || 0, flip: false, scale: 1 };
  },

  carry: null,
  carryFacing: 0,
  carryFlip: false,
  carryScale: 1,
  sitting: false,
  sitLock: 0,
  sitT: 0,

  nearSlot(id) {
    if (!this.hasSlot(id)) return false;
    const p = this.slotPos(id);
    const reach = id === "chair" ? 36 : 22;
    return Utils.dist(Player.x, Player.y, p.x, p.y) < reach;
  },

  nearAnySlot() {
    if (typeof COTTAGE_DECOR === "undefined") return null;
    for (const id of Object.keys(COTTAGE_DECOR)) {
      if (this.nearSlot(id)) return id;
    }
    return null;
  },

  pickUp(id) {
    const p = this.slotPos(id);
    this.carry = id;
    this.carryFacing = p.facing | 0;
    this.carryFlip = !!p.flip;
    this.carryScale = p.scale || 1;
    this.sitting = false;
    UI.toastNote("Carrying. R rotate · F flip · -/+ size · E place.");
  },

  tweakCarry() {
    if (!this.carry) return;
    if (Input.pressed.r) this.carryFacing = (this.carryFacing + 1) & 3;
    if (Input.pressed.f) this.carryFlip = !this.carryFlip;
    const steps = typeof DECOR_SCALES !== "undefined" ? DECOR_SCALES : [0.75, 1, 1.3];
    let i = 0, best = 99;
    for (let n = 0; n < steps.length; n++) {
      const d = Math.abs(steps[n] - this.carryScale);
      if (d < best) { best = d; i = n; }
    }
    if (Input.pressed["-"] || Input.pressed["["]) this.carryScale = steps[Math.max(0, i - 1)];
    if (Input.pressed["="] || Input.pressed["]"]) this.carryScale = steps[Math.min(steps.length - 1, i + 1)];
  },

  placeCarry() {
    if (!this.carry) return false;
    const t = World.tileAt(Player.x, Player.y);
    if (t !== TILE.WOOD) {
      UI.toastNote("Set it on the cottage floor.");
      return true;
    }
    const bag = this.decorBag();
    bag[this.carry] = {
      x: Player.x, y: Player.y,
      facing: this.carryFacing | 0,
      flip: !!this.carryFlip,
      scale: this.carryScale || 1,
    };
    UI.toastNote("Set down.");
    this.carry = null;
    Save.mark();
    return true;
  },

  startSit() {
    if (!this.hasSlot("chair")) return false;
    this.sitting = true;
    this.sitLock = 0.4;
    this.sitT = 0;
    Player.locked = true;
    Player.vx = 0;
    Player.vy = 0;
    const p = this.slotPos("chair");
    const face = p.facing | 0;
    Player.x = p.x;
    Player.y = face === 3 ? p.y - 1 : p.y + 2;
    Player.dir = face === 1 ? 1 : face === 2 ? 2 : face === 3 ? 3 : 0;
    UI.toastNote("The chair creaks. Rest comes slow. E or walk to stand.");
    return true;
  },

  stopSit() {
    if (!this.sitting) return;
    this.sitting = false;
    Player.locked = false;
    Player.y += 10;
  },

  hasCatalog(it) {
    const slots = (it && it.slots) || [];
    if (!slots.length) return false;
    return slots.every((s) => this.hasSlot(s));
  },

  grantCatalog(it) {
    const bag = this.decorBag();
    const slots = (it && it.slots) || [];
    for (let i = 0; i < slots.length; i++) {
      const id = slots[i];
      if (bag[id]) continue;
      const def = COTTAGE_DECOR[id];
      bag[id] = def ? { x: def.x, y: def.y, facing: def.facing || 0 } : true;
    }
  },

  try() {
    if (World.id !== "cottage") return false;
    Save.data.cottage.visited = true;
    if (typeof MillSpine !== "undefined") MillSpine.tickHeard();
    if (this.sitting) { this.stopSit(); return true; }
    if (this.carry) return this.placeCarry();
    if (Input.pressed.q) {
      const q = this.nearSlot("chair") ? "chair" : this.nearAnySlot();
      if (q) { this.pickUp(q); return true; }
    }
    if (this.nearSlot("chair")) return this.startSit();
    const slot = this.nearAnySlot();
    if (slot && !this.near("bed") && !this.near("bench") && !this.near("crate")) {
      this.pickUp(slot);
      return true;
    }
    if (this.near("bed")) {
      if (Game.sleeping) return true;
      this.snapToBed();
      Game.startSleep();
      return true;
    }
    if (this.near("bench")) {
      Bench.open();
      return true;
    }
    if (this.near("crate")) {
      Cooler.open();
      return true;
    }
    if (this.near("calendar")) { Quests.open = false; Board.toggle(); return true; }
    if (this.near("mailtray")) { Mail.toggle(); return true; }
    if (this.near("tank")) { this._tank(); return true; }
    if (this.near("dayclock")) {
      if (!Save.data.inventory.items.dayclock) {
        UI.toastNote("Buy a cottage sundial from Wren to hang here.");
        return true;
      }
      const ph = TimeCycle.phaseId();
      const names = { dawn: "Dawn", day: "Day", golden: "Dusk", night: "Night" };
      UI.toastNote(`${names[ph] || ph} · ${TimeCycle.season()} · ${(WEATHERS[TimeCycle.weatherId()] || {}).name || ""} · ${TimeCycle.clockLabel()}`);
      return true;
    }
    if (this.near("certificate")) {
      Cert.open();
      return true;
    }
    if (this.near("trophy")) { Trophy.open(); return true; }
    return false;
  },

  tankCap() {
    return Save.data.inventory.items.tank ? CONFIG.AQUARIUM_N_UP : CONFIG.AQUARIUM_N;
  },

  tuckable() {
    const aq = Save.data.cottage.aquarium || [];
    return FISH.find((f) => Save.countLoose(f.id) > 0 && aq.indexOf(f.id) < 0) || null;
  },

  _tank() {
    const aq = Save.data.cottage.aquarium || [];
    if (!aq.length && !this.tuckable()) {
      UI.toastNote("Catch a fish to keep.");
      return;
    }
    Tank.open();
  },

  _tuck() {
    const aq = Save.data.cottage.aquarium;
    if (aq.length >= this.tankCap()) {
      UI.toastNote("The tank is full.");
      return false;
    }
    const extra = this.tuckable();
    if (!extra) { UI.toastNote("Catch a fish to keep."); return false; }
    const unit = Save.takeOldestLoose(extra.id);
    if (!unit) return false;
    aq.push(extra.id);
    Save.syncCaught();
    UI.toastNote(`${extra.name} now lives in the tank.`);
    Save.mark();
    return true;
  },

  _takeOut(index) {
    const aq = Save.data.cottage.aquarium;
    const id = aq[index];
    if (!id) return false;
    aq.splice(index, 1);
    Save.pushLoose(id);
    const f = FISH.find((x) => x.id === id);
    UI.toastNote(`${f ? f.name : id} is back in your pack.`);
    Save.mark();
    return true;
  },

  _coolerTuck(id) {
    const slots = Save.cooler();
    if (slots.length >= Save.coolerCap()) {
      UI.toastNote("The cooler is full.");
      return false;
    }
    const unit = Save.takeOldestLoose(id);
    if (!unit) return false;
    slots.push(unit);
    Save.syncCaught();
    const f = FISH.find((x) => x.id === id);
    UI.toastNote(`${f ? f.name : id} tucked in the cooler.`);
    Save.mark();
    return true;
  },

  _coolerTake(index) {
    const slots = Save.cooler();
    const unit = slots[index];
    if (!unit) return false;
    slots.splice(index, 1);
    Save.pushLoose(unit.id);
    const f = FISH.find((x) => x.id === unit.id);
    UI.toastNote(`${f ? f.name : unit.id} is back in your pack.`);
    Save.mark();
    return true;
  },

};

const Cert = {
  openFlag: false,

  open() {
    this.openFlag = true;
    UI.closeJournal();
    Inventory.close();
    Shop.close();
    Board.close();
    Mail.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Tank !== "undefined") Tank.close();
    if (typeof Cooler !== "undefined") Cooler.close();
    if (typeof Trophy !== "undefined") Trophy.close();
    const el = document.getElementById("certificate");
    if (el) el.classList.remove("hidden");
    this.refresh();
  },

  close() {
    if (!this.openFlag) return;
    this.openFlag = false;
    const el = document.getElementById("certificate");
    if (el) el.classList.add("hidden");
  },

  refresh() {
    const rank = document.getElementById("certificate-rank");
    if (rank) rank.textContent = typeof Skills !== "undefined" ? Skills.line() : "";
    const el = document.getElementById("certificate-body");
    if (!el) return;
    const rows = (typeof Stamps !== "undefined" ? Stamps.list() : []).map((s) => {
      if (!s.day) {
        return `<li class="stamp-locked"><span class="stamp-seal" aria-hidden="true"></span><span class="stamp-title">—</span></li>`;
      }
      return `<li class="stamp-open"><span class="stamp-seal is-ink" aria-hidden="true"></span><span class="stamp-title">${s.title}</span><span class="stamp-day">Day ${s.day}</span></li>`;
    }).join("");
    el.innerHTML = `<ul class="stamp-list">${rows}</ul>`;
  },
};

const Trophy = {
  openFlag: false,
  open() {
    this.openFlag = true;
    UI.closeJournal();
    Inventory.close();
    if (typeof Cert !== "undefined") Cert.close();
    const el = document.getElementById("trophy");
    if (el) el.classList.remove("hidden");
    this.refresh();
  },
  close() {
    if (!this.openFlag) return;
    this.openFlag = false;
    const el = document.getElementById("trophy");
    if (el) el.classList.add("hidden");
    Save.mark();
  },
  refresh() {
    const el = document.getElementById("trophy-body");
    if (!el) return;
    const wall = Save.data.cottage.trophies || (Save.data.cottage.trophies = []);
    const mounted = wall.map((id, i) => {
      const f = FISH.find((x) => x.id === id);
      return `<button type="button" data-off="${i}">Take down ${f ? f.name : id}</button>`;
    }).join("") || "<p>The mount is empty.</p>";
    const cap = (DESIGN.trophySlots | 0) || 2;
    const cands = FISH.filter((f) => Journal.landed(f.id) && wall.indexOf(f.id) < 0);
    const mount = cands.map((f) => {
      const e = Journal.ensure(f.id);
      const full = wall.length >= cap;
      return `<button type="button" data-on="${f.id}" ${full ? "disabled" : ""}>Mount ${f.name} (best ${e.biggest}")</button>`;
    }).join("") || "<p>Land a fish, then hang it here.</p>";
    const fullNote = wall.length >= cap ? "<p>Take one down to hang another.</p>" : "";
    el.innerHTML = `<p>On the wall (${wall.length}/${cap})</p>${mounted}<p>Pack</p>${mount}${fullNote}`;
    el.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", () => {
      wall.splice(b.dataset.off | 0, 1);
      UI.toastNote("Taken down. Hang another whenever you like.");
      Save.mark();
      this.refresh();
    }));
    el.querySelectorAll("[data-on]").forEach((b) => {
      b.addEventListener("click", () => {
        if (wall.length >= cap) {
          UI.toastNote("Take one down first.");
          return;
        }
        wall.push(b.dataset.on);
        const f = FISH.find((x) => x.id === b.dataset.on);
        UI.toastNote(`${f ? f.name : "Fish"} is on the wall.`);
        Save.mark();
        this.refresh();
      });
    });
  },
};

const Tank = {
  openFlag: false,

  open() {
    this.openFlag = true;
    UI.closeJournal();
    Inventory.close();
    Shop.close();
    Board.close();
    Mail.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Cooler !== "undefined") Cooler.close();
    const el = document.getElementById("tank");
    if (el) el.classList.remove("hidden");
    this.refresh();
  },

  close() {
    if (!this.openFlag) return;
    this.openFlag = false;
    const el = document.getElementById("tank");
    if (el) el.classList.add("hidden");
    Save.mark();
  },

  refresh() {
    const el = document.getElementById("tank-body");
    if (!el) return;
    const aq = Save.data.cottage.aquarium || [];
    const rows = aq.map((id, i) => {
      const f = FISH.find((x) => x.id === id);
      const name = f ? f.name : id;
      return `<button type="button" data-take="${i}">Take out ${name}</button>`;
    }).join("") || "<p>The tank is empty.</p>";
    const extra = Cottage.tuckable();
    const room = aq.length < Cottage.tankCap();
    const tuck = extra && room
      ? `<button type="button" id="btn-tuck">Tuck a fish (${extra.name})</button>`
      : (aq.length >= Cottage.tankCap() ? "<p>The tank is full.</p>" : "");
    el.innerHTML = `${rows}${tuck}`;
    el.querySelectorAll("[data-take]").forEach((b) => b.addEventListener("click", () => {
      Cottage._takeOut(b.dataset.take | 0);
      const left = Save.data.cottage.aquarium || [];
      if (!left.length && !Cottage.tuckable()) {
        this.close();
        return;
      }
      this.refresh();
    }));
    const tuckBtn = el.querySelector("#btn-tuck");
    if (tuckBtn) tuckBtn.addEventListener("click", () => {
      Cottage._tuck();
      this.refresh();
    });
  },
};

const Cooler = {
  openFlag: false,

  open() {
    this.openFlag = true;
    UI.closeJournal();
    Inventory.close();
    Shop.close();
    Board.close();
    Mail.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Tank !== "undefined") Tank.close();
    const el = document.getElementById("cooler");
    if (el) el.classList.remove("hidden");
    this.refresh();
  },

  close() {
    if (!this.openFlag) return;
    this.openFlag = false;
    const el = document.getElementById("cooler");
    if (el) el.classList.add("hidden");
    Save.mark();
  },

  refresh() {
    const el = document.getElementById("cooler-body");
    if (!el) return;
    const slots = Save.cooler();
    const cap = Save.coolerCap();
    const kept = slots.map((u, i) => {
      const f = FISH.find((x) => x.id === u.id);
      const name = f ? f.name : u.id;
      return `<button type="button" data-take="${i}">Take out ${name}</button>`;
    }).join("") || "<p>The cooler is empty.</p>";
    const groups = Object.create(null);
    for (const u of Save.loose()) {
      if (!groups[u.id]) groups[u.id] = { fresh: 0, soft: 0 };
      if (Save.freshness(u) === "soft") groups[u.id].soft++;
      else groups[u.id].fresh++;
    }
    const ids = Object.keys(groups);
    const room = slots.length < cap;
    const tuck = ids.map((id) => {
      const f = FISH.find((x) => x.id === id);
      const g = groups[id];
      const bits = [];
      if (g.fresh) bits.push(`<span class="ink-fresh">Fresh ×${g.fresh}</span>`);
      if (g.soft) bits.push(`<span class="ink-soft">Soft ×${g.soft}</span>`);
      return `<button type="button" data-tuck="${id}">Tuck ${f ? f.name : id} · ${bits.join(" · ")}</button>`;
    }).join("") || "<p>No loose fish to tuck.</p>";
    const full = !room ? "<p>The cooler is full.</p>" : "";
    const quiet = typeof COOLER_QUIET !== "undefined" ? COOLER_QUIET : "";
    el.innerHTML = `<p>Cooler ${slots.length} / ${cap}</p><p>${quiet}</p>${kept}<p>Loose</p>${tuck}${full}<p>${Save.stewLine()}</p>`;
    el.querySelectorAll("[data-take]").forEach((b) => b.addEventListener("click", () => {
      Cottage._coolerTake(b.dataset.take | 0);
      this.refresh();
    }));
    el.querySelectorAll("[data-tuck]").forEach((b) => b.addEventListener("click", () => {
      Cottage._coolerTuck(b.dataset.tuck);
      this.refresh();
    }));
  },
};

/* Misty Millpond: one wide pond with a still mill on its north shore, a boat
   landing at each end, and a footpath that keeps its feet dry. */
const Marsh = {
  build() {
    const tw = 48, th = 36;
    return World._buildMap(tw, th, TILE.GRASS, ({ set, get, addSolid, addDeco, fillEllipse, paintPath, shoreAll, solidAt, spots, portals }) => {
      const rng = mulberry32(0xA15A);
      // Water: main pond, two lobes, and a moored inlet at each map edge.
      fillEllipse(24, 15, 12, 7, TILE.MARSH);
      fillEllipse(33, 13, 5, 4, TILE.MARSH);
      fillEllipse(16, 18, 5, 3.5, TILE.MARSH);
      fillEllipse(3, 16, 4.5, 3.2, TILE.MARSH);
      fillEllipse(45, 16, 4.5, 3.2, TILE.MARSH);
      // A reed hummock in the open water.
      fillEllipse(28, 17.5, 1.6, 1, TILE.GRASS);
      shoreAll();

      // Boat landings: short piers over the inlets, roots on dry shore.
      for (let x = 5; x <= 8; x++) set(x, 16, TILE.DOCK);
      for (let x = 40; x <= 43; x++) set(x, 16, TILE.DOCK);
      // Fishing pier into the pond's south side.
      for (let y = 20; y <= 23; y++) { set(24, y, TILE.DOCK); set(25, y, TILE.DOCK); }

      // Footpath: west landing, south around the pond, east landing; a spur north to the mill.
      paintPath(8, 16, 8, 25);
      paintPath(8, 25, 39, 25);
      paintPath(39, 25, 39, 16);
      paintPath(24, 25, 24, 24);
      paintPath(8, 16, 8, 7);
      paintPath(8, 7, 18, 7);

      addDeco("mill", 22 * TILE_SIZE, 8.6 * TILE_SIZE);
      addSolid(20 * TILE_SIZE, 7 * TILE_SIZE, 36, 14, "wall");
      addDeco("sign", 18.6 * TILE_SIZE, 8.6 * TILE_SIZE, {
        read: "The mill wheel is still. Reeds keep the rest of the story.",
        readTurning: MILL_END_COPY.sign,
      });
      addSolid(18.6 * TILE_SIZE - 3, 8.6 * TILE_SIZE - 3, 6, 4, "sign");

      // Reeds fringe the shore; mist sits on the water.
      for (let y = 1; y < th - 1; y++) {
        for (let x = 1; x < tw - 1; x++) {
          if (get(x, y) !== TILE.SHORE || rng() > 0.34) continue;
          addDeco("reed", x * TILE_SIZE + 4 + rng() * 8, y * TILE_SIZE + 6 + rng() * 8);
        }
      }
      for (let i = 0; i < 12; i++) {
        const x = 12 + rng() * 24, y = 9 + rng() * 12;
        if (WATER_TILES.has(get(x | 0, y | 0))) addDeco("mist", x * TILE_SIZE, y * TILE_SIZE, { seed: rng() * 6 });
      }
      for (let i = 0; i < 8; i++) {
        const x = 14 + rng() * 20, y = 10 + rng() * 10;
        if (WATER_TILES.has(get(x | 0, y | 0))) addDeco("lily", x * TILE_SIZE, y * TILE_SIZE, { seed: i });
      }
      addDeco("reed", 27.6 * TILE_SIZE, 17.6 * TILE_SIZE);
      addDeco("reed", 28.6 * TILE_SIZE, 18.1 * TILE_SIZE);

      // Trees along the outer band, clear of paths and banks.
      const open = (tx, ty) => {
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const t = get(tx + ox, ty + oy);
          if (t !== TILE.GRASS) return false;
        }
        return true;
      };
      for (let ty = 2; ty < th - 2; ty++) {
        for (let tx = 2; tx < tw - 2; tx++) {
          if (!open(tx, ty)) continue;
          const edge = tx < 5 || ty < 5 || tx > tw - 6 || ty > th - 6;
          if (rng() > (edge ? 0.22 : 0.05)) continue;
          const px = tx * TILE_SIZE + 8 + Utils.irand(rng, -3, 3);
          const py = ty * TILE_SIZE + 12 + Utils.irand(rng, -2, 2);
          addDeco(rng() < 0.55 ? "pine" : "oak", px, py, { seed: rng() * 20 });
          addSolid(px - 4, py - 3, 8, 5, "tree");
        }
      }
      for (let i = 0; i < 8; i++) {
        const tx = 6 + Utils.irand(rng, 0, 36), ty = 27 + Utils.irand(rng, 0, 6);
        if (get(tx, ty) !== TILE.GRASS) continue;
        const px = tx * TILE_SIZE + 8, py = ty * TILE_SIZE + 10;
        addDeco("rock", px, py, { variant: i });
        addSolid(px - 5, py - 3, 10, 6, "rock");
      }
      for (let i = 0; i < 16; i++) addDeco("flower", (6 + rng() * 36) * TILE_SIZE, (26 + rng() * 8) * TILE_SIZE, { variant: i });
      addDeco("stump", 12 * TILE_SIZE, 29.2 * TILE_SIZE);
      addSolid(12 * TILE_SIZE - 5, 29.2 * TILE_SIZE - 3, 10, 5, "stump");
      addDeco("shrub", 34 * TILE_SIZE, 28.6 * TILE_SIZE);
      addDeco("shrub", 6 * TILE_SIZE, 11 * TILE_SIZE);

      // West landing: cooler and water sign at the root; the vale boat at the pier end.
      addDeco("crate", 10.6 * TILE_SIZE, 14.5 * TILE_SIZE);
      addSolid(10.6 * TILE_SIZE - 5, 14.5 * TILE_SIZE - 4, 10, 6, "crate");
      addDeco("waterSign", 10.6 * TILE_SIZE, 18.6 * TILE_SIZE, { spot: "marsh" });
      addSolid(10.6 * TILE_SIZE - 3, 18.6 * TILE_SIZE - 3, 6, 4, "sign");
      addDeco("raft", 4.2 * TILE_SIZE, 16.3 * TILE_SIZE, {
        boat: {
          to: "vale", spawn: { x: 59.2 * TILE_SIZE, y: 26.4 * TILE_SIZE }, dir: 1,
          label: "Press E to boat back to the vale",
        },
      });
      // East landing: the island boat. Gate stays Island.open() (millpond + mill spine done).
      addDeco("raft", 44.6 * TILE_SIZE, 16.3 * TILE_SIZE, {
        boat: {
          to: "island", spawn: { x: 12.5 * TILE_SIZE, y: 22.0 * TILE_SIZE }, dir: 2, gate: "islandOpen",
          label: "Board the island boat", lashed: "The island boat stays lashed.",
          lashedNote: "The island boat stays lashed.",
        },
      });
      Pickups.scatter(addDeco, get, rng, tw, th, "marsh", solidAt);
      spots.push({
        ...SPOTS.marsh,
        x: 0, y: 0, w: tw * TILE_SIZE, h: th * TILE_SIZE,
        cast: { x: 24 * TILE_SIZE, y: 15 * TILE_SIZE },
      });
      portals.push({
        x: 4.6 * TILE_SIZE, y: 15.2 * TILE_SIZE, w: 2.4 * TILE_SIZE, h: 1.8 * TILE_SIZE,
        to: "vale", spawn: { x: 59.2 * TILE_SIZE, y: 26.4 * TILE_SIZE }, dir: 1,
        hint: "Board the boat back to the vale",
      });
      return { x: 9.2 * TILE_SIZE, y: 16.6 * TILE_SIZE };
    });
  },
};

const Island = {
  unlocked() {
    const f = Save.data && Save.data.flags;
    return !!(f && f.fifthWater && typeof MillSpine !== "undefined" && MillSpine.atLeast("done"));
  },

  open() {
    return this.unlocked() && !!(Save.data.flags && Save.data.flags.islandOpen);
  },

  sync(silent) {
    if (!Save.data || !Save.data.flags) return;
    if (!Save.data.flags.fifthWater) {
      Save.data.flags.islandOpen = false;
      return;
    }
    if (typeof MillSpine === "undefined" || !MillSpine.atLeast("done")) return;
    if (Save.data.flags.islandOpen) return;
    Save.data.flags.islandOpen = true;
    if (silent) {
      Save.write();
      return;
    }
    this._announce();
    Save.mark();
  },

  onQuiet() {
    this.sync(false);
  },

  _announce() {
    UI.toastNote("A second boat is loose at the millpond.");
    const text = typeof ISLAND_OPEN_MAIL !== "undefined" ? ISLAND_OPEN_MAIL : "A second boat is loose at the millpond.";
    const mail = Save.data.cottage.mail || (Save.data.cottage.mail = []);
    if (mail.indexOf(text) < 0) {
      mail.unshift(text);
      const cap = typeof MillSpine !== "undefined" ? MillSpine.mailCap() : 5;
      Save.data.cottage.mail = mail.slice(0, cap);
    }
  },

  /* Windward Reach: open water on every side, one island, one pier, one boat home. */
  build() {
    const tw = 48, th = 36;
    return World._buildMap(tw, th, TILE.LAKE, ({ set, get, addSolid, addDeco, fillEllipse, paintPath, shoreAll, solidAt, spots, portals }) => {
      const rng = mulberry32(0x15A4D);
      // Land: a long body with a low south-west lobe and a windward point to the north-east.
      fillEllipse(27, 22, 15, 8, TILE.GRASS);
      fillEllipse(20, 26, 8, 5.5, TILE.GRASS);
      fillEllipse(36, 17, 7, 5, TILE.GRASS);
      // A tidal pool in the south meadow, so the island has a quiet corner.
      fillEllipse(31, 25.5, 2.4, 1.4, TILE.LAKE);
      shoreAll();

      // Pier from the west shore out to the boat.
      for (let x = 9; x <= 13; x++) { set(x, 21, TILE.DOCK); set(x, 22, TILE.DOCK); }

      // One path: pier root east through the island, a fork north to the point and south to the lobe.
      paintPath(13, 22, 27, 22);
      paintPath(27, 22, 36, 17);
      paintPath(24, 23, 20, 28);

      // Wind-bent pines on the north shore, a few on the lobe.
      const open = (tx, ty) => {
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          if (get(tx + ox, ty + oy) !== TILE.GRASS) return false;
        }
        return true;
      };
      for (let ty = 2; ty < th - 2; ty++) {
        for (let tx = 2; tx < tw - 2; tx++) {
          if (!open(tx, ty)) continue;
          const north = ty < 19;
          if (rng() > (north ? 0.16 : 0.06)) continue;
          const px = tx * TILE_SIZE + 8 + Utils.irand(rng, -3, 3);
          const py = ty * TILE_SIZE + 12 + Utils.irand(rng, -2, 2);
          addDeco(rng() < 0.7 ? "pine" : "oak", px, py, { seed: rng() * 20 });
          addSolid(px - 4, py - 3, 8, 5, "tree");
        }
      }
      // Rocks sit where the shore meets the swell.
      let rocks = 0, guard = 0;
      while (rocks < 12 && guard++ < 400) {
        const tx = Utils.irand(rng, 4, tw - 5), ty = Utils.irand(rng, 4, th - 5);
        if (get(tx, ty) !== TILE.SHORE || rng() < 0.5) continue;
        const px = tx * TILE_SIZE + 8, py = ty * TILE_SIZE + 10;
        addDeco("rock", px, py, { variant: rocks });
        addSolid(px - 5, py - 3, 10, 6, "rock");
        rocks++;
      }
      for (let i = 0; i < 5; i++) {
        const tx = 16 + Utils.irand(rng, 0, 20), ty = 24 + Utils.irand(rng, 0, 5);
        if (get(tx, ty) !== TILE.GRASS) continue;
        addDeco("stump", tx * TILE_SIZE + 8, ty * TILE_SIZE + 10);
        addSolid(tx * TILE_SIZE + 3, ty * TILE_SIZE + 7, 10, 5, "stump");
      }
      for (let i = 0; i < 14; i++) {
        const x = 14 + rng() * 26, y = 15 + rng() * 15;
        if (get(x | 0, y | 0) === TILE.GRASS) addDeco("flower", x * TILE_SIZE, y * TILE_SIZE, { variant: i });
      }
      for (let i = 0; i < 6; i++) {
        const x = 15 + rng() * 24, y = 18 + rng() * 12;
        if (get(x | 0, y | 0) === TILE.GRASS) addDeco("shrub", x * TILE_SIZE, y * TILE_SIZE);
      }
      for (let i = 0; i < 10; i++) {
        const x = 2 + rng() * 44, y = 2 + rng() * 32;
        if (WATER_TILES.has(get(x | 0, y | 0))) addDeco("mist", x * TILE_SIZE, y * TILE_SIZE, { seed: rng() * 6 });
      }

      // Pier root: water sign north of the path, cooler south of it, the boat at the pier end.
      addDeco("waterSign", 14.6 * TILE_SIZE, 20.5 * TILE_SIZE, { spot: "island" });
      addSolid(14.6 * TILE_SIZE - 3, 20.5 * TILE_SIZE - 3, 6, 4, "sign");
      addDeco("crate", 14.8 * TILE_SIZE, 24.4 * TILE_SIZE);
      addSolid(14.8 * TILE_SIZE - 5, 24.4 * TILE_SIZE - 4, 10, 6, "crate");
      addDeco("sign", 27.6 * TILE_SIZE, 20.6 * TILE_SIZE, { read: "Windward Reach. Salt berries in the grass. The swell leans on the line." });
      addSolid(27.6 * TILE_SIZE - 3, 20.6 * TILE_SIZE - 3, 6, 4, "sign");
      addDeco("raft", 8.3 * TILE_SIZE, 22.2 * TILE_SIZE, {
        boat: {
          to: "marsh", spawn: { x: 39.0 * TILE_SIZE, y: 16.6 * TILE_SIZE }, dir: 1,
          label: "Press E to boat back to the millpond",
        },
      });
      Pickups.scatter(addDeco, get, rng, tw, th, "island", solidAt);
      spots.push({
        ...SPOTS.island,
        x: 0, y: 0, w: tw * TILE_SIZE, h: th * TILE_SIZE,
      });
      return { x: 12.5 * TILE_SIZE, y: 22.0 * TILE_SIZE };
    });
  },
};

const Shop = {
  openFlag: false,
  stock: {},

  restock() {
    const day = Save.data.clock.day;
    if (Save.data.shop && Save.data.shop.day === day && Save.data.shop.stock) {
      this.stock = Save.data.shop.stock;
      return;
    }
    this.stock = Object.create(null);
    for (const it of SHOP_CATALOG) {
      if (it.kind === "bait" && it.rainOnly && TimeCycle.weatherId() !== "rain") continue;
      if (it.kind === "bait" || (it.kind === "item" && it.stock)) this.stock[it.id] = it.stock;
    }
    Save.data.shop = { day, stock: this.stock };
  },

  open() {
    if (!this.stock || !Object.keys(this.stock).length) this.restock();
    if (TimeCycle.weatherId() === "rain") {
      for (const it of SHOP_CATALOG) {
        if (it.kind === "bait" && it.rainOnly && this.stock[it.id] == null) this.stock[it.id] = it.stock;
      }
    }
    this.openFlag = true;
    const el = document.getElementById("shop");
    if (el) el.classList.remove("hidden");
    this.refresh();
  },

  close() {
    if (!this.openFlag) return;
    this.openFlag = false;
    const el = document.getElementById("shop");
    if (el) el.classList.add("hidden");
    Save.mark("sell");
  },

  refresh() {
    const el = document.getElementById("shop-body");
    if (!el) return;
    const buy = SHOP_CATALOG.map((it) => {
      if (it.minRank && Skills.rank() < it.minRank) return "";
      if (it.kind === "bait") {
        if (it.rainOnly && TimeCycle.weatherId() !== "rain") return "";
        return `<button type="button" data-buy="${it.kind}:${it.id}">${BAIT[it.id].name} — ${it.price}c (×${this.stock[it.id] | 0})</button>`;
      }
      if (it.kind === "rod") {
        const have = Inventory.ownsRod(it.id);
        const rod = RODS[it.id];
        const price = (rod && rod.cost) || it.price;
        const needFish = FISH.find((f) => f.id === (rod.requireFish || it.requireFish));
        const feel = rod.tension > 1.2 ? "tension" : "timing";
        return `<button type="button" data-buy="${it.kind}:${it.id}" ${have ? "disabled" : ""}>${rod.name} — ${price}c + a ${needFish ? needFish.name : it.requireFish}${have ? " (owned)" : ` · ${feel}`}</button>`;
      }
      if (it.kind === "item") {
        const have = it.id !== "campfireKit" && (Save.data.inventory.items[it.id] | 0) > 0;
        const stock = it.stock != null ? ` (×${this.stock[it.id] | 0})` : "";
        return `<button type="button" data-buy="${it.kind}:${it.id}" ${have ? "disabled" : ""}>${it.name} — ${it.price}c${it.requireBait ? " + crystal" : ""}${stock}</button>`;
      }
      if (it.kind === "kit" || it.kind === "decor") {
        if (!Cottage.decorOn()) return "";
        const owned = Cottage.hasCatalog(it);
        const broke = Inventory.coins() < it.price;
        return `<button type="button" data-buy="${it.kind}:${it.id}" ${owned || broke ? "disabled" : ""}>${it.name} — ${it.price}c${owned ? " (hung)" : ""}</button>`;
      }
      const have = Save.data.inventory.items.tank;
      const donate = FISH.find((f) => f.id === it.requireFish);
      return `<button type="button" data-buy="upgrade:tank" ${have ? "disabled" : ""}>${it.name} — donate a ${donate ? donate.name : it.requireFish}${have ? " (done)" : ""}</button>`;
    }).join("");
    const sellable = FISH.filter((f) => Save.countLoose(f.id) > 0);
    const sell = sellable.map((f) => {
      const n = Save.countLoose(f.id);
      const oldest = Save.oldestLoose(f.id);
      const price = oldest ? Save.sellPrice(oldest) : f.sell;
      const soft = oldest && Save.freshness(oldest) === "soft";
      return `<button type="button" data-sell="${f.id}">Sell ${f.name} (${price}c)${soft ? " (soft)" : ""} ×${n}</button>`;
    }).join("") || "<p>Nothing to sell.</p>";
    el.innerHTML = `<p>${Inventory.coins()} coins</p><div class="shop-cols"><div>${buy}</div><div>${sell}</div></div>`;
    el.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => this.buy(b.dataset.buy)));
    el.querySelectorAll("[data-sell]").forEach((b) => b.addEventListener("click", () => this.sell(b.dataset.sell)));
  },

  buy(token) {
    const [kind, id] = token.split(":");
    if (kind === "bait") {
      const it = SHOP_CATALOG.find((s) => s.id === id);
      if (!it || (this.stock[id] | 0) <= 0 || Inventory.coins() < it.price) return;
      if (it.rainOnly && TimeCycle.weatherId() !== "rain") return;
      Inventory.addCoins(-it.price);
      Inventory.addBait(id, 1);
      this.stock[id]--;
    } else if (kind === "rod") {
      const rod = RODS[id];
      if (!rod || Inventory.ownsRod(id)) return;
      const needFish = FISH.find((f) => f.id === rod.requireFish);
      if (Inventory.coins() < rod.cost) {
        UI.toastNote(`${rod.name} is ${rod.cost} coins.`);
        return;
      }
      if (Save.countLoose(rod.requireFish) < 1) {
        UI.toastNote(`Wren wants a ${needFish ? needFish.name : rod.requireFish} first.`);
        return;
      }
      Inventory.addCoins(-rod.cost);
      Save.takeOldestLoose(rod.requireFish);
      Save.syncCaught();
      Inventory.giveRod(id);
      try { AudioFX.coin(); } catch (err) { /* cue optional */ }
      UI.toastNote(`Bought ${rod.name}. Wren took the ${needFish ? needFish.name : rod.requireFish}.`);
    } else if (kind === "upgrade") {
      if (Save.data.inventory.items.tank) return;
      if (Save.countLoose("moonfin") < 1) {
        UI.toastNote("A moonfin is the price of a wider tank.");
        return;
      }
      Save.takeOldestLoose("moonfin");
      Save.syncCaught();
      Save.data.inventory.items.tank = 1;
      UI.toastNote("The aquarium has more room.");
    } else if (kind === "item") {
      const it = SHOP_CATALOG.find((s) => s.id === id);
      if (!it || Skills.rank() < (it.minRank || 0) || Inventory.coins() < it.price) return;
      if (it.stock != null && (this.stock[id] | 0) <= 0) return;
      if (id !== "campfireKit" && (Save.data.inventory.items[id] | 0) > 0) return;
      if (it.requireBait && Inventory.baitCount(it.requireBait) < 1) {
        UI.toastNote("Wren wants a crystal mote for the lamp.");
        return;
      }
      Inventory.addCoins(-it.price);
      if (it.requireBait) Inventory.addBait(it.requireBait, -1);
      Save.data.inventory.items[id] = (Save.data.inventory.items[id] | 0) + 1;
      if (it.stock != null) this.stock[id]--;
      UI.toastNote(`Bought ${it.name}.`);
    } else if (kind === "kit" || kind === "decor") {
      if (!Cottage.decorOn()) return;
      const it = SHOP_CATALOG.find((s) => s.id === id && s.kind === kind);
      if (!it || Skills.rank() < (it.minRank || 0) || Cottage.hasCatalog(it)) return;
      if (Inventory.coins() < it.price) return;
      Inventory.addCoins(-it.price);
      Cottage.grantCatalog(it);
      UI.toastNote("The cottage feels warmer.");
    }
    Save.mark("sell");
    this.refresh();
  },

  sell(id) {
    const unit = Save.takeOldestLoose(id);
    if (!unit) return;
    Inventory.addCoins(Save.sellPrice(unit));
    Save.syncCaught();
    try { AudioFX.coin(); } catch (err) { /* cue optional */ }
    Save.mark("sell");
    this.refresh();
  },
};

const Bench = {
  openFlag: false,

  open() {
    this.openFlag = true;
    UI.closeJournal();
    Inventory.close();
    Shop.close();
    Board.close();
    Mail.close();
    if (typeof Tank !== "undefined") Tank.close();
    if (typeof Cooler !== "undefined") Cooler.close();
    const el = document.getElementById("bench");
    if (el) el.classList.remove("hidden");
    this.refresh();
  },

  close() {
    if (!this.openFlag) return;
    this.openFlag = false;
    const el = document.getElementById("bench");
    if (el) el.classList.add("hidden");
    Save.mark();
  },

  refresh() {
    const el = document.getElementById("bench-body");
    if (!el) return;
    const baits = [
      { id: "berryblend", label: "Berry blend — berries + worm" },
      { id: "glowplus", label: "Bright glow — crystal + worm" },
    ].map((r) => `<button type="button" data-craft="${r.id}">${r.label}</button>`).join("");
    const meals = Object.keys(MEALS).map((id) => {
      const m = MEALS[id];
      const known = Save.data.flags.cooked[id];
      const name = known ? m.name : "???";
      const stock = Save.data.inventory.meals[id] | 0;
      const ok = Survival.canCook(id);
      const need = this._needLine(m.need);
      return `<button type="button" data-meal="${id}" ${ok ? "" : "disabled"}><strong>${name} ×${stock}</strong><span>${m.desc}</span><span>${need}${ok ? "" : " · need more"}</span></button>`;
    }).join("");
    el.innerHTML = `<p>Bait</p>${baits}<p>Meals</p>${meals}`;
    el.querySelectorAll("[data-craft]").forEach((b) => b.addEventListener("click", () => {
      if (Inventory.craft(b.dataset.craft)) {
        UI.toastNote("The packing bench smells like the vale.");
        Save.mark();
        this.refresh();
      } else {
        UI.toastNote("Need berries + worm, or crystal + worm.");
      }
    }));
    el.querySelectorAll("[data-meal]").forEach((b) => b.addEventListener("click", () => {
      if (Survival.cook(b.dataset.meal)) this.refresh();
    }));
  },

  _needLine(need) {
    return Object.keys(need).map((key) => {
      const n = need[key] | 0;
      if (key === "anyCommonFish") return `any common or stew ×${n}`;
      if (typeof BAIT !== "undefined" && BAIT[key]) return `${BAIT[key].name} ×${n}`;
      const f = FISH.find((x) => x.id === key);
      return `${f ? f.name : key} ×${n}`;
    }).join(", ");
  },
};
