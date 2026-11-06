/* The Night Bite: Dock season (water.html#docks). Built from data/docks.json by tools/build-docks.py.
 * Once an "ending" item's date has passed in Columbus, swap in its after text, so "Season ends Oct. 31" never
 * lingers into November. Hoover rental rows (data-rental="1") may say the rental season closed. They do not
 * swap in text that says the docks were pulled. If the last check is over 14 days old, say so. No fetches, nothing stored. */
(function () {
  var sec = document.getElementById("docks");
  if (!sec) return;
  var today;
  try {
    today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch (e) {
    var n = new Date();
    today = n.getFullYear() + "-" + ("0" + (n.getMonth() + 1)).slice(-2) + "-" + ("0" + n.getDate()).slice(-2);
  }
  var PHYSICAL = /season over|are done|docks are out|were removed|have been removed|were pulled|have been pulled|pulling the ramp/i;
  Array.prototype.forEach.call(sec.querySelectorAll(".dock-item[data-ends]"), function (li) {
    if (today <= li.getAttribute("data-ends")) return;
    if (li.getAttribute("data-rental") === "1" && PHYSICAL.test((li.getAttribute("data-after-label") || "") + " " + (li.getAttribute("data-after-note") || ""))) return;
    var pill = li.querySelector(".dock-pill"), note = li.querySelector(".dock-note");
    if (pill) pill.textContent = li.getAttribute("data-after-label");
    if (note) note.textContent = li.getAttribute("data-after-note");
    li.classList.remove("is-ending");
    li.classList.add("is-over");
  });
  Array.prototype.forEach.call(sec.querySelectorAll(".dock-checked[data-checked]"), function (p) {
    var c = Date.parse(p.getAttribute("data-checked") + "T12:00:00"), t = Date.parse(today + "T12:00:00");
    if (isNaN(c) || isNaN(t) || (t - c) / 864e5 <= 14) return;
    var s = document.createElement("strong");
    s.className = "dock-stale";
    s.textContent = " Over two weeks old. Call before you go.";
    p.appendChild(s);
  });
})();
