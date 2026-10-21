/**
 * The Night Bite — presentational pool readout.
 * Reads the existing #correction-line text (written by the weekly routine and
 * refreshed by js/usgs.js) and mirrors it as a three-cell instrument readout.
 * Purely visual: the original line stays in the DOM for screen readers and is
 * shown again whenever its text doesn't match the expected format
 * (for example "unavailable, check USGS"). Never computes or invents values.
 * The temp slot accepts "no temp" and, for older routine output, "temp —".
 */
(function () {
  var line = document.getElementById("correction-line");
  if (!line || !window.MutationObserver) return;

  var RE = /^\s*([\d.]+)\s*ft\s*·\s*(?:(-?\d+(?:\.\d+)?)\s*°F|no temp|temp —)\s*·\s*~?([\d.]+)\s*ft\s+(above|below)\s+full pool\s*$/;
  var readout = document.createElement("div");
  readout.className = "pool-readout";
  readout.setAttribute("aria-hidden", "true");
  readout.hidden = true;
  line.parentNode.insertBefore(readout, line.nextSibling);

  function cell(label, value, unit) {
    var c = document.createElement("div");
    c.className = "pool-readout-cell";
    var l = document.createElement("span");
    l.className = "pool-readout-label";
    l.textContent = label;
    var v = document.createElement("span");
    v.className = "pool-readout-value";
    v.textContent = value;
    if (unit) {
      var u = document.createElement("span");
      u.className = "pool-readout-unit";
      u.textContent = unit;
      v.appendChild(u);
    }
    c.appendChild(l);
    c.appendChild(v);
    return c;
  }

  function render() {
    var m = RE.exec(line.textContent || "");
    if (!m) {
      readout.hidden = true;
      line.classList.remove("is-mirrored");
      return;
    }
    readout.textContent = "";
    readout.appendChild(cell("Pool", m[1], "ft"));
    readout.appendChild(cell("Water", m[2] !== undefined ? m[2] : "n/a", m[2] !== undefined ? "°F" : ""));
    readout.appendChild(cell(m[4] === "above" ? "Above full pool" : "Below full pool", "~" + m[3], "ft"));
    readout.hidden = false;
    line.classList.add("is-mirrored");
  }

  render();
  new MutationObserver(render).observe(line, { childList: true, characterData: true, subtree: true });
})();
