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
 * “unavailable, check USGS”. #correction-line carries data-source="live|saved|snapshot|old" and data-refresh-failed,
 * which js/glance.js reads for its "last updated X hours ago" line. Never invent readings.
 * Freshness (Nov. 12, 2026): a reading older than 6 hours is never tagged or shared as live; the newest one is shown as
 * the last reading with its time (data-source="old"). The card is tagged live only when the level itself refreshed, so a
 * temp that arrives alone updates the temp detail but never moves the pool line or its Checked time. Only a fresh lake
 * surface temp, with its time, goes to the bite rating (js/conditions.js also drops it after 3 hours).
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

  // A gauge reading older than this is never shown or used as live (D'Angelo, Nov. 12, 2026). USGS posts every 15 to
  // 60 minutes, so a reading this old means the sensor stopped (winter temp probes do); the card then says so plainly.
  var MAX_AGE = 6 * 36e5;
  function msOf(x) { var t = x && Date.parse(x.dateTime); return isFinite(t) ? t : NaN; }
  function fresh(x) { var t = msOf(x); return isFinite(t) && Date.now() - t <= MAX_AGE; }
  function near(a, b) { var s = msOf(a), t = msOf(b); return isFinite(s) && isFinite(t) && Math.abs(s - t) <= MAX_AGE; }
  function shownAt() {   // the time of the reading on the card now (the Checked <time>), 0 if none
    var t = checkedEl && checkedEl.querySelector("time");
    var v = t ? Date.parse(t.getAttribute("datetime")) : NaN;
    return isFinite(v) ? v : 0;
  }

  // the water temp for the bite rating and "Tonight, in short" (js/conditions.js): a fresh lake surface reading only,
  // with its time; null clears it. Never an outflow, saved or old reading.
  function shareTemp(tempF, at) {
    window.NightBiteWaterF = tempF;
    window.NightBiteWaterAt = tempF !== null ? at : null;
    try { document.dispatchEvent(new CustomEvent("nb:usgs", { detail: { tempF: tempF, at: tempF !== null ? at : null } })); } catch (e) {}
  }

  // the water temp detail line: a reading with its own time; an old one says "last reading"; none says so
  function writeTemp(temp, old) {
    if (!tempEl || !PARAM_TEMP) return;
    var t = temp || old;
    var c = t && t.value;
    if (typeof c === "number" && isFinite(c)) {
      tempEl.innerHTML =
        "<strong>" + cToF(c) + " °F</strong> (" + (Math.round(c * 10) / 10).toFixed(1) + " °C) · " +
        (temp ? "" : "<span>last reading</span> ") +   // pg.last_reading
        "<time datetime=\"" + String(t.dateTime).replace(/"/g, "") + "\">" + (formatEt(t.dateTime) || "") + "</time>";
    } else {
      tempEl.textContent = "No water temp reading in 6 hours";   // pg.no_temp_6h
    }
  }

  // writes the pool line and its Checked time. Only ever called with a level: the line and Checked always describe
  // the same reading, so a temp that arrives alone never moves Checked (or the line) forward.
  function applyPoolAndTemp(pool, temp, out) {
    var poolFt = pool && pool.value;
    var tempC = temp && temp.value;
    var tempF =
      typeof tempC === "number" && isFinite(tempC) ? cToF(tempC) : null;
    var outF = tempF === null && out && typeof out.f === "number" && isFinite(out.f) ? out.f : null;
    if (!(typeof poolFt === "number" && isFinite(poolFt))) return false;

    if (lineEl) {
      lineEl.textContent = humanLead(poolFt, tempF !== null ? tempF : outF, outF !== null);
      lineEl.removeAttribute("data-live-failed");
    }

    var when = formatEt(pool.dateTime) || "unknown time";
    var safeIso = String(pool.dateTime || "").replace(/"/g, "");

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
      writeTemp(temp, null);
    } else if (tempEl && outF !== null) {
      // outflow water temperature from the Corps: labelled outflow, linked to the Corps project page
      tempEl.innerHTML =
        "<strong>" + outF + " °F</strong> outflow (" + out.c.toFixed(1) + " °C) · <time datetime=\"" +
        String(out.dateTime).replace(/"/g, "") + "\">" + (formatEt(out.dateTime) || when) + "</time> · " +
        '<a href="' + OUTFLOW.url + '" target="_blank" rel="noopener">USACE outflow gauge</a>';
    }
    return true;
  }

  var hadLive = false;
  var SAVE_KEY = LK ? LK.key("nb-usgs-last") : "nb-usgs-last";
  // which gauge a saved reading came from: a deploy that moves a lake to another gauge or parameter drops the old one
  var GAUGE_ID = CWMS ? "cwms:" + ((LP && LP.office) || "") + ":" + ((LP && LP.ts) || "") : SITE + ":" + PARAM_POOL + ":" + (PARAM_TEMP || "");
  var OFF = window.NightBiteOffline;

  // offline, or a live refresh that failed: show the last saved live reading if it's newer than the snapshot baked
  // into the page, else keep the baked snapshot. failed: say the refresh failed instead of "Offline."
  // A saved reading is shown with its time and never shared with the bite rating.
  function showSaved(failed) {
    var saved = OFF ? OFF.load(SAVE_KEY, 14 * 864e5) : null;
    if (saved && saved.g !== GAUGE_ID) saved = null;
    var bakedAt = shownAt();
    var at = null;
    var src = "snapshot";
    if (saved && saved.pool && msOf(saved.pool) >= (bakedAt || 0) && applyPoolAndTemp(saved.pool, saved.temp, saved.out)) {
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

  // the level refresh failed (or brought nothing new): keep what is on the card, with its time, and say so
  function keepLast() {
    if (OFF && OFF.isOffline()) {
      if (hadLive) {
        var last = OFF.load(SAVE_KEY);
        if (statusEl && last && last.pool) statusEl.textContent = OFF.label(new Date(last.pool.dateTime));
        if (lineEl) lineEl.setAttribute("data-offline", "1");
        return;
      }
      if (showSaved()) return;
    }
    if (hadLive) {
      // a failed auto refresh keeps the last live reading on screen
      if (statusEl) statusEl.innerHTML = 'Refresh failed, check <a href="' + GAUGE_URL + '" target="_blank" rel="noopener">' + SRC_NAME + '</a>. Showing the last reading.';   // pg.refresh_failed_short
      if (lineEl) lineEl.setAttribute("data-refresh-failed", "1");
      return;
    }
    // USGS or the Corps blocked or down: keep the last reading with its time, never blank the card
    if (showSaved(true)) return;
    unavailable("unavailable, check " + SRC_NAME);
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

  // each load gets a number; an answer from an older load that arrives after a newer one started is dropped, so a
  // slow early response can never overwrite a newer reading (the newer load reports its own success or failure)
  var seq = 0;
  function load() {
    var mine = ++seq;
    getReadings()
      .then(function (r) {
        if (mine !== seq) return;
        // only readings from the last 6 hours count as live; older ones are kept aside to show plainly, with their time
        var pool = fresh(r.pool) ? r.pool : null;
        var temp = fresh(r.temp) ? r.temp : null;
        var out = r.out && fresh(r.out) ? r.out : null;
        var oldPool = !pool && r.pool && isFinite(msOf(r.pool)) ? r.pool : null;
        var oldTemp = !temp && r.temp && isFinite(msOf(r.temp)) ? r.temp : null;

        if (pool) {
          // the level itself refreshed: the only case the card is tagged live
          applyPoolAndTemp(pool, temp, out);
          if (!temp) writeTemp(null, oldTemp);
          shareTemp(temp ? cToF(temp.value) : null, temp ? temp.dateTime : null);
          hadLive = true;
          if (OFF) OFF.save(SAVE_KEY, { pool: pool, temp: temp, out: out, g: GAUGE_ID });
          if (lineEl) { lineEl.removeAttribute("data-offline"); lineEl.removeAttribute("data-refresh-failed"); lineEl.setAttribute("data-source", "live"); }
          if (OFF && OFF.isOffline() && statusEl) {
            // the browser answered from its own HTTP cache while offline: say how old it is
            statusEl.textContent = OFF.label(new Date(pool.dateTime));
            if (lineEl) lineEl.setAttribute("data-offline", "1");
            return;
          }
          if (statusEl) {
            var bits = ["pool"];
            if (temp) bits.push("temp");
            statusEl.textContent =
              "Live " + SRC_NAME + " refresh updated " + bits.join(" + ") + " (provisional).";
          }
          if (!PARAM_TEMP && OUTFLOW && out && statusEl) {
            statusEl.textContent += " USACE outflow temp updated; it is not lake surface temperature.";   // pg.live_pool_out, one node
          } else if (!PARAM_TEMP && PROFILE && statusEl) {
            statusEl.textContent += " No live water temp; the Corps posts a temperature profile.";   // pg.live_pool_prof, one node
          } else if (!PARAM_TEMP && !OUTFLOW && statusEl) {
            statusEl.textContent += " No public water temp gauge on this lake.";   // pg.live_pool, one node
          } else if (!(temp || out) && statusEl) {
            var miss = OUTFLOW ? "outflow temp" : "temp";
            // each piece its own text node so js/i18n.js can match it (pg.live_*_p, pg.miss_*)
            statusEl.innerHTML =
              "<span>" + statusEl.innerHTML +
              "</span> · <span>" +
              miss +
              ' unavailable, check</span> <a href="' +
              (miss === "outflow temp" ? OUTFLOW.url : GAUGE_URL) +
              '" target="_blank" rel="noopener">' + (miss === "outflow temp" ? "USACE" : SRC_NAME) + '</a>.';
          }
          return;
        }

        // no level from the last 6 hours. A fresh temp is still live in its own right: the temp detail and the bite
        // rating get it with its own time, but the pool line keeps its level, its temp and its Checked time.
        shareTemp(temp ? cToF(temp.value) : null, temp ? temp.dateTime : null);
        var useOld = oldPool && msOf(oldPool) > shownAt() && !(OFF && OFF.isOffline());
        if (useOld) {
          // the gauge's newest level is older than 6 hours: show it plainly as the last reading, never as live
          applyPoolAndTemp(oldPool, oldTemp && near(oldTemp, oldPool) ? oldTemp : null, null);
          if (lineEl) { lineEl.removeAttribute("data-offline"); lineEl.removeAttribute("data-refresh-failed"); lineEl.setAttribute("data-source", "old"); }
          if (statusEl) {
            statusEl.innerHTML = '<span>No new reading in 6 hours, check</span> <a href="' + GAUGE_URL + '" target="_blank" rel="noopener">' + SRC_NAME +   // pg.no_new_6h
              '</a>. <span>Showing the reading from ' + (OFF ? OFF.when(new Date(msOf(oldPool))) : formatEt(oldPool.dateTime)) + '.</span>';   // pg.showing_from
          }
        } else {
          keepLast();
          if (temp && statusEl && !(OFF && OFF.isOffline())) {
            statusEl.innerHTML = "<span>Live " + SRC_NAME + " refresh updated temp (provisional).</span> · <span>pool unavailable, check</span> " +   // pg.live_temp_p, pg.miss_pool
              '<a href="' + GAUGE_URL + '" target="_blank" rel="noopener">' + SRC_NAME + '</a>.';
          }
        }
        writeTemp(temp, oldTemp);
      })
      .catch(function () {
        if (mine !== seq) return;
        keepLast();
      });
  }

  // first load once the tab is visible (js/refresh.js), then every 15 minutes while visible
  if (window.NightBiteRefresh && window.NightBiteRefresh.first) window.NightBiteRefresh.first(load); else load();
  if (window.NightBiteRefresh) window.NightBiteRefresh.add("usgs", load);
})();
