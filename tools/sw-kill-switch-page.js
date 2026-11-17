/**
 * The Night Bite kill switch, page side. Only for later, once tools/sw-kill-switch.js has been live as sw.js for a
 * few weeks and you want pages to stop registering for good: then this can replace the body of js/sw-update.js.
 * Never deploy it on its own or together with the kill switch worker as the first step: unregistering from the page
 * can beat the kill switch worker to it, and an unregistered worker never activates, so it never clears the caches
 * (N3 in the Nov. 13, 2026 verification run). That's why this script clears the "nb-" caches itself, before and
 * after it unregisters, and once more after the page loads (an old worker still controlling this page can save
 * a copy in between). It only unregisters workers whose scope is this site's root.
 */
(function () {
  if (!("serviceWorker" in navigator)) return;
  var me = document.currentScript, root = me && me.src ? new URL("../", me.src).href : null;
  function clearNb() {
    if (!window.caches) return Promise.resolve();
    return caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("nb-") === 0; }).map(function (k) { return caches.delete(k); }));
    }).catch(function () {});
  }
  clearNb()
    .then(function () { return navigator.serviceWorker.getRegistrations(); })
    .then(function (rs) { return Promise.all(rs.filter(function (r) { return !root || r.scope === root; }).map(function (r) { return r.unregister(); })); })
    .catch(function () {})
    .then(clearNb);
  window.addEventListener("load", function () { setTimeout(clearNb, 3000); });
})();
