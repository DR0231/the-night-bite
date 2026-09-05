/**
 * The Night Bite — USGS IV refresh for pool (62614) and water temp (00010).
 * Site: 03228400 (Hoover Reservoir at Central College, OH).
 * Updates #pool-snapshot / #pool-correction on home + water.
 * On failure: show “unavailable — check USGS” + link. Never invent readings.
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
    return (Math.round(((c * 9) / 5 + 32) * 10) / 10).toFixed(1);
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

  function unavailable(msg) {
    var link =
      '<a href="' +
      GAUGE_URL +
      '" target="_blank" rel="noopener">USGS</a>';
    if (statusEl) {
      statusEl.innerHTML =
        (msg || "Live refresh unavailable — check USGS") + " · " + link + ".";
    }
    if (lineEl && lineEl.getAttribute("data-live-failed") !== "1") {
      // Keep static snapshot text; only mark status. Never invent.
    }
  }

  function applyPool(poolFt, dateTimeIso) {
    if (!lineEl || typeof poolFt !== "number" || !isFinite(poolFt)) return false;
    var delta = MAP_POOL_FT - poolFt;
    var deltaStr = (Math.round(delta * 100) / 100).toFixed(2);
    var poolStr = (Math.round(poolFt * 100) / 100).toFixed(2);
    var when = formatEt(dateTimeIso) || "unknown time";
    var safeIso = String(dateTimeIso).replace(/"/g, "");

    lineEl.innerHTML =
      "Pool elevation <strong>" +
      poolStr +
      " ft</strong> NGVD29 (USGS provisional, param " +
      PARAM_POOL +
      ") · map drawn at <strong>" +
      MAP_POOL_FT +
      "</strong> · contours about <strong>" +
      deltaStr +
      " ft high</strong>.";

    if (checkedEl) {
      checkedEl.innerHTML =
        "Pool checked: <time datetime=\"" +
        safeIso +
        "\">" +
        when +
        "</time>. " +
        '<a href="' +
        GAUGE_URL +
        '" target="_blank" rel="noopener">Live USGS gauge</a>.';
    }
    return true;
  }

  function applyTemp(tempC, dateTimeIso) {
    if (!tempEl || typeof tempC !== "number" || !isFinite(tempC)) return false;
    var when = formatEt(dateTimeIso) || "unknown time";
    var safeIso = String(dateTimeIso).replace(/"/g, "");
    var cStr = (Math.round(tempC * 10) / 10).toFixed(1);
    var fStr = String(cToF(tempC));
    tempEl.innerHTML =
      "<strong>" +
      cStr +
      " °C</strong> (~" +
      fStr +
      " °F) · <time datetime=\"" +
      safeIso +
      "\">" +
      when +
      "</time> · param " +
      PARAM_TEMP +
      " · provisional";
    return true;
  }

  fetch(IV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("usgs http " + res.status);
      return res.json();
    })
    .then(function (json) {
      var pool = parseSeries(json, PARAM_POOL);
      var temp = parseSeries(json, PARAM_TEMP);
      var okPool = pool && applyPool(pool.value, pool.dateTime);
      var okTemp = temp && applyTemp(temp.value, temp.dateTime);
      if (!okPool && !okTemp) {
        unavailable("unavailable — check USGS");
        return;
      }
      if (statusEl) {
        var bits = [];
        if (okPool) bits.push("pool");
        if (okTemp) bits.push("temp");
        statusEl.textContent =
          "Live USGS refresh updated " + bits.join(" + ") + " (provisional).";
      }
      if (!okPool || !okTemp) {
        var miss = !okPool ? "pool" : "temp";
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
