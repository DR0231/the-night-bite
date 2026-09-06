/* Spot minigames. Bobber is the tell; this runs after a real bite.
   Rod modifiers: bar (sweet width), speed (sweep/rise), tension (band stability). */

const Minigame = {
  kind: null,
  t: 0,
  marker: 0,
  dir: 1,
  sweet: 0.5,
  half: 0.16,
  value: 0.5,
  band: 0.5,
  bandW: 0.14,
  hold: 0,
  need: 0.85,
  done: false,

  get active() { return Fishing.state === "play"; },

  start(spot) {
    const rod = Inventory.rod();
    const kind = (spot && spot.minigame) || "timing";
    this.kind = kind;
    this.t = 0;
    this.done = false;
    this.hold = 0;
    this.need = 0.78 * Skills.needMult();
    let bar = (rod.bar || 1) * Skills.barMult() * Survival.barMult();
    bar = Math.min(1.45, bar);
    let spd = (rod.speed || 1);
    if (Survival.nightHard()) spd *= 1.12;
    if (kind === "timing" || kind === "timingFast") {
      this.marker = 0;
      this.dir = 1;
      this.sweet = 0.42 + Math.random() * 0.2;
      const wide = kind === "timing" ? 0.18 : 0.11;
      this.half = wide * bar;
      this.speed = (kind === "timing" ? 1.15 : 1.85) * spd;
    } else {
      this.value = 0.5;
      this.band = 0.5;
      this.bandW = (kind === "tensionErratic" ? 0.11 : 0.15) * (rod.tension || 1) * Skills.tensionMult();
      this.speed = (kind === "tensionErratic" ? 1.6 : 1.05) * spd;
    }
    Fishing.state = "play";
    Fishing.t = 0;
  },

  press() {
    if (!this.active || this.done) return;
    if (this.kind === "timing" || this.kind === "timingFast") {
      const ok = Math.abs(this.marker - this.sweet) <= this.half;
      this.finish(ok);
    }
  },

  holding() {
    return !!(Input.down["e"] || Input.down[" "] || this._padHold);
  },

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.kind === "timing" || this.kind === "timingFast") {
      this.marker += this.dir * this.speed * dt;
      if (this.marker > 1) { this.marker = 1; this.dir = -1; }
      if (this.marker < 0) { this.marker = 0; this.dir = 1; }
      if (this.t > 6.5) this.finish(false);
      return;
    }
    const hold = this.holding();
    this.value += (hold ? 0.72 : -0.55) * dt;
    if (this.kind === "tensionErratic") {
      this.band += Math.sin(this.t * 3.2 * this.speed) * 0.55 * dt;
    } else {
      this.band += Math.sin(this.t * 1.4) * 0.2 * dt;
    }
    this.band = Utils.clamp(this.band, 0.22, 0.78);
    this.value = Utils.clamp(this.value, 0, 1);
    if (Math.abs(this.value - this.band) <= this.bandW) this.hold += dt;
    else this.hold = Math.max(0, this.hold - dt * 0.35);
    if (this.hold >= this.need) this.finish(true);
    if (this.t > 7.5) this.finish(false);
  },

  finish(ok) {
    if (this.done) return;
    this.done = true;
    this._padHold = false;
    if (ok) Fishing._hook();
    else Fishing._miss();
  },

  failOpenMenu() {
    if (this.active) this.finish(false);
  },

  hint() {
    if (this.kind === "timing" || this.kind === "timingFast") return "Tap E / Space in the bright band";
    return "Hold E / Space to keep tension";
  },

  draw(ctx, vw, vh) {
    if (!this.active) return;
    const x = 72, y = vh - 28, w = vw - 144, h = 10;
    ctx.fillStyle = "rgba(12, 18, 10, 0.72)";
    ctx.fillRect(x - 4, y - 8, w + 8, h + 16);
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#c4a05a55";
    ctx.fillRect(x, y, w, 1);
    if (this.kind === "timing" || this.kind === "timingFast") {
      const sx = x + (this.sweet - this.half) * w;
      const sw = this.half * 2 * w;
      ctx.fillStyle = "#4d9158";
      ctx.fillRect(sx, y, sw, h);
      ctx.fillStyle = "#f3e2c4";
      ctx.fillRect(x + this.marker * w - 1, y - 2, 2, h + 4);
    } else {
      const bx = x + (this.band - this.bandW) * w;
      ctx.fillStyle = "#4d9158";
      ctx.fillRect(bx, y, this.bandW * 2 * w, h);
      ctx.fillStyle = "#e23a3a";
      ctx.fillRect(x + this.value * w - 2, y - 2, 4, h + 4);
      const prog = Utils.clamp(this.hold / this.need, 0, 1);
      ctx.fillStyle = "#c4a05a";
      ctx.fillRect(x, y + h + 2, w * prog, 2);
    }
  },
};
