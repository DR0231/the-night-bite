/**
 * The Night Bite — USGS refresh for pool (62614) and water temp (00010).
 * Readings come from js/lakes.js (NightBiteLakes.usgsLatest): the new USGS Water Data API first, the legacy
 * WaterServices IV API only as a fallback until it is switched off (Feb. 22, 2027).
 * Site: 03228400 (Hoover Reservoir at Central College, OH).
 * Human lead: "892.97 ft · 83°F · ~1.0 ft below full pool"
 * Lakes with only a Corps outflow water temperature (pool.outflow: Alum Creek, Deer Creek Lake) read
 * "886.45 ft · 60°F outflow · ~1.6 ft below full pool": always labelled outflow, never lake surface temperature, and
 * never shared with the bite rating (window.NightBiteWaterF and nb:usgs carry lake surface temperature only).
 * Lakes with only a Corps temperature profile (pool.profile) say so; no number is shown as live.
 * On failure: keeps the last reading on the card (the last live one saved on this phone, or the snapshot baked into
 * the page) with its Checked time and says the refresh failed; only a page with no reading at all says
 * “unavailable, check USGS”. #correction-line carries data-source="live|saved|snapshot" and data-refresh-failed,
 * which js/glance.js reads for its "last updated X hours ago" line. Never invent readings.
 */
