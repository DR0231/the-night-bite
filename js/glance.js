/**
 * The Night Bite: "Tonight at a glance" strip under the home hero (#glance), so a phone at the ramp sees the lake
 * level, water temp, sunset and tonight's wind (plus the bite rating) on the first screen.
 * Purely a mirror: it copies what the pool card (#correction-line, written by the weekly routine and refreshed by
 * js/usgs.js, with its USGS fallback) and the Tonight card (js/conditions.js: NWS wind, on-phone sunset, the bite
 * line) already show, and follows them as they refresh. No fetch of its own, never computes or invents a value.
 * Offline it shows whatever those cards show (saved forecast, last reading). Each cell links to its source:
 * level and temp to the lake's USGS or USACE gauge page, wind to the NWS forecast for the lake's point, sunset to
 * the Tonight card (worked out on the phone, no outside source). A lake with no gauge gets a quiet "No public gauge".
 * Every cell has a fixed height, so filling them in never moves the page.
 */
(function () {
  var box = document.getElementById("glance");
  if (!box || !window.MutationObserver) return;
  var LK = window.NightBiteLake, C = (LK && LK.cfg) || {}, P = C.pool || {}, NW = C.nws || {};
  var line = document.getElementById("correction-line");
  var cond = document.getElementById("conditions");
  var bite = cond && cond.querySelector(".cond-bite");
  var sunC = cond && cond.querySelector('[data-cond="sunset"]');
  var windC = cond && cond.querySelector('[data-cond="wind"]');
  function q(k) { return box.querySelector('[data-glance="' + k + '"]'); }
  var poolV = q("pool"), poolS = q("pool-sub"), tempV = q("temp"), tempS = q("temp-sub");
  var sunV = q("sunset"), sunS = q("sunset-sub"), windV = q("wind"), windS = q("wind-sub"), biteV = q("bite");
  var RE = /^\s*([\d.]+)\s*ft\s*·\s*(?:(-?\d+(?:\.\d+)?)\s*°F|no temp|temp —)\s*·\s*~?([\d.]+)\s*ft\s+(above|below)\s+full pool\s*$/;
  var NOGAUGE = P.hasOwnProperty("src") && !P.src, HASTEMP = !!P.temp;
  if (!LK) HASTEMP = true;   // js/lakes.js missing: Hoover, which has a temp gauge

  // source links (the static HTML points at the cards, so a lake page never shows another lake's links)
  function src(key, href) {
    var a = box.querySelector('[data-cell="' + key + '"]');
    if (!a) return;
    if (!href) { a.removeAttribute("href"); a.setAttribute("data-none", ""); return; }
    a.href = href; a.target = "_blank"; a.rel = "noopener";
  }
  if (NOGAUGE) { src("pool", null); src("temp", null); }
  else if (P.gaugeUrl) { src("pool", P.gaugeUrl); if (HASTEMP) src("temp", P.gaugeUrl); else src("temp", null); }
  if (NW.page) src("wind", NW.page);

  function set(el, text, unit) {
    if (!el) return;
    var want = text + (unit ? " " + unit : "");
    if (el.textContent === want) return;
    el.textContent = text;
    if (unit) { var u = document.createElement("span"); u.className = "glance-unit"; u.textContent = " " + unit; el.appendChild(u); }
  }
  function cell(el, ok) { var c = el && el.closest(".glance-cell"); if (c) { if (ok) c.removeAttribute("data-empty"); else c.setAttribute("data-empty", ""); } }
  function parts(c) {   // a Tonight card cell: value text and its unit span
    var v = c && !c.hidden && !c.hasAttribute("data-empty") && c.querySelector(".cond-value");
    if (!v) return null;
    var u = v.querySelector(".cond-unit"), n = v.firstChild;
    var t = n && n.nodeType === 3 ? n.nodeValue.trim() : "";
    var s = c.querySelector(".cond-sub");
    return t ? { v: t, u: u ? u.textContent.trim() : "", sub: s ? s.textContent.trim() : "" } : null;
  }

  function pool() {
    if (!line) return;
    var m = RE.exec(line.textContent || "");
    if (m) {
      set(poolV, m[1], "ft"); set(poolS, "~" + m[3] + " ft " + m[4] + " full"); cell(poolV, true);
    } else {
      set(poolV, "--"); set(poolS, NOGAUGE ? "No public gauge" : "Gauge unavailable"); cell(poolV, false);
    }
    if (!HASTEMP) {
      set(tempV, "--"); set(tempS, "No public temp gauge"); cell(tempV, false);
    } else if (m && m[2] !== undefined) {
      set(tempV, String(Math.round(parseFloat(m[2]))), "°F"); set(tempS, (P.srcName || "USGS") + " gauge"); cell(tempV, true);
    } else {
      set(tempV, "--"); set(tempS, "No reading right now"); cell(tempV, false);
    }
  }
  function sun() {
    var p = parts(sunC);
    if (p) { set(sunV, p.v, p.u); set(sunS, p.sub || "Worked out on this phone"); cell(sunV, true); }
    else { set(sunV, "--"); set(sunS, "Not worked out"); cell(sunV, false); }
  }
  function wind() {
    var p = parts(windC), saved = cond && cond.hasAttribute("data-saved");
    var tw = cond && /^(\d+)\|(\d+)\|([A-Z]*)$/.exec(cond.getAttribute("data-wind-tonight") || "");
    if (tw && p) {   // tonight's NWS hourly range, sunset (or now) to 2 AM, same numbers as "Tonight, in short"
      var lo = +tw[1], hi = +tw[2];
      if (hi === 0) set(windV, "Calm"); else set(windV, lo === hi ? String(hi) : lo + "\u2013" + hi, "mph" + (tw[3] ? " " + tw[3] : ""));
      set(windS, (saved ? "Saved NWS" : "NWS") + ", until 2 AM");
      cell(windV, true);
    } else if (p) {
      var g = /gusts (\d+)/.exec(p.sub);
      set(windV, p.v, p.u);
      set(windS, (saved || /saved/i.test(p.sub) ? "Saved NWS" : "NWS") + (g ? ", gusts " + g[1] : " forecast"));
      cell(windV, true);
    } else {
      set(windV, "--");
      set(windS, cond && cond.getAttribute("data-state") === "loading" ? "Loading the forecast" : "NWS not available");
      cell(windV, false);
    }
  }
  function rate() {
    var r = bite && bite.querySelector(".cond-bite-rate");
    if (bite && !bite.hidden && r && r.textContent.trim()) { set(biteV, r.textContent.trim()); cell(biteV, true); }
    else { set(biteV, "--"); cell(biteV, false); }
  }
  function all() { pool(); sun(); wind(); rate(); }

  all();
  if (line) new MutationObserver(pool).observe(line, { childList: true, characterData: true, subtree: true });
  if (cond) new MutationObserver(function () { sun(); wind(); rate(); }).observe(cond, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden", "data-empty", "data-state", "data-saved", "data-wind-tonight"] });
})();
