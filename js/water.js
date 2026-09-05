/**
 * Legacy entry — pool + temp refresh lives in js/usgs.js.
 * Kept so older script tags still load the shared USGS IV client.
 */
(function () {
  if (window.__nightbiteUsgsLoaded) return;
  var s = document.createElement("script");
  s.src = (document.currentScript && document.currentScript.src
    ? document.currentScript.src.replace(/water\.js(?:\?.*)?$/, "usgs.js")
    : "js/usgs.js");
  s.async = false;
  document.currentScript
    ? document.currentScript.parentNode.insertBefore(s, document.currentScript.nextSibling)
    : document.head.appendChild(s);
})();
