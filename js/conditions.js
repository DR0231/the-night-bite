/**
 * The Night Bite: "Tonight at Hoover" conditions card (home page).
 * Data: National Weather Service API (api.weather.gov, free, no key), fetched by the browser.
 *   Hourly forecast: gridpoint ILN 89,88 (from /points/40.11,-82.88; Hoover Reservoir at Central College).
 *   Barometer and its trend: station KCMH (John Glenn Columbus Intl), the first station NWS lists for that gridpoint.
 * Wind gusts: the hourly period's windGust when NWS sends one, otherwise the latest KCMH observation gust.
 * Sunset, last light, moonrise, moonset and tonight's moon phase come from js/astro.js (computed locally, so they work offline).
 * Also on the card: tonight's hourly strip (sunset to 2 AM), a storm heads up (hourly shortForecast plus the raw gridpoint
 * weather and probabilityOfThunder), feels like and dew point (from the hourly period), which bank the wind pushes into,
 * and a rule of thumb "Tonight's bite" line (rules in biteRating below and in DATA-SOURCES.md).
 * If NWS fails: "Weather unavailable, check weather.gov" with a link. Never invents values.
 */
(function () {
  var card = document.getElementById("conditions");
  if (!card || !window.fetch) return;
  var LAT = 40.11, LNG = -82.88;
  var HOURLY = "https://api.weather.gov/gridpoints/ILN/89,88/forecast/hourly";
  var POINT = "https://api.weather.gov/points/40.11,-82.88";
  var GRID = "https://api.weather.gov/gridpoints/ILN/89,88";
  var STATION = "KCMH";
  var STATION_NAME = "Columbus airport (KCMH)";
  var WX_PAGE = "https://forecast.weather.gov/MapClick.php?lat=40.11&lon=-82.88";
  var CACHE_KEY = "nb-cond-v3", CACHE_MS = 10 * 60 * 1000;   // shorter than the 15 minute refresh, and refreshes skip it

  var grid = card.querySelector(".cond-grid");
  var statusEl = card.querySelector(".cond-status");
  var summaryEl = card.querySelector(".cond-summary");
  var stormEl = card.querySelector(".cond-storm");
  var biteEl = card.querySelector(".cond-bite");
  var stripEl = card.querySelector(".cond-hours");
  var extraEl = card.querySelector(".cond-extra");
  // what the derived lines (strip, storm, bite, extras) are built from; each loader fills its part, then render() redraws
  var st = { periods: null, p3: null, thunder: null, waterF: null, stormAlert: false };

  function timeEt(d, withDay) {
    if (!d) return null;
    var o = { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" };
    var t = new Intl.DateTimeFormat("en-US", o).format(d);       // "6:42 PM"
    var m = /^(\d{1,2}:\d{2})\s*([AP]M)$/.exec(t);
    var day = withDay ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(d) : "";
    return m ? { value: m[1], unit: m[2] + (day ? " " + day : "") } : { value: t, unit: day };
  }

  function getJson(url, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 9000) : null;
    return fetch(url, { headers: { Accept: "application/geo+json" }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error("nws " + r.status);
        return r.json();
      });
  }

  function setCell(key, value, unit, sub) {
    var cell = grid.querySelector('[data-cond="' + key + '"]');
    if (!cell) return;
    var v = cell.querySelector(".cond-value");
    var s = cell.querySelector(".cond-sub");
    v.textContent = value;
    if (unit) {
      var u = document.createElement("span");
      u.className = "cond-unit";
      u.textContent = unit;
      v.appendChild(u);
    }
    if (s) s.textContent = sub || "";
    cell.removeAttribute("data-empty");
    cell.removeAttribute("data-noreading");
  }

  /* ---- sun and moon: always available, no network ---- */
  function sunMoon() {
    var A = window.NightBiteAstro;
    if (!A) return;
    var now = new Date();
    var mid = A.etMidnight(now);
    var set = A.sunset(new Date(mid.valueOf() + 12 * 36e5), LAT, LNG);
    var setTomorrow = false;
    if (set && set < now) { set = A.sunset(new Date(mid.valueOf() + 36 * 36e5), LAT, LNG); setTomorrow = true; }
    var rise = A.moonrise(mid, LAT, LNG);
    if (!rise || rise < now) rise = A.moonrise(new Date(mid.valueOf() + 24 * 36e5), LAT, LNG);
    if (!rise || rise < now) rise = A.moonrise(new Date(mid.valueOf() + 48 * 36e5), LAT, LNG);
    var s = timeEt(set, setTomorrow);
    var dusk = A.lastLight && A.lastLight(new Date(mid.valueOf() + (setTomorrow ? 36 : 12) * 36e5), LAT, LNG);
    var dk = timeEt(dusk);
    if (s) setCell("sunset", s.value, s.unit, dk ? "Last light " + dk.value + " " + dk.unit : (setTomorrow ? "Next sunset" : "Today"));
    var sameDay = rise && A.etMidnight(rise).valueOf() === mid.valueOf();
    var r = timeEt(rise, !sameDay);
    if (r) setCell("moonrise", r.value, r.unit, sameDay ? "Today" : "Next moonrise");
    // next moonset from now (tucked into the extras row)
    st.moonset = null;
    if (A.moonset) {
      for (var k = 0; k < 3 && !st.moonset; k++) {
        var ms = A.moonset(new Date(mid.valueOf() + k * 24 * 36e5), LAT, LNG);
        if (ms && ms > now) st.moonset = ms;
      }
    }
    // tonight's phase name, illumination and the matching 13 px sprite (0 New ... 7 Waning crescent)
    if (A.moonTonight) {
      var mt = A.moonTonight(now);
      st.moon = mt;
      setCell("moon", mt.name, "", Math.round(mt.fraction * 100) + "% lit");
      var mc = grid.querySelector('[data-cond="moon"]');
      if (mc) {
        mc.setAttribute("data-phase-index", String(mt.index));
        var sp = mc.querySelector(".moon-sprite");
        if (sp) sp.style.setProperty("--moon-i", String(mt.index));
      }
    }
  }

  /* ---- hourly forecast ---- */
  function applyHourly(json, subNow) {
    subNow = subNow || "Now";
    var periods = json && json.properties && json.properties.periods;
    if (!periods || !periods.length) throw new Error("no periods");
    var now = Date.now(), p = periods[0];
    for (var i = 0; i < periods.length; i++) {
      if (new Date(periods[i].endTime).valueOf() > now) { p = periods[i]; break; }
    }
    var start = periods.indexOf(p);
    st.periods = periods;
    st.now = p;
    windNow = { p: p, sub: subNow };
    applyWind(null);
    var f = tempF(p);
    if (f !== null) {
      var fl = feelsLike(f, windHi(p), p.relativeHumidity && p.relativeHumidity.value);
      setCell("air", String(Math.round(f)), "°F", subNow === "Now" ? "Feels like " + Math.round(fl) + "°" : subNow + ", feels " + Math.round(fl) + "°");
    }
    var maxPop = null;
    for (var j = start; j < Math.min(periods.length, start + 12); j++) {
      var pop = periods[j].probabilityOfPrecipitation && periods[j].probabilityOfPrecipitation.value;
      if (typeof pop === "number") maxPop = maxPop === null ? pop : Math.max(maxPop, pop);
    }
    if (maxPop !== null) setCell("rain", String(Math.round(maxPop)), "%", "Next 12 hours");
    if (summaryEl && p.shortForecast) summaryEl.textContent = p.shortForecast + ".";
    return true;
  }

  /* ---- wind: NWS hourly speed and direction, gusts from the hourly period or the latest KCMH observation ----
     The arrow points where the wind blows TO (a southwest wind points northeast): 8 drawn sprites, plus calm and
     variable frames, so it stays pixel crisp. Sprite sheet order: N NE E SE S SW W NW, calm, variable. */
  var windNow = null, windObs = null;
  var DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  var WORDS = { N: "north", E: "east", S: "south", W: "west" };
  function dirWords(d) {   // "SSW" -> "south southwest"
    if (d.length === 3) return dirWords(d.charAt(0)) + " " + dirWords(d.slice(1));
    return d.split("").map(function (c) { return WORDS[c]; }).join("");
  }
  function mphFrom(v) {    // "15 mph", "10 to 15 mph" (top of the range), or an NWS quantity in km/h or m/s
    if (v === null || v === undefined) return null;
    if (typeof v === "string") { var m = /(\d+)(?:\s*to\s*(\d+))?\s*mph/i.exec(v); return m ? +(m[2] || m[1]) : null; }
    if (typeof v === "object" && typeof v.value === "number") {
      if (/km_h/.test(v.unitCode || "")) return v.value * 0.621371;
      if (/m_s/.test(v.unitCode || "")) return v.value * 2.236936;
    }
    return null;
  }
  function obsGust(json) {  // newest KCMH gust within 90 minutes, in mph
    var feats = (json && json.features) || [], best = null;
    feats.forEach(function (f) {
      var g = f && f.properties && mphFrom(f.properties.windGust), t = f && f.properties && new Date(f.properties.timestamp).valueOf();
      if (g !== null && g > 0 && (!best || t > best.t)) best = { t: t, mph: g };
    });
    return best && Date.now() - best.t <= 90 * 6e4 ? best.mph : null;
  }
  function applyWind(obs) {
    if (obs !== null) windObs = obs;
    if (!windNow) return;
    var p = windNow.p, cell = grid.querySelector('[data-cond="wind"]');
    var m = /(\d+)(?:\s*to\s*(\d+))?\s*mph/i.exec(p.windSpeed || ""), calmWord = /calm/i.test(p.windSpeed || "");
    if (!m && !calmWord) return;
    var lo = m ? +m[1] : 0, hi = m ? +(m[2] || m[1]) : 0;
    var dir = String(p.windDirection || "").toUpperCase(), gust = mphFrom(p.windGust);
    if (gust === null && windObs) gust = obsGust(windObs);
    gust = gust !== null && Math.round(gust) > hi ? Math.round(gust) : null;   // only gusts above the sustained wind
    var idx, label, sub = windNow.sub;
    if (hi === 0) {
      setCell("wind", "Calm", "", sub);
      idx = 8; label = "Wind calm";
    } else {
      var k = DIRS.indexOf(dir), speed = lo === hi ? String(hi) : lo + " to " + hi;
      setCell("wind", speed, "mph " + (k < 0 ? "Var" : dir), gust ? sub + ", gusts " + gust : sub);
      if (k < 0) { idx = 9; label = "Wind variable, " + speed + " mph"; }
      else { idx = (Math.round(k / 2) + 4) % 8; label = "Wind from " + dirWords(dir) + ", " + speed + " mph"; }
      if (gust) label += ", gusts " + gust;
    }
    if (!cell) return;
    cell.setAttribute("data-wind-i", String(idx));
    var sp = cell.querySelector(".wind-sprite");
    if (sp) { sp.style.setProperty("--wind-i", String(idx)); sp.setAttribute("aria-label", label); }
  }

  /* ---- barometer at KCMH: current reading in inHg and the change over the last 3 hours ----
     Which NWS field: seaLevelPressure first. It is the METAR sea level pressure, the number forecasts quote, but KCMH
     only sends it on the hourly report (about :51 past). So it is used when an hourly value is within 90 minutes of
     the newest observation; otherwise the reading falls back to barometricPressure, which every 5 minute report has.
     The 3 hour change is worked out from the same field as the reading, so switching fields can't fake a trend.
     1 inHg = 3386.389 Pa. */
  var PA_PER_INHG = 3386.389, pressureAt = null;
  function pressureSeries(feats, field) {
    var pts = [];
    feats.forEach(function (f) {
      var pr = f && f.properties && f.properties[field];
      if (pr && typeof pr.value === "number" && isFinite(pr.value) && pr.value > 0) {
        pts.push({ t: new Date(f.properties.timestamp).valueOf(), pa: pr.value });
      }
    });
    return pts.sort(function (a, b) { return b.t - a.t; });
  }
  function noReading(sub) {
    setCell("pressure", "No reading", "", sub);
    var c = grid.querySelector('[data-cond="pressure"]');
    if (c) c.setAttribute("data-noreading", "");
    card.removeAttribute("data-pressure-trend");
    card.removeAttribute("data-pressure-field");
    pressureAt = null;
    st.p3 = null;
    asOf(null);
    return false;
  }
  /* "as of 8:51 AM" under the barometer when the KCMH reading is more than 60 minutes old */
  function asOf(t) {
    var el = grid.querySelector('[data-cond="pressure"] .cond-asof');
    if (!el) return;
    var old = t !== null && Date.now() - t > 60 * 6e4, w = old && timeEt(new Date(t), !sameEtDay(t));
    el.textContent = old ? "as of " + w.value + " " + w.unit : "";
    el.hidden = !old;
  }
  function sameEtDay(t) {
    var A = window.NightBiteAstro;
    return !A || A.etMidnight(new Date(t)).valueOf() === A.etMidnight(new Date()).valueOf();
  }
  /* returns true when a reading is on screen; `saved` skips the age check for the offline copy */
  function applyPressure(json, saved) {
    if (!json) return noReading("KCMH unavailable");
    var feats = json.features || [];
    var sl = pressureSeries(feats, "seaLevelPressure"), bp = pressureSeries(feats, "barometricPressure");
    var newest = Math.max(sl.length ? sl[0].t : 0, bp.length ? bp[0].t : 0);
    var field = sl.length && newest - sl[0].t <= 90 * 6e4 ? "seaLevelPressure" : "barometricPressure";
    var pts = field === "seaLevelPressure" ? sl : bp;
    if (!pts.length) return noReading("KCMH sent no pressure");
    var latest = pts[0];
    // NWS can post KCMH a few hours late; past 6 hours the number is no use for tonight
    if (!saved && Date.now() - latest.t > 6 * 36e5) return noReading("KCMH reading too old");
    pressureAt = new Date(latest.t);
    /* change over the last 3 hours: the reading closest to 3 h before the newest one, if it is 2 to 4 h older.
       Steady band +/- 0.02 inHg (about 0.7 hPa); 0.06 inHg or more in 3 h counts as fast (about 2 hPa, a front moving through). */
    var target = latest.t - 3 * 36e5, old = null;
    pts.forEach(function (q) { if (q !== latest && (!old || Math.abs(q.t - target) < Math.abs(old.t - target))) old = q; });
    var spanH = old ? (latest.t - old.t) / 36e5 : 0;
    var trend, sub;
    if (old && spanH >= 2 && spanH <= 4) {
      var dIn = (latest.pa - old.pa) / PA_PER_INHG, a = Math.abs(dIn), hrs = Math.round(spanH);
      trend = a <= 0.02 ? "Steady" : dIn > 0 ? "Rising" : "Falling";
      var dirWord = a < 0.005 ? "Flat" : dIn > 0 ? "Up" : "Down";
      sub = (dirWord === "Flat" ? "No change" : dirWord + " " + a.toFixed(2)) + " in " + hrs + "\u00a0hrs, " + trend.toLowerCase();
      st.p3 = { d: dIn, hrs: hrs, trend: trend.toLowerCase(), fast: a >= 0.06 };
    } else {
      trend = "unknown";
      sub = "Trend needs more readings";
      st.p3 = null;
    }
    setCell("pressure", (latest.pa / PA_PER_INHG).toFixed(2), "inHg", sub);
    card.setAttribute("data-pressure-trend", trend.toLowerCase());
    card.setAttribute("data-pressure-field", field);
    asOf(latest.t);
    return true;
  }


  /* ---- shared helpers for the derived lines ---- */
  function tempF(p) {
    if (!p || typeof p.temperature !== "number") return null;
    return p.temperatureUnit === "C" ? p.temperature * 9 / 5 + 32 : p.temperature;
  }
  function windHi(p) {   // sustained wind in mph (top of a "5 to 10 mph" range), 0 for calm, null if unknown
    if (!p) return null;
    if (/calm/i.test(p.windSpeed || "")) return 0;
    var m = /(\d+)(?:\s*to\s*(\d+))?\s*mph/i.exec(p.windSpeed || "");
    return m ? +(m[2] || m[1]) : null;
  }
  function cToF(c) { return c * 9 / 5 + 32; }
  /* Feels like, computed from the same hourly period as the Air value so the two always agree.
     Wind chill (NWS formula) at 50 F or below with wind over 3 mph; heat index (NWS Rothfusz regression) at 80 F and up;
     otherwise the air temperature itself. */
  function feelsLike(t, v, rh) {
    if (t <= 50 && v > 3) {
      var p = Math.pow(v, 0.16);
      return 35.74 + 0.6215 * t - 35.75 * p + 0.4275 * t * p;
    }
    if (t >= 80 && typeof rh === "number") {
      var hi = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
      if ((hi + t) / 2 < 80) return hi;
      hi = -42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh - 0.00683783 * t * t - 0.05481717 * rh * rh +
        0.00122874 * t * t * rh + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;
      if (rh < 13 && t <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
      else if (rh > 85 && t <= 87) hi += ((rh - 85) / 10) * ((87 - t) / 5);
      return hi;
    }
    return t;
  }
  function hourEt(d) { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric" }).format(d); }  // "9 PM"

  /* Tonight's window, ET: from sunset (or from now, once the sun is down) to 2 AM.
     Between midnight and 2 AM it is still "tonight"; after 2 AM it is the coming evening. */
  function tonight(nowMs) {
    var A = window.NightBiteAstro, now = new Date(nowMs);
    if (!A) return null;
    var mid = A.etMidnight(now).valueOf();
    var twoToday = mid + 2 * 36e5;
    if (nowMs < twoToday) return { from: nowMs, to: twoToday, started: true };
    var set = A.sunset(new Date(mid + 12 * 36e5), LAT, LNG);
    var to = A.etMidnight(new Date(mid + 36 * 36e5)).valueOf() + 2 * 36e5;
    var from = set ? set.valueOf() : mid + 19 * 36e5;
    return { from: Math.max(from, nowMs), to: to, started: nowMs >= from };
  }
  // hourly periods that overlap [from, to], including the one that starts at 2 AM
  function periodsIn(periods, from, to) {
    return (periods || []).filter(function (p) {
      var s = new Date(p.startTime).valueOf(), e = new Date(p.endTime).valueOf();
      return e > from && s <= to;
    });
  }

  /* ---- 1. hourly strip: hour, temp, wind, rain chance ---- */
  function renderStrip() {
    if (!stripEl) return;
    var win = tonight(Date.now());
    var list = win && periodsIn(st.periods, win.from, win.to);
    var ol = stripEl.querySelector("ol");
    if (!list || !list.length || !ol) { stripEl.hidden = true; return; }
    ol.textContent = "";
    var thunderAt = st.thunderHours || {};
    list.forEach(function (p, i) {
      var t = new Date(p.startTime), f = tempF(p), w = windHi(p), dir = String(p.windDirection || "").toUpperCase();
      var pop = p.probabilityOfPrecipitation && typeof p.probabilityOfPrecipitation.value === "number" ? Math.round(p.probabilityOfPrecipitation.value) : null;
      var li = document.createElement("li");
      li.className = "cond-hour";
      var nowHour = Date.now() >= t.valueOf() && Date.now() < new Date(p.endTime).valueOf();
      if (nowHour) li.setAttribute("data-now", "");
      var storm = /thunder/i.test(p.shortForecast || "") || thunderAt[t.valueOf()];
      if (storm) li.setAttribute("data-storm", "");
      var windTxt = w === null ? "--" : w === 0 ? "Calm" : (DIRS.indexOf(dir) < 0 ? "Var" : dir) + " " + w;
      var label = (nowHour ? "Now" : hourEt(t));
      li.innerHTML = '<span class="cond-hour-t"></span><span class="cond-hour-temp"></span><span class="cond-hour-wind"></span><span class="cond-hour-pop"></span>';
      li.children[0].textContent = label;
      li.children[1].textContent = f === null ? "--" : Math.round(f) + "°";
      li.children[2].textContent = windTxt;
      li.children[3].textContent = storm ? "Storm" : pop === null ? "" : pop + "%";
      li.setAttribute("aria-label", hourEt(t) + ", " + (f === null ? "" : Math.round(f) + " degrees, ") +
        (w === 0 ? "calm" : w === null ? "" : "wind " + (DIRS.indexOf(dir) < 0 ? "variable" : dirWords(dir)) + " " + w + " mph") +
        (pop === null ? "" : ", " + pop + " percent chance of rain") + (storm ? ", thunderstorms possible" : ""));
      ol.appendChild(li);
    });
    var head = stripEl.querySelector(".cond-hours-label");
    if (head) head.textContent = win.started ? "Tonight, hour by hour" : "Sunset to 2 AM";
    stripEl.hidden = false;
  }

  /* ---- 5. storms: any thunder from now through 2 AM ----
     Sources: an hourly period whose shortForecast mentions thunder, or a raw gridpoint interval whose weather is
     "thunderstorms" or whose probabilityOfThunder is 25% or more. */
  function isoSpan(validTime) {   // "2026-10-23T14:00:00+00:00/PT6H" -> [startMs, endMs]
    var parts = String(validTime || "").split("/"), s = new Date(parts[0]).valueOf();
    var m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(parts[1] || "");
    if (isNaN(s) || !m) return null;
    return [s, s + ((+m[1] || 0) * 24 + (+m[2] || 0)) * 36e5 + (+m[3] || 0) * 6e4];
  }
  function gridThunder(json) {   // slim list of [startMs, endMs] spans with thunder in the raw gridpoint forecast
    var pr = json && json.properties, out = [];
    if (!pr) return null;
    ((pr.weather && pr.weather.values) || []).forEach(function (v) {
      var hit = (v.value || []).some(function (w) { return w && /thunder/i.test(w.weather || ""); });
      var sp = hit && isoSpan(v.validTime);
      if (sp) out.push(sp);
    });
    ((pr.probabilityOfThunder && pr.probabilityOfThunder.values) || []).forEach(function (v) {
      var sp = typeof v.value === "number" && v.value >= 25 && isoSpan(v.validTime);
      if (sp) out.push(sp);
    });
    return out;
  }
  function renderStorm() {
    if (!stormEl) return;
    var now = Date.now(), win = tonight(now), first = null;
    st.thunderHours = {};
    if (win && st.periods) {
      periodsIn(st.periods, now, win.to).forEach(function (p) {
        var s = new Date(p.startTime).valueOf();
        if (/thunder/i.test(p.shortForecast || "")) { st.thunderHours[s] = 1; if (first === null || s < first) first = s; }
      });
      (st.thunder || []).forEach(function (sp) {
        if (sp[1] <= now || sp[0] > win.to) return;
        var s = Math.max(sp[0], now);
        if (first === null || s < first) first = s;
        periodsIn(st.periods, sp[0], sp[1] - 1).forEach(function (p) { st.thunderHours[new Date(p.startTime).valueOf()] = 1; });
      });
    }
    st.storm = first !== null;
    if (!st.storm) { stormEl.hidden = true; stormEl.textContent = ""; return; }
    var when = first <= now + 10 * 6e4 ? "Thunderstorms possible now." : "Thunderstorms possible after " + hourEt(new Date(Math.ceil(first / 36e5) * 36e5)) + ".";
    // the site wide NWS banner already names any storm Watch or Warning, so point at it instead of repeating it
    stormEl.textContent = when + (st.stormAlert ? " See the alert up top." : "") + " Get off the water at first thunder.";
    stormEl.hidden = false;
  }

  /* ---- 2. Tonight's bite: a rule of thumb score, not a forecast ----
     Pressure, last 3 h at KCMH: falling slowly (0.02 to 0.06 inHg) +2, steady (within 0.02) +1, rising slowly 0,
       falling fast (0.06 or more) 0, rising fast (0.06 or more) -1, unknown 0.
     Wind, tonight's average sustained NWS hourly speed: under 3 mph 0 (glassy), 3 to 12 mph +1 (a little chop),
       13 to 18 mph 0, over 18 mph -2 (rough for a 10 hp boat and hard on the bank).
     Moon: new or full moon (the principal phase falls tonight, or the disc is under 10% or over 90% lit) +1, otherwise 0.
     Water, USGS 03228400 temp when the gauge sends one: 55 to 80 F +1, 45 to 54 or 81 to 86 F 0, colder or warmer -1.
     Total 4 or more: Good. 2 or 3: Fair. 1 or less: Tough. Thunder in tonight's window always makes it Tough. */
  function biteRating() {
    var score = 0, why = [], known = 0;
    var p3 = st.p3;
    if (p3) {
      known++;
      if (p3.trend === "falling") { score += p3.fast ? 0 : 2; why.push(p3.fast ? "pressure dropping fast" : "pressure falling slowly"); }
      else if (p3.trend === "steady") { score += 1; why.push("steady pressure"); }
      else { score += p3.fast ? -1 : 0; why.push(p3.fast ? "pressure rising fast" : "pressure rising"); }
    }
    var win = tonight(Date.now()), list = win && periodsIn(st.periods, win.from, win.to);
    if (list && list.length) {
      var sum = 0, n = 0;
      list.forEach(function (p) { var w = windHi(p); if (w !== null) { sum += w; n++; } });
      if (n) {
        known++;
        var avg = Math.round(sum / n), dir = String(list[0].windDirection || "").toUpperCase();
        var d = DIRS.indexOf(dir) < 0 ? "" : dir + " ";
        if (avg < 3) why.push("calm water");
        else if (avg <= 12) { score += 1; why.push((avg <= 7 ? "light " : "moderate ") + d + "wind"); }
        else if (avg <= 18) why.push("breezy " + d + "wind");
        else { score -= 2; why.push("strong " + d + "wind"); }
      }
    }
    var mt = st.moon;
    if (mt) {
      var major = mt.name === "New" || mt.name === "Full" || mt.fraction < 0.1 || mt.fraction > 0.9;
      if (major) { score += 1; why.push(mt.fraction > 0.5 ? "full moon" : "new moon"); }
    }
    if (typeof st.waterF === "number") {
      var w = Math.round(st.waterF);   // counts toward the score but can't carry the line alone
      if (w >= 55 && w <= 80) score += 1;
      else if (w < 45 || w > 86) score -= 1;
      why.push(w + "°F water");
    }
    if (!known) return null;
    var rate = score >= 4 ? "Good" : score >= 2 ? "Fair" : "Tough";
    if (st.storm) { rate = "Tough"; why.unshift("storms possible"); }
    return { rate: rate, score: score, why: why.slice(0, 4) };
  }
  function renderBite() {
    if (!biteEl) return;
    var b = biteRating();
    if (!b) { biteEl.hidden = true; return; }
    biteEl.querySelector(".cond-bite-rate").textContent = b.rate;
    var why = b.why.join(", ");
    biteEl.querySelector(".cond-bite-why").textContent = why ? why.charAt(0).toUpperCase() + why.slice(1) + "." : "";
    biteEl.setAttribute("data-rate", b.rate.toLowerCase());
    biteEl.hidden = false;
  }

  /* ---- 6 and 7, plus moonset: the compact extras row ----
     Wind on the water: the wind piles bait (and fish) on the shore it blows toward, the opposite of where it comes from.
     Hoover runs north to south, so east and west winds name a bank and north and south winds name an end. */
  var PUSH = ["toward the south end", "into the southwest bank", "into the west bank", "into the northwest bank",
    "toward the north end", "into the northeast bank", "into the east bank", "into the southeast bank"];   // wind FROM N, NE, E ...
  function extra(key, label, value) {
    var row = extraEl && extraEl.querySelector('[data-x="' + key + '"]');
    if (!row) return;
    row.hidden = !value;
    if (value) { row.querySelector(".cond-x-label").textContent = label; row.querySelector(".cond-x-value").textContent = value; }
  }
  function renderExtras() {
    if (!extraEl) return;
    var p = st.now, push = null, dew = null;
    if (p) {
      var w = windHi(p), k = DIRS.indexOf(String(p.windDirection || "").toUpperCase());
      if (w !== null && w >= 3 && k >= 0) push = "Pushing " + PUSH[Math.round(k / 2) % 8];
      if (p.dewpoint && typeof p.dewpoint.value === "number") {
        dew = Math.round(/degF/.test(p.dewpoint.unitCode || "") ? p.dewpoint.value : cToF(p.dewpoint.value)) + "°F";
      }
    }
    extra("water", "On the water", push);
    extra("dew", "Dew point", dew);
    var ms = st.moonset && timeEt(st.moonset, window.NightBiteAstro && window.NightBiteAstro.etMidnight(st.moonset).valueOf() !== window.NightBiteAstro.etMidnight(new Date()).valueOf());
    extra("moonset", "Moonset", ms ? ms.value + " " + ms.unit : null);
    var any = Array.prototype.some.call(extraEl.querySelectorAll("[data-x]"), function (r) { return !r.hidden; });
    extraEl.hidden = !any;
  }

  // storm first: the strip and the bite both read what it found
  function render() {
    try { renderStorm(); } catch (e) { if (stormEl) stormEl.hidden = true; }
    try { renderStrip(); } catch (e) { if (stripEl) stripEl.hidden = true; }
    try { renderBite(); } catch (e) { if (biteEl) biteEl.hidden = true; }
    try { renderExtras(); } catch (e) { if (extraEl) extraEl.hidden = true; }
  }

  // water temp from js/usgs.js (pool card) and storm alerts from js/alerts.js arrive on their own schedule
  document.addEventListener("nb:usgs", function (e) {
    var f = e.detail && e.detail.tempF;
    st.waterF = typeof f === "number" && isFinite(f) ? f : null;
    render();
  });
  document.addEventListener("nb:alerts", function (e) {
    var list = (e.detail && e.detail.list) || [];
    st.stormAlert = list.some(function (a) { return /thunder|tornado/i.test(a.event || ""); });
    render();
  });
  if (typeof window.NightBiteWaterF === "number") st.waterF = window.NightBiteWaterF;
  if (window.NightBiteAlertsShown) st.stormAlert = window.NightBiteAlertsShown.some(function (a) { return /thunder|tornado/i.test(a.event || ""); });

  function fail() {
    card.setAttribute("data-state", "error");
    if (statusEl) {
      statusEl.innerHTML = 'Weather unavailable, check <a href="' + WX_PAGE + '" target="_blank" rel="noopener">weather.gov</a>.';
    }
    ["wind", "air", "rain", "pressure"].forEach(function (k) {
      var c = grid.querySelector('[data-cond="' + k + '"]');
      if (c) c.hidden = true;
    });
    st.periods = null; st.now = null; st.p3 = null;
    render();   // the strip, storm line and wind extras hide; the bite line stays only if water temp alone can carry it
  }

  function stamp(when) {
    var t = timeEt(when || new Date());
    if (statusEl) {
      var b = pressureAt && timeEt(pressureAt);
      statusEl.innerHTML = "NWS hourly forecast for Hoover, barometer from " + STATION_NAME + (b ? " at " + b.value + " " + b.unit : "") +
        ". Checked " + t.value + " " + t.unit +
        ' ET. <a href="' + WX_PAGE + '" target="_blank" rel="noopener">Full forecast</a>.';
    }
  }

  function readCache() {
    try {
      var c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (c && Date.now() - c.at < CACHE_MS) return c;
    } catch (e) {}
    return null;
  }
  function writeCache(h, o, g) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), hourly: h, obs: o, thunder: g })); } catch (e) {}
  }

  var hasData = false, lastOk = null;
  var SAVE_KEY = "nb-cond-last", SAVE_MAX = 3 * 864e5;   // last good forecast, for offline visits
  var OFF = window.NightBiteOffline;

  // offline (or NWS down on the very first load): show the last saved forecast, labelled with its time
  function showSaved() {
    var saved = OFF && OFF.load(SAVE_KEY, SAVE_MAX);
    if (!saved) return false;
    try { applyHourly(saved.hourly, "Saved"); } catch (e) { return false; }
    try { applyPressure(saved.obs, true); } catch (e) { noReading("KCMH unavailable"); }
    try { applyWind(saved.obs || {}); } catch (e) {}
    st.thunder = saved.thunder || null;
    render();
    ["wind", "air", "rain", "pressure"].forEach(function (k) {
      var c = grid.querySelector('[data-cond="' + k + '"]');
      if (c) c.hidden = false;
    });
    hasData = true;
    lastOk = new Date(saved.savedAt);
    card.setAttribute("data-state", "ok");
    card.setAttribute("data-saved", "1");
    return true;
  }

  function failRefresh() {
    // keep the last good numbers on screen and say how old they are
    var t = timeEt(lastOk);
    if (OFF && OFF.isOffline()) {
      card.setAttribute("data-offline", "1");
      if (statusEl) statusEl.textContent = OFF.label(lastOk);
      return;
    }
    if (statusEl) {
      statusEl.innerHTML = "Weather update failed, check " + '<a href="' + WX_PAGE + '" target="_blank" rel="noopener">weather.gov</a>' +
        ". Showing the " + t.value + " " + t.unit + " ET reading.";
    }
  }

  /* force: skip the session cache (the 15 minute auto refresh always forces) */
  function load(force) {
    sunMoon();
    var cached = force ? null : readCache();
    var startIso = new Date(Date.now() - 18 * 36e5).toISOString().replace(/\.\d{3}Z$/, "Z");
    var hourlyP = cached ? Promise.resolve(cached.hourly) : getJson(HOURLY).catch(function () {
      // gridpoint ids can change: rediscover from /points once
      return getJson(POINT).then(function (pt) { return getJson(pt.properties.forecastHourly); });
    });
    var obsP = cached ? Promise.resolve(cached.obs) : getJson("https://api.weather.gov/stations/" + STATION + "/observations?start=" + encodeURIComponent(startIso))
      .catch(function () { return null; });
    // raw gridpoint, only for thunder (weather and probabilityOfThunder); optional, so a failure just leaves it out
    var gridP = cached ? Promise.resolve(cached.thunder) : getJson(GRID, 12000).then(gridThunder).catch(function () { return null; });

    return hourlyP.then(function (h) {
      applyHourly(h, window.NightBiteOffline && window.NightBiteOffline.isOffline() ? "Saved" : "Now");
      card.setAttribute("data-state", "ok");
      ["wind", "air", "rain", "pressure"].forEach(function (k) {
        var c = grid.querySelector('[data-cond="' + k + '"]');
        if (c) c.hidden = false;
      });
      hasData = true;
      lastOk = cached ? new Date(cached.at) : new Date();
      card.removeAttribute("data-offline");
      card.removeAttribute("data-saved");
      stamp(lastOk);
      render();
      var offline = OFF && OFF.isOffline();
      if (offline) {
        // offline but answered from the session copy or the browser's HTTP cache: label it with the last real fetch time
        var sv = OFF.load(SAVE_KEY);
        if (!cached && sv) lastOk = new Date(sv.savedAt);
        failRefresh();
      }
      return Promise.all([obsP, gridP]).then(function (r) {
        var o = r[0], obs = null;
        st.thunder = r[1] || null;
        try {
          applyPressure(o, offline || !!cached);
          applyWind(o || {});
          if (!offline) stamp(lastOk);   // adds the KCMH reading time
          if (o) obs = slimObs(o);
          if (!cached && obs) writeCache(slimHourly(h), obs, st.thunder);
        } catch (e) {
          noReading("KCMH unavailable");
        }
        render();
        if (!cached && !offline && OFF) OFF.save(SAVE_KEY, { hourly: slimHourly(h), obs: obs, thunder: st.thunder });
      });
    }).catch(function () {
      if (hasData) failRefresh();
      else if (OFF && OFF.isOffline() && showSaved()) failRefresh();
      else fail();
    });
  }

  load(false);
  if (window.NightBiteRefresh) window.NightBiteRefresh.add("conditions", load);

  function slimHourly(h) {
    // 28 hours: enough to reach 2 AM tomorrow from any time today, for the strip and the storm check
    return { properties: { periods: (h.properties.periods || []).slice(0, 28).map(function (p) {
      return { startTime: p.startTime, endTime: p.endTime, windSpeed: p.windSpeed, windDirection: p.windDirection, windGust: p.windGust,
        temperature: p.temperature, temperatureUnit: p.temperatureUnit, probabilityOfPrecipitation: p.probabilityOfPrecipitation,
        shortForecast: p.shortForecast, dewpoint: p.dewpoint, relativeHumidity: p.relativeHumidity };
    }) } };
  }
  function slimObs(o) {
    return { features: (o.features || []).map(function (f) {
      return { properties: { timestamp: f.properties.timestamp, seaLevelPressure: f.properties.seaLevelPressure,
        barometricPressure: f.properties.barometricPressure, windGust: f.properties.windGust } };
    }) };
  }
})();
