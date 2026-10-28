/**
 * The Night Bite: links that land on folded content open it. A link (or page address) to a <details> opens that
 * fold; a link to a section opens the section's folds marked .gear-fold, so a Gear chip like Crappie lands on
 * the crappie kit, rigs and baits already open. Everything else stays folded.
 */
(function () {
  function openFor(id) {
    if (!id) return;
    var el;
    try { el = document.getElementById(decodeURIComponent(id)); } catch (e) { return; }
    if (!el) return;
    var d = el.closest ? el.closest("details") : null;
    if (d) d.open = true;
    if (el.tagName === "SECTION") {
      Array.prototype.forEach.call(el.querySelectorAll("details.gear-fold"), function (f) { f.open = true; });
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) openFor(a.getAttribute("href").slice(1));
  }, true);
  window.addEventListener("hashchange", function () { openFor(location.hash.slice(1)); });
  if (location.hash) {
    openFor(location.hash.slice(1));
    var t = document.getElementById(location.hash.slice(1));
    if (t && t.scrollIntoView) requestAnimationFrame(function () { t.scrollIntoView(); });
  }
})();
