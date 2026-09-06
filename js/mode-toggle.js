/**
 * The Night Bite — Bank | Boat mode toggle
 * Persists choice in localStorage key nightbite-mode-v1
 */
(function () {
  var KEY = "nightbite-mode-v1";
  var root = document.documentElement;
  var toggles = document.querySelectorAll(".mode-toggle");
  if (!toggles.length) return;

  function getStored() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === "bank" || v === "boat") return v;
    } catch (e) {}
    return "bank";
  }

  function apply(mode) {
    root.setAttribute("data-nightbite-mode", mode);
    document.querySelectorAll('[data-mode="bank"]').forEach(function (el) {
      el.hidden = mode !== "bank";
    });
    document.querySelectorAll('[data-mode="boat"]').forEach(function (el) {
      el.hidden = mode !== "boat";
    });
    toggles.forEach(function (toggle) {
      toggle.querySelectorAll('[role="radio"]').forEach(function (btn) {
        var on = btn.getAttribute("data-mode-value") === mode;
        btn.setAttribute("aria-checked", on ? "true" : "false");
        btn.classList.toggle("is-active", on);
      });
    });
    try {
      localStorage.setItem(KEY, mode);
    } catch (e) {}
  }

  var initial = getStored();
  apply(initial);

  toggles.forEach(function (toggle) {
    toggle.querySelectorAll('[role="radio"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        apply(btn.getAttribute("data-mode-value") || "bank");
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        var next = e.key === "ArrowRight" ? "boat" : "bank";
        apply(next);
        var focusBtn = toggle.querySelector(
          '[data-mode-value="' + next + '"]'
        );
        if (focusBtn) focusBtn.focus();
      });
    });
  });
})();
