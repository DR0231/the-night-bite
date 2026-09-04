/**
 * The Night Bite — optional USGS IV refresh for pool elevation (param 62614).
 * Site: 03228400 (Hoover Reservoir at Central College, OH).
 * On failure: keep the static HTML snapshot. Never invent levels. Never wipe to unknown.
 */
(function () {
  var SITE = "03228400";
  var PARAM = "62614";
  var MAP_POOL_FT = 894;
  var URL =
    "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=" +
    SITE +
    "&parameterCd=" +
    PARAM;

  var lineEl = document.getElementById("correction-line");
  var checkedEl = document.getElementById("correction-checked");
  if (!lineEl || !checkedEl) return;

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
      return get("year") + "-" + get("month") + "-" + get("day") + " " + get("hour") + ":" + get("minute") + " ET";
    } catch (e) {
      return null;
    }
  }

  function applyReading(poolFt, dateTimeIso) {
    if (typeof poolFt !== "number" || !isFinite(poolFt)) return false;
    var delta = MAP_POOL_FT - poolFt;
    var deltaStr = (Math.round(delta * 100) / 100).toFixed(2);
    var poolStr = (Math.round(poolFt * 100) / 100).toFixed(2);
    var when = formatEt(dateTimeIso) || "unknown time";

    lineEl.innerHTML =
      "Pool now <strong>" +
      poolStr +
      " ft</strong> (USGS, provisional) · map drawn at <strong>" +
      MAP_POOL_FT +
      "</strong> · contours about <strong>" +
      deltaStr +
      " ft high</strong> tonight.";

    checkedEl.innerHTML =
      "Last checked USGS param " +
      PARAM +
      ": <time datetime=\"" +
      String(dateTimeIso).replace(/"/g, "") +
      "\">" +
      when +
      "</time>. " +
      '<a href="https://waterdata.usgs.gov/monitoring-location/USGS-03228400/" target="_blank" rel="noopener">Live gauge</a>.';

    return true;
  }

  function parseIv(json) {
    try {
      var series = json && json.value && json.value.timeSeries;
      if (!series || !series.length) return null;
      var values = series[0].values && series[0].values[0] && series[0].values[0].value;
      if (!values || !values.length) return null;
      var latest = values[values.length - 1];
      var n = parseFloat(latest.value, 10);
      if (!isFinite(n) || n <= -99999) return null;
      return { poolFt: n, dateTime: latest.dateTime };
    } catch (e) {
      return null;
    }
  }

  fetch(URL)
    .then(function (res) {
      if (!res.ok) throw new Error("usgs http " + res.status);
      return res.json();
    })
    .then(function (json) {
      var reading = parseIv(json);
      if (!reading) return; // keep static snapshot
      applyReading(reading.poolFt, reading.dateTime);
    })
    .catch(function () {
      // Keep static HTML snapshot — do not invent; do not wipe.
    });
})();
