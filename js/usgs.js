/**
 * The Night Bite — USGS refresh for pool (62614) and water temp (00010).
 * Readings come from js/lakes.js (NightBiteLakes.usgsLatest): the new USGS Water Data API first, the legacy
 * WaterServices IV API only as a fallback until it is switched off (Feb. 22, 2027).
 * Site: 03228400 (Hoover Reservoir at Central College, OH).
 * Human lead: "892.97 ft · 83°F · ~1.0 ft below full pool"
 * On failure: “unavailable, check USGS” + link. Never invent readings.
 */
(function () {
  if (window.__nightbiteUsgsLoaded) return;
  window.__nightbiteUsgsLoaded = true;
  // lake settings from js/lakes.js; the fallbacks are Hoover's original values
  var LK = window.NightBiteLake;
  var LP = (LK && LK.cfg && LK.cfg.pool) || null;
  var SITE = (LP && LP.site) || "03228400";
  var PARAM_POOL = (LP && LP.param) || "62614";
  var PARAM_TEMP = LP ? LP.temp : "00010";        // null: this lake has no public water temp gauge
  var MAP_POOL_FT = LP ? LP.fullPool : 894;
  var SRC_NAME = (LP && LP.srcName) || "USGS";
  var CWMS = !!(LP && LP.src === "cwms");
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

  function humanLead(poolFt, tempF) {
    var poolStr = (Math.round(poolFt * 100) / 100).toFixed(2);
    var delta = Math.abs(MAP_POOL_FT - poolFt);
    var deltaStr = (Math.round(delta * 10) / 10).toFixed(1);
    var rel = poolFt > MAP_POOL_FT ? "above" : "below";
    var tempPart =
      typeof tempF === "number" && isFinite(tempF)
        ? Math.round(tempF) + "°F"
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
        (msg || "unavailable, check " + SRC_NAME) + " · " + link + ".";
    }
    if (lineEl) {
      lineEl.innerHTML =
        'unavailable, check <a href="' +
        GAUGE_URL +
        '" target="_blank" rel="noopener">' + SRC_NAME + '</a>';
      lineEl.setAttribute("data-live-failed", "1");
    }
  }

  function applyPoolAndTemp(pool, temp) {
    var poolFt = pool && pool.value;
    var tempC = temp && temp.value;
    var tempF =
      typeof tempC === "number" && isFinite(tempC) ? cToF(tempC) : null;

    if (lineEl && typeof poolFt === "number" && isFinite(poolFt)) {
      lineEl.textContent = humanLead(poolFt, tempF);
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
    }

    // share the water temp with the conditions card ("Tonight's bite")
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

  // offline: show the last saved live reading if it's newer than the snapshot baked into the page
  function showSaved() {
    var saved = OFF && OFF.load(SAVE_KEY, 14 * 864e5);
    var baked = checkedEl && checkedEl.querySelector("time");
    var bakedAt = baked ? new Date(baked.getAttribute("datetime")).valueOf() : 0;
    var at = null;
    if (saved && saved.pool && new Date(saved.pool.dateTime).valueOf() >= (bakedAt || 0)) {
      applyPoolAndTemp(saved.pool, saved.temp);
      at = new Date(saved.pool.dateTime);
    } else if (bakedAt) {
      at = new Date(bakedAt);   // the page's own snapshot is the newest we have
    }
    if (!at) return false;
    if (statusEl) statusEl.textContent = OFF.label(at);
    if (lineEl) lineEl.setAttribute("data-offline", "1");
    return true;
  }

  // { pool, temp } from the lake's gauge: USGS (Hoover, Buckeye; js/lakes.js picks the API) or the Corps CWMS API (Alum Creek)
  function getReadings() {
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

  function load() {
    getReadings()
      .then(function (r) {
        var pool = r.pool;
        var temp = r.temp;
        var ok = applyPoolAndTemp(pool, temp);
        if (ok) hadLive = true;
        if (ok && OFF && pool) OFF.save(SAVE_KEY, { pool: pool, temp: temp });
        if (ok && lineEl) lineEl.removeAttribute("data-offline");
        if (ok && OFF && OFF.isOffline() && pool && statusEl) {
          // the browser answered from its own HTTP cache while offline: say how old it is
          statusEl.textContent = OFF.label(new Date(pool.dateTime));
          if (lineEl) lineEl.setAttribute("data-offline", "1");
          return;
        }
        if (!ok) {
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
        if (!PARAM_TEMP && pool && statusEl) {
          statusEl.textContent += " No public water temp gauge on this lake.";
        } else if (!pool || !temp) {
          var miss = !pool ? "pool" : "temp";
          if (statusEl) {
            statusEl.innerHTML =
              statusEl.textContent +
              " · " +
              miss +
              ' unavailable, check <a href="' +
              GAUGE_URL +
              '" target="_blank" rel="noopener">' + SRC_NAME + '</a>.';
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
          return;
        }
        unavailable("unavailable, check " + SRC_NAME);
      });
  }

  load();
  // auto refresh (js/refresh.js): every 15 minutes while visible
  if (window.NightBiteRefresh) window.NightBiteRefresh.add("usgs", load);
})();
