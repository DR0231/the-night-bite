/* Input, camera, day/night, particles, audio, and small math helpers. */

const Utils = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  smooth(cur, target, dt, rate) {
    return cur + (target - cur) * (1 - Math.pow(rate, dt));
  },
  approach(cur, target, maxDelta) {
    const d = target - cur;
    if (Math.abs(d) <= maxDelta) return target;
    return cur + Math.sign(d) * maxDelta;
  },
  dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.hypot(dx, dy);
  },
  hash(x, y) {
    let n = (x * 374761393 + y * 668265263) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0);
  },
  rand(rng, a, b) { return a + rng() * (b - a); },
  irand(rng, a, b) { return (a + Math.floor(rng() * (b - a + 1))) | 0; },
  pick(rng, arr) { return arr[(rng() * arr.length) | 0]; },
  lerpColor(a, b, t) {
    t = Utils.clamp(t, 0, 1);
    return [
      (a[0] + (b[0] - a[0]) * t) | 0,
      (a[1] + (b[1] - a[1]) * t) | 0,
      (a[2] + (b[2] - a[2]) * t) | 0,
      a[3] + (b[3] - a[3]) * t,
    ];
  },
  rgba(c) { return `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`; },
};

function mulberry32(seed) {
  let a = seed | 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const Input = {
  down: Object.create(null),
  pressed: Object.create(null),

  _alias(e) {
    const codes = {
      KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d",
      ArrowUp: "arrowup", ArrowDown: "arrowdown",
      ArrowLeft: "arrowleft", ArrowRight: "arrowright",
      Space: " ", KeyE: "e", KeyJ: "j", KeyI: "i", Escape: "escape", Enter: "enter",
      Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
    };
    if (e.code && codes[e.code]) return codes[e.code];

    const key = (e.key || "").toLowerCase();
    const keys = {
      w: "w", a: "a", s: "s", d: "d",
      arrowup: "arrowup", arrowdown: "arrowdown",
      arrowleft: "arrowleft", arrowright: "arrowright",
      up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright",
      " ": " ", space: " ", spacebar: " ",
      e: "e", j: "j", i: "i", escape: "escape", enter: "enter",
      "1": "1", "2": "2", "3": "3", "4": "4", "5": "5",
    };
    if (keys[key]) return keys[key];

    const kc = e.keyCode || e.which;
    const codesByNumber = {
      87: "w", 65: "a", 83: "s", 68: "d",
      38: "arrowup", 40: "arrowdown", 37: "arrowleft", 39: "arrowright",
      32: " ", 69: "e", 74: "j", 73: "i", 27: "escape", 13: "enter",
      49: "1", 50: "2", 51: "3", 52: "4", 53: "5",
    };
    return codesByNumber[kc] || null;
  },

  _isMove(k) {
    return k === "w" || k === "a" || k === "s" || k === "d"
      || k === "arrowup" || k === "arrowdown" || k === "arrowleft" || k === "arrowright";
  },

  setKey(k, val, isRepeat) {
    if (!k) return;
    if (val && isRepeat) {
      this.down[k] = true;
      return;
    }
    if (val && !this.down[k]) this.pressed[k] = true;
    this.down[k] = !!val;
    if (!val || typeof Game === "undefined") return;
    const overlayUp = UI.els.start && !UI.els.start.classList.contains("hidden");
    if (overlayUp) {
      Game.start({ clearUse: k === " " || k === "e" || k === "enter" });
    }
  },

  bind() {
    if (this._bound) return;
    this._bound = true;
    const on = (e, val) => {
      const k = this._alias(e);
      if (!k) return;
      if (this._isMove(k) || k === " " || k === "e" || k === "j" || k === "i" || k === "escape") {
        e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
      }
      this.setKey(k, val, val && e.repeat);
    };
    const opts = { capture: true, passive: false };
    window.addEventListener("keydown", (e) => on(e, true), opts);
    window.addEventListener("keyup", (e) => on(e, false), opts);
    window.addEventListener("blur", () => { this.down = Object.create(null); });
  },

  bindPad() {
    const pad = document.getElementById("move-pad");
    if (!pad) return;
    const hold = (btn, key) => {
      if (!btn) return;
      const down = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setKey(key, true, false);
        btn.classList.add("is-held");
      };
      const up = () => {
        this.setKey(key, false, false);
        btn.classList.remove("is-held");
      };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("pointercancel", up);
    };
    hold(pad.querySelector('[data-move="up"]'), "arrowup");
    hold(pad.querySelector('[data-move="down"]'), "arrowdown");
    hold(pad.querySelector('[data-move="left"]'), "arrowleft");
    hold(pad.querySelector('[data-move="right"]'), "arrowright");
    const fishBtn = document.getElementById("btn-fish");
    if (fishBtn) {
      fishBtn.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof Game !== "undefined") Game.start({ clearUse: false });
        if (typeof Minigame !== "undefined") Minigame._padHold = true;
        Input.setKey("e", true, false);
        Fishing.act();
      });
      const up = () => {
        if (typeof Minigame !== "undefined") Minigame._padHold = false;
        Input.setKey("e", false, false);
      };
      fishBtn.addEventListener("pointerup", up);
      fishBtn.addEventListener("pointerleave", up);
      fishBtn.addEventListener("pointercancel", up);
    }
    this.syncPad();
    window.addEventListener("resize", () => this.syncPad());
  },

  syncPad() {
    const pad = document.getElementById("move-pad");
    if (!pad) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 720px)").matches;
    pad.classList.toggle("is-touch", coarse || narrow);
  },

  get use() {
    return this.pressed["e"] || this.pressed[" "];
  },
  endFrame() {
    this.pressed = Object.create(null);
  },
  axis() {
    let x = 0, y = 0;
    if (this.down["a"] || this.down["arrowleft"]) x -= 1;
    if (this.down["d"] || this.down["arrowright"]) x += 1;
    if (this.down["w"] || this.down["arrowup"]) y -= 1;
    if (this.down["s"] || this.down["arrowdown"]) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  },
};

