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
 * Only when it can actually be stale. Workers from v135 on answer the hello message with assets "by-deploy": they
 * hand every page the styles and scripts of its own deploy (sw.js, "Deploys never mix" in SERVICE-WORKER.md), so a
 * page they served is never reloaded, unless the worker says "mixed" (it had no network for a newer deploy's files
 * and used a saved copy), in the hello answer or later in an "nb-mixed" message. Workers v19 to v134 (live v41)
 * answer "network-first"; their 4 second fallback could pair a slow page or a slow styles.css with another deploy,
 * so a page they served reloads once when the new worker takes over, but only if the page or one of its styles or
 * scripts took 3.5 seconds or more, or the phone is offline (otherwise nothing could have fallen back). An older
 * worker that doesn't answer still gets the one reload. Never more than once per deploy (localStorage
 * "nb-sw-healed" holds the version from this script's ?v=) and never more than once a minute.
 */
(function () {
  if (!("serviceWorker" in navigator) || !window.URL) return;
  var me = document.currentScript;
  if (!me || !me.src) return;
  var root = new URL("../", me.src);   // js/ is one level below the root
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  var ver = new URL(me.src).searchParams.get("v") || "unversioned";
  var hadController = !!navigator.serviceWorker.controller, healed = false, answer = null;
  // ask the worker that served this page how it picks styles and scripts
  if (hadController && window.MessageChannel) {
    try {
      var ch = new MessageChannel();
      ch.port1.onmessage = function (e) {
        answer = e.data || {};
        if (answer.mixed) heal();
      };
      navigator.serviceWorker.controller.postMessage({ type: "nb-hello" }, [ch.port2]);
    } catch (e) {}
  }

  // a v19 to v134 worker only fell back to a saved copy after 4 seconds, or with no network at all
  function slowOrOffline() {
    if (navigator.onLine === false) return true;
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      if (nav && nav.responseEnd - nav.startTime >= 3500) return true;
      return performance.getEntriesByType("resource").some(function (r) {
        return r.name.indexOf(root.href) === 0 && /\.(css|js)(\?|$)/.test(r.name) && r.duration >= 3500;
      });
    } catch (e) { return true; }
  }

  function heal() {
    if (healed) return;
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
  }

  // v135 and newer: the worker says when it had to give this page another deploy's file
  navigator.serviceWorker.addEventListener("message", function (e) {
    if (e.data && e.data.type === "nb-mixed") heal();
  });
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController) return;                            // first visit: nothing old on the page
    if (answer && answer.assets === "by-deploy") return;   // that worker never mixed deploys
    if (answer && answer.assets === "network-first" && !slowOrOffline()) return;
    heal();
  });

  function go() {
    navigator.serviceWorker.register(new URL("sw.js", root).href, { scope: root.pathname }).catch(function () {});
  }
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go);
})();
