/**
 * The Night Bite: "Tonight at Hoover" conditions card (home page).
 * Data: National Weather Service API (api.weather.gov, free, no key), fetched by the browser.
 *   Hourly forecast: gridpoint ILN 89,88 (from /points/40.11,-82.88; Hoover Reservoir at Central College).
 *   Barometer and its trend: station KCMH (John Glenn Columbus Intl), the first station NWS lists for that gridpoint.
 * Wind gusts: the hourly period's windGust when NWS sends one, otherwise the latest KCMH observation gust.
 * Sunset, moonrise and tonight's moon phase come from js/astro.js (computed locally, so they work offline).
 * If NWS fails: "Weather unavailable, check weather.gov" with a link. Never invents values.
 */
(function () {
  var card = document.getElementById("conditions");
  if (!card || !window.fetch) return;
  var LAT = 40.11, LNG = -82.88;
  var HOURLY = "https://api.weather.gov/gridpoints/ILN/89,88/forecast/hourly";
  var POINT = "https://api.weather.gov/points/40.11,-82.88";
  var STATION = "KCMH";
  var STATION_NAME = "Columbus airport (KCMH)";
  var WX_PAGE = "https://forecast.weather.gov/MapClick.php?lat=40.11&lon=-82.88";
  var CACHE_KEY = "nb-cond-v2", CACHE_MS = 10 * 60 * 1000;   // shorter than the 15 minute refresh, and refreshes skip it

  var grid = card.querySelector(".cond-grid");
  var statusEl = card.querySelector(".cond-status");
  var summaryEl = card.querySelector(".cond-summary");

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
    if (s) setCell("sunset", s.value, s.unit, setTomorrow ? "Next sunset" : "Today");
    var sameDay = rise && A.etMidnight(rise).valueOf() === mid.valueOf();
    var r = timeEt(rise, !sameDay);
    if (r) setCell("moonrise", r.value, r.unit, sameDay ? "Today" : "Next moonrise");
    // tonight's phase name, illumination and the matching 13 px sprite (0 New ... 7 Waning crescent)
    if (A.moonTonight) {
      var mt = A.moonTonight(now);
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
    windNow = { p: p, sub: subNow };
    applyWind(null);
    if (typeof p.temperature === "number") {
      var f = p.temperatureUnit === "C" ? Math.round(p.temperature * 9 / 5 + 32) : Math.round(p.temperature);
      setCell("air", String(f), "°F", subNow);
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

  /* ---- barometer at KCMH: current reading in inHg and the change over about 12 hours ----
     Which NWS field: seaLevelPressure first. It is the METAR sea level pressure, the number forecasts quote, but KCMH
     only sends it on the hourly report (about :51 past). So it is used when an hourly value is within 90 minutes of
     the newest observation; otherwise the reading falls back to barometricPressure, which every 5 minute report has.
     The 12 hour change is worked out from the same field as the reading, so switching fields can't fake a trend.
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
    var target = latest.t - 12 * 36e5, old = pts[pts.length - 1];
    pts.forEach(function (q) { if (Math.abs(q.t - target) < Math.abs(old.t - target)) old = q; });
    var spanH = (latest.t - old.t) / 36e5;
    var trend, sub;
    if (pts.length > 1 && spanH >= 6) {
      var dPa = latest.pa - old.pa;
      trend = dPa >= 100 ? "Rising" : dPa <= -100 ? "Falling" : "Steady";   // 1 hPa, about 0.03 inHg
      sub = trend + " " + Math.abs(dPa / PA_PER_INHG).toFixed(2) + " over " + Math.round(spanH) + "\u00a0h";
    } else {
      trend = "unknown";
      sub = "Trend needs more readings";
    }
    setCell("pressure", (latest.pa / PA_PER_INHG).toFixed(2), "inHg", sub);
    card.setAttribute("data-pressure-trend", trend.toLowerCase());
    card.setAttribute("data-pressure-field", field);
    asOf(latest.t);
    return true;
  }

  function fail() {
    card.setAttribute("data-state", "error");
    if (statusEl) {
      statusEl.innerHTML = 'Weather unavailable, check <a href="' + WX_PAGE + '" target="_blank" rel="noopener">weather.gov</a>.';
    }
    ["wind", "air", "rain", "pressure"].forEach(function (k) {
      var c = grid.querySelector('[data-cond="' + k + '"]');
      if (c) c.hidden = true;
    });
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
  function writeCache(h, o) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), hourly: h, obs: o })); } catch (e) {}
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
      var offline = OFF && OFF.isOffline();
      if (offline) {
        // offline but answered from the session copy or the browser's HTTP cache: label it with the last real fetch time
        var sv = OFF.load(SAVE_KEY);
        if (!cached && sv) lastOk = new Date(sv.savedAt);
        failRefresh();
      }
      return obsP.then(function (o) {
        var obs = null;
        try {
          applyPressure(o, offline || !!cached);
          applyWind(o || {});
          if (!offline) stamp(lastOk);   // adds the KCMH reading time
          if (o) obs = slimObs(o);
          if (!cached && obs) writeCache(slimHourly(h), obs);
        } catch (e) {
          noReading("KCMH unavailable");
        }
        if (!cached && !offline && OFF) OFF.save(SAVE_KEY, { hourly: slimHourly(h), obs: obs });
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
    return { properties: { periods: (h.properties.periods || []).slice(0, 16).map(function (p) {
      return { endTime: p.endTime, windSpeed: p.windSpeed, windDirection: p.windDirection, windGust: p.windGust, temperature: p.temperature,
        temperatureUnit: p.temperatureUnit, probabilityOfPrecipitation: p.probabilityOfPrecipitation, shortForecast: p.shortForecast };
    }) } };
  }
  function slimObs(o) {
    return { features: (o.features || []).map(function (f) {
      return { properties: { timestamp: f.properties.timestamp, seaLevelPressure: f.properties.seaLevelPressure,
        barometricPressure: f.properties.barometricPressure, windGust: f.properties.windGust } };
    }) };
  }
})();
