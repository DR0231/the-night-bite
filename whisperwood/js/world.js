/* Hand-authored maps: Whisperwood Vale overworld and Crystal Cave interior. */

const World = {
  id: "vale",
  maps: {},
  tiles: null,
  solids: [],
  decos: [],
  spots: [],
  portals: [],
  spawn: { x: 0, y: 0 },
  w: 0,
  h: 0,
  pw: 0,
  ph: 0,
  portalCool: 0,

  generate() {
    this.maps.vale = this._buildVale();
    this.maps.cave = this._buildCave();
    this.maps.cottage = Cottage.build();
    this.maps.marsh = Marsh.build();
    this.maps.island = Island.build();
    this.use("vale");
  },

  use(id) {
    const m = this.maps[id];
    if (!m) return;
    this.id = id;
    this.tiles = m.tiles;
    this.solids = m.solids;
    this.decos = m.decos;
    this.spots = m.spots;
    this.portals = m.portals;
    this.spawn = m.spawn;
    this.w = m.w;
    this.h = m.h;
    this.pw = m.pw;
    this.ph = m.ph;
    this.get = m.get;
  },

  _buildMap(tw, th, fill, paint) {
    const tiles = new Uint8Array(tw * th);
    for (let i = 0; i < tiles.length; i++) tiles[i] = fill;

    const set = (tx, ty, v) => {
      if (tx < 0 || ty < 0 || tx >= tw || ty >= th) return;
      tiles[ty * tw + tx] = v;
    };
    const get = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= tw || ty >= th) return TILE.CAVE_WALL;
      return tiles[ty * tw + tx];
    };
    const solids = [];
    const decos = [];
    const spots = [];
    const portals = [];
    const addSolid = (x, y, w, h, kind) => solids.push({ x, y, w, h, kind });
    const addDeco = (type, x, y, extra) => decos.push(Object.assign({ type, x, y }, extra || {}));
    const fillEllipse = (cx, cy, rx, ry, v) => {
      const y0 = Math.floor(cy - ry - 1);
      const y1 = Math.ceil(cy + ry + 1);
      const x0 = Math.floor(cx - rx - 1);
      const x1 = Math.ceil(cx + rx + 1);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1) set(x, y, v);
        }
      }
    };
    /** Two-tile dirt path between tile points; never paints over water, docks, or rock. */
    const paintPath = (x0, y0, x1, y1) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const tx = Math.round(x0 + (x1 - x0) * (i / n));
        const ty = Math.round(y0 + (y1 - y0) * (i / n));
        for (let oy = 0; oy <= 1; oy++) {
          for (let ox = 0; ox <= 1; ox++) {
            const t = get(tx + ox, ty + oy);
            if (WATER_TILES.has(t) || t === TILE.CAVE_WALL || t === TILE.DOCK || t === TILE.BRIDGE) continue;
            set(tx + ox, ty + oy, TILE.DIRT);
          }
        }
      }
    };
    /** Grass touching water becomes shore, so banks read as banks. */
    const shoreAll = () => {
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          if (get(x, y) !== TILE.GRASS) continue;
          let w = false;
          for (let oy = -1; oy <= 1 && !w; oy++) for (let ox = -1; ox <= 1; ox++) {
            if (WATER_TILES.has(get(x + ox, y + oy))) { w = true; break; }
          }
          if (w) set(x, y, TILE.SHORE);
        }
      }
    };

    /** True when a world point sits inside a placed trunk/rock/wall footprint (pickup scatter uses it). */
    const solidAt = (px, py) => solids.some((s) => s.kind !== "border"
      && px >= s.x - 3 && px <= s.x + s.w + 3 && py >= s.y - 3 && py <= s.y + s.h + 3);

    const spawn = paint({ tw, th, set, get, addSolid, addDeco, fillEllipse, paintPath, shoreAll, solidAt, spots, portals })
      || { x: tw * TILE_SIZE * 0.5, y: th * TILE_SIZE * 0.5 };

    for (let ty = 0; ty < th; ty++) {
      for (let tx = 0; tx < tw; tx++) {
        if (get(tx, ty) === TILE.CAVE_WALL) {
          addSolid(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE, "wall");
        }
      }
    }
    addSolid(-8, -8, tw * TILE_SIZE + 16, 10, "border");
    addSolid(-8, th * TILE_SIZE - 2, tw * TILE_SIZE + 16, 12, "border");
    addSolid(-8, 0, 10, th * TILE_SIZE, "border");
    addSolid(tw * TILE_SIZE - 2, 0, 12, th * TILE_SIZE, "border");

    /* Safety net: a pickup that still sits inside a trunk, rock, or wall footprint is dropped. */
    for (let i = decos.length - 1; i >= 0; i--) {
      const d = decos[i];
      if (d.type === "pickup" && solidAt(d.x, d.y)) decos.splice(i, 1);
    }

    return {
      tiles, solids, decos, spots, portals, spawn, get,
      w: tw, h: th, pw: tw * TILE_SIZE, ph: th * TILE_SIZE,
    };
  },

  _buildVale() {
    const tw = CONFIG.MAP_W, th = CONFIG.MAP_H;
    return this._buildMap(tw, th, TILE.GRASS, ({ set, get, addSolid, addDeco, fillEllipse, solidAt, spots, portals }) => {
      const rng = mulberry32(0x57A1E);

      fillEllipse(13, 24, 8, 6, TILE.POND);

      for (let x = 16; x <= 46; x++) {
        const y = 8 + Math.round(Math.sin(x * 0.28) * 2.2);
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = 0; ox <= 1; ox++) set(x + ox, y + oy, TILE.RIVER);
        }
      }

      fillEllipse(50, 24, 9, 8, TILE.LAKE);
      fillEllipse(56, 22, 3, 2, TILE.GRASS);

      const paintPath = (x0, y0, x1, y1) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) {
          const tx = Math.round(x0 + (x1 - x0) * (i / n));
          const ty = Math.round(y0 + (y1 - y0) * (i / n));
          for (let oy = 0; oy <= 1; oy++) {
            for (let ox = 0; ox <= 1; ox++) {
              const t = get(tx + ox, ty + oy);
              if (!WATER_TILES.has(t) && t !== TILE.CAVE_WALL) {
                set(tx + ox, ty + oy, TILE.DIRT);
              }
            }
          }
        }
      };
      paintPath(20, 24, 42, 24);
      // North road: junction up to the bridge, then a short bank on the far side.
      paintPath(31, 4, 31, 35);

      for (let y = 1; y < th - 1; y++) {
        for (let x = 1; x < tw - 1; x++) {
          if (get(x, y) !== TILE.GRASS && get(x, y) !== TILE.DIRT) continue;
          let water = false;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            if (WATER_TILES.has(get(x + ox, y + oy))) water = true;
          }
          if (water && get(x, y) === TILE.GRASS) set(x, y, TILE.SHORE);
        }
      }

      for (let x = 18; x <= 21; x++) set(x, 24, TILE.DOCK);
      set(17, 24, TILE.DOCK);
      set(17, 25, TILE.DOCK);

      for (let x = 41; x <= 44; x++) set(x, 24, TILE.DOCK);

      // The river bends here; the bridge runs bank to bank over the whole bend.
      for (let x = 31; x <= 33; x++) {
        for (let y = 6; y <= 12; y++) set(x, y, TILE.BRIDGE);
      }

      // South hill: solid rock with a north-facing mouth into Crystal Cave.
      for (let y = 36; y <= 47; y++) {
        for (let x = 24; x <= 40; x++) {
          const dx = (x - 32) / 8, dy = (y - 42) / 6;
          if (dx * dx + dy * dy <= 1) set(x, y, TILE.CAVE_WALL);
        }
      }
      for (let x = 30; x <= 34; x++) {
        set(x, 35, TILE.DIRT);
        set(x, 36, TILE.DIRT);
        set(x, 37, TILE.DIRT);
        set(x, 38, TILE.CAVE_FLOOR);
        set(x, 39, TILE.CAVE_FLOOR);
      }
      // Seal the back of the mouth so the hill is only a doorway.
      for (let x = 30; x <= 34; x++) set(x, 40, TILE.CAVE_WALL);

      for (let y = 20; y <= 23; y++) for (let x = 26; x <= 29; x++) {
        if (get(x, y) !== TILE.DIRT) set(x, y, TILE.GRASS);
      }
      set(27, 23, TILE.DIRT);
      set(28, 23, TILE.DIRT);
      set(27, 24, TILE.DIRT);
      set(28, 24, TILE.DIRT);

      // Trees keep two tiles off water so nobody fishes from behind a canopy.
      const nearPathOrWater = (tx, ty) => {
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const t = get(tx + ox, ty + oy);
          if (t === TILE.DIRT || t === TILE.DOCK || t === TILE.BRIDGE || t === TILE.SHORE) return true;
          if (WATER_TILES.has(t)) return true;
          if (t === TILE.CAVE_FLOOR || t === TILE.CAVE_WALL || t === TILE.WOOD || t === TILE.STONE) return true;
        }
        return false;
      };

      for (let ty = 2; ty < th - 2; ty++) {
        for (let tx = 2; tx < tw - 2; tx++) {
          if (get(tx, ty) !== TILE.GRASS && get(tx, ty) !== TILE.SHORE) continue;
          if (nearPathOrWater(tx, ty)) continue;
          const edge = tx < 4 || ty < 4 || tx > tw - 5 || ty > th - 5;
          const dens = edge ? 0.28 : 0.065;
          if (rng() > dens) continue;
          const px = tx * TILE_SIZE + 8 + Utils.irand(rng, -3, 3);
          const py = ty * TILE_SIZE + 12 + Utils.irand(rng, -2, 2);
          const pine = rng() < 0.45;
          addDeco(pine ? "pine" : "oak", px, py, { seed: rng() * 20 });
          addSolid(px - 4, py - 3, 8, 5, "tree");
        }
      }

      for (let i = 0; i < 22; i++) {
        const tx = 18 + Utils.irand(rng, 0, 28);
        const ty = 6 + Utils.irand(rng, 0, 6);
        if (!WATER_TILES.has(get(tx, ty)) && get(tx, ty) !== TILE.BRIDGE) {
          const px = tx * TILE_SIZE + 8, py = ty * TILE_SIZE + 10;
          addDeco("rock", px, py, { variant: Utils.irand(rng, 0, 5) });
          addSolid(px - 5, py - 3, 10, 6, "rock");
        }
      }

      // Bramble's sitting stump on the pond's east shore. Interact.sit reads `sit`.
      addDeco("stump", 20 * TILE_SIZE, 21 * TILE_SIZE, { sit: true });
      addSolid(20 * TILE_SIZE - 5, 21 * TILE_SIZE - 3, 10, 5, "stump");
      for (let i = 0; i < 18; i++) {
        addDeco("flower", (8 + rng() * 14) * TILE_SIZE, (19 + rng() * 12) * TILE_SIZE, { variant: i });
      }
      for (let i = 0; i < 8; i++) {
        addDeco("lily", (10 + rng() * 8) * TILE_SIZE, (22 + rng() * 6) * TILE_SIZE, { seed: i });
      }
      for (let i = 0; i < 6; i++) {
        addDeco("reed", (9 + rng() * 10) * TILE_SIZE, (21 + rng() * 8) * TILE_SIZE);
      }

      for (let i = 0; i < 6; i++) {
        addDeco("fence", (44 + i * 1.4) * TILE_SIZE, 16 * TILE_SIZE, { horiz: true });
        addSolid((44 + i * 1.4) * TILE_SIZE - 6, 16 * TILE_SIZE - 4, 14, 4, "fence");
      }
      addDeco("shrub", 56 * TILE_SIZE, 22 * TILE_SIZE);
      for (let i = 0; i < 7; i++) {
        addDeco("mist", (46 + rng() * 12) * TILE_SIZE, (20 + rng() * 10) * TILE_SIZE, { seed: rng() * 8 });
      }
      for (let i = 0; i < 8; i++) {
        addDeco("reed", (45 + rng() * 10) * TILE_SIZE, (20 + rng() * 10) * TILE_SIZE);
      }

      addDeco("caveMouth", 32.5 * TILE_SIZE, 39.4 * TILE_SIZE);
      addDeco("rock", 28.8 * TILE_SIZE, 36.8 * TILE_SIZE, { variant: 2 });
      addSolid(28.8 * TILE_SIZE - 5, 36.8 * TILE_SIZE - 3, 10, 6, "rock");
      addDeco("rock", 36.2 * TILE_SIZE, 36.9 * TILE_SIZE, { variant: 4 });
      addSolid(36.2 * TILE_SIZE - 5, 36.9 * TILE_SIZE - 3, 10, 6, "rock");
      addDeco("fence", 28.6 * TILE_SIZE, 36.1 * TILE_SIZE, { horiz: true });
      addDeco("fence", 35.8 * TILE_SIZE, 36.1 * TILE_SIZE, { horiz: true });
      addSolid(27.2 * TILE_SIZE, 36 * TILE_SIZE - 4, 8, 5, "fence");
      addSolid(35.2 * TILE_SIZE, 36 * TILE_SIZE - 4, 8, 5, "fence");
      addDeco("sign", 29.2 * TILE_SIZE, 35.4 * TILE_SIZE, { read: "Crystal Cave. Glow bait. The pool is still and the strikes are wild." });
      addSolid(29.2 * TILE_SIZE - 3, 35.4 * TILE_SIZE - 3, 6, 4, "sign");

      addDeco("sign", 30.4 * TILE_SIZE, 26.6 * TILE_SIZE, { read: "West: Calm Pond. East: Deep Misty Lake. North: Rocky River. South: Crystal Cave." });
      addDeco("sign", 34.8 * TILE_SIZE, 25.4 * TILE_SIZE, { read: "Wren’s stall. Bait, rods, and cottage kits. The board lists today’s ask." });
      addSolid(30.4 * TILE_SIZE - 3, 26.6 * TILE_SIZE - 3, 6, 4, "sign");
      addSolid(34.8 * TILE_SIZE - 3, 25.4 * TILE_SIZE - 3, 6, 4, "sign");
      // Field cooler at the pond dock root, off the planks so the dock end stays for fishing.
      addDeco("crate", 24.8 * TILE_SIZE, 23.4 * TILE_SIZE);
      addSolid(24.8 * TILE_SIZE - 5, 23.4 * TILE_SIZE - 4, 10, 6, "crate");
      // North bank: a marker where the road ends past the bridge.
      addDeco("sign", 33.8 * TILE_SIZE, 4.6 * TILE_SIZE, { read: "North bank. The river runs east to the lake. Crickets on the hook; cast downstream." });
      addSolid(33.8 * TILE_SIZE - 3, 4.6 * TILE_SIZE - 3, 6, 4, "sign");

      addDeco("cottage", 28 * TILE_SIZE, 24 * TILE_SIZE);
      for (let y = 20; y <= 22; y++) {
        for (let x = 26; x <= 29; x++) {
          addSolid(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, "wall");
        }
      }
      addSolid(26 * TILE_SIZE, 23 * TILE_SIZE, TILE_SIZE, TILE_SIZE, "wall");
      addSolid(29 * TILE_SIZE, 23 * TILE_SIZE, TILE_SIZE, TILE_SIZE, "wall");
      for (let x = 56; x <= 63; x++) {
        set(x, 23, TILE.RIVER);
        set(x, 24, TILE.RIVER);
        if (get(x, 22) === TILE.GRASS || get(x, 22) === TILE.SHORE) set(x, 22, TILE.SHORE);
      }
      for (let x = 57; x <= 61; x++) set(x, 25, TILE.DOCK);
      set(58, 26, TILE.DOCK);
      set(59, 26, TILE.DOCK);
      // East boat to the millpond. Interact reads `boat`; the gate flag stays fifthWater.
      addDeco("raft", 59.2 * TILE_SIZE, 24.9 * TILE_SIZE, {
        boat: {
          to: "marsh", spawn: { x: 9.2 * TILE_SIZE, y: 16.6 * TILE_SIZE }, dir: 2, gate: "fifthWater",
          label: "Board the millpond boat", lashed: "The east boat is lashed. Come back with more of the vale.",
          lashedNote: "The boat stays lashed until the vale knows you.",
        },
      });
      // Water signs stand at each dock root, beside the path, so the planks stay for casting.
      addDeco("waterSign", 22.5 * TILE_SIZE, 23.5 * TILE_SIZE, { spot: "pond" });
      addDeco("waterSign", 33.6 * TILE_SIZE, 13.5 * TILE_SIZE, { spot: "river" });
      addDeco("waterSign", 40.6 * TILE_SIZE, 26.5 * TILE_SIZE, { spot: "lake" });
      addSolid(22.5 * TILE_SIZE - 3, 23.5 * TILE_SIZE - 3, 6, 4, "sign");
      addSolid(33.6 * TILE_SIZE - 3, 13.5 * TILE_SIZE - 3, 6, 4, "sign");
      addSolid(40.6 * TILE_SIZE - 3, 26.5 * TILE_SIZE - 3, 6, 4, "sign");

      Pickups.scatter(addDeco, get, rng, tw, th, "vale", solidAt);

      for (let i = 0; i < 40; i++) {
        const tx = 4 + Utils.irand(rng, 0, tw - 8);
        const ty = 4 + Utils.irand(rng, 0, th - 8);
        if (get(tx, ty) === TILE.GRASS || get(tx, ty) === TILE.SHORE) {
          addDeco("flower", tx * TILE_SIZE + rng() * 12, ty * TILE_SIZE + rng() * 12, { variant: i });
        }
      }

      spots.push(
        {
          ...SPOTS.pond,
          x: 10 * TILE_SIZE, y: 18 * TILE_SIZE, w: 16 * TILE_SIZE, h: 14 * TILE_SIZE,
          cast: { x: 14 * TILE_SIZE, y: 24.5 * TILE_SIZE },
        },
        {
          ...SPOTS.river,
          x: 18 * TILE_SIZE, y: 4 * TILE_SIZE, w: 28 * TILE_SIZE, h: 10 * TILE_SIZE,
          cast: { x: 36 * TILE_SIZE, y: 8.5 * TILE_SIZE },
        },
        {
          ...SPOTS.lake,
          x: 42 * TILE_SIZE, y: 16 * TILE_SIZE, w: 18 * TILE_SIZE, h: 16 * TILE_SIZE,
          cast: { x: 50 * TILE_SIZE, y: 24.5 * TILE_SIZE },
        },
      );

      portals.push({
        x: 30 * TILE_SIZE,
        y: 37.4 * TILE_SIZE,
        w: 5 * TILE_SIZE,
        h: 2.6 * TILE_SIZE,
        to: "cave",
        spawn: { x: 18 * TILE_SIZE, y: 6.4 * TILE_SIZE },
        dir: 0,
        hint: "Walk in to enter Crystal Cave",
      });
      portals.push({
        x: 27.15 * TILE_SIZE,
        y: 23.15 * TILE_SIZE,
        w: 1.7 * TILE_SIZE,
        h: 0.85 * TILE_SIZE,
        to: "cottage",
        spawn: { x: 11 * TILE_SIZE, y: 12.2 * TILE_SIZE },
        dir: 3,
        hint: "Walk in to your cottage",
      });

      return { x: 32.5 * TILE_SIZE, y: 26.2 * TILE_SIZE };
    });
  },

  _buildCave() {
    const tw = 36, th = 30;
    return this._buildMap(tw, th, TILE.CAVE_WALL, ({ set, get, addSolid, addDeco, fillEllipse, solidAt, spots, portals }) => {
      const rng = mulberry32(0xCA7E);

      fillEllipse(18, 16, 14.2, 11.2, TILE.CAVE_FLOOR);
      fillEllipse(12, 12, 6, 5, TILE.CAVE_FLOOR);
      fillEllipse(24, 13, 5.5, 4.5, TILE.CAVE_FLOOR);
      fillEllipse(18, 22, 8, 4, TILE.CAVE_FLOOR);

      for (let y = 1; y <= 9; y++) {
        for (let x = 16; x <= 20; x++) set(x, y, TILE.CAVE_FLOOR);
      }

      fillEllipse(18, 17, 9, 6, TILE.CAVE_WATER);
      fillEllipse(22, 16, 3, 2, TILE.CAVE_WATER);

      for (let x = 16; x <= 20; x++) set(x, 10, TILE.CAVE_FLOOR);
      for (let x = 16; x <= 20; x++) set(x, 11, TILE.DOCK);
      for (let x = 17; x <= 19; x++) set(x, 12, TILE.DOCK);
      set(18, 13, TILE.DOCK);

      const crystals = [
        [8, 10], [10, 20], [7, 16], [27, 10], [29, 18], [26, 22],
        [12, 24], [23, 24], [9, 13], [28, 14],
      ];
      for (const [tx, ty] of crystals) {
        if (get(tx, ty) !== TILE.CAVE_FLOOR) continue;
        const px = tx * TILE_SIZE + 8, py = ty * TILE_SIZE + 10;
        addDeco("crystal", px, py);
        addSolid(px - 3, py - 2, 6, 4, "crystal");
      }

      addDeco("crystal", 22.2 * TILE_SIZE, 16.4 * TILE_SIZE);
      addDeco("crystal", 14.6 * TILE_SIZE, 18.2 * TILE_SIZE);

      for (let i = 0; i < 10; i++) {
        addDeco("mist", (12 + rng() * 14) * TILE_SIZE, (14 + rng() * 8) * TILE_SIZE, { seed: rng() * 8 });
      }

      addDeco("waterSign", 20.2 * TILE_SIZE, 9.2 * TILE_SIZE, { spot: "cave" });
      addDeco("crate", 16.2 * TILE_SIZE, 8.6 * TILE_SIZE);
      addSolid(16.2 * TILE_SIZE - 5, 8.6 * TILE_SIZE - 4, 10, 6, "crate");
      Pickups.scatter(addDeco, get, rng, tw, th, "cave", solidAt);

      spots.push({
        ...SPOTS.cave,
        x: 6 * TILE_SIZE, y: 8 * TILE_SIZE, w: 24 * TILE_SIZE, h: 18 * TILE_SIZE,
        cast: { x: 18 * TILE_SIZE, y: 17.4 * TILE_SIZE },
      });

      portals.push({
        x: 16 * TILE_SIZE,
        y: 1 * TILE_SIZE,
        w: 5 * TILE_SIZE,
        h: 2.4 * TILE_SIZE,
        to: "vale",
        spawn: { x: 32.5 * TILE_SIZE, y: 36.1 * TILE_SIZE },
        dir: 3,
        hint: "Walk out to the vale",
      });

      return { x: 18 * TILE_SIZE, y: 6.4 * TILE_SIZE };
    });
  },

  tileAt(px, py) {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    return this.get(tx, ty);
  },

  isWaterAt(px, py) {
    return WATER_TILES.has(this.tileAt(px, py));
  },

  walkablePoint(px, py) {
    const t = this.tileAt(px, py);
    if (!WALKABLE.has(t)) return false;
    for (const s of this.solids) {
      if (px >= s.x && px < s.x + s.w && py >= s.y && py < s.y + s.h) return false;
    }
    return true;
  },

  rectClear(x, y, w, h) {
    const pts = [
      [x, y], [x + w, y], [x, y + h], [x + w, y + h],
      [x + w * 0.5, y], [x + w * 0.5, y + h],
      [x, y + h * 0.5], [x + w, y + h * 0.5],
      [x + w * 0.5, y + h * 0.5],
    ];
    for (const [px, py] of pts) {
      if (!this.walkablePoint(px, py)) return false;
    }
    return true;
  },

  nearestWater(px, py, range) {
    const r = range || CONFIG.FISH_RANGE;
    const t0x = Math.floor((px - r) / TILE_SIZE);
    const t0y = Math.floor((py - r) / TILE_SIZE);
    const t1x = Math.floor((px + r) / TILE_SIZE);
    const t1y = Math.floor((py + r) / TILE_SIZE);
    let best = null, bestD = r;
    for (let ty = t0y; ty <= t1y; ty++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        const t = this.get(tx, ty);
        if (!WATER_TILES.has(t)) continue;
        const cx = tx * TILE_SIZE + 8;
        const cy = ty * TILE_SIZE + 8;
        const d = Utils.dist(px, py, cx, cy);
        if (d <= r && (best === null || d < bestD)) {
          bestD = d;
          best = { x: cx, y: cy, tile: t, dist: d };
        }
      }
    }
    return best;
  },

  spotAt(px, py) {
    for (const s of this.spots) {
      if (px >= s.x && py >= s.y && px <= s.x + s.w && py <= s.y + s.h) return s;
    }
    return null;
  },

  portalAt(px, py) {
    for (const p of this.portals) {
      if (px >= p.x && py >= p.y && px < p.x + p.w && py < p.y + p.h) return p;
    }
    return null;
  },

  /**
   * Move a foot point out of any portal box and onto walkable ground.
   * Tries the facing direction first (0 down, 1 left, 2 right, 3 up), then the
   * others, then falls back to the map spawn so nobody loads into water or a door.
   */
  settlePoint(px, py, dir) {
    const ok = (x, y) => !this.portalAt(x, y) && this.walkablePoint(x, y)
      && x > 8 && y > 8 && x < this.pw - 8 && y < this.ph - 8;
    if (ok(px, py)) return { x: px, y: py };
    const dirs = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    const face = dirs[dir === 3 ? 1 : dir === 1 ? 2 : dir === 2 ? 3 : 0];
    for (let step = 2; step <= 40; step += 2) {
      const x = px + face[0] * step, y = py + face[1] * step;
      if (ok(x, y)) return { x, y };
    }
    for (let step = 2; step <= 96; step += 2) {
      for (const [dx, dy] of dirs) {
        const x = px + dx * step, y = py + dy * step;
        if (ok(x, y)) return { x, y };
      }
    }
    return { x: this.spawn.x, y: this.spawn.y };
  },

  nearPortal(px, py, pad = 20) {
    for (const p of this.portals) {
      if (px >= p.x - pad && py >= p.y - pad && px < p.x + p.w + pad && py < p.y + p.h + pad) {
        return p;
      }
    }
    return null;
  },

  inCave() {
    return this.id === "cave";
  },

  indoor() {
    return this.id === "cave" || this.id === "cottage";
  },

  update(dt) {
    if (this.portalCool > 0) this.portalCool -= dt;
  },
};
