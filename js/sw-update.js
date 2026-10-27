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
 *
 * Only when it can actually be stale (since v19): workers from v19 on answer a hello message and say their CSS and JS
 * are network first, so a page they controlled can't be mixed and is never reloaded. An older worker that doesn't
 * answer still gets the one reload, and never more than once per deploy (localStorage "nb-sw-healed" holds the
 * version from this script's ?v=). Before this, every returning visitor's home page reloaded itself once after
 * each deploy, which showed up in Cloudflare as home to home "reload" visits.
 */
(function () {
  if (!("serviceWorker" in navigator) || !window.URL) return;
  var me = document.currentScript;
  if (!me || !me.src) return;
  var root = new URL("../", me.src);   // js/ is one level below the root
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  var ver = new URL(me.src).searchParams.get("v") || "unversioned";
  var hadController = !!navigator.serviceWorker.controller, healed = false, safe = false;
  // ask the worker that served this page whether it keeps CSS and JS network first (v19 and newer say yes)
  if (hadController && window.MessageChannel) {
    try {
      var ch = new MessageChannel();
      ch.port1.onmessage = function (e) { if (e.data && e.data.assets === "network-first") safe = true; };
      navigator.serviceWorker.controller.postMessage({ type: "nb-hello" }, [ch.port2]);
    } catch (e) {}
  }
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController || healed || safe) return;          // first visit, or the old worker never mixed versions
    if (window.performance && performance.now() > 20000) return;
    healed = true;
    try {
      if (localStorage.getItem("nb-sw-healed") === ver) return;   // at most once per deploy
      localStorage.setItem("nb-sw-healed", ver);
      var last = +sessionStorage.getItem("nb-sw-healed") || 0;
      if (Date.now() - last < 60000) return;               // and never more than once a minute
      sessionStorage.setItem("nb-sw-healed", String(Date.now()));
    } catch (e) { return; }                                // no storage: can't guard it, so don't reload
    location.reload();
  });

  function go() {
    navigator.serviceWorker.register(new URL("sw.js", root).href, { scope: root.pathname }).catch(function () {});
  }
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go);
})();
