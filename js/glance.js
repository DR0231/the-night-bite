/**
 * The Night Bite: "Tonight at a glance" strip under the home hero (#glance), so a phone at the ramp sees the lake
 * level, water temp, sunset and tonight's wind (plus the bite rating) on the first screen.
 * Purely a mirror: it copies what the pool card (#correction-line, written by the weekly routine and refreshed by
 * js/usgs.js) and the Tonight card (js/conditions.js: NWS wind, on-phone sunset, the bite line) show, and follows
 * them as they refresh. No fetch of its own, never computes or invents a value.
 *
 * The page arrives with the strip already filled (tools/glance_bake.py): the stamped snapshot level and temp with
 * their checked date and time, and plain word states ("Needs forecast", "Check NWS", "No gauge") where there is no
 * number, so it reads right with JavaScript off and with USGS or NWS blocked. This script then:
 *  · turns the stamp into "last updated X hours ago" (from the pool card's Checked <time>), every minute;
 *  · swaps in the live reading when js/usgs.js gets one, and keeps the last reading (with its time) when a refresh
 *    fails or the phone is offline; a lake with no gauge keeps its "No gauge" state, linked to the pool card note;
 *    a lake with a Corps outflow temp shows it under an "Outflow temp" label (never as lake surface temperature), and a
 *    lake with only a dated Corps temperature profile says "Profile only", linked to that profile;
 *  · shows tonight's NWS wind and the bite once the forecast loads, the saved forecast (with its age) when NWS is
 *    not reachable, and "Check NWS" / "Needs forecast" when there is nothing to show. Never a bare "--".
 * Every cell has a fixed height, so filling them in never moves the page.
 */
