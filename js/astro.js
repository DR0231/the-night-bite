/**
 * The Night Bite: sunset and moonrise for Hoover Reservoir, computed in the browser.
 * Compact port of the SunCalc formulas (c) Vladimir Agafonkin, BSD 2-Clause
 * (https://github.com/mourner/suncalc). No network, no CDN.
 * Exposes window.NightBiteAstro = { sunset(date, lat, lng), lastLight(date, lat, lng), moonrise(date, lat, lng),
 *   moonset(date, lat, lng), moonTimes(date, lat, lng), etMidnight(date), moonIllumination(date), moonTonight(now) }.
 * lastLight is the end of civil twilight (Sun 6 degrees below the horizon), the same "end civil twilight" USNO lists.
 * Moon phase uses extra lunar longitude terms (Meeus, Astronomical Algorithms ch. 47) and refers the Sun to the
 * equinox of date, which puts phase instants within about 15 minutes of USNO for 2026 and 2027.
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

  /* evening instant when the Sun's centre reaches altitude h (degrees) on the solar day nearest `date` */
  function sunDown(date, lat, lng, h) {
    var lw = rad * -lng, phi = rad * lat, d = toDays(date), n = julianCycle(d, lw);
    var ds = approxTransit(0, lw, n), M = solarMeanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L, 0);
    var w = hourAngle(h * rad, phi, dec);
    if (isNaN(w)) return null;
    return fromJulian(solarTransitJ(approxTransit(w, lw, n), M, L));
  }
  function sunset(date, lat, lng) { return sunDown(date, lat, lng, -0.833); }      // upper limb on the horizon, with refraction
  function lastLight(date, lat, lng) { return sunDown(date, lat, lng, -6); }       // end of civil twilight

  /* Moon's geocentric altitude minus the standard rise/set altitude h0 = 0.7275 * parallax - 0.5667 degrees
     (Meeus ch. 15: refraction and semi-diameter included), so rise and set are where this crosses zero.
     Position from the Meeus main terms in moonEcliptic below, which keeps moonrise and moonset within a few minutes of USNO. */
  function moonAltitude(date, lat, lng) {
    var lw = rad * -lng, phi = rad * lat, d = toDays(date), m = moonEcliptic(d);
    var ra = rightAscension(m.l, m.b), dec = declination(m.l, m.b);
    var h = altitude(siderealTime(d, lw) - ra, phi, dec);
    var par = asin(6378.14 / m.dist);
    return h - (0.7275 * par - 0.5667 * rad);
  }

  /* Moonrise and moonset during the 24 h that start at `start` (an instant). Either can be null (no rise or no set that day). */
  function moonTimes(start, lat, lng) {
    var t = start.valueOf();
    function alt(hrs) { return moonAltitude(new Date(t + hrs * 36e5), lat, lng); }
    var h0 = alt(0), rise = null, set = null;
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
      if (roots === 1) { if (h0 < 0) { if (rise === null) rise = i + x1; } else if (set === null) set = i + x1; }
      else if (roots === 2) {
        if (rise === null) rise = i + (ye < 0 ? x2 : x1);
        if (set === null) set = i + (ye < 0 ? x1 : x2);
      }
      if (rise !== null && set !== null) break;
      h0 = h2;
    }
    return { rise: rise === null ? null : new Date(t + rise * 36e5), set: set === null ? null : new Date(t + set * 36e5) };
  }
  function moonrise(start, lat, lng) { return moonTimes(start, lat, lng).rise; }
  function moonset(start, lat, lng) { return moonTimes(start, lat, lng).set; }

  /* ---- moon phase ---- */
  // Sun's geocentric ecliptic longitude, referred to the equinox of date (adds precession and aberration)
  function sunLongitudeOfDate(d) { return eclipticLongitude(solarMeanAnomaly(d)) + rad * (3.8246e-5 * d - 0.0057); }
  function moonEcliptic(d) {
    var L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.22935 * d);
    var D = rad * (297.850 + 12.190749 * d), Ms = solarMeanAnomaly(d);
    var l = L + rad * (6.288774 * sin(M) + 1.274027 * sin(2 * D - M) + 0.658314 * sin(2 * D) + 0.213618 * sin(2 * M) -
      0.185116 * sin(Ms) - 0.114332 * sin(2 * F) + 0.058793 * sin(2 * D - 2 * M) + 0.057066 * sin(2 * D - Ms - M) +
      0.053322 * sin(2 * D + M) + 0.045758 * sin(2 * D - Ms) - 0.040923 * sin(Ms - M) - 0.034720 * sin(D) - 0.030383 * sin(Ms + M));
    var b = rad * (5.128122 * sin(F) + 0.280602 * sin(M + F) + 0.277693 * sin(M - F) + 0.173237 * sin(2 * D - F) +
      0.055413 * sin(2 * D - M + F) + 0.046271 * sin(2 * D - M - F) + 0.032573 * sin(2 * D + F) + 0.017198 * sin(2 * M + F));
    var dist = 385000.56 - 20905.355 * cos(M) - 3699.111 * cos(2 * D - M) - 2955.968 * cos(2 * D) - 569.925 * cos(2 * M) +
      48.888 * cos(Ms) - 3.149 * cos(2 * F) + 246.158 * cos(2 * D - 2 * M) - 152.138 * cos(2 * D - Ms - M) - 170.733 * cos(2 * D + M);
    return { l: l, b: b, dist: dist };
  }
  /* fraction: lit part of the disc, 0 to 1. phase: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  function moonIllumination(date) {
    var d = toDays(date), ls = sunLongitudeOfDate(d), m = moonEcliptic(d);
    var el = (m.l - ls) % (2 * PI);
    if (el < 0) el += 2 * PI;
    var psi = acos(cos(m.b) * cos(m.l - ls)), sd = 149598000;
    var inc = atan(sd * sin(psi), m.dist - sd * cos(psi));
    return { fraction: (1 + cos(inc)) / 2, phase: el / (2 * PI) };
  }
  // instant near `t` (ms) where the phase reaches `target` (bisection over +/- 4 days), or null
  function phaseInstant(t, target) {
    function f(x) { var v = moonIllumination(new Date(x)).phase - target; return v > 0.5 ? v - 1 : v < -0.5 ? v + 1 : v; }
    var a = t - 4 * dayMs, b = t + 4 * dayMs;
    if (f(a) > 0 || f(b) < 0) return null;
    for (var i = 0; i < 40; i++) { var mid = (a + b) / 2; if (f(mid) <= 0) a = mid; else b = mid; }
    return (a + b) / 2;
  }
  var PRINCIPAL = [[0, "New"], [0.25, "First quarter"], [0.5, "Full"], [0.75, "Last quarter"]];
  /* Tonight's moon for the ET calendar day of `now`.
     A principal phase (New, First quarter, Full, Last quarter) is named on the ET date that holds its exact instant,
     as moon phase calendars (USNO, timeanddate) do; any other date gets the intermediate name.
     Illumination is for the midnight ET that ends this evening. */
  function moonTonight(now) {
    now = now || new Date();
    var from = etMidnight(now).valueOf(), to = etMidnight(new Date(from + 36 * 36e5)).valueOf(), mid = to;  // DST safe
    var ill = moonIllumination(new Date(mid)), name = null, index;
    for (var i = 0; i < PRINCIPAL.length && !name; i++) {
      var dp = ill.phase - PRINCIPAL[i][0];
      if (dp > 0.5) dp -= 1;
      if (dp < -0.5) dp += 1;
      if (Math.abs(dp) > 0.06) continue;
      var at = phaseInstant(mid, PRINCIPAL[i][0]);
      if (at !== null && at >= from && at < to) { name = PRINCIPAL[i][1]; index = i * 2; }
    }
    if (!name) {
      var p = ill.phase;
      index = p < 0.25 ? 1 : p < 0.5 ? 3 : p < 0.75 ? 5 : 7;
      name = ["", "Waxing crescent", "", "Waxing gibbous", "", "Waning gibbous", "", "Waning crescent"][index];
    }
    return { name: name, index: index, fraction: ill.fraction, phase: ill.phase, at: new Date(mid) };
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

  window.NightBiteAstro = { sunset: sunset, lastLight: lastLight, moonrise: moonrise, moonset: moonset, moonTimes: moonTimes, etMidnight: etMidnight,
    moonIllumination: moonIllumination, moonTonight: moonTonight };
})();
