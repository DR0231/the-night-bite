/**
 * The Night Bite: permanent "Get the app" card on the Home page (#get-the-app).
 *  · Opens the steps for the phone you're on (iPhone or Android); both open when the footer link brings you here
 *    from a computer.
 *  · Shows a real Install button whenever the browser offers beforeinstallprompt (Android Chrome, desktop Chrome/Edge).
 *    The event is shared with install-tip.js through window.nbInstallEvent so it is only prompted once.
 *  · Running from the home screen already: the steps are swapped for "You're using the app".
 */
(function () {
  var card = document.getElementById("get-the-app");
  if (!card) return;
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
  var standalone = mm("(display-mode: standalone)") || mm("(display-mode: fullscreen)") || mm("(display-mode: minimal-ui)") || navigator.standalone === true;
  var ua = navigator.userAgent || "";
  var ios = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var os = ios ? "ios" : android ? "android" : "other";
  card.setAttribute("data-os", os);

  var steps = card.querySelector(".get-app-steps");
  var lead = card.querySelector(".get-app-lead");
  var using = card.querySelector(".get-app-using");
  var installRow = card.querySelector(".get-app-install");
  var btn = card.querySelector(".get-app-btn");
  var status = card.querySelector(".get-app-status");
  var panels = card.querySelectorAll("details[data-os]");

  function setUsing(msg) {
    card.setAttribute("data-state", "app");
    if (steps) steps.hidden = true;
    if (lead) lead.hidden = true;
    if (installRow) installRow.hidden = true;
    if (using) { using.hidden = false; if (msg) using.textContent = msg; }
  }
  if (standalone) { setUsing(); return; }

  // open the steps for this phone
  for (var i = 0; i < panels.length; i++) {
    if (panels[i].getAttribute("data-os") === os) panels[i].open = true;
  }
  function openForVisit() {
    if (location.hash !== "#get-the-app") return;
    var any = false;
    for (var i = 0; i < panels.length; i++) if (panels[i].getAttribute("data-os") === os) { panels[i].open = true; any = true; }
    if (!any) for (var j = 0; j < panels.length; j++) panels[j].open = true;
  }
  openForVisit();
  window.addEventListener("hashchange", openForVisit);

  // Arriving from the footer link on another page: the readings and charts above load after the jump and push
  // the card down, so keep it at the top until the page settles or the reader scrolls on their own.
  if (location.hash === "#get-the-app" && window.ResizeObserver) {
    var stop = false, until = Date.now() + 4000;
    var quit = function () { stop = true; };
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) { window.addEventListener(t, quit, { once: true, passive: true }); });
    var keep = function () {
      if (stop || Date.now() > until) { ro.disconnect(); return; }
      var top = card.getBoundingClientRect().top;
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (Math.abs(top - pad) > 2) { try { card.scrollIntoView({ block: "start", behavior: "instant" }); } catch (e) { card.scrollIntoView(true); } }
    };
    var ro = new ResizeObserver(keep);
    ro.observe(document.body);
    window.addEventListener("load", keep);
    setTimeout(function () { ro.disconnect(); }, 4100);
  }

  function showButton() {
    if (!installRow) return;
    installRow.hidden = !window.nbInstallEvent;
  }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();          // keep it for our Install button instead of the browser's mini bar
    window.nbInstallEvent = e;
    showButton();
  });
  document.addEventListener("nb-install-change", showButton);
  showButton();

  if (btn) btn.addEventListener("click", function () {
    var ev = window.nbInstallEvent;
    if (!ev) return showButton();
    window.nbInstallEvent = null;
    document.dispatchEvent(new CustomEvent("nb-install-change"));
    ev.prompt();
    (ev.userChoice || Promise.resolve({})).then(function (c) {
      if (c && c.outcome === "accepted") setUsing("Installed. Open The Night Bite from your home screen.");
      else if (status) status.textContent = "No problem. The steps above still work any time.";
    }, function () {});
  });
  window.addEventListener("appinstalled", function () {
    window.nbInstallEvent = null;
    setUsing("Installed. Open The Night Bite from your home screen.");
  });
})();
