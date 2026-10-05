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
    if (confirm) confirm.classList.add("hidden");
    if (credits) credits.classList.add("hidden");
  },

  close() {
    const menu = document.getElementById("pause-menu");
    const confirm = document.getElementById("pause-reset-confirm");
    const credits = document.getElementById("pause-credits");
    if (menu) menu.classList.add("hidden");
    if (confirm) confirm.classList.add("hidden");
    if (credits) credits.classList.add("hidden");
    this.openFlag = false;
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
    Save.resetFreshKeepingMute();
    location.reload();
  });
  const creditsBtn = document.getElementById("pause-credits-btn");
  if (creditsBtn) creditsBtn.addEventListener("click", () => {
    const credits = document.getElementById("pause-credits");
    if (credits) credits.classList.toggle("hidden");
  });
  const full = document.getElementById("pause-fullscreen");
  if (full) full.addEventListener("click", () => {
    if (window.valeDesktop) window.valeDesktop.toggleFullscreen();
  });
  const quit = document.getElementById("pause-quit");
  if (quit) quit.addEventListener("click", () => window.close());
})();
