/**
 * The Night Bite: one shared auto refresh for live data (conditions, alerts, pool readout, pool trend).
 * Every 15 minutes while the tab is visible, plus right away when the tab comes back into view
 * and the last refresh is 15 minutes old or more. Nothing is fetched while the tab is hidden.
 * Scripts register with NightBiteRefresh.add(name, fn); fn(force) re-fetches and re-renders.
 * The first load is done by each script itself through NightBiteRefresh.first(fn): right away when the tab is visible,
 * else once it comes into view (a page opened in a background tab fetches nothing until it is looked at).
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

  // a script's first load: now if the tab is visible, else when it first becomes visible (unless the shared refresh
  // above already ran every task on that same return, so nothing is fetched twice)
  function first(fn) {
    if (!document.hidden) { fn(); return; }
    var runs = stats.runs;
    document.addEventListener("visibilitychange", function go() {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", go);
      if (stats.runs === runs) fn();
    });
  }

  window.NightBiteRefresh = {
    EVERY: EVERY,
    stats: stats,
    add: function (name, fn) { tasks.push({ name: name, fn: fn }); },
    first: first,
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
    // "9:40 PM ET" today in Ohio, "Tue 9:40 PM ET" within the last 6 days, else "Nov. 3, 9:40 PM ET" (saved readings
    // are kept up to 14 days, so a weekday alone could mean two different days)
    when: function (d) {
      d = new Date(d);
      var t = et(d, { hour: "numeric", minute: "2-digit" });
      var sameDay = et(d, { year: "numeric", month: "numeric", day: "numeric" }) === et(new Date(), { year: "numeric", month: "numeric", day: "numeric" });
      if (sameDay) return t + " ET";
      if (Date.now() - d.valueOf() < 6 * 864e5) return et(d, { weekday: "short" }) + " " + t + " ET";
      var MON = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
      return MON[+et(d, { month: "numeric" }) - 1] + " " + et(d, { day: "numeric" }) + ", " + t + " ET";
    },
    label: function (d) { return "Offline. Last updated " + this.when(d) + "."; }
  };
})();
