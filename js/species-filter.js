/**
 * The Night Bite — species grid filter chips (group + optional season/mode)
 */
(function () {
  var groupChips = document.querySelectorAll(".filter-chip[data-filter]");
  var seasonChips = document.querySelectorAll(".filter-chip[data-season]");
  var modeChips = document.querySelectorAll(".filter-chip[data-mode-filter]");
  var cards = document.querySelectorAll(".species-card");
  if (!cards.length) return;

  var state = { group: "all", season: "all", mode: "all" };

  function paint() {
    cards.forEach(function (card) {
      var group = card.getAttribute("data-group");
      var season = card.getAttribute("data-season") || "all";
      var mode = card.getAttribute("data-mode") || "all";
      var show =
        (state.group === "all" || group === state.group) &&
        (state.season === "all" || season === state.season) &&
        (state.mode === "all" || mode === state.mode);
      card.hidden = !show;
    });
  }

  function bind(chips, attr, key) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state[key] = chip.getAttribute(attr) || "all";
        chips.forEach(function (c) {
          c.classList.toggle("is-active", c === chip);
        });
        paint();
      });
    });
  }

  bind(groupChips, "data-filter", "group");
  bind(seasonChips, "data-season", "season");
  bind(modeChips, "data-mode-filter", "mode");
})();
