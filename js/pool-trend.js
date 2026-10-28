/**
 * The Night Bite: 7 day pool level trend for the home pool card.
 * Same USGS gauge as js/usgs.js: 03228400 (Hoover Reservoir at Central College), parameter 62614
 * (lake elevation, ft NGVD29), last 7 days, via js/lakes.js (new USGS Water Data API first, legacy IV as fallback).
 * Provisional data. Hidden if USGS can't be reached.
 */
(function () {
  var box = document.getElementById("pool-trend");
  if (box && !window.fetch) box.removeAttribute("data-pending");
  if (!box || !window.fetch) return;
  var LK = window.NightBiteLake, LP = LK && LK.cfg && LK.cfg.pool;   // js/lakes.js; Hoover if missing
  var CWMS = !!(LP && LP.src === "cwms");
  var LS = window.NightBiteLakes;
  var NS = "http://www.w3.org/2000/svg";
  var W = 280, H = 56, PAD = 4;

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function day(iso) {
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(new Date(iso));
  }

  var SAVE_KEY = LK ? LK.key("nb-trend-last") : "nb-trend-last";
  var OFF = window.NightBiteOffline;

  function points() {
    if (CWMS) return LK.cwms(7 * 24);   // Corps lake level, every 15 minutes
    if (!LS || !LS.usgsSeries) return Promise.reject(new Error("js/lakes.js missing"));
    return LS.usgsSeries((LP && LP.site) || "03228400", (LP && LP.param) || "62614", 7);   // USGS, new API first
  }

  function load() {
  return points()
    .then(function (pts) {
      if (pts.length < 12) throw new Error("too few");
      if (OFF) OFF.save(SAVE_KEY, { pts: pts.filter(function (p, i) { return i % 4 === 0 || i === pts.length - 1; }) });   // hourly is plenty for the chart
      draw(pts);
      box.removeAttribute("data-offline");
    })
    .catch(function () {
      // offline: redraw the last saved week; a failed refresh keeps the last chart; otherwise stay hidden
      var saved = !box.hasAttribute("data-drawn") && OFF && OFF.isOffline() && OFF.load(SAVE_KEY, 14 * 864e5);
      if (saved && saved.pts && saved.pts.length >= 12) { draw(saved.pts); box.setAttribute("data-offline", "1"); return; }
      if (!box.hasAttribute("data-drawn")) box.hidden = true;
      box.removeAttribute("data-pending");   // stop holding its space (css/styles.css)
    });
  }

  function draw(pts) {
      var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
      var lo = Infinity, hi = -Infinity;
      pts.forEach(function (p) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); });
      var span = Math.max(hi - lo, 0.2);             // keep tiny wobbles from looking like cliffs
      var mid = (hi + lo) / 2;
      lo = mid - span / 2; hi = mid + span / 2;
      function x(t) { return PAD + (t - t0) / (t1 - t0) * (W - 2 * PAD); }
      function y(v) { return PAD + (hi - v) / (hi - lo) * (H - 2 * PAD); }

      var svg = box.querySelector("svg");
      while (svg.firstChild) svg.removeChild(svg.firstChild);   // auto refresh redraws
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      // midnight ET ticks
      var A = window.NightBiteAstro;
      if (A) {
        var m = A.etMidnight(new Date(t0)).valueOf() + 864e5;
        for (; m < t1; m += 864e5) {
          var mm = A.etMidnight(new Date(m + 3 * 36e5)).valueOf();   // DST safe
          svg.appendChild(el("line", { x1: x(mm), x2: x(mm), y1: 0, y2: H, class: "pool-trend-tick" }));
        }
      }
      var d = "";
      pts.forEach(function (p, i) { d += (i ? "L" : "M") + x(p.t).toFixed(1) + " " + y(p.v).toFixed(1); });
      svg.appendChild(el("path", { d: d, class: "pool-trend-line" }));
      var last = pts[pts.length - 1];
      svg.appendChild(el("rect", { x: (x(last.t) - 3).toFixed(1), y: (y(last.v) - 3).toFixed(1), width: 6, height: 6, class: "pool-trend-now" }));

      var change = last.v - pts[0].v;
      var abs = Math.abs(change).toFixed(2);
      var word = Math.abs(change) < 0.05 ? "Steady" : change > 0 ? "Rising" : "Falling";
      var deltaEl = document.getElementById("pool-trend-delta");
      deltaEl.textContent = (change > 0 ? "+" : change < 0 ? "-" : "") + abs;
      var u = document.createElement("span");
      u.className = "pool-trend-unit";
      u.textContent = "ft";
      deltaEl.appendChild(u);
      document.getElementById("pool-trend-word").textContent = word;
      box.querySelector(".pool-trend-from").textContent = day(pts[0].iso);
      svg.setAttribute("aria-label", "Pool level over the last 7 days: " + word.toLowerCase() + ", " +
        (change >= 0 ? "up " : "down ") + abs + " ft, from " + pts[0].v.toFixed(2) + " to " + last.v.toFixed(2) + " ft.");
      box.hidden = false;
      box.removeAttribute("data-pending");
      box.setAttribute("data-drawn", "1");
  }

  load();
  if (window.NightBiteRefresh) window.NightBiteRefresh.add("pool-trend", load);
})();
