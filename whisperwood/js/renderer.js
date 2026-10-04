/* Canvas renderer: tiles, depth-sorted props, lighting, particles. */

const Renderer = {
  canvas: null,
  ctx: null,
  scale: 4,
  viewW: CONFIG.VIEW_W,
  viewH: CONFIG.VIEW_H,

  init() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },

  resize() {
    const host = document.getElementById("stage") || document.getElementById("frame") || this.canvas.parentElement;
    const pad = 24;
    const maxW = Math.max(320, (host.clientWidth || window.innerWidth) - pad);
    const maxH = Math.max(180, (host.clientHeight || window.innerHeight) - pad);
    let s = Math.floor(Math.min(maxW / this.viewW, maxH / this.viewH));
    s = Utils.clamp(s, 2, 6);
    this.scale = s;
    this.canvas.width = this.viewW * s;
    this.canvas.height = this.viewH * s;
    this.canvas.style.width = `${this.viewW * s}px`;
    this.canvas.style.height = `${this.viewH * s}px`;
    const ctx = this.ctx;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingEnabled = false;
  },

  render(now) {
    const ctx = this.ctx;
    const t = now * 0.001;
    const cam = Camera;
    const light = TimeCycle.sample();

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = World.id === "cave" ? "#10141c" : World.id === "cottage" ? "#1a1410" : "#102018";
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    this._ground(ctx, cam, t);
    this._water(ctx, cam, t, light);
    this._liliesAndMist(ctx, t);
    Fishing.drawBobber(ctx);

    const drawList = [];
    for (const d of World.decos) {
      if (d.type === "lily" || d.type === "mist") continue;
      if (d.type === "pickup" && d.taken) continue;
      drawList.push(d);
    }
    if (!(Player.sleeping && World.id === "cottage")) {
      drawList.push({ type: "player", x: Player.x, y: Player.y });
    }
    if (World.id === "vale") {
      for (const n of NPC_DATA) drawList.push({ type: "npc", x: n.x, y: n.y, color: n.color, id: n.id });
    }
    const fire = Save.data && Save.data.flags.campfire;
    if (fire && fire.x != null && fire.map === World.id) {
      drawList.push({ type: "campfire", x: fire.x, y: fire.y });
    }
    drawList.sort((a, b) => this._sortY(a) - this._sortY(b));
    for (const d of drawList) this._deco(ctx, d, t, light);

    ctx.restore();

    this._lighting(ctx, light, cam);

    // Line stays above the lighting pass so it never gets lost in dusk/night tint.
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    Fishing.drawLine(ctx);
    ctx.restore();

    this._particles(ctx, cam);
    Minigame.draw(ctx, this.viewW, this.viewH);

    const fade = Game.fadeAlpha();
    if (fade > 0.01) {
      ctx.fillStyle = `rgba(6, 8, 14, ${Utils.clamp(fade, 0, 1)})`;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }

    if (Fishing.state === "catch" && Fishing.fish) {
      const bob = Math.sin(Fishing.t * 10) * 4;
      ctx.save();
      ctx.translate(this.viewW * 0.5, this.viewH * 0.4 + bob);
      ctx.rotate(Math.sin(Fishing.t * 6) * 0.15);
      if (!(typeof Atlas !== "undefined" && Atlas.drawFish(ctx, Fishing.fish, 0, 0, { scale: 2 }))) {
        Sprites.fishIcon(ctx, 0, 0, Fishing.fish, false);
      }
      ctx.restore();
    }
    if (typeof MillEnd !== "undefined" && MillEnd.openFlag) MillEnd.drawScene(t);
  },

  _visibleTiles(cam) {
    const pad = 2;
    return {
      x0: Math.max(0, Math.floor(cam.x / TILE_SIZE) - pad),
      y0: Math.max(0, Math.floor(cam.y / TILE_SIZE) - pad),
      x1: Math.min(World.w - 1, Math.ceil((cam.x + cam.w) / TILE_SIZE) + pad),
      y1: Math.min(World.h - 1, Math.ceil((cam.y + cam.h) / TILE_SIZE) + pad),
    };
  },

  _ground(ctx, cam, t) {
    const { x0, y0, x1, y1 } = this._visibleTiles(cam);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = World.get(tx, ty);
        const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
        const h = Utils.hash(tx, ty);
        if (typeof Atlas !== "undefined" && Atlas.drawGround(ctx, tile, tx, ty, x, y, h)) continue;
        switch (tile) {
          case TILE.GRASS: Sprites.grass(ctx, x, y, h); break;
          case TILE.DIRT: Sprites.dirt(ctx, x, y, h); break;
          case TILE.SHORE: Sprites.shore(ctx, x, y, h); break;
          case TILE.STONE: Sprites.stone(ctx, x, y, h); break;
          case TILE.CAVE_WALL: Sprites.caveWall(ctx, x, y); break;
          case TILE.CAVE_FLOOR: Sprites.caveFloor(ctx, x, y, h); break;
          case TILE.WOOD: Sprites.wood(ctx, x, y, h); break;
          case TILE.DOCK: Sprites.dock(ctx, x, y); break;
          case TILE.BRIDGE: Sprites.bridge(ctx, x, y); break;
          default: break;
        }
      }
    }
  },

  _water(ctx, cam, t, light) {
    const { x0, y0, x1, y1 } = this._visibleTiles(cam);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = World.get(tx, ty);
        if (!WATER_TILES.has(tile)) continue;
        const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
        let deep = true;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          if (!WATER_TILES.has(World.get(tx + ox, ty + oy))) deep = false;
        }
        const h = Utils.hash(tx, ty);
        if (!(typeof Atlas !== "undefined" && Atlas.drawWater(ctx, tile, tx, ty, x, y, h))) {
          Sprites.water(ctx, x, y, tile, t, deep, light && light.golden, TimeCycle.weatherId());
        } else {
          Sprites.waterRipple(ctx, x, y, tile, t, light && light.golden, TimeCycle.weatherId());
          if (tile === TILE.CAVE_WATER) {
            ctx.globalAlpha = 0.16 + Math.sin(t * 2.2 + tx * 0.2) * 0.06;
            ctx.fillStyle = PALETTE.caveHi;
            ctx.fillRect(x, y, 16, 16);
            ctx.globalAlpha = 1;
          }
        }

        // dark shoreline edge
        const n = [
          [0, -1], [0, 1], [-1, 0], [1, 0],
        ];
        ctx.fillStyle = "rgba(8, 20, 24, 0.28)";
        for (const [ox, oy] of n) {
          if (!WATER_TILES.has(World.get(tx + ox, ty + oy))) {
            if (oy === -1) ctx.fillRect(x, y, 16, 2);
            if (oy === 1) ctx.fillRect(x, y + 14, 16, 2);
            if (ox === -1) ctx.fillRect(x, y, 2, 16);
            if (ox === 1) ctx.fillRect(x + 14, y, 2, 16);
          }
        }
      }
    }
  },

  _liliesAndMist(ctx, t) {
    for (const d of World.decos) {
      if (d.type === "lily") Sprites.lily(ctx, d.x, d.y, t + (d.seed || 0));
      if (d.type === "mist") Sprites.mist(ctx, d.x, d.y, t, d.seed || 0);
    }
  },

  _sortY(d) {
    let y = d.y;
    if (d.slot && typeof Cottage !== "undefined" && Cottage.hasSlot(d.slot)) {
      y = Cottage.slotPos(d.slot).y;
    }
    if (d.floor) y -= 24;
    return y;
  },

  _deco(ctx, d, t, light) {
    const sway = Math.sin(t * 1.3 + (d.seed || d.x * 0.05)) * 1.4;
    if (d.type === "player") { Player.draw(ctx); this._eatFx(ctx, d); return; }
    if (d.type === "oak") Sprites.treeOak(ctx, d.x, d.y, sway, light.shadow);
    else if (d.type === "pine") Sprites.treePine(ctx, d.x, d.y, sway, light.shadow);
    else if (d.type === "rock") Sprites.rock(ctx, d.x, d.y, d.variant || 0);
    else if (d.type === "flower") Sprites.flower(ctx, d.x, d.y, d.variant || 0);
    else if (d.type === "stump") Sprites.stump(ctx, d.x, d.y);
    else if (d.type === "fence") Sprites.fence(ctx, d.x, d.y, d.horiz);
    else if (d.type === "sign" || d.type === "waterSign") Sprites.sign(ctx, d.x, d.y);
    else if (d.type === "crystal") Sprites.crystal(ctx, d.x, d.y, t);
    else if (d.type === "caveMouth") Sprites.caveMouth(ctx, d.x, d.y);
    else if (d.type === "crate") Sprites.crate(ctx, d.x, d.y);
    else if (d.type === "shrub") Sprites.shrub(ctx, d.x, d.y);
    else if (d.type === "reed") Sprites.reed(ctx, d.x, d.y, t);
    else if (d.type === "npc") Sprites.npc(ctx, d.x, d.y, d.color, d.id);
    else if (d.type === "pickup") Sprites.pickup(ctx, d.x, d.y, d.item);
    else if (d.type === "cottage") Sprites.cottage(ctx, d.x, d.y);
    else if (d.type === "raft") Sprites.raft(ctx, d.x, d.y);
    else if (d.type === "mill") Sprites.mill(ctx, d.x, d.y, t);
    else if (d.type === "bed") {
      Sprites.bed(ctx, d.x, d.y);
      if (Player.sleeping && World.id === "cottage") {
        Sprites.playerSleep(ctx, d.x + 4, d.y - 8);
      }
    }
    else if (d.type === "tank") Sprites.tank(ctx, d.x, d.y, t);
    else if (d.type === "trophy") Sprites.trophyWall(ctx, d.x, d.y);
    else if (d.type === "bench") Sprites.bench(ctx, d.x, d.y);
    else if (d.type === "calendar") Sprites.calendar(ctx, d.x, d.y);
    else if (d.type === "mailtray") Sprites.mailtray(ctx, d.x, d.y);
    else if (d.type === "certificate") { Sprites.certificate(ctx, d.x, d.y); Sprites.hearthSeal(ctx, d.x + 16, d.y + 2); }
    else if (d.type === "dayclock") {
      if (Save.data.inventory.items.dayclock) Sprites.dayclock(ctx, d.x, d.y);
    }
    else if (d.slot) {
      if (typeof Cottage !== "undefined" && Cottage.hasSlot(d.slot) && Sprites[d.type]) {
        const pos = Cottage.slotPos(d.slot);
        let dx = pos.x, dy = pos.y;
        if (Cottage.carry === d.slot) {
          dx = Player.x;
          dy = Player.y - 6;
          ctx.save();
          ctx.globalAlpha = 0.72;
        }
        const face = pos.facing | 0;
        const opt = { flip: !!pos.flip, scale: pos.scale || 1 };
        if (Cottage.carry === d.slot) {
          opt.flip = Cottage.carryFlip;
          opt.scale = Cottage.carryScale || 1;
        }
        if (d.type === "chair") Sprites.chair(ctx, dx, dy, Cottage.sitting ? Cottage.sitT : 0, Cottage.carry === d.slot ? Cottage.carryFacing : face, opt);
        else if (d.type === "curtain") { /* removed in top-down */ }
        else Sprites[d.type](ctx, dx, dy, Cottage.carry === d.slot ? Cottage.carryFacing : face, opt);
        if (Cottage.carry === d.slot) ctx.restore();
      }
    }
    else if (d.type === "campfire") Sprites.campfire(ctx, d.x, d.y, t);
  },

  _lighting(ctx, light, cam) {
    if (World.id === "cottage") {
      ctx.fillStyle = "rgba(40, 24, 12, 0.22)";
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      if (typeof Cottage !== "undefined" && Cottage.hasSlot("lampshelf") && typeof COTTAGE_DECOR !== "undefined") {
        const lamp = Cottage.slotPos("lampshelf");
        const gx = lamp.x - cam.x, gy = lamp.y - cam.y - 12;
        const g = ctx.createRadialGradient(gx, gy, 4, gx, gy, 40);
        g.addColorStop(0, "rgba(240, 180, 80, 0.16)");
        g.addColorStop(1, "rgba(240, 180, 80, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.viewW, this.viewH);
      }
      this._lanternGlow(ctx, cam, DESIGN.lanternIndoor);
      return;
    }
    if (World.inCave()) {
      const glow = ctx.createRadialGradient(
        this.viewW * 0.5, this.viewH * 0.58, 18,
        this.viewW * 0.5, this.viewH * 0.55, this.viewH * 0.82
      );
      glow.addColorStop(0, "rgba(70, 170, 220, 0.2)");
      glow.addColorStop(0.42, "rgba(24, 52, 92, 0.18)");
      glow.addColorStop(1, "rgba(8, 10, 22, 0.42)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      this._lanternGlow(ctx, cam, DESIGN.lanternPeak);
      return;
    }

    const c = light.color;
    if (c[3] > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = Utils.rgba([c[0], c[1], c[2], 1]);
      ctx.globalAlpha = Math.min(0.85, c[3] + 0.35);
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = Utils.rgba([c[0], c[1], c[2], c[3] * 0.45]);
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      ctx.restore();
    }

    const g = ctx.createRadialGradient(
      this.viewW * 0.5, this.viewH * 0.5, this.viewH * 0.35,
      this.viewW * 0.5, this.viewH * 0.5, this.viewH * 0.78
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(6, 12, 8, 0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    this._weatherVeil(ctx);
    this._lanternGlow(ctx, cam, DESIGN.lanternPeak * Utils.clamp(light.color[3] / DESIGN.lanternNightA, 0, 1));
  },

  _weatherVeil(ctx) {
    if (World.id === "cottage") return;
    const w = typeof TimeCycle !== "undefined" ? TimeCycle.weatherId() : "clear";
    if (w === "clear") return;
    ctx.save();
    if (w === "rain") ctx.fillStyle = "rgba(32, 52, 80, 0.22)";
    else if (w === "mist") ctx.fillStyle = "rgba(200, 214, 224, 0.22)";
    else if (w === "heat") ctx.fillStyle = "rgba(255, 160, 60, 0.14)";
    else if (w === "frost") ctx.fillStyle = "rgba(190, 214, 255, 0.18)";
    else ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.restore();
  },

  _lanternGlow(ctx, cam, peak) {
    if (typeof Survival === "undefined" || !Survival.lanternLit()) return;
    if (!(peak > 0.005)) return;
    const hand = (typeof Sprites !== "undefined" && Sprites.lanternPos)
      ? Sprites.lanternPos(Player.x, Player.y, Player.dir)
      : { x: Player.x + 9, y: Player.y - 8 };
    const sx = hand.x - (cam ? cam.x : 0);
    const sy = hand.y - (cam ? cam.y : 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 110);
    glow.addColorStop(0, "rgba(255, 220, 140, " + peak + ")");
    glow.addColorStop(0.18, "rgba(255, 190, 90, " + (peak * 0.4) + ")");
    glow.addColorStop(0.5, "rgba(255, 160, 60, " + (peak * 0.18) + ")");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _eatFx(ctx, d) {
    const eat = Game.eating;
    if (!eat) return;
    const u = eat.t / eat.dur;
    const bob = Math.sin(eat.t * 10) * 2;
    const scale = u < 0.65 ? 1 : Math.max(0.2, 1 - (u - 0.65) / 0.35);
    ctx.save();
    ctx.globalAlpha = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
    ctx.translate(d.x + 10, d.y - 18 + bob);
    ctx.scale(scale, scale);
    if (eat.fish) Sprites.fishIcon(ctx, 0, 0, eat.fish, false);
    else {
      ctx.fillStyle = "#c45a5a";
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.restore();
  },

  _particles(ctx, cam) {
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    for (const p of Particles.list) {
      const a = Utils.clamp(p.life / (p.max || 0.5), 0, 1);
      ctx.globalAlpha = p.kind === "fly" ? (0.3 + Math.sin((p.phase || 0) * 6) * 0.4) * a : a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },
};
