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
  an(s, cap) { return (/^[aeiou]/i.test(s) ? (cap ? "An" : "an") : (cap ? "A" : "a")) + " " + String(s); },
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
      KeyR: "r", KeyF: "f", KeyQ: "q", Minus: "-", Equal: "=",
      BracketLeft: "[", BracketRight: "]",
      ShiftLeft: "shift", ShiftRight: "shift",
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
      r: "r", f: "f", q: "q", "-": "-", "=": "=", "[": "[", "]": "]",
      shift: "shift",
    };
    if (keys[key]) return keys[key];

    const kc = e.keyCode || e.which;
    const codesByNumber = {
      87: "w", 65: "a", 83: "s", 68: "d",
      38: "arrowup", 40: "arrowdown", 37: "arrowleft", 39: "arrowright",
      32: " ", 69: "e", 74: "j", 73: "i", 27: "escape", 13: "enter",
      49: "1", 50: "2", 51: "3", 52: "4", 53: "5",
      82: "r", 70: "f", 81: "q", 189: "-", 187: "=", 219: "[", 221: "]",
      16: "shift",
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
      if (k === "escape") this.pressed.escape = false;
    }
  },

  bind() {
    if (this._bound) return;
    this._bound = true;
    const on = (e, val) => {
      if (typeof Admin !== "undefined" && Admin.typing()) return;
      const k = this._alias(e);
      if (!k) return;
      const range = e.target && (e.target.tagName || "").toLowerCase() === "input"
        && (e.target.type || "").toLowerCase() === "range";
      if (range && (k === "arrowleft" || k === "arrowright" || k === "arrowup" || k === "arrowdown")) return;
      const mod = e.ctrlKey || e.metaKey || e.altKey;
      if (mod && val) return;
      const decorKey = k === "r" || k === "f" || k === "q" || k === "-" || k === "=" || k === "[" || k === "]";
      const decorLive = decorKey && typeof Cottage !== "undefined" && Cottage.decorOn() && World.id === "cottage";
      if (!mod && (this._isMove(k) || k === " " || k === "e" || k === "j" || k === "i" || k === "escape" || decorLive)) {
        e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
      }
      this.setKey(k, val, val && e.repeat);
    };
    const opts = { capture: true, passive: false };
    window.addEventListener("keydown", (e) => on(e, true), opts);
    window.addEventListener("keyup", (e) => on(e, false), opts);
    window.addEventListener("blur", () => {
      this.down = Object.create(null);
      this._clearPadKeys();
    });
    const hidePadRing = () => {
      document.documentElement.classList.remove("pad-input");
      this._padClearFocus();
    };
    window.addEventListener("pointerdown", hidePadRing, true);
    window.addEventListener("keydown", hidePadRing, true);
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
        try { fishBtn.setPointerCapture(ev.pointerId); } catch (e) {}
        if (typeof Game !== "undefined") Game.start({ clearUse: false });
        if (typeof Minigame !== "undefined") Minigame._padHold = true;
        Input.setKey("e", true, false);
      });
      const up = () => {
        if (typeof Minigame !== "undefined") Minigame._padHold = false;
        Input.setKey("e", false, false);
      };
      fishBtn.addEventListener("pointerup", up);
      fishBtn.addEventListener("pointerleave", up);
      fishBtn.addEventListener("pointercancel", up);
      fishBtn.addEventListener("lostpointercapture", up);
    }
    const packBtn = document.getElementById("btn-packup");
    if (packBtn) {
      packBtn.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof Fishing !== "undefined" && Fishing.state === "aim") Fishing.cancel();
      });
    }
    const tapKey = (id, key) => {
      const b = document.getElementById(id);
      if (!b) return;
      b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); this.setKey(key, true, false); });
      const up = () => this.setKey(key, false, false);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointerleave", up);
      b.addEventListener("pointercancel", up);
    };
    tapKey("btn-journal", "j");
    tapKey("btn-pack", "i");
    tapKey("btn-menu", "escape");
    this.syncPad();
    window.addEventListener("resize", () => this.syncPad());
  },

  syncPad() {
    const pad = document.getElementById("move-pad");
    const menu = document.getElementById("menu-pad");
    if (!pad && !menu) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 720px)").matches;
    const on = coarse || narrow;
    if (pad) pad.classList.toggle("is-touch", on);
    if (menu) menu.classList.toggle("is-touch", on);
  },

  _padWasOn: false,
  _padOwned: Object.create(null),
  _padPrevBtn: Object.create(null),
  _padFocus: -1,
  _padFocusRoot: null,
  _padALock: false,
  _padStickDir: "",
  _padStickAt: 0,
  _padScrollRoot: null,

  _padPressed(pad, i) {
    const b = pad && pad.buttons && pad.buttons[i];
    if (!b) return false;
    if (b.pressed) return true;
    return (b.value || 0) >= 0.5;
  },

  _syncPadKey(k, on) {
    if (on) {
      if (this._padOwned[k]) {
        this.down[k] = true;
        return;
      }
      if (this.down[k]) return;
      this._padOwned[k] = true;
      this.setKey(k, true, false);
      return;
    }
    if (!this._padOwned[k]) return;
    this.setKey(k, false, false);
    delete this._padOwned[k];
  },

  _clearPadKeys() {
    const keys = Object.keys(this._padOwned);
    for (let i = 0; i < keys.length; i++) this.setKey(keys[i], false, false);
    this._padOwned = Object.create(null);
    if (typeof Minigame !== "undefined") Minigame._padHold = false;
  },

  _padMenuOpen() {
    return typeof UI !== "undefined" && (UI.anyMenu() || (typeof Npcs !== "undefined" && Npcs.talkId));
  },

  _padElHidden(el) {
    for (let n = el; n; n = n.parentElement) {
      if (n.classList && n.classList.contains("hidden")) return true;
    }
    return false;
  },

  _padFocusRootEl() {
    const ids = ["rank-up", "pause-menu", "paste-save", "mill-end", "certificate", "pack", "shop", "board", "mail", "bench", "trophy", "tank", "cooler", "journal", "admin", "dialog", "start-screen"];
    for (let i = 0; i < ids.length; i++) {
      const el = document.getElementById(ids[i]);
      if (el && !this._padElHidden(el)) return el;
    }
    return null;
  },

  _padFocusables(root) {
    if (!root) return [];
    const nodes = root.querySelectorAll("button, a[href], [data-buy], input[type=checkbox], input[type=range]");
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.disabled || el.hidden) continue;
      if (el.closest("#move-pad, #menu-pad")) continue;
      if (el.id === "btn-fish" || el.id === "btn-packup") continue;
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "file") continue;
      if (el.classList.contains("hidden") || el.closest(".hidden")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      out.push(el);
    }
    return out;
  },

  _padApplyFocus(items) {
    const prev = document.querySelectorAll(".pad-focus");
    for (let i = 0; i < prev.length; i++) prev[i].classList.remove("pad-focus");
    if (!items || !items.length) return;
    if (this._padFocus < 0 || this._padFocus >= items.length) this._padFocus = 0;
    items[this._padFocus].classList.add("pad-focus");
  },

  _padClearFocus() {
    const prev = document.querySelectorAll(".pad-focus");
    for (let i = 0; i < prev.length; i++) prev[i].classList.remove("pad-focus");
    this._padFocus = -1;
    this._padFocusRoot = null;
  },

  _padCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
  },

  _padScrollFocus(items) {
    const el = items[this._padFocus];
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  },

  /* Scroll the menu panel when the list itself has nowhere to move. */
  _padScrollPanel(root, dir) {
    if (!root || (dir !== "up" && dir !== "down")) return;
    const canScroll = (el) => {
      const oy = getComputedStyle(el).overflowY;
      return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight;
    };
    let target = canScroll(root) ? root : null;
    if (!target) {
      const nodes = root.querySelectorAll("*");
      for (let i = 0; i < nodes.length; i++) {
        if (canScroll(nodes[i])) { target = nodes[i]; break; }
      }
    }
    if (target) {
      const step = Math.max(48, Math.round(target.clientHeight * 0.8));
      target.scrollTop += dir === "down" ? step : -step;
    }
  },

  /* Up and down walk the list. Left and right pick the nearest control. No wrap. */
  _padMoveFocus(dir) {
    const root = this._padFocusRootEl();
    if (!root) { this._padClearFocus(); return; }
    const items = this._padFocusables(root);
    if (!items.length) {
      this._padClearFocus();
      this._padScrollPanel(root, dir);
      return;
    }
    if (this._padFocusRoot !== root || this._padFocus < 0 || this._padFocus >= items.length) {
      this._padFocusRoot = root;
      this._padFocus = 0;
      this._padApplyFocus(items);
      return;
    }
    if (dir === "up" || dir === "down") {
      const next = this._padFocus + (dir === "down" ? 1 : -1);
      if (next < 0 || next >= items.length) {
        this._padScrollPanel(root, dir);
        return;
      }
      this._padFocus = next;
      this._padApplyFocus(items);
      this._padScrollFocus(items);
      return;
    }
    if (dir !== "left" && dir !== "right") return;
    const focused = items[this._padFocus];
    if (focused && (focused.tagName || "").toLowerCase() === "input" && (focused.type || "").toLowerCase() === "range") {
      const step = Number(focused.step || 1);
      const min = focused.min === "" ? 0 : Number(focused.min);
      const max = focused.max === "" ? 100 : Number(focused.max);
      const curVal = Number(focused.value);
      let next = curVal + (dir === "left" ? -step : step);
      if (Number.isFinite(min)) next = Math.max(min, next);
      if (Number.isFinite(max)) next = Math.min(max, next);
      if (next !== curVal) {
        focused.value = String(next);
        focused.dispatchEvent(new Event("input", { bubbles: true }));
        focused.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }
    const cur = this._padCenter(items[this._padFocus]);
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < items.length; i++) {
      if (i === this._padFocus) continue;
      const p = this._padCenter(items[i]);
      const dx = p.x - cur.x;
      const dy = p.y - cur.y;
      const along = dir === "left" ? -dx : dx;
      if (along <= 0.5) continue;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return;
    this._padFocus = best;
    this._padApplyFocus(items);
    this._padScrollFocus(items);
  },

  /* Lock the stick at 0.5. Ignore flips until both axes fall under 0.3. Repeat every 250 ms. */
  _padStickEdge(ax, ay) {
    const axA = Math.abs(ax);
    const ayA = Math.abs(ay);
    if (this._padStickDir) {
      if (axA < 0.3 && ayA < 0.3) {
        this._padStickDir = "";
        this._padStickAt = 0;
        return "";
      }
      const t = performance.now();
      if (this._padStickAt && t - this._padStickAt >= 250) {
        this._padStickAt = t;
        return this._padStickDir;
      }
      return "";
    }
    if (axA < 0.5 && ayA < 0.5) return "";
    const dir = axA >= ayA ? (ax < 0 ? "left" : "right") : (ay < 0 ? "up" : "down");
    this._padStickDir = dir;
    this._padStickAt = performance.now();
    return dir;
  },

  _padClickFocus() {
    const items = this._padFocusables(this._padFocusRootEl());
    const el = items[this._padFocus];
    if (el) el.click();
    this._padALock = true;
    if (this._padOwned.e) {
      this.setKey("e", false, false);
      delete this._padOwned.e;
    }
    if (typeof Minigame !== "undefined") Minigame._padHold = false;
  },

  _padSeedFocus() {
    const root = this._padFocusRootEl();
    if (!root) { this._padClearFocus(); return; }
    const items = this._padFocusables(root);
    let pauseResume = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === "pause-resume") { pauseResume = i; break; }
    }
    const fresh = this._padScrollRoot !== root;
    if (fresh) {
      this._padFocusRoot = root;
      this._padFocus = pauseResume;
    } else if (this._padFocus < 0 || this._padFocusRoot !== root) {
      this._padFocusRoot = root;
      this._padFocus = pauseResume;
    }
    this._padApplyFocus(items);
    if (fresh) {
      this._padScrollRoot = root;
      this._padScrollFocus(items);
    }
  },

  pollPad() {
    if (typeof Admin !== "undefined" && Admin.typing()) return;
    let pad = null;
    try {
      const list = navigator.getGamepads ? navigator.getGamepads() : null;
      if (list) {
        for (let i = 0; i < list.length; i++) {
          if (list[i]) { pad = list[i]; break; }
        }
      }
    } catch (e) { pad = null; }
    if (!pad) {
      if (this._padWasOn) {
        this._clearPadKeys();
        this._padClearFocus();
        this._padWasOn = false;
        this._padALock = false;
        this._padStickDir = "";
        this._padStickAt = 0;
        this._padPrevBtn = Object.create(null);
        const busy = (typeof UI !== "undefined" && UI.anyMenu())
          || (typeof Npcs !== "undefined" && Npcs.talkId)
          || (typeof Game !== "undefined" && (Game.sleeping || Game.fading));
        if (!busy && typeof Pause !== "undefined") Pause.open();
      }
      return;
    }
    this._padWasOn = true;
    const watch = [0, 1, 2, 3, 9, 12, 13, 14, 15];
    const now = Object.create(null);
    for (let i = 0; i < watch.length; i++) now[watch[i]] = this._padPressed(pad, watch[i]);
    const rise = (i) => now[i] && !this._padPrevBtn[i];
    const ax = pad.axes && pad.axes.length ? (pad.axes[0] || 0) : 0;
    const ay = pad.axes && pad.axes.length > 1 ? (pad.axes[1] || 0) : 0;
    const dead = 0.35;
    if (!now[0]) this._padALock = false;
    if (this._padMenuOpen()) {
      this._syncPadKey("arrowup", false);
      this._syncPadKey("arrowdown", false);
      this._syncPadKey("arrowleft", false);
      this._syncPadKey("arrowright", false);
      const stickDir = this._padStickEdge(ax, ay);
      let moved = false;
      if (rise(12)) { this._padMoveFocus("up"); moved = true; }
      else if (rise(13)) { this._padMoveFocus("down"); moved = true; }
      else if (rise(14)) { this._padMoveFocus("left"); moved = true; }
      else if (rise(15)) { this._padMoveFocus("right"); moved = true; }
      else if (stickDir) { this._padMoveFocus(stickDir); moved = true; }
      if (!moved) this._padSeedFocus();
      if (rise(0)) this._padClickFocus();
      if (this._padOwned.e) {
        this.setKey("e", false, false);
        delete this._padOwned.e;
        if (typeof Minigame !== "undefined") Minigame._padHold = false;
      }
      /* B closes a menu. Start always sends escape, including mid-fight. */
      this._syncPadKey("escape", !!(now[1] || now[9]));
      this._syncPadKey("j", !!now[3]);
      this._syncPadKey("i", !!now[2]);
      this._syncPadKey("shift", false);
    } else {
      this._padClearFocus();
      this._padScrollRoot = null;
      this._padStickDir = "";
      this._padStickAt = 0;
      this._syncPadKey("arrowleft", ax < -dead || !!now[14]);
      this._syncPadKey("arrowright", ax > dead || !!now[15]);
      this._syncPadKey("arrowup", ay < -dead || !!now[12]);
      this._syncPadKey("arrowdown", ay > dead || !!now[13]);
      this._syncPadKey("shift", this._padPressed(pad, 4));
      if (this._padALock) {
        if (this._padOwned.e) {
          this.setKey("e", false, false);
          delete this._padOwned.e;
        }
        if (typeof Minigame !== "undefined") Minigame._padHold = false;
      } else if (now[0]) {
        this._syncPadKey("e", true);
        if (typeof Minigame !== "undefined") Minigame._padHold = true;
      } else if (this._padOwned.e) {
        this._syncPadKey("e", false);
        if (typeof Minigame !== "undefined") Minigame._padHold = false;
      }
      /* B does nothing with no menu. Start still pauses. */
      this._syncPadKey("escape", !!now[9]);
      this._syncPadKey("j", !!now[3]);
      this._syncPadKey("i", !!now[2]);
    }
    if (Math.abs(ax) >= dead || Math.abs(ay) >= dead || this._padPressed(pad, 4)) {
      document.documentElement.classList.add("pad-input");
    } else {
      for (let i = 0; i < watch.length; i++) {
        if (now[watch[i]]) { document.documentElement.classList.add("pad-input"); break; }
      }
    }
    this._padPrevBtn = now;
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
  /** When the map is smaller than the view (cottage), center it instead of pinning 0,0. */
  clampToWorld(worldW, worldH) {
    const maxX = worldW - this.w;
    const maxY = worldH - this.h;
    if (maxX < 0) this.x = maxX * 0.5;
    else this.x = Utils.clamp(this.x, 0, maxX);
    if (maxY < 0) this.y = maxY * 0.5;
    else this.y = Utils.clamp(this.y, 0, maxY);
  },
  follow(tx, ty, dt, worldW, worldH, vx, vy) {
    this.lookX = Utils.smooth(this.lookX, (vx || 0) * 0.22, dt, 0.04);
    this.lookY = Utils.smooth(this.lookY, (vy || 0) * 0.16, dt, 0.04);
    const targetX = tx - this.w * 0.5 + this.lookX;
    const targetY = ty - this.h * 0.56 + this.lookY;
    this.x = Utils.smooth(this.x, targetX, dt, 0.018);
    this.y = Utils.smooth(this.y, targetY, dt, 0.018);
    this.clampToWorld(worldW, worldH);
    if (this.shake > 0) {
      if (Settings.shake) {
        this.x += (Math.random() - 0.5) * this.shake;
        this.y += (Math.random() - 0.5) * this.shake;
      }
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
    const day = h >= 5.8 && h <= 19.4;
    const tSun = Utils.clamp((h - 6) / 13, 0, 1);
    const elev = day ? Math.sin(tSun * Math.PI) : 0.08;
    const az = tSun * Math.PI;
    const len = 2.2 + (1 - elev) * 9;
    const shadow = {
      x: day ? -Math.cos(az) * len : 0,
      y: 2.2 + (1 - elev) * 2.8,
      elev,
      alpha: day ? 0.18 + (1 - elev) * 0.16 : 0.1,
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

const Settings = {
  KEY: "whisperwood-settings-v1",
  BUS_DEFAULTS: { music: 50, amb: 60, sfx: 80, ui: 60 },
  volume: 100,
  shake: true,
  fullscreen: false,
  music: 50,
  amb: 60,
  sfx: 80,
  ui: 60,
  load() {
    let saved = null;
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (err) {
      saved = null;
    }
    const vol = saved && Number.isFinite(saved.volume) ? saved.volume : 100;
    this.volume = Math.round(Math.min(100, Math.max(0, vol)) / 5) * 5;
    for (const name of Object.keys(this.BUS_DEFAULTS)) {
      const raw = saved && Number.isFinite(saved[name]) ? saved[name] : this.BUS_DEFAULTS[name];
      this[name] = Math.round(Math.min(100, Math.max(0, raw)) / 5) * 5;
    }
    if (saved && typeof saved.shake === "boolean") this.shake = saved.shake;
    else {
      let reduce = false;
      try {
        reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } catch (err) {
        reduce = false;
      }
      this.shake = !reduce;
    }
    this.fullscreen = saved && typeof saved.fullscreen === "boolean" ? saved.fullscreen : false;
  },
  save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        volume: this.volume, shake: this.shake, fullscreen: this.fullscreen,
        music: this.music, amb: this.amb, sfx: this.sfx, ui: this.ui,
      }));
    } catch (err) {}
  },
  setVolume(n) {
    const v = Number(n);
    this.volume = Math.round(Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0)) / 5) * 5;
    this.save();
    AudioFX.applyVolume();
  },
  setBus(name, n) {
    if (!Object.prototype.hasOwnProperty.call(this.BUS_DEFAULTS, name)) return;
    const v = Number(n);
    this[name] = Math.round(Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0)) / 5) * 5;
    this.save();
    AudioFX.applyVolume();
  },
  setShake(on) {
    this.shake = !!on;
    this.save();
  },
  setFullscreen(on) {
    this.fullscreen = !!on;
    this.save();
    if (window.valeDesktop && typeof window.valeDesktop.setFullscreen === "function") {
      window.valeDesktop.setFullscreen(this.fullscreen);
    }
  },
};
Settings.load();
if (window.valeDesktop && typeof window.valeDesktop.onFullscreenChange === "function") {
  window.valeDesktop.onFullscreenChange((on) => {
    Settings.fullscreen = !!on;
    Settings.save();
    if (typeof Pause !== "undefined" && typeof Pause.refreshSettings === "function") Pause.refreshSettings();
  });
}

