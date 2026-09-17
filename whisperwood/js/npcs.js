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

  talk(n) {
    const st = this.state(n.id);
    const hearts = Math.min(DESIGN.npcHeartCap, st.hearts | 0);
    let line = n.greet;
    if (st.lastCatchRemembered) line = `That ${st.lastCatchRemembered} still sits with me. ` + line;
    const cap = DESIGN.npcHeartCap;
    const rank = hearts >= 3 ? "dear" : hearts >= 2 ? "friend" : hearts >= 1 ? "acquaintance" : "stranger";
    const dots = "♥".repeat(hearts) + "♡".repeat(Math.max(0, cap - hearts));
    if (hearts > 0) line = n.hearts[hearts - 1] || line;
    line = `${dots} ${rank}. ` + line;
    if (n.role === "shop") {
      if (Skills.rank() >= 5) line = "Lanterns for the long walk home. " + line;
      else if (Skills.rank() >= 4) line = "A cloak if the frost is in. " + line;
      else if (Skills.rank() >= 3) line = "A campfire kit’s on the stall if you’re ranging at night. " + line;
      Shop.open();
    }
    this._show(n.name, line, n);
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
    const extra = FISH.find((f) => Save.countLoose(f.id) >= DESIGN.giftMinCaught);
    if (!extra) {
      this._show(n.name, "Keep the first of each. Bring me a duplicate sometime.", n);
      return;
    }
    Save.takeOldestLoose(extra.id);
    Save.syncCaught();
    st.giftedToday = 1;
    st.hearts = Math.min(DESIGN.npcHeartCap, (st.hearts | 0) + 1);
    this._show(n.name, n.hearts[st.hearts - 1] || "That’s kind.", n);
    Save.mark("gift");
    this._checkMarsh();
  },

  _checkMarsh() {
    const unique = Journal.count();
    const hearts = NPC_DATA.some((n) => (this.state(n.id).hearts | 0) >= DESIGN.millpondHearts);
    if (unique >= DESIGN.millpondUnique && Save.data.cottage.visited && hearts) {
      Save.data.flags.fifthWater = true;
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
    for (const n of NPC_DATA) {
      if (Math.random() < 0.35) {
        n.x += (Math.random() - 0.5) * 10;
        n.y += (Math.random() - 0.5) * 8;
      }
    }
  },

  draw(ctx) {
    if (World.id !== "vale") return;
    for (const n of NPC_DATA) {
      Sprites.npc(ctx, n.x, n.y, n.color);
    }
  },
};

const Interact = {
  try() {
    if (World.id === "cottage" && Cottage.try()) return true;
    if (Pickups.try()) return true;
    if (Npcs.try()) return true;
    if (this._plantFire()) return true;
    if (this._sitDock()) return true;
    if (this._weeds()) return true;
    if (this._readSign()) return true;
    if (this._raft()) return true;
    return false;
  },

  /** Talk, pickup, and cottage beat the idle Fish line. Sit/raft stay behind Fish. */
  priorityHint() {
    if (World.id === "cottage") return Cottage.hint();
    const pick = Pickups.near();
    if (pick) return `Press E to pick ${pick}`;
    const n = Npcs.at(Player.x, Player.y);
    if (n) return `Press E to talk to ${n.name}`;
    return "";
  },

  hint() {
    const first = this.priorityHint();
    if (first) return first;
    if (Survival.atFire()) return "Sit by the fire";
    if (Survival.canPlantFire()) return "Press E to set a campfire";
    if (this._nearSit()) return "Press E to sit until dusk or dawn";
    if (Save.data.cottage.weeds > 0 && World.id === "vale" && Utils.dist(Player.x, Player.y, 27.5 * TILE_SIZE, 24.4 * TILE_SIZE) < 28) {
      return "Press E to clear weeds";
    }
    if (this._nearRaft()) {
      if (World.id === "marsh") return "Press E to boat back to the vale";
      return Save.data.flags.fifthWater ? "Board the millpond boat" : "The east boat is lashed. Come back with more of the vale.";
    }
    const sign = this._nearSign();
    if (sign) return "Press E to read the water sign";
    return "";
  },

  _nearSign() {
    for (const d of World.decos) {
      if (d.type !== "waterSign") continue;
      if (Utils.dist(Player.x, Player.y, d.x, d.y) < 20) return d;
    }
    return null;
  },

  _readSign() {
    const d = this._nearSign();
    if (!d) return false;
    UI.toastNote(Journal.signText(d.spot));
    return true;
  },

  _plantFire() {
    return Survival.plantFire();
  },

  _nearSit() {
    return World.id === "vale" && Utils.dist(Player.x, Player.y, 18.5 * TILE_SIZE, 24.5 * TILE_SIZE) < 18;
  },

  _sitDock() {
    if (!this._nearSit()) return false;
    const night = TimeCycle.phaseId() === "night";
    Weather.skipTo(night ? "dawn" : "golden");
    Survival.add("rest", 35);
    Survival.add("warmth", 15);
    UI.toastNote(night ? "You dozed until dawn." : "You sat until golden hour.");
    return true;
  },

  _weeds() {
    if (World.id !== "vale" || Save.data.cottage.weeds <= 0) return false;
    if (Utils.dist(Player.x, Player.y, 27.5 * TILE_SIZE, 24.4 * TILE_SIZE) > 28) return false;
    Save.data.cottage.weeds = 0;
    UI.toastNote("The cottage path is clear.");
    Save.mark();
    return true;
  },

  _nearRaft() {
    if (World.id === "vale") return Utils.dist(Player.x, Player.y, 59.2 * TILE_SIZE, 24.9 * TILE_SIZE) < 32;
    if (World.id === "marsh") return Utils.dist(Player.x, Player.y, 4.5 * TILE_SIZE, 12.2 * TILE_SIZE) < 32;
    return false;
  },

  _raft() {
    if (!this._nearRaft()) return false;
    if (World.id === "marsh") {
      Game.warp({
        to: "vale",
        spawn: { x: 59.2 * TILE_SIZE, y: 26.4 * TILE_SIZE },
        dir: 1,
      });
      return true;
    }
    if (!Save.data.flags.fifthWater) {
      UI.toastNote("The boat stays lashed until the vale knows you.");
      return true;
    }
    Game.warp({
      to: "marsh",
      spawn: { x: 7.6 * TILE_SIZE, y: 12.2 * TILE_SIZE },
      dir: 2,
    });
    return true;
  },
};
