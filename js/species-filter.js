/**
 * The Night Bite — species grid filter chips
 */
(function () {
  var chips = document.querySelectorAll(".filter-chip");
  var cards = document.querySelectorAll(".species-card");
  if (!chips.length || !cards.length) return;

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var filter = chip.getAttribute("data-filter") || "all";
      chips.forEach(function (c) {
        c.classList.toggle("is-active", c === chip);
      });
      cards.forEach(function (card) {
        var group = card.getAttribute("data-group");
        var show = filter === "all" || group === filter;
        card.hidden = !show;
      });
    });
  });
})();
