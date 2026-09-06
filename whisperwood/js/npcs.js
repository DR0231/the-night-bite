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
    const hearts = Math.min(3, st.hearts | 0);
    let line = n.greet;
    if (st.lastCatchRemembered) line = `That ${st.lastCatchRemembered} still sits with me. ` + line;
    if (hearts > 0) line = n.hearts[hearts - 1] || line;
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
    const extra = FISH.find((f) => (Journal.caughtOf(f.id) | 0) > 1);
    if (!extra) {
      this._show(n.name, "Keep the first of each. Bring me a duplicate sometime.", n);
      return;
    }
    const e = Save.ensureFish(extra.id);
    e.caught = Math.max(0, e.caught - 1);
    st.giftedToday = 1;
    st.hearts = Math.min(3, (st.hearts | 0) + 1);
    this._show(n.name, n.hearts[st.hearts - 1] || "That’s kind.", n);
    Save.mark("gift");
    this._checkMarsh();
  },

  _checkMarsh() {
    const unique = Journal.count();
    const hearts = NPC_DATA.some((n) => (this.state(n.id).hearts | 0) >= 2);
    if (unique >= 10 && Save.data.cottage.visited && hearts) {
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
    if (this._raft()) return true;
    return false;
  },

  hint() {
    if (World.id === "cottage") return Cottage.hint();
    const pick = Pickups.near();
    if (pick) return `Press E to pick ${pick}`;
    if (Survival.atFire()) return "Sit by the fire";
    if (Survival.canPlantFire()) return "Press E to set a campfire";
    const n = Npcs.at(Player.x, Player.y);
    if (n) return `Press E to talk to ${n.name}`;
    if (this._nearSit()) return "Press E to sit until dusk or dawn";
    if (Save.data.cottage.weeds > 0 && World.id === "vale" && Utils.dist(Player.x, Player.y, 27.5 * TILE_SIZE, 22.5 * TILE_SIZE) < 28) {
      return "Press E to clear weeds";
    }
    if (this._nearRaft()) {
      return Save.data.flags.fifthWater ? "Walk the raft to the millpond" : "The east raft is tied. Come back with more of the vale.";
    }
    return "";
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
    if (Utils.dist(Player.x, Player.y, 27.5 * TILE_SIZE, 22.5 * TILE_SIZE) > 28) return false;
    Save.data.cottage.weeds = 0;
    UI.toastNote("The cottage path is clear.");
    Save.mark();
    return true;
  },

  _nearRaft() {
    return World.id === "vale" && Utils.dist(Player.x, Player.y, 58.5 * TILE_SIZE, 24.5 * TILE_SIZE) < 22;
  },

  _raft() {
    if (!this._nearRaft()) return false;
    if (!Save.data.flags.fifthWater) {
      UI.toastNote("The raft stays lashed until the vale knows you.");
      return true;
    }
    Game.warp({
      to: "marsh",
      spawn: { x: 8 * TILE_SIZE, y: 12 * TILE_SIZE },
      dir: 2,
    });
    return true;
  },
};
