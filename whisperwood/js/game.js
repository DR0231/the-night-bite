/* HUD, journal panel, catch toast. */

const UI = {
  journalOpen: false,
  toastT: 0,

  els: {},

  anyMenu() {
    return this.journalOpen || Inventory.open || Shop.openFlag || Board.open || Mail.open
      || (typeof Bench !== "undefined" && Bench.openFlag)
      || (typeof Tank !== "undefined" && Tank.openFlag)
      || (typeof Cooler !== "undefined" && Cooler.openFlag)
      || Skills.offering
      || (typeof Admin !== "undefined" && Admin.open);
  },

  init() {
    this.els = {
      start: document.getElementById("start-screen"),
      btn: document.getElementById("btn-start"),
      clock: document.getElementById("clock"),
      clockText: document.getElementById("clock-text"),
      spot: document.getElementById("spot-label"),
      prompt: document.getElementById("prompt"),
      journal: document.getElementById("journal"),
      journalList: document.getElementById("journal-list"),
      journalCount: document.getElementById("journal-count"),
      toast: document.getElementById("catch-toast"),
      toastName: document.getElementById("toast-name"),
      toastDesc: document.getElementById("toast-desc"),
      toastArt: document.getElementById("toast-art"),
      regionTitle: document.getElementById("region-title"),
      regionBlurb: document.getElementById("region-blurb"),
    };
    if (this.els.btn) {
      this.els.btn.addEventListener("click", (e) => {
        e.preventDefault();
        Game.start({ clearUse: true });
      });
    }
    const start = document.getElementById("start-screen");
    if (start) {
      start.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button") || e.target.closest("#move-pad")) return;
        Game.start({ clearUse: true });
      });
    }
    this.buildJournal();
    this.fillStart();
    this.bindOverlays();
  },

  bindOverlays() {
    const closeBtns = document.querySelectorAll("[data-close]");
    closeBtns.forEach((b) => b.addEventListener("click", () => this.closeAll()));
    const dlg = document.getElementById("dialog-close");
    if (dlg) dlg.addEventListener("click", () => Npcs.close());
  },

  fillStart() {
    const w = document.getElementById("start-weather");
    const rec = document.getElementById("start-recap");
    const btn = this.els.btn;
    if (w) {
      let line = TimeCycle.weatherLine();
      const wx = TimeCycle.weatherId();
      const phase = TimeCycle.phaseId();
      if (wx === "frost") line += " Frost overnight. Bring tea.";
      else if (wx === "rain") line += " Rain on the vale. A cloak would help.";
      else if (phase === "night") line += " Night on the water. A lantern or a fire.";
      w.textContent = line;
    }
    if (rec) {
      const bits = [
        `<li>${TimeCycle.weatherLine()}</li>`,
        `<li>${Quests.dailyLine()}</li>`,
        `<li>${Quests.rumorLine()}</li>`,
      ];
      if ((Save.data.skills.rank | 0) > 1) bits.push(`<li>Fisher rank ${Save.data.skills.rank}.</li>`);
      if ((Save.data.recap || []).some((r) => r.reason === "passout")) bits.push("<li>Wren found you in the reeds once. The kettle was on.</li>");
      rec.innerHTML = bits.join("");
    }
    const returning = Save.data.playTime > 20 || Journal.count() > 0 || Save.data.flags.introComplete;
    if (btn) btn.textContent = returning ? "Return to the Vale" : "Enter the Vale";
    const blurb = document.getElementById("start-blurb");
    if (blurb && returning) blurb.textContent = "The vale kept your place. Walk out when you’re ready.";
  },

  buildJournal() {
    const ul = this.els.journalList;
    ul.innerHTML = "";
    for (const f of FISH) {
      const li = document.createElement("li");
      li.dataset.id = f.id;
      li.innerHTML = `
        <canvas class="fish-swatch" width="40" height="26"></canvas>
        <div>
          <div class="fish-name">???</div>
          <div class="fish-meta"><i class="dot ${f.rarity.toLowerCase()}"></i> ${SPOTS[f.spot].name}</div>
        </div>`;
      ul.appendChild(li);
      li.addEventListener("click", () => {
        if (Journal.known(f.id)) { Journal.toggleFavorite(f.id); this.refreshJournal(); }
      });
    }
    this.refreshJournal();
  },

  refreshJournal() {
    this.els.journalCount.textContent = `${Journal.count()} / ${FISH.length} landed · ${Journal.seenCount()} seen`;
    for (const f of FISH) {
      const li = this.els.journalList.querySelector(`[data-id="${f.id}"]`);
      if (!li) continue;
      const known = Journal.known(f.id);
      const landed = Journal.landed(f.id);
      const e = Journal.ensure(f.id);
      li.classList.toggle("unknown", !known);
      li.classList.toggle("favorite", !!e.favorite);
      li.querySelector(".fish-name").textContent = known ? f.name : "???";
      li.querySelector(".fish-meta").innerHTML = landed
        ? `<i class="dot ${f.rarity.toLowerCase()}"></i> ${f.rarity} · ${SPOTS[f.spot].name} · ×${e.landed} · best ${e.biggest}"`
        : `<i class="dot ${f.rarity.toLowerCase()}"></i> ${SPOTS[f.spot].name}${known ? " · sighted" : ""}`;
      const c = li.querySelector("canvas").getContext("2d");
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, 40, 26);
      c.save();
      c.translate(16, 13);
      Sprites.fishIcon(c, 0, 0, f, !known);
      c.restore();
    }
    const cook = document.getElementById("journal-cook");
    if (cook) {
      const names = Object.keys(MEALS).map((id) => Save.data.flags.cooked[id] ? MEALS[id].name : "???");
      cook.textContent = "Cookbook: " + names.join(" · ");
    }
  },

  toggleJournal() {
    if (this.journalOpen) { this.closeJournal(); return; }
    Inventory.close(); Shop.close(); Board.close(); Mail.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Tank !== "undefined") Tank.close();
    if (typeof Cooler !== "undefined") Cooler.close();
    // Journal pauses movement and world time, but is not a bite-timer exploit:
    // wait/nibble packs up the rod; an open minigame fails on the spot.
    if (Fishing.state === "wait" || Fishing.state === "nibble") Fishing.cancel();
    else if (Fishing.state === "play") Minigame.failOpenMenu();
    this.journalOpen = true;
    this.els.journal.classList.remove("hidden");
    this.refreshJournal();
  },

  closeJournal() {
    this.journalOpen = false;
    this.els.journal.classList.add("hidden");
    Save.mark();
  },

  closeAll() {
    this.closeJournal();
    Inventory.close();
    Shop.close();
    Board.close();
    Mail.close();
    Npcs.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Tank !== "undefined") Tank.close();
    if (typeof Cooler !== "undefined") Cooler.close();
    if (typeof Admin !== "undefined") Admin.close();
  },

  showCatch(fish, rec) {
    rec = rec || {};
    const el = this.els.toast;
    if (!el) return;
    el.classList.remove("miss");
    const kickerEl = el.querySelector(".toast-kicker");
    let kicker = "Caught!";
    if (rec.first) kicker = "First catch!";
    else if (rec.record) kicker = "New record";
    if (kickerEl) kickerEl.textContent = kicker;
    if (this.els.toastName) this.els.toastName.textContent = fish && fish.name ? fish.name : "A catch";
    if (this.els.toastDesc) {
      this.els.toastDesc.textContent = `${rec.inches ? rec.inches + '" · ' : ""}${(fish && fish.desc) || ""}`;
    }
    el.classList.remove("hidden");
    this.toastT = 2.2;
    try {
      const c = document.createElement("canvas");
      c.width = 48; c.height = 48;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.fillStyle = "#1a3a48";
      g.fillRect(0, 0, 48, 48);
      g.save();
      g.translate(22, 24);
      Sprites.fishIcon(g, 0, 0, fish, false);
      g.restore();
      if (this.els.toastArt) this.els.toastArt.replaceChildren(c);
    } catch (err) { /* toast copy still shows */ }
    this.refreshJournal();
  },

  showMiss(fish) {
    const el = this.els.toast;
    if (!el) return;
    el.classList.add("miss");
    const kickerEl = el.querySelector(".toast-kicker");
    if (kickerEl) kickerEl.textContent = "Miss";
    if (this.els.toastName) this.els.toastName.textContent = fish ? `${fish.name} got away…` : "It got away…";
    if (this.els.toastDesc) {
      this.els.toastDesc.textContent = fish ? "A sighting for the journal. Try again." : "The line went slack. Try again.";
    }
    el.classList.remove("hidden");
    if (this.els.toastArt) this.els.toastArt.replaceChildren();
    this.toastT = 2.2;
    this.refreshJournal();
  },

  toastNote(text) {
    this.els.toast.classList.remove("miss");
    this.els.toast.querySelector(".toast-kicker").textContent = "Vale";
    this.els.toastName.textContent = text;
    this.els.toastDesc.textContent = "";
    this.els.toast.classList.remove("hidden");
    this.els.toastArt.replaceChildren();
    this.toastT = 1.8;
  },

  update(dt) {
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.els.toast.classList.add("hidden");
    }

    this.els.clockText.textContent = TimeCycle.clockLabel();
    const rankEl = document.getElementById("clock-rank");
    if (rankEl && typeof Skills !== "undefined") rankEl.textContent = `Rank ${Skills.rank()}`;
    this.els.clock.classList.toggle("night", TimeCycle.sample().night);
    const wx = TimeCycle.weatherId();
    this.els.clock.classList.toggle("rain", wx === "rain");
    this.els.clock.classList.toggle("mist", wx === "mist");

    const spot = World.spotAt(Player.x, Player.y);
    if (spot) {
      const hot = TimeCycle.hotspot() === spot.id ? " ✦" : "";
      const best = Journal.bestAt(spot.id);
      const star = Save.data.flags.spotMastery[spot.id] ? " ★" : "";
      const bestTxt = best ? `  · Best ${best.fish.name} ${best.inches}"` : "";
      this.els.spot.textContent = spot.name.toUpperCase() + hot + star + bestTxt;
      this.els.spot.classList.remove("hidden");
      this.els.spot.classList.toggle("hot", !!hot);
    } else {
      this.els.spot.classList.add("hidden");
    }

    if (this.els.regionTitle) {
      if (World.id === "cave") {
        this.els.regionTitle.textContent = "Crystal Cave";
        this.els.regionBlurb.textContent = "A hidden lake glows under the southern hill. Still water, and fish like lanterns.";
      } else if (World.id === "cottage") {
        this.els.regionTitle.textContent = "Cottage";
        this.els.regionBlurb.textContent = "Bed, tank, bench, and the daily board. Home, when the vale lets you rest.";
      } else if (World.id === "marsh") {
        this.els.regionTitle.textContent = "Misty Millpond";
        this.els.regionBlurb.textContent = "East of the lake, a quiet marsh remembers the old mill.";
      } else {
        this.els.regionTitle.textContent = "Whisperwood Vale";
        this.els.regionBlurb.textContent = "A peaceful woodland valley with crystal-clear waters and abundant fish.";
      }
    }

    let prompt = "";
    if (!this.anyMenu()) {
      if (Fishing.state !== "idle") {
        prompt = Fishing.prompt();
      } else {
        prompt = Interact.priorityHint();
        if (!prompt) {
          const gate = World.nearPortal(Player.x, Player.y);
          if (gate) prompt = gate.hint;
        }
        if (!prompt) prompt = Fishing.prompt();
        if (!prompt) prompt = Interact.hint();
        if (!prompt && Survival.needPrompt) prompt = Survival.needPrompt;
      }
    }
    if (prompt && !this.anyMenu()) {
      this.els.prompt.textContent = prompt;
      this.els.prompt.classList.remove("hidden");
      this.els.prompt.classList.toggle("bite", Fishing.state === "bite" || Fishing.state === "play");
    } else {
      this.els.prompt.classList.add("hidden");
    }
  },
};

