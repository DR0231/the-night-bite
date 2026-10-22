/**
 * The Night Bite: "Tonight at Hoover" conditions card (home page).
 * Data: National Weather Service API (api.weather.gov, free, no key), fetched by the browser.
 *   Hourly forecast: gridpoint ILN 89,88 (from /points/40.11,-82.88; Hoover Reservoir at Central College).
 *   Pressure trend: station KCMH (John Glenn Columbus Intl), the first station NWS lists for that gridpoint.
 * Sunset and moonrise come from js/astro.js (computed locally).
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
  var CACHE_KEY = "nb-cond-v1", CACHE_MS = 10 * 60 * 1000;   // shorter than the 15 minute refresh, and refreshes skip it

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
    var wind = /(\d+)(?:\s*to\s*(\d+))?\s*mph/i.exec(p.windSpeed || "");
    if (wind) setCell("wind", wind[2] ? wind[1] + " to " + wind[2] : wind[1], "mph " + (p.windDirection || ""), subNow);
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

  /* ---- pressure trend at KCMH over about 12 hours ---- */
  function applyPressure(json) {
    var feats = (json && json.features) || [];
    var pts = [];
    feats.forEach(function (f) {
      var pr = f.properties && f.properties.barometricPressure;
      if (pr && typeof pr.value === "number") pts.push({ t: new Date(f.properties.timestamp).valueOf(), pa: pr.value });
    });
    if (pts.length < 2) throw new Error("no pressure");
    pts.sort(function (a, b) { return b.t - a.t; });
    var latest = pts[0], target = latest.t - 12 * 36e5, old = pts[pts.length - 1];
    pts.forEach(function (q) { if (Math.abs(q.t - target) < Math.abs(old.t - target)) old = q; });
    var spanH = (latest.t - old.t) / 36e5;
    var inHg = latest.pa / 3386.389;
    var trend = "Steady";
    if (spanH >= 6) {
      var dHpa = (latest.pa - old.pa) / 100;
      if (dHpa >= 1) trend = "Rising";
      else if (dHpa <= -1) trend = "Falling";
      var dIn = (latest.pa - old.pa) / 3386.389;
      trend += " " + (dIn >= 0 ? "+" : "-") + Math.abs(dIn).toFixed(2) + " in, " + Math.round(spanH) + " h";
    } else {
      trend = "Trend needs more readings";
    }
    setCell("pressure", inHg.toFixed(2), "inHg", trend);
    card.setAttribute("data-pressure-trend", trend.split(" ")[0].toLowerCase());
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
      statusEl.innerHTML = "NWS hourly forecast for Hoover, pressure from " + STATION_NAME + ". Checked " + t.value + " " + t.unit +
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
    try { applyPressure(saved.obs); } catch (e) { setCell("pressure", "n/a", "", "Pressure unavailable"); }
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
    var startIso = new Date(Date.now() - 13 * 36e5).toISOString().replace(/\.\d{3}Z$/, "Z");
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
          applyPressure(o);
          obs = slimObs(o);
          if (!cached) writeCache(slimHourly(h), obs);
        } catch (e) {
          setCell("pressure", "n/a", "", "Pressure unavailable");
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
      return { endTime: p.endTime, windSpeed: p.windSpeed, windDirection: p.windDirection, temperature: p.temperature,
        temperatureUnit: p.temperatureUnit, probabilityOfPrecipitation: p.probabilityOfPrecipitation, shortForecast: p.shortForecast };
    }) } };
  }
  function slimObs(o) {
    return { features: (o.features || []).map(function (f) {
      return { properties: { timestamp: f.properties.timestamp, barometricPressure: f.properties.barometricPressure } };
    }) };
  }
})();
