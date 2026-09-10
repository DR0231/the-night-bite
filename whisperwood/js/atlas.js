/* Optional PNG sheets. Missing files keep procedural Sprites — never required. */

const Atlas = {
  sheets: {},
  wrapped: false,
  started: false,

  /* Known sheets only. Do not list missing img/* files — 404s look like a crash. */
  PATHS: {
    player: "assets/sprites/player.png",
    tiles: "assets/sprites/tiles-ground.png",
    fish: "assets/sprites/fish.png",
    props: "assets/sprites/props.png",
    npc: "assets/sprites/npc.png",
  },

  /* 16px sheet rows in tiles-ground.png */
  TILE_ROW: {
    0: 0,   /* grass */
    1: 1,   /* dirt */
    2: 2,   /* shore */
    9: 3,   /* stone */
    12: 4,  /* wood */
    7: 4,   /* dock */
    8: 4,   /* bridge */
    11: 5,  /* cave floor */
    10: 6,  /* cave wall */
    3: 7,   /* pond */
    4: 8,   /* river */
    5: 9,   /* lake */
    13: 10, /* marsh */
    6: 11,  /* cave water */
  },

  PLAYER: {
    w: 80,
    h: 72,
    ax: 40,
    ay: 72,
    cols: 6,
    rows: 4,
    /* Rod tip offsets from feet; refreshed after 48x64 fishing pack */
    rod: [
      { x: 32, y: -44 },
      { x: -29, y: -41 },
      { x: 39, y: -44 },
      { x: -28, y: -40 },
    ],
  },

  FISH_W: 32,
  FISH_H: 20,
  NPC_W: 32,
  NPC_H: 48,
  NPC_IDS: ["wren", "bramble", "lark"],

  /* Regions assume 16px tiles. Props are foot-anchored like Sprites. */
  FRAMES: {
    grass:     { sheet: "tiles", sx: 0,  sy: 0, w: 16, h: 16 },
    dirt:      { sheet: "tiles", sx: 16, sy: 0, w: 16, h: 16 },
    shore:     { sheet: "tiles", sx: 32, sy: 0, w: 16, h: 16 },
    stone:     { sheet: "tiles", sx: 48, sy: 0, w: 16, h: 16 },
    caveWall:  { sheet: "tiles", sx: 64, sy: 0, w: 16, h: 16 },
    caveFloor: { sheet: "tiles", sx: 80, sy: 0, w: 16, h: 16 },
    wood:      { sheet: "tiles", sx: 96, sy: 0, w: 16, h: 16 },
    dock:      { sheet: "tiles", sx: 112, sy: 0, w: 16, h: 16 },
    bridge:    { sheet: "tiles", sx: 128, sy: 0, w: 16, h: 16 },

    hudHunger: { sheet: "hud", sx: 0,  sy: 0, w: 16, h: 16 },
    hudWarmth: { sheet: "hud", sx: 16, sy: 0, w: 16, h: 16 },
    hudRest:   { sheet: "hud", sx: 32, sy: 0, w: 16, h: 16 },

    treeOak:       { sheet: "props", sx: 0,   sy: 0,   w: 48, h: 72, ax: 24, ay: 72 },
    treePine:      { sheet: "props", sx: 48,  sy: 0,   w: 32, h: 72, ax: 16, ay: 72 },
    cottage:       { sheet: "props", sx: 80,  sy: 0,   w: 80, h: 72, ax: 40, ay: 72 },
    tank:          { sheet: "props", sx: 160, sy: 0,   w: 48, h: 40, ax: 24, ay: 40 },
    bed:           { sheet: "props", sx: 0,   sy: 72,  w: 72, h: 32, ax: 36, ay: 32 },
    bench:         { sheet: "props", sx: 72,  sy: 72,  w: 40, h: 28, ax: 20, ay: 28 },
    crate:         { sheet: "props", sx: 112, sy: 72,  w: 20, h: 16, ax: 10, ay: 16 },
    rock:          { sheet: "props", sx: 132, sy: 72,  w: 20, h: 16, ax: 10, ay: 16 },
    fence:         { sheet: "props", sx: 152, sy: 72,  w: 24, h: 20, ax: 12, ay: 20 },
    fenceH:        { sheet: "props", sx: 152, sy: 72,  w: 24, h: 20, ax: 12, ay: 20 },
    fenceV:        { sheet: "props", sx: 152, sy: 72,  w: 24, h: 20, ax: 12, ay: 20 },
    sign:          { sheet: "props", sx: 176, sy: 72,  w: 16, h: 24, ax: 8,  ay: 24 },
    stump:         { sheet: "props", sx: 192, sy: 72,  w: 20, h: 16, ax: 10, ay: 16 },
    certificate:   { sheet: "props", sx: 212, sy: 72,  w: 24, h: 28, ax: 12, ay: 28 },
    trophyWall:    { sheet: "props", sx: 0,   sy: 104, w: 32, h: 32, ax: 16, ay: 32 },
    mailtray:      { sheet: "props", sx: 32,  sy: 104, w: 24, h: 16, ax: 12, ay: 16 },
    calendar:      { sheet: "props", sx: 56,  sy: 104, w: 24, h: 32, ax: 12, ay: 32 },
    playerSleep:   { sheet: "props", sx: 80,  sy: 104, w: 40, h: 18, ax: 20, ay: 14 },
    pickupGlow:    { sheet: "props", sx: 120, sy: 104, w: 16, h: 20, ax: 8,  ay: 18 },
    pickupWorms:   { sheet: "props", sx: 136, sy: 104, w: 20, h: 16, ax: 10, ay: 14 },
    pickupBerries: { sheet: "props", sx: 156, sy: 104, w: 16, h: 20, ax: 8,  ay: 18 },
    pickupCrickets:{ sheet: "props", sx: 172, sy: 104, w: 20, h: 16, ax: 10, ay: 14 },
    pickupCrystal: { sheet: "props", sx: 192, sy: 104, w: 16, h: 20, ax: 8,  ay: 18 },
  },

  load() {
    if (this.started) {
      this.wrapSprites();
      return;
    }
    this.started = true;
    const paths = this.PATHS;
    for (const id in paths) {
      if (Object.prototype.hasOwnProperty.call(paths, id)) this._image(id, paths[id]);
    }
    this.wrapSprites();
  },

  _image(id, src) {
    try {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if ((img.naturalWidth || img.width) > 0) this.sheets[id] = this._keyMagenta(img) || img;
      };
      img.onerror = () => { this.sheets[id] = null; };
      img.src = src;
    } catch (err) {
      this.sheets[id] = null;
    }
  },

  _keyMagenta(img) {
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return img;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const d = data.data;
      let hit = false;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const mag = r >= 190 && b >= 180 && g <= 160 && Math.abs(r - b) <= 60 && (r - g) >= 40;
        const pinkLine = r >= 200 && g <= 90 && b >= 120 && b <= 220 && (r - g) >= 80;
        if (mag || pinkLine) {
          d[i + 3] = 0;
          hit = true;
        }
      }
      if (!hit) return img;
      ctx.putImageData(data, 0, 0);
      return c;
    } catch (err) {
      return img;
    }
  },

  _wh(img) {
    return { w: (img.naturalWidth || img.width || 0), h: (img.naturalHeight || img.height || 0) };
  },

  _img(sheet) {
    const named = this.sheets[sheet];
    if (named && this._wh(named).w) return named;
    const atlas = this.sheets.atlas;
    if (atlas && this._wh(atlas).w) return atlas;
    return null;
  },

  ok(name) {
    const f = this.FRAMES[name];
    if (!f) return false;
    const img = this._img(f.sheet);
    return !!(img && this._wh(img).w);
  },

  drawPlayer(ctx, x, y, state) {
    const img = this.sheets.player;
    if (!img || !ctx) return false;
    const size = this._wh(img);
    if (!size.w) return false;
    const P = this.PLAYER;
    let dir = (state && state.dir) | 0;
    if (dir < 0) dir = 0;
    if (dir > P.rows - 1) dir = P.rows - 1;
    let col = 0;
    if (state && state.fishing) col = 5;
    else if (state && state.moving) {
      const f = ((state.frame | 0) % 4 + 4) % 4;
      col = 1 + f;
    }
    const sx = col * P.w;
    const sy = dir * P.h;
    if (sx + P.w > size.w || sy + P.h > size.h) return false;
    const hop = (state && state.hop) || 0;
    try {
      this.castShadow(ctx, x, y, 8, 2.2);
      ctx.drawImage(
        img,
        sx, sy, P.w, P.h,
        (x - P.ax) | 0,
        (y - P.ay - hop) | 0,
        P.w, P.h
      );
      return true;
    } catch (err) {
      return false;
    }
  },

  draw(ctx, name, x, y, sway) {
    const f = this.FRAMES[name];
    if (!f || !ctx) return false;
    const img = this._img(f.sheet);
    if (!img) return false;
    const size = this._wh(img);
    if (!size.w) return false;
    const w = f.w || TILE_SIZE;
    const h = f.h || TILE_SIZE;
    if (f.sx + w > size.w || f.sy + h > size.h) return false;
    try {
      const planted = name === "treeOak" || name === "treePine" || name === "cottage" ||
        name === "stump" || name === "sign" || name === "crate" || name === "rock" ||
        name === "fence" || name === "fenceH" || name === "fenceV" || name === "calendar";
      if (planted) {
        const rx = name === "treeOak" ? 13 : name === "cottage" ? 16 : name === "treePine" ? 10 : 6;
        this.castShadow(ctx, x, y, rx, 3.2);
      }
      let dx = (x - (f.ax || 0)) | 0;
      const dy = (y - (f.ay || 0)) | 0;
      if (sway && (name === "treeOak" || name === "treePine")) dx += (sway | 0);
      ctx.drawImage(img, f.sx, f.sy, w, h, dx, dy, w, h);
      return true;
    } catch (err) {
      return false;
    }
  },

  castShadow(ctx, x, y, rx, ry) {
    if (!ctx) return;
    if (typeof World !== "undefined" && (World.id === "cottage" || (World.inCave && World.inCave()))) return;
    const light = typeof TimeCycle !== "undefined" ? TimeCycle.sample() : null;
    const sh = light && light.shadow;
    if (!sh || typeof Sprites === "undefined" || !Sprites.ellipse) return;
    const ox = sh.x || 0;
    const oy = Math.max(1.4, (sh.y || 3) * 0.32);
    const alpha = sh.alpha != null ? sh.alpha : 0.28;
    const len = Math.hypot(ox, oy);
    ctx.save();
    ctx.translate(x + ox, y + oy);
    if (len > 0.4) ctx.rotate(Math.atan2(oy, ox));
    const stretch = Math.min(2.5, 0.8 + len * 0.11);
    Sprites.ellipse(ctx, 0, 0, rx * stretch, Math.max(2, ry * 0.5), `rgba(8, 14, 10, ${alpha})`);
    ctx.restore();
  },

  _fishIndex(fish) {
    if (fish == null) return -1;
    if (typeof fish === "number") return fish | 0;
    const id = typeof fish === "string" ? fish : fish.id;
    if (!id || typeof FISH === "undefined") return -1;
    for (let i = 0; i < FISH.length; i++) if (FISH[i].id === id) return i;
    return -1;
  },

  _fishScratch(w, h) {
    let s = this._fishCanvas;
    if (!s) {
      s = document.createElement("canvas");
      this._fishCanvas = s;
    }
    if (s.width !== w) s.width = w;
    if (s.height !== h) s.height = h;
    return s;
  },

  drawFish(ctx, fish, x, y, opts) {
    const img = this.sheets.fish;
    if (!img || !ctx) return false;
    const size = this._wh(img);
    if (!size.w) return false;
    const idx = this._fishIndex(fish);
    if (idx < 0) return false;
    const fw = this.FISH_W, fh = this.FISH_H;
    const sx = idx * fw;
    if (sx + fw > size.w || fh > size.h) return false;
    const o = (opts && typeof opts === "object") ? opts : { silhouette: !!opts };
    const scale = o.scale > 0 ? o.scale : 1;
    const dw = Math.max(1, (fw * scale) | 0);
    const dh = Math.max(1, (fh * scale) | 0);
    try {
      let src = img;
      let srcX = sx, srcY = 0, srcW = fw, srcH = fh;
      if (o.silhouette) {
        const scratch = this._fishScratch(fw, fh);
        const g = scratch.getContext("2d");
        g.clearRect(0, 0, fw, fh);
        g.globalCompositeOperation = "source-over";
        g.drawImage(img, sx, 0, fw, fh, 0, 0, fw, fh);
        g.globalCompositeOperation = "source-atop";
        g.fillStyle = "#2a241c";
        g.fillRect(0, 0, fw, fh);
        g.globalCompositeOperation = "source-over";
        src = scratch;
        srcX = 0;
      }
      const dx = (x - dw * 0.5) | 0;
      const dy = (y - dh * 0.5) | 0;
      if (o.flip) {
        ctx.save();
        ctx.translate((x | 0), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(src, srcX, srcY, srcW, srcH, (-dw * 0.5) | 0, dy, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(src, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  drawNpc(ctx, x, y, id) {
    const img = this.sheets.npc;
    if (!img || !ctx) return false;
    const size = this._wh(img);
    if (!size.w) return false;
    let idx = this.NPC_IDS.indexOf(id);
    if (idx < 0 && typeof NPC_DATA !== "undefined") {
      const n = NPC_DATA.find((p) => p.id === id || p.color === id);
      idx = n ? this.NPC_IDS.indexOf(n.id) : -1;
    }
    if (idx < 0) return false;
    const w = this.NPC_W, h = this.NPC_H;
    const sx = idx * w;
    if (sx + w > size.w || h > size.h) return false;
    try {
      this.castShadow(ctx, x, y, 8, 2.4);
      ctx.drawImage(img, sx, 0, w, h, (x - w * 0.5) | 0, (y - h) | 0, w, h);
      return true;
    } catch (err) {
      return false;
    }
  },

  drawPickup(ctx, x, y, item) {
    const map = {
      glow: "pickupGlow", worms: "pickupWorms", berries: "pickupBerries",
      crickets: "pickupCrickets", crystal: "pickupCrystal",
    };
    const name = map[item];
    return !!(name && this.draw(ctx, name, x, y));
  },

  drawTank(ctx, x, y, t) {
    if (!this.draw(ctx, "tank", x, y)) return false;
    const aq = (typeof Save !== "undefined" && Save.data && Save.data.cottage && Save.data.cottage.aquarium) || [];
    const waterY = y - 16;
    for (let i = 0; i < aq.length; i++) {
      const spec = typeof FISH !== "undefined" ? FISH.find((k) => k.id === aq[i]) : null;
      const ox = Math.sin((t || 0) * 1.4 + i) * 10;
      const flip = Math.cos((t || 0) * 1.4 + i) < 0;
      if (!this.drawFish(ctx, spec || aq[i], x + ox, waterY, { scale: 0.5, flip })) {
        if (typeof Sprites !== "undefined" && Sprites.fishIcon) {
          Sprites.fishIcon(ctx, x + ox, waterY, spec || "#8ad", false);
        }
      }
    }
    return true;
  },

  _blitCell(ctx, img, col, row, x, y, rot) {
    const sx = col * 16, sy = row * 16;
    const size = this._wh(img);
    if (sx + 16 > size.w || sy + 16 > size.h) return false;
    if (!rot) {
      ctx.drawImage(img, sx, sy, 16, 16, x, y, 16, 16);
      return true;
    }
    ctx.save();
    ctx.translate(x + 8, y + 8);
    ctx.rotate(rot * Math.PI * 0.5);
    ctx.drawImage(img, sx, sy, 16, 16, -8, -8, 16, 16);
    ctx.restore();
    return true;
  },

  _sameTile(tx, ty, tile, water) {
    const n = World.get(tx, ty);
    if (water) return typeof WATER_TILES !== "undefined" && WATER_TILES.has(n);
    return n === tile;
  },

  _edges(ctx, img, row, tx, ty, x, y, water) {
    const tile = World.get(tx, ty);
    const n = !this._sameTile(tx, ty - 1, tile, water);
    const e = !this._sameTile(tx + 1, ty, tile, water);
    const s = !this._sameTile(tx, ty + 1, tile, water);
    const w = !this._sameTile(tx - 1, ty, tile, water);
    if (n && w) this._blitCell(ctx, img, 4, row, x, y, 0);
    if (n && e) this._blitCell(ctx, img, 4, row, x, y, 1);
    if (s && e) this._blitCell(ctx, img, 4, row, x, y, 2);
    if (s && w) this._blitCell(ctx, img, 4, row, x, y, 3);
    if (n && !w && !e) this._blitCell(ctx, img, 3, row, x, y, 0);
    if (e && !n && !s) this._blitCell(ctx, img, 3, row, x, y, 1);
    if (s && !e && !w) this._blitCell(ctx, img, 3, row, x, y, 2);
    if (w && !s && !n) this._blitCell(ctx, img, 3, row, x, y, 3);
  },

  drawGround(ctx, tile, tx, ty, x, y, h) {
    const img = this.sheets.tiles;
    if (!img || !ctx) return false;
    if (!this._wh(img).w) return false;
    const row = this.TILE_ROW[tile];
    if (row == null || row >= 7) return false;
    const fill = ((h >>> 0) % 3);
    if (!this._blitCell(ctx, img, fill, row, x, y, 0)) return false;
    this._edges(ctx, img, row, tx, ty, x, y, false);
    return true;
  },

  drawWater(ctx, tile, tx, ty, x, y, h) {
    const img = this.sheets.tiles;
    if (!img || !ctx) return false;
    if (!this._wh(img).w) return false;
    const row = this.TILE_ROW[tile];
    if (row == null || row < 7) return false;
    const fill = ((h >>> 0) % 3);
    if (!this._blitCell(ctx, img, fill, row, x, y, 0)) return false;
    this._edges(ctx, img, row, tx, ty, x, y, true);
    return true;
  },

  wrapSprites() {
    if (this.wrapped || typeof Sprites === "undefined") return;
    this.wrapped = true;
    this._orig = {};
    const skip = {
      fence: 1, fenceH: 1, fenceV: 1, tank: 1, crate: 1,
      grass: 1, dirt: 1, shore: 1, stone: 1, wood: 1, dock: 1, bridge: 1,
      caveWall: 1, caveFloor: 1,
    };
    const frames = this.FRAMES;
    for (const name in frames) {
      if (!Object.prototype.hasOwnProperty.call(frames, name) || skip[name]) continue;
      const sheet = frames[name].sheet;
      if (sheet && !this.PATHS[sheet] && sheet !== "atlas") continue;
      const orig = Sprites[name];
      if (typeof orig !== "function") continue;
      this._orig[name] = orig;
      Sprites[name] = function () {
        if (Atlas.draw(arguments[0], name, arguments[1], arguments[2], arguments[3])) return;
        return orig.apply(Sprites, arguments);
      };
    }
    if (typeof Sprites.fence === "function") {
      const origFence = Sprites.fence;
      this._orig.fence = origFence;
      Sprites.fence = function (ctx, x, y, horiz) {
        const id = horiz ? "fenceH" : "fenceV";
        if (Atlas.draw(ctx, id, x, y) || Atlas.draw(ctx, "fence", x, y)) return;
        return origFence.call(Sprites, ctx, x, y, horiz);
      };
    }
    if (typeof Sprites.player === "function") {
      const origPlayer = Sprites.player;
      this._orig.player = origPlayer;
      Sprites.player = function (ctx, x, y, state) {
        if (Atlas.drawPlayer(ctx, x, y, state)) return;
        return origPlayer.call(Sprites, ctx, x, y, state);
      };
    }
    if (typeof Sprites.npc === "function") {
      const origNpc = Sprites.npc;
      this._orig.npc = origNpc;
      Sprites.npc = function (ctx, x, y, color, id) {
        if (Atlas.drawNpc(ctx, x, y, id || color)) return;
        return origNpc.call(Sprites, ctx, x, y, color);
      };
    }
    if (typeof Sprites.pickup === "function") {
      const origPick = Sprites.pickup;
      this._orig.pickup = origPick;
      Sprites.pickup = function (ctx, x, y, item) {
        if (Atlas.drawPickup(ctx, x, y, item)) return;
        return origPick.call(Sprites, ctx, x, y, item);
      };
    }
    if (typeof Sprites.tank === "function") {
      const origTank = Sprites.tank;
      this._orig.tank = origTank;
      Sprites.tank = function (ctx, x, y, t) {
        if (Atlas.drawTank(ctx, x, y, t)) return;
        return origTank.call(Sprites, ctx, x, y, t);
      };
    }
    if (typeof Sprites.crate === "function") {
      const origCrate = Sprites.crate;
      this._orig.crate = origCrate;
      Sprites.crate = function (ctx, x, y) {
        if (!Atlas.draw(ctx, "crate", x, y)) origCrate.call(Sprites, ctx, x, y);
        else if (Sprites.crateIce) Sprites.crateIce(ctx, x, y);
      };
    }
  },
};

try { Atlas.load(); } catch (err) { /* sheets optional */ }
