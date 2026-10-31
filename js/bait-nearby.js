/**
 * The Night Bite: "Bait nearby" card on each lake home.
 * Reads data/bait-shops.json and shows the closest bait and tackle shops for the active lake
 * (window.NightBiteLake.id): three rows, the rest under "More shops". No hours, on purpose.
 * Default order is drive time from the lake. A lake with no confirmed shop gets "No shops confirmed yet".
 *
 * Sort by my location: asks for location only when tapped (same approach as the picker's Near me).
 * If the browser already reports geolocation as "granted", it sorts quietly on load.
 * The position stays in this page's memory only: never stored, never sent anywhere.
 * From you: straight line km x 1.4 at 50 km/h + 3 min, rounded to 5, at least 5 (same estimate the
 * data uses for shops close to a lake). Denied, unavailable, slow (8 s) or unsupported: lake order stays.
 */
(function () {
  var card = document.getElementById("bait-nearby");
  if (!card) return;
  var list = card.querySelector(".bait-list");
  var more = card.querySelector(".bait-more");
  var moreList = card.querySelector(".bait-more-list");
  var status = card.querySelector(".bait-status");
  var tools = card.querySelector(".bait-tools");
  var near = card.querySelector(".bait-near");
  var loc = card.querySelector(".bait-loc");
  var tell = card.querySelector(".bait-tell");
  var SHOW = 3, WAIT = 8000;
  var L = window.NightBiteLake || {};
  var id = L.id || "hoover";
  var short = (L.cfg && (L.cfg.short || L.cfg.name)) || "the lake";
  var shops = [];
  var here = null;      // { lat, lng } for this page view only
  var asking = false;
  var blocked = false;  // denied once: don't ask again on this page

  if (tell) tell.href = "mailto:contact@nightbiteoh.com?subject=" + encodeURIComponent("Bait shop near " + short);

  function km(a, b) {
    var r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function fromYou(s) {
    var m = km(here, s) * 1.4 * 60 / 50 + 3;
    return Math.max(5, Math.round(m / 5) * 5);
  }

  function row(s, min, you) {
    var li = document.createElement("li");
    li.className = "bait-row";
    var info = document.createElement("div");
    info.className = "bait-info";
    var name = document.createElement("span");
    name.className = "bait-name";
    name.textContent = s.name;
    var time = document.createElement("span");
    time.className = "bait-time";
    time.textContent = "about " + min + " min" + (you ? " from you" : "");
    info.appendChild(name);
    info.appendChild(time);
    var a = document.createElement("a");
    a.className = "btn btn-ghost bait-go";
    // q: an exact search for a shop whose name and address open a different listing (another business at the same address)
    a.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.q || (s.name + " " + s.address));
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Directions";
    a.setAttribute("aria-label", "Directions to " + s.name + " (opens Google Maps)");
    li.appendChild(info);
    li.appendChild(a);
    return li;
  }

  function paint() {
    var you = !!here;
    var rows = shops.map(function (s, i) { return { s: s, i: i, min: you ? fromYou(s) : s.min, d: you ? km(here, s) : 0 }; });
    rows.sort(function (a, b) { return a.min - b.min || (you ? a.d - b.d : 0) || a.i - b.i; });
    list.textContent = "";
    moreList.textContent = "";
    rows.forEach(function (r, i) { (i < SHOW ? list : moreList).appendChild(row(r.s, r.min, you)); });
    list.hidden = false;
    more.hidden = rows.length <= SHOW;
    status.hidden = true;
    card.setAttribute("data-sort", you ? "you" : "lake");
    near.setAttribute("aria-pressed", you ? "true" : "false");
    near.textContent = you ? "Back to lake order" : "Sort by my location";
  }

  function say(text) { loc.textContent = text; loc.hidden = !text; }

  function fallback(denied) {
    asking = false;
    near.disabled = false;
    if (denied) blocked = true;
    if (here) return;
    card.setAttribute("data-sort", "lake");
    say("Location off, sorted from the lake.");
  }

  function locate(quiet) {
    if (asking) return;
    if (!navigator.geolocation) { say("Location off, sorted from the lake."); return; }
    asking = true;
    near.disabled = true;
    if (!quiet) say("Finding shops near you\u2026");
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; fallback(false); } }, WAIT + 500);
    navigator.geolocation.getCurrentPosition(function (p) {
      clearTimeout(timer);
      done = true;
      asking = false;
      near.disabled = false;
      here = { lat: p.coords.latitude, lng: p.coords.longitude };
      paint();
      say("Sorted from your location. It stays on this device.");
    }, function (err) {
      clearTimeout(timer);
      if (done) return;
      done = true;
      fallback(err && err.code === 1);
    }, { enableHighAccuracy: false, timeout: WAIT, maximumAge: 600000 });
  }

  near.addEventListener("click", function () {
    if (here) { here = null; paint(); say(""); return; }
    if (blocked) { say("Location off, sorted from the lake."); return; }
    locate(false);
  });

  function none() {
    list.hidden = true;
    more.hidden = true;
    tools.hidden = true;
    status.textContent = "No shops confirmed yet near " + short + ".";
    status.hidden = false;
    card.setAttribute("data-state", "none");
  }

  fetch("data/bait-shops.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      shops = ((d && d.lakes && d.lakes[id]) || []).filter(function (s) { return s && s.name; });
      if (!shops.length) return none();
      paint();
      var canLocate = navigator.geolocation && shops.every(function (s) { return typeof s.lat === "number" && typeof s.lng === "number"; });
      tools.hidden = false;
      if (!canLocate) { near.hidden = true; say("Location off, sorted from the lake."); }
      card.setAttribute("data-state", "ready");
      if (canLocate && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (p) {
          if (p.state === "granted") locate(true);
          else if (p.state === "denied") blocked = true;
        }).catch(function () {});
      }
    })
    .catch(function () {
      list.hidden = true;
      more.hidden = true;
      tools.hidden = true;
      status.textContent = "Shop list didn't load. Try again when you have signal.";
      status.hidden = false;
      card.setAttribute("data-state", "error");
    });
})();