const MUSIC = { day: 2791545, rain: 3388883, cottage: 3045368, ending: 864360 };
const AMBIENCE = { dawn: ["amb_dawn_birds_loop", 2778300], day: ["amb_day_leaves_loop", 2425500], golden: ["amb_dusk_crickets_loop", 2646000], night: ["amb_night_bed_loop", 2646000] };
const AMB_OWLS = [["amb_night_owl_01", 72765], ["amb_night_owl_02", 94815], ["amb_night_owl_03", 81586], ["amb_night_owl_04", 77175]];
const SFX_FILES = {
  nibble: [["sfx_nibble_01", 5292], ["sfx_nibble_02", 3307]],
  bite: [["sfx_bite_01", 30869], ["sfx_bite_02", 19845]],
  catch: [["sfx_catch_01", 37485], ["sfx_catch_02", 33075]],
  fail: [["sfx_fail_01", 18522], ["sfx_fail_02", 31752]],
};
const SFX_TRIM = 0.35;

const AudioFX = {
  ctx: null,
  muted: false,
  _out: null,
  _bus: null,
  ensure() {
    if (this.muted) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended" && !document.hidden) this.ctx.resume();
      if (this.ctx && !this._out) {
        this._out = this.ctx.createGain();
        this._out.gain.value = this.muted ? 0 : Settings.volume / 100;
        this._out.connect(this.ctx.destination);
        this._bus = { music: null, amb: null, sfx: null, ui: null };
        for (const name of Object.keys(this._bus)) {
          const g = this.ctx.createGain();
          g.gain.value = name === "music"
            ? Math.min(1, Math.max(0, Settings.music / 100))
            : Settings[name] / Settings.BUS_DEFAULTS[name];
          g.connect(this._out);
          this._bus[name] = g;
        }
      }
    } catch (err) {
      this.ctx = null; /* no audio device: cues become silent, the game keeps going */
    }
    this._sfxInit();
  },
  _dest(bus) {
    const name = bus || "sfx";
    return (this._bus && this._bus[name]) || this._out || (this.ctx && this.ctx.destination);
  },
  applyVolume() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this._out) this._out.gain.setTargetAtTime(this.muted ? 0 : Settings.volume / 100, now, 0.01);
    if (!this._bus) return;
    for (const name of Object.keys(this._bus)) {
      const g = this._bus[name];
      if (!g) continue;
      const level = name === "music"
        ? Math.min(1, Math.max(0, Settings.music / 100))
        : Settings[name] / Settings.BUS_DEFAULTS[name];
      g.gain.setTargetAtTime(level, now, 0.01);
    }
  },
  setMuted(on) {
    this.muted = !!on;
    if (this._out && this.ctx) {
      const now = this.ctx.currentTime;
      this._out.gain.cancelScheduledValues(now);
      this._out.gain.setTargetAtTime(this.muted ? 0 : Settings.volume / 100, now, 0.01);
    }
    if (this.muted) {
      this._stopRain();
      if (this._mill && this.ctx) {
        const now = this.ctx.currentTime;
        this._mill.gain.cancelScheduledValues(now);
        this._mill.gain.setValueAtTime(0, now);
      }
      this._millBeat = -1;
      this._stopAmbience();
    }
  },
  setHidden(hidden) {
    if (!this.ctx) return;
    try {
      const done = hidden ? this.ctx.suspend() : this.ctx.resume();
      if (done && typeof done.catch === "function") done.catch(() => {});
    } catch (err) { /* context already closed */ }
  },
  tone(freq, dur, type, vol, slide, bus) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this._dest(bus));
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  plop() {
    this.ensure();
    this.tone(180, 0.12, "sine", 0.06, 70);
  },
  bite() {
    this.ensure();
    if (!this._sfxPlay("bite")) {
      this.tone(520, 0.07, "square", 0.04);
      setTimeout(() => this.tone(720, 0.08, "square", 0.04), 70);
    }
  },
  catch() {
    this.ensure();
    if (!this._sfxPlay("catch")) {
      this.tone(392, 0.12, "triangle", 0.05);
      setTimeout(() => this.tone(523, 0.12, "triangle", 0.05), 90);
      setTimeout(() => this.tone(659, 0.2, "triangle", 0.06), 180);
    }
  },
  fail() {
    this.ensure();
    if (!this._sfxPlay("fail")) this.tone(240, 0.2, "sawtooth", 0.03, 90);
  },
  nibble() {
    this.ensure();
    if (!this._sfxPlay("nibble")) this.tone(340, 0.05, "sine", 0.03, 180);
  },
  _sfxInit() {
    if (!this.ctx || this._sfxBuf) return;
    this._sfxBuf = {};
    this._sfxFail = {};
    this._sfxBusy = {};
    this._sfxWarned = {};
    this._sfxLast = {};
    const cues = Object.keys(SFX_FILES);
    for (let i = 0; i < cues.length; i++) {
      const list = SFX_FILES[cues[i]];
      for (let j = 0; j < list.length; j++) this._sfxLoad(list[j][0]);
    }
  },
  _sfxLoad(file) {
    if (!file || !this.ctx || !this._sfxBuf) return;
    if (this._sfxBuf[file] || this._sfxFail[file] || this._sfxBusy[file]) return;
    this._sfxBusy[file] = true;
    const url = "assets/audio/sfx/" + file + "." + this._musicExt();
    fetch(url).then((res) => {
      if (!res.ok) throw new Error("sfx " + file);
      return res.arrayBuffer();
    }).then((ab) => this._musicDecode(ab)).then((buf) => {
      this._sfxBuf[file] = buf;
      this._sfxBusy[file] = false;
    }).catch((err) => {
      this._sfxFail[file] = true;
      this._sfxBusy[file] = false;
      if (!this._sfxWarned[file]) {
        this._sfxWarned[file] = true;
        console.warn("sfx " + file, err);
      }
    });
  },
  _sfxPlay(cue) {
    if (this.muted || !this.ctx || !Object.prototype.hasOwnProperty.call(SFX_FILES, cue)) return false;
    const list = SFX_FILES[cue];
    if (!list || !list.length || !this._sfxBuf) return false;
    let idx;
    const last = this._sfxLast[cue];
    if (list.length >= 2 && typeof last === "number") {
      idx = (last + 1 + ((Math.random() * (list.length - 1)) | 0)) % list.length;
    } else {
      idx = (Math.random() * list.length) | 0;
    }
    const pair = list[idx];
    const buf = this._sfxBuf[pair[0]];
    if (!buf) return false;
    const N = pair[1];
    const off = buf.length >= N + 1024 ? 1024 : 0;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.03;
    gain.gain.value = SFX_TRIM;
    src.connect(gain).connect(this._dest("sfx"));
    const now = this.ctx.currentTime;
    try {
      src.start(now, off / 44100, N / 44100);
    } catch (err) {
      try { src.disconnect(); } catch (e) { /* already stopped */ }
      try { gain.disconnect(); } catch (e) { /* already stopped */ }
      return false;
    }
    src.onended = () => {
      try { src.disconnect(); } catch (e) { /* already stopped */ }
      try { gain.disconnect(); } catch (e) { /* already stopped */ }
    };
    this._sfxLast[cue] = idx;
    return true;
  },
  /* Small world cues. All of them route through tone(), so mute silences everything. */
  pickup() {
    this.ensure();
    this.tone(660, 0.05, "triangle", 0.03);
    setTimeout(() => this.tone(880, 0.06, "triangle", 0.03), 55);
  },
  coin() {
    this.ensure();
    this.tone(1180, 0.05, "square", 0.018, 0, "ui");
    setTimeout(() => this.tone(1560, 0.09, "square", 0.016, 0, "ui"), 45);
  },
  page() {
    this.ensure();
    this.tone(220, 0.04, "triangle", 0.02, 300, "ui");
  },
  /* One tick when a spoil actually adds stew. Mute and a missing device stay silent. */
  soft() {
    this.ensure();
    this.tone(140, 0.09, "sine", 0.015, 70);
  },
  _stopRain() {
    const bed = this._rain;
    this._rain = null;
    if (!bed) return;
    try {
      if (bed.gain && this.ctx) bed.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
      setTimeout(() => { try { bed.src.stop(); } catch (e) { /* already stopped */ } }, 180);
    } catch (err) { /* no device */ }
  },
  /** Quiet outdoor rain. Under the plop and the bite. Stops the moment the sky or the roof changes. */
  syncRain(on) {
    try {
      if (!on || this.muted) { this._stopRain(); return; }
      this.ensure();
      if (!this.ctx || this._rain) return;
      const ctx = this.ctx;
      const seconds = 1.4;
      const len = (ctx.sampleRate * seconds) | 0;
      const fade = (ctx.sampleRate * 0.02) | 0;
      const tmp = new Float32Array(len + fade);
      let brown = 0;
      for (let i = 0; i < tmp.length; i++) {
        const white = Math.random() * 2 - 1;
        brown = brown * 0.94 + white * 0.06;
        tmp[i] = brown;
      }
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        data[i] = tmp[i] * t + tmp[len + i] * (1 - t);
      }
      for (let i = fade; i < len; i++) data[i] = tmp[i];
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 780;
      const gain = ctx.createGain();
      gain.gain.value = 0.011;
      src.connect(filter).connect(gain).connect(this._dest("amb"));
      src.start();
      this._rain = { src, gain };
    } catch (err) {
      this._rain = null;
    }
  },
  _mill: null,
  _millBeat: -1,
  _millCreak(out, vol) {
    if (!this.ctx || !out) return;
    const t0 = this.ctx.currentTime;
    const v = vol * (DESIGN.millCreakGain || 0.5);
    const tri = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    tri.type = "triangle";
    tri.frequency.setValueAtTime(280, t0);
    tri.frequency.exponentialRampToValueAtTime(190, t0 + 0.22);
    tg.gain.setValueAtTime(v, t0);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    tri.connect(tg).connect(out);
    tri.start(t0);
    tri.stop(t0 + 0.24);
    const body = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    body.type = "sine";
    body.frequency.setValueAtTime(140, t0);
    body.frequency.exponentialRampToValueAtTime(110, t0 + 0.18);
    bg.gain.setValueAtTime(v * 0.35, t0);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    body.connect(bg).connect(out);
    body.start(t0);
    body.stop(t0 + 0.20);
  },
  _millDrip(out, vol) {
    if (!this.ctx || !out) return;
    const t0 = this.ctx.currentTime + 0.18;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(900, t0);
    o.frequency.exponentialRampToValueAtTime(1400, t0 + 0.05);
    g.gain.setValueAtTime(vol * 0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 0.07);
  },
  _millTarget() {
    if (typeof World === "undefined" || typeof Player === "undefined") return 0;
    if (World.id !== "marsh" && World.id !== "vale") return 0;
    const tx = Player.x / TILE_SIZE;
    const ty = Player.y / TILE_SIZE;
    if (World.id === "marsh") {
      const d = Math.hypot(tx - 22, ty - 8.6);
      const vol = DESIGN.millSoundVol;
      if (d <= DESIGN.millSoundNear) return vol;
      if (d >= DESIGN.millSoundFar) return 0;
      return vol * (1 - (d - DESIGN.millSoundNear) / (DESIGN.millSoundFar - DESIGN.millSoundNear));
    }
    const d = Math.hypot(tx - 59.2, ty - 24.9);
    const vol = DESIGN.millSoundValeVol;
    if (d <= DESIGN.millSoundValeNear) return vol;
    if (d >= DESIGN.millSoundValeRange) return 0;
    return vol * (1 - (d - DESIGN.millSoundValeNear) / (DESIGN.millSoundValeRange - DESIGN.millSoundValeNear));
  },
  syncMill(t) {
    try {
      const turning = typeof MillSpine !== "undefined" && MillSpine.stage() === "turning";
      const place = typeof World !== "undefined" && !World.indoor() && World.id !== "island";
      if (this.muted || !turning || !place) {
        if (this._mill && this.ctx) {
          const now = this.ctx.currentTime;
          this._mill.gain.cancelScheduledValues(now);
          this._mill.gain.setValueAtTime(0, now);
        }
        this._millBeat = -1;
        return;
      }
      if (!this.ctx) this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (!this._mill) {
        this._mill = this.ctx.createGain();
        this._mill.gain.setValueAtTime(0, now);
        this._mill.connect(this._dest("amb"));
      }
      const target = this._millTarget();
      this._mill.gain.setTargetAtTime(target, now, DESIGN.millSoundFade);
      const beat = Math.floor((t || 0) / (DESIGN.millWheelStep * DESIGN.millSoundBeats));
      if (beat !== this._millBeat) {
        if (this._millBeat !== -1 && target > 0) {
          this._millCreak(this._mill, 1);
          if (beat % 2 === 0) this._millDrip(this._mill, 1);
        }
        this._millBeat = beat;
      }
    } catch (err) { /* mill bed optional */ }
  },
  millStart() {
    this.ensure();
    if (this.muted || !this.ctx) return;
    this._millCreak(this._dest("amb"), DESIGN.millStartVol);
    this._millDrip(this._dest("amb"), DESIGN.millStartVol);
  },
  step() {
    this.ensure();
    const t = typeof World !== "undefined" && World.tileAt ? World.tileAt(Player.x, Player.y) : TILE.GRASS;
    const jitter = Math.random();
    if (t === TILE.GRASS) {
      this.tone(108 + jitter * 18, 0.045, "sine", 0.016);
    } else if (t === TILE.DIRT || t === TILE.SHORE) {
      this.tone(82 + jitter * 16, 0.05, "triangle", 0.02);
    } else if (t === TILE.DOCK || t === TILE.BRIDGE || t === TILE.WOOD) {
      this.tone(168 + jitter * 22, 0.036, "square", 0.011);
    } else if (t === TILE.STONE || t === TILE.CAVE_FLOOR || t === TILE.CAVE_WALL || t === TILE.MARSH) {
      this.tone(68 + jitter * 14, 0.055, "sine", 0.022, 48);
    } else {
      this.tone(100 + jitter * 20, 0.04, "sine", 0.016);
    }
  },
  /* Music beds. Sample counts are the loop length at 44100. A 1024-sample head is the crossfade tail, not part of the loop. */
  _musicExt() {
    if (this._musicExtPick) return this._musicExtPick;
    let ogg = false;
    try {
      ogg = !!new Audio().canPlayType('audio/ogg; codecs="vorbis"');
    } catch (err) {
      ogg = false;
    }
    this._musicExtPick = ogg ? "ogg" : "m4a";
    return this._musicExtPick;
  },
  _musicDecode(ab) {
    const ctx = this.ctx;
    try {
      const ret = ctx.decodeAudioData(ab);
      if (ret && typeof ret.then === "function") return ret;
    } catch (err) { /* callback form */ }
    return new Promise((resolve, reject) => {
      ctx.decodeAudioData(ab.slice(0), resolve, reject);
    });
  },
  _musicLoad(name) {
    if (!Object.prototype.hasOwnProperty.call(MUSIC, name)) return;
    if (this._musicBuf[name] || this._musicFail[name] || this._musicBusy[name] || !this.ctx) return;
    this._musicBusy[name] = true;
    const url = "assets/audio/music/" + name + "." + this._musicExt();
    fetch(url).then((res) => {
      if (!res.ok) throw new Error("music " + name);
      return res.arrayBuffer();
    }).then((ab) => this._musicDecode(ab)).then((buf) => {
      this._musicBuf[name] = buf;
      this._musicBusy[name] = false;
    }).catch((err) => {
      this._musicFail[name] = true;
      this._musicBusy[name] = false;
      if (!this._musicWarned[name]) {
        this._musicWarned[name] = true;
        console.warn("music " + name, err);
      }
    });
  },
  _musicEnsureDuck() {
    if (this._musicDuck) return this._musicDuck;
    this._musicDuck = this.ctx.createGain();
    this._musicDuck.gain.value = 1;
    this._musicDuck.connect(this._dest("music"));
    return this._musicDuck;
  },
  _musicCurve(gainNode, seconds, fadeIn) {
    const v = gainNode.gain.value;
    const now = this.ctx.currentTime;
    const n = Math.max(2, Math.round(seconds * 60));
    const data = new Float32Array(n);
    const last = n - 1;
    for (let i = 0; i < n; i++) {
      const x = i / last;
      data[i] = fadeIn ? v + (1 - v) * Math.sin(x * Math.PI / 2) : v * Math.cos(x * Math.PI / 2);
    }
    gainNode.gain.cancelScheduledValues(now);
    try {
      gainNode.gain.setValueCurveAtTime(data, now, seconds);
    } catch (err) {
      /* A curve that already started is not cleared by cancel at `now`. */
      gainNode.gain.cancelScheduledValues(0);
      gainNode.gain.setValueAtTime(v, now);
      gainNode.gain.setValueCurveAtTime(data, now, seconds);
    }
  },
  _musicPoints(name, buf) {
    const N = MUSIC[name];
    const off = buf.duration >= (N + 1024) / 44100 - 0.001 ? 1024 : 0;
    return { off: off, start: off / 44100, end: (off + N) / 44100 };
  },
  _musicStart(name, loop) {
    const buf = this._musicBuf[name];
    if (!buf) return null;
    const pts = this._musicPoints(name, buf);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.value = loop ? 0 : 1;
    src.connect(gain).connect(this._musicEnsureDuck());
    const node = { src: src, gain: gain, stopTimer: 0, gone: false };
    if (loop) {
      src.loop = true;
      src.loopStart = pts.start;
      src.loopEnd = pts.end;
      src.start(this.ctx.currentTime, pts.start);
    } else {
      src.loop = false;
      src.start(this.ctx.currentTime, pts.start, MUSIC[name] / 44100);
      src.onended = () => this._musicRelease(name, node);
    }
    return node;
  },
  _musicRelease(name, node) {
    if (!node || node.gone) return;
    if (this._musicFade[name] !== node && this._musicPlay[name] !== node) return;
    node.gone = true;
    if (node.stopTimer) clearTimeout(node.stopTimer);
    try { node.src.stop(); } catch (err) { /* already stopped */ }
    try { node.src.disconnect(); } catch (err) { /* already stopped */ }
    try { node.gain.disconnect(); } catch (err) { /* already stopped */ }
    if (this._musicFade[name] === node) delete this._musicFade[name];
    if (this._musicPlay[name] === node) delete this._musicPlay[name];
    if (this._musicCurrent === name) this._musicCurrent = null;
    const want = this._musicWant;
    if (name === want) return;
    if ((want === "day" || want === "rain") && (name === "day" || name === "rain")) return;
    delete this._musicBuf[name];
  },
  _musicFadeDown(name, seconds) {
    const node = this._musicPlay[name];
    if (!node) return;
    delete this._musicPlay[name];
    this._musicFade[name] = node;
    this._musicCurve(node.gain, seconds, false);
    if (node.stopTimer) clearTimeout(node.stopTimer);
    node.stopTimer = setTimeout(() => this._musicRelease(name, node), seconds * 1000);
  },
  _musicFadeUp(name, seconds) {
    const node = this._musicFade[name];
    if (!node) return;
    if (node.stopTimer) clearTimeout(node.stopTimer);
    node.stopTimer = 0;
    delete this._musicFade[name];
    this._musicPlay[name] = node;
    this._musicCurve(node.gain, seconds, true);
  },
  _musicBegin(want, seconds) {
    if (this._musicFade[want]) this._musicFadeUp(want, seconds);
    else if (!this._musicPlay[want]) {
      const node = this._musicStart(want, true);
      if (!node) return false;
      this._musicPlay[want] = node;
      this._musicCurve(node.gain, seconds, true);
    }
    this._musicCurrent = want;
    return true;
  },
  _musicTo(want) {
    if (this._musicGap) {
      const gap = this._musicGap;
      if (want === gap.to && this.ctx.currentTime < gap.at) return;
      this._musicGap = null;
      this._musicBegin(want, 1.5);
      return;
    }
    if (this._musicCurrent === want && this._musicPlay[want]) return;
    const prev = this._musicCurrent;
    if (prev && prev !== want && (prev === "cottage" || want === "cottage")) {
      this._musicFadeDown(prev, 1.5);
      this._musicGap = { from: prev, to: want, at: this.ctx.currentTime + 2.5 };
      this._musicCurrent = null;
      return;
    }
    const dayRain = (prev === "day" && want === "rain") || (prev === "rain" && want === "day");
    const seconds = dayRain ? 4 : 1.5;
    if (!this._musicBegin(want, seconds)) return;
    if (prev && prev !== want) this._musicFadeDown(prev, seconds);
  },
  _musicEnding() {
    if (this._endingHold) return;
    if (!this._musicBuf.ending && !this._musicFail.ending) this._musicLoad("ending");
    if (!this._endingWait) {
      if (this._musicCurrent) this._musicFadeDown(this._musicCurrent, 2);
      this._musicCurrent = null;
      this._endingWait = this.ctx.currentTime + 2;
    }
    if (this.ctx.currentTime < this._endingWait) return;
    if (this._musicFail.ending) {
      this._endingHold = true;
      return;
    }
    if (!this._musicBuf.ending) return;
    if (!this._musicPlay.ending) {
      const node = this._musicStart("ending", false);
      if (!node) return;
      this._musicPlay.ending = node;
    }
    this._endingHold = true;
  },
  syncMusic(want, duck) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    if (!this._musicPlay) {
      this._musicPlay = {};
      this._musicFade = {};
      this._musicBuf = {};
      this._musicFail = {};
      this._musicBusy = {};
      this._musicWarned = {};
      this._musicCurrent = null;
      this._musicDuckOn = false;
      this._endingHold = false;
      this._endingWait = 0;
      this._musicGap = null;
    }
    this._musicWant = want;
    const duckGain = this._musicEnsureDuck();
    const duckOn = !!duck;
    if (duckOn !== this._musicDuckOn) {
      this._musicDuckOn = duckOn;
      duckGain.gain.setTargetAtTime(duckOn ? 0.398 : 1, this.ctx.currentTime, duckOn ? 0.04 : 0.5);
    }
    if (want === "ending") {
      this._musicGap = null;
      this._musicEnding();
      return;
    }
    this._endingHold = false;
    this._endingWait = 0;
    if (this._musicPlay.ending) this._musicFadeDown("ending", 1.5);
    if (!want) {
      this._musicGap = null;
      if (this._musicCurrent) this._musicFadeDown(this._musicCurrent, 1.5);
      this._musicCurrent = null;
      return;
    }
    if (!this._musicBuf[want]) {
      if (!this._musicFail[want]) this._musicLoad(want);
      return;
    }
    this._musicTo(want);
  },
  _ambInit() {
    if (this._ambBuf) return;
    this._ambPlay = {};
    this._ambFade = {};
    this._ambBuf = {};
    this._ambFail = {};
    this._ambBusy = {};
    this._ambWarned = {};
    this._ambCurrent = null;
    this._ambWant = null;
    this._ambLevel = 1;
    this._ambOwlNext = 0;
    this._ambOwlLast = "";
    this._ambOwl = null;
    this._ambOwlArmed = false;
  },
  _ambLoad(file) {
    if (!file || !this.ctx || !this._ambBuf) return;
    if (this._ambBuf[file] || this._ambFail[file] || this._ambBusy[file]) return;
    this._ambBusy[file] = true;
    const url = "assets/audio/ambience/" + file + "." + this._musicExt();
    fetch(url).then((res) => {
      if (!res.ok) throw new Error("ambience " + file);
      return res.arrayBuffer();
    }).then((ab) => this._musicDecode(ab)).then((buf) => {
      this._ambBuf[file] = buf;
      this._ambBusy[file] = false;
    }).catch((err) => {
      this._ambFail[file] = true;
      this._ambBusy[file] = false;
      if (!this._ambWarned[file]) {
        this._ambWarned[file] = true;
        console.warn("ambience " + file, err);
      }
    });
  },
  _ambPoints(N, buf) {
    const off = buf.length >= N + 1024 ? 1024 : 0;
    return { off: off, start: off / 44100, end: (off + N) / 44100 };
  },
  _ambStart(name, level) {
    const pair = AMBIENCE[name];
    const buf = pair && this._ambBuf[pair[0]];
    if (!buf) return null;
    const pts = this._ambPoints(pair[1], buf);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const levelGain = this.ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = pts.start;
    src.loopEnd = pts.end;
    gain.gain.value = 0;
    levelGain.gain.value = level;
    src.connect(gain);
    gain.connect(levelGain);
    levelGain.connect(this._dest("amb"));
    const node = { name: name, file: pair[0], src: src, gain: gain, level: levelGain, stopTimer: 0, gone: false };
    try {
      src.start(this.ctx.currentTime, pts.start);
    } catch (err) {
      try { src.disconnect(); } catch (e) { /* already stopped */ }
      try { gain.disconnect(); } catch (e) { /* already stopped */ }
      try { levelGain.disconnect(); } catch (e) { /* already stopped */ }
      return null;
    }
    return node;
  },
  _ambRelease(name, node) {
    if (!node || node.gone) return;
    if (this._ambFade[name] !== node && this._ambPlay[name] !== node) return;
    node.gone = true;
    if (node.stopTimer) clearTimeout(node.stopTimer);
    try { node.src.stop(); } catch (err) { /* already stopped */ }
    try { node.src.disconnect(); } catch (err) { /* already stopped */ }
    try { node.gain.disconnect(); } catch (err) { /* already stopped */ }
    try { if (node.level) node.level.disconnect(); } catch (err) { /* already stopped */ }
    if (this._ambFade[name] === node) delete this._ambFade[name];
    if (this._ambPlay[name] === node) delete this._ambPlay[name];
    if (this._ambCurrent === name && !this._ambPlay[name]) this._ambCurrent = null;
    const wantFile = this._ambWant && AMBIENCE[this._ambWant] ? AMBIENCE[this._ambWant][0] : "";
    if (node.file !== wantFile) delete this._ambBuf[node.file];
  },
  _ambArmDown(name, node, seconds) {
    this._musicCurve(node.gain, seconds, false);
    if (node.stopTimer) clearTimeout(node.stopTimer);
    node.secs = seconds;
    node.stopTimer = setTimeout(() => this._ambRelease(name, node), seconds * 1000);
  },
  _ambFadeDown(name, seconds) {
    const node = this._ambPlay[name];
    if (!node) return;
    delete this._ambPlay[name];
    this._ambFade[name] = node;
    this._ambArmDown(name, node, seconds);
  },
  _ambFadeUp(name, seconds) {
    const node = this._ambFade[name];
    if (!node) return;
    if (node.stopTimer) clearTimeout(node.stopTimer);
    node.stopTimer = 0;
    delete this._ambFade[name];
    this._ambPlay[name] = node;
    this._musicCurve(node.gain, seconds, true);
  },
  _ambSetLevel(node, level) {
    if (!node || !node.level || this._ambLevel === level) return;
    try {
      node.level.gain.setTargetAtTime(level, this.ctx.currentTime, 0.7);
    } catch (err) { /* level ramp is optional */ }
    this._ambLevel = level;
  },
  _ambBegin(name, level, seconds) {
    if (this._ambFade[name]) this._ambFadeUp(name, seconds);
    else if (!this._ambPlay[name]) {
      const node = this._ambStart(name, level);
      if (!node) return false;
      this._ambPlay[name] = node;
      this._musicCurve(node.gain, seconds, true);
    }
    this._ambCurrent = name;
    this._ambSetLevel(this._ambPlay[name], level);
    if (!this._ambPlay[name] || !this._ambPlay[name].level) this._ambLevel = level;
    else if (this._ambPlay[name].level.gain.value === level) this._ambLevel = level;
    return true;
  },
  _ambCueOwl(file, N) {
    const buf = this._ambBuf[file];
    if (!buf) return;
    const pts = this._ambPoints(N, buf);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.value = 1;
    src.connect(gain).connect(this._dest("amb"));
    const node = { src: src, gain: gain, file: file, gone: false };
    const now = this.ctx.currentTime;
    try {
      src.start(now, pts.start, N / 44100);
    } catch (err) {
      try { src.disconnect(); } catch (e) { /* already stopped */ }
      try { gain.disconnect(); } catch (e) { /* already stopped */ }
      return false;
    }
    src.onended = () => {
      if (node.gone) return;
      node.gone = true;
      try { src.disconnect(); } catch (e) { /* already stopped */ }
      try { gain.disconnect(); } catch (e) { /* already stopped */ }
      if (this._ambOwl === node) this._ambOwl = null;
    };
    this._ambOwl = node;
    return true;
  },
  _ambOwls(want) {
    const playing = !!(this._ambPlay.night && !this._ambPlay.night.gone);
    if (want !== "night" || !playing) {
      if (want !== "night") this._ambOwlNext = 0;
      return;
    }
    if (!this._ambOwlArmed) {
      this._ambOwlArmed = true;
      for (let i = 0; i < AMB_OWLS.length; i++) this._ambLoad(AMB_OWLS[i][0]);
    }
    const now = this.ctx.currentTime;
    if (!this._ambOwlNext) {
      this._ambOwlNext = now + 25 + Math.random() * 35;
      return;
    }
    if (now < this._ambOwlNext) return;
    const ready = [];
    let pending = false;
    for (let i = 0; i < AMB_OWLS.length; i++) {
      const file = AMB_OWLS[i][0];
      if (this._ambBuf[file]) {
        if (file !== this._ambOwlLast) ready.push(AMB_OWLS[i]);
      } else if (!this._ambFail[file]) pending = true;
    }
    if (!ready.length) {
      if (!pending) this._ambOwlNext = now + 25 + Math.random() * 35;
      return;
    }
    const pick = ready[(Math.random() * ready.length) | 0];
    if (!this._ambCueOwl(pick[0], pick[1])) {
      this._ambOwlNext = now + 1;
      return;
    }
    this._ambOwlLast = pick[0];
    this._ambOwlNext = now + 25 + Math.random() * 35;
  },
  _stopAmbience() {
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      const nodes = [];
      const take = (map) => {
        if (!map) return;
        for (const k of Object.keys(map)) {
          if (map[k]) nodes.push(map[k]);
        }
      };
      take(this._ambPlay);
      take(this._ambFade);
      if (this._ambOwl) nodes.push(this._ambOwl);
      for (const node of nodes) {
        if (!node || node.gone) continue;
        node.gone = true;
        if (node.stopTimer) {
          clearTimeout(node.stopTimer);
          node.stopTimer = 0;
        }
        try {
          const g = node.gain.gain;
          g.cancelScheduledValues(0);
          g.setValueAtTime(g.value, now);
          g.setTargetAtTime(0.0001, now, 0.04);
        } catch (err) { /* a running curve must not escape mute */ }
      }
      if (this._ambPlay) this._ambPlay = {};
      if (this._ambFade) this._ambFade = {};
      this._ambCurrent = null;
      this._ambOwl = null;
      this._ambOwlNext = 0;
      setTimeout(() => {
        for (const node of nodes) {
          try { node.src.stop(); } catch (err) { /* already stopped */ }
          try { node.src.disconnect(); } catch (err) { /* already stopped */ }
          try { node.gain.disconnect(); } catch (err) { /* already stopped */ }
          try { if (node.level) node.level.disconnect(); } catch (err) { /* already stopped */ }
        }
      }, 180);
    } catch (err) { /* mute must not throw, even mid-fade */ }
  },
  syncAmbience(want, level) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    this._ambInit();
    if (want && !Object.prototype.hasOwnProperty.call(AMBIENCE, want)) want = null;
    const lv = level === 0.6 ? 0.6 : 1;
    this._ambWant = want;
    if (want) this._ambLoad(AMBIENCE[want][0]);
    const file = want ? AMBIENCE[want][0] : "";
    if (want && !this._ambBuf[file]) {
      this._ambOwls(want);
      return;
    }
    if (want && this._ambPlay[want]) {
      this._ambSetLevel(this._ambPlay[want], lv);
      this._ambCurrent = want;
      this._ambOwls(want);
      return;
    }
    if (!want) {
      const fading = this._ambFade ? Object.keys(this._ambFade) : [];
      if (this._ambCurrent && this._ambPlay[this._ambCurrent]) this._ambFadeDown(this._ambCurrent, 1.5);
      for (let i = 0; i < fading.length; i++) {
        const node = this._ambFade[fading[i]];
        if (node && node.secs > 1.5) this._ambArmDown(fading[i], node, 1.5);
      }
      this._ambCurrent = null;
      this._ambOwls(null);
      return;
    }
    const prev = this._ambCurrent;
    const seconds = prev && prev !== want && this._ambPlay[prev] ? 8 : 3;
    if (!this._ambBegin(want, lv, seconds)) {
      this._ambOwls(want);
      return;
    }
    if (prev && prev !== want) this._ambFadeDown(prev, seconds);
    this._ambOwls(want);
  },
};
