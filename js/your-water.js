/**
 * The Night Bite: "Your water" jump on /rules, /drawdown and /species/trout.
 * Reads only the existing device-local key (localStorage "nb-lake", the key js/lakes.js already uses).
 * Nothing new is collected or sent. No saved pick, or a value that is not a known water: nothing is shown.
 * If that water has a row or card on the page (or Hoover's crappie paragraph on /rules), shows a jump link.
 * If it does not, shows a plain line saying it is not listed. Never implies a row that is not there.
 */
(function () {
  var box = document.getElementById("your-water");
  if (!box) return;

  var LS = window.NightBiteLakes || {};
  var KEY = LS.storageKey || "nb-lake";

  function reduceMotion() {
    if (document.documentElement.getAttribute("data-motion") === "reduce") return true;
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function savedId() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
    if (!raw || !/^[a-z0-9-]+$/.test(raw)) return null;
    if (LS.all && !Object.prototype.hasOwnProperty.call(LS.all, raw)) return null;
    return raw;
  }

  function targets(id) {
    var out = [], seen = [];
    function add(el) {
      if (!el || seen.indexOf(el) !== -1) return;
      seen.push(el);
      out.push(el);
    }
    var nodes = document.querySelectorAll('tr[data-lake="' + id + '"]');
    for (var i = 0; i < nodes.length; i++) add(nodes[i]);
    var el = document.getElementById(id);
    if (el && el.tagName === "TR") add(el);
    if (el && el.id === "hoover" && el.closest && el.closest("#crappie")) add(el);
    return out;
  }

  function nameOf(id, rows) {
    if (LS.all && LS.all[id] && LS.all[id].name) return LS.all[id].name;
    for (var i = 0; i < (rows || []).length; i++) {
      var a = rows[i].querySelector("a");
      var n = a && a.textContent.replace(/\s+/g, " ").trim();
      if (n) return n;
    }
    return null;
  }

  function highlight(rows) {
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove("is-your-water");
      // reflow so a second jump can replay the flash
      void rows[i].offsetWidth;
      rows[i].classList.add("is-your-water");
    }
    window.setTimeout(function () {
      for (var j = 0; j < rows.length; j++) rows[j].classList.remove("is-your-water");
    }, 1800);
  }

  function jump(rows) {
    if (!rows.length) return;
    var el = rows[0];
    function go() {
      if (el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
    }
    requestAnimationFrame(go);
    highlight(rows);
  }

  var id = savedId();
  if (!id) return;

  var rows = targets(id);
  var name = nameOf(id, rows);
  if (!name) return;

  box.textContent = "";
  if (rows.length) {
    var a = document.createElement("a");
    a.href = "#" + id;
    a.textContent = "Your water: " + name;
    a.addEventListener("click", function () {
      // let the hash update so :target stays; then scroll and flash
      requestAnimationFrame(function () { jump(rows); });
    });
    box.appendChild(a);
    box.removeAttribute("hidden");
  } else {
    box.textContent = "Your water, " + name + ", is not listed on this page.";
    box.removeAttribute("hidden");
  }

  if (location.hash === "#" + id && rows.length) {
    requestAnimationFrame(function () { jump(rows); });
  }
})();
