/**
 * The Night Bite: Local notes (Water, #notes) stay hidden until there is a real note. A real note is a
 * <li class="note-slot note-real">; the dashed "Sample note" slots are templates and never show.
 * The section ships with the hidden attribute, so with no real notes (or no JS) nothing appears or moves.
 * A lake with no real notes keeps its card hidden even when another lake has some. See LOCAL-NOTES.md.
 */
(function () {
  var sec = document.querySelector("[data-local-notes]");
  if (!sec || !sec.querySelector(".note-real")) return;
  Array.prototype.forEach.call(sec.querySelectorAll(".notes-lake"), function (lake) {
    if (!lake.querySelector(".note-real")) lake.hidden = true;
  });
  Array.prototype.forEach.call(sec.querySelectorAll(".note-slot:not(.note-real)"), function (s) { s.hidden = true; });
  sec.hidden = false;
})();
