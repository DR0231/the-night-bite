/* Fishing: cast, visible line + bobber, two bite feels, hook window, catch. */

const Fishing = {
  state: "idle",
  t: 0,
  wait: 0,
  nibblesLeft: 0,
  spot: null,
  water: null,
  fish: null,
  bobber: { x: 0, y: 0, homeX: 0, homeY: 0, dunk: 0 },
  from: { x: 0, y: 0 },
  rodPhase: 0,
  sag: 6,
  biteFlash: 0,

  get active() { return this.state !== "idle"; },

  cancel() {
    this.state = "idle";
    Player.fishing = false;
    Player.locked = false;
  },

  tryStart() {
    if (this.active) return false;
    const water = World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE);
    if (!water) return false;
    if (World.isWaterAt(Player.x, Player.y)) return false;

    const spot = World.spotAt(Player.x, Player.y) || this._spotFromTile(water.tile);
    const target = this._castTarget(Player.x, Player.y, water, spot);
    Player.faceToward(target.x, target.y);
    Player.fishing = true;
    Player.locked = true;

    const dist = CONFIG.CAST_DIST * ((typeof Inventory !== "undefined" && Inventory.rod().reach) || 1);
    const dx = target.x - Player.x;
    const dy = target.y - Player.y;
    const len = Math.hypot(dx, dy) || 1;
    let tx = Player.x + (dx / len) * dist;
    let ty = Player.y + (dy / len) * dist;
    if (!World.isWaterAt(tx, ty)) {
      tx = target.x;
      ty = target.y;
    }

    this.spot = spot;
    this.water = water;
    this.from = { x: Player.x, y: Player.y };
    this.bobber.homeX = tx;
    this.bobber.homeY = ty;
    this.bobber.x = Player.x;
    this.bobber.y = Player.y - 10;
    this.bobber.dunk = 0;
    this.state = "cast";
    this.t = 0;
    this.fish = null;
    this.rodPhase = 0;
    AudioFX.plop();
    return true;
  },

  _castTarget(px, py, nearest, spot) {
    if (spot && spot.cast && World.isWaterAt(spot.cast.x, spot.cast.y)) {
      return { x: spot.cast.x, y: spot.cast.y };
    }
    let best = nearest, bestScore = -999;
    const r = 48;
    const t0x = Math.floor((px - r) / TILE_SIZE);
    const t0y = Math.floor((py - r) / TILE_SIZE);
    const t1x = Math.floor((px + r) / TILE_SIZE);
    const t1y = Math.floor((py + r) / TILE_SIZE);
    for (let ty = t0y; ty <= t1y; ty++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        if (!WATER_TILES.has(World.get(tx, ty))) continue;
        const cx = tx * TILE_SIZE + 8;
        const cy = ty * TILE_SIZE + 8;
        const d = Utils.dist(px, py, cx, cy);
        if (d < 12 || d > r) continue;
        let open = 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          if (WATER_TILES.has(World.get(tx + ox, ty + oy))) open++;
        }
        const score = open * 4 - Math.abs(d - CONFIG.CAST_DIST);
        if (score > bestScore) { bestScore = score; best = { x: cx, y: cy }; }
      }
    }
    return best || nearest;
  },

  _spotFromTile(tile) {
    if (tile === TILE.POND) return SPOTS.pond;
    if (tile === TILE.RIVER) return SPOTS.river;
    if (tile === TILE.LAKE) return SPOTS.lake;
    if (tile === TILE.MARSH) return SPOTS.marsh;
    return SPOTS.cave;
  },

  _feel() {
    return FISHING_FEEL[this.spot.mood] || FISHING_FEEL.still;
  },

  _pickFish() {
    const phase = TimeCycle.phaseId();
    const weather = TimeCycle.weatherId();
    const season = TimeCycle.season();
    const hotspot = TimeCycle.hotspot() === this.spot.id ? 1.35 : 1;
    const baitM = Inventory.biteMult(this.spot.id);
    const pool = [];
    const weights = [];
    for (const f of FISH) {
      if (f.spot !== this.spot.id) continue;
      if (f.nightOnly && phase !== "night") continue;
      if (f.rainOnly && weather !== "rain") continue;
      if (f.season && f.season !== season) continue;
      let w = f.rarity === "Rare" ? 1 : f.rarity === "Uncommon" ? 3 : 6;
      const bw = (f.bite && f.bite[phase]) != null ? f.bite[phase] : 1;
      w *= bw * (WEATHERS[weather] ? WEATHERS[weather].bite : 1) * hotspot * baitM;
      if (w <= 0.01) continue;
      pool.push(f);
      weights.push(w);
    }
    if (!pool.length) {
      return FISH.find((f) => f.spot === this.spot.id) || FISH[0];
    }
    let total = 0;
    for (const w of weights) total += w;
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  },

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    this.rodPhase += dt * 2.4;
    this.biteFlash = Math.max(0, this.biteFlash - dt);

    const feel = this._feel();
    const b = this.bobber;

    if (this.state === "cast") {
      if (this.t < 0.14) {
        this.sag = 1;
        return;
      }
      const u = Utils.clamp((this.t - 0.14) / 0.34, 0, 1);
      const ease = 1 - (1 - u) * (1 - u);
      const arc = Math.sin(ease * Math.PI) * 20;
      b.x = Utils.lerp(this.from.x, b.homeX, ease);
      b.y = Utils.lerp(this.from.y - 8, b.homeY, ease) - arc;
      this.sag = 2 + (1 - ease) * 4;
      if (u >= 1) {
        b.x = b.homeX; b.y = b.homeY;
        Inventory.consumeCastBait();
        this.state = "wait";
        this.t = 0;
        const baitM = Inventory.biteMult(this.spot.id);
        const hot = TimeCycle.hotspot() === this.spot.id ? 0.78 : 1;
        this.wait = Utils.lerp(feel.waitMin, feel.waitMax, Math.random()) / Math.max(0.35, baitM) * hot;
        let nib = Utils.irand(Math.random, feel.nibbleCount[0], feel.nibbleCount[1]);
        if (baitM < 0.6) nib = Math.max(1, nib - 1);
        this.nibblesLeft = nib;
        Particles.splash(b.x, b.y, 10, this._splashColor());
        AudioFX.plop();
      }
      return;
    }

    // Drift on moving water
    if (this.state === "wait" || this.state === "nibble") {
      const drift = feel.drift;
      if (drift) {
        const river = this.spot.id === "river";
        b.homeX += (river ? 1 : Math.sin(this.t * 0.4)) * drift * dt * 0.35;
        if (World.isWaterAt(b.homeX, b.homeY)) {
          b.x += (b.homeX - b.x) * 0.08;
        }
      }
    }

    if (this.state === "wait") {
      b.dunk = Math.sin(this.t * feel.bobSpeed) * feel.bobAmp;
      this.sag = 5 + Math.sin(this.t * 1.5) * 1.2;
      if (this.t >= this.wait) {
        if (this.nibblesLeft > 0) {
          this.state = "nibble";
          this.t = 0;
          this.nibblesLeft--;
        } else {
          this._startBite();
        }
      }
      return;
    }

    if (this.state === "nibble") {
      const k = this.t / 0.28;
      b.dunk = (k < 1 ? Math.sin(k * Math.PI) * 3.6 : 0);
      if (this.t < dt + 0.02) {
        Particles.splash(b.x, b.y, 4, this._splashColor());
        AudioFX.nibble();
      }
      if (this.t > feel.nibbleGap) {
        this.state = "wait";
        this.t = 0;
        this.wait = 0.4 + Math.random() * 1.1;
      }
      return;
    }

    if (this.state === "bite" || this.state === "play") {
      const yank = Math.sin(this.t * 18) * feel.yank;
      b.x = b.homeX + yank;
      b.dunk = 4 + Math.sin(this.t * 22) * 1.4;
      this.sag = 10;
      this.biteFlash = 0.15;
      if (this.state === "play") {
        Minigame.update(dt);
        return;
      }
      if (Input.use) {
        this._hook();
        return;
      }
      if (this.t >= feel.hookWindow) {
        this._miss();
      }
      return;
    }

    if (this.state === "reel") {
      const u = Utils.clamp(this.t / 0.62, 0, 1);
      const ease = 1 - Math.pow(1 - u, 2);
      const struggle = (1 - ease) * feel.yank * Math.sin(this.t * 16);
      b.x = Utils.lerp(b.homeX, Player.x, ease) + struggle;
      b.y = Utils.lerp(b.homeY, Player.y - 6, ease);
      b.dunk = (1 - ease) * 2;
      this.sag = 3 + (1 - ease) * 9;
      if (this.t < dt + 0.02 || (u > 0.3 && u < 0.85 && Math.random() < dt * 8)) {
        Particles.splash(b.x, b.y, 3, this._splashColor());
      }
      if (u >= 1) this._land();
      return;
    }

    if (this.state === "fail") {
      b.dunk = 3 + this.t * 10;
      this.sag = 16;
      if (this.t > 0.55) this.cancel();
      return;
    }

    if (this.state === "catch") {
      if (this.t > 1.15) this.cancel();
    }
  },

  _startBite() {
    this.fish = this._pickFish();
    Journal.recordHook(this.fish);
    AudioFX.bite();
    Camera.shake = 1.6;
    Particles.splash(this.bobber.x, this.bobber.y, 12, this._splashColor());
    Minigame.start(this.spot);
  },

  _hook() {
    this.state = "reel";
    this.t = 0;
    Camera.shake = 2.2;
    Player.hop = 3;
    AudioFX.plop();
  },

  _miss() {
    this.state = "fail";
    this.t = 0;
    AudioFX.fail();
    Journal.recordMiss(this.fish);
    UI.showMiss(this.fish);
  },

  _rollSize(fish) {
    const [a, b] = fish.size || [4, 10];
    return Math.round((a + Math.random() * (b - a)) * 10) / 10;
  },

  _land() {
    this.state = "catch";
    this.t = 0;
    const inches = this._rollSize(this.fish);
    this.size = inches;
    const rec = Journal.recordLand(this.fish, inches);
    this.catchMeta = rec;
    Quests.onLand(this.fish);
    Npcs.rememberCatch(this.fish);
    AudioFX.catch();
    Camera.shake = 3.4;
    Player.hop = 5;
    Particles.splash(Player.x, Player.y - 4, 14, this._splashColor());
    Particles.sparkle(Player.x, Player.y - 12, 10, this.fish.color);
    UI.showCatch(this.fish, rec);
  },

  _splashColor() {
    if (!this.spot) return PALETTE.riverHi;
    if (this.spot.id === "pond") return PALETTE.pondHi;
    if (this.spot.id === "river") return PALETTE.riverHi;
    if (this.spot.id === "cave") return PALETTE.caveHi;
    return PALETTE.lakeHi;
  },

  tryHookOrStart() {
    this.act();
  },

  act() {
    if (this.state === "play") { Minigame.press(); return; }
    if (this.state === "bite") { this._hook(); return; }
    if (this.active) return;
    if (typeof Interact !== "undefined" && Interact.try()) return;
    this.tryStart();
  },

  drawBobber(ctx) {
    if (!this.active || this.state === "catch") return;
    if (this.state === "cast" && this.t < 0.14) return;
    const b = this.bobber;
    Sprites.bobber(ctx, b.x, b.y, b.dunk, this.state === "bite" || this.state === "play");
  },

  drawLine(ctx) {
    if (!this.active || this.state === "catch") return;
    const tip = Sprites.rodTip(
      Player.x, Player.y, Player.dir, this.rodPhase,
      this.state === "cast" && this.t < 0.14,
      this.state === "bite" || this.state === "play"
    );
    const b = this.bobber;
    Sprites.fishingLine(ctx, tip.x, tip.y, b.x, b.y + b.dunk - 4, this.sag);
  },

  prompt() {
    if (this.state === "play") return Minigame.hint();
    if (this.state === "bite") return "Press E / Space to hook!";
    if (this.state === "wait" || this.state === "nibble") {
      return "Watch the bobber…  Move to pack up";
    }
    if (this.state === "cast") return "Casting…";
    if (this.state === "reel") return "Reeling in…";
    if (this.state === "fail") return "It got away…";
    if (this.state === "catch") return "";
    const water = World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE);
    if (water) return "Fish · Space or E";
    return "";
  },
};
