/**
 * The Night Bite: the baked pool snapshot for lakes other than Hoover.
 * The pool card's markup carries Hoover's last checked reading (written by the weekly routine). On Alum Creek or
 * Buckeye Lake this swaps in that lake's own last checked reading from js/lakes.js (pool.snapshot) before js/usgs.js
 * runs, so the card never shows Hoover's numbers under another lake's name. js/usgs.js then refreshes it live.
 * Lakes with no public gauge (pool.src null) get a plain "No public lake level gauge" line and the ODNR map pool instead.
 * Placed inline right after #usgs-live-status. Does nothing on Hoover.
 */
(function () {
  var LK = window.NightBiteLake;
  if (!LK || LK.id === "hoover") return;
  var P = LK.cfg.pool, S = P.snapshot;
  var NOGAUGE = !P.src;   // Madison Lake, Knox Lake, Clear Fork: no public lake level or temp gauge
  var line = document.getElementById("correction-line");
  var checked = document.getElementById("correction-checked");
  var status = document.getElementById("usgs-live-status");
  var temp = document.getElementById("water-temp");
  function a(href, text) {
    var n = document.createElement("a");
    n.href = href; n.target = "_blank"; n.rel = "noopener"; n.textContent = text;
    return n;
  }
  if (NOGAUGE) {
    if (line) line.textContent = "No public lake level gauge";
    if (checked) checked.textContent = "ODNR fishing map pool: " + P.fullPool + " ft. No USGS or Corps gauge posts this lake's level or water temp, so there is no live reading to show.";
    if (temp) temp.textContent = "No public water temp gauge";
    if (status) status.textContent = "No public lake level or water temp gauge on this lake. Never invented.";
    return;
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
