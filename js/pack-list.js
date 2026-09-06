/**
 * The Night Bite — packing list checkboxes (localStorage nightbite-pack-v1)
 */
(function () {
  var KEY = "nightbite-pack-v1";
  var boxes = document.querySelectorAll(".pack-list input[type='checkbox'][data-pack-id]");
  if (!boxes.length) return;

  var state = {};
  try {
    state = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    state = {};
  }

  boxes.forEach(function (box) {
    var id = box.getAttribute("data-pack-id");
    if (state[id]) box.checked = true;
    box.addEventListener("change", function () {
      state[id] = !!box.checked;
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {}
    });
  });
})();