/* Main loop and boot. */
const Game = {
  running: false,
  last: 0,
  fishing: Fishing,
  fading: null,
  sleeping: null,
  sleepCool: 0,

  boot() {
    if (this.booted) return;
    try {
      try { if (typeof Atlas !== "undefined") Atlas.load(); } catch (err) { /* sheets optional */ }
      Input.bind();
      Input.bindPad();
      Save.load();
      World.generate();
      Player.spawn();
      Save.applyToWorld();
      if (!Save.data.quests.daily.day) {
        Weather.rollDay();
        Quests.rollDay();
      }
      if (Save.returning()) Mail.generateAway();
      Shop.restock();
      Renderer.init();
      UI.init();
      Survival.refreshPips();
      const canvas = document.getElementById("game");
      const frame = document.getElementById("frame");
      if (frame) {
        frame.addEventListener("pointerdown", () => {
          if (canvas) canvas.focus({ preventScroll: true });
        });
      }
      window.addEventListener("visibilitychange", () => { if (document.hidden) Save.write(); });
      window.addEventListener("pagehide", () => Save.write());
      const hint = document.getElementById("hint");
      if (hint) hint.textContent = "J Journal · I Pack · F8 Admin";
      Camera.x = Player.x - CONFIG.VIEW_W * 0.5;
      Camera.y = Player.y - CONFIG.VIEW_H * 0.58;
      Camera.clampToWorld(World.pw, World.ph);
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
      this.booted = true;
    } catch (err) {
      this.booted = false;
      try { console.warn("boot failed", err); } catch (e) { /* ignore */ }
    }
  },

  start(opts) {
    try { AudioFX.ensure(); } catch (err) { /* audio optional */ }
    if (opts && opts.clearUse) {
      Input.pressed["e"] = false;
      Input.pressed[" "] = false;
      Input.pressed["enter"] = false;
    }
    if (UI.els.start) UI.els.start.classList.add("hidden");
    Save.data.flags.introComplete = true;
    if (UI.els.btn) UI.els.btn.blur();
    const canvas = document.getElementById("game");
    if (canvas) canvas.focus({ preventScroll: true });
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
  },

  _nightFlies() {
    if (World.inCave()) {
      if (Particles.list.filter((p) => p.kind === "fly").length < 10) {
        Particles.firefly(
          Player.x + (Math.random() - 0.5) * 90,
          Player.y + (Math.random() - 0.5) * 60,
          "#8ee8ff"
        );
      }
      return;
    }
    if (TimeCycle.sample().night && Particles.list.filter((p) => p.kind === "fly").length < 12) {
      Particles.firefly(
        Player.x + (Math.random() - 0.5) * 80,
        Player.y + (Math.random() - 0.5) * 50
      );
    }
  },

  fadeAlpha() {
    if (this.sleeping) {
      const u = Utils.clamp(this.sleeping.t / this.sleeping.dur, 0, 1);
      if (u < 0.32) return u / 0.32;
      if (u > 0.68) return 1 - (u - 0.68) / 0.32;
      return 1;
    }
    if (!this.fading) return 0;
    const u = Utils.clamp(this.fading.t / this.fading.dur, 0, 1);
    return this.fading.phase === "out" ? u : 1 - u;
  },

  startSleep() {
    if (this.sleeping || this.fading) return;
    Fishing.cancel();
    Player.locked = true;
    Player.sleeping = true;
    Player.vx = 0;
    Player.vy = 0;
    const night = TimeCycle.phaseId() === "night" || TimeCycle.phaseId() === "golden";
    const phase = night ? "dawn" : "golden";
    this.sleeping = {
      t: 0,
      dur: 3.1,
      phase,
      fromSec: TimeCycle.seconds,
      targetSec: this._sleepTarget(phase),
      applied: false,
      toast: night ? "You slept until dawn." : "You slept until dusk.",
    };
  },

  _sleepTarget(phase) {
    const dayLen = CONFIG.DAY_LENGTH;
    const dayBase = Math.floor(TimeCycle.seconds / dayLen) * dayLen;
    const ph = DESIGN.phases.find((p) => p.id === (phase === "dawn" ? "dawn" : "golden"));
    const hour = ph ? ph.hour : (phase === "dawn" ? 6 : 17.6);
    let target = dayBase + (hour / 24) * dayLen;
    if (target <= TimeCycle.seconds + 10) target += dayLen;
    return target;
  },

  _updateSleep(dt) {
    if (!this.sleeping) return;
    this.sleeping.t += dt;
    const skip = this.sleeping.t > 0.22 && Input.use;
    if (skip || this.sleeping.t >= this.sleeping.dur) {
      this._finishSleep();
      return;
    }
    const u = Utils.clamp(this.sleeping.t / this.sleeping.dur, 0, 1);
    const ease = u * u * (3 - 2 * u);
    TimeCycle.seconds = this.sleeping.fromSec + (this.sleeping.targetSec - this.sleeping.fromSec) * ease;
    Save.data.clock.seconds = TimeCycle.seconds;
  },

  _finishSleep() {
    if (!this.sleeping) return;
    TimeCycle.seconds = this.sleeping.targetSec;
    Save.data.clock.seconds = TimeCycle.seconds;
    if (!this.sleeping.applied) {
      Weather.advance();
      Survival.fillSleep();
      UI.toastNote(this.sleeping.toast);
      Save.mark("sleep");
      this.sleeping.applied = true;
    }
    Player.sleeping = false;
    Player.locked = false;
    Cottage.wakeBesideBed();
    this.sleeping = null;
    this.sleepCool = 0.45;
  },

  warp(portal) {
    if (!portal || this.fading || this.sleeping) return;
    Fishing.cancel();
    Player.locked = true;
    Player.vx = 0;
    Player.vy = 0;
    this.fading = { phase: "out", t: 0, dur: 0.28, portal };
  },

  _arrive(portal) {
    World.use(portal.to);
    Player.x = portal.spawn.x;
    Player.y = portal.spawn.y;
    Player.dir = portal.dir;
    Player.vx = 0;
    Player.vy = 0;
    Player.hop = 0;
    Particles.list = [];
    Camera.lookX = 0;
    Camera.lookY = 0;
    Camera.x = Player.x - CONFIG.VIEW_W * 0.5;
    Camera.y = Player.y - CONFIG.VIEW_H * 0.56;
    Camera.clampToWorld(World.pw, World.ph);
    World.portalCool = 0.85;
    if (portal.to === "cottage") {
      Save.data.cottage.visited = true;
      Npcs._checkMarsh();
    }
    if (portal.passOut) Survival.wakeHome();
    Save.mark();
  },

  _updateFade(dt) {
    if (!this.fading) return;
    this.fading.t += dt;
    if (this.fading.phase === "out" && this.fading.t >= this.fading.dur) {
      this._arrive(this.fading.portal);
      this.fading.phase = "in";
      this.fading.t = 0;
    } else if (this.fading.phase === "in" && this.fading.t >= this.fading.dur) {
      Player.locked = false;
      this.fading = null;
    }
  },

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    if (!(typeof Admin !== "undefined" && Admin.open)) {
      if (Input.pressed["j"] && !Skills.offering && !this.sleeping) UI.toggleJournal();
      if (Input.pressed["i"] && !Skills.offering && !this.sleeping) Inventory.toggle();
    }
    if (Input.pressed["1"]) Inventory.numberKey(1);
    if (Input.pressed["2"]) Inventory.numberKey(2);
    if (Input.pressed["3"]) Inventory.numberKey(3);
    if (Input.pressed["4"]) Inventory.numberKey(4);
    if (Input.pressed["5"]) Inventory.numberKey(5);
    if (Input.pressed["escape"]) {
      if (Skills.offering) { /* wait for a perk pick */ }
      else if (UI.anyMenu() || Npcs.talkId) UI.closeAll();
      else if (Fishing.active) Fishing.cancel();
    }

    const pauseWorld = UI.anyMenu();
    if (!pauseWorld) {
      if (this.sleeping) {
        this._updateSleep(dt);
      } else {
        this._updateFade(dt);
        World.update(dt);
        if (this.sleepCool > 0) this.sleepCool -= dt;
        if (!this.fading && this.sleepCool <= 0) {
          if (Input.use) Fishing.act();
        }
        Player.update(dt);
        Fishing.update(dt);
        TimeCycle.update(dt);
        if (!this.fading) Survival.tick(dt);
        Particles.update(dt);
        Npcs.update(dt);
        Weather.spawnAmbient(dt);
        Camera.follow(Player.x, Player.y, dt, World.pw, World.ph, Player.vx, Player.vy);
        if (!this.fading && World.portalCool <= 0 && !Fishing.active) {
          const gate = World.portalAt(Player.x, Player.y);
          if (gate) this.warp(gate);
        }
        if (Math.random() < dt * (World.inCave() ? 1.4 : 0.6)) this._nightFlies();
        Save.data.playTime += dt;
      }
    }

    UI.update(dt);
    Renderer.render(now);
    Input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },
};

window.addEventListener("DOMContentLoaded", () => Game.boot());
if (document.readyState !== "loading") Game.boot();
