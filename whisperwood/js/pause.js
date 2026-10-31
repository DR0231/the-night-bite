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

  showTab(name) {
    const tabs = document.querySelectorAll("#pause-settings [data-tab]");
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const on = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      const panel = document.getElementById("pause-panel-" + tab.dataset.tab);
      if (panel) panel.classList.toggle("hidden", !on);
    }
  },

  refreshSettings() {
    if (typeof Settings === "undefined") return;
    const vol = document.querySelector("#pause-settings input[data-vol]");
    if (vol) vol.value = Settings.volume;
    const volOut = document.getElementById("pause-vol-out");
    if (volOut) volOut.textContent = String(Settings.volume);
    const buses = ["music", "amb", "sfx", "ui"];
    for (let i = 0; i < buses.length; i++) {
      const name = buses[i];
      const slider = document.querySelector("#pause-settings input[data-bus=\"" + name + "\"]");
      if (slider) slider.value = Settings[name];
      const out = document.getElementById("pause-bus-" + name + "-out");
      if (out) out.textContent = String(Settings[name]);
    }
    const shake = document.getElementById("pause-shake");
    if (shake) shake.checked = Settings.shake;
    const startFs = document.getElementById("pause-start-fs");
    if (startFs) startFs.checked = !!Settings.fullscreen;
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
    AudioFX.setMuted(mute.checked);
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
    if (settings) {
      const opening = settings.classList.contains("hidden");
      settings.classList.toggle("hidden");
      if (opening) Pause.showTab("general");
    }
    Pause.refreshSettings();
  });
  const tabBtns = document.querySelectorAll("#pause-settings [data-tab]");
  for (let t = 0; t < tabBtns.length; t++) {
    const tab = tabBtns[t];
    tab.addEventListener("click", () => Pause.showTab(tab.dataset.tab));
  }
  if (typeof Settings !== "undefined") {
    const sliders = document.querySelectorAll("#pause-settings input[type=range]");
    for (let i = 0; i < sliders.length; i++) {
      const slider = sliders[i];
      slider.addEventListener("input", () => {
        const n = Number(slider.value);
        if (slider.hasAttribute("data-vol")) Settings.volume = n;
        else if (slider.dataset.bus) Settings[slider.dataset.bus] = n;
        if (typeof AudioFX !== "undefined" && typeof AudioFX.applyVolume === "function") AudioFX.applyVolume();
        const out = slider.parentElement && slider.parentElement.querySelector("output");
        if (out) out.textContent = String(n);
      });
      slider.addEventListener("change", () => {
        if (slider.hasAttribute("data-vol") && typeof Settings.setVolume === "function") Settings.setVolume(slider.value);
        else if (slider.dataset.bus && typeof Settings.setBus === "function") Settings.setBus(slider.dataset.bus, slider.value);
        Pause.refreshSettings();
      });
    }
  }
  const shake = document.getElementById("pause-shake");
  if (shake && typeof Settings !== "undefined") shake.addEventListener("change", () => {
    Settings.setShake(shake.checked);
  });
  const startFs = document.getElementById("pause-start-fs");
  if (startFs && typeof Settings !== "undefined") startFs.addEventListener("change", () => {
    if (typeof Settings.setFullscreen === "function") Settings.setFullscreen(startFs.checked);
    Pause.refreshSettings();
  });
  const fsWeb = !window.valeDesktop
    && typeof document.documentElement.requestFullscreen === "function"
    && document.fullscreenEnabled === true
    && matchMedia("(pointer: coarse)").matches;
  if (fsWeb) document.documentElement.classList.add("web-fs");
  const menuOpen = document.getElementById("btn-menu-open");
  const menuChooser = document.getElementById("menu-chooser");
  const flatMenu = window.matchMedia("(pointer: coarse) and (max-width: 720px), (pointer: coarse) and (max-height: 480px)");
  const hideChooser = () => {
    if (menuChooser) menuChooser.classList.add("hidden");
    if (menuOpen) menuOpen.setAttribute("aria-expanded", "false");
  };
  const closeChooser = () => {
    if (flatMenu.matches) return;
    hideChooser();
  };
  const syncFlatMenu = () => {
    if (!menuChooser) return;
    if (flatMenu.matches) menuChooser.classList.remove("hidden");
    else hideChooser();
  };
  syncFlatMenu();
  if (typeof flatMenu.addEventListener === "function") flatMenu.addEventListener("change", syncFlatMenu);
  if (menuOpen && menuChooser) {
    menuOpen.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      menuChooser.classList.toggle("hidden");
      menuOpen.setAttribute("aria-expanded", menuChooser.classList.contains("hidden") ? "false" : "true");
    });
    const rowIds = ["btn-journal", "btn-pack", "btn-menu"];
    for (let r = 0; r < rowIds.length; r++) {
      const row = document.getElementById(rowIds[r]);
      if (!row) continue;
      row.addEventListener("pointerup", closeChooser);
      row.addEventListener("pointercancel", closeChooser);
    }
    document.addEventListener("pointerdown", (ev) => {
      if (menuChooser.classList.contains("hidden")) return;
      const pad = document.getElementById("menu-pad");
      if (pad && pad.contains(ev.target)) return;
      closeChooser();
    }, true);
  }
  const releaseFsHold = () => {
    const pads = [document.getElementById("move-pad"), document.getElementById("menu-pad")];
    for (let p = 0; p < pads.length; p++) {
      const pad = pads[p];
      if (!pad) continue;
      const btns = pad.querySelectorAll("button");
      for (let i = 0; i < btns.length; i++) btns[i].dispatchEvent(new Event("pointercancel"));
    }
    if (typeof Input !== "undefined" && typeof Input.stickRelease === "function") Input.stickRelease();
    closeChooser();
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
    if (!fsWeb) return;
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
