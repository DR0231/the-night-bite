/* Hunger, warmth, rest. Not a downed state — an evening outside can go poorly. */

const Survival = {
  passing: false,
  needPrompt: "",

  p() { return Save.data.player; },

  clamp() {
    const p = this.p();
    p.hunger = Utils.clamp(p.hunger, 0, 100);
    p.warmth = Utils.clamp(p.warmth, 0, 100);
    p.rest = Utils.clamp(p.rest, 0, 100);
  },

  add(key, n) {
    const p = this.p();
    p[key] = (p[key] || 0) + n;
    this.clamp();
    this.refreshPips();
  },

  meal() {
    return MEALS[Save.data.inventory.mealId] || null;
  },

  atFire() {
    const f = Save.data.flags.campfire;
    if (!f || f.x == null) return false;
    if (World.id !== f.map) return false;
    return Utils.dist(Player.x, Player.y, f.x, f.y) < DESIGN.campfireRange;
  },

  barMult() {
    return this.p().hunger < DESIGN.hungerBarShrink ? 0.88 : 1;
  },

  lanternLit() {
    const inv = Save.data.inventory;
    return !!(inv.lanternOn && (inv.items.lantern | 0) && (inv.items.lanternFuel | 0) > 0);
  },

  nightHard() {
    if (World.indoor && World.indoor()) return false;
    if (World.id === "cottage") return false;
    if (TimeCycle.phaseId() !== "night") return false;
    return !this.lanternLit();
  },

  fillSleep() {
    const p = this.p();
    p.rest = 100;
    p.warmth = Utils.clamp((p.warmth || 0) + 10, 0, 100);
    const inv = Save.data.inventory;
    const dayNow = 1 + Math.floor(TimeCycle.seconds / CONFIG.DAY_LENGTH);
    if (inv.mealId && (inv.mealUntilDay | 0) < dayNow) {
      inv.mealId = "";
      inv.mealUntilDay = 0;
    }
    this.clamp();
    this.refreshPips();
  },

  tick(dt) {
    if (!Save.data || this.passing || Game.fading || Game.sleeping) return;
    if (typeof Admin !== "undefined" && Admin.god) return;
    const p = this.p();
    const weather = TimeCycle.weatherId();
    const phase = TimeCycle.phaseId();
    const cottage = World.id === "cottage";
    const cave = World.inCave();
    const outdoors = !cottage;
    const heat = weather === "heat";
    const frost = weather === "frost";
    const rain = weather === "rain";
    const night = phase === "night";
    const meal = this.meal();
    const has = (id) => Skills.has(id);

    // Tuned from the design rates so a calm ~2 min stroll barely dents,
    // while frost night at the lake actually bites toward danger.
    let hunger = 0.12 + (heat ? 0.07 : 0);
    p.hunger -= hunger * dt;

    let rest = cottage ? 0.02 : (Player.moving ? 0.09 : 0.04);
    const fishingHard = Fishing.active && (Fishing.state === "play" || Fishing.state === "reel" || Fishing.state === "bite");
    if (fishingHard) rest = 0.30;
    if (meal && meal.buff === "tea") rest *= 0.7;
    if (has("nightowl") && night) rest *= DESIGN.nightOwlRest;
    if (this.nightHard()) rest += 0.12;
    p.rest -= rest * dt;

    let warmth = 0.045;
    let weatherPart = 0;
    if (frost) weatherPart += 0.55;
    if (rain) weatherPart += 0.25;
    if (night && outdoors && !cave) weatherPart += 0.25;
    if (cave) weatherPart += 0.12;
    if (heat) warmth -= 0.15;
    if (cottage) warmth -= 0.4;
    if (this.atFire()) warmth -= 0.85;

    let wMul = 1;
    if ((Save.data.inventory.items.cloak | 0) > 0) wMul *= DESIGN.cloakWarmth;
    if (has("weathered") && (rain || frost)) wMul *= DESIGN.weatheredWarmth;
    if (meal && meal.buff === "warm") {
      wMul *= 0.55;
      if (cave || frost) wMul *= 0.85;
    }
    let extra = weatherPart * wMul;
    if (weatherPart > 0) extra = Math.max(extra, 0.4 * weatherPart);
    if (this.lanternLit() && night && outdoors && !cave) extra *= DESIGN.lanternWarmth;
    warmth += extra;
    p.warmth -= warmth * dt;

    if (this.lanternLit() && outdoors && night && !cave) {
      Save.data.inventory.items.lanternFuel = Math.max(0, Save.data.inventory.items.lanternFuel - DESIGN.lanternBurn * dt);
      if (Save.data.inventory.items.lanternFuel <= 0) Save.data.inventory.lanternOn = false;
    }

    this.clamp();
    this.refreshPips();

    this.needPrompt = "";
    if (p.warmth < DESIGN.needWarn) this.needPrompt = "You’re shivering. Cottage or tea.";
    else if (p.rest < DESIGN.needWarn) this.needPrompt = "You’re worn out.";
    else if (p.hunger < DESIGN.needWarn) this.needPrompt = "You’re hungry.";

    this._checkPassOut();
  },

  _checkPassOut() {
    if (this.passing || Game.fading) return;
    const p = this.p();
    if (World.id === "cottage") return;
    if ((Save.data.flags.passedOutDay | 0) === (Save.data.clock.day | 0)) return;
    const empty = p.warmth <= 0 || p.rest <= 0;
    if (!empty) return;
    const phase = TimeCycle.phaseId();
    const late = phase === "night" || phase === "golden";
    const hungryCollapse = p.hunger < DESIGN.passOutHunger;
    if (!late && !hungryCollapse) return;
    this.passOut();
  },

  passOut() {
    this.passing = true;
    Fishing.cancel();
    Save.data.flags.passedOutDay = Save.data.clock.day | 0;
    Game.warp({
      to: "cottage",
      spawn: { x: 6.4 * TILE_SIZE, y: 6.8 * TILE_SIZE },
      dir: 0,
      passOut: true,
    });
  },

  wakeHome() {
    if (TimeCycle.phaseId() !== "dawn") Weather.skipTo("dawn");
    TimeCycle.day = 1 + Math.floor(TimeCycle.seconds / CONFIG.DAY_LENGTH);
    Save.data.clock.day = TimeCycle.day;
    if (!Skills.has("softlanding")) {
      const id = Inventory.equipped();
      const n = Inventory.baitCount(id);
      if (n > 0) Inventory.addBait(id, -Math.max(1, Math.ceil(n * 0.2)));
    }
    const mail = Save.data.cottage.mail || (Save.data.cottage.mail = []);
    mail.unshift("Found you in the reeds. The kettle’s on. — Wren");
    Save.data.cottage.mail = mail.slice(0, 8);
    const p = this.p();
    p.hunger = 60;
    p.warmth = 60;
    p.rest = 60;
    Save.data.flags.passedOutDay = Save.data.clock.day | 0;
    UI.toastNote("You woke in the cottage.");
    Save.mark("passout");
    this.passing = false;
    this.refreshPips();
  },

  refreshPips() {
    this._paintNeedIcons();
    const p = this.p();
    this._row("need-hunger", p.hunger);
    this._row("need-warmth", p.warmth);
    this._row("need-rest", p.rest);
    this.refreshMealChip();
  },

  _paintNeedIcons() {
    if (this._iconsPainted) return;
    const map = [
      ["need-hunger", "hudHunger"],
      ["need-warmth", "hudWarmth"],
      ["need-rest", "hudRest"],
    ];
    let ok = true;
    for (const [id, fn] of map) {
      const c = document.querySelector("#" + id + " .need-icon");
      if (!c || !Sprites[fn]) { ok = false; continue; }
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 16, 16);
      Sprites[fn](ctx, 0, 0);
    }
    if (ok) this._iconsPainted = true;
  },

  refreshMealChip() {
    const el = document.getElementById("meal-chip");
    if (!el) return;
    const id = Save.data.inventory.mealId;
    const meal = MEALS[id];
    if (!id || !meal) {
      el.classList.add("hidden");
      el.textContent = "";
      return;
    }
    const name = (Save.data.flags.cooked && Save.data.flags.cooked[id]) ? meal.name : "???";
    el.textContent = `${name} until sleep`;
    el.classList.remove("hidden");
  },

  _row(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const pips = el.querySelector(".need-pips") || el;
    const n = Utils.clamp(Math.round(value / 20), 0, 5);
    const warn = value < 25;
    el.classList.toggle("warn", warn);
    let html = "";
    for (let i = 0; i < 5; i++) html += `<span class="${i < n ? "on" : ""}"></span>`;
    pips.innerHTML = html;
  },

  canCook(id) {
    const meal = MEALS[id];
    if (!meal) return false;
    return this._needOk(meal.need);
  },

  _needOk(need) {
    for (const key of Object.keys(need)) {
      const n = need[key] | 0;
      if (key === "anyCommonFish") {
        if (Save.countLooseCommon() + Save.stewCount() < n) return false;
      } else if (BAIT[key]) {
        if (Inventory.baitCount(key) < n) return false;
      } else if (Save.countLoose(key) < n) {
        return false;
      }
    }
    return true;
  },

  _commonWithCatch() {
    return FISH.find((f) => f.rarity === "Common" && Save.countLoose(f.id) > 0) || null;
  },

  _consumeNeed(need) {
    for (const key of Object.keys(need)) {
      const n = need[key] | 0;
      if (key === "anyCommonFish") {
        for (let i = 0; i < n; i++) {
          if (Save.takeOldestCommon()) continue;
          if (Save.stewCount() < 1) return false;
          Save.data.inventory.stew = Save.stewCount() - 1;
        }
      } else if (BAIT[key]) {
        Inventory.addBait(key, -n);
      } else {
        for (let i = 0; i < n; i++) {
          if (!Save.takeOldestLoose(key)) return false;
        }
      }
    }
    Save.syncCaught();
    return true;
  },

  cook(id) {
    const meal = MEALS[id];
    if (!meal || !this.canCook(id)) return false;
    if (!this._consumeNeed(meal.need)) return false;
    Save.data.inventory.meals[id] = (Save.data.inventory.meals[id] | 0) + 1;
    Save.data.flags.cooked[id] = true;
    UI.toastNote(`Cooked ${meal.name}.`);
    Save.mark();
    return true;
  },

  eatMeal(id) {
    const meal = MEALS[id];
    if (!meal || (Save.data.inventory.meals[id] | 0) < 1) return false;
    const prevId = Save.data.inventory.mealId;
    const prev = prevId && prevId !== id ? MEALS[prevId] : null;
    Save.data.inventory.meals[id] -= 1;
    const cook = Skills.has("campcook");
    const mul = cook ? DESIGN.campcookRestore : 1;
    this.add("hunger", meal.hunger * mul);
    this.add("warmth", meal.warmth * mul);
    this.add("rest", meal.rest * mul);
    Save.data.inventory.mealId = id;
    Save.data.inventory.mealUntilDay = (Save.data.clock.day | 0) + (cook ? 1 : 0);
    if (prev) UI.toastNote(`${meal.name} replaces ${prev.name}.`);
    else UI.toastNote(`Ate ${meal.name}.`);
    this.refreshPips();
    Save.mark();
    if (Inventory.open) Inventory.refresh();
    return true;
  },

  eatBerries() {
    if (Inventory.baitCount("berries") < 1) return false;
    Inventory.addBait("berries", -1);
    this.add("hunger", DESIGN.berryHunger);
    UI.toastNote("A handful of vale berries.");
    Save.mark();
    if (Inventory.open) Inventory.refresh();
    return true;
  },

  fillLantern() {
    const inv = Save.data.inventory;
    if (!(inv.items.lantern | 0)) return false;
    if (Inventory.baitCount("glow") > 0) {
      Inventory.addBait("glow", -1);
      inv.items.lanternFuel = (inv.items.lanternFuel || 0) + DESIGN.lanternFuel;
    } else if (Inventory.baitCount("crystal") > 0) {
      Inventory.addBait("crystal", -1);
      inv.items.lanternFuel = (inv.items.lanternFuel || 0) + DESIGN.lanternFuel;
    } else {
      return false;
    }
    UI.toastNote("The lantern takes the light.");
    Save.mark();
    if (Inventory.open) Inventory.refresh();
    return true;
  },

  toggleLantern() {
    const inv = Save.data.inventory;
    if (!(inv.items.lantern | 0)) return;
    if (!inv.lanternOn && (inv.items.lanternFuel | 0) <= 0) {
      UI.toastNote("The lantern needs fuel.");
      return;
    }
    inv.lanternOn = !inv.lanternOn;
    if (Inventory.open) Inventory.refresh();
  },

  plantFire() {
    if (World.id !== "vale") return false;
    if ((Save.data.inventory.items.campfireKit | 0) < 1) return false;
    if (World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE)) return false;
    const t = World.tileAt(Player.x, Player.y);
    if (t !== TILE.GRASS && t !== TILE.DIRT && t !== TILE.SHORE) return false;
    if (this.atFire()) return false;
    Save.data.inventory.items.campfireKit -= 1;
    Save.data.flags.campfire = {
      x: Player.x,
      y: Player.y,
      map: "vale",
      untilDay: Save.data.clock.day | 0,
    };
    UI.toastNote("A small fire takes.");
    Save.mark();
    return true;
  },

  canPlantFire() {
    if (World.id !== "vale") return false;
    if ((Save.data.inventory.items.campfireKit | 0) < 1) return false;
    if (World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE)) return false;
    const t = World.tileAt(Player.x, Player.y);
    return t === TILE.GRASS || t === TILE.DIRT || t === TILE.SHORE;
  },

  clearFireIfDawn() {
    const f = Save.data.flags.campfire;
    if (!f || f.x == null) return;
    if ((f.untilDay | 0) < (Save.data.clock.day | 0)) Save.data.flags.campfire = false;
  },
};
