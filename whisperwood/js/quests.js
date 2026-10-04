/* Daily board, rumor, derby. Seeded per in-game day. */

const Quests = {
  open: false,

  rollDay() {
    const rng = Save.dayRng("quests");
    const pool = DAILY_ASKS.filter((a) => this._askOpen(a.spot));
    const ask = Utils.pick(rng, pool.length ? pool : DAILY_ASKS);
    Save.data.quests.daily = {
      day: Save.data.clock.day,
      fish: ask.fish,
      spot: ask.spot,
      text: ask.text,
      done: false,
    };
    const rumorFish = FISH.filter((f) => f.rarity === "Rare" || f.rarity === "Uncommon");
    let rf = Utils.pick(rng, rumorFish);
    if (Skills.rank() >= 6 && rng() < 0.55) {
      const night = FISH.filter((f) => f.nightOnly);
      if (night.length) rf = Utils.pick(rng, night);
    }
    Save.data.quests.rumor = {
      day: Save.data.clock.day,
      fish: rf.id,
      spot: rf.spot,
      text: `${rf.name} was seen at ${SPOTS[rf.spot].name}.`,
    };
    const now = new Date();
    const weekend = now.getDay() === 0 || now.getDay() === 6;
    const fest = (Save.data.clock.day % 7) === 0;
    const key = weekend ? `w-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}` : (fest ? `d-${Save.data.clock.day}` : "");
    if (key && Save.data.quests.derby.key !== key) {
      Save.data.quests.derby = { key, mood: rng() < 0.5 ? "still" : "moving", landed: 0, goal: 8 };
    }
    if (!key) Save.data.quests.derby.key = "";
    MillSpine.tickHeard();
    this._biasRumor(rng);
  },

  _askOpen(spot) {
    const f = (Save.data && Save.data.flags) || {};
    if (spot === "marsh") return !!f.fifthWater;
    if (spot === "island") return typeof Island !== "undefined" && Island.open();
    return true;
  },

  _biasRumor(rng) {
    const spine = MillSpine.stage();
    if (spine !== "heard" && spine !== "opened" && spine !== "visited") return;
    if (rng() >= 0.5) return;
    if (Save.data.flags.fifthWater) {
      const marsh = FISH.filter((f) => f.spot === "marsh");
      if (!marsh.length) return;
      const rf = Utils.pick(rng, marsh);
      Save.data.quests.rumor = {
        day: Save.data.clock.day,
        fish: rf.id,
        spot: rf.spot,
        text: `${rf.name} was seen at ${SPOTS[rf.spot].name}.`,
      };
      return;
    }
    Save.data.quests.rumor = {
      day: Save.data.clock.day,
      fish: "",
      spot: "marsh",
      text: MILL_SPINE_RUMOR_QUIET,
    };
  },

  onLand(fish) {
    let bonus = false;
    const d = Save.data.quests.daily;
    if (d && !d.done && fish.id === d.fish) {
      d.done = true;
      Inventory.addCoins(DESIGN.dailyCoins);
      Inventory.addBait("worms", DESIGN.dailyWorms);
      Save.data.npcs.wren.hearts = Math.min(DESIGN.npcHeartCap, (Save.data.npcs.wren.hearts | 0) + 1);
      UI.toastNote("Daily board complete. Wren is pleased.");
      Save.mark("quest");
      bonus = true;
    }
    const der = Save.data.quests.derby;
    if (der && der.key && SPOTS[fish.spot] && SPOTS[fish.spot].mood === der.mood) {
      der.landed = (der.landed | 0) + 1;
      bonus = true;
    }
    const rumor = Save.data.quests.rumor;
    if (rumor && fish.id === rumor.fish) {
      UI.toastNote("The rumor was true.");
      bonus = true;
    }
    MillSpine.onMillfin(fish);
    return bonus;
  },

  dailyLine() {
    const d = Save.data.quests.daily;
    if (!d || !d.fish) return "No board posted yet.";
    if (d.done) return "Today’s board is done.";
    return d.text;
  },

  rumorLine() {
    const r = Save.data.quests.rumor;
    return (r && r.text) || "The water is keeping its secrets.";
  },

  derbyLine() {
    const d = Save.data.quests.derby;
    if (!d || !d.key) return "";
    return `Derby: land ${d.goal} ${d.mood}-water fish (${d.landed}/${d.goal}).`;
  },

  toggle() {
    this.open = !this.open;
    const el = document.getElementById("board");
    if (!el) return;
    el.classList.toggle("hidden", !this.open);
    if (this.open) this.refresh();
    else Save.mark();
  },

  close() {
    if (!this.open) return;
    this.open = false;
    const el = document.getElementById("board");
    if (el) el.classList.add("hidden");
  },

  refresh() {
    const el = document.getElementById("board-body");
    if (!el) return;
    const f = (Save.data.clock.forecast || []).filter((id) => WEATHERS[id]).map((id) => WEATHERS[id].name).join(" → ");
    el.innerHTML = `
      <p><strong>Today</strong> — ${this.dailyLine()}</p>
      <p><strong>Rumor</strong> — ${this.rumorLine()}</p>
      <p><strong>Forecast</strong> — ${f}</p>
      <p><strong>Hotspot</strong> — ${SPOTS[TimeCycle.hotspot()].name} is alive today.</p>
      ${this.derbyLine() ? `<p><strong>Derby</strong> — ${this.derbyLine()}</p>` : ""}`;
  },
};

