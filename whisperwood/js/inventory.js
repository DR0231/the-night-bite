/* Pack, bait, coins, world pickups, simple craft. */

const Inventory = {
  open: false,

  baitCount(id) { return Save.data.inventory.bait[id] | 0; },

  addBait(id, n) {
    const b = Save.data.inventory.bait;
    b[id] = (b[id] | 0) + n;
    if (b[id] < 0) b[id] = 0;
  },

  equipped() { return Save.data.inventory.equippedBait || "worms"; },

  equip(id) {
    if (!HOOK_BAIT.includes(id)) return false;
    if (this.baitCount(id) <= 0 && id !== "worms") return false;
    Save.data.inventory.equippedBait = id;
    return true;
  },

  rod() { return RODS[Save.data.inventory.rodId] || RODS.willow; },

  ownsRod(id) { return (Save.data.inventory.ownedRods || []).indexOf(id) >= 0; },

  giveRod(id) {
    const list = Save.data.inventory.ownedRods || (Save.data.inventory.ownedRods = ["willow"]);
    if (list.indexOf(id) < 0) list.push(id);
    Save.data.inventory.rodId = id;
  },

  consumeCastBait() {
    const id = this.equipped();
    if (this.baitCount(id) <= 0) {
      if (this.baitCount("worms") > 0) Save.data.inventory.equippedBait = "worms";
      else return "none";
    }
    this.addBait(this.equipped(), -1);
    return this.equipped();
  },

  biteMult(spotId) {
    if (this.baitCount(this.equipped()) <= 0) return 0.45;
    const id = this.equipped();
    const bait = BAIT[id] || BAIT.worms;
    let m = bait.bonus || 1;
    if (bait.prefer && bait.prefer === spotId) m *= 1.25;
    else if (bait.prefer) m *= 0.72;
    if (spotId === "cave" && bait.prefer !== "cave") m *= bait.strong ? 1 : 0.42;
    if (spotId === "cave" && (id === "glow" || id === "glowplus")) m *= this.rod().caveLuck || 1;
    return m;
  },

  coins() { return Save.data.player.coins | 0; },
  addCoins(n) { Save.data.player.coins = Math.max(0, this.coins() + n); },

  toggle() {
    this.open = !this.open;
    const el = document.getElementById("pack");
    if (el) el.classList.toggle("hidden", !this.open);
    if (this.open) {
      UI.closeJournal();
      Shop.close();
      Board.close();
      Mail.close();
      if (typeof Bench !== "undefined") Bench.close();
      if (typeof Tank !== "undefined") Tank.close();
      this.refresh();
    } else {
      Save.mark();
    }
  },

  close() {
    if (!this.open) return;
    this.open = false;
    const el = document.getElementById("pack");
    if (el) el.classList.add("hidden");
    Save.mark();
  },

  refresh() {
    const el = document.getElementById("pack-body");
    if (!el) return;
    const rod = this.rod();
    const eq = this.equipped();
    const rows = HOOK_BAIT.map((id, i) => {
      const b = BAIT[id];
      const n = this.baitCount(id);
      const on = eq === id;
      return `<button type="button" class="pack-bait${on ? " is-on" : ""}" data-bait="${id}">
        <kbd>${i + 1}</kbd> ${b.name} ×${n}${on ? " · on hook" : ""}
      </button>`;
    }).join("");
    const extras = ["berries", "crystal"].map((id) => `${BAIT[id].name} ×${this.baitCount(id)}`).join(" · ");
    const meal = Survival.meal();
    const mealLine = meal ? `Active meal: ${meal.name}` : "No meal in you.";
    const cooked = Object.keys(MEALS).map((id) => {
      const n = Save.data.inventory.meals[id] | 0;
      const m = MEALS[id];
      const name = Save.data.flags.cooked[id] ? m.name : "???";
      if (n < 1) return "";
      return `<button type="button" data-eat="${id}">Eat ${name} ×${n}</button>`;
    }).join("");
    const tools = [];
    if (this.baitCount("berries") > 0) tools.push(`<button type="button" id="btn-eat-berries">Eat berries (+12 hunger)</button>`);
    if (Save.data.inventory.items.cloak | 0) tools.push("<p>Wool cloak — worn.</p>");
    if (Save.data.inventory.items.campfireKit | 0) tools.push(`<p>Campfire kit ×${Save.data.inventory.items.campfireKit}</p>`);
    if (Save.data.inventory.items.lantern | 0) {
      const on = Save.data.inventory.lanternOn;
      const fuel = Math.ceil(Save.data.inventory.items.lanternFuel || 0);
      tools.push(`<button type="button" id="btn-lantern">${on ? "Douse lantern" : "Light lantern"} (fuel ${fuel})</button>`);
      tools.push(`<button type="button" id="btn-fuel">Fill lantern (glow or crystal → 6)</button>`);
    }
    el.innerHTML = `
      <p class="pack-rod"><strong>${rod.name}</strong> — ${rod.desc}</p>
      <p class="pack-rank">${Skills.line()}</p>
      <p class="pack-coins">${this.coins()} coins</p>
      <div class="pack-baits">${rows}</div>
      <p class="pack-extra">${extras}</p>
      <p class="pack-meal">${mealLine}</p>
      <div class="pack-eats">${cooked}</div>
      <div class="pack-tools">${tools.join("")}</div>
      <p class="pack-craft">Bench: berries + worm → berry blend · crystal + worm → bright glow · meals in the pan</p>
      <label class="pack-mute"><input type="checkbox" id="chk-mute" ${Save.data.flags.mute ? "checked" : ""}/> Mute audio</label>
      <div class="pack-io">
        <button type="button" id="btn-download">Download save</button>
        <button type="button" id="btn-load">Load save</button>
        <input type="file" id="pack-load-file" accept="application/json,.json" hidden />
        <button type="button" id="btn-reset">Full reset</button>
        <button type="button" id="btn-export">Copy save</button>
        <button type="button" id="btn-import">Paste save</button>
      </div>`;
    el.querySelectorAll("[data-bait]").forEach((btn) => {
      btn.addEventListener("click", () => { this.equip(btn.dataset.bait); this.refresh(); });
    });
    el.querySelectorAll("[data-eat]").forEach((btn) => {
      btn.addEventListener("click", () => Survival.eatMeal(btn.dataset.eat));
    });
    const berries = el.querySelector("#btn-eat-berries");
    if (berries) berries.addEventListener("click", () => Survival.eatBerries());
    const lan = el.querySelector("#btn-lantern");
    if (lan) lan.addEventListener("click", () => Survival.toggleLantern());
    const fuel = el.querySelector("#btn-fuel");
    if (fuel) fuel.addEventListener("click", () => Survival.fillLantern());
    const mute = el.querySelector("#chk-mute");
    if (mute) mute.addEventListener("change", () => {
      Save.data.flags.mute = mute.checked;
      AudioFX.muted = mute.checked;
    });
    const dl = el.querySelector("#btn-download");
    if (dl) dl.addEventListener("click", () => this.downloadSave());
    const loadBtn = el.querySelector("#btn-load");
    const fileIn = el.querySelector("#pack-load-file");
    if (loadBtn && fileIn) {
      loadBtn.addEventListener("click", () => fileIn.click());
      fileIn.addEventListener("change", () => {
        const file = fileIn.files && fileIn.files[0];
        fileIn.value = "";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try { Save.importJson(String(reader.result || "")); location.reload(); }
          catch (e) { UI.toastNote("That save could not be read."); }
        };
        reader.onerror = () => UI.toastNote("That save could not be read.");
        reader.readAsText(file);
      });
    }
    const reset = el.querySelector("#btn-reset");
    if (reset) reset.addEventListener("click", () => this.fullReset());
    const exp = el.querySelector("#btn-export");
    if (exp) exp.addEventListener("click", () => {
      navigator.clipboard.writeText(Save.exportJson()).catch(() => {});
      UI.toastNote("Save copied to clipboard.");
    });
    const imp = el.querySelector("#btn-import");
    if (imp) imp.addEventListener("click", () => {
      const text = window.prompt("Paste a Whisperwood save JSON");
      if (!text) return;
      try { Save.importJson(text); location.reload(); } catch (e) { UI.toastNote("That save could not be read."); }
    });
  },

  numberKey(n) {
    if (!this.open) return;
    const id = HOOK_BAIT[n - 1];
    if (id) { this.equip(id); this.refresh(); }
  },

  downloadSave() {
    const blob = new Blob([Save.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "whisperwood-save.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  },

  fullReset() {
    if (!window.confirm("Wipe this vale and start fresh?")) return;
    if (!window.confirm("Really erase whisperwood-save-v1?")) return;
    Save.resetFreshKeepingMute();
    location.reload();
  },

  craft(kind) {
    if (kind === "berryblend" && this.baitCount("berries") > 0 && this.baitCount("worms") > 0) {
      this.addBait("berries", -1); this.addBait("worms", -1); this.addBait("berryblend", 1);
      return true;
    }
    if (kind === "glowplus" && this.baitCount("crystal") > 0 && this.baitCount("worms") > 0) {
      this.addBait("crystal", -1); this.addBait("worms", -1); this.addBait("glowplus", 1);
      return true;
    }
    return false;
  },
};

const Pickups = {
  try() {
    const list = World.decos;
    let best = null, bestD = CONFIG.PICK_RANGE;
    for (const d of list) {
      if (d.type !== "pickup" || d.taken) continue;
      const dist = Utils.dist(Player.x, Player.y, d.x, d.y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    if (!best) return false;
    best.taken = true;
    let n = best.n || 1;
    if (Skills.has("forager") && Math.random() < 0.4) n += 1;
    Inventory.addBait(best.item, n);
    UI.toastNote(`Picked ${BAIT[best.item] ? BAIT[best.item].name : best.item}.`);
    Save.mark();
    return true;
  },

  near() {
    for (const d of World.decos) {
      if (d.type !== "pickup" || d.taken) continue;
      if (Utils.dist(Player.x, Player.y, d.x, d.y) < CONFIG.PICK_RANGE) {
        return BAIT[d.item] ? BAIT[d.item].name : "something";
      }
    }
    return null;
  },

  scatter(addDeco, get, rng, tw, th, mapId) {
    const kinds = mapId === "cave"
      ? [["glow", 4, 1], ["crystal", 5, 1]]
      : [["worms", 10, 1], ["crickets", 5, 1], ["berries", 6, 1]];
    for (const [item, n, qty] of kinds) {
      let placed = 0, guard = 0;
      while (placed < n && guard++ < 90) {
        const tx = 3 + Utils.irand(rng, 0, tw - 8);
        const ty = 3 + Utils.irand(rng, 0, th - 8);
        const t = get(tx, ty);
        if (t !== TILE.GRASS && t !== TILE.SHORE && t !== TILE.CAVE_FLOOR && t !== TILE.DIRT) continue;
        addDeco("pickup", tx * TILE_SIZE + 8, ty * TILE_SIZE + 10, { item, n: qty, taken: false });
        placed++;
      }
    }
  },
};
