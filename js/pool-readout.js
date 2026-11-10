/**
 * The Night Bite — presentational pool readout.
 * Reads the existing #correction-line text (written by the weekly routine and
 * refreshed by js/usgs.js) and mirrors it as a three-cell instrument readout.
 * Purely visual: the original line stays in the DOM for screen readers and is
 * shown again whenever its text doesn't match the expected format
 * (for example "unavailable, check USGS"). Never computes or invents values.
 * The temp slot accepts "no temp" and, for older routine output, "temp —". A Corps outflow reading ("60°F outflow",
 * js/usgs.js) is labelled Outflow, never Water. A lake with only a dated Corps temperature profile ("Corps profile Oct. 19")
 * shows that date under "Corps profile", never as a live reading.
 */
(function () {
  var line = document.getElementById("correction-line");
  if (!line || !window.MutationObserver) return;

  var RE = /^\s*([\d.]+)\s*ft\s*·\s*(?:(-?\d+(?:\.\d+)?)\s*°F(?:\s+outflow)?|no temp|temp —|Corps profile [A-Z][a-z]{2,3}\.? \d{1,2})\s*·\s*~?([\d.]+)\s*ft\s+(above|below)\s+full pool\s*$/;
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

  // the English line: js/i18n.js keeps it in data-en while data-nb-out still matches the translated text on screen
  function english() {
    var shown = line.textContent || "";
    var en = line.getAttribute("data-en");
    return en && line.getAttribute("data-nb-out") === shown ? en : shown;
  }

  function render() {
    var text = english();
    var m = RE.exec(text);
    if (!m) {
      readout.hidden = true;
      line.classList.remove("is-mirrored");
      return;
    }
    readout.textContent = "";
    readout.appendChild(cell("Pool", m[1], "ft"));
    var outflow = /°F\s+outflow\s*·/.test(text);
    var profile = /·\s*Corps profile ([A-Z][a-z]{2,3}\.? \d{1,2})\s*·/.exec(text);
    if (profile) readout.appendChild(cell("Corps profile", profile[1], ""));   // dated, never a live reading
    else readout.appendChild(cell(outflow ? "Outflow" : "Water", m[2] !== undefined ? m[2] : "n/a", m[2] !== undefined ? "°F" : ""));
    var correction = cell(m[4] === "above" ? "Above full pool" : "Below full pool", "~" + m[3], "ft");
    correction.setAttribute("data-nb-keep", "");
    readout.appendChild(correction);
    readout.hidden = false;
    line.classList.add("is-mirrored");
  }

  render();
  new MutationObserver(render).observe(line, { childList: true, characterData: true, subtree: true });
})();
