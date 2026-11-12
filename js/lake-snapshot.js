/**
 * The Night Bite: the baked pool snapshot for lakes other than Hoover.
 * The pool card's markup carries Hoover's last checked reading (written by the weekly routine). On Alum Creek or
 * Buckeye Lake this swaps in that lake's own last checked reading from js/lakes.js (pool.snapshot) before js/usgs.js
 * runs, so the card never shows Hoover's numbers under another lake's name. js/usgs.js then refreshes it live.
 * Lakes with no public gauge (pool.src null) get a plain "No public lake level gauge" line and the ODNR map pool instead.
 * A lake whose USGS gauge stopped reporting (pool.stale, Pymatuning) says so, with the last date and a link, and never
 * shows that old reading as the current level.
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
  if (NOGAUGE && P.stale) {
    var G = P.stale;
    if (line) line.textContent = "USGS gauge not reporting";
    if (checked) {
      checked.textContent = "ODNR fishing map pool: " + P.fullPool + " ft. USGS gauge " + G.site + " last reported " + G.last + " on " + G.lastWhen + " and has posted nothing since, so there is no current reading to show. ";
      checked.appendChild(a(G.url, "USGS gauge page"));
      checked.appendChild(document.createTextNode("."));
    }
    if (temp) temp.textContent = "No public water temp gauge";
    if (status) status.textContent = "The USGS lake level gauge here is not reporting right now. No water temp gauge. Never invented.";
    return;
  }
  if (NOGAUGE) {
    if (line) line.textContent = "No public lake level gauge";
    if (checked) checked.textContent = (P.fullPool != null ? "ODNR fishing map pool: " + P.fullPool + " ft. " : "No ODNR fishing map pool is posted for this lake. ") + "No USGS or Corps gauge posts this lake's level or water temp, so there is no live reading to show.";
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
  var note = P.temp ? "" : P.outflow ? " USACE outflow temp; it is not lake surface temperature." :
    P.profile ? " No live water temp; the Corps posts a temperature profile." : " No public water temp gauge on this lake.";
  if (temp && !P.temp) temp.textContent = P.outflow ? "USACE outflow temp, not lake surface" : P.profile ? "No live water temp" : "No public water temp gauge";
  // a lake with its own temp gauge (Griggs, Indian Lake): its own snapshot temp with its time, never the page's baked
  // Hoover reading (water.html shows this line)
  if (temp && P.temp) {
    var tm = S && /·\s*(-?\d+(?:\.\d+)?)\s*°F\s*·/.exec(S.line);
    if (tm) {
      temp.textContent = "";
      var b = document.createElement("strong");
      b.textContent = tm[1] + " °F";
      temp.appendChild(b);
      temp.appendChild(document.createTextNode(" · "));
      var tt = document.createElement("time");
      tt.setAttribute("datetime", S.at);
      tt.textContent = S.when;
      temp.appendChild(tt);
    } else {
      temp.textContent = "No water temp in the last check";   // pg.no_temp_check
    }
  }
  if (status) {
    status.textContent = "Provisional snapshot; your browser may refresh it from " + P.srcName + "." + note + " Never invented.";
  }
})();