(function () {
  if (window.__nightbiteUsgsLoaded) return;
  window.__nightbiteUsgsLoaded = true;
  // lake settings from js/lakes.js; the fallbacks are Hoover's original values
  var LK = window.NightBiteLake;
  var LP = (LK && LK.cfg && LK.cfg.pool) || null;
  if (LP && !LP.src) return;   // no public lake gauge (Madison Lake, Knox Lake, Clear Fork): js/lake-snapshot.js writes the card
  var SITE = (LP && LP.site) || "03228400";
  var PARAM_POOL = (LP && LP.param) || "62614";
  var PARAM_TEMP = LP ? LP.temp : "00010";        // null: this lake has no public water temp gauge
  var MAP_POOL_FT = LP ? LP.fullPool : 894;
  var SRC_NAME = (LP && LP.srcName) || "USGS";
  var CWMS = !!(LP && LP.src === "cwms");
  var OUTFLOW = (LP && LP.outflow) || null;   // Corps outflow water temperature, labelled outflow
  var PROFILE = (LP && LP.profile) || null;   // Corps temperature profile only (dated, not live)
  var GAUGE_URL = (LP && LP.gaugeUrl) ||
    "https://waterdata.usgs.gov/monitoring-location/USGS-03228400/";
  var LS = window.NightBiteLakes;

  var lineEl = document.getElementById("correction-line");
  var checkedEl = document.getElementById("correction-checked");
  var tempEl = document.getElementById("water-temp");
  var statusEl = document.getElementById("usgs-live-status");

  if (!lineEl && !tempEl) return;

  function formatEt(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(d);
      var get = function (type) {
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === type) return parts[i].value;
        }
        return "";
      };
      return (
        get("year") +
        "-" +
        get("month") +
        "-" +
        get("day") +
        " " +
        get("hour") +
        ":" +
        get("minute") +
        " ET"
      );
    } catch (e) {
      return null;
    }
  }

  function cToF(c) {
    return Math.round(((c * 9) / 5 + 32) * 10) / 10;
  }

  function humanLead(poolFt, tempF, outflow) {
    var poolStr = (Math.round(poolFt * 100) / 100).toFixed(2);
    var delta = Math.abs(MAP_POOL_FT - poolFt);
    var deltaStr = (Math.round(delta * 10) / 10).toFixed(1);
    var rel = poolFt > MAP_POOL_FT ? "above" : "below";
    var tempPart =
      typeof tempF === "number" && isFinite(tempF)
        ? Math.round(tempF) + "°F" + (outflow ? " outflow" : "")
        : PROFILE ? "Corps profile " + PROFILE.short   // dated profile, named, never a live reading
        : "no temp";
    return (
      poolStr +
      " ft · " +
      tempPart +
      " · ~" +
      deltaStr +
      " ft " +
      rel +
      " full pool"
    );
  }

  function unavailable(msg) {
    var link =
      '<a href="' +
      GAUGE_URL +
      '" target="_blank" rel="noopener">' + SRC_NAME + '</a>';
    if (statusEl) {
      statusEl.innerHTML =
        "unavailable, check " + link + ".";
    }
    if (lineEl) {
      lineEl.innerHTML =
        'unavailable, check <a href="' +
        GAUGE_URL +
        '" target="_blank" rel="noopener">' + SRC_NAME + '</a>';
      lineEl.setAttribute("data-live-failed", "1");
    }
  }

  function applyPoolAndTemp(pool, temp, out) {
    var poolFt = pool && pool.value;
    var tempC = temp && temp.value;
    var tempF =
      typeof tempC === "number" && isFinite(tempC) ? cToF(tempC) : null;
    var outF = tempF === null && out && typeof out.f === "number" && isFinite(out.f) ? out.f : null;

    if (lineEl && typeof poolFt === "number" && isFinite(poolFt)) {
      lineEl.textContent = humanLead(poolFt, tempF !== null ? tempF : outF, outF !== null);
      lineEl.removeAttribute("data-live-failed");
    } else if (lineEl && tempF !== null) {
      // temp only — keep pool from static HTML if present; do not invent pool
    }

    var whenPool = pool && formatEt(pool.dateTime);
    var whenTemp = temp && formatEt(temp.dateTime);
    var when = whenPool || whenTemp || "unknown time";
    var iso =
      (pool && pool.dateTime) || (temp && temp.dateTime) || "";
    var safeIso = String(iso).replace(/"/g, "");

    if (checkedEl) {
      checkedEl.innerHTML =
        "Checked: <time datetime=\"" +
        safeIso +
        "\">" +
        when +
        "</time>. " +
        '<a href="' +
        GAUGE_URL +
        '" target="_blank" rel="noopener">Live ' + SRC_NAME + ' gauge</a>.';
    }

    if (tempEl && tempF !== null) {
      var cStr = (Math.round(tempC * 10) / 10).toFixed(1);
      tempEl.innerHTML =
        "<strong>" +
        tempF +
        " °F</strong> (" +
        cStr +
        " °C) · <time datetime=\"" +
        String(temp.dateTime).replace(/"/g, "") +
        "\">" +
        (whenTemp || when) +
        "</time>";
    } else if (tempEl && outF !== null) {
      // outflow water temperature from the Corps: labelled outflow, linked to the Corps project page
      tempEl.innerHTML =
        "<strong>" + outF + " °F</strong> outflow (" + out.c.toFixed(1) + " °C) · <time datetime=\"" +
        String(out.dateTime).replace(/"/g, "") + "\">" + (formatEt(out.dateTime) || when) + "</time> · " +
        '<a href="' + OUTFLOW.url + '" target="_blank" rel="noopener">USACE outflow gauge</a>';
    }

    // share the water temp (lake surface only: an outflow reading is never passed on) with the conditions card ("Tonight's bite")
    if (tempF !== null) {
      window.NightBiteWaterF = tempF;
      try { document.dispatchEvent(new CustomEvent("nb:usgs", { detail: { tempF: tempF, at: temp.dateTime } })); } catch (e) {}
    }

    return (
      (typeof poolFt === "number" && isFinite(poolFt)) || tempF !== null
    );
  }

  var hadLive = false;
  var SAVE_KEY = LK ? LK.key("nb-usgs-last") : "nb-usgs-last";
  var OFF = window.NightBiteOffline;

  // offline, or a live refresh that failed: show the last saved live reading if it's newer than the snapshot baked
  // into the page, else keep the baked snapshot. failed: say the refresh failed instead of "Offline."
  function showSaved(failed) {
    var saved = OFF ? OFF.load(SAVE_KEY, 14 * 864e5) : null;
    var baked = checkedEl && checkedEl.querySelector("time");
    var bakedAt = baked ? new Date(baked.getAttribute("datetime")).valueOf() : 0;
    var at = null;
    var src = "snapshot";
    if (saved && saved.pool && new Date(saved.pool.dateTime).valueOf() >= (bakedAt || 0)) {
      applyPoolAndTemp(saved.pool, saved.temp, saved.out);
      at = new Date(saved.pool.dateTime);
      src = "saved";
    } else if (bakedAt && lineEl && !lineEl.hasAttribute("data-live-failed")) {
      at = new Date(bakedAt);   // the page's own snapshot is the newest we have
    }
    if (!at) return false;
    if (lineEl) lineEl.setAttribute("data-source", src);
    if (failed) {
      if (statusEl) statusEl.innerHTML = 'Live refresh failed, check <a href="' + GAUGE_URL + '" target="_blank" rel="noopener">' + SRC_NAME +
        '</a>. Showing the reading from ' + (OFF ? OFF.when(at) : formatEt(at.toISOString())) + '.';
      if (lineEl) lineEl.setAttribute("data-refresh-failed", "1");
      return true;
    }
    if (statusEl && OFF) statusEl.textContent = OFF.label(at);
    if (lineEl) lineEl.setAttribute("data-offline", "1");
    return true;
  }

  // { pool, temp } from the lake's gauge: USGS (Hoover, Buckeye Lake, O'Shaughnessy, Griggs, Indian Lake; js/lakes.js picks the API) or the Corps CWMS API (Alum Creek, Delaware Lake)
  function getLevel() {
    if (CWMS) {
      return LK.cwms(3).then(function (pts) {
        var last = pts[pts.length - 1];
        return { pool: last ? { value: last.v, dateTime: last.iso } : null, temp: null };
      });
    }
    if (!LS || !LS.usgsLatest) return Promise.reject(new Error("js/lakes.js missing"));
    return LS.usgsLatest(SITE, PARAM_TEMP ? [PARAM_POOL, PARAM_TEMP] : [PARAM_POOL]).then(function (r) {
      return { pool: r[PARAM_POOL] || null, temp: PARAM_TEMP ? r[PARAM_TEMP] || null : null };
    });
  }
  // the outflow temp is asked for alongside; if the Corps doesn't answer, the level still shows
  function getReadings() {
    var o = OUTFLOW && LK && LK.outflow ? LK.outflow(6).catch(function () { return null; }) : Promise.resolve(null);
    return Promise.all([getLevel(), o]).then(function (x) { x[0].out = x[1]; return x[0]; });
  }

  function load() {
    getReadings()
      .then(function (r) {
        var pool = r.pool;
        var temp = r.temp;
        var out = r.out || null;
        var ok = applyPoolAndTemp(pool, temp, out);
        if (ok) hadLive = true;
        if (ok && OFF && pool) OFF.save(SAVE_KEY, { pool: pool, temp: temp, out: out });
        if (ok && lineEl) { lineEl.removeAttribute("data-offline"); lineEl.removeAttribute("data-refresh-failed"); lineEl.setAttribute("data-source", "live"); }
        if (ok && OFF && OFF.isOffline() && pool && statusEl) {
          // the browser answered from its own HTTP cache while offline: say how old it is
          statusEl.textContent = OFF.label(new Date(pool.dateTime));
          if (lineEl) lineEl.setAttribute("data-offline", "1");
          return;
        }
        if (!ok) {
          if (hadLive) { if (lineEl) lineEl.setAttribute("data-refresh-failed", "1"); return; }
          if (showSaved(true)) return;
          unavailable("unavailable, check " + SRC_NAME);
          return;
        }
        if (statusEl) {
          var bits = [];
          if (pool) bits.push("pool");
          if (temp) bits.push("temp");
          statusEl.textContent =
            "Live " + SRC_NAME + " refresh updated " + bits.join(" + ") + " (provisional).";
        }
        if (!PARAM_TEMP && OUTFLOW && pool && out && statusEl) {
          statusEl.textContent += " USACE outflow temp updated; it is not lake surface temperature.";   // pg.live_pool_out, one node
        } else if (!PARAM_TEMP && PROFILE && pool && statusEl) {
          statusEl.textContent += " No live water temp; the Corps posts a temperature profile.";   // pg.live_pool_prof, one node
        } else if (!PARAM_TEMP && !OUTFLOW && pool && statusEl) {
          statusEl.textContent += " No public water temp gauge on this lake.";   // pg.live_pool, one node
        } else if (!pool || !(temp || out)) {
          var miss = !pool ? "pool" : OUTFLOW ? "outflow temp" : "temp";
          if (statusEl) {
            // each piece its own text node so js/i18n.js can match it (pg.live_*_p, pg.miss_*)
            statusEl.innerHTML =
              "<span>" + statusEl.innerHTML +
              "</span> · <span>" +
              miss +
              ' unavailable, check</span> <a href="' +
              (miss === "outflow temp" ? OUTFLOW.url : GAUGE_URL) +
              '" target="_blank" rel="noopener">' + (miss === "outflow temp" ? "USACE" : SRC_NAME) + '</a>.';
          }
        }
      })
      .catch(function () {
        if (OFF && OFF.isOffline()) {
          if (hadLive) {
            var last = OFF.load(SAVE_KEY);
            if (statusEl && last && last.pool) statusEl.textContent = OFF.label(new Date(last.pool.dateTime));
            return;
          }
          if (showSaved()) return;
        }
        if (hadLive && statusEl) {
          // a failed auto refresh keeps the last live reading on screen
          statusEl.innerHTML = 'Refresh failed, check <a href="' + GAUGE_URL + '" target="_blank" rel="noopener">' + SRC_NAME + '</a>. Showing the last reading.';
          if (lineEl) lineEl.setAttribute("data-refresh-failed", "1");
          return;
        }
        if (hadLive) { if (lineEl) lineEl.setAttribute("data-refresh-failed", "1"); return; }
        // USGS or the Corps blocked or down: keep the last reading with its time, never blank the card
        if (showSaved(true)) return;
        unavailable("unavailable, check " + SRC_NAME);
      });
  }

  load();
  // auto refresh (js/refresh.js): every 15 minutes while visible
  if (window.NightBiteRefresh) window.NightBiteRefresh.add("usgs", load);
})();
