/* Hidden testing menu. F8 or ` — not part of the guest loop. */

const Admin = {
  open: false,
  god: false,
  _bound: false,

  typing() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
  },

  bind() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (e.code === "F8" || (e.code === "Backquote" && !this.typing())) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
    }, true);
    const root = document.getElementById("admin");
    if (!root) return;
    root.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-admin-tab]");
      if (tab) {
        e.preventDefault();
        if (typeof AdminGuide !== "undefined") AdminGuide.setTab(tab.getAttribute("data-admin-tab"));
        return;
      }
      const btn = e.target.closest("[data-admin]");
      if (!btn) return;
      e.preventDefault();
      this.run(btn.getAttribute("data-admin"), btn.getAttribute("data-arg"));
    });
    this.mountCheats();
    const form = document.getElementById("admin-cmd-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("admin-cmd");
        if (!input) return;
        const line = (input.value || "").trim();
        if (line) this.command(line);
        input.value = "";
      });
    }
  },

  toggle() {
    if (this.open) this.close();
    else this.show();
  },

  show() {
    UI.closeAll();
    this.open = true;
    const el = document.getElementById("admin");
    if (el) el.classList.remove("hidden");
    this.refresh();
    if (typeof AdminGuide !== "undefined") AdminGuide.setTab(AdminGuide.tab || "cheats");
    const input = document.getElementById("admin-cmd");
    if (input && (!AdminGuide || AdminGuide.tab === "cheats")) input.focus();
  },

  close() {
    if (!this.open) return;
    this.open = false;
    const el = document.getElementById("admin");
    if (el) el.classList.add("hidden");
    const canvas = document.getElementById("game");
    if (canvas) canvas.focus({ preventScroll: true });
  },

  note(text) {
    const log = document.getElementById("admin-log");
    if (log) log.textContent = text;
    if (typeof UI !== "undefined" && UI.toastNote) UI.toastNote(text);
  },

  btn(act, arg, label) {
    const a = arg != null ? ` data-arg="${arg}"` : "";
    return `<button type="button" data-admin="${act}"${a}>${label}</button>`;
  },

  mountCheats() {
    const give = document.getElementById("admin-give");
    if (give) {
      const baitBtns = Object.keys(BAIT).map((id) => this.btn("givebait", id, "+20 " + BAIT[id].name)).join("");
      const fishOpts = FISH.map((f) => `<option value="${f.id}">${f.name}</option>`).join("");
      give.innerHTML = `<h3>Give</h3>
        ${this.btn("bait", null, "+30 all bait")}
        ${baitBtns}
        ${this.btn("coins", null, "+200 coins")}
        ${this.btn("gear", null, "All rods + cloak, lantern, tank")}
        ${this.btn("meals", null, "All meals ×3")}
        ${this.btn("catch", null, "Land selected fish")}
        <select id="admin-fish">${fishOpts}</select>`;
    }
    const player = document.getElementById("admin-player");
    if (player) {
      player.innerHTML = `<h3>Player</h3>
        ${this.btn("god", null, "Toggle god (needs + bait)")}
        ${this.btn("needs", null, "Fill hunger / warmth / rest")}
        ${this.btn("rank", "8", "Max rank + all perks")}
        ${this.btn("hearts", null, "Max NPC hearts")}
        ${this.btn("journal", null, "Land every fish")}
        ${this.btn("unlock", null, "Unlock everything")}`;
      const godBtn = player.querySelector('[data-admin="god"]');
      if (godBtn) godBtn.id = "admin-god";
    }
    const world = document.getElementById("admin-world");
    if (world) {
      const tps = DESIGN.warps.filter((w) => !["bramble", "lark"].includes(w.id))
        .map((w) => this.btn("tp", w.id, w.label)).join("");
      world.innerHTML = `<h3>World</h3>${tps}${this.btn("millpond", null, "Unlock millpond raft")}`;
    }
    const time = document.getElementById("admin-time");
    if (time) {
      const phases = DESIGN.phases.map((p) => this.btn("time", p.id, p.label)).join("");
      const wx = Object.keys(WEATHERS).map((id) => this.btn("weather", id, WEATHERS[id].name)).join("");
      const seasons = SEASONS.map((id) => this.btn("season", id, id[0].toUpperCase() + id.slice(1))).join("");
      time.innerHTML = `<h3>Time</h3>${phases}${this.btn("day", null, "+1 day")}${wx}${seasons}`;
    }
  },

  refresh() {
    const d = Save.data;
    if (!d) return;
    const god = document.getElementById("admin-god");
    if (god) god.classList.toggle("is-on", this.god);
    const status = document.getElementById("admin-status");
    if (status) {
      status.textContent = [
        World.id,
        TimeCycle.clockLabel(),
        TimeCycle.season(),
        TimeCycle.weatherId(),
        Skills.line(),
        Inventory.coins() + "c",
        this.god ? "GOD" : "",
      ].filter(Boolean).join(" · ");
    }
    const bait = document.getElementById("admin-bait");
    if (bait) {
      bait.textContent = Object.keys(BAIT).map((id) => `${BAIT[id].name} ×${Inventory.baitCount(id)}`).join(" · ");
    }
  },

  after() {
    Survival.clamp();
    Survival.refreshPips();
    if (Inventory.open) Inventory.refresh();
    UI.refreshJournal();
    Save.mark();
    this.refresh();
    if (typeof AdminGuide !== "undefined" && AdminGuide.tab === "check") AdminGuide.refresh();
  },

  run(act, arg) {
    if (!Save.data) return;
    const fn = this._acts[act];
    if (!fn) return;
    fn.call(this, arg);
    this.after();
  },

  go(map, x, y, dir) {
    if (typeof Fishing !== "undefined") Fishing.cancel();
    if (map && World.maps[map]) World.use(map);
    Player.x = x;
    Player.y = y;
    if (dir != null) Player.dir = dir;
    Player.vx = 0;
    Player.vy = 0;
    Camera.x = Player.x - CONFIG.VIEW_W * 0.5;
    Camera.y = Player.y - CONFIG.VIEW_H * 0.58;
    Camera.clampToWorld(World.pw, World.ph);
  },

  setHour(h) {
    const dayLen = CONFIG.DAY_LENGTH;
    const dayBase = Math.floor(TimeCycle.seconds / dayLen) * dayLen;
    TimeCycle.seconds = dayBase + (h / 24) * dayLen;
    Save.data.clock.seconds = TimeCycle.seconds;
  },

  landFish(id) {
    const fish = FISH.find((f) => f.id === id);
    if (!fish) {
      this.note("Unknown fish.");
      return;
    }
    const lo = fish.size[0], hi = fish.size[1];
    const inches = Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;
    const rec = Journal.recordLand(fish, inches);
    Skills.awardFromLand(fish, rec, false);
    Npcs.rememberCatch(fish);
    UI.showCatch(fish, rec);
    this.note("Landed " + fish.name + " (" + inches + "\").");
  },

  command(line) {
    const parts = line.toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const a = parts[1] || "";
    const n = parts[2] != null ? parseInt(parts[2], 10) : NaN;
    if (cmd === "help") {
      this.note("give <bait|coins> [n] · tp " + DESIGN.warps.map((w) => w.id).join("|")
        + " · time " + DESIGN.phases.map((p) => p.id).join("|")
        + " · weather " + Object.keys(WEATHERS).join("|")
        + " · season " + SEASONS.join("|")
        + " · catch <fish> · god · needs · unlock · rank 1-8");
      return;
    }
    if (cmd === "give") {
      const amt = isNaN(n) ? 20 : n;
      if (BAIT[a]) {
        Inventory.addBait(a, amt);
        this.note("+" + amt + " " + BAIT[a].name);
      } else if (a === "coins" || a === "coin") {
        Inventory.addCoins(isNaN(n) ? 100 : n);
        this.note("Coins now " + Inventory.coins());
      } else this.note("give worms|crickets|glow|berries|crystal|berryblend|glowplus|coins [n]");
      this.after();
      return;
    }
    if (cmd === "tp") {
      this.run("tp", a);
      return;
    }
    if (cmd === "time") {
      this.run("time", a);
      return;
    }
    if (cmd === "weather") {
      this.run("weather", a);
      return;
    }
    if (cmd === "season") {
      this.run("season", a);
      return;
    }
    if (cmd === "catch") {
      this.landFish(a);
      this.after();
      return;
    }
    if (cmd === "god") {
      this.run("god");
      return;
    }
    if (cmd === "needs") {
      this.run("needs");
      return;
    }
    if (cmd === "unlock") {
      this.run("unlock");
      return;
    }
    if (cmd === "rank") {
      this.run("rank", a);
      return;
    }
    this.note("Unknown command. Type help.");
  },

  _acts: {
    god() {
      this.god = !this.god;
      this.note(this.god ? "God on — needs freeze, bait does not consume." : "God off.");
    },
    needs() {
      const p = Save.data.player;
      p.hunger = 100;
      p.warmth = 100;
      p.rest = 100;
      this.note("Needs filled.");
    },
    coins() {
      Inventory.addCoins(200);
      this.note("Coins now " + Inventory.coins());
    },
    bait() {
      for (const id of Object.keys(BAIT)) Inventory.addBait(id, 30);
      Inventory.equip("worms");
      this.note("All bait +30.");
    },
    gear() {
      for (const id of Object.keys(RODS)) Inventory.giveRod(id);
      const it = Save.data.inventory.items;
      it.tank = 1;
      it.cloak = 1;
      it.lantern = 1;
      it.lanternFuel = 12;
      it.campfireKit = Math.max(it.campfireKit | 0, 2);
      Save.data.inventory.lanternOn = true;
      Save.data.flags.gotCampKit = true;
      this.note("Rods, cloak, lantern, tank, camp kits.");
    },
    meals() {
      for (const id of Object.keys(MEALS)) {
        Save.data.inventory.meals[id] = (Save.data.inventory.meals[id] | 0) + 3;
        Save.data.flags.cooked[id] = true;
      }
      this.note("Cookbook filled · 3 of each meal.");
    },
    unlock() {
      Save.data.flags.fifthWater = true;
      Save.data.flags.introComplete = true;
      Save.data.cottage.visited = true;
      Save.data.cottage.weeds = 0;
      for (const f of FISH) {
        const e = Journal.ensure(f.id);
        if (!e.landed) {
          e.landed = 1;
          e.hooked = 1;
          e.biggest = e.biggest || f.size[1];
          e.firstAt = e.firstAt || Date.now();
          Save.pushLoose(f.id);
        }
        Journal._mastery(f.spot);
      }
      Save.data.skills.rank = 8;
      Save.data.skills.xp = 0;
      Save.data.skills.perks = Object.keys(PERKS);
      for (const n of NPC_DATA) {
        const s = Save.data.npcs[n.id] || (Save.data.npcs[n.id] = { hearts: 0 });
        s.hearts = DESIGN.npcHeartCap;
      }
      this._acts.gear.call(this);
      this._acts.meals.call(this);
      this._acts.bait.call(this);
      this.note("Everything unlocked.");
    },
    journal() {
      for (const f of FISH) {
        const e = Journal.ensure(f.id);
        e.landed = Math.max(e.landed | 0, 1);
        e.hooked = Math.max(e.hooked | 0, 1);
        e.biggest = e.biggest || f.size[1];
        if (Save.countLoose(f.id) + Save.countCooler(f.id) < 1) Save.pushLoose(f.id);
        Journal._mastery(f.spot);
      }
      this.note("All fish landed in the journal.");
    },
    hearts() {
      for (const n of NPC_DATA) {
        const s = Save.data.npcs[n.id] || (Save.data.npcs[n.id] = { hearts: 0 });
        s.hearts = DESIGN.npcHeartCap;
      }
      this.note("NPC hearts maxed.");
    },
    millpond() {
      Save.data.flags.fifthWater = true;
      this.note("Millpond raft unlocked.");
    },
    rank(arg) {
      let r = parseInt(arg, 10);
      if (!r) r = 8;
      r = Utils.clamp(r, 1, 8);
      Save.data.skills.rank = r;
      Save.data.skills.xp = 0;
      if (r >= 8) Save.data.skills.perks = Object.keys(PERKS);
      this.note("Rank " + r + ".");
    },
    perks() {
      Save.data.skills.perks = Object.keys(PERKS);
      if (Save.data.skills.rank < 2) Save.data.skills.rank = 2;
      this.note("All perks.");
    },
    time(arg) {
      const ph = DESIGN.phases.find((p) => p.id === arg || (arg === "dusk" && p.id === "golden"));
      if (!ph) {
        this.note("time " + DESIGN.phases.map((p) => p.id).join("|"));
        return;
      }
      this.setHour(ph.hour);
      this.note("Time → " + TimeCycle.clockLabel());
    },
    weather(arg) {
      if (!WEATHERS[arg]) {
        this.note("weather clear|rain|mist|heat|frost");
        return;
      }
      Save.data.clock.weather = arg;
      Save.data.clock.weatherUntil = TimeCycle.hour + 10;
      this.note("Weather → " + WEATHERS[arg].name);
    },
    season(arg) {
      if (SEASONS.indexOf(arg) < 0) {
        this.note("season spring|summer|autumn|winter");
        return;
      }
      Save.data.clock.season = arg;
      this.note("Season → " + arg);
    },
    day() {
      TimeCycle.seconds += CONFIG.DAY_LENGTH;
      Save.data.clock.seconds = TimeCycle.seconds;
      this.note("Advanced one day.");
    },
    tp(arg) {
      const w = DESIGN.warps.find((x) => x.id === arg);
      if (!w) {
        this.note("tp " + DESIGN.warps.map((x) => x.id).join("|"));
        return;
      }
      if (w.fifthWater) Save.data.flags.fifthWater = true;
      this.go(w.map, w.x * TILE_SIZE, w.y * TILE_SIZE, w.dir);
      this.note("Warped to " + w.label + ".");
    },
    givebait(arg) {
      if (!BAIT[arg]) {
        this.note("Unknown bait.");
        return;
      }
      Inventory.addBait(arg, 20);
      this.note("+20 " + BAIT[arg].name);
    },
    catch(arg) {
      if (arg) {
        this.landFish(arg);
        return;
      }
      const sel = document.getElementById("admin-fish");
      this.landFish(sel && sel.value);
    },
    cancel() {
      Fishing.cancel();
      this.note("Rod packed.");
    },
    save() {
      Save.write();
      this.note("Saved.");
    },
  },
};

try { Admin.bind(); } catch (err) { /* optional */ }
