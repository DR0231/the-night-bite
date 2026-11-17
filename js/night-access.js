/**
 * The Night Bite: Night access page. The page already works with no script: each region is a native
 * <details> fold, and each water is a plain link. This script adds, and nothing more:
 *  · "Find a water" filters rows by the water's name; regions with matches open, empty regions hide,
 *    and a no-matches line appears when nothing fits. Clearing (or Escape) restores the default,
 *    with every region visible and closed;
 *  · /night#<lake> (and #night-<region>) opens that water's region, scrolls to the row and leaves
 *    the :target highlight. A hashchange does the same, and a search is cleared so the row stays visible.
 * Nothing is sent or saved. The location hash is the only input.
 */
(function () {
  var form = document.querySelector(".night-search");
  var input = document.getElementById("night-search");
  var empty = document.getElementById("night-empty");
  var box = document.getElementById("night-regions");
  if (!box) return;
  var regions = [].slice.call(box.querySelectorAll(".night-region"));
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function norm(s) {
    return (s || "").toLowerCase().replace(/[\u2019']/g, "").replace(/\s+/g, " ").trim();
  }
  function compact(s) { return norm(s).replace(/ /g, ""); }

  function showAll() {
    regions.forEach(function (sec) {
      sec.hidden = false;
      [].forEach.call(sec.querySelectorAll(".summary-list > li"), function (li) { li.hidden = false; });
    });
    if (empty) { empty.hidden = true; empty.textContent = ""; }
  }

  function closeAll() {
    regions.forEach(function (sec) { sec.open = false; });
  }

  function reveal(id) {
    if (!id) return;
    var el;
    try { el = document.getElementById(decodeURIComponent(id)); } catch (e) { return; }
    if (!el) return;
    var d = el.closest ? el.closest("details.night-region") : null;
    if (el.classList && el.classList.contains("night-region")) d = el;
    if (d) d.open = true;
    function go() {
      if (el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }
    if (d && !reduce) setTimeout(go, 230);
    else requestAnimationFrame(go);
  }

  function restore() {
    showAll();
    closeAll();
    if (location.hash) reveal(location.hash.slice(1));
  }

  function paint() {
    var raw = input ? input.value : "";
    var q = norm(raw), c = compact(raw), hits = 0;
    if (!q) { restore(); return; }
    regions.forEach(function (sec) {
      var n = 0;
      [].forEach.call(sec.querySelectorAll(".summary-list > li"), function (li) {
        var hay = li.getAttribute("data-q") || ((li.querySelector(".summary-head a") || {}).textContent || "");
        var ok = norm(hay).indexOf(q) !== -1 || compact(hay).indexOf(c) !== -1;
        li.hidden = !ok;
        if (ok) n++;
      });
      sec.hidden = !n;
      if (n) sec.open = true;
      hits += n;
    });
    if (empty) {
      empty.hidden = hits > 0;
      empty.textContent = hits ? "" : "Nothing matches \u201c" + raw.trim() + "\u201d. Try a water\u2019s name.";
    }
  }

  if (form && input) {
    form.hidden = false;
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    input.addEventListener("input", paint);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) { input.value = ""; paint(); }
    });
    input.addEventListener("search", function () { if (!input.value) paint(); });
  }

  window.addEventListener("hashchange", function () {
    if (input && input.value) input.value = "";
    restore();
  });
  if (location.hash) reveal(location.hash.slice(1));
})();
