/**
 * The Night Bite: registers the site's service worker (sw.js at the site root) for offline pages.
 * The root comes from this script's own address, so it works at nightbiteoh.com/ and under a subfolder (the preview copy).
 * Whisperwood pages don't load this script, and sw.js never intercepts whisperwood/ anyway.
 */
(function () {
  if (!("serviceWorker" in navigator) || !window.URL) return;
  var me = document.currentScript;
  if (!me || !me.src) return;
  var root = new URL("../", me.src);   // js/ is one level below the root
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
  function go() {
    navigator.serviceWorker.register(new URL("sw.js", root).href, { scope: root.pathname }).catch(function () {});
  }
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go);
})();