const Camera = {
  x: 0,
  y: 0,
  w: CONFIG.VIEW_W,
  h: CONFIG.VIEW_H,
  shake: 0,
  lookX: 0,
  lookY: 0,
  follow(tx, ty, dt, worldW, worldH, vx, vy) {
    this.lookX = Utils.smooth(this.lookX, (vx || 0) * 0.22, dt, 0.04);
    this.lookY = Utils.smooth(this.lookY, (vy || 0) * 0.16, dt, 0.04);
    const targetX = tx - this.w * 0.5 + this.lookX;
    const targetY = ty - this.h * 0.56 + this.lookY;
    this.x = Utils.smooth(this.x, targetX, dt, 0.018);
    this.y = Utils.smooth(this.y, targetY, dt, 0.018);
    const maxX = Math.max(0, worldW - this.w);
    const maxY = Math.max(0, worldH - this.h);
    this.x = Utils.clamp(this.x, 0, maxX);
    this.y = Utils.clamp(this.y, 0, maxY);
    if (this.shake > 0) {
      this.x += (Math.random() - 0.5) * this.shake;
      this.y += (Math.random() - 0.5) * this.shake;
      this.shake = Utils.approach(this.shake, 0, dt * 16);
    }
  },
};

const TimeCycle = {
  seconds: CONFIG.START_HOUR / 24 * CONFIG.DAY_LENGTH,
  get hour() {
    return (this.seconds / CONFIG.DAY_LENGTH) * 24 % 24;
  },
  update(dt) {
    this.seconds += dt;
  },
  /** Lighting overlay + sun vector for shadows. */
  sample() {
    const h = this.hour;
    const stops = [
      { h: 0, c: [12, 16, 48, 0.58] },
      { h: 5, c: [40, 28, 58, 0.42] },
      { h: 6.5, c: [255, 150, 120, 0.16] },
      { h: 8, c: [255, 220, 180, 0.05] },
      { h: 12, c: [255, 255, 255, 0.0] },
      { h: 17, c: [255, 170, 90, 0.12] },
      { h: 19, c: [255, 120, 70, 0.22] },
      { h: 21, c: [24, 32, 78, 0.46] },
      { h: 24, c: [12, 16, 48, 0.58] },
    ];
    let i = 0;
    while (i < stops.length - 1 && h >= stops[i + 1].h) i++;
    const a = stops[i], b = stops[i + 1];
    const t = (h - a.h) / Math.max(0.001, b.h - a.h);
    const color = Utils.lerpColor(a.c, b.c, t);
    const sunA = ((h - 6) / 12) * Math.PI;
    const shadow = {
      x: Math.cos(sunA) * 5,
      y: 3.2 + Math.sin(Math.max(0, sunA)) * 1.4,
    };
    const night = h < 6 || h > 20;
    const golden = h >= 16.5 && h <= 19.2;
    return { color, shadow, night, golden, hour: h };
  },
  clockLabel() {
    const h = this.hour;
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    const ap = hh >= 12 ? "PM" : "AM";
    const h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${mm.toString().padStart(2, "0")} ${ap}`;
  },
};

const Particles = {
  list: [],
  spawn(p) { this.list.push(p); },
  splash(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI - Math.PI * 0.5;
      const s = 12 + Math.random() * 28;
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 18,
        life: 0.35 + Math.random() * 0.25, max: 0.5,
        size: 1 + Math.random() * 1.4, color, kind: "drop",
      });
    }
  },
  firefly(x, y, color) {
    this.spawn({
      x, y, vx: 0, vy: 0,
      life: 2 + Math.random() * 3, max: 4,
      size: 1.2, color: color || "#d8f08a", kind: "fly",
      phase: Math.random() * 10,
    });
  },
  dust(x, y) {
    this.spawn({
      x: x + (Math.random() - 0.5) * 6,
      y: y + 1,
      vx: (Math.random() - 0.5) * 10,
      vy: -6 - Math.random() * 8,
      life: 0.22 + Math.random() * 0.12, max: 0.32,
      size: 1 + Math.random(), color: "#c4a070", kind: "dust",
    });
  },
  sparkle(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 18 + Math.random() * 28;
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10,
        life: 0.4 + Math.random() * 0.25, max: 0.55,
        size: 1.2, color, kind: "spark",
      });
    }
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.kind === "drop") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 90 * dt;
      } else if (p.kind === "fly") {
        p.phase += dt;
        p.x += Math.cos(p.phase * 1.4) * 8 * dt;
        p.y += Math.sin(p.phase * 1.8) * 6 * dt;
      } else if (p.kind === "dust") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.9; p.vy += 40 * dt;
      } else if (p.kind === "spark") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 50 * dt;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (p.life <= 0) this.list.splice(i, 1);
    }
  },
};

const AudioFX = {
  ctx: null,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(freq, dur, type, vol, slide) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  plop() {
    this.ensure();
    this.tone(180, 0.12, "sine", 0.06, 70);
  },
  bite() {
    this.ensure();
    this.tone(520, 0.07, "square", 0.04);
    setTimeout(() => this.tone(720, 0.08, "square", 0.04), 70);
  },
  catch() {
    this.ensure();
    this.tone(392, 0.12, "triangle", 0.05);
    setTimeout(() => this.tone(523, 0.12, "triangle", 0.05), 90);
    setTimeout(() => this.tone(659, 0.2, "triangle", 0.06), 180);
  },
  fail() {
    this.ensure();
    this.tone(240, 0.2, "sawtooth", 0.03, 90);
  },
  nibble() {
    this.ensure();
    this.tone(340, 0.05, "sine", 0.03, 180);
  },
  step() {
    this.ensure();
    this.tone(90 + Math.random() * 30, 0.04, "sine", 0.018);
  },
};