const Board = Quests;

const MillSpine = {
  _order: ["none", "heard", "opened", "visited", "done", "turning"],

  stage() {
    return (Save.data && Save.data.flags && Save.data.flags.millSpine) || "none";
  },

  atLeast(step) {
    return this._order.indexOf(this.stage()) >= this._order.indexOf(step);
  },

  _set(step) {
    if (this.atLeast(step)) return false;
    Save.data.flags.millSpine = step;
    return true;
  },

  keepFive() {
    return this.stage() !== "none";
  },

  mailCap() {
    return this.keepFive() ? 5 : 3;
  },

  pushLetter(beat) {
    const text = MILL_SPINE_MAIL[beat];
    if (!text || !Save.data || !Save.data.cottage) return;
    let mail = Save.data.cottage.mail;
    if (!Array.isArray(mail)) mail = Save.data.cottage.mail = [];
    const at = mail.indexOf(text);
    if (at >= 0) mail.splice(at, 1);
    mail.unshift(text);
    Save.data.cottage.mail = mail.slice(0, this.mailCap());
  },

  tickHeard() {
    if (!Save.data) return;
    if (this.stage() !== "none") return;
    if (!Save.data.cottage.visited) return;
    if ((Save.data.clock.day | 0) < 2) return;
    this._set("heard");
    this.pushLetter("heard");
    this._heardNote = true;
    Save.mark();
  },

  flushNote() {
    if (!this._heardNote) return;
    if (typeof Game !== "undefined" && Game.sleeping) return;
    if (typeof UI !== "undefined" && UI.toastT > 0) return;
    if (typeof Stamps !== "undefined" && Stamps._fight()) return;
    this._heardNote = false;
    UI.toastNote(MILL_END_COPY.note);
  },

  onOpened() {
    if (!Save.data || !Save.data.flags.fifthWater) return;
    if (this.atLeast("opened")) return;
    this._set("opened");
    this.pushLetter("opened");
    UI.toastNote("The east boat is free. The mill is still silent.");
    Save.mark();
  },

  onVisited() {
    if (typeof World === "undefined" || World.id !== "marsh") return;
    if (!this.atLeast("heard")) return;
    if (this.atLeast("visited")) return;
    this._set("visited");
    this.pushLetter("visited");
    Save.mark();
  },

  onMillfin(fish) {
    if (!fish || fish.id !== "millfin") return;
    if (!this.atLeast("visited")) return;
    if (this.atLeast("done")) return;
    this._set("done");
    this.pushLetter("done");
    UI.toastNote("The mill keeps its silence — but you were there.");
    try { if (typeof Stamps !== "undefined") Stamps.try("millQuiet"); } catch (e) { /* stamp optional */ }
    try { if (typeof Island !== "undefined") Island.onQuiet(); } catch (e) { /* island optional */ }
    Save.mark();
  },

  tickTurning() {
    if (!Save.data || this.stage() !== "done") return;
    const ids = DESIGN.millEndRares || [];
    for (let i = 0; i < ids.length; i++) {
      if (typeof Journal === "undefined" || !Journal.landed(ids[i])) return;
    }
    this._set("turning");
    Save.data.flags.millEndDay = Save.clockDay();
    Save.data.flags.millEndSeen = false;
    this.pushLetter("turning");
    Save.mark();
    MillEnd.open();
  },
};