(function () {
  var box = document.getElementById("glance");
  if (!box) return;
  var LK = window.NightBiteLake, C = (LK && LK.cfg) || {}, P = C.pool || {}, NW = C.nws || {};
  var line = document.getElementById("correction-line");
  var checked = document.getElementById("correction-checked");
  var cond = document.getElementById("conditions");
  var bite = cond && cond.querySelector(".cond-bite");
  var sunC = cond && cond.querySelector('[data-cond="sunset"]');
  var windC = cond && cond.querySelector('[data-cond="wind"]');
  function q(k) { return box.querySelector('[data-glance="' + k + '"]'); }
  var poolV = q("pool"), poolS = q("pool-sub"), tempV = q("temp"), tempS = q("temp-sub");
  // Numeric pool correction mirrors a live value, not a static interface label.
  if (poolS) poolS.setAttribute("data-nb-keep", "");
  var sunV = q("sunset"), sunS = q("sunset-sub"), windV = q("wind"), windS = q("wind-sub"), biteV = q("bite");
  var stampEl = q("stamp");
  var RE = /^\s*([\d.]+)\s*ft\s*·\s*(?:(-?\d+(?:\.\d+)?)\s*°F(?:\s+outflow)?|no temp|temp —|Corps profile [A-Z][a-z]{2,3}\.? \d{1,2})\s*·\s*~?([\d.]+)\s*ft\s+(above|below)\s+full pool\s*$/;
  var NOGAUGE = P.hasOwnProperty("src") && !P.src, HASTEMP = !!P.temp;
  // Corps outflow water temperature (labelled outflow, never lake surface) or a dated Corps temperature profile only
  var OUT = !HASTEMP && P.outflow || null, PROF = !HASTEMP && !OUT && P.profile || null;
  if (!LK) HASTEMP = true;   // js/lakes.js missing: Hoover, which has a temp gauge
  var SRC = P.srcName || "USGS";

  // source links: the gauge page and the NWS forecast page (the baked HTML already has them; kept in step with
  // js/lakes.js here). Cells with no gauge keep their baked link to the pool card's note.
  function link(key, href) {
    var a = box.querySelector('[data-cell="' + key + '"]');
    if (a && href) { a.href = href; a.target = "_blank"; a.rel = "noopener"; }
  }
  if (!NOGAUGE && P.gaugeUrl) { link("pool", P.gaugeUrl); if (HASTEMP) link("temp", P.gaugeUrl); }
  if (OUT && OUT.url) link("temp", OUT.url);
  if (PROF && PROF.url) link("temp", PROF.url);
  if (NW.page) link("wind", NW.page);

  // value text (+ unit), or a word state in label type
  function set(el, text, unit, state) {
    if (!el) return;
    el.classList.toggle("glance-state", !!state);
    var want = text + (unit ? " " + unit : "");
    // same English as last time: leave it, js/i18n.js may have swapped it for the picked language (rewriting it
    // would flap between English and the translation, since i18n changes inside the conditions block wake wind())
    if (el.textContent === want || el.__nbEn === want) return;
    el.__nbEn = want;
    el.textContent = text;
    if (unit) { var u = document.createElement("span"); u.className = "glance-unit"; u.textContent = " " + unit; el.appendChild(u); }
  }
  function state(el, text) { set(el, text, "", true); }
  function cell(el, ok) { var c = el && el.closest(".glance-cell"); if (c) { if (ok) c.removeAttribute("data-empty"); else c.setAttribute("data-empty", ""); } }
  function parts(c) {   // a Tonight card cell: value text and its unit span
    var v = c && !c.hidden && !c.hasAttribute("data-empty") && c.querySelector(".cond-value");
    if (!v) return null;
    var u = v.querySelector(".cond-unit"), n = v.firstChild;
    var t = n && n.nodeType === 3 ? n.nodeValue.trim() : "";
    var s = c.querySelector(".cond-sub");
    return t ? { v: t, u: u ? u.textContent.trim() : "", sub: s ? s.textContent.trim() : "" } : null;
  }

  // "12 min ago", "5 hours ago", "3 days ago"
  function ago(ms) {
    var m = Math.max(0, Math.round((Date.now() - ms) / 6e4));
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 48) return h + (h === 1 ? " hour ago" : " hours ago");
    var d = Math.round(h / 24);
    return d + " days ago";
  }
  function agoShort(ms) {   // for the one line subs: "40m ago", "3h ago", "2d ago"
    var m = Math.max(0, Math.round((Date.now() - ms) / 6e4));
    return m < 60 ? Math.max(1, m) + "m ago" : m < 2880 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago";
  }
  // "Nov. 2, 5 PM ET", the same style tools/glance_bake.py writes with JavaScript off
  var MON = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  function whenEt(d) {
    try {
      var p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      return MON[+p.month - 1] + " " + p.day + ", " + p.hour + (p.minute === "00" ? "" : ":" + p.minute) + " " + String(p.dayPeriod || "").toUpperCase() + " ET";
    } catch (e) { return ""; }
  }

  var lastM = null;   // the last reading shown, so a failed refresh never blanks the strip
  function readAt() {
    var t = checked && checked.querySelector("time");
    var v = t && new Date(t.getAttribute("datetime")).valueOf();
    return v && isFinite(v) ? v : null;
  }
  function stamp() {
    if (!stampEl || NOGAUGE || !line) return;   // no gauge: the baked note stays as it is
    var at = readAt();
    if (!lastM || !at) return;                  // no reading with a time: keep the baked line
    var src = line.getAttribute("data-source") || "snapshot";
    var failed = line.hasAttribute("data-refresh-failed"), off = line.hasAttribute("data-offline");
    var what = HASTEMP && lastM[2] !== undefined ? "Level and temp" : "Level";   // a line with no temp: the stamp speaks for the level only
    var text;
    if (src === "live" && !failed && !off) text = what + " live from the " + SRC + " gauge, updated " + ago(at) + " ";
    else text = (off ? "Offline. " : failed ? "Live refresh failed. " : "") + what + " last updated " + ago(at) + " ";
    var tm = document.createElement("time");
    tm.setAttribute("datetime", new Date(at).toISOString());
    tm.textContent = "(" + whenEt(new Date(at)) + ")";
    stampEl.textContent = text;
    stampEl.appendChild(tm);
    stampEl.appendChild(document.createTextNode("."));
  }

  function pool() {
    if (NOGAUGE) {
      state(poolV, P.stale ? "No reading" : "No gauge"); set(poolS, P.stale ? "Gauge not reporting" : "No public gauge"); cell(poolV, false);
      state(tempV, "No gauge"); set(tempS, "No public gauge"); cell(tempV, false);
      return;
    }
    var m = line ? RE.exec((line.getAttribute("data-nb-out") === line.textContent && line.getAttribute("data-en") || line.textContent || "")) : null;
    if (m) lastM = m;
    m = m || lastM;
    if (m) { set(poolV, m[1], "ft"); set(poolS, "~" + m[3] + " ft " + m[4] + " full"); cell(poolV, true); }
    else { state(poolV, "Check gauge"); set(poolS, SRC + " gauge"); cell(poolV, false); }
    if (OUT) {
      if (m && m[2] !== undefined) { set(tempV, String(Math.round(parseFloat(m[2]))), "°F"); set(tempS, "USACE outflow"); cell(tempV, true); }
      else if (m) { state(tempV, "No reading"); set(tempS, "Not in the last check"); cell(tempV, false); }
      else { state(tempV, "Check gauge"); set(tempS, "USACE outflow"); cell(tempV, false); }
    }
    else if (PROF) { state(tempV, "Profile only"); set(tempS, "Corps, " + PROF.short); cell(tempV, false); }
    else if (!HASTEMP) { state(tempV, "No gauge"); set(tempS, "No public gauge"); cell(tempV, false); }
    else if (m && m[2] !== undefined) { set(tempV, String(Math.round(parseFloat(m[2]))), "°F"); set(tempS, SRC + " gauge"); cell(tempV, true); }
    else if (m) { state(tempV, "No reading"); set(tempS, "Not in the last check"); cell(tempV, false); }
    else { state(tempV, "Check gauge"); set(tempS, SRC + " gauge"); cell(tempV, false); }
    stamp();
  }
  function sun() {
    var p = parts(sunC);
    if (p) { set(sunV, p.v, p.u); set(sunS, p.sub || "On this phone"); cell(sunV, true); }
    else { state(sunV, "No time"); set(sunS, "On this phone"); cell(sunV, false); }
  }
  function wind() {
    var p = parts(windC), saved = cond && cond.hasAttribute("data-saved");
    var savedAt = cond && +cond.getAttribute("data-saved-at");
    var savedTxt = "Saved NWS" + (savedAt ? ", " + agoShort(savedAt) : "");
    // a weather refresh that failed (or the phone went offline) keeps the last forecast: say how old it is
    var failed = cond && (cond.hasAttribute("data-refresh-failed") || cond.hasAttribute("data-offline"));
    var checkedAt = cond && +cond.getAttribute("data-checked-at");
    var oldTxt = checkedAt ? "NWS, " + agoShort(checkedAt) : "NWS forecast";   // pg.nws_ago
    var tw = cond && /^(\d+)\|(\d+)\|([A-Z]*)$/.exec(cond.getAttribute("data-wind-tonight") || "");
    if (tw && p) {   // tonight's NWS hourly range, sunset (or now) to 2 AM, same numbers as "Tonight, in short"
      var lo = +tw[1], hi = +tw[2];
      if (hi === 0) set(windV, "Calm"); else set(windV, lo === hi ? String(hi) : lo + "\u2013" + hi, "mph" + (tw[3] ? " " + tw[3] : ""));
      set(windS, saved ? savedTxt : failed ? oldTxt : "NWS, until 2 AM");
      cell(windV, true);
    } else if (p) {
      var g = /gusts (\d+)/.exec(p.sub);
      set(windV, p.v, p.u);
      set(windS, saved || /saved/i.test(p.sub) ? savedTxt : failed ? oldTxt : "NWS" + (g ? ", gusts " + g[1] : " forecast"));
      cell(windV, true);
    } else {
      state(windV, "Check NWS");
      set(windS, cond && cond.getAttribute("data-state") === "error" ? "NWS not reachable" : "At weather.gov");
      cell(windV, false);
    }
  }
  function rate() {
    var r = bite && bite.querySelector(".cond-bite-rate");
    if (bite && !bite.hidden && r && r.textContent.trim()) { set(biteV, r.textContent.trim()); cell(biteV, true); }
    else { state(biteV, "Needs forecast"); cell(biteV, false); }
  }
  function all() { pool(); sun(); wind(); rate(); }

  all();
  setInterval(function () { if (!document.hidden) { stamp(); wind(); } }, 60 * 1000);   // keep "X min ago" true
  if (!window.MutationObserver) return;
  if (line) new MutationObserver(pool).observe(line, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["data-source", "data-refresh-failed", "data-offline"] });
  if (checked) new MutationObserver(stamp).observe(checked, { childList: true, characterData: true, subtree: true, attributes: true });
  if (cond) new MutationObserver(function () { sun(); wind(); rate(); }).observe(cond, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden", "data-empty", "data-state", "data-saved", "data-saved-at", "data-wind-tonight", "data-refresh-failed", "data-offline", "data-checked-at"] });
})();
