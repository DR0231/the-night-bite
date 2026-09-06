/**
 * The Night Bite — USGS IV refresh for pool (62614) and water temp (00010).
 * Site: 03228400 (Hoover Reservoir at Central College, OH).
 * Human lead: "892.97 ft · 83°F · ~1.0 ft below full pool"
 * On failure: “unavailable — check USGS” + link. Never invent readings.
 */
(function () {
  if (window.__nightbiteUsgsLoaded) return;
  window.__nightbiteUsgsLoaded = true;
  var SITE = "03228400";
  var PARAM_POOL = "62614";
  var PARAM_TEMP = "00010";
  var MAP_POOL_FT = 894;
  var GAUGE_URL =
    "https://waterdata.usgs.gov/monitoring-location/USGS-03228400/";
  var IV_URL =
    "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=" +
    SITE +
    "&parameterCd=" +
    PARAM_POOL +
    "," +
    PARAM_TEMP;

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

  function parseSeries(json, paramCd) {
    try {
      var series = json && json.value && json.value.timeSeries;
      if (!series || !series.length) return null;
      for (var i = 0; i < series.length; i++) {
        var ts = series[i];
        var code =
          ts &&
          ts.variable &&
          ts.variable.variableCode &&
          ts.variable.variableCode[0] &&
          ts.variable.variableCode[0].value;
        if (String(code) !== String(paramCd)) continue;
        var values =
          ts.values && ts.values[0] && ts.values[0].value;
        if (!values || !values.length) return null;
        var latest = values[values.length - 1];
        var n = parseFloat(latest.value, 10);
        if (!isFinite(n) || n <= -99999) return null;
        return { value: n, dateTime: latest.dateTime };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function humanLead(poolFt, tempF) {
    var poolStr = (Math.round(poolFt * 100) / 100).toFixed(2);
    var delta = Math.abs(MAP_POOL_FT - poolFt);
    var deltaStr = (Math.round(delta * 10) / 10).toFixed(1);
    var rel = poolFt > MAP_POOL_FT ? "above" : "below";
    var tempPart =
      typeof tempF === "number" && isFinite(tempF)
        ? Math.round(tempF) + "°F"
        : "temp —";
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
      '" target="_blank" rel="noopener">USGS</a>';
    if (statusEl) {
      statusEl.innerHTML =
        (msg || "unavailable — check USGS") + " · " + link + ".";
    }
    if (lineEl) {
      lineEl.innerHTML =
        'unavailable — check <a href="' +
        GAUGE_URL +
        '" target="_blank" rel="noopener">USGS</a>';
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
        '" target="_blank" rel="noopener">Live USGS gauge</a>.';
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

    return (
      (typeof poolFt === "number" && isFinite(poolFt)) || tempF !== null
    );
  }

  fetch(IV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("usgs http " + res.status);
      return res.json();
    })
    .then(function (json) {
      var pool = parseSeries(json, PARAM_POOL);
      var temp = parseSeries(json, PARAM_TEMP);
      var ok = applyPoolAndTemp(pool, temp);
      if (!ok) {
        unavailable("unavailable — check USGS");
        return;
      }
      if (statusEl) {
        var bits = [];
        if (pool) bits.push("pool");
        if (temp) bits.push("temp");
        statusEl.textContent =
          "Live USGS refresh updated " + bits.join(" + ") + " (provisional).";
      }
      if (!pool || !temp) {
        var miss = !pool ? "pool" : "temp";
        if (statusEl) {
          statusEl.innerHTML =
            statusEl.textContent +
            " · " +
            miss +
            ' unavailable — check <a href="' +
            GAUGE_URL +
            '" target="_blank" rel="noopener">USGS</a>.';
        }
      }
    })
    .catch(function () {
      unavailable("unavailable — check USGS");
    });
})();
