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
  pull: 0,
  weight: 0,

  get active() { return Fishing.state === "play"; },

  start(spot) {
    const rod = Inventory.rod();
    const kind = (spot && spot.minigame) || "timing";
    this.kind = kind;
    this.t = 0;
    this.done = false;
    this.hold = 0;
    this._tapHint = false;
    this._tapAt = null;
    this.pull = 0;
    this.weight = 0;
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
      this.bandW = (kind === "tensionErratic" ? 0.11 : 0.15);
      this.speed = (kind === "tensionErratic" ? 1.6 : 1.05) * spd;
      const inches = (typeof Fishing !== "undefined" && Fishing.fightInches) || 6;
      const weight = Utils.clamp((inches - 3) / 17, 0.12, 1);
      const str = Skills.strength();
      this.weight = weight;
      this.need = 0.78 * Skills.needMult() * (0.92 + 0.50 * weight) / Math.max(0.2, str);
      this.bandW = Utils.clamp(this.bandW * str / (0.95 + 0.55 * weight), 0.06, 0.22);
      this.speed = this.speed * (0.92 + 0.38 * weight) / Math.sqrt(Math.max(0.2, str));
    }
    Fishing.state = "play";
    Fishing.t = 0;
  },

  press() {
    if (!this.active || this.done) return;
    if (this.kind === "timing" || this.kind === "timingFast") {
      const ok = Math.abs(this.marker - this.sweet) <= this.half;
      this.finish(ok);
      return;
    }
    /* Tension is a hold. Fish pad sets _padHold before act(); that is not a tap. */
    if (this._padHold) return;
    this._tapAt = this.t;
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
    if (hold) this._tapAt = null;
    else if (this._tapAt != null && !this.done && this.t - this._tapAt > 0.18 && !this._tapHint) {
      this._tapHint = true;
      this._tapAt = null;
      try { UI.toastNote("Hold E / Space to keep tension — don’t tap"); } catch (err) { /* hint still shows */ }
    }
    this.value += (hold ? 0.72 : -(0.60 + 0.32 * (this.weight || 0))) * dt;
    if (this.kind === "tensionErratic") {
      this.band += Math.sin(this.t * 3.2 * this.speed) * 0.55 * dt;
    } else {
      this.band += Math.sin(this.t * 1.4) * 0.2 * dt;
    }
    this.band = Utils.clamp(this.band, 0.22, 0.78);
    this.value = Utils.clamp(this.value, 0, 1);
    this.pull = Utils.clamp(this.value - this.band, -1, 1);
    if (Math.abs(this.value - this.band) <= this.bandW) this.hold += dt;
    else this.hold = Math.max(0, this.hold - dt * 0.35);
    if (this.hold >= this.need) this.finish(true);
    else if (this.t > 7.5) this.finish(false);
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
    if ((this.weight || 0) >= 0.7) return "Hold E / Space to keep tension — don’t tap. It’s heavy — keep the line steady.";
    return "Hold E / Space to keep tension — don’t tap";
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