const MillEnd = {
  openFlag: false,

  open() {
    this.openFlag = true;
    try { if (typeof AudioFX !== "undefined") AudioFX.millStart(); } catch (e) { /* mill cue optional */ }
    if (typeof UI !== "undefined") UI.closeJournal();
    if (typeof Inventory !== "undefined") Inventory.close();
    if (typeof Shop !== "undefined") Shop.close();
    if (typeof Board !== "undefined") Board.close();
    if (typeof Mail !== "undefined") Mail.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Tank !== "undefined") Tank.close();
    if (typeof Cooler !== "undefined") Cooler.close();
    if (typeof Trophy !== "undefined") Trophy.close();
    if (typeof Cert !== "undefined") Cert.close();
    const el = document.getElementById("mill-end");
    if (el) el.classList.remove("hidden");
    this.refresh();
  },

  close() {
    if (!this.openFlag) return;
    this.openFlag = false;
    const el = document.getElementById("mill-end");
    if (el) el.classList.add("hidden");
    if (Save.data && Save.data.flags && Save.data.flags.millEndSeen !== true) {
      Save.data.flags.millEndSeen = true;
      Save.mark();
    }
  },

  refresh() {
    const C = MILL_END_COPY;
    const kicker = document.getElementById("mill-end-kicker");
    const title = document.getElementById("mill-end-title");
    const btn = document.getElementById("mill-end-btn");
    if (kicker) kicker.textContent = C.kicker;
    if (title) title.textContent = C.title;
    if (btn) btn.textContent = C.button;
    const el = document.getElementById("mill-end-body");
    if (!el) return;
    const rares = (DESIGN.millEndRares || []).map((id) => {
      const f = FISH.find((x) => x.id === id);
      const e = Journal.ensure(id);
      const day = e.firstDay | 0;
      const daySpan = day > 0 ? `<span class="stamp-day">Day ${day}</span>` : "";
      return `<li class="stamp-open"><span class="stamp-seal is-ink" aria-hidden="true"></span><span class="stamp-title">${f ? f.name : id}</span>${daySpan}</li>`;
    }).join("");
    let landedSum = 0;
    let bestName = "";
    let best = -1;
    for (const f of FISH) {
      const e = Journal.ensure(f.id);
      landedSum += e.landed | 0;
      if ((e.biggest || 0) > best) {
        best = e.biggest || 0;
        bestName = e.biggest ? f.name : bestName;
      }
    }
    if (!bestName) {
      for (const f of FISH) {
        const e = Journal.ensure(f.id);
        if ((e.landed | 0) > 0) { bestName = f.name; best = e.biggest || 0; break; }
      }
    }
    const stats = [
      C.finished.replace("{N}", Save.data.flags.millEndDay | 0),
      `${Journal.count()} / ${FISH.length} species in the book`,
      `${landedSum} fish landed`,
      `Biggest: ${bestName}, ${best}"`,
    ].map((s) => `<p class="ink-soft">${s}</p>`).join("");
    el.innerHTML = `<p>${C.body}</p><ul class="stamp-list">${rares}</ul>${stats}`;
  },

  drawScene(t) {
    const canvas = document.getElementById("mill-end-scene");
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const time = t || 0;
    const frame = Math.floor(time / (DESIGN.millWheelStep || 0.35)) % 4;
    c.imageSmoothingEnabled = false;
    Sprites.fill(c, 0, 0, 96, 48, "#d8c0a0");
    Sprites.fill(c, 0, 31, 96, 5, "#6a7a50");
    Sprites.fill(c, 0, 31, 96, 1, "#8a9a68");
    Sprites.fill(c, 0, 6, 34, 32, PALETTE.wood);
    Sprites.fill(c, 0, 6, 34, 3, PALETTE.woodHi);
    for (let y = 13; y <= 37; y += 6) Sprites.fill(c, 0, y, 34, 1, PALETTE.woodLo);
    for (let row = 0; row <= 7; row++) {
      Sprites.fill(c, 0, row, Math.min(40, 36 + row) + 1, 1, "#6a3030");
    }
    Sprites.fill(c, 10, 16, 7, 7, "#2a1c12");
    Sprites.fill(c, 11, 17, 5, 5, "#c8e0f0");
    Sprites.fill(c, 13, 17, 1, 5, "#2a1c12");
    Sprites.fill(c, 34, 25, 24, 2, PALETTE.woodLo);
    Sprites.millWheel(c, 60, 26, 15, time);
    Sprites.fill(c, 0, 38, 96, 10, "#3a5a48");
    Sprites.fill(c, 0, 38, 96, 1, "#5a7a68");
    for (let i = 0; i < 5; i++) {
      Sprites.fill(c, 48 + ((i * 5 + frame) % 22), 39 + ((i + frame) % 2), 2, 1, "#c8e0f0");
    }
    const fall = Math.floor((time * 10) % 7);
    Sprites.fill(c, 75, 39 + fall, 1, 2, "#9fc6e0");
    Sprites.fill(c, 77, 39 + ((fall + 3) % 7), 1, 2, "#9fc6e0");
  },
};

