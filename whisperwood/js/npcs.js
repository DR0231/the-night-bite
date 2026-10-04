/* Three vale NPCs, gifts, talk, shop hook. */

const Npcs = {
  talkId: null,
  _acc: 0,

  list() { return NPC_DATA; },

  state(id) { return Save.data.npcs[id]; },

  at(px, py) {
    if (World.id !== "vale") return null;
    let best = null, bestD = CONFIG.NPC_RANGE;
    for (const n of NPC_DATA) {
      const d = Utils.dist(px, py, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  },

  try() {
    const n = this.at(Player.x, Player.y);
    if (!n) return false;
    this.talk(n);
    return true;
  },

  /** Heart rating first, then one short line. Never a paragraph. */
  talk(n) {
    const st = this.state(n.id);
    const cap = DESIGN.npcHeartCap;
    const hearts = Math.min(cap, st.hearts | 0);
    const rank = hearts >= 3 ? "dear" : hearts >= 2 ? "friend" : hearts >= 1 ? "acquaintance" : "stranger";
    const dots = "♥".repeat(hearts) + "♡".repeat(Math.max(0, cap - hearts));
    const spine = typeof MillSpine !== "undefined" ? MillSpine.stage() : "none";
    const visits = (st.talks = (st.talks | 0) + 1);
    let line;
    if (typeof MillSpine !== "undefined" && MillSpine.stage() === "turning" && n.turningLine && visits % 2 === 1) {
      line = n.turningLine;
    } else if ((n.id === "bramble" || n.id === "lark") && spine !== "none" && !(typeof MillSpine !== "undefined" && MillSpine.atLeast("done")) && visits % 2 === 1) {
      line = "The east mill’s gone quiet.";
    } else if (st.lastCatchRemembered && visits % 3 === 0) {
      line = `That ${st.lastCatchRemembered} still sits with me.`;
    } else if (n.role === "shop" && visits % 2 === 0 && Skills.rank() >= 3) {
      line = Skills.rank() >= 5 ? "Lanterns for the long walk home."
        : Skills.rank() >= 4 ? "A cloak if the frost is in."
          : "A campfire kit’s on the stall if you’re ranging at night.";
    } else {
      line = (hearts > 0 && n.hearts[hearts - 1]) || n.greet;
    }
    if (n.role === "shop") Shop.open();
    this._show(n.name, `${dots} ${rank}. ${line}`, n);
  },

  rememberCatch(fish) {
    for (const n of NPC_DATA) {
      const st = this.state(n.id);
      st.lastCatchRemembered = fish.name;
    }
    Save.data.player.lastCatchName = fish.name;
  },

  gift(n) {
    const st = this.state(n.id);
    if (st.giftedToday) {
      this._show(n.name, "One gift a day is plenty.", n);
      return;
    }
    const min = DESIGN.giftMinCaught;
    const favFish = n.fav ? FISH.find((f) => f.id === n.fav) : null;
    let give = null;
    if (favFish && Save.countLoose(favFish.id) >= min) give = favFish;
    if (!give) {
      let best = 0;
      for (const f of FISH) {
        if (f.rarity === "Rare") continue;
        const c = Save.countLoose(f.id);
        if (c >= min && c > best) { best = c; give = f; }
      }
    }
    if (!give) {
      this._show(n.name, favFish ? `Keep the first of each. Bring me a spare ${favFish.name} sometime.` : "Keep the first of each. Bring me a duplicate sometime.", n);
      return;
    }
    Save.takeOldestLoose(give.id);
    Save.syncCaught();
    st.giftedToday = 1;
    st.hearts = Math.min(DESIGN.npcHeartCap, (st.hearts | 0) + 1);
    let line;
    const article = Utils.an(give.name, true);
    if (favFish && give.id === favFish.id) {
      const fb = n.favBait;
      if (fb && BAIT[fb[0]]) Inventory.addBait(fb[0], fb[1] | 0);
      line = (n.giftFav || "{A}! You remembered.").replace("{A}", article) + (fb && BAIT[fb[0]] ? ` Take ${fb[1] === 1 ? "this" : "these"} ${BAIT[fb[0]].name.toLowerCase()}.` : "");
    } else {
      line = (n.giftOther || "{A}. Kind of you.").replace("{A}", article);
    }
    this._show(n.name, line, n);
    Save.mark("gift");
    this._checkMarsh();
  },

  _checkMarsh() {
    const unique = Journal.count();
    const hearts = NPC_DATA.some((n) => (this.state(n.id).hearts | 0) >= DESIGN.millpondHearts);
    if (unique >= DESIGN.millpondUnique && Save.data.cottage.visited && hearts) {
      Save.data.flags.fifthWater = true;
    }
    if (Save.data.flags.fifthWater && typeof MillSpine !== "undefined") MillSpine.onOpened();
    if (Save.data.flags.fifthWater && typeof Stamps !== "undefined") {
      try { Stamps.try("marshOpen"); } catch (e) { /* stamp optional */ }
    }
  },

  _show(name, line, n) {
    const el = document.getElementById("dialog");
    if (!el) return;
    el.classList.remove("hidden");
    document.getElementById("dialog-name").textContent = name;
    document.getElementById("dialog-line").textContent = line;
    const gift = document.getElementById("dialog-gift");
    if (gift) {
      gift.classList.toggle("hidden", !n);
      gift.onclick = () => { if (n) this.gift(n); };
    }
    this.talkId = n ? n.id : null;
  },

  close() {
    const el = document.getElementById("dialog");
    if (el) el.classList.add("hidden");
    this.talkId = null;
  },

  update(dt) {
    if (World.id !== "vale") return;
    this._acc += dt;
    if (this._acc < 2.4) return;
    this._acc = 0;
    const leash = DESIGN.npcWander || 10;
    for (const n of NPC_DATA) {
      if (n.homeX == null) { n.homeX = n.x; n.homeY = n.y; }
      if (Math.random() >= 0.35) continue;
      // Shuffle in place, but stay on a leash and on dry, open ground.
      const nx = Utils.clamp(n.x + (Math.random() - 0.5) * 10, n.homeX - leash, n.homeX + leash);
      const ny = Utils.clamp(n.y + (Math.random() - 0.5) * 8, n.homeY - leash * 0.6, n.homeY + leash * 0.6);
      if (World.walkablePoint(nx, ny) && !World.isWaterAt(nx, ny)) { n.x = nx; n.y = ny; }
    }
  },

  draw(ctx) {
    if (World.id !== "vale") return;
    for (const n of NPC_DATA) {
      Sprites.npc(ctx, n.x, n.y, n.color);
    }
  },
};

/* One millpond passer-by. No hearts, no gifts, no wander. Present or not is a day roll. */
const Passer = {
  present() {
    if (typeof World === "undefined" || World.id !== "marsh" || !Save.data) return false;
    const day = Save.data.clock.day | 0;
    const n = (Save.data.worldSeed ^ (day * 2654435761) ^ 0x70617373) >>> 0;
    return mulberry32(n)() < 0.5;
  },

  pos() {
    const p = (typeof MARSH_PASSER !== "undefined" && MARSH_PASSER) || { x: 28, y: 25.2 };
    return { x: p.x * TILE_SIZE, y: p.y * TILE_SIZE };
  },

  near() {
    if (!this.present()) return false;
    const p = this.pos();
    return Utils.dist(Player.x, Player.y, p.x, p.y) < CONFIG.NPC_RANGE;
  },

  talk() {
    const line = (typeof MARSH_PASSER !== "undefined" && MARSH_PASSER.line) || "Just passing.";
    UI.toastNote(line);
    return true;
  },

  sync() {
    if (!World.maps || !World.maps.marsh || !World.maps.marsh.decos) return;
    const decos = World.maps.marsh.decos;
    let i = -1;
    for (let k = 0; k < decos.length; k++) if (decos[k].passer) { i = k; break; }
    const show = this.present();
    if (show && i < 0) {
      const p = this.pos();
      decos.push({ type: "npc", x: p.x, y: p.y, color: "#5c6b62", passer: true });
    } else if (!show && i >= 0) {
      decos.splice(i, 1);
    }
  },
};

/* E does one thing at a time. Cottage, pickups, and people come first; then the
   nearest of stump / weeds / boat / cooler / sign; fishing only if none of those
   is in reach. hint() reads the same pick, so the prompt never lies about E. */
const Interact = {
  try() {
    if (World.id === "cottage" && Cottage.try()) return true;
    if (Pickups.try()) return true;
    if (Npcs.try()) return true;
    if (typeof Passer !== "undefined" && Passer.near()) return Passer.talk();
    const near = this._nearest();
    if (near) {
      if (near.kind === "sit") return this._sit();
      if (near.kind === "weeds") return this._weeds();
      if (near.kind === "boat") return this._boat(near.deco);
      if (near.kind === "crate") { Cooler.open(); return true; }
      if (near.kind === "sign") return this._readSign(near.deco);
    }
    // A campfire kit only lights on open ground, away from water and other E-things.
    if (this._plantFire()) return true;
    return false;
  },

  /** Talk, pickup, and cottage beat the idle Fish line. */
  priorityHint() {
    if (World.id === "cottage") return Cottage.hint();
    const pick = Pickups.near();
    if (pick) return `Press E to pick ${pick}`;
    const n = Npcs.at(Player.x, Player.y);
    if (n) return `Press E to talk to ${n.name}`;
    if (typeof Passer !== "undefined" && Passer.near()) return "Press E to greet the passer-by";
    return "";
  },

  hint() {
    const first = this.priorityHint();
    if (first) return first;
    const near = this._nearest();
    if (near) {
      if (near.kind === "sit") return "Press E to sit on the stump until dusk or dawn";
      if (near.kind === "weeds") return "Press E to clear weeds";
      if (near.kind === "boat") {
        const b = near.deco.boat;
        return this._boatOpen(b) ? (b.label || "Press E to board the boat") : (b.lashed || "The boat stays lashed.");
      }
      if (near.kind === "crate") return "Press E — field cooler";
      if (near.kind === "sign") return near.deco.type === "waterSign" ? "Press E to read the water sign" : "Press E to read the sign";
    }
    if (Survival.atFire() && !World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE)) return "Sit by the fire";
    if (Survival.canPlantFire()) return "Press E to set a campfire";
    return "";
  },

  /** Anything E would act on besides fishing, or null. Radii live on DESIGN. */
  _nearest() {
    const px = Player.x, py = Player.y;
    let best = null;
    const offer = (kind, d, r, deco) => {
      if (d >= r) return;
      // Compare by how deep inside each reach we are, so a small sign can beat a wide boat.
      const score = d / r;
      if (!best || score < best.score) best = { kind, d, score, deco: deco || null };
    };
    if (World.id !== "cottage") {
      for (const d of World.decos) {
        const dist = Utils.dist(px, py, d.x, d.y);
        if (d.type === "waterSign" || d.type === "sign") {
          if (!this._signYields(d)) offer("sign", dist, DESIGN.signRange, d);
        }
        else if (d.type === "crate") offer("crate", dist, DESIGN.crateRange, d);
        else if (d.type === "raft" && d.boat) offer("boat", dist, DESIGN.boatRange, d);
        else if (d.type === "stump" && d.sit) offer("sit", dist, DESIGN.sitRange, d);
      }
    }
    if (World.id === "vale" && (Save.data.cottage.weeds | 0) > 0) {
      offer("weeds", Utils.dist(px, py, 27.5 * TILE_SIZE, 24.4 * TILE_SIZE), 28, null);
    }
    return best;
  },

  /* With water in casting reach, a sign only takes E when the player faces it. Facing water always means fish. */
  _signYields(d) {
    if (!World.nearestWater(Player.x, Player.y, CONFIG.FISH_RANGE)) return false;
    const dx = d.x - Player.x, dy = d.y - Player.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const dir = Player.dir; // 0 down, 1 left, 2 right, 3 up
    const facing = (dir === 0 && dy > 0 && ay >= ax) || (dir === 3 && dy < 0 && ay >= ax)
      || (dir === 1 && dx < 0 && ax >= ay) || (dir === 2 && dx > 0 && ax >= ay);
    return !facing;
  },

  _readSign(d) {
    if (!d) return false;
    try { AudioFX.page(); } catch (err) { /* cue optional */ }
    if (d.type === "waterSign" && d.spot) {
      const s = SPOTS[d.spot];
      UI.toastNote(Journal.signText(d.spot), s ? s.name : "Water");
    } else {
      const turning = d.readTurning && typeof MillSpine !== "undefined" && MillSpine.stage() === "turning";
      UI.toastNote(turning ? d.readTurning : (d.read || "The paint has worn away."), d.title || "Sign");
    }
    return true;
  },

  _plantFire() {
    return Survival.plantFire();
  },

  _sit() {
    const night = TimeCycle.phaseId() === "night";
    Weather.skipTo(night ? "dawn" : "golden");
    Survival.add("rest", 35);
    Survival.add("warmth", 15);
    UI.toastNote(night ? "You dozed until dawn." : "You sat until golden hour.");
    return true;
  },

  _weeds() {
    if (World.id !== "vale" || Save.data.cottage.weeds <= 0) return false;
    Save.data.cottage.weeds = 0;
    UI.toastNote("The cottage path is clear.");
    Save.mark();
    return true;
  },

  _boatOpen(b) {
    if (!b || !b.gate) return true;
    if (b.gate === "islandOpen") return typeof Island !== "undefined" && Island.open();
    return !!(Save.data.flags && Save.data.flags[b.gate]);
  },

  _boat(deco) {
    const b = deco && deco.boat;
    if (!b) return false;
    if (!this._boatOpen(b)) {
      UI.toastNote(b.lashedNote || b.lashed || "The boat stays lashed.");
      return true;
    }
    Game.warp({ to: b.to, spawn: { x: b.spawn.x, y: b.spawn.y }, dir: b.dir | 0 });
    return true;
  },
};
