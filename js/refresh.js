/**
 * The Night Bite: one shared auto refresh for live data (conditions, alerts, pool readout, pool trend).
 * Every 15 minutes while the tab is visible, plus right away when the tab comes back into view
 * and the last refresh is 15 minutes old or more. Nothing is fetched while the tab is hidden.
 * Scripts register with NightBiteRefresh.add(name, fn); fn(force) re-fetches and re-renders.
 * The first load is done by each script itself, so add() only stamps the time.
 */
(function () {
  if (window.NightBiteRefresh) return;
  var EVERY = 15 * 60 * 1000;
  var tasks = [];
  var last = Date.now();
  var stats = { runs: 0, lastRun: last, byTask: {} };

  function runAll(reason) {
    if (document.hidden) return;
    last = Date.now();
    stats.runs++;
    stats.lastRun = last;
    stats.lastReason = reason;
    tasks.forEach(function (t) {
      stats.byTask[t.name] = (stats.byTask[t.name] || 0) + 1;
      try { t.fn(true); } catch (e) {}
    });
  }

  // a short tick, so a timer that was throttled in a background tab still catches up on time
  setInterval(function () {
    if (!document.hidden && Date.now() - last >= EVERY) runAll("timer");
  }, 60 * 1000);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && Date.now() - last >= EVERY) runAll("visible");
  });

  // back online after being offline: refresh right away instead of waiting for the next tick
  var wentOffline = navigator.onLine === false;   // also true when the page itself opened offline
  window.addEventListener("offline", function () { wentOffline = true; });
  window.addEventListener("online", function () {
    if (wentOffline && !document.hidden) { wentOffline = false; runAll("online"); }
  });

  window.NightBiteRefresh = {
    EVERY: EVERY,
    stats: stats,
    add: function (name, fn) { tasks.push({ name: name, fn: fn }); },
    run: runAll
  };
})();

/**
 * NightBiteOffline: keeps the last good live readings in localStorage so the home page can show them,
 * clearly labelled, when the phone is offline. Values are only ever ones a live fetch returned.
 */
(function () {
  if (window.NightBiteOffline) return;
  function et(d, opts) {
    opts.timeZone = "America/New_York";
    return new Intl.DateTimeFormat("en-US", opts).format(d);
  }
  window.NightBiteOffline = {
    save: function (key, obj) {
      try { obj.savedAt = Date.now(); localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
    },
    load: function (key, maxAgeMs) {
      try {
        var o = JSON.parse(localStorage.getItem(key) || "null");
        if (o && (!maxAgeMs || Date.now() - o.savedAt < maxAgeMs)) return o;
      } catch (e) {}
      return null;
    },
    isOffline: function () { return navigator.onLine === false; },
    // "9:40 PM ET", or "Tue 9:40 PM ET" when it isn't today in Ohio
    when: function (d) {
      d = new Date(d);
      var t = et(d, { hour: "numeric", minute: "2-digit" });
      var sameDay = et(d, { year: "numeric", month: "numeric", day: "numeric" }) === et(new Date(), { year: "numeric", month: "numeric", day: "numeric" });
      return (sameDay ? "" : et(d, { weekday: "short" }) + " ") + t + " ET";
    },
    label: function (d) { return "Offline. Last updated " + this.when(d) + "."; }
  };
})();
