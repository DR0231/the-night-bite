/**
 * The Night Bite: registers the site's service worker (sw.js at the site root) for offline pages, and heals a
 * page that an older service worker put together from mixed versions.
 * The root comes from this script's own address, so it works at nightbiteoh.com/ and under a subfolder (the preview copy).
 * Whisperwood pages don't load this script, and sw.js never intercepts whisperwood/ anyway.
 *
 * Why the reload: service workers before v12 served CSS and JS from their cache first. Right after a deploy that
 * meant fresh HTML (and brand new scripts) next to last version's styles.css and hoover-map.js, so new parts of
 * the page showed up unstyled or wired to the old code. This file has a new name on purpose: an old worker has
 * never cached it, so it always comes from the network and runs. When the new worker takes over a page that an
 * older one was already controlling, the page reloads once, within the first few seconds only, so nobody loses
 * what they're doing.
 */
(function () {
  if (!("serviceWorker" in navigator) || !window.URL) return;
  var me = document.currentScript;
  if (!me || !me.src) return;
  var root = new URL("../", me.src);   // js/ is one level below the root
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  var hadController = !!navigator.serviceWorker.controller, healed = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController || healed) return;                  // first visit: nothing stale to heal
    if (window.performance && performance.now() > 20000) return;
    healed = true;
    try {
      var last = +sessionStorage.getItem("nb-sw-healed") || 0;
      if (Date.now() - last < 60000) return;               // never more than once a minute
      sessionStorage.setItem("nb-sw-healed", String(Date.now()));
    } catch (e) {}
    location.reload();
  });

  function go() {
    navigator.serviceWorker.register(new URL("sw.js", root).href, { scope: root.pathname }).catch(function () {});
  }
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go);
})();
