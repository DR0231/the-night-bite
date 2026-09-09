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
      addDeco("bench", 5.5 * TILE_SIZE, 11 * TILE_SIZE);
      addSolid(4.6 * TILE_SIZE, 10.2 * TILE_SIZE, 22, 10, "bench");
      addDeco("calendar", 16.5 * TILE_SIZE, 11 * TILE_SIZE);
      addDeco("mailtray", 12.5 * TILE_SIZE, 11.2 * TILE_SIZE);
      addDeco("crate", 18.2 * TILE_SIZE, 12.4 * TILE_SIZE);
      addSolid(18.2 * TILE_SIZE - 5, 12.4 * TILE_SIZE - 4, 10, 6, "crate");
      portals.push({
        x: 9 * TILE_SIZE, y: 14.2 * TILE_SIZE, w: 4 * TILE_SIZE, h: 1.6 * TILE_SIZE,
        to: "vale", spawn: { x: 27.5 * TILE_SIZE, y: 24.2 * TILE_SIZE }, dir: 0,
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
      bench: { x: 5.5 * TILE_SIZE, y: 11 * TILE_SIZE, r: 20 },
      calendar: { x: 16.5 * TILE_SIZE, y: 11 * TILE_SIZE, r: 20 },
      mailtray: { x: 12.5 * TILE_SIZE, y: 11.2 * TILE_SIZE, r: 18 },
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
    if (this.near("bed")) return "Press E to sleep until dusk or dawn";
    if (this.near("bench")) return "Press E to use the packing bench";
    if (this.near("calendar")) return "Press E to read the forecast board";
    if (this.near("mailtray")) return "Press E to check the mail tray";
    if (this.near("tank")) {
      const aq = Save.data.cottage.aquarium || [];
      if (aq.length || this.tuckable()) return "Press E to manage the tank";
    }
    if (this.near("certificate")) return "Press E to read your fisher certificate";
    if (this.near("trophy")) return "Press E to mount a personal best · " + Skills.line();
    return "";
  },

  try() {
    if (World.id !== "cottage") return false;
    Save.data.cottage.visited = true;
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
    if (this.near("calendar")) { Quests.open = false; Board.toggle(); return true; }
    if (this.near("mailtray")) { Mail.toggle(); return true; }
    if (this.near("tank")) { this._tank(); return true; }
    if (this.near("certificate")) {
      UI.toastNote(Skills.line());
      return true;
    }
    if (this.near("trophy")) { this._trophy(); return true; }
    return false;
  },

  tankCap() {
    return Save.data.inventory.items.tank ? CONFIG.AQUARIUM_N_UP : CONFIG.AQUARIUM_N;
  },

  tuckable() {
    const aq = Save.data.cottage.aquarium || [];
    return FISH.find((f) => (Journal.caughtOf(f.id) | 0) > 0 && aq.indexOf(f.id) < 0) || null;
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
    const e = Save.ensureFish(extra.id);
    if (e.caught < 1) return false;
    e.caught -= 1;
    aq.push(extra.id);
    UI.toastNote(`${extra.name} now lives in the tank.`);
    Save.mark();
    return true;
  },

  _takeOut(index) {
    const aq = Save.data.cottage.aquarium;
    const id = aq[index];
    if (!id) return false;
    aq.splice(index, 1);
    Save.ensureFish(id).caught = (Save.ensureFish(id).caught | 0) + 1;
    const f = FISH.find((x) => x.id === id);
    UI.toastNote(`${f ? f.name : id} is back in your pack.`);
    Save.mark();
    return true;
  },

  _trophy() {
    const best = FISH.filter((f) => Save.ensureFish(f.id).biggest > 0)
      .sort((a, b) => Save.ensureFish(b.id).biggest - Save.ensureFish(a.id).biggest)[0];
    if (!best) { UI.toastNote("Land something first."); return; }
    const wall = Save.data.cottage.trophies;
    if (wall.indexOf(best.id) < 0) wall.push(best.id);
    UI.toastNote(`${best.name} is on the wall.`);
    Save.mark();
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

const Marsh = {
  build() {
    const tw = 32, th = 24;
    return World._buildMap(tw, th, TILE.GRASS, ({ set, get, addSolid, addDeco, fillEllipse, spots, portals }) => {
      const rng = mulberry32(0xA15A);
      fillEllipse(18, 13, 11, 8, TILE.MARSH);
      fillEllipse(22, 11, 4, 3, TILE.GRASS);
      for (let x = 4; x <= 10; x++) set(x, 12, TILE.DOCK);
      for (let y = 1; y < 23; y++) {
        for (let x = 1; x < 31; x++) {
          if (get(x, y) === TILE.GRASS) {
            let w = false;
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
              if (WATER_TILES.has(get(x + ox, y + oy))) w = true;
            }
            if (w) set(x, y, TILE.SHORE);
          }
        }
      }
      for (let i = 0; i < 16; i++) addDeco("reed", (8 + rng() * 18) * TILE_SIZE, (8 + rng() * 12) * TILE_SIZE);
      for (let i = 0; i < 8; i++) addDeco("mist", (10 + rng() * 14) * TILE_SIZE, (9 + rng() * 10) * TILE_SIZE, { seed: rng() * 6 });
      addDeco("crate", 6.2 * TILE_SIZE, 11.6 * TILE_SIZE);
      addSolid(6.2 * TILE_SIZE - 5, 11.6 * TILE_SIZE - 4, 10, 6, "crate");
      spots.push({
        ...SPOTS.marsh,
        x: 6 * TILE_SIZE, y: 6 * TILE_SIZE, w: 22 * TILE_SIZE, h: 14 * TILE_SIZE,
        cast: { x: 16 * TILE_SIZE, y: 13 * TILE_SIZE },
      });
      portals.push({
        x: 3 * TILE_SIZE, y: 11 * TILE_SIZE, w: 3 * TILE_SIZE, h: 3 * TILE_SIZE,
        to: "vale", spawn: { x: 57.2 * TILE_SIZE, y: 24.4 * TILE_SIZE }, dir: 1,
        hint: "Walk the raft back to the vale",
      });
      return { x: 8 * TILE_SIZE, y: 12 * TILE_SIZE };
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
      if (it.kind === "bait" || (it.kind === "item" && it.stock)) this.stock[it.id] = it.stock;
    }
    Save.data.shop = { day, stock: this.stock };
  },

  open() {
    if (!this.stock || !Object.keys(this.stock).length) this.restock();
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
        return `<button type="button" data-buy="${it.kind}:${it.id}">${BAIT[it.id].name} — ${it.price}c (×${this.stock[it.id] | 0})</button>`;
      }
      if (it.kind === "rod") {
        const have = Inventory.ownsRod(it.id);
        return `<button type="button" data-buy="${it.kind}:${it.id}" ${have ? "disabled" : ""}>${RODS[it.id].name} — ${it.price}c + ${it.requireFish}</button>`;
      }
      if (it.kind === "item") {
        const have = it.id !== "campfireKit" && (Save.data.inventory.items[it.id] | 0) > 0;
        const stock = it.stock != null ? ` (×${this.stock[it.id] | 0})` : "";
        return `<button type="button" data-buy="${it.kind}:${it.id}" ${have ? "disabled" : ""}>${it.name} — ${it.price}c${it.requireBait ? " + crystal" : ""}${stock}</button>`;
      }
      const have = Save.data.inventory.items.tank;
      return `<button type="button" data-buy="upgrade:tank" ${have ? "disabled" : ""}>${it.name} — donate a ${it.requireFish}</button>`;
    }).join("");
    const sellable = FISH.filter((f) => Journal.caughtOf(f.id) > 0);
    const sell = sellable.map((f) =>
      `<button type="button" data-sell="${f.id}">Sell ${f.name} (${f.sell}c) ×${Journal.caughtOf(f.id)}</button>`
    ).join("") || "<p>Nothing to sell.</p>";
    el.innerHTML = `<p>${Inventory.coins()} coins</p><div class="shop-cols"><div>${buy}</div><div>${sell}</div></div>`;
    el.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => this.buy(b.dataset.buy)));
    el.querySelectorAll("[data-sell]").forEach((b) => b.addEventListener("click", () => this.sell(b.dataset.sell)));
  },

  buy(token) {
    const [kind, id] = token.split(":");
    if (kind === "bait") {
      const it = SHOP_CATALOG.find((s) => s.id === id);
      if (!it || (this.stock[id] | 0) <= 0 || Inventory.coins() < it.price) return;
      Inventory.addCoins(-it.price);
      Inventory.addBait(id, 1);
      this.stock[id]--;
    } else if (kind === "rod") {
      const rod = RODS[id];
      if (Inventory.ownsRod(id) || Inventory.coins() < rod.cost) return;
      if ((Journal.caughtOf(rod.requireFish) | 0) < 1) {
        UI.toastNote(`Wren wants a ${rod.requireFish} first.`);
        return;
      }
      Inventory.addCoins(-rod.cost);
      Inventory.giveRod(id);
    } else if (kind === "upgrade") {
      if (Save.data.inventory.items.tank) return;
      if ((Journal.caughtOf("moonfin") | 0) < 1) {
        UI.toastNote("A moonfin is the price of a wider tank.");
        return;
      }
      const e = Save.ensureFish("moonfin");
      e.caught = Math.max(0, e.caught - 1);
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
    }
    Save.mark("sell");
    this.refresh();
  },

  sell(id) {
    if ((Journal.caughtOf(id) | 0) < 1) return;
    const f = FISH.find((x) => x.id === id);
    const e = Save.ensureFish(id);
    e.caught -= 1;
    Inventory.addCoins(f.sell || 6);
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
      const ok = Survival.canCook(id);
      return `<button type="button" data-meal="${id}" ${ok ? "" : "disabled"}>${name} — ${m.desc}${ok ? "" : " (need more)"}</button>`;
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
};
