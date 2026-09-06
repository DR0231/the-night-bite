/* Daily board, rumor, derby. Seeded per in-game day. */

const Quests = {
  open: false,

  rollDay() {
    const rng = Save.dayRng("quests");
    const ask = Utils.pick(rng, DAILY_ASKS);
    Save.data.quests.daily = {
      day: Save.data.clock.day,
      fish: ask.fish,
      spot: ask.spot,
      text: ask.text,
      done: false,
    };
    const rumorFish = FISH.filter((f) => f.rarity === "Rare" || f.rarity === "Uncommon");
    const rf = Utils.pick(rng, rumorFish);
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
  },

  onLand(fish) {
    const d = Save.data.quests.daily;
    if (d && !d.done && fish.id === d.fish) {
      d.done = true;
      Inventory.addCoins(18);
      Inventory.addBait("worms", 3);
      Save.data.npcs.wren.hearts = Math.min(3, (Save.data.npcs.wren.hearts | 0) + 1);
      UI.toastNote("Daily board complete. Wren is pleased.");
      Save.mark("quest");
    }
    const der = Save.data.quests.derby;
    if (der && der.key && SPOTS[fish.spot] && SPOTS[fish.spot].mood === der.mood) {
      der.landed = (der.landed | 0) + 1;
    }
    const rumor = Save.data.quests.rumor;
    if (rumor && fish.id === rumor.fish) {
      UI.toastNote("The rumor was true.");
    }
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
    const f = (Save.data.clock.forecast || []).map((id) => WEATHERS[id].name).join(" → ");
    el.innerHTML = `
      <p><strong>Today</strong> — ${this.dailyLine()}</p>
      <p><strong>Rumor</strong> — ${this.rumorLine()}</p>
      <p><strong>Forecast</strong> — ${f}</p>
      <p><strong>Hotspot</strong> — ${SPOTS[TimeCycle.hotspot()].name} is alive today.</p>
      ${this.derbyLine() ? `<p><strong>Derby</strong> — ${this.derbyLine()}</p>` : ""}`;
  },
};

const Board = Quests;
const Mail = {
  open: false,
  toggle() {
    this.open = !this.open;
    const el = document.getElementById("mail");
    if (!el) return;
    el.classList.toggle("hidden", !this.open);
    if (this.open) this.refresh();
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
    Save.data.cottage.mail = notes.slice(0, 3);
    Save.data.cottage.weeds = 4 + (Save.dayRng("weeds")() * 4) | 0;
  },
};
