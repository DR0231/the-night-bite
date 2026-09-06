/* Top-down player: planted movement, facing lock, walk cycle, wall slide. */

const Player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  dir: 0, // 0 down, 1 left, 2 right, 3 up
  moving: false,
  frame: 0,
  animT: 0,
  idleT: 0,
  fishing: false,
  hop: 0,
  locked: false,
  lastStep: -1,
  blink: false,

  spawn() {
    this.x = World.spawn.x;
    this.y = World.spawn.y;
    this.vx = 0; this.vy = 0;
    this.dir = 0;
  },

  col() {
    const w = CONFIG.PLAYER_COL_W, h = CONFIG.PLAYER_COL_H;
    return { x: this.x - w * 0.5, y: this.y - h, w, h };
  },

  update(dt) {
    if (this.hop > 0) this.hop = Utils.approach(this.hop, 0, dt * 32);

    const axis = Input.axis();
    const wantsMove = !!(axis.x || axis.y);

    const moveTap = Input.pressed["w"] || Input.pressed["a"] || Input.pressed["s"] || Input.pressed["d"]
      || Input.pressed["arrowup"] || Input.pressed["arrowdown"] || Input.pressed["arrowleft"] || Input.pressed["arrowright"];
    if (this.fishing && moveTap && (Fishing.state === "wait" || Fishing.state === "nibble")) {
      Fishing.cancel();
    }

    if (this.locked || this.fishing) {
      this.vx = 0; this.vy = 0;
      this.moving = false;
      this.idleT += dt;
      this.blink = (this.idleT % 3.6) < 0.12;
      return;
    }

    const wantX = axis.x * CONFIG.PLAYER_SPEED;
    const wantY = axis.y * CONFIG.PLAYER_SPEED;
    const accel = wantsMove ? CONFIG.PLAYER_ACCEL : CONFIG.PLAYER_FRICTION;
    this.vx = Utils.approach(this.vx, wantX, accel * dt);
    this.vy = Utils.approach(this.vy, wantY, accel * dt);

    const speed = Math.hypot(this.vx, this.vy);
    // Don't zero velocity while a direction is held — on high-Hz displays
    // one frame of accel can be below the stop threshold and movement never starts.
    if (!wantsMove && speed < CONFIG.PLAYER_STOP_SPEED) {
      this.vx = 0;
      this.vy = 0;
      this.moving = false;
      this.frame = 0;
      this.animT = 0;
      this.lastStep = -1;
      this.idleT += dt;
      this.blink = (this.idleT % 3.6) < 0.12;
    } else {
      this.moving = speed > 1;
      this._face(this.vx, this.vy, wantsMove, axis);
      this.animT += dt * Utils.clamp(speed / CONFIG.PLAYER_SPEED, 0.45, 1.2) * 8.4;
      this.frame = (this.animT | 0) % 4;
      this.idleT = 0;
      this.blink = false;
      if (this.moving && (this.frame === 1 || this.frame === 3) && this.lastStep !== this.frame) {
        Particles.dust(this.x, this.y);
        if (Math.random() < 0.45) AudioFX.step();
        this.lastStep = this.frame;
      }
    }

    this._move(this.vx * dt, this.vy * dt);
  },

  _face(vx, vy, fromInput, axis) {
    const ax = Math.abs(fromInput ? axis.x : vx);
    const ay = Math.abs(fromInput ? axis.y : vy);
    const bias = CONFIG.FACE_BIAS;
    if (ax > ay * bias) this.dir = (fromInput ? axis.x : vx) < 0 ? 1 : 2;
    else if (ay > ax * bias) this.dir = (fromInput ? axis.y : vy) < 0 ? 3 : 0;
  },

  _move(dx, dy) {
    if (dx !== 0) this._axis("x", dx);
    if (dy !== 0) this._axis("y", dy);
  },

  /** Separate-axis move with a short corner slide so trunks don't snag. */
  _axis(axis, delta) {
    const c = this.col();
    if (axis === "x") {
      if (World.rectClear(c.x + delta, c.y, c.w, c.h)) { this.x += delta; return; }
      for (const n of [1, -1, 2, -2, 3, -3]) {
        if (World.rectClear(c.x, c.y + n, c.w, c.h) && World.rectClear(c.x + delta, c.y + n, c.w, c.h)) {
          this.y += n;
          this.x += delta;
          return;
        }
      }
      this.vx = 0;
    } else {
      if (World.rectClear(c.x, c.y + delta, c.w, c.h)) { this.y += delta; return; }
      for (const n of [1, -1, 2, -2, 3, -3]) {
        if (World.rectClear(c.x + n, c.y, c.w, c.h) && World.rectClear(c.x + n, c.y + delta, c.w, c.h)) {
          this.x += n;
          this.y += delta;
          return;
        }
      }
      this.vy = 0;
    }
  },

  faceToward(tx, ty) {
    const dx = tx - this.x, dy = ty - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? 1 : 2;
    else this.dir = dy < 0 ? 3 : 0;
  },

  draw(ctx) {
    Sprites.player(ctx, this.x, this.y, {
      dir: this.dir,
      frame: this.frame,
      moving: this.moving,
      fishing: this.fishing,
      fishState: Game.fishing.state,
      hop: this.hop,
      idleBob: Math.sin(this.idleT * 2.4) * 0.7,
      blink: this.blink,
      rodPhase: Game.fishing.rodPhase,
      windup: Game.fishing.state === "cast" && Game.fishing.t < 0.14,
    });
  },
};
