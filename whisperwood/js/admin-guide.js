/* F8 bible. Built at runtime from FISH, BAIT, RODS, MEALS, PERKS, SPOTS,
   SHOP_CATALOG, FISHING_FEEL, RANK_NEED, WEATHERS, NPC_DATA, DESIGN, CONFIG.
   Cursor: do not hardcode lists or prices here. Change the tables / DESIGN. */

const AdminGuide = {
  tab: "cheats",

  setTab(id) {
    this.tab = id || "cheats";
    const cheats = document.getElementById("admin-cheats");
    const docs = document.getElementById("admin-docs");
    if (cheats) cheats.classList.toggle("hidden", this.tab !== "cheats");
    if (docs) {
      docs.classList.toggle("hidden", this.tab === "cheats");
      if (this.tab !== "cheats") docs.innerHTML = this._html(this.tab);
    }
    document.querySelectorAll("[data-admin-tab]").forEach((b) => {
      b.classList.toggle("is-on", b.getAttribute("data-admin-tab") === this.tab);
    });
    if (this.tab === "cheats") {
      const input = document.getElementById("admin-cmd");
      if (input) input.focus();
    }
  },

  refresh() {
    if (this.tab !== "cheats") this.setTab(this.tab);
  },

  _d() { return DESIGN; },

  _html(tab) {
    if (tab === "play") return this._play();
    if (tab === "progress") return this._progress();
    if (tab === "items") return this._items();
    if (tab === "fish") return this._fish();
    if (tab === "check") return this._check();
    return "";
  },

  _phaseLine() {
    return DESIGN.phases.map((p) => {
      const a = p.range[0], b = p.range[1];
      const span = a < b ? `${a}–${b}` : `${a}–24 and 0–${b}`;
      return `${p.label} ${span}`;
    }).join("; ");
  },

  _play() {
    const D = DESIGN;
    const still = FISHING_FEEL.still;
    const moving = FISHING_FEEL.moving;
    const mg = {};
    for (const id of Object.keys(SPOTS)) {
      const k = SPOTS[id].minigame;
      if (!mg[k]) mg[k] = [];
      mg[k].push(SPOTS[id].name);
    }
    const mgHow = {
      timing: "Tap E / Space when the marker is in the gold band. Fail after ~6.5s.",
      timingFast: "Same tap as timing, faster sweep and a thinner band.",
      tension: "Hold E / Space (do not tap) to keep the needle in a drifting band until the meter fills. Fail after ~7.5s.",
      tensionErratic: "Same hold as tension, but the band jumps around. Built for the cave.",
    };
    const mgList = Object.keys(mg).map((k) =>
      `<li><strong>${k}</strong> (${mg[k].join(", ")}) — ${mgHow[k] || "See minigame.js."}</li>`
    ).join("");
    return `
      <p class="journal-sub">This page is generated from the live game tables. If a Cursor prompt changes config.js / DESIGN, refresh the page and this text updates.</p>
      <h3>What this game is</h3>
      <p>Whisperwood Vale is a <strong>cozy fishing evening</strong>, not a combat RPG. No HP, no death, no account. Save key <code>${SAVE_KEY}</code>. Hunger 0 still lands commons; rares are removed from the bite pool. Passing out warps you home — it never wipes the journal.</p>
      <p>One in-game day is <strong>${CONFIG.DAY_LENGTH} seconds</strong> (~${Math.round(CONFIG.DAY_LENGTH / 60)} min). Start hour ${CONFIG.START_HOUR}:00. Phases: ${this._phaseLine()}. Seasons rotate every ${D.seasonDays} in-game days: ${SEASONS.join(" → ")}.</p>

      <h3>The loop</h3>
      <ol>
        <li><strong>Walk.</strong> WASD / arrows. E / Space: fish, talk, pick up, enter doors.</li>
        <li><strong>Fish from land</strong> within ${CONFIG.FISH_RANGE}px of water. Cast distance ${CONFIG.CAST_DIST}px × rod reach. Bait is consumed when the bobber lands, not when you press Fish.</li>
        <li><strong>Nibble ≠ bite.</strong> Small dunks are nibbles — do not hook. A real bite yanks the bobber and starts the minigame immediately.</li>
        <li><strong>Land, then spend extras</strong> at Wren (sell), the packing bench (cook/craft), the tank (tuck), or as an NPC gift (one duplicate per person per day).</li>
        <li><strong>Sleep in the cottage</strong> before warmth or rest hits 0 at night. Pass-out: warmth/rest at 0 during golden/night, or hunger below ${D.passOutHunger}. Once per calendar day. Wake at dawn, 60/60/60 needs, lose ~20% of hooked bait unless Soft landing.</li>
      </ol>

      <h3>Wait / nibble numbers</h3>
      <p><strong>Still water</strong> (${Object.keys(SPOTS).filter((id) => SPOTS[id].mood === "still").map((id) => SPOTS[id].name).join(", ")}): wait ${still.waitMin}–${still.waitMax}s, ${still.nibbleCount[0]}–${still.nibbleCount[1]} nibbles, hook window ${still.hookWindow}s.</p>
      <p><strong>Moving water</strong> (${Object.keys(SPOTS).filter((id) => SPOTS[id].mood === "moving").map((id) => SPOTS[id].name).join(", ")}): wait ${moving.waitMin}–${moving.waitMax}s, ${moving.nibbleCount[0]}–${moving.nibbleCount[1]} nibbles, hook window ${moving.hookWindow}s, bobber drifts.</p>
      <p>Wait is divided by the bait multiplier (empty hook uses ×${D.emptyHookBite}). Today’s hotspot multiplies wait by ${D.hotspotWait} (faster bites).</p>
      <p>Opening the journal on wait/nibble packs the rod. Opening it during the minigame <strong>fails the fish</strong>.</p>

      <h3>Minigames (from each water’s <code>minigame</code> field)</h3>
      <ul>${mgList}</ul>
      <p>Bar width = rod.bar × Steady hands (${PERKS.steadyhands ? "×1.12" : ""}) × river-stew-style steady meal × hunger-under-${D.hungerBarShrink} penalty (×0.88). Finch is snappier (speed ${RODS.finch.speed}); Spine is the cave rod (tension ${RODS.spine.tension}, caveLuck ${RODS.spine.caveLuck}).</p>

      <h3>Needs</h3>
      <p>Five pips. Warnings under ${D.needWarn}. Hunger 0 blocks rares. Cloak ×${D.cloakWarmth} weather warmth. Lantern (lit, night, outdoors, not cave) ×${D.lanternWarmth} extra warmth drain and skips the “night without lamp” rest penalty. Fuel burns ${D.lanternBurn}/s; +${D.lanternFuel} per glow or crystal. Campfire warms inside ${D.campfireRange}px until dawn. Berries eat for +${D.berryHunger} hunger, no buff.</p>
    `;
  },

  _progress() {
    const D = DESIGN;
    const ranks = RANK_NEED.map((n, i) => `Rank ${i + 1}→${i + 2} costs ${n} XP`).join("; ");
    const shopGates = SHOP_CATALOG.map((it) => {
      const name = it.name || (it.kind === "bait" && BAIT[it.id] ? BAIT[it.id].name : null)
        || (it.kind === "rod" && RODS[it.id] ? RODS[it.id].name : it.id);
      const bits = [];
      if (it.minRank) bits.push("rank " + it.minRank);
      if (it.requireFish) {
        const f = FISH.find((x) => x.id === it.requireFish);
        bits.push("must have landed " + (f ? f.name : it.requireFish));
      }
      if (it.requireBait) bits.push("hand in " + (BAIT[it.requireBait] ? BAIT[it.requireBait].name : it.requireBait));
      if (it.price != null) bits.push(it.price + "c");
      if (it.cost != null) bits.push(it.cost + "c");
      if (RODS[it.id] && RODS[it.id].cost) bits.push(RODS[it.id].cost + "c");
      if (it.kind === "upgrade") bits.push("donate, not coins");
      return `<li><strong>${name}</strong> — ${bits.join(" · ") || it.kind}${it.desc ? ". " + it.desc : ""}</li>`;
    }).join("");
    const perks = Object.keys(PERKS).map((id) =>
      `<li><strong>${PERKS[id].name}</strong> — ${PERKS[id].desc}${this._perkHow(id)}</li>`
    ).join("");
    const people = NPC_DATA.map((n) =>
      `<li><strong>${n.name}</strong> (${n.role}) — ${n.greet}</li>`
    ).join("");
    return `
      <p class="journal-sub">Gates and shop rows are read from SHOP_CATALOG, RANK_NEED, DESIGN, and NPC_DATA.</p>
      <h3>You start with</h3>
      <p>${D.startCoins} coins, Willow rod, bait:
        ${Object.keys(D.startBait).map((id) => `${D.startBait[id]}× ${BAIT[id] ? BAIT[id].name : id}`).join(", ")}.</p>
      <h3>Unlock spine</h3>
      <ol>
        <li><strong>Cottage</strong> — south door of the house. Always open. Visit flag is required for the millpond.</li>
        <li><strong>Crystal Cave</strong> — south hill mouth. Always open. Cave without a cave-prefer bait is ×${D.caveWrongBait} unless the bait is strong.</li>
        <li><strong>Shop gear</strong> (live catalog):<ul>${shopGates}</ul></li>
        <li><strong>Misty Millpond</strong> — land <strong>${D.millpondUnique} unique species</strong>, visit the cottage, and have <strong>any NPC at ${D.millpondHearts}+ hearts</strong>. Then the east raft works. Checked when you gift an NPC.</li>
      </ol>
      <h3>Fisher rank</h3>
      <p>${ranks}. Cap 8. XP: first land +${D.xpFirstLand}, new size record +${D.xpRecord}, daily/rumor/derby +${D.xpQuest}, first of that species today +${D.xpSpeciesToday}, then +${D.xpRepeat} for the next ${D.xpRepeatCap} repeats. A miss on a never-landed fish +${D.xpSight} once. Each rank offers ${D.perkOffer} random unowned perks; pick one. First time you hit rank 3 you also get a campfire kit.</p>
      <ul>${perks}</ul>
      <h3>People</h3>
      <ul>${people}</ul>
      <p>Gift: one per NPC per day, need a species with caught ≥ ${D.giftMinCaught} (keep your first). Hearts cap ${D.npcHeartCap}. Daily board complete: +${D.dailyCoins}c, +${D.dailyWorms} worms, +1 Wren heart.</p>
      <h3>Each day also rolls</h3>
      <p>Forecast of 3 weathers (${Object.keys(WEATHERS).map((id) => WEATHERS[id].name).join(", ")}), a hotspot among unlocked waters, daily board, rumor, shop restock, gift flags. Weekend or every 7th vale-day: derby of 8 still- or moving-water fish.</p>
    `;
  },

  _perkHow(id) {
    const D = DESIGN;
    const extra = {
      steadyhands: " Timing gold band ×1.12.",
      ironwrist: " Tension band ×1.2; fill need ×0.9.",
      nightowl: ` Night rest drain ×${D.nightOwlRest}; night bite weights ×${D.nightOwlBite}.`,
      weathered: ` Rain/frost extra warmth ×${D.weatheredWarmth} (stacks with cloak ×${D.cloakWarmth}).`,
      forager: ` Ground pickups: ${Math.round(D.foragerChance * 100)}% chance +1 extra.`,
      campcook: ` Meals restore ×${D.campcookRestore} and the buff lasts until the day after you eat.`,
      homeshore: ` Favorite journal water counts as a mild hotspot (×${D.homeShoreBite}) when it is not already the day’s hotspot (×${D.hotspotBite}).`,
      softlanding: " Pass-out no longer steals bait.",
    };
    return extra[id] || "";
  },

  _items() {
    const D = DESIGN;
    const baitRows = Object.keys(BAIT).map((id) => {
      const b = BAIT[id];
      const hook = HOOK_BAIT.indexOf(id) >= 0;
      const prefer = b.prefer && SPOTS[b.prefer] ? SPOTS[b.prefer].name : "none";
      let use = hook ? `Hook bait (pack keys). Prefer: ${prefer}.` : "Not for the hook — bench, cook, lantern, or Wren.";
      if (b.bonus) use += ` Bonus ×${b.bonus}.`;
      if (b.strong) use += " Strong in the cave (skips the wrong-bait penalty).";
      if (b.guide) use += " " + b.guide;
      return `<li><strong>${b.name}</strong> — ${b.desc} ${use}</li>`;
    }).join("");
    const rodRows = Object.keys(RODS).map((id) => {
      const r = RODS[id];
      const f = r.requireFish && FISH.find((x) => x.id === r.requireFish);
      const gate = f ? ` Unlock: land ${f.name}, then ${r.cost}c at Wren.` : " Starter rod.";
      return `<li><strong>${r.name}</strong> — ${r.desc} bar ${r.bar}, speed ${r.speed}, tension ${r.tension}, reach ${r.reach}, cave luck ${r.caveLuck}.${gate}</li>`;
    }).join("");
    const mealRows = Object.keys(MEALS).map((id) => {
      const m = MEALS[id];
      const need = Object.keys(m.need).map((k) => {
        if (k === "anyCommonFish") return "any common fish";
        if (BAIT[k]) return `${m.need[k]}× ${BAIT[k].name}`;
        const f = FISH.find((x) => x.id === k);
        return `${m.need[k]}× ${f ? f.name : k}`;
      }).join(" + ");
      const buff = m.buff === "tea" ? " Buff: rest drains slower."
        : m.buff === "steady" ? " Buff: wider timing bar."
        : m.buff === "warm" ? " Buff: weather/cave warmth drain cut."
        : " No lingering buff.";
      return `<li><strong>${m.name}</strong> — ${m.desc} Need ${need}. Eat: hunger +${m.hunger}, warmth +${m.warmth}, rest +${m.rest}.${buff}</li>`;
    }).join("");
    const shopExtra = SHOP_CATALOG.filter((it) => it.kind === "item" || it.kind === "upgrade").map((it) =>
      `<li><strong>${it.name}</strong> — ${it.desc || it.kind}${it.minRank ? " Rank " + it.minRank + "." : ""}${it.price != null ? " " + it.price + "c." : ""}</li>`
    ).join("");
    return `
      <p class="journal-sub">Bait, rods, meals, and shop gear are listed from the live objects. Add a fish/item in config.js and it appears here after refresh.</p>
      <h3>Bait &amp; forage</h3>
      <p>Hook baits consume on bobber-land. Prefer-water ×${D.preferBait} at that spot, ×${D.wrongPreferBait} elsewhere. Cave without cave-prefer bait ×${D.caveWrongBait} unless strong. Vale pickups: worms, crickets, berries. Cave pickups: glow, crystal.</p>
      <ul>${baitRows}</ul>
      <h3>Rods</h3>
      <ul>${rodRows}</ul>
      <h3>Shop gear</h3>
      <ul>${shopExtra}</ul>
      <p>Lantern fuel +${D.lanternFuel} per glow or crystal, burns ${D.lanternBurn}/s at night outdoors. Tank holds ${CONFIG.AQUARIUM_N} species, or ${CONFIG.AQUARIUM_N_UP} after the Moonfin donation. Cloak ×${D.cloakWarmth} weather warmth. Campfire range ${D.campfireRange}px.</p>
      <h3>Meals</h3>
      <p>Cook at the packing bench. Unknown recipes show ??? until cooked once. One meal buff at a time. Expires on sleep (next day with Camp cook, restore ×${D.campcookRestore}). Berries are not a meal — +${D.berryHunger} hunger only.</p>
      <ul>${mealRows}</ul>
      <h3>Coins</h3>
      <p>Start ${D.startCoins}c. Daily board +${D.dailyCoins}c. Wren pays each fish’s <code>sell</code> and spends one caught count. Landed journal entries stay even at 0 extras.</p>
    `;
  },

  _fish() {
    const D = DESIGN;
    const wx = Object.keys(WEATHERS).map((id) => `${WEATHERS[id].name} ×${WEATHERS[id].bite}`).join(", ");
    const bySpot = {};
    for (const f of FISH) {
      if (!bySpot[f.spot]) bySpot[f.spot] = [];
      bySpot[f.spot].push(f);
    }
    const blocks = Object.keys(SPOTS).map((sid) => {
      const s = SPOTS[sid];
      const feel = FISHING_FEEL[s.mood] || FISHING_FEEL.still;
      const list = (bySpot[sid] || []).map((f) => {
        const rules = [];
        if (f.rainOnly) rules.push("RAIN ONLY");
        if (f.nightOnly) rules.push("NIGHT ONLY");
        if (f.season) rules.push(f.season + " only");
        const bait = f.baitBias
          ? Object.keys(f.baitBias).sort((a, b) => f.baitBias[b] - f.baitBias[a]).slice(0, 2)
            .map((id) => (BAIT[id] ? BAIT[id].name : id) + " ×" + f.baitBias[id]).join(", ")
          : "even";
        const bite = f.bite
          ? `dawn ${f.bite.dawn}, day ${f.bite.day}, dusk ${f.bite.golden}, night ${f.bite.night}`
          : "";
        return `<li><strong>${f.name}</strong> (${f.rarity}, ${f.size[0]}–${f.size[1]}", ${f.sell}c) — ${f.desc}
          ${rules.length ? `<em>${rules.join(" · ")}</em>.` : ""}
          Best bait: ${bait}. Time weights: ${bite}.</li>`;
      }).join("") || "<li>No fish assigned to this water in FISH[].</li>";
      return `<h3>${s.name}</h3>
        <p>${s.flavor} Mood <strong>${s.mood}</strong> (wait ${feel.waitMin}–${feel.waitMax}s, hook ${feel.hookWindow}s). Minigame <strong>${s.minigame}</strong>.</p>
        <ul>${list}</ul>`;
    }).join("");
    return `
      <p class="journal-sub">${FISH.length} species in FISH[], ${Object.keys(SPOTS).length} waters in SPOTS.</p>
      <h3>How a fish is chosen</h3>
      <p>Must match the water you cast into. Then: night-only needs night; rain-only needs rain; seasonal needs that season; hunger 0 skips rares. Weight: Common 6, Uncommon 3, Rare 1 × time-of-day bite × weather (${wx}) × hotspot ${D.hotspotBite} (or Home shore ${D.homeShoreBite}) × Night owl ${D.nightOwlBite} at night × equipped bait bias. Empty pool falls back to any fish of that spot (still skipping rares if starving).</p>
      ${blocks}
    `;
  },

  _row(ok, pass, fail) {
    return `<li class="${ok ? "is-pass" : "is-fail"}"><strong>${ok ? "OK" : "CHECK"}</strong> — ${ok ? pass : fail}</li>`;
  },

  _check() {
    const D = DESIGN;
    const d = Save.data;
    if (!d) return "<p>Save not loaded.</p>";
    const unique = Journal.count();
    const hearts = NPC_DATA.map((n) => `${n.name} ${d.npcs[n.id] ? (d.npcs[n.id].hearts | 0) : 0}/${D.npcHeartCap}`);
    const heartOk = NPC_DATA.some((n) => ((d.npcs[n.id] && d.npcs[n.id].hearts) | 0) >= D.millpondHearts);
    const millReady = unique >= D.millpondUnique && d.cottage.visited && heartOk;
    const millOn = !!d.flags.fifthWater;
    const p = d.player;
    const starved = (p.hunger | 0) <= 0;
    const daily = d.quests.daily;
    const dailyFish = daily && FISH.find((f) => f.id === daily.fish);
    const rodRows = Object.keys(RODS).filter((id) => id !== "willow").map((id) => {
      const r = RODS[id];
      const have = Inventory.ownsRod(id);
      const caught = r.requireFish ? Journal.caughtOf(r.requireFish) : 1;
      const fname = r.requireFish && FISH.find((f) => f.id === r.requireFish);
      return this._row(have || caught < 1,
        have ? r.name + " owned." : r.name + " locked until " + (fname ? fname.name : r.requireFish) + (r.cost ? ", then " + r.cost + "c." : "."),
        (fname ? fname.name : r.requireFish) + " is landed; " + r.name + " is still at Wren" + (r.cost ? " for " + r.cost + "c." : "."));
    });
    const rows = [
      this._row(true, `${World.id} · ${TimeCycle.clockLabel()} · ${TimeCycle.season()} · ${TimeCycle.weatherId()} · hotspot ${SPOTS[TimeCycle.hotspot()].name}.`, ""),
      this._row(Skills.rank() >= 1, Skills.line(), "Rank missing."),
      this._row(!starved, `Hunger ${Math.round(p.hunger)}, warmth ${Math.round(p.warmth)}, rest ${Math.round(p.rest)}. Rares can bite.`, `Hunger is 0. Commons still bite; rares are blocked.`),
      this._row(d.cottage.visited, "Cottage visited (millpond gate).", "Cottage not visited — millpond cannot unlock."),
      this._row(unique >= D.millpondUnique, `${unique} / ${FISH.length} species landed (need ${D.millpondUnique} for millpond).`, `${unique} / ${FISH.length} landed. Millpond needs ${D.millpondUnique}.`),
      this._row(heartOk, `Hearts: ${hearts.join(", ")}. Someone is at ${D.millpondHearts}+.`, `Hearts: ${hearts.join(", ")}. Gift duplicates until someone reaches ${D.millpondHearts}.`),
      this._row(millOn || !millReady, millOn ? "Millpond raft unlocked." : "Millpond locked until the three gates pass, then gift so the game rechecks.", millOn && !millReady ? "Raft flag on while a gate looks incomplete (admin unlock is fine)." : "Millpond locked."),
      this._row(Inventory.ownsRod("willow"), "Willow rod owned.", "Willow missing."),
    ].concat(rodRows).concat([
      this._row(!daily || true, daily && dailyFish ? `Daily: ${dailyFish.name} at ${SPOTS[daily.spot].name}${daily.done ? " — DONE (+" + D.dailyCoins + "c, +" + D.dailyWorms + " worms)." : " — open."}` : "No daily board.", ""),
      this._row(!(typeof Admin !== "undefined" && Admin.god), "God mode off.", "GOD MODE on — drains and bait consume are skipped. Toggle off to test the real loop."),
    ]);
    return `
      <h3>Live check</h3>
      <p>Compared to DESIGN + your save. CHECK is a gate or a cheat, not always a bug.</p>
      <ul class="admin-check">${rows.join("")}</ul>
    `;
  },
};
