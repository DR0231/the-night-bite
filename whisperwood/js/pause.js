/* Esc menu. Save tools live here; the pack keeps its mute box. */

const Pause = {
  openFlag: false,

  open() {
    const el = document.getElementById("pause-menu");
    if (el) el.classList.remove("hidden");
    this.openFlag = true;
    const mute = document.getElementById("pause-mute");
    if (mute) mute.checked = !!(Save.data.flags && Save.data.flags.mute);
    const confirm = document.getElementById("pause-reset-confirm");
    const credits = document.getElementById("pause-credits");
    const settings = document.getElementById("pause-settings");
    if (confirm) confirm.classList.add("hidden");
    if (credits) credits.classList.add("hidden");
    if (settings) settings.classList.add("hidden");
    this.refreshSettings();
  },

  close() {
    const menu = document.getElementById("pause-menu");
    const confirm = document.getElementById("pause-reset-confirm");
    const credits = document.getElementById("pause-credits");
    const settings = document.getElementById("pause-settings");
    if (menu) menu.classList.add("hidden");
    if (confirm) confirm.classList.add("hidden");
    if (credits) credits.classList.add("hidden");
    if (settings) settings.classList.add("hidden");
    this.openFlag = false;
  },

  refreshSettings() {
    if (typeof Settings === "undefined") return;
    const text = document.getElementById("pause-volume-text");
    if (text) text.textContent = "Sound " + Settings.volume + "%";
    const shake = document.getElementById("pause-shake");
    if (shake) shake.checked = Settings.shake;
  },

  askReset() {
    const confirm = document.getElementById("pause-reset-confirm");
    if (confirm) confirm.classList.remove("hidden");
  },
};

(function bindPause() {
  const mute = document.getElementById("pause-mute");
  if (mute) mute.addEventListener("change", () => {
    Save.data.flags.mute = mute.checked;
    AudioFX.muted = mute.checked;
    const pack = document.getElementById("chk-mute");
    if (pack) pack.checked = mute.checked;
  });
  const resume = document.getElementById("pause-resume");
  if (resume) resume.addEventListener("click", () => Pause.close());
  const no = document.getElementById("pause-reset-no");
  if (no) no.addEventListener("click", () => {
    const confirm = document.getElementById("pause-reset-confirm");
    if (confirm) confirm.classList.add("hidden");
  });
  const yes = document.getElementById("pause-reset-yes");
  if (yes) yes.addEventListener("click", () => {
    if (Save.resetFreshKeepingMute() !== false) { location.reload(); return; }
    const confirm = document.getElementById("pause-reset-confirm");
    if (confirm) confirm.classList.add("hidden");
    UI.toastWarn(NO_CORNER);
  });
  const creditsBtn = document.getElementById("pause-credits-btn");
  if (creditsBtn) creditsBtn.addEventListener("click", () => {
    const credits = document.getElementById("pause-credits");
    if (credits) credits.classList.toggle("hidden");
  });
  const settingsBtn = document.getElementById("pause-settings-btn");
  if (settingsBtn && typeof Settings !== "undefined") settingsBtn.addEventListener("click", () => {
    const settings = document.getElementById("pause-settings");
    if (settings) settings.classList.toggle("hidden");
    Pause.refreshSettings();
  });
  const volDown = document.getElementById("pause-volume-down");
  if (volDown && typeof Settings !== "undefined") volDown.addEventListener("click", () => {
    Settings.setVolume(Settings.volume - 10);
    Pause.refreshSettings();
  });
  const volUp = document.getElementById("pause-volume-up");
  if (volUp && typeof Settings !== "undefined") volUp.addEventListener("click", () => {
    Settings.setVolume(Settings.volume + 10);
    Pause.refreshSettings();
  });
  const shake = document.getElementById("pause-shake");
  if (shake && typeof Settings !== "undefined") shake.addEventListener("change", () => {
    Settings.setShake(shake.checked);
  });
  const fsWeb = !window.valeDesktop
    && typeof document.documentElement.requestFullscreen === "function"
    && document.fullscreenEnabled !== false
    && matchMedia("(pointer: coarse)").matches;
  if (fsWeb) document.documentElement.classList.add("web-fs");
  const releaseFsHold = () => {
    const pads = [document.getElementById("move-pad"), document.getElementById("menu-pad")];
    for (let p = 0; p < pads.length; p++) {
      const pad = pads[p];
      if (!pad) continue;
      const btns = pad.querySelectorAll("button");
      for (let i = 0; i < btns.length; i++) btns[i].dispatchEvent(new Event("pointercancel"));
    }
    const fish = document.getElementById("btn-fish");
    if (fish) fish.dispatchEvent(new Event("pointercancel"));
    if (typeof Input !== "undefined") {
      Input.down = Object.create(null);
      if (typeof Input._clearPadKeys === "function") Input._clearPadKeys();
    }
    if (typeof Minigame !== "undefined") Minigame._padHold = false;
  };
  const toggleFs = (ev) => {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (window.valeDesktop) {
      window.valeDesktop.toggleFullscreen();
      return;
    }
    if (document.fullscreenElement) {
      const exiting = document.exitFullscreen();
      if (exiting && typeof exiting.catch === "function") exiting.catch(() => {});
      return;
    }
    let entered;
    try {
      entered = document.documentElement.requestFullscreen();
    } catch (err) {
      return;
    }
    const lockLand = () => {
      try {
        if (screen.orientation && typeof screen.orientation.lock === "function") {
          const locked = screen.orientation.lock("landscape");
          if (locked && typeof locked.catch === "function") locked.catch(() => {});
        }
      } catch (err) { /* ignore */ }
    };
    if (entered && typeof entered.then === "function") entered.then(lockLand).catch(() => {});
    else lockLand();
  };
  const full = document.getElementById("pause-fullscreen");
  if (full) full.addEventListener("click", toggleFs);
  const fullTitle = document.getElementById("btn-fullscreen");
  if (fullTitle) fullTitle.addEventListener("click", toggleFs);
  if (fsWeb) {
    document.addEventListener("fullscreenchange", () => {
      const label = document.fullscreenElement ? "Leave full screen" : "Full screen";
      if (full) full.textContent = label;
      if (fullTitle) fullTitle.textContent = label;
      releaseFsHold();
    });
  }
  const quit = document.getElementById("pause-quit");
  if (quit) quit.addEventListener("click", () => window.close());
})();
