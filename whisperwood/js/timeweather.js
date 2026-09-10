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
    if (w === "rain" && Particles.list.length < 48 && Math.random() < dt * 18) {
      Particles.spawn({
        x: Camera.x + Math.random() * Camera.w,
        y: Camera.y - 4,
        vx: -18, vy: 90 + Math.random() * 40,
        life: 0.5, max: 0.5, size: 1, color: "#9ab8cc", kind: "drop",
      });
    }
    if (w === "mist" && World.id === "vale" && Particles.list.length < 28 && Math.random() < dt * 2) {
      Particles.spawn({
        x: Player.x + (Math.random() - 0.5) * 120,
        y: Player.y + (Math.random() - 0.5) * 70,
        vx: 6, vy: 0, life: 2.2, max: 2.2, size: 2, color: "#d8e4f0", kind: "dust",
      });
    }
  },
};
