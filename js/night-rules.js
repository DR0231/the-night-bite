/**
 * The Night Bite: night-rules chip under the hero on each lake home (S5).
 * The chip text, its official source link and the data-* hours are baked by tools/build-lake-pages.py from
 * data/quick-facts.json "hours" (no source, no chip). This only adds the live countdown, in Eastern time:
 *   data-open / data-close  "HH:MM" (24 h, ET) or "sunrise" / "sunset"; empty when the source gives no clock time
 *   data-after="fishing"    the source says fishing is allowed after hours
 *   data-reopen             "6 a.m." (shown after hours when the source gives an opening time)
 * Sunset comes from js/astro.js for this lake's lat/lng. No network.
 */
(function () {
  var chip = document.getElementById("night-rules");
  if (!chip) return;
  var left = chip.querySelector('[data-nr="left"]');
  var open = chip.getAttribute("data-open") || "", close = chip.getAttribute("data-close") || "";
  if (!left || !close) return;
  var fishing = chip.getAttribute("data-after") === "fishing";
  var reopen = chip.getAttribute("data-reopen") || "";
  var LC = (window.NightBiteLake && window.NightBiteLake.cfg) || {};

  // minutes since ET midnight for a Date
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23" });
  function etMin(d) {
    var h = 0, m = 0;
    fmt.formatToParts(d).forEach(function (p) { if (p.type === "hour") h = +p.value; if (p.type === "minute") m = +p.value; });
    return (h % 24) * 60 + m;
  }
  function hm(s) { var a = s.split(":"); return +a[0] * 60 + +a[1]; }
  function span(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return h ? h + "h " + m + "m" : m + "m";
  }

  function closeMin(now) {
    if (close === "sunset") {
      var A = window.NightBiteAstro;
      if (!A || LC.lat == null) return null;
      var s = A.sunset(now, LC.lat, LC.lng);
      return s && !isNaN(s.valueOf()) ? etMin(s) : null;
    }
    return /^\d\d:\d\d$/.test(close) ? hm(close) : null;
  }

  function tick() {
    var now = new Date(), n = etMin(now), c = closeMin(now), state = "";
    if (c == null) { left.hidden = true; return; }
    var o = /^\d\d:\d\d$/.test(open) ? hm(open) : null;
    var isOpen;
    if (o != null) isOpen = o < c ? (n >= o && n < c) : (n >= o || n < c);
    else isOpen = n >= 12 * 60 && n < c ? true : (n >= c ? false : null);   // sunrise not computed: no state before noon
    if (isOpen === true) state = span(c - n) + " left";
    else if (isOpen === false) state = !fishing && reopen ? "Closed until " + reopen : "After hours now";
    left.textContent = state;
    left.hidden = !state;
    chip.classList.toggle("is-after", isOpen === false);
  }

  tick();
  setInterval(tick, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
})();
