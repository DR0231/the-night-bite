/**
 * The Night Bite: Pick your water, the site root (index.html).
 * With no script the page already works: every water is a plain link to its home page (<id>/), and the region chips
 * jump to their section. Tiles and chips are built from js/lakes.js and data/quick-facts.json by
 * tools/build-lake-pages.py. This script adds, and nothing more:
 *  · "Find a water": filters the tiles by name, short name, area and aliases; Enter opens the top match, Escape clears;
 *    a search with no match shows a calm empty state with a way back to every water;
 *  · the region chips become filters (All waters shows every region);
 *  · Last picked: with ?pick and a water saved, that water's tile sits on top;
 *  · remembering the pick: the water's id (only the id) goes in localStorage "nb-lake", the key js/lakes.js reads, and
 *    the lake page fades in like a switch from the lake sheet. "Just browsing" (hoover/?browse) saves nothing.
 */
(function () {
  var box = document.getElementById("waters");
  if (!box) return;
  var LS = window.NightBiteLakes || {}, KEY = LS.storageKey || "nb-lake";
  var regions = [].slice.call(box.querySelectorAll(".wp-region"));
  var tiles = [].slice.call(box.querySelectorAll(".wp-grid a[data-water]"));
  var chips = [].slice.call(box.querySelectorAll(".wp-chip"));
  var search = box.querySelector(".wp-search"), input = document.getElementById("wp-search");
  var empty = box.querySelector(".wp-empty"), emptyText = box.querySelector(".wp-empty-text");
  var last = box.querySelector(".wp-last");
  var chip = "all";

  function remember(id) {
    try { localStorage.setItem(KEY, id); } catch (e) {}
    try { sessionStorage.removeItem("nb-browse"); sessionStorage.setItem("nb-lake-switch", "1"); } catch (e) {}
  }
  function wire(a) {
    a.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      remember(a.getAttribute("data-water"));
    });
  }
  tiles.forEach(wire);

  // Last picked (only seen with ?pick; otherwise js/lakes.js has already opened the saved water)
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var savedTile = saved && box.querySelector('.wp-grid a[data-water="' + saved + '"]');
  if (last && savedTile) {
    var copy = savedTile.cloneNode(true);
    copy.setAttribute("aria-label", "Last picked: " + savedTile.querySelector(".wp-name").textContent);
    last.appendChild(copy); wire(copy); last.hidden = false;
  }

  function norm(s) { return (s || "").toLowerCase().replace(/[\u2019'.]/g, "").replace(/\s+/g, " ").trim(); }
  function paint() {
    var q = norm(input && input.value), hits = 0;
    regions.forEach(function (sec) {
      var inChip = chip === "all" || sec.getAttribute("data-region") === chip, n = 0;
      [].forEach.call(sec.querySelectorAll(".wp-item"), function (li) {
        var a = li.firstElementChild;
        var ok = inChip && (!q || norm(a.getAttribute("data-q")).indexOf(q) !== -1);
        li.hidden = !ok; if (ok) n++;
      });
      sec.hidden = !n; hits += n;
    });
    if (last && savedTile) last.hidden = !!q || chip !== "all";
    chips.forEach(function (c) { c.setAttribute("aria-current", c.getAttribute("data-chip") === chip ? "true" : "false"); });
    empty.hidden = hits > 0;
    if (!hits) emptyText.textContent = "Nothing matches \u201c" + input.value.trim() + "\u201d. Try the water\u2019s name or a nearby town, like Mt. Sterling.";
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function (e) {
      e.preventDefault();
      chip = c.getAttribute("data-chip");
      if (input && input.value) input.value = "";
      paint();
    });
  });
  if (search && input) {
    search.hidden = false;
    input.addEventListener("input", function () { if (input.value && chip !== "all") chip = "all"; paint(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) { input.value = ""; paint(); return; }
      if (e.key !== "Enter" || !input.value.trim()) return;
      var top = tiles.filter(function (a) { return !a.parentNode.hidden; })[0];
      if (top) { e.preventDefault(); top.click(); }
    });
  }
  box.querySelector(".wp-empty-clear").addEventListener("click", function () {
    chip = "all"; if (input) { input.value = ""; input.focus(); } paint();
  });
  paint();
})();
