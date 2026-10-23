/* HUD, journal panel, catch toast. */

const UI = {
  journalOpen: false,
  toastT: 0,
  toastHoldT: 0,

  els: {},

  _mq: {
    coarse: matchMedia("(pointer: coarse)"),
    small: matchMedia("(max-width: 720px), (max-height: 480px)"),
    portrait: matchMedia("(orientation: portrait) and (max-width: 720px)"),
  },
  _noteQ: [],
  _regionLast: "",
  _regionAt: 0,

  _fishVerb: "",
  touch() { return this._mq.coarse.matches; },
  phone() { return this.touch() && this._mq.small.matches; },
  phonePortrait() { return this.phone() && this._mq.portrait.matches; },
  tt(desk, touch) { return this.touch() ? touch : desk; },
  fishVerb(prompt) {
    const text = prompt || "";
    const state = typeof Fishing !== "undefined" ? Fishing.state : "";
    if (state === "bite") return "Hook";
    if (state && state !== "idle") return "Fish";
    if (text.indexOf("Tap Fish to hook") === 0) return "Hook";
    if (!text || text === "Tap Fish to cast") return "Fish";
    if (text.indexOf("Pick") === 0) return "Pick";
    if (text.indexOf("Talk") === 0) return "Talk";
    if (text.indexOf("Greet") === 0) return "Greet";
    if (text.indexOf("Sit") === 0) return "Sit";
    if (text.indexOf("Stand") === 0) return "Stand";
    if (text.indexOf("Sleep") === 0) return "Sleep";
    if (text.indexOf("Read") === 0 || text === "The sundial") return "Read";
    if (text.indexOf("Board") === 0 || text.indexOf("Boat back") === 0) return "Board";
    if (text.indexOf("Clear") === 0) return "Clear";
    if (text.indexOf("Set a campfire") === 0) return "Camp";
    if (text.indexOf("Packing bench") === 0) return "Cook";
    if (text.indexOf("cooler") !== -1 || text.indexOf("Check the mail tray") === 0 || text.indexOf("Manage the tank") === 0 || text.indexOf("Manage the wall mount") === 0) return "Open";
    return "Fish";
  },
  padText(text) {
    if (this.touch() || !document.documentElement.classList.contains("pad-input")) return text;
    const verb = (word) => (match) => (match.charAt(0) === match.charAt(0).toLowerCase() ? word.toLowerCase() : word) + " A";
    const rules = [
      [/\bPress Space\b/gi, verb("Press")],
      [/\bHold Space\b/gi, verb("Hold")],
      [/\bSpace or E\b/gi, "A"],
      [/\bE or Space\b/gi, "A"],
      [/\bE \/ Space\b/gi, "A"],
      [/\bSpace \/ E\b/gi, "A"],
      [/\bTap Space\b/gi, verb("Tap")],
      [/\bE or Fish\b/gi, "A"],
      [/\bE\/Space\b/gi, "A"],
      [/\bSpace\/E\b/gi, "A"],
      [/\bPress E\b/gi, verb("Press")],
      [/\bHold E\b/gi, verb("Hold")],
      [/\bTap E\b/gi, verb("Tap")],
    ];
    let out = String(text);
    for (let i = 0; i < rules.length; i++) out = out.replace(rules[i][0], rules[i][1]);
    return out;
  },

  anyMenu() {
    return this.journalOpen || Inventory.open || Shop.openFlag || Board.open || Mail.open
      || (typeof Bench !== "undefined" && Bench.openFlag)
      || (typeof Tank !== "undefined" && Tank.openFlag)
      || (typeof Cooler !== "undefined" && Cooler.openFlag)
      || (typeof Trophy !== "undefined" && Trophy.openFlag)
      || (typeof Cert !== "undefined" && Cert.openFlag)
      || (typeof MillEnd !== "undefined" && MillEnd.openFlag)
      || Skills.offering
      || (typeof Admin !== "undefined" && Admin.open)
      || (typeof Inventory !== "undefined" && Inventory.pasteOpen)
      || (typeof Pause !== "undefined" && Pause.openFlag)
      || (this.els.start && !this.els.start.classList.contains("hidden"));
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
    const clock = this.els.clock;
    if (clock) {
      clock.addEventListener("click", () => {
        if (!this.phone()) return;
        clock.classList.toggle("expanded");
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
      rec.textContent = "";
      const lines = [Quests.dailyLine(), Quests.rumorLine()];
      if ((Save.data.skills.rank | 0) > 1) lines.push("Fisher rank " + Save.data.skills.rank + ".");
      if ((Save.data.recap || []).some((r) => r.reason === "passout")) lines.push("Wren found you in the reeds once. The kettle was on.");
      for (const line of lines) {
        const li = document.createElement("li");
        li.textContent = line;
        rec.appendChild(li);
      }
    }
    const returning = Save.data.playTime > 20 || Journal.count() > 0 || Save.data.flags.introComplete;
    if (btn) btn.textContent = returning ? "Return to the Vale" : "Enter the Vale";
    const blurb = document.getElementById("start-blurb");
    if (blurb && returning) blurb.textContent = "The vale kept your place. Walk out when you’re ready.";
    if (blurb && typeof MillSpine !== "undefined" && MillSpine.stage() === "turning") blurb.textContent = MILL_END_COPY.startLine;
  },

  buildJournal() {
    const ul = this.els.journalList;
    if (!ul) return;
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
      const hint = Journal.hintLine(f);
      const meta = li.querySelector(".fish-meta");
      meta.textContent = "";
      const dot = document.createElement("i");
      dot.className = "dot " + f.rarity.toLowerCase();
      meta.appendChild(dot);
      if (landed) {
        meta.appendChild(document.createTextNode(" " + f.rarity + " · " + SPOTS[f.spot].name + " · ×" + String(e.landed) + " · best " + String(e.biggest) + "\""));
      } else {
        meta.appendChild(document.createTextNode(" " + SPOTS[f.spot].name + (known ? " · sighted" : "")));
      }
      if (landed && hint) {
        meta.appendChild(document.createElement("br"));
        const span = document.createElement("span");
        span.className = "fish-hint";
        span.textContent = hint;
        meta.appendChild(span);
      } else if (!landed && f.rarity === "Rare" && hint) {
        meta.appendChild(document.createElement("br"));
        const span = document.createElement("span");
        span.className = "fish-hint";
        span.textContent = "Hint: " + hint;
        meta.appendChild(span);
      }
      if (landed && (e.firstDay | 0) > 0) {
        meta.appendChild(document.createElement("br"));
        const span = document.createElement("span");
        span.className = "fish-hint";
        span.textContent = "First landed, day " + (e.firstDay | 0);
        meta.appendChild(span);
      }
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
      const stampN = typeof Stamps !== "undefined" ? Stamps.unlockedCount() : 0;
      const stampMax = typeof STAMPS !== "undefined" ? STAMPS.length : 6;
      cook.textContent = "Cookbook: " + names.join(" · ") + ` · Stamps ${stampN}/${stampMax}`;
    }
    const mill = document.getElementById("journal-mill");
    if (mill) {
      if (typeof MillSpine !== "undefined" && MillSpine.atLeast("heard")) {
        mill.classList.remove("hidden");
        const ids = DESIGN.millEndRares || [];
        const n = ids.filter((id) => Journal.landed(id)).length;
        const heading = MillSpine.stage() === "turning"
          ? MILL_END_COPY.journalDone
          : `${MILL_END_COPY.journal} · ${n} / ${ids.length}`;
        const turning = MillSpine.stage() === "turning";
        const page = turning ? "" : `<p class="ink-soft">${MILL_END_COPY.page}</p>`;
        const hunger = turning ? "" : `<p class="ink-soft">${MILL_END_COPY.hunger}</p>`;
        mill.innerHTML = `<p>${heading}</p>${page}` + ids.map((id) => {
          const f = FISH.find((x) => x.id === id);
          const landed = Journal.landed(id);
          let label = "";
          if (f.season) {
            const sd = DESIGN.seasonDays;
            const day = Save.data.clock.day | 0;
            const t = SEASONS.indexOf(f.season);
            const cur = Math.floor((day - 1) / sd) % 4;
            if (cur === t) label = f.season + " only · now";
            else {
              let start = Math.floor((day - 1) / (4 * sd)) * 4 * sd + t * sd + 1;
              if (start <= day) start += 4 * sd;
              label = f.season + " only · next " + f.season + ": day " + start;
            }
          } else if (f.nightOnly) label = "nights only";
          const where = label ? `${SPOTS[f.spot].name} · ${label}` : SPOTS[f.spot].name;
          return `<div class="mill-rare"><canvas width="40" height="26" data-mill="${id}"></canvas><div>${landed ? f.name : "???"}</div><div class="ink-soft">${where}</div></div>`;
        }).join("") + hunger;
        mill.querySelectorAll("canvas").forEach((cv) => {
          const f = FISH.find((x) => x.id === cv.dataset.mill);
          const c = cv.getContext("2d");
          c.imageSmoothingEnabled = false;
          c.clearRect(0, 0, 40, 26);
          c.save();
          c.translate(16, 13);
          Sprites.fishIcon(c, 0, 0, f, !Journal.landed(f.id));
          c.restore();
        });
      } else {
        mill.classList.add("hidden");
        mill.innerHTML = "";
      }
    }
  },

  toggleJournal() {
    if (this.journalOpen) { this.closeJournal(); return; }
    Inventory.close(); Shop.close(); Board.close(); Mail.close();
    if (typeof Bench !== "undefined") Bench.close();
    if (typeof Tank !== "undefined") Tank.close();
    if (typeof Cooler !== "undefined") Cooler.close();
    if (typeof Trophy !== "undefined") Trophy.close();
    if (typeof Cert !== "undefined") Cert.close();
    if (typeof MillEnd !== "undefined") MillEnd.close();
    Inventory.closePaste();
    if (typeof Pause !== "undefined") Pause.close();
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
    if (typeof Trophy !== "undefined") Trophy.close();
    if (typeof Cert !== "undefined") Cert.close();
    if (typeof MillEnd !== "undefined") MillEnd.close();
    Inventory.closePaste();
    if (typeof Pause !== "undefined") Pause.close();
  },

  showCatch(fish, rec) {
    if (this.toastHoldT > 0) { this.refreshJournal(); return; }
    rec = rec || {};
    const el = this.els.toast;
    if (!el) return;
    el.classList.remove("miss");
    el.classList.remove("note");
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
    if (this.toastHoldT > 0) { this.refreshJournal(); return; }
    const el = this.els.toast;
    if (!el) return;
    el.classList.add("miss");
    el.classList.remove("note");
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

  /**
   * Plain parchment note. Long copy (signs, letters) passes a title so the body
   * drops into the smaller desc line, and the toast stays up long enough to read.
   */
  toastNote(text, title, now) {
    if (this.toastHoldT > 0) return;
    const el = this.els && this.els.toast;
    if (!el || !this.els.toastName) return;
    text = String(text == null ? "" : text);
    if (this.toastT > 0 && now !== true) {
      const titleKey = title || "";
      const last = this._noteQ[this._noteQ.length - 1];
      const desc = this.els.toastDesc ? this.els.toastDesc.textContent : "";
      const name = this.els.toastName.textContent;
      const sameLast = !!(last && last.text === text && (last.title || "") === titleKey);
      const sameShow = desc
        ? text === desc && (titleKey ? name === titleKey : name === "Note")
        : text === name && !titleKey;
      if (sameLast || sameShow) return;
      if (this._noteQ.length >= 3) this._noteQ.shift();
      this._noteQ.push({ text, title });
      return;
    }
    const long = !!title || text.length > (DESIGN.toastLongChars || 56);
    el.classList.remove("miss");
    el.classList.add("note");
    const kicker = el.querySelector(".toast-kicker");
    if (kicker) kicker.textContent = "";
    this.els.toastName.textContent = long ? (title || "Note") : text;
    if (this.els.toastDesc) this.els.toastDesc.textContent = long ? text : "";
    el.classList.remove("hidden");
    if (this.els.toastArt) this.els.toastArt.replaceChildren();
    const base = DESIGN.toastBase || 1.8;
    const per = DESIGN.toastPerChar || 0;
    this.toastT = Math.min(DESIGN.noteHoldMax / 1000, base + text.length * per);
  },

  toastWarn(text) {
    this.toastHoldT = 0;
    this.toastNote(text, undefined, true);
    this.toastT = DESIGN.toastMax || 7;
    this.toastHoldT = this.toastT;
  },

  update(dt) {
    if (this.toastHoldT > 0) this.toastHoldT -= dt;
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) {
        if (this.els.toast) this.els.toast.classList.add("hidden");
        if (this._noteQ.length && this.toastHoldT <= 0) {
          const next = this._noteQ.shift();
          this.toastNote(next.text, next.title, true);
        }
        if (typeof Stamps !== "undefined") Stamps.flush();
        try { if (typeof MillSpine !== "undefined") MillSpine.flushNote(); } catch (e) { /* mill note optional */ }
      }
    } else if (typeof Stamps !== "undefined") {
      Stamps.flush();
      try { if (typeof MillSpine !== "undefined") MillSpine.flushNote(); } catch (e) { /* mill note optional */ }
    }

    this.els.clockText.textContent = TimeCycle.clockLabel();
    const rankEl = document.getElementById("clock-rank");
    if (rankEl && typeof Skills !== "undefined") rankEl.textContent = `Rank ${Skills.rank()}`;
    const phase = TimeCycle.phaseId();
    const phaseLabel = { dawn: "Dawn", day: "Day", golden: "Dusk", night: "Night" }[phase] || phase;
    const season = TimeCycle.season();
    this.els.clock.classList.remove("dawn", "day", "golden", "night", "rain", "mist", "heat", "frost", "clear", "spring", "summer", "autumn", "winter");
    this.els.clock.classList.add(phase);
    const wx = TimeCycle.weatherId();
    this.els.clock.classList.add(wx, season);
    const phaseEl = document.getElementById("clock-phase");
    if (phaseEl) phaseEl.textContent = phaseLabel;
    const seasonEl = document.getElementById("clock-season");
    if (seasonEl) seasonEl.textContent = season.charAt(0).toUpperCase() + season.slice(1);
    const wxEl = document.getElementById("clock-weather");
    if (wxEl) wxEl.textContent = (WEATHERS[wx] && WEATHERS[wx].name) || wx;
    const iconEl = document.getElementById("clock-icon");
    if (iconEl && iconEl.tagName === "IMG") {
      const icons = {
        dawn: "assets/ui/hud-dawn.png",
        day: "assets/ui/hud-sun.png",
        golden: "assets/ui/hud-dawn.png",
        night: "assets/ui/hud-moon.png",
      };
      const src = icons[phase] || icons.day;
      if (iconEl.getAttribute("src") !== src) iconEl.src = src;
    }
    const rodEl = document.getElementById("clock-rod");
    if (rodEl && typeof Inventory !== "undefined") {
      const eq = Inventory.equipped();
      const empty = eq === "none" || Inventory.baitCount(eq) <= 0;
      let bait = empty ? "empty hook" : ((BAIT[eq] && BAIT[eq].name) || eq);
      if (!empty && BAIT[eq] && BAIT[eq].prefer && SPOTS[BAIT[eq].prefer]) {
        bait += " · " + SPOTS[BAIT[eq].prefer].name;
      }
      rodEl.textContent = Inventory.rod().name + " - " + bait;
    }

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
      let title = "Whisperwood Vale";
      let blurb = "A peaceful woodland valley with crystal-clear waters and abundant fish.";
      if (World.id === "cave") {
        title = "Crystal Cave";
        blurb = "A hidden lake glows under the southern hill. Still water, and fish like lanterns.";
      } else if (World.id === "cottage") {
        title = "Cottage";
        blurb = "Bed, tank, bench, and the daily board. Home, when the vale lets you rest.";
      } else if (World.id === "marsh") {
        title = "Misty Millpond";
        blurb = "East of the lake, a quiet marsh remembers the old mill.";
      } else if (World.id === "island") {
        title = "Windward Reach";
        blurb = "Open swell past the millpond. One boat home, always.";
      }
      const card = document.getElementById("region-card");
      if (title !== this._regionLast) {
        this._regionLast = title;
        this._regionAt = performance.now();
        if (card) card.classList.remove("region-away");
      }
      if (this.els.start && !this.els.start.classList.contains("hidden")) this._regionAt = performance.now();
      if (card && !card.classList.contains("region-away") && performance.now() - this._regionAt >= 4000) {
        card.classList.add("region-away");
      }
      this.els.regionTitle.textContent = title;
      this.els.regionBlurb.textContent = blurb;
    }

    const padHint = !this.touch() && document.documentElement.classList.contains("pad-input");
    const hintText = padHint ? "Y Journal · X Pack" : "J Journal · I Pack";
    if (this._hintEl === undefined) this._hintEl = document.getElementById("hint");
    if (this._hintEl && this._hintText !== hintText) {
      this._hintEl.textContent = hintText;
      this._hintText = hintText;
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
      this.els.prompt.textContent = this.padText(prompt);
      this.els.prompt.classList.remove("hidden");
      this.els.prompt.classList.toggle("bite", Fishing.state === "bite" || Fishing.state === "play");
      if (Fishing.state === "play" && !this.phonePortrait()) {
        const canvas = (typeof Renderer !== "undefined" && Renderer.canvas) || document.getElementById("game");
        const rect = canvas ? canvas.getBoundingClientRect() : null;
        const vh = typeof Renderer !== "undefined" ? Renderer.viewH : 0;
        if (rect && rect.height && vh) {
          const parent = this.els.prompt.offsetParent;
          const baseBottom = parent ? parent.getBoundingClientRect().bottom : window.innerHeight;
          const pxPerGame = rect.height / vh;
          this.els.prompt.style.bottom = Math.round((baseBottom - rect.bottom) + 36 * pxPerGame + 6) + "px";
        } else {
          const scale = (typeof Renderer !== "undefined" && Renderer.cssScale) || 2;
          this.els.prompt.style.bottom = (36 * scale + 8) + "px";
        }
      } else {
        this.els.prompt.style.bottom = "";
      }
    } else {
      this.els.prompt.classList.add("hidden");
      this.els.prompt.style.bottom = "";
    }
    if (this.touch()) {
      if (!this._fishBtn) this._fishBtn = document.getElementById("btn-fish");
      if (this._fishBtn) {
        const verb = this.fishVerb(prompt);
        if (verb !== this._fishVerb) {
          this._fishBtn.textContent = verb;
          this._fishVerb = verb;
        }
      }
    }
    if (this.anyMenu() && this.els.clock) this.els.clock.classList.remove("expanded");
    if (!this._packBtn) this._packBtn = document.getElementById("btn-packup");
    if (this._packBtn) this._packBtn.classList.toggle("is-on", Fishing.state === "aim" && !this.anyMenu());
    const onTitle = !!(this.els.start && !this.els.start.classList.contains("hidden"));
    const menuUp = this.anyMenu();
    const release = (pad, all) => {
      const btns = pad.querySelectorAll(all ? "button" : "button.is-held");
      for (let i = 0; i < btns.length; i++) btns[i].dispatchEvent(new Event("pointercancel"));
    };
    if (!this._movePad) this._movePad = document.getElementById("move-pad");
    if (!this._menuPad) this._menuPad = document.getElementById("menu-pad");
    const mp = this._movePad, np = this._menuPad;
    if (mp) {
      const hide = menuUp && !onTitle;
      if (hide !== mp.classList.contains("menu-hide")) {
        if (hide && mp.classList.contains("is-touch")) {
          release(mp, false);
          const fish = document.getElementById("btn-fish");
          if (fish && typeof Minigame !== "undefined" && Minigame._padHold) fish.dispatchEvent(new Event("pointercancel"));
        }
        mp.classList.toggle("menu-hide", hide);
      }
    }
    if (np && menuUp !== np.classList.contains("menu-hide")) {
      if (menuUp) release(np, true);
      np.classList.toggle("menu-hide", menuUp);
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
  eating: null,
  sitting: false,

  boot() {
    if (this.booted) return;
    try {
      if (window.valeDesktop) document.documentElement.classList.add("vale-desktop");
      try { if (typeof Atlas !== "undefined") Atlas.load(); } catch (err) { /* sheets optional */ }
      Input.bind();
      Input.bindPad();
      Save.load();
      World.generate();
      Player.spawn();
      Save.applyToWorld();
      try { if (typeof Stamps !== "undefined") Stamps.reconcile(); } catch (e) { /* stamps optional */ }
      if (!Save.data.quests.daily.day) {
        try { Weather.rollDay(); } catch (e) { /* sky still works on the default forecast */ }
        try { Quests.rollDay(); } catch (e) { /* board flavor must not block boot */ }
      }
      try { if (Save.returning()) Mail.generateAway(); } catch (e) { /* tray optional */ }
      try { Shop.restock(); } catch (e) { /* stall optional */ }
      Renderer.init();
      UI.init();
      try {
        if (typeof MillSpine !== "undefined") {
          MillSpine.tickHeard();
          if (Save.data.flags.fifthWater) MillSpine.onOpened();
          MillSpine.onVisited();
        }
      } catch (spineErr) { /* mail flavor must not block boot */ }
      try { if (typeof Island !== "undefined") Island.sync(true); } catch (e) { /* island optional */ }
      Survival.refreshPips();
      World.portalCool = (typeof DESIGN !== "undefined" && DESIGN.doorCool > 0) ? DESIGN.doorCool : 0.35;
      this._nudgeOutOfPortal();
      const canvas = document.getElementById("game");
      const frame = document.getElementById("frame");
      if (frame) {
        frame.addEventListener("pointerdown", () => {
          try { if (canvas) canvas.focus({ preventScroll: true }); } catch (e) { /* focus optional */ }
        });
      }
      window.addEventListener("visibilitychange", () => { if (document.hidden) Save.write(); });
      const leave = () => {
        if (UI.anyMenu() || Npcs.talkId || Game.sleeping || Game.fading) return;
        if (typeof Minigame !== "undefined") Minigame._padHold = false;
        Pause.open();
      };
      window.addEventListener("blur", leave);
      document.addEventListener("visibilitychange", () => { if (document.hidden) leave(); });
      document.addEventListener("visibilitychange", () => AudioFX.setHidden(document.hidden));
      window.addEventListener("pagehide", () => Save.write());
      if (window.valeDesktop) window.valeDesktop.onSaveRequest(() => Save.write());
      const hint = document.getElementById("hint");
      if (hint) hint.textContent = "J Journal · I Pack";
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
      try {
        const rec = document.getElementById("start-recap");
        if (rec) rec.innerHTML = `<li>Boot failed: ${String((err && err.message) || err)}</li>`;
        const btn = document.getElementById("btn-start");
        if (btn) {
          btn.textContent = "Retry boot";
          btn.onclick = () => { this.booted = false; this.boot(); };
        }
      } catch (e) { /* ignore */ }
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
    if (Save._loadWarn) { const w = Save._loadWarn; Save._loadWarn = ""; try { UI.toastWarn(w); } catch (e) {} }
    Save.data.flags.introComplete = true;
    try { if ((Save.data.skills.offered || []).length && !Skills.offering) Skills._showOffer(); } catch (e) { /* offer optional */ }
    try {
      if (typeof MillSpine !== "undefined" && MillSpine.stage() === "turning"
        && Save.data.flags && !Save.data.flags.millEndSeen && !Skills.offering) MillEnd.open();
    } catch (e) { /* mill card optional */ }
    if (UI.els.btn) UI.els.btn.blur();
    const canvas = document.getElementById("game");
    try { if (canvas) canvas.focus({ preventScroll: true }); } catch (e) { /* focus optional */ }
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
    this.portraitHint();
  },

  portraitHint() {
    if (this._portraitTold) return;
    const st = document.getElementById("start-screen");
    if (!st || !st.classList.contains("hidden")) return;
    if (!window.matchMedia("(orientation: portrait) and (pointer: coarse)").matches) return;
    if (UI.toastHoldT > 0) return;
    this._portraitTold = true;
    UI.toastNote("Turn sideways for the full vale.");
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

  holdFood(fish, meal) {
    this.eating = { t: 0, dur: 1.15, fish: fish || null, meal: meal || null };
    Player.locked = true;
    Player.vx = 0;
    Player.vy = 0;
  },

  _updateEat(dt) {
    if (!this.eating) return;
    this.eating.t += dt;
    if (this.eating.t >= this.eating.dur) {
      this.eating = null;
      Player.locked = false;
    }
  },

  sleepReady() {
    const hours = (typeof DESIGN !== "undefined" && (DESIGN.sleepAwakeHours | 0)) || 0;
    if (hours <= 0) return true;
    const wake = (Save.data && Save.data.flags && +Save.data.flags.sleepWakeAt) || 0;
    if (wake <= 0) return true;
    const need = wake + (hours / 24) * CONFIG.DAY_LENGTH;
    return TimeCycle.seconds + 0.05 >= need;
  },

  sleepRefusal() {
    const hours = (typeof DESIGN !== "undefined" && (DESIGN.sleepAwakeHours | 0)) || 0;
    const wake = (Save.data && Save.data.flags && +Save.data.flags.sleepWakeAt) || 0;
    if (hours <= 0 || wake <= 0) return "The bed can wait. Stay up a while.";
    const need = wake + (hours / 24) * CONFIG.DAY_LENGTH;
    const raw = ((need / CONFIG.DAY_LENGTH) * 24 % 24) * 60;
    const mins = Math.ceil(raw - 1e-6) % 1440;
    const hh = Math.floor(mins / 60), mm = mins % 60;
    const ap = hh >= 12 ? "PM" : "AM";
    const h12 = ((hh + 11) % 12) + 1;
    return `The bed opens at ${h12}:${String(mm).padStart(2, "0")} ${ap}. Stay up a while.`;
  },

  startSleep() {
    if (this.sleeping || this.fading) return;
    if (!this.sleepReady()) {
      UI.toastNote(this.sleepRefusal());
      return;
    }
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
      if (Save.data && Save.data.flags) Save.data.flags.sleepWakeAt = TimeCycle.seconds;
      UI.toastNote(this.sleeping.toast);
      Save.mark("sleep");
      this.sleeping.applied = true;
    }
    Player.sleeping = false;
    Player.locked = false;
    Cottage.wakeBesideBed();
    this.sleeping = null;
    this.sleepCool = 0.45;
    try { MillSpine.tickTurning(); } catch (e) { /* mill ending optional */ }
  },

  _updateSit(dt) {
    if (!(typeof Cottage !== "undefined" && Cottage.sitting)) return;
    if (Cottage.sitLock > 0) Cottage.sitLock -= dt;
    const axis = Input.axis();
    if (Cottage.sitLock <= 0 && (axis.x || axis.y || Input.use)) {
      Cottage.stopSit();
      return;
    }
    Cottage.sitT += dt;
    Survival.add("rest", DESIGN.chairRest * dt);
  },

  _nudgeOutOfPortal() {
    const p = World.settlePoint(Player.x, Player.y, Player.dir);
    Player.x = p.x;
    Player.y = p.y;
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
    this._nudgeOutOfPortal();
    if (portal.to === "cottage") {
      Save.data.cottage.visited = true;
      Npcs._checkMarsh();
      if (typeof MillSpine !== "undefined") MillSpine.tickHeard();
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
      World.portalCool = (typeof DESIGN !== "undefined" && DESIGN.doorCool > 0) ? DESIGN.doorCool : 0.35;
      this.fading = null;
    }
  },

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    Input.pollPad();
    if (!(typeof Admin !== "undefined" && Admin.open)) {
      const fightHeld = typeof Pause !== "undefined" && Pause.openFlag && Fishing.inFight();
      if (Input.pressed["j"] && !Skills.offering && !this.sleeping && !fightHeld) UI.toggleJournal();
      if (Input.pressed["i"] && !Skills.offering && !this.sleeping && !fightHeld) Inventory.toggle();
    }
    if (Input.pressed["1"]) Inventory.numberKey(1);
    if (Input.pressed["2"]) Inventory.numberKey(2);
    if (Input.pressed["3"]) Inventory.numberKey(3);
    if (Input.pressed["4"]) Inventory.numberKey(4);
    if (Input.pressed["5"]) Inventory.numberKey(5);
    if (Input.pressed["escape"]) {
      if (Skills.offering) { /* wait for a perk pick */ }
      else if (UI.anyMenu() || Npcs.talkId) UI.closeAll();
      else if (typeof Cottage !== "undefined" && Cottage.sitting) Cottage.stopSit();
      else if (Fishing.inFight()) Pause.open();
      else if (Fishing.active) Fishing.reelIn();
      else if (!this.sleeping && !this.fading) Pause.open();
    }

    const pauseWorld = UI.anyMenu();
    if (!pauseWorld) {
      if (this.sleeping) {
        this._updateSleep(dt);
      } else {
        this._updateFade(dt);
        World.update(dt);
        if (this.sleepCool > 0) this.sleepCool -= dt;
        this._updateEat(dt);
        if (typeof Cottage !== "undefined" && World.id === "cottage") {
          Cottage.freeFromBed();
          Cottage.tweakCarry();
          if (Input.pressed.q && !Cottage.carry && !Cottage.sitting) {
            const q = Cottage.nearSlot("chair") ? "chair" : Cottage.nearAnySlot();
            if (q) Cottage.pickUp(q);
          }
        }
        if (typeof Cottage !== "undefined" && Cottage.sitting) {
          this._updateSit(dt);
        } else if (!this.fading && this.sleepCool <= 0 && !this.eating) {
          if (Input.use) Fishing.act();
        }
        if (!(typeof Cottage !== "undefined" && Cottage.sitting)) Player.update(dt);
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
        try { if (typeof Onboard !== "undefined") Onboard.update(dt); } catch (e) { /* nudges optional */ }
      }
    }

    try { if (typeof Onboard !== "undefined") Onboard.observe(); } catch (e) { /* nudges optional */ }
    try {
      const rain = typeof TimeCycle !== "undefined" && TimeCycle.weatherId() === "rain" && !World.indoor();
      if (typeof AudioFX !== "undefined") AudioFX.syncRain(!!rain);
    } catch (e) { /* rain bed optional */ }
    try { if (typeof AudioFX !== "undefined") AudioFX.syncMill(now / 1000); } catch (e) { /* mill bed optional */ }
    try {
      const want = (typeof MillEnd !== "undefined" && MillEnd.openFlag) ? "ending" : World.id === "cottage" ? "cottage" : TimeCycle.weatherId() === "rain" ? "rain" : "day";
      if (typeof AudioFX !== "undefined") AudioFX.syncMusic(want, Fishing.inFight());
    } catch (e) { /* music optional */ }
    UI.update(dt);
    Renderer.render(now);
    Input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },
};

window.addEventListener("DOMContentLoaded", () => Game.boot());
if (document.readyState !== "loading") Game.boot();
