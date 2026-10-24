/**
 * The Night Bite: the baked pool snapshot for lakes other than Hoover.
 * The pool card's markup carries Hoover's last checked reading (written by the weekly routine). On Alum Creek or
 * Buckeye this swaps in that lake's own last checked reading from js/lakes.js (pool.snapshot) before js/usgs.js
 * runs, so the card never shows Hoover's numbers under another lake's name. js/usgs.js then refreshes it live.
 * Placed inline right after #usgs-live-status. Does nothing on Hoover.
 */
(function () {
  var LK = window.NightBiteLake;
  if (!LK || LK.id === "hoover") return;
  var P = LK.cfg.pool, S = P.snapshot;
  var line = document.getElementById("correction-line");
  var checked = document.getElementById("correction-checked");
  var status = document.getElementById("usgs-live-status");
  var temp = document.getElementById("water-temp");
  function a(href, text) {
    var n = document.createElement("a");
    n.href = href; n.target = "_blank"; n.rel = "noopener"; n.textContent = text;
    return n;
  }
  if (line && S) line.textContent = S.line;
  if (checked && S) {
    checked.textContent = "Checked: ";
    var t = document.createElement("time");
    t.setAttribute("datetime", S.at);
    t.textContent = S.when;
    checked.appendChild(t);
    checked.appendChild(document.createTextNode(". "));
    checked.appendChild(a(P.gaugeUrl, "Live " + P.srcName + " gauge"));
    checked.appendChild(document.createTextNode("."));
  }
  if (temp && !P.temp) temp.textContent = "No public water temp gauge";
  if (status) {
    status.textContent = "Provisional snapshot; your browser may refresh it from " + P.srcName + "." +
      (P.temp ? "" : " No public water temp gauge on this lake.") + " Never invented.";
  }
})();
