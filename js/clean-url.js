/**
 * The Night Bite: show the clean URL in the address bar when a page is opened
 * at its .html twin (/water.html, /hoover/index.html).
 *
 * Uses history.replaceState only, so the page does not reload or flash. It
 * never assigns location, so it cannot loop. GitHub Pages already serves
 * /water from water.html and /hoover/ from hoover/index.html; adding a
 * trailing slash to /water would 404, and dropping the slash from /hoover/
 * would break lake pages that use <base href="../">. whisperwood.html is
 * the official URL for that page and is left alone. Query and hash stay.
 */
(function () {
  try {
    var path = location.pathname;
    if (!/\.html$/i.test(path)) return;
    if (/\/whisperwood\.html$/i.test(path)) return;
    var next;
    if (/\/index\.html$/i.test(path)) next = path.replace(/\/index\.html$/i, "/");
    else next = path.replace(/\.html$/i, "");
    if (!next || next === path) return;
    history.replaceState(history.state, "", next + location.search + location.hash);
  } catch (e) {}
})();
