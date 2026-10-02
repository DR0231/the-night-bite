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
  fightInches: 0,
  aim: null,

  get active() { return this.state !== "idle"; },

  cancel() {
    this.state = "idle";
    Player.fishing = false;
    Player.locked = false;
    this.fightInches = 0;
    this.aim = null;
    // Forget the last water so a later cast can't fly back to a spot across the map.
    this.spot = null;
    this.water = null;
  },

  beginAim() {
    if (this.active) return false;
    if (World.isWaterAt(Player.x, Player.y)) return false;
    const water = World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE);
    if (!water) return false;
    const spot = World.spotAt(Player.x, Player.y) || this._spotFromTile(water.tile);
    const target = this._castTarget(Player.x, Player.y, water, spot);
    this.spot = spot;
    this.water = water;
    this.aim = { x: target.x, y: target.y };
    this.state = "aim";
    this.t = 0;
    Player.fishing = true;
    Player.locked = true;
    Player.vx = 0;
    Player.vy = 0;
    Player.faceToward(this.aim.x, this.aim.y);
    return true;
  },

  /** How far the aim ring may sit from the fisher's feet. */
  aimRange() {
    const rod = typeof Inventory !== "undefined" ? Inventory.rod() : null;
    const reach = rod && rod.reach ? rod.reach : 1;
    return CONFIG.FISH_RANGE + (DESIGN.castAimPad || 18) * reach;
  },

  _updateAim(dt) {
    const axis = Input.axis();
    const spd = DESIGN.aimSpeed || 70;
    let nx = this.aim.x + axis.x * spd * dt;
    let ny = this.aim.y + axis.y * spd * dt;
    const maxR = this.aimRange();
    if (Utils.dist(Player.x, Player.y, nx, ny) > maxR) {
      const ang = Math.atan2(ny - Player.y, nx - Player.x);
      nx = Player.x + Math.cos(ang) * maxR;
      ny = Player.y + Math.sin(ang) * maxR;
    }
    if (World.isWaterAt(nx, ny)) {
      this.aim.x = nx;
      this.aim.y = ny;
      Player.faceToward(this.aim.x, this.aim.y);
    }
  },

  tryStart() {
    if (this.active && this.state !== "aim") return false;
    const water = this.water || World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE);
    if (!water && !(this.aim && World.isWaterAt(this.aim.x, this.aim.y))) return false;
    if (World.isWaterAt(Player.x, Player.y)) return false;

    const spot = this.spot || World.spotAt(Player.x, Player.y) || this._spotFromTile(water && water.tile);
    const target = this.aim && World.isWaterAt(this.aim.x, this.aim.y)
      ? { x: this.aim.x, y: this.aim.y }
      : this._castTarget(Player.x, Player.y, water, spot);
    Player.faceToward(target.x, target.y);
    Player.fishing = true;
    Player.locked = true;

    this.spot = spot;
    this.water = water;
    this.from = { x: Player.x, y: Player.y };
    this.bobber.homeX = target.x;
    this.bobber.homeY = target.y;
    this.bobber.x = Player.x;
    this.bobber.y = Player.y - 10;
    this.bobber.dunk = 0;
    this.state = "cast";
    this.t = 0;
    this.fish = null;
    this.fightInches = 0;
    this.rodPhase = 0;
    this.aim = null;
    AudioFX.plop();
    return true;
  },

  _castTarget(px, py, nearest, spot) {
    // A water's favoured cast point is a direction, not a teleport: pull it in to arm's reach.
    if (spot && spot.cast && World.isWaterAt(spot.cast.x, spot.cast.y)) {
      const maxR = this.aimRange();
      const d = Utils.dist(px, py, spot.cast.x, spot.cast.y);
      if (d <= maxR) return { x: spot.cast.x, y: spot.cast.y };
      const ang = Math.atan2(spot.cast.y - py, spot.cast.x - px);
      for (let rr = maxR; rr >= 14; rr -= 4) {
        const cx = px + Math.cos(ang) * rr, cy = py + Math.sin(ang) * rr;
        if (World.isWaterAt(cx, cy)) return { x: cx, y: cy };
      }
    }
    let best = nearest, bestScore = -999;
    const r = this.aimRange();
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
    if (typeof World !== "undefined" && World.id === "island") return SPOTS.island;
    if (tile === TILE.POND) return SPOTS.pond;
    if (tile === TILE.RIVER) return SPOTS.river;
    if (tile === TILE.LAKE) return SPOTS.lake;
    if (tile === TILE.MARSH) return SPOTS.marsh;
    return SPOTS.cave;
  },

  _feel() {
    const mood = this.spot && this.spot.mood;
    return FISHING_FEEL[mood] || FISHING_FEEL.still;
  },

  /** 1 until the rank gate, then the DESIGN multiplier. Hook and cast wait do not share a gate. */
  _rankMul(gate, key) {
    if (typeof Skills === "undefined" || Skills.rank() < gate) return 1;
    const m = DESIGN[key];
    return m == null ? 1 : m;
  },

  _pickFish() {
    const phase = TimeCycle.phaseId();
    const weather = TimeCycle.weatherId();
    const season = TimeCycle.season();
    let hotspot = TimeCycle.hotspot() === this.spot.id ? DESIGN.hotspotBite : 1;
    if (hotspot === 1 && Skills.has("homeshore") && Save.data.player.favoriteSpot === this.spot.id) hotspot = DESIGN.homeShoreBite;
    const eq = Inventory.equipped();
    const starved = (Save.data.player.hunger | 0) <= 0;
    const pool = [];
    const weights = [];
    for (const f of FISH) {
      if (f.spot !== this.spot.id) continue;
      if (f.nightOnly && phase !== "night") continue;
      if (f.rainOnly && weather !== "rain") continue;
      if (f.season && f.season !== season) continue;
      if (starved && f.rarity === "Rare") continue;
      let w = f.rarity === "Rare" ? 1 : f.rarity === "Uncommon" ? 3 : 6;
      const bw = (f.bite && f.bite[phase]) != null ? f.bite[phase] : 1;
      w *= bw * (WEATHERS[weather] ? WEATHERS[weather].bite : 1) * hotspot;
      if (Skills.has("nightowl") && phase === "night") w *= DESIGN.nightOwlBite;
      const bias = (f.baitBias && f.baitBias[eq] != null) ? f.baitBias[eq] : 1;
      w *= bias;
      if (w <= 0.01) continue;
      pool.push(f);
      weights.push(w);
    }
    if (!pool.length) {
      return FISH.find((f) => f.spot === this.spot.id && (!starved || f.rarity !== "Rare")) || FISH.find((f) => f.spot === this.spot.id) || FISH[0];
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
    if (this.state === "aim") {
      this._updateAim(dt);
      return;
    }
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
        const hot = TimeCycle.hotspot() === this.spot.id ? DESIGN.hotspotWait : 1;
        const waitMul = this._rankMul(6, "rank6CastMul");
        this.wait = Utils.lerp(feel.waitMin * waitMul, feel.waitMax * waitMul, Math.random()) / Math.max(0.35, baitM) * hot;
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
      const tensionPlay = this.state === "play" && (Minigame.kind === "tension" || Minigame.kind === "tensionErratic");
      if (tensionPlay) {
        Minigame.update(dt);
        const pull = Minigame.pull || 0;
        const w = Minigame.weight || 0.12;
        const dip = Math.abs(pull);
        this.sag = 8 + 10 * w * dip;
        b.x = b.homeX + pull * (1.6 + 2.4 * w);
        b.dunk = 2.4 + 5 * w * dip;
        if (dip > 0.22) Player.hop = Math.max(Player.hop, 1 + 1.4 * w * dip);
        return;
      }
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
      if (this.t >= feel.hookWindow * this._rankMul(4, "rank4HookMul")) {
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
      if (this.t > 0.85) this.cancel();
      return;
    }

    if (this.state === "catch") {
      if (this.t > 1.15) this.cancel();
    }
  },

  _startBite() {
    this.fish = this._pickFish();
    this.fightInches = this._rollSize(this.fish);
    Journal.recordHook(this.fish);
    try { AudioFX.bite(); } catch (err) { /* minigame must still start */ }
    Camera.shake = 1.6;
    Particles.splash(this.bobber.x, this.bobber.y, 12, this._splashColor());
    Minigame.start(this.spot);
  },

  _hook() {
    this.state = "reel";
    this.t = 0;
    Camera.shake = 2.2;
    Player.hop = 3;
    try { AudioFX.plop(); } catch (err) { /* toast path must still run */ }
  },

  _miss() {
    this.state = "fail";
    this.t = 0;
    try { AudioFX.fail(); } catch (err) { /* miss toast must still run */ }
    Journal.recordMiss(this.fish);
    Skills.awardFromMiss(this.fish);
    UI.showMiss(this.fish);
  },

  _rollSize(fish) {
    const [a, b] = fish.size || [4, 10];
    return Math.round((a + Math.random() * (b - a)) * 10) / 10;
  },

  _land() {
    this.state = "catch";
    this.t = 0;
    const inches = this.fightInches || this._rollSize(this.fish);
    this.size = inches;
    this.fightInches = 0;
    const rec = Journal.recordLand(this.fish, inches);
    this.catchMeta = rec;
    const questBonus = Quests.onLand(this.fish);
    Skills.awardFromLand(this.fish, rec, questBonus);
    Npcs.rememberCatch(this.fish);
    try { AudioFX.catch(); } catch (err) { /* catch toast must still run */ }
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
    if (this.state === "aim") { this.tryStart(); return; }
    if (this.active) return;
    if (typeof Interact !== "undefined" && Interact.try()) return;
    // No water in reach means E does nothing — never a cast toward the last water.
    if (World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE)) this.beginAim();
  },

  drawBobber(ctx) {
    if (this.state === "aim" && this.aim) {
      const ax = this.aim.x, ay = this.aim.y;
      ctx.save();
      ctx.globalAlpha = 0.85;
      Sprites.ellipse(ctx, ax, ay, 5, 2.4, "#f3e2c4");
      ctx.strokeStyle = "#c4a05a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ax, ay - 1, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (!this.active || this.state === "catch") return;
    if (this.state === "cast" && this.t < 0.14) return;
    const b = this.bobber;
    Sprites.bobber(ctx, b.x, b.y, b.dunk, this.state === "bite" || this.state === "play");
  },

  drawLine(ctx) {
    if (this.state === "aim" && this.aim) {
      const tip = Sprites.rodTip(Player.x, Player.y, Player.dir, 0, false, false);
      Sprites.fishingLine(ctx, tip.x, tip.y, this.aim.x, this.aim.y, 4);
      return;
    }
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
    if (this.state === "aim") return "WASD aim · E or Fish to cast · Esc or Pack up to stop";
    if (this.state === "cast") return "Casting…";
    if (this.state === "reel") return "Reeling in…";
    if (this.state === "fail") return "It got away…";
    if (this.state === "catch") return "";
    if (typeof Npcs !== "undefined" && Npcs.at(Player.x, Player.y)) return "";
    // Whatever E would really do wins the prompt; the Fish line only shows when E fishes.
    if (typeof Interact !== "undefined" && (Interact.priorityHint() || Interact.hint())) return "";
    const water = World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE);
    if (water) return "Fish · Space or E";
    return "";
  },
};
