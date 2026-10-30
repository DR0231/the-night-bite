/* The Night Bite: new vs returning visit tally. Once a day per device, sends only {k:"new"|"returning", s:"live"|"preview"}.
   No ID, no fingerprint, nothing personal. Stores one date in localStorage (nb-visit-day). Skips bots, headless test
   runs, Do Not Track, Global Privacy Control and browsers without storage. Counter: nightbite-visits Worker (D1). */
(function () {
  try {
    var h = location.hostname, s = h === "nightbiteoh.com" ? "live" : h === "dr0231.github.io" ? "preview" : "";
    var n = navigator;
    if (!s || n.webdriver || /HeadlessChrome/.test(n.userAgent) || n.doNotTrack === "1" || window.doNotTrack === "1" || n.globalPrivacyControl) return;
    var ls = window.localStorage, key = "nb-visit-day", d = new Date();
    var today = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    var last = ls.getItem(key);
    if (last === today) return;
    ls.setItem(key, today);
    if (ls.getItem(key) !== today) return;
    var url = "https://nightbite-visits.nightbiteoh.workers.dev/hit", body = JSON.stringify({ k: last ? "returning" : "new", s: s });
    if (!(n.sendBeacon && n.sendBeacon(url, body)) && window.fetch) fetch(url, { method: "POST", body: body, keepalive: true, credentials: "omit" }).catch(function () {});
  } catch (e) {}
})();
