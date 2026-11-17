/**
 * The Night Bite kill switch. If the service worker ever misbehaves, deploy this file AS sw.js (same path, keep
 * js/sw-update.js as it is). See "Kill switch" in SERVICE-WORKER.md, and tools/check-sw-deploys.cjs (kill-sw-only).
 * It clears every cache whose name starts with "nb-" on install and again on activate (so nothing an old worker
 * saved in between is left), then unregisters and reloads open pages, which then run on the plain network.
 * Each step runs even when the one before it fails.
 */
function clearNb() {
  return caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("nb-") === 0; }).map(function (k) { return caches.delete(k); }));
  }).catch(function () {});
}
self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(clearNb());
});
self.addEventListener("activate", function (event) {
  event.waitUntil(
    clearNb()
      .then(function () { return self.registration.unregister(); }).catch(function () {})
      .then(clearNb)
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
      .catch(function () {})
  );
});