const Mail = {
  open: false,
  toggle() {
    this.open = !this.open;
    const el = document.getElementById("mail");
    if (!el) return;
    el.classList.toggle("hidden", !this.open);
    if (this.open) {
      MillSpine.tickHeard();
      this.refresh();
    }
    else Save.mark();
  },
  close() {
    if (!this.open) return;
    this.open = false;
    const el = document.getElementById("mail");
    if (el) el.classList.add("hidden");
  },
  refresh() {
    const el = document.getElementById("mail-body");
    if (!el) return;
    const notes = Save.data.cottage.mail || [];
    if (!notes.length) el.innerHTML = "<p>The tray is empty.</p>";
    else el.innerHTML = notes.map((n) => `<p>${n}</p>`).join("");
  },
  generateAway() {
    const notes = [];
    notes.push(Quests.rumorLine());
    notes.push("Wren restocked worms and a little glow.");
    const last = Save.data.player.lastCatchName;
    if (last) notes.push(`Lark: “Still thinking about that ${last}.”`);
    else notes.push("Bramble left a note: the pond missed you.");
    const rec = (Save.data.recap || []).find((r) => r.reason === "passout");
    if (rec) notes.unshift("Wren: I found you in the reeds last night. The kettle’s still warm.");
    if ((Save.data.skills.rank | 0) > 1) notes.push(`Someone pinned a scrap: fisher rank ${Save.data.skills.rank}.`);
    if (typeof Cottage !== "undefined" && Cottage.decorOn() && !Cottage.hasSlot("shelf")) {
      notes.push("Wren: cottage goods on the counter — a wall shelf if you have forty coins.");
    }
    MillSpine.tickHeard();
    Save.data.cottage.mail = notes.slice(0, MillSpine.mailCap());
    const mail = Save.data.cottage.mail;
    const beats = ["heard", "opened", "visited", "done", "turning"];
    let latest = "";
    for (let i = 0; i < beats.length; i++) {
      if (!MillSpine.atLeast(beats[i])) continue;
      if (MILL_SPINE_MAIL[beats[i]]) latest = beats[i];
    }
    if (latest) {
      const text = MILL_SPINE_MAIL[latest];
      const at = mail.indexOf(text);
      if (at >= 0) mail.splice(at, 1);
      mail.unshift(text);
    }
    Save.data.cottage.mail = mail.slice(0, MillSpine.mailCap());
    Save.data.cottage.weeds = 4 + (Save.dayRng("weeds")() * 4) | 0;
  },
};

