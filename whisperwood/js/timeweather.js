/* Day phases, weather, forecast, hotspot. Extends TimeCycle from engine.js. */

TimeCycle.day = 1;
TimeCycle._lastHour = -1;

TimeCycle.phaseId = function () {
  const h = this.hour;
  const phases = DESIGN.phases || [];
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const a = p.range[0], b = p.range[1];
    if (a < b && h >= a && h < b) return p.id;
    if (a > b && (h >= a || h < b)) return p.id;
  }
  return "night";
};

TimeCycle.weatherId = function () {
  return (Save.data && Save.data.clock.weather) || "clear";
};

TimeCycle.weather = function () {
  return WEATHERS[this.weatherId()] || WEATHERS.clear;
};

TimeCycle.season = function () {
  return (Save.data && Save.data.clock.season) || "spring";
};

TimeCycle.hotspot = function () {
  return (Save.data && Save.data.clock.hotspot) || "pond";
};

TimeCycle.weatherLine = function () {
  const w = this.weather();
  if (this.phaseId() === "night" && (w.id === "mist" || w.id === "clear")) {
    return w.id === "mist" ? "The mist is in tonight." : "A clear night over the vale.";
  }
  return w.line;
};

const _timeUpdate = TimeCycle.update.bind(TimeCycle);
TimeCycle.update = function (dt) {
  _timeUpdate(dt);
  const dayLen = CONFIG.DAY_LENGTH;
  const dayNow = 1 + Math.floor(this.seconds / dayLen);
  if (dayNow !== this.day) {
    this.day = dayNow;
    if (Save.data) {
      Save.data.clock.day = dayNow;
      Save.data.clock.season = SEASONS[Math.floor((dayNow - 1) / DESIGN.seasonDays) % 4];
      Save.spoilLoose();
      Weather.rollDay();
      Quests.rollDay();
      Shop.restock();
      for (const id of Object.keys(Save.data.npcs)) Save.data.npcs[id].giftedToday = 0;
      Save.data.skills.repeatsToday = { total: 0 };
      Save.data.skills.speciesToday = {};
      Survival.clearFireIfDawn();
      Save.mark("dawn");
    }
  }
  const hour = this.hour;
  if (Save.data && hour >= Save.data.clock.weatherUntil) Weather.advance();
  this._lastHour = hour;
};

const _sample = TimeCycle.sample.bind(TimeCycle);
TimeCycle.sample = function () {
  const s = _sample();
  s.phase = this.phaseId();
  s.weather = this.weatherId();
  const season = this.season();
  if (season === "autumn") s.color = Utils.lerpColor(s.color, [255, 140, 70, s.color[3] + 0.06], 0.35);
  if (season === "winter") s.color = Utils.lerpColor(s.color, [180, 200, 230, s.color[3] + 0.08], 0.4);
  if (season === "spring") s.color = Utils.lerpColor(s.color, [180, 255, 170, s.color[3]], 0.12);
  if (s.weather === "rain") s.color = Utils.lerpColor(s.color, [40, 60, 90, s.color[3] + 0.12], 0.35);
  if (s.weather === "mist") s.color = Utils.lerpColor(s.color, [160, 180, 200, s.color[3] + 0.1], 0.3);
  if (s.weather === "heat") s.color = Utils.lerpColor(s.color, [255, 180, 80, s.color[3] + 0.08], 0.28);
  if (s.weather === "frost") s.color = Utils.lerpColor(s.color, [200, 220, 255, s.color[3] + 0.1], 0.32);
  s.night = s.phase === "night";
  s.golden = s.phase === "golden";
  return s;
};

const Weather = {
  rollDay() {
    const rng = Save.dayRng("weather");
    const bag = ["clear", "clear", "rain", "mist", "heat", "frost", "mist"];
    const forecast = [];
    for (let i = 0; i < 3; i++) forecast.push(Utils.pick(rng, bag));
    Save.data.clock.forecast = forecast;
    Save.data.clock.weather = forecast[0];
    Save.data.clock.weatherUntil = TimeCycle.hour + 6 + rng() * 5;
    const spots = ["pond", "river", "lake", "cave"];
    if (Save.data.flags.fifthWater) spots.push("marsh");
    Save.data.clock.hotspot = Utils.pick(rng, spots);
    if (TimeCycle.season() === "winter" && Skills.rank() >= 4) Save.data.clock.hotspot = "lake";
  },

  advance() {
    const f = Save.data.clock.forecast || ["clear"];
    f.shift();
    if (!f.length) f.push("clear");
    Save.data.clock.weather = f[0];
    Save.data.clock.weatherUntil = TimeCycle.hour + 5;
    Save.data.clock.forecast = f;
  },

  skipTo(phase) {
    const dayLen = CONFIG.DAY_LENGTH;
    const dayBase = Math.floor(TimeCycle.seconds / dayLen) * dayLen;
    const ph = DESIGN.phases.find((p) => p.id === (phase === "dawn" ? "dawn" : "golden"));
    const hour = ph ? ph.hour : (phase === "dawn" ? 6 : 17.6);
    let target = dayBase + (hour / 24) * dayLen;
    if (target <= TimeCycle.seconds + 10) target += dayLen;
    TimeCycle.seconds = target;
    Save.data.clock.seconds = TimeCycle.seconds;
    this.advance();
    Save.mark("sleep");
  },

  spawnAmbient(dt) {
    const w = TimeCycle.weatherId();
    const indoor = World.id === "cottage";
    if (!indoor && w === "rain") {
      const n = Math.min(14, 2 + ((dt * 90) | 0));
      for (let i = 0; i < n && Particles.list.length < 96; i++) {
        Particles.spawn({
          x: Camera.x + Math.random() * (Camera.w + 48) - 24,
          y: Camera.y - 6,
          vx: -30, vy: 110 + Math.random() * 55,
          life: 0.55, max: 0.55, size: Math.random() < 0.35 ? 2 : 1, color: "#b8d0e0", kind: "drop",
        });
      }
    }
    if (!indoor && w === "mist" && Particles.list.length < 42 && Math.random() < dt * 7) {
      Particles.spawn({
        x: Player.x + (Math.random() - 0.5) * 140,
        y: Player.y + (Math.random() - 0.5) * 80,
        vx: 8, vy: -2, life: 2.4, max: 2.4, size: 3, color: "#d8e4f0", kind: "dust",
      });
    }
    if (!indoor && w === "frost" && Particles.list.length < 40 && Math.random() < dt * 12) {
      Particles.spawn({
        x: Camera.x + Math.random() * Camera.w,
        y: Camera.y + Math.random() * Camera.h,
        vx: 5, vy: 10, life: 1.5, max: 1.5, size: 1, color: "#e8f0ff", kind: "dust",
      });
    }
    if (!indoor && w === "heat" && Particles.list.length < 22 && Math.random() < dt * 5) {
      Particles.spawn({
        x: Player.x + (Math.random() - 0.5) * 90,
        y: Player.y - 8 + (Math.random() - 0.5) * 20,
        vx: 0, vy: -14, life: 0.95, max: 0.95, size: 2, color: "#f0c070", kind: "dust",
      });
    }
  },
};
