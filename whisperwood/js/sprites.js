/* Pixel drawing primitives, tiles, decorations, player, bobber, fish. */

const Sprites = {
  fill(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w, h);
  },

  pixel(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, 1, 1);
  },

  blob(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    const R = r | 0;
    for (let dy = -R; dy <= R; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)) * 2);
      ctx.fillRect((cx - w / 2) | 0, (cy + dy) | 0, w, 1);
    }
  },

  ellipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    const RX = Math.max(1, rx | 0), RY = Math.max(1, ry | 0);
    for (let dy = -RY; dy <= RY; dy++) {
      const t = 1 - (dy * dy) / (RY * RY);
      const w = Math.floor(Math.sqrt(Math.max(0, t)) * RX * 2);
      ctx.fillRect((cx - w / 2) | 0, (cy + dy) | 0, Math.max(1, w), 1);
    }
  },

  /* ---------- ground tiles (16x16) ---------- */
  grass(ctx, x, y, h) {
    const v = h % 5;
    const base = v === 0 ? PALETTE.grassHi : v === 1 ? PALETTE.grass : v === 2 ? PALETTE.grassMid : PALETTE.grass;
    this.fill(ctx, x, y, 16, 16, base);
    const blade = v % 2 ? PALETTE.grassHi : PALETTE.grassLo;
    this.pixel(ctx, x + (h % 7) + 2, y + 4, blade);
    this.pixel(ctx, x + (h % 11) + 1, y + 9, PALETTE.grassLo);
    this.pixel(ctx, x + 12 - (h % 5), y + 13, PALETTE.grassHi);
    if (v === 3) {
      this.pixel(ctx, x + 6, y + 6, "#d8e8a0");
      this.pixel(ctx, x + 7, y + 6, "#d8e8a0");
    }
  },

  dirt(ctx, x, y, h) {
    this.fill(ctx, x, y, 16, 16, PALETTE.dirt);
    this.pixel(ctx, x + (h % 13), y + (h % 9) + 2, PALETTE.dirtLo);
    this.pixel(ctx, x + 4 + (h % 7), y + 10, PALETTE.dirtHi);
    if (h % 6 === 0) this.pixel(ctx, x + 9, y + 5, PALETTE.dirtPebble);
    if (h % 8 === 2) this.pixel(ctx, x + 3, y + 12, PALETTE.dirtLo);
  },

  shore(ctx, x, y, h) {
    this.fill(ctx, x, y, 16, 16, PALETTE.shore);
    this.pixel(ctx, x + (h % 12), y + 3, PALETTE.dirtHi);
    this.pixel(ctx, x + 8, y + 11, PALETTE.dirtLo);
  },

  stone(ctx, x, y, h) {
    this.fill(ctx, x, y, 16, 16, PALETTE.stone);
    this.fill(ctx, x, y, 16, 3, PALETTE.stoneHi);
    this.fill(ctx, x, y + 13, 16, 3, PALETTE.stoneLo);
    if (h % 3 === 0) this.pixel(ctx, x + 5, y + 7, PALETTE.stoneHi);
  },

  caveWall(ctx, x, y) {
    this.fill(ctx, x, y, 16, 16, "#5a6068");
    this.fill(ctx, x, y, 16, 5, "#7a828c");
    this.fill(ctx, x, y + 12, 16, 4, "#3a4048");
    this.pixel(ctx, x + 3, y + 7, "#9aa2aa");
    this.pixel(ctx, x + 11, y + 9, "#2a3038");
    this.pixel(ctx, x + 7, y + 4, "#b0b6bc");
  },

  caveFloor(ctx, x, y, h) {
    this.fill(ctx, x, y, 16, 16, "#3a424c");
    this.fill(ctx, x, y, 16, 2, "#4a5460");
    if (h % 4 === 0) this.pixel(ctx, x + 7, y + 9, "#2a88cc");
  },

  caveMouth(ctx, x, y) {
    this.ellipse(ctx, x, y - 10, 18, 16, "#3a4048");
    this.ellipse(ctx, x, y - 10, 14, 13, "#1a1e24");
    this.ellipse(ctx, x, y - 8, 9, 10, "#07080c");
    this.fill(ctx, x - 16, y - 4, 32, 6, "#4a5058");
    this.fill(ctx, x - 14, y - 3, 28, 3, "#6a727c");
  },

  dock(ctx, x, y) {
    this.fill(ctx, x, y, 16, 16, PALETTE.wood);
    this.fill(ctx, x, y, 16, 2, PALETTE.woodHi);
    this.fill(ctx, x, y + 5, 16, 1, PALETTE.woodLo);
    this.fill(ctx, x, y + 10, 16, 1, PALETTE.woodLo);
    this.fill(ctx, x, y + 14, 16, 2, PALETTE.woodLo);
    this.fill(ctx, x, y, 1, 16, PALETTE.woodLo);
    this.fill(ctx, x + 15, y, 1, 16, PALETTE.woodHi);
  },

  bridge(ctx, x, y) {
    this.dock(ctx, x, y);
    this.fill(ctx, x + 1, y, 2, 16, PALETTE.woodLo);
    this.fill(ctx, x + 13, y, 2, 16, PALETTE.woodLo);
  },

  water(ctx, x, y, kind, t, deep, golden, weather) {
    let base, deepC, hi;
    if (kind === TILE.POND) { base = PALETTE.pond; deepC = PALETTE.pondDeep; hi = PALETTE.pondHi; }
    else if (kind === TILE.RIVER) { base = PALETTE.river; deepC = PALETTE.riverDeep; hi = PALETTE.riverHi; }
    else if (kind === TILE.CAVE_WATER) { base = PALETTE.caveWater; deepC = PALETTE.caveDeep; hi = PALETTE.caveHi; }
    else if (kind === TILE.MARSH) { base = "#3a5a48"; deepC = "#1a3028"; hi = "#8cbc98"; }
    else { base = PALETTE.lake; deepC = PALETTE.lakeDeep; hi = PALETTE.lakeHi; }
    if (weather === "rain") { base = "#163848"; hi = "#6aa0b0"; }
    if (weather === "frost") hi = "#d0e8f8";

    this.fill(ctx, x, y, 16, 16, deep ? deepC : base);

    const flow = kind === TILE.RIVER ? t * 22 : t * 8;
    const phase = (x * 0.4 + y * 0.25 + flow);
    const lineY = y + 4 + ((Math.sin(phase) * 3 + 4) | 0);
    ctx.globalAlpha = 0.35;
    this.fill(ctx, x, lineY, 16, 1, hi);
    if (kind === TILE.RIVER) {
      const lineY2 = y + 10 + ((Math.sin(phase + 1.7) * 2 + 2) | 0);
      this.fill(ctx, x + 2, lineY2, 10, 1, hi);
    }
    ctx.globalAlpha = 1;

    if (kind === TILE.CAVE_WATER) {
      ctx.globalAlpha = 0.25 + Math.sin(t * 2.2 + x * 0.2) * 0.08;
      this.fill(ctx, x, y, 16, 16, PALETTE.caveHi);
      ctx.globalAlpha = 1;
    }
    this._windwardSwell(ctx, x, y, kind, t, hi);
    if (golden && (kind === TILE.LAKE || kind === TILE.RIVER)) {
      ctx.globalAlpha = 0.18;
      const gy = y + 6 + ((Math.sin(x * 0.5 + t * 3) * 2) | 0);
      this.fill(ctx, x, gy, 16, 1, "#f0d080");
      ctx.globalAlpha = 1;
    }
  },

  waterRipple(ctx, x, y, kind, t, golden, weather) {
    let hi = PALETTE.pondHi;
    if (kind === TILE.RIVER) hi = PALETTE.riverHi;
    else if (kind === TILE.CAVE_WATER) hi = PALETTE.caveHi;
    else if (kind === TILE.MARSH) hi = "#8cbc98";
    else if (kind === TILE.LAKE) hi = PALETTE.lakeHi;
    if (weather === "rain") hi = "#6aa0b0";
    if (weather === "frost") hi = "#d0e8f8";
    const flow = kind === TILE.RIVER ? t * 22 : t * 8;
    const phase = (x * 0.4 + y * 0.25 + flow);
    const lineY = y + 4 + ((Math.sin(phase) * 3 + 4) | 0);
    ctx.globalAlpha = 0.28;
    this.fill(ctx, x, lineY, 16, 1, hi);
    if (kind === TILE.RIVER) {
      const lineY2 = y + 10 + ((Math.sin(phase + 1.7) * 2 + 2) | 0);
      this.fill(ctx, x + 2, lineY2, 10, 1, hi);
    }
    ctx.globalAlpha = 1;
    this._windwardSwell(ctx, x, y, kind, t, hi);
    if (golden && (kind === TILE.LAKE || kind === TILE.RIVER)) {
      ctx.globalAlpha = 0.16;
      const gy = y + 6 + ((Math.sin(x * 0.5 + t * 3) * 2) | 0);
      this.fill(ctx, x, gy, 16, 1, "#f0d080");
      ctx.globalAlpha = 1;
    }
  },

  _windwardSwell(ctx, x, y, kind, t, hi) {
    if (typeof World === "undefined" || World.id !== "island") return;
    if (kind !== TILE.LAKE) return;
    const phase = x * 0.28 + y * 0.18 + t * 18;
    ctx.globalAlpha = 0.32;
    const y1 = y + 7 + ((Math.sin(phase) * 3.4 + 2) | 0);
    this.fill(ctx, x, y1, 16, 1, hi || PALETTE.lakeHi);
    const y2 = y + 12 + ((Math.sin(phase + 2.1) * 2.2 + 1) | 0);
    this.fill(ctx, x + 1, y2, 12, 1, hi || PALETTE.lakeHi);
    ctx.globalAlpha = 1;
  },

  /* ---------- world objects ---------- */
  treeOak(ctx, x, y, sway, shade) {
    const s = sway | 0;
    if (typeof Atlas !== "undefined" && Atlas.castShadow) Atlas.castShadow(ctx, x, y, 13, 3.2);
    else this.ellipse(ctx, x + (shade && shade.x || 0) * 1.1, y + 3, 14, 5, "rgba(12, 24, 12, 0.38)");
    this.fill(ctx, x - 2, y - 22, 4, 24, "#5a3a22");
    this.fill(ctx, x - 1, y - 22, 2, 24, "#7a5632");
    this.blob(ctx, x + s, y - 42, 18, "#1e4a24");
    this.blob(ctx, x - 10 + s, y - 36, 13, "#245428");
    this.blob(ctx, x + 11 + s, y - 36, 13, "#2f6a32");
    this.blob(ctx, x + 1 + s, y - 52, 12, "#3d7a38");
    this.blob(ctx, x + 6 + s, y - 48, 9, "#5a9a48");
    this.blob(ctx, x - 4 + s, y - 46, 7, "#6ab04a");
  },

  treePine(ctx, x, y, sway, shade) {
    const s = sway | 0;
    if (typeof Atlas !== "undefined" && Atlas.castShadow) Atlas.castShadow(ctx, x, y, 10, 3.2);
    else this.ellipse(ctx, x + (shade && shade.x || 0), y + 3, 11, 4, "rgba(12, 24, 12, 0.38)");
    this.fill(ctx, x - 2, y - 16, 4, 18, "#4a3220");
    this.fill(ctx, x - 1, y - 16, 2, 18, "#6a4a2c");
    const layers = [
      [14, -22, "#1a3e24"],
      [11, -34, "#245428"],
      [8, -46, "#2f6a32"],
      [5, -56, "#4a8a40"],
    ];
    for (const [r, oy, c] of layers) {
      this.fill(ctx, x - r + s, y + oy, r * 2, 8, c);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x + s, y + oy - 6);
      ctx.lineTo(x - r + s, y + oy + 4);
      ctx.lineTo(x + r + s, y + oy + 4);
      ctx.fill();
    }
  },

  rock(ctx, x, y, variant) {
    const w = variant % 2 ? 10 : 14;
    const h = variant % 2 ? 7 : 9;
    this.ellipse(ctx, x, y + 2, w * 0.5, 3, "rgba(12, 24, 12, 0.3)");
    this.blob(ctx, x, y - 2, w * 0.45, PALETTE.stoneLo);
    this.blob(ctx, x, y - 4, w * 0.4, PALETTE.stone);
    this.blob(ctx, x - 1, y - 6, w * 0.22, PALETTE.stoneHi);
    if (variant % 3 === 0) this.pixel(ctx, x + 2, y - 3, "#a0a8b0");
  },

  flower(ctx, x, y, variant) {
    const petals = variant % 3 === 0 ? "#f0e8e0" : variant % 3 === 1 ? "#e878a0" : "#d4a04a";
    this.pixel(ctx, x, y, "#2a6a28");
    this.pixel(ctx, x, y - 1, petals);
    this.pixel(ctx, x + 1, y - 1, petals);
    this.pixel(ctx, x, y - 2, petals);
    this.pixel(ctx, x + 1, y - 2, "#f8f0a8");
  },

  lily(ctx, x, y, t) {
    const bob = Math.sin(t * 1.3 + x * 0.1) * 0.6;
    this.ellipse(ctx, x, y + bob, 5, 3, "#2a6a38");
    this.ellipse(ctx, x - 1, y - 1 + bob, 4, 2, "#4a9a50");
    this.pixel(ctx, x + 1, y + bob, "#d8a0c0");
  },

  reed(ctx, x, y, t) {
    const s = Math.sin(t * 1.6 + x) * 1.2;
    ctx.strokeStyle = "#2a5a28";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + s, y - 8, x + s * 1.4, y - 14);
    ctx.stroke();
    this.pixel(ctx, x + s * 1.4, y - 15, "#c4a04a");
  },

  stump(ctx, x, y) {
    this.ellipse(ctx, x, y + 2, 6, 3, "rgba(12,24,12,0.3)");
    this.fill(ctx, x - 5, y - 4, 10, 6, PALETTE.woodLo);
    this.fill(ctx, x - 4, y - 6, 8, 3, PALETTE.wood);
    this.ellipse(ctx, x, y - 6, 4, 2, "#c4a070");
    this.ellipse(ctx, x, y - 6, 2, 1, PALETTE.woodLo);
  },

  fence(ctx, x, y, horiz) {
    if (horiz) {
      this.fill(ctx, x - 8, y - 6, 3, 10, PALETTE.woodLo);
      this.fill(ctx, x + 6, y - 6, 3, 10, PALETTE.woodLo);
      this.fill(ctx, x - 8, y - 8, 17, 2, PALETTE.wood);
      this.fill(ctx, x - 8, y - 4, 17, 2, PALETTE.woodHi);
    } else {
      this.fill(ctx, x - 1, y - 10, 3, 12, PALETTE.woodLo);
      this.fill(ctx, x - 1, y - 8, 3, 2, PALETTE.woodHi);
    }
  },

  sign(ctx, x, y) {
    this.fill(ctx, x - 1, y - 10, 2, 10, PALETTE.woodLo);
    this.fill(ctx, x - 6, y - 18, 12, 9, PALETTE.wood);
    this.fill(ctx, x - 5, y - 17, 10, 7, "#d4b07a");
    this.fill(ctx, x - 4, y - 15, 8, 1, PALETTE.woodLo);
    this.fill(ctx, x - 4, y - 13, 6, 1, PALETTE.woodLo);
  },

  crystal(ctx, x, y, t) {
    const glow = 0.45 + Math.sin(t * 2.4 + x) * 0.15;
    ctx.globalAlpha = glow * 0.35;
    this.blob(ctx, x, y - 4, 10, "#4ad0ff");
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#3aa0e0";
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x - 4, y);
    ctx.lineTo(x + 5, y);
    ctx.fill();
    ctx.fillStyle = "#8ce8ff";
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 5, y);
    ctx.fill();
    this.pixel(ctx, x + 1, y - 12, "#e8ffff");
  },

  crate(ctx, x, y) {
    this.fill(ctx, x - 5, y - 8, 10, 8, PALETTE.wood);
    this.fill(ctx, x - 5, y - 8, 10, 2, PALETTE.woodHi);
    this.fill(ctx, x - 5, y - 1, 10, 1, PALETTE.woodLo);
    this.fill(ctx, x - 1, y - 8, 1, 8, PALETTE.woodLo);
    this.crateIce(ctx, x, y);
  },

  crateIce(ctx, x, y) {
    this.fill(ctx, x - 6, y - 11, 12, 4, "#d4e8f0");
    this.fill(ctx, x - 6, y - 11, 12, 1, "#eef6fa");
    this.fill(ctx, x - 6, y - 8, 12, 1, "#b7d0dc");
    this.pixel(ctx, x - 3, y - 10, "#f4fafc");
    this.pixel(ctx, x + 2, y - 9, "#c8e0ea");
  },

  cooler(ctx, x, y) {
    this.crate(ctx, x, y);
  },

  shrub(ctx, x, y) {
    this.blob(ctx, x, y - 4, 6, "#2a5a28");
    this.blob(ctx, x + 2, y - 6, 4, "#4a8a40");
  },

  /* ---------- player (16x26, origin at feet) ---------- */
  player(ctx, x, y, state) {
    const dir = state.dir; // 0 down, 1 left, 2 right, 3 up
    const fishing = state.fishing;
    const hop = state.hop || 0;
    const walk = state.moving;
    const frame = state.frame | 0;
    const bob = state.idleBob || 0;
    const bite = state.fishState === "bite";
    const reel = state.fishState === "reel";
    const tug = Utils.clamp(state.tug || 0, -1, 1);
    const tugHard = Math.abs(tug) > 0.28;

    const bounce = walk ? (frame % 2 === 1 ? -2 : 0) : Math.round(bob);
    const crouch = fishing ? (bite || tugHard ? 3 : reel ? 2 + (Math.sin(state.rodPhase || 0) > 0 ? 1 : 0) : 2) : 0;
    const top = (y - 26 + bounce + crouch - hop) | 0;
    const left = (x - 8 + Math.round(tug * (2 + 2 * (state.tugW || 0)))) | 0;

    this.ellipse(ctx, x + (walk && dir === 2 ? 1 : walk && dir === 1 ? -1 : 0), y + 1, 6, 2.4, "rgba(10, 18, 10, 0.4)");

    const stride = walk ? frame : 0;

    if (dir === 3) {
      this._backpack(ctx, left + 3, top + 11);
      this._hairBack(ctx, left + 3, top + 1);
      this._head(ctx, left + 4, top + 4, "back", false);
      this._torso(ctx, left + 4, top + 12, "back");
      this._armsBack(ctx, left, top, fishing, stride);
      this._legs(ctx, left, top, dir, fishing, stride);
    } else if (dir === 0) {
      this._torso(ctx, left + 4, top + 12, "front");
      this._armsFront(ctx, left, top, fishing, stride);
      this._head(ctx, left + 4, top + 4, "front", state.blink);
      this._hairFront(ctx, left + 3, top);
      this._legs(ctx, left, top, dir, fishing, stride);
      this._straps(ctx, left + 5, top + 12);
    } else {
      this._side(ctx, left, top, dir === 1, fishing, walk, frame);
    }

    if (fishing) this._rod(ctx, x, y, dir, state.rodPhase || 0, state.windup, bite || tugHard);
    if (typeof Survival !== "undefined" && Survival.lanternLit && Survival.lanternLit()) {
      this.heldLantern(ctx, x, y, dir);
    }
  },

  playerSit(ctx, cx, cy, state) {
    const facing = (state && state.facing) | 0;
    const dir = (state && state.dir) | 0;
    const t = (state && state.t) || 0;
    const sc = (state && state.scale) || 1;
    const rock = Math.sin(t * 3.2) * (2.6 * sc);
    let px = cx + rock;
    let py = cy - 12 * sc;
    if (facing === 1) px -= 2 * sc;
    if (facing === 2) px += 2 * sc;
    if (facing === 3) py -= 4 * sc;
    const img = typeof Atlas !== "undefined" && Atlas.sheets && Atlas.sheets.player;
    const P = typeof Atlas !== "undefined" && Atlas.PLAYER;
    if (img && P) {
      const col = 1;
      const sx = col * P.w;
      const sy = (dir > 3 ? 0 : dir) * P.h;
      const crop = 50;
      const sitSc = 0.58 * sc;
      try {
        ctx.drawImage(img, sx, sy, P.w, crop,
          (px - P.ax * sitSc) | 0, (py - crop * sitSc) | 0,
          (P.w * sitSc) | 0, (crop * sitSc) | 0);
        return;
      } catch (err) { /* fall through */ }
    }
    this.fill(ctx, px - 4, py - 16, 8, 8, PALETTE.shirt);
    this.fill(ctx, px - 4, py - 22, 8, 8, PALETTE.skin);
    this.fill(ctx, px - 5, py - 24, 10, 4, PALETTE.hair);
  },

  playerTug(ctx, x, y, state) {
    this.player(ctx, x, y, state);
  },

  playerSleep(ctx, x, y) {
    this.ellipse(ctx, x + 1, y + 2, 7, 2.2, "rgba(10, 18, 10, 0.32)");
    this.fill(ctx, x - 1, y - 6, 12, 6, PALETTE.shirt);
    this.fill(ctx, x - 1, y - 6, 12, 2, PALETTE.shirtHi);
    this.fill(ctx, x + 9, y - 5, 5, 5, PALETTE.pants);
    this.fill(ctx, x + 12, y - 4, 3, 3, PALETTE.boot);
    this.fill(ctx, x - 8, y - 8, 7, 7, PALETTE.skin);
    this.fill(ctx, x - 8, y - 10, 7, 3, PALETTE.hair);
    this.fill(ctx, x - 7, y - 9, 5, 1, PALETTE.hairHi);
    this.fill(ctx, x - 6, y - 5, 3, 1, PALETTE.skinLo);
  },

  hudHunger(ctx, x, y) {
    this.fill(ctx, x + 10, y + 1, 3, 6, "#f4e8d0");
    this.pixel(ctx, x + 9, y + 1, "#f4e8d0");
    this.pixel(ctx, x + 13, y + 1, "#f4e8d0");
    this.fill(ctx, x + 2, y + 6, 9, 8, "#8a3a18");
    this.fill(ctx, x + 3, y + 7, 7, 6, "#b85a28");
    this.fill(ctx, x + 4, y + 8, 5, 4, "#d47838");
    this.pixel(ctx, x + 5, y + 9, "#E8913A");
  },

  hudWarmth(ctx, x, y) {
    this.fill(ctx, x + 2, y + 9, 12, 6, "#6a7078");
    this.fill(ctx, x + 3, y + 10, 10, 4, "#4a5058");
    this.fill(ctx, x + 4, y + 8, 8, 2, "#8a9098");
    this.fill(ctx, x + 6, y + 3, 4, 7, "#E8913A");
    this.fill(ctx, x + 7, y + 2, 2, 6, "#f0d060");
    this.pixel(ctx, x + 5, y + 5, "#e07030");
    this.pixel(ctx, x + 10, y + 5, "#e07030");
  },

  hudRest(ctx, x, y) {
    this.fill(ctx, x + 1, y + 4, 14, 9, "#e8d2a4");
    this.fill(ctx, x + 2, y + 5, 12, 7, "#f3e2c4");
    this.fill(ctx, x + 1, y + 8, 14, 1, "#c4a05a");
    this.fill(ctx, x + 8, y + 4, 1, 9, "#c4a05a");
    this.pixel(ctx, x + 3, y + 6, "#c4a05a");
    this.pixel(ctx, x + 12, y + 10, "#c4a05a");
  },

  _head(ctx, x, y, facing, blink) {
    this.fill(ctx, x, y, 8, 8, PALETTE.skin);
    this.fill(ctx, x, y + 6, 8, 2, PALETTE.skinLo);
    if (facing === "front") {
      this.pixel(ctx, x + 2, y + 3, PALETTE.hairLo);
      this.pixel(ctx, x + 5, y + 3, PALETTE.hairLo);
      if (blink) {
        this.fill(ctx, x + 2, y + 4, 2, 1, PALETTE.skinLo);
        this.fill(ctx, x + 5, y + 4, 2, 1, PALETTE.skinLo);
      } else {
        this.pixel(ctx, x + 2, y + 4, "#1a120c");
        this.pixel(ctx, x + 5, y + 4, "#1a120c");
      }
      this.pixel(ctx, x + 3, y + 6, PALETTE.skinLo);
      this.pixel(ctx, x + 4, y + 6, PALETTE.skinLo);
    }
  },

  _hairFront(ctx, x, y) {
    this.fill(ctx, x + 1, y + 2, 10, 4, PALETTE.hair);
    this.fill(ctx, x + 2, y, 8, 3, PALETTE.hair);
    this.pixel(ctx, x + 3, y, PALETTE.hairHi);
    this.pixel(ctx, x + 5, y + 1, PALETTE.hairHi);
    this.pixel(ctx, x, y + 3, PALETTE.hairLo);
    this.pixel(ctx, x + 11, y + 3, PALETTE.hairLo);
    this.pixel(ctx, x + 4, y + 4, PALETTE.hairLo);
    this.pixel(ctx, x + 7, y + 4, PALETTE.hairLo);
  },

  _hairBack(ctx, x, y) {
    this.fill(ctx, x, y, 10, 6, PALETTE.hair);
    this.fill(ctx, x + 1, y - 1, 8, 2, PALETTE.hairHi);
    this.pixel(ctx, x + 2, y - 2, PALETTE.hair);
    this.pixel(ctx, x + 6, y - 2, PALETTE.hairHi);
  },

  _torso(ctx, x, y, facing) {
    this.fill(ctx, x, y, 8, 8, PALETTE.shirt);
    this.fill(ctx, x, y, 8, 2, PALETTE.shirtHi);
    this.fill(ctx, x, y + 6, 8, 2, PALETTE.shirtLo);
    this.fill(ctx, x + 1, y + 7, 6, 2, PALETTE.belt);
    this.pixel(ctx, x + 3, y + 7, PALETTE.buckle);
    if (facing === "front") {
      this.pixel(ctx, x + 2, y + 3, PALETTE.shirtHi);
      this.pixel(ctx, x + 5, y + 3, PALETTE.shirtHi);
    }
  },

  _straps(ctx, x, y) {
    this.fill(ctx, x, y, 2, 6, PALETTE.packLo);
    this.fill(ctx, x + 4, y, 2, 6, PALETTE.packLo);
  },

  _backpack(ctx, x, y) {
    this.fill(ctx, x, y, 10, 10, PALETTE.pack);
    this.fill(ctx, x, y, 10, 2, PALETTE.packHi);
    this.fill(ctx, x + 1, y - 3, 8, 4, PALETTE.packLo);
    this.fill(ctx, x + 2, y - 4, 6, 2, "#d4c48a");
    this.pixel(ctx, x + 8, y + 4, PALETTE.packHi);
  },

  _legs(ctx, left, top, dir, fishing, stride) {
    const ly = top + 20;
    const aOff = fishing ? 0 : (stride === 0 || stride === 1 ? 2 : -1);
    const bOff = fishing ? 0 : (stride === 2 || stride === 3 ? 2 : -1);
    const aY = fishing ? 0 : (stride === 0 ? 1 : stride === 2 ? -1 : 0);
    const bY = fishing ? 0 : (stride === 2 ? 1 : stride === 0 ? -1 : 0);
    const a = 4 - aOff;
    const b = 8 + bOff;
    this.fill(ctx, left + a, ly + aY, 3, 4, PALETTE.pants);
    this.fill(ctx, left + b, ly + bY, 3, 4, PALETTE.pantsLo);
    this.fill(ctx, left + a, ly + 3 + aY, 3, 3, PALETTE.boot);
    this.fill(ctx, left + b, ly + 3 + bY, 3, 3, PALETTE.bootLo);
    this.fill(ctx, left + 5, ly - 1, 6, 2, PALETTE.pants);
  },

  _armsFront(ctx, left, top, fishing, stride) {
    if (fishing) {
      this.fill(ctx, left + 3, top + 14, 3, 3, PALETTE.skin);
      this.fill(ctx, left + 10, top + 14, 3, 3, PALETTE.skin);
      return;
    }
    const swing = stride === 0 || stride === 1 ? 1 : -1;
    this.fill(ctx, left + 2, top + 13 + swing, 2, 5, PALETTE.skinLo);
    this.fill(ctx, left + 12, top + 13 - swing, 2, 5, PALETTE.skin);
  },

  _armsBack(ctx, left, top, fishing, stride) {
    if (fishing) {
      this.fill(ctx, left + 4, top + 13, 2, 4, PALETTE.skinLo);
      this.fill(ctx, left + 10, top + 13, 2, 4, PALETTE.skin);
      return;
    }
    const swing = stride === 0 || stride === 1 ? 1 : -1;
    this.fill(ctx, left + 2, top + 13 - swing, 2, 5, PALETTE.skinLo);
    this.fill(ctx, left + 12, top + 13 + swing, 2, 5, PALETTE.skin);
  },

  _side(ctx, left, top, flip, fishing, walk, frame) {
    const f = flip ? -1 : 1;
    const cx = left + 8;
    const lean = walk ? f : 0;
    const packX = cx - (flip ? -2 : 6) - lean;
    this.fill(ctx, packX, top + 11, 8, 10, PALETTE.pack);
    this.fill(ctx, packX, top + 8, 8, 4, PALETTE.packLo);

    this.fill(ctx, cx - 3 + lean, top + 12, 6, 8, PALETTE.shirt);
    this.fill(ctx, cx - 3 + lean, top + 12, 6, 2, PALETTE.shirtHi);

    this.fill(ctx, cx - 4 + lean, top + 4, 8, 8, PALETTE.skin);
    this.fill(ctx, cx - 3 + lean, top + 1, 8, 5, PALETTE.hair);
    this.fill(ctx, cx - 2 + lean, top, 6, 2, PALETTE.hairHi);
    this.pixel(ctx, cx + (flip ? -2 : 2) + lean, top + 7, "#1a120c");

    const step = walk ? (frame % 2 === 0 ? 2 : -2) * f : 0;
    const lift = walk && frame % 2 === 0 ? -1 : 0;
    this.fill(ctx, cx - 2 + step + lean, top + 20 + lift, 3, 4, PALETTE.pants);
    this.fill(ctx, cx - 2 - step + lean, top + 20, 3, 3, PALETTE.pantsLo);
    this.fill(ctx, cx - 2 + step + lean, top + 23 + lift, 4, 3, PALETTE.boot);
    this.fill(ctx, cx - 2 - step + lean, top + 22, 3, 3, PALETTE.bootLo);

    if (fishing) {
      this.fill(ctx, cx + f * 5 + lean, top + 13, 6, 2, PALETTE.skin);
    } else {
      const arm = walk ? (frame % 2 === 0 ? -1 : 1) : 0;
      this.fill(ctx, cx + f * 3 + lean, top + 14 + arm, 2, 5, PALETTE.skinLo);
    }
  },

  _rod(ctx, x, y, dir, phase, windup, bite) {
    const tip = this.rodTip(x, y, dir, phase, windup, bite);
    const rod = typeof Inventory !== "undefined" ? Inventory.rod() : null;
    const id = rod && rod.id;
    const col = id === "spine" ? "#8ad4e8" : id === "finch" ? "#d4b05a" : "#4a3020";
    const wrap = id === "spine" ? "#3a7088" : id === "finch" ? "#8b6238" : "#2a6a8a";
    ctx.strokeStyle = col;
    ctx.lineWidth = id === "willow" ? 1.2 : 2.4;
    ctx.beginPath();
    ctx.moveTo(tip.handX, tip.handY);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    this.fill(ctx, tip.handX - 2, tip.handY - 2, 5, 5, wrap);
    this.pixel(ctx, tip.x, tip.y, id === "spine" ? "#e8ffff" : id === "finch" ? "#f0e0a0" : "#d0d4d8");
    if (id === "spine") this.pixel(ctx, tip.x + 1, tip.y - 1, "#a8f0ff");
    if (id === "finch") this.pixel(ctx, tip.x - 1, tip.y, "#c47838");
  },

  rodTip(x, y, dir, phase, windup, bite) {
    let lift = Math.sin(phase) * 1.2;
    if (windup) lift -= 6;
    if (bite) lift += 4 + Math.sin(phase * 8) * 2;
    const sheet = typeof Atlas !== "undefined" && Atlas.sheets && Atlas.sheets.player;
    const rod = sheet && Atlas.PLAYER && Atlas.PLAYER.rod && Atlas.PLAYER.rod[dir];
    if (rod) {
      return {
        x: x + rod.x,
        y: y + rod.y + lift,
        handX: x + (rod.hx || 0),
        handY: y + (rod.hy || -18),
      };
    }
    // Procedural fallback. Facing away, the rod is held out past the left shoulder,
    // so the line leaves from beside the body instead of through the pack.
    if (dir === 3) return { x: x - 11, y: y - 40 + lift, handX: x - 6, handY: y - 17 };
    if (dir === 0) return { x: x + 11, y: y - 18 + lift, handX: x + 5, handY: y - 12 };
    if (dir === 1) return { x: x - 18, y: y - 21 + lift, handX: x - 6, handY: y - 12 };
    return { x: x + 18, y: y - 21 + lift, handX: x + 6, handY: y - 12 };
  },

  lanternPos(x, y, dir) {
    if (dir === 0) return { x: x + 9, y: y - 8 };
    if (dir === 3) return { x: x - 8, y: y - 10 };
    if (dir === 1) return { x: x - 11, y: y - 9 };
    return { x: x + 11, y: y - 9 };
  },

  heldLantern(ctx, x, y, dir) {
    const p = this.lanternPos(x, y, dir | 0);
    if (typeof Atlas !== "undefined" && Atlas.draw(ctx, "lanternHeld", p.x, p.y)) return;
    this.fill(ctx, p.x - 3, p.y - 6, 6, 5, "#c4a05a");
    this.fill(ctx, p.x - 2, p.y - 5, 4, 3, "#f0d060");
    this.fill(ctx, p.x - 1, p.y - 8, 2, 2, PALETTE.woodLo);
    this.pixel(ctx, p.x, p.y - 4, "#fff4c0");
  },

  bobber(ctx, x, y, dunk, bite) {
    const by = y + dunk;
    const ripple = 6 + Math.abs(dunk) * 1.4;
    ctx.globalAlpha = 0.32;
    this.ellipse(ctx, x, y + 2, ripple, 2.4, "#e8f4f8");
    ctx.globalAlpha = 0.18;
    this.ellipse(ctx, x, y + 2, ripple + 4, 3.2, "#ffffff");
    ctx.globalAlpha = 1;
    this.ellipse(ctx, x, by + 1, 4, 3, "#1a120c");
    this.blob(ctx, x, by - 1, 3.2, PALETTE.bobberWhite);
    this.fill(ctx, x - 3, by - 4, 6, 4, PALETTE.bobberRed);
    this.fill(ctx, x - 2, by - 5, 4, 2, "#f07070");
    this.pixel(ctx, x - 1, by - 4, "#f8b0b0");
    this.pixel(ctx, x + 1, by - 1, "#ffffff");
    this.fill(ctx, x, by - 7, 1, 3, "#efe8d8");
    if (bite) {
      ctx.globalAlpha = 0.55;
      this.ellipse(ctx, x, y + 2, 10, 3.5, "#ffffff");
      ctx.globalAlpha = 1;
    }
  },

  fishingLine(ctx, x0, y0, x1, y1, sag) {
    const rod = typeof Inventory !== "undefined" ? Inventory.rod() : null;
    const mx = (x0 + x1) * 0.5;
    const my = (y0 + y1) * 0.5 + sag;
    const col = rod && rod.id === "spine" ? "rgba(140, 210, 230, 0.95)"
      : rod && rod.id === "finch" ? "rgba(220, 180, 90, 0.95)"
      : PALETTE.line;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = col;
    ctx.lineWidth = rod && rod.id !== "willow" ? 1.7 : 1.25;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
  },

  fishIcon(ctx, x, y, colorOrFish, silhouette) {
    let fish = null;
    let color = "#8ad";
    if (colorOrFish && typeof colorOrFish === "object") {
      fish = colorOrFish;
      if (fish.color) color = fish.color;
    } else if (typeof colorOrFish === "string") {
      if (colorOrFish.charAt(0) === "#" || !colorOrFish) color = colorOrFish || color;
      else if (typeof FISH !== "undefined") {
        fish = FISH.find((k) => k.id === colorOrFish) || null;
        color = fish ? fish.color : colorOrFish;
      } else color = colorOrFish;
    }
    if (fish && typeof Atlas !== "undefined" && Atlas.drawFish(ctx, fish, x, y, { silhouette: !!silhouette })) {
      return;
    }
    const c = silhouette ? "#2a241c" : color;
    const id = fish && fish.id;
    if (id === "tideperch" || id === "skipjack" || id === "duskrunner" || id === "galeor") {
      this._islandFish(ctx, x, y, id, c, !!silhouette);
      return;
    }
    this.ellipse(ctx, x, y, 7, 4, c);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 11, y - 4);
    ctx.lineTo(x + 11, y + 4);
    ctx.fill();
    if (!silhouette) {
      this.pixel(ctx, x - 4, y - 1, "#1a1a1a");
      this.pixel(ctx, x + 1, y - 2, "#ffffff");
    }
  },

  _islandFish(ctx, x, y, id, c, silhouette) {
    if (id === "tideperch") {
      this.ellipse(ctx, x, y, 6, 5, c);
      this.fill(ctx, x - 1, y - 6, 3, 3, c);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + 10, y - 3);
      ctx.lineTo(x + 10, y + 3);
      ctx.fill();
    } else if (id === "skipjack") {
      this.ellipse(ctx, x, y, 9, 3, c);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + 13, y - 5);
      ctx.lineTo(x + 11, y);
      ctx.lineTo(x + 13, y + 5);
      ctx.closePath();
      ctx.fill();
    } else if (id === "duskrunner") {
      this.ellipse(ctx, x + 1, y, 8, 3, c);
      this.fill(ctx, x - 2, y - 1, 8, 2, c);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 1);
      ctx.lineTo(x + 13, y + 6);
      ctx.lineTo(x + 8, y + 3);
      ctx.fill();
    } else {
      this.ellipse(ctx, x - 1, y, 8, 6, c);
      this.fill(ctx, x - 7, y - 2, 4, 4, c);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x + 6, y);
      ctx.lineTo(x + 10, y - 2);
      ctx.lineTo(x + 10, y + 2);
      ctx.fill();
    }
    if (!silhouette) {
      this.pixel(ctx, x - 4, y - 1, "#1a1a1a");
      this.pixel(ctx, x + 1, y - 2, "#ffffff");
    }
  },

  mist(ctx, x, y, t, seed) {
    const ox = Math.sin(t * 0.35 + seed) * 10;
    const oy = Math.sin(t * 0.22 + seed * 2) * 3;
    ctx.globalAlpha = 0.14 + Math.sin(t * 0.6 + seed) * 0.05;
    this.ellipse(ctx, x + ox, y + oy, 16, 6, "#e8f0f8");
    this.ellipse(ctx, x + ox + 8, y + oy + 2, 12, 4, "#d0e0f0");
    ctx.globalAlpha = 1;
  },

  wood(ctx, x, y, h) {
    this.fill(ctx, x, y, 16, 16, PALETTE.wood);
    this.fill(ctx, x, y, 16, 2, PALETTE.woodHi);
    if (h % 3 === 0) this.fill(ctx, x, y + 8, 16, 1, PALETTE.woodLo);
  },

  npc(ctx, x, y, color) {
    this.ellipse(ctx, x, y + 2, 5, 2, "rgba(12,18,10,0.35)");
    this.fill(ctx, x - 3, y - 10, 6, 8, color || "#c45a5a");
    this.fill(ctx, x - 2, y - 14, 4, 4, PALETTE.skin);
    this.fill(ctx, x - 3, y - 16, 6, 3, PALETTE.hair);
  },

  pickup(ctx, x, y, item) {
    const c = item === "glow" || item === "crystal" ? "#6ae0ff"
      : item === "berries" ? "#c45a5a"
      : item === "saltberries" ? "#d8c070"
      : item === "millreed" ? "#5a8a48"
      : item === "crickets" ? "#8a7a30" : "#6a4a28";
    this.fill(ctx, x - 2, y - 3, 4, 4, c);
    this.pixel(ctx, x, y - 4, "#f3e2c4");
  },

  cottage(ctx, x, y) {
    this.fill(ctx, x - 22, y - 28, 44, 28, PALETTE.wood);
    this.fill(ctx, x - 22, y - 28, 44, 6, PALETTE.woodHi);
    ctx.fillStyle = "#6a3030";
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 26);
    ctx.lineTo(x, y - 42);
    ctx.lineTo(x + 26, y - 26);
    ctx.fill();
    this.fill(ctx, x - 4, y - 14, 8, 14, "#2a1c12");
    this.fill(ctx, x - 14, y - 18, 6, 6, "#c8e0f0");
  },

  raft(ctx, x, y) {
    this.ellipse(ctx, x, y + 6, 18, 6, "rgba(20, 40, 50, 0.3)");
    ctx.fillStyle = PALETTE.woodLo;
    ctx.beginPath();
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x - 11, y - 8);
    ctx.lineTo(x + 11, y - 8);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x + 11, y + 7);
    ctx.lineTo(x - 11, y + 7);
    ctx.closePath();
    ctx.fill();
    this.fill(ctx, x - 10, y - 7, 20, 2, PALETTE.woodHi);
    this.fill(ctx, x - 9, y - 1, 18, 1, PALETTE.wood);
    this.fill(ctx, x - 8, y + 3, 16, 1, PALETTE.wood);
    this.fill(ctx, x - 1, y - 6, 2, 11, PALETTE.woodLo);
    this.fill(ctx, x + 8, y - 11, 11, 2, PALETTE.woodLo);
    this.fill(ctx, x + 17, y - 12, 4, 3, "#d8c8a0");
  },

  bed(ctx, x, y) {
    this.fill(ctx, x - 10, y - 8, 22, 14, PALETTE.woodLo);
    this.fill(ctx, x - 8, y - 6, 18, 8, "#d8c8a0");
    this.fill(ctx, x - 8, y - 10, 8, 5, "#f3e2c4");
  },

  tank(ctx, x, y, t) {
    this.fill(ctx, x - 14, y - 16, 28, 18, "#1a3a48");
    this.fill(ctx, x - 14, y - 16, 28, 2, PALETTE.woodHi);
    const aq = (Save.data && Save.data.cottage.aquarium) || [];
    for (let i = 0; i < aq.length; i++) {
      const f = FISH.find((k) => k.id === aq[i]);
      const ox = Math.sin(t * 1.4 + i) * 8;
      Sprites.fishIcon(ctx, x + ox - 4, y - 8, f || "#8ad", false);
    }
  },

  trophyWall(ctx, x, y) {
    this.fill(ctx, x - 14, y - 20, 28, 20, PALETTE.wood);
    this.fill(ctx, x - 14, y - 20, 28, 3, PALETTE.woodHi);
    const wall = (Save.data && Save.data.cottage && Save.data.cottage.trophies) || [];
    if (!wall.length) {
      this.fill(ctx, x - 3, y - 12, 6, 8, "#c4a05a");
      return;
    }
    wall.slice(0, (typeof DESIGN !== "undefined" && DESIGN.trophySlots) || 2).forEach((id, i) => {
      const f = FISH.find((k) => k.id === id);
      Sprites.fishIcon(ctx, x - 6 + i * 12, y - 8, f || "#c4a05a", false);
    });
  },

  bench(ctx, x, y) {
    this.fill(ctx, x - 14, y - 8, 28, 10, PALETTE.wood);
    this.fill(ctx, x - 14, y - 8, 28, 2, PALETTE.woodHi);
    this.fill(ctx, x - 13, y - 6, 26, 1, "#6a4a28");
    this.fill(ctx, x - 12, y + 2, 3, 4, PALETTE.woodLo);
    this.fill(ctx, x + 9, y + 2, 3, 4, PALETTE.woodLo);
    this.fill(ctx, x - 9, y - 6, 9, 5, "#4a4048");
    this.fill(ctx, x - 8, y - 5, 7, 3, "#6a6068");
    this.fill(ctx, x, y - 4, 4, 1, "#3a3038");
    this.fill(ctx, x + 4, y - 8, 7, 6, "#6a3a28");
    this.fill(ctx, x + 5, y - 9, 5, 2, "#8b4a32");
    this.pixel(ctx, x + 11, y - 6, "#5a3020");
    this.pixel(ctx, x + 6, y - 11, "#f3e2c4");
    this.pixel(ctx, x + 7, y - 12, "#e8d2a4");
    this.pixel(ctx, x + 5, y - 10, "#f3e2c499");
  },

  calendar(ctx, x, y) {
    this.fill(ctx, x - 6, y - 12, 12, 14, "#f3e2c4");
    this.fill(ctx, x - 6, y - 12, 12, 3, "#8b3a32");
  },

  dayclock(ctx, x, y) {
    this.fill(ctx, x - 9, y - 18, 18, 18, PALETTE.wood);
    this.fill(ctx, x - 9, y - 18, 18, 2, PALETTE.woodHi);
    this.ellipse(ctx, x, y - 9, 7, 7, "#efe4c8");
    this.ellipse(ctx, x, y - 9, 6, 6, "#f8f0dc");
    const ph = typeof TimeCycle !== "undefined" ? TimeCycle.phaseId() : "day";
    const col = ph === "night" ? "#d8e0f0" : ph === "golden" ? "#e07030" : ph === "dawn" ? "#f0a060" : "#f0d060";
    this.ellipse(ctx, x + 2, y - 10, 3, 3, col);
    this.fill(ctx, x, y - 9, 1, 4, "#5a381c");
    this.fill(ctx, x, y - 9, 3, 1, "#8b6238");
  },

  mailtray(ctx, x, y) {
    this.fill(ctx, x - 8, y - 4, 16, 6, PALETTE.woodHi);
    this.fill(ctx, x - 6, y - 6, 10, 4, "#e8d2a4");
  },

  certificate(ctx, x, y) {
    this.fill(ctx, x - 6, y - 10, 12, 12, "#f3e2c4");
    this.fill(ctx, x - 6, y - 10, 12, 2, "#c4a05a");
    this.fill(ctx, x - 3, y - 6, 6, 1, "#8b6238");
    this.fill(ctx, x - 4, y - 3, 8, 1, "#8b6238");
  },

  /** Wax seal beside the certificate. Pixels mark which stamp came first. No stamp, no seal. */
  hearthSeal(ctx, x, y) {
    const s = (typeof Stamps !== "undefined" && Stamps.earliest) ? Stamps.earliest() : null;
    if (!s) return;
    this.ellipse(ctx, x, y - 8, 5, 5, "#7a3030");
    this.ellipse(ctx, x, y - 8, 3, 3, "#e8d4a8");
    const n = Math.max(1, Math.min(6, (s.index | 0) + 1));
    for (let i = 0; i < n; i++) this.pixel(ctx, x - 4 + i * 2, y - 2, "#6a2820");
  },

  _sheet(id) {
    return typeof Atlas !== "undefined" && Atlas.sheets && Atlas.sheets[id];
  },

  _deco(ctx, id, x, y, opt) {
    if (!id || !this._sheet(id)) return false;
    return Atlas.drawSheet(ctx, id, x, y, opt || {});
  },

  rug(ctx, x, y, facing, opt) {
    opt = opt || {};
    const rot = (facing === 1 || facing === 2) ? Math.PI / 2 : 0;
    if (this._deco(ctx, "decoRug", x, y, { ax: 36, ay: 32, rot, flip: !!opt.flip, scale: opt.scale || 1 })) return;
    this.fill(ctx, x - 22, y - 8, 44, 16, "#c4b08a");
    this.fill(ctx, x - 20, y - 6, 40, 12, "#e8d8b8");
    this.fill(ctx, x - 18, y - 4, 36, 8, "#d4c4a0");
    this.fill(ctx, x - 10, y - 1, 20, 2, "#8a9a6a");
  },

  lampshelf(ctx, x, y, facing, opt) {
    opt = opt || {};
    const left = facing === 1;
    const id = left && this._sheet("decoLampshelfLeft") ? "decoLampshelfLeft" : "decoLampshelf";
    const flip = !!opt.flip || (left && id === "decoLampshelf");
    if (this._deco(ctx, id, x, y, { flip, scale: opt.scale || 1 })) return;
    this.fill(ctx, x - 10, y - 10, 20, 4, PALETTE.wood);
    this.fill(ctx, x - 10, y - 10, 20, 1, PALETTE.woodHi);
    this.fill(ctx, x - 8, y - 16, 4, 6, "#f3e2c4");
    this.fill(ctx, x - 7, y - 18, 2, 3, "#f0c060");
    this.pixel(ctx, x - 6, y - 20, "#f8e8a0");
    this.fill(ctx, x + 2, y - 14, 6, 4, "#8aaa6a");
  },

  curtain(ctx, x, y, facing) {
    const right = facing === 2;
    const id = right && this._sheet("decoCurtainRight") ? "decoCurtainRight" : "decoCurtain";
    if (this._deco(ctx, id, x, y, { flip: right && id === "decoCurtain" })) return;
    this.fill(ctx, x - 8, y - 22, 16, 3, PALETTE.wood);
    this.fill(ctx, x - 7, y - 19, 6, 22, "#efe4c8");
    this.fill(ctx, x - 1, y - 19, 6, 22, "#e4d4b0");
    this.fill(ctx, x - 7, y - 19, 12, 2, "#f8f0dc");
  },

  flowerbox(ctx, x, y, facing, opt) {
    opt = opt || {};
    const three = facing === 0 || facing === 2;
    const id = three && this._sheet("decoFlowerbox3q") ? "decoFlowerbox3q" : "decoFlowerbox";
    if (this._deco(ctx, id, x, y, { flip: !!opt.flip || facing === 1, scale: opt.scale || 1 })) return;
    this.fill(ctx, x - 10, y - 6, 20, 8, PALETTE.wood);
    this.fill(ctx, x - 9, y - 5, 18, 2, PALETTE.woodHi);
    this.fill(ctx, x - 8, y - 10, 4, 5, "#6a8a4a");
    this.fill(ctx, x - 2, y - 12, 4, 7, "#7a9a58");
    this.fill(ctx, x + 4, y - 10, 4, 5, "#5a7a40");
    this.pixel(ctx, x - 6, y - 12, "#d8c07a");
    this.pixel(ctx, x + 5, y - 12, "#c4a05a");
  },

  chair(ctx, x, y, t, facing, opt) {
    opt = opt || {};
    const sc = opt.scale || 1;
    const rock = t ? Math.sin(t * 3.2) * (2.6 * sc) : 0;
    const cx = x + rock;
    const flip = !!opt.flip || facing === 1;
    let id = "decoChair";
    if (t && this._sheet("decoChairRock")) id = "decoChairRock";
    else if (facing === 3 && this._sheet("decoChairBack")) id = "decoChairBack";
    else if (flip && this._sheet("decoChairLeft")) id = "decoChairLeft";
    if (this._deco(ctx, id, cx, y, { flip: flip && id !== "decoChairLeft", scale: sc })) return;
    this.fill(ctx, cx - 7, y - 4, 14, 6, PALETTE.wood);
    this.fill(ctx, cx - 7, y - 4, 14, 1, PALETTE.woodHi);
    this.fill(ctx, cx - 6, y - 16, 12, 12, "#e8d8b8");
    this.fill(ctx, cx - 6, y - 16, 12, 2, PALETTE.wood);
    this.fill(ctx, cx - 8, y + 2 + (rock > 0 ? 1 : 0), 3, 4, PALETTE.woodLo);
    this.fill(ctx, cx + 5, y + 2 + (rock < 0 ? 1 : 0), 3, 4, PALETTE.woodLo);
    this.fill(ctx, cx - 10, y + 4, 8, 2, PALETTE.wood);
    this.fill(ctx, cx + 2, y + 4, 8, 2, PALETTE.wood);
  },

  mill(ctx, x, y) {
    if (typeof Atlas !== "undefined" && Atlas.draw(ctx, "mill", x, y)) return;
    this.fill(ctx, x - 18, y - 28, 36, 28, PALETTE.wood);
    this.fill(ctx, x - 18, y - 28, 36, 4, PALETTE.woodHi);
    ctx.fillStyle = "#6a3030";
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 26);
    ctx.lineTo(x, y - 44);
    ctx.lineTo(x + 22, y - 26);
    ctx.fill();
    this.fill(ctx, x - 4, y - 14, 8, 14, "#2a1c12");
    this.fill(ctx, x - 14, y - 18, 6, 6, "#c8e0f0");
    this.ellipse(ctx, x + 20, y - 8, 8, 8, PALETTE.woodLo);
    this.fill(ctx, x + 19, y - 16, 2, 16, PALETTE.wood);
    this.fill(ctx, x + 12, y - 9, 16, 2, PALETTE.wood);
  },

  shelf(ctx, x, y, facing, opt) {
    opt = opt || {};
    const three = facing === 1 || facing === 2;
    const id = three && this._sheet("decoShelf3q") ? "decoShelf3q" : "decoShelf";
    if (this._deco(ctx, id, x, y, { flip: !!opt.flip || facing === 1, scale: opt.scale || 1 })) return;
    this.fill(ctx, x - 12, y - 8, 24, 4, PALETTE.wood);
    this.fill(ctx, x - 12, y - 8, 24, 1, PALETTE.woodHi);
    this.fill(ctx, x - 10, y - 14, 6, 6, "#efe4c8");
    this.fill(ctx, x - 2, y - 12, 5, 4, "#8aaa6a");
    this.fill(ctx, x + 5, y - 13, 4, 5, "#c4a05a");
  },

  mat(ctx, x, y, facing, opt) {
    opt = opt || {};
    const rot = (facing === 1 || facing === 2) ? Math.PI / 2 : 0;
    if (this._deco(ctx, "decoMat", x, y, { ax: 32, ay: 24, rot, flip: !!opt.flip, scale: opt.scale || 1 })) return;
    this.fill(ctx, x - 14, y - 6, 28, 10, "#6a7a50");
    this.fill(ctx, x - 12, y - 4, 24, 6, "#8a9a68");
    this.fill(ctx, x - 10, y - 2, 20, 2, "#c4b08a");
  },

  campfire(ctx, x, y, t) {
    this.fill(ctx, x - 6, y - 2, 12, 4, PALETTE.woodLo);
    this.fill(ctx, x - 5, y - 3, 10, 2, PALETTE.wood);
    const flicker = 4 + Math.sin((t || 0) * 11) * 1.5;
    this.fill(ctx, x - 2, y - 2 - flicker, 4, flicker, "#e07030");
    this.fill(ctx, x - 1, y - 2 - flicker * 0.7, 2, flicker * 0.7, "#f0d060");
  },
};
