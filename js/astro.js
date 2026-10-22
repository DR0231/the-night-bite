/**
 * The Night Bite: sunset and moonrise for Hoover Reservoir, computed in the browser.
 * Compact port of the SunCalc formulas (c) Vladimir Agafonkin, BSD 2-Clause
 * (https://github.com/mourner/suncalc). No network, no CDN.
 * Exposes window.NightBiteAstro = { sunset(date, lat, lng), moonrise(date, lat, lng), etMidnight(date) }.
 */
(function () {
  var PI = Math.PI, sin = Math.sin, cos = Math.cos, tan = Math.tan, asin = Math.asin, atan = Math.atan2, acos = Math.acos;
  var rad = PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;

  function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
  function fromJulian(j) { return new Date((j + 0.5 - J1970) * dayMs); }
  function toDays(date) { return toJulian(date) - J2000; }
  function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
  function declination(l, b) { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }
  function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }
  function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }
  function astroRefraction(h) { if (h < 0) h = 0; return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179)); }
  function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
  function eclipticLongitude(M) {
    var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M));
    return M + C + rad * 102.9372 + PI;
  }
  function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }
  function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
  function solarTransitJ(ds, M, L) { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }
  function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }

  function sunset(date, lat, lng) {
    var lw = rad * -lng, phi = rad * lat, d = toDays(date), n = julianCycle(d, lw);
    var ds = approxTransit(0, lw, n), M = solarMeanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L, 0);
    var w = hourAngle(-0.833 * rad, phi, dec);
    if (isNaN(w)) return null;
    return fromJulian(solarTransitJ(approxTransit(w, lw, n), M, L));
  }

  function moonAltitude(date, lat, lng) {
    var lw = rad * -lng, phi = rad * lat, d = toDays(date);
    var L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.22935 * d);
    var l = L + rad * 6.289 * sin(M), b = rad * 5.128 * sin(F);
    var ra = rightAscension(l, b), dec = declination(l, b);
    var h = altitude(siderealTime(d, lw) - ra, phi, dec);
    return h + astroRefraction(h);
  }

  /* Moonrise during the 24 h that start at `start` (an instant), or null if the moon doesn't rise. */
  function moonrise(start, lat, lng) {
    var hc = 0.133 * rad, t = start.valueOf();
    function alt(hrs) { return moonAltitude(new Date(t + hrs * 36e5), lat, lng) - hc; }
    var h0 = alt(0), rise = null;
    for (var i = 1; i <= 24; i += 2) {
      var h1 = alt(i), h2 = alt(i + 1);
      var a = (h0 + h2) / 2 - h1, b = (h2 - h0) / 2, xe = -b / (2 * a), ye = (a * xe + b) * xe + h1;
      var disc = b * b - 4 * a * h1, roots = 0, x1 = 0, x2 = 0;
      if (disc >= 0) {
        var dx = Math.sqrt(disc) / (Math.abs(a) * 2);
        x1 = xe - dx; x2 = xe + dx;
        if (Math.abs(x1) <= 1) roots++;
        if (Math.abs(x2) <= 1) roots++;
        if (x1 < -1) x1 = x2;
      }
      if (roots === 1) { if (h0 < 0) rise = i + x1; }
      else if (roots === 2) { rise = i + (ye < 0 ? x2 : x1); }
      if (rise !== null) break;
      h0 = h2;
    }
    return rise === null ? null : new Date(t + rise * 36e5);
  }

  /* The instant of 00:00 America/New_York on the ET calendar day of `date`. */
  function etMidnight(date) {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    var offset = asUtc - Math.floor(date.valueOf() / 6e4) * 6e4;   // ET minus UTC, in ms
    return new Date(Date.UTC(+p.year, +p.month - 1, +p.day) - offset);
  }

  window.NightBiteAstro = { sunset: sunset, moonrise: moonrise, etMidnight: etMidnight };
})();