/*
 * First-evening nudges. One quiet line each, fired by what the player has not yet
 * done, spaced by DESIGN.onboardGap, and gone for good after DESIGN.onboardWindow
 * seconds of play. Anything the player finds on their own is marked silently.
 */
const Onboard = {
  cool: 0,
  steps: [
    {
      id: "cast",
      silent: () => Journal.count() >= 1,
      ready: () => Journal.count() === 0 && !Fishing.active,
      text: "Water is close. Stand at the edge and press E to cast.",
    },
    {
      id: "journal",
      silent: () => UI.journalOpen,
      ready: () => Journal.count() >= 1,
      text: "That one goes in the journal. Press J.",
    },
    {
      id: "pack",
      silent: () => Inventory.open,
      ready: () => Journal.count() >= 1,
      text: "Bait and rods live in the pack. Press I.",
    },
    {
      id: "needs",
      ready: () => {
        const p = Save.data.player;
        return Math.min(p.hunger, p.warmth, p.rest) < 60 || TimeCycle.phaseId() === "golden";
      },
      text: "Top right: hunger, warmth, rest. An evening outside can go poorly.",
    },
    {
      id: "cottage",
      silent: () => !!Save.data.cottage.visited,
      ready: () => TimeCycle.phaseId() === "golden" || TimeCycle.phaseId() === "night",
      text: "Your cottage is up the path, just north-west. The bed is warmer than the reeds.",
    },
  ],

  _flags() {
    const f = Save.data && Save.data.flags;
    if (!f) return null;
    if (!f.onboard || typeof f.onboard !== "object") f.onboard = {};
    return f.onboard;
  },

  active() {
    const f = this._flags();
    if (!f || f.done) return false;
    if ((Save.data.playTime || 0) > (DESIGN.onboardWindow || 600) || Journal.count() >= 4) {
      f.done = true;
      return false;
    }
    return true;
  },

  /** Runs every frame, even while a menu pauses the world, so an opened journal or pack counts. */
  observe() {
    if (!this.active()) return;
    const f = this._flags();
    for (const s of this.steps) {
      if (!f[s.id] && s.silent && s.silent()) f[s.id] = true;
    }
  },

  update(dt) {
    if (!this.active()) return;
    const f = this._flags();
    this.cool -= dt;
    if (this.cool > 0) return;
    if ((Save.data.playTime || 0) < (DESIGN.onboardDelay || 0)) return;
    if (UI.anyMenu() || Npcs.talkId || Game.fading || Game.sleeping || Fishing.active) return;
    if (World.id !== "vale") return;
    if (!this.steps.some((s) => !f[s.id])) { f.done = true; return; }
    const next = this.steps.find((s) => !f[s.id] && s.ready());
    if (!next) return;
    f[next.id] = true;
    UI.toastNote(next.text);
    this.cool = DESIGN.onboardGap || 30;
  },
};

(function _millSpineMapEnter() {
  if (typeof World === "undefined" || !World.use) return;
  const orig = World.use.bind(World);
  World.use = function (id) {
    const prev = World.id;
    orig(id);
    try {
      if (id === "marsh" && prev !== "marsh" && typeof MillSpine !== "undefined") MillSpine.onVisited();
    } catch (err) { /* warp still works if mail flavor fails */ }
    try { if (typeof Passer !== "undefined") Passer.sync(); } catch (err) { /* passer optional */ }
  };
})();
