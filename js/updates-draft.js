/**
 * The Night Bite: What's new. Draft entries (not shipped yet, no date) show only on the preview.
 * Runs in <head> before the page paints, so showing them never shifts the layout. On nightbiteoh.com they stay hidden.
 */
(function () {
  var h = location.hostname;
  if (h !== "nightbiteoh.com" && h !== "www.nightbiteoh.com") document.documentElement.classList.add("nb-show-drafts");
})();
