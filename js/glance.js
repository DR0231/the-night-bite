/**
 * The Night Bite: "Right now" strip under the home hero (#glance), so a phone sees the lake level and tonight's bite
 * rating on the first screen. Purely a mirror: it copies what the pool card (#correction-line, written by the weekly
 * routine and refreshed by js/usgs.js) and the Tonight card (.cond-bite, js/conditions.js) already show, and
 * follows them as they refresh. Never computes or invents a value. Each cell links down to its full card.
 * Both cells have a fixed height, so filling them in never moves the page.
 */
(function () {
  var box = document.getElementById("glance");
  if (!box || !window.MutationObserver) return;
  var line = document.getElementById("correction-line");
  var cond = document.getElementById("conditions");
  var bite = cond && cond.querySelector(".cond-bite");
  function q(k) { return box.querySelector('[data-glance="' + k + '"]'); }
  var poolV = q("pool"), poolS = q("pool-sub"), biteV = q("bite"), biteS = q("bite-sub");
  var RE = /^\s*([\d.]+)\s*ft\s*·\s*(?:-?\d+(?:\.\d+)?\s*°F|no temp|temp —)\s*·\s*~?([\d.]+)\s*ft\s+(above|below)\s+full pool\s*$/;

  function set(el, text) { if (el && el.textContent !== text) el.textContent = text; }
  function cell(el, ok) { var c = el && el.closest(".glance-cell"); if (c) { if (ok) c.removeAttribute("data-empty"); else c.setAttribute("data-empty", ""); } }

  function pool() {
    if (!line) return;
    var m = RE.exec(line.textContent || "");
    if (m) {
      set(poolV, m[1] + " ft");
      set(poolS, "~" + m[2] + " ft " + m[3] + " full pool");
      cell(poolV, true);
    } else {
      set(poolV, "--");
      set(poolS, "See the gauge below");
      cell(poolV, false);
    }
  }
  function rate() {
    if (!bite || !cond) return;
    var r = bite.querySelector(".cond-bite-rate");
    var why = bite.querySelector(".cond-bite-why");
    if (!bite.hidden && r && r.textContent.trim()) {
      set(biteV, r.textContent.trim());
      var first = why ? why.textContent.split(",")[0].replace(/\.$/, "").trim() : "";
      set(biteS, first || "Rule of thumb, not a promise");
      cell(biteV, true);
    } else {
      set(biteV, "--");
      set(biteS, cond.getAttribute("data-state") === "loading" ? "Loading the forecast" : "Forecast not available");
      cell(biteV, false);
    }
  }

  pool(); rate();
  if (line) new MutationObserver(pool).observe(line, { childList: true, characterData: true, subtree: true });
  if (bite) new MutationObserver(rate).observe(bite, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  if (cond) new MutationObserver(rate).observe(cond, { attributes: true, attributeFilter: ["data-state"] });
})();
