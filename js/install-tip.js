/**
 * The Night Bite: one time "Add to home screen" tip, phones only, Home page only.
 *  · Android / Chrome: waits for beforeinstallprompt and shows an Install button.
 *  · iOS Safari: shows the Share, then "Add to Home Screen" steps.
 *  · Never shows when already running from the home screen, or after it's been closed or used once
 *    (localStorage nb-install-tip-v1).
 *  · Shares the install prompt with the Get the app card (get-app.js) through window.nbInstallEvent.
 */
(function () {
  var KEY = "nb-install-tip-v1";
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
  function done() { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  var standalone = mm("(display-mode: standalone)") || mm("(display-mode: fullscreen)") || mm("(display-mode: minimal-ui)") || navigator.standalone === true;
  var phone = mm("(max-width: 767px)") && (mm("(pointer: coarse)") || "ontouchstart" in window);
  if (standalone || !phone || done()) return;

  var ua = navigator.userAgent || "";
  var ios = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var iosSafari = ios && /Safari\//.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram)/.test(ua);

  var tip = null, deferred = null;

  function close(how) {
    remember(how || "dismissed");
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    tip = null;
  }

  function build(kind) {
    if (tip || done()) return;
    tip = document.createElement("aside");
    tip.className = "install-tip";
    tip.id = "install-tip";
    tip.setAttribute("aria-label", "Add The Night Bite to your home screen");
    tip.setAttribute("data-kind", kind);
    var icon = document.createElement("img");
    icon.src = (document.querySelector('link[rel="icon"][type="image/svg+xml"]') || {}).href || "";
    icon.alt = "";
    icon.width = 32;     // the 32 px pixel lantern at 1x
    icon.height = 32;
    icon.className = "install-tip-icon";
    var body = document.createElement("div");
    body.className = "install-tip-body";
    var title = document.createElement("p");
    title.className = "install-tip-title";
    title.textContent = "Keep The Night Bite on your phone";
    var text = document.createElement("p");
    text.className = "install-tip-text";
    body.appendChild(title);
    body.appendChild(text);
    var actions = document.createElement("div");
    actions.className = "install-tip-actions";
    if (kind === "android") {
      text.textContent = "Opens like an app, and the pages you've visited still open at the lake without signal.";
      var install = document.createElement("button");
      install.type = "button";
      install.className = "install-tip-btn is-primary";
      install.textContent = "Install";
      install.addEventListener("click", function () {
        var ev = window.nbInstallEvent || deferred;
        deferred = null;
        window.nbInstallEvent = null;
        document.dispatchEvent(new CustomEvent("nb-install-change"));
        if (!ev) return close("dismissed");
        ev.prompt();
        (ev.userChoice || Promise.resolve({})).then(function (c) {
          close(c && c.outcome === "accepted" ? "installed" : "dismissed");
        }, function () { close("dismissed"); });
      });
      actions.appendChild(install);
    } else {
      text.appendChild(document.createTextNode("Tap "));
      var share = document.createElement("span");
      share.className = "install-tip-share";
      share.setAttribute("role", "img");
      share.setAttribute("aria-label", "Share");
      text.appendChild(share);
      text.appendChild(document.createTextNode(" Share, then \u201cAdd to Home Screen\u201d. Pages you've visited still open without signal."));
    }
    var no = document.createElement("button");
    no.type = "button";
    no.className = "install-tip-btn";
    no.textContent = "Not now";
    no.addEventListener("click", function () { close("dismissed"); });
    actions.appendChild(no);
    body.appendChild(actions);
    tip.appendChild(icon);
    tip.appendChild(body);
    document.body.appendChild(tip);
    remember("shown");   // one time: it won't come back on later visits, even if it's just ignored
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape" && tip) { close("dismissed"); document.removeEventListener("keydown", esc); }
    });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    window.nbInstallEvent = e;
    if (done()) return;
    e.preventDefault();   // show our own one time tip instead of the browser's mini bar
    deferred = e;
    build("android");
  });
  // the Get the app card used the prompt: the tip's Install button has nothing left to open
  document.addEventListener("nb-install-change", function () {
    if (!window.nbInstallEvent && tip && tip.getAttribute("data-kind") === "android") close("dismissed");
  });
  window.addEventListener("appinstalled", function () { close("installed"); });
  if (iosSafari) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { build("ios"); });
    else build("ios");
  }
})();
