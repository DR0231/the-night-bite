/**
 * The Night Bite: Hoover map lightbox. Tap the pool card chart to open a larger map of the
 * same traced shoreline with pins for public boat ramps and bait shops (data: js/hoover-map-data.js).
 * Native <dialog>: Esc, the X, a tap outside the panel, or a swipe down on the header closes it.
 * Focus stays inside while open and returns to the chart button on close.
 * Pixel art is shown at whole-number scales only.
 */
(function () {
  var data = window.NightBiteMapData;
  var openBtn = document.getElementById("map-open");
  var dlg = document.getElementById("hoover-map");
  if (!data || !openBtn || !dlg || typeof dlg.showModal !== "function") return;

  var panel = dlg.querySelector(".map-panel");
  var head = dlg.querySelector(".map-head");
  var stage = dlg.querySelector(".map-stage");
  var canvas = dlg.querySelector(".map-canvas");
  var img = canvas.querySelector("img");
  var card = dlg.querySelector(".map-card");
  var closeBtn = dlg.querySelector(".map-close");
  var places = data.places;
  var byId = {};
  places.forEach(function (p) { byId[p.id] = p; });
  var variant = null, scale = 1, lastPin = null;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TYPE = { ramp: "Public boat ramp", shop: "Bait shop", access: "Boardwalk, shore access" };
  var SHORT = { ramp: "Ramp", shop: "Bait shop", access: "Boardwalk" };
  var PIN = { ramp: "assets/map/pin-ramp.png", shop: "assets/map/pin-shop.png", access: "assets/map/pin-access.png" };
  var foot = dlg.querySelector(".map-foot");
  var NOTES = "City park hours are 7 a.m. to 11 p.m. (Columbus Rec and Parks); check posted signs before a night trip. Shoreline traced from a map, not for navigation.";
  var group = null;   // ids that share the pin the current card came from

  function mapsUrl(ll) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(ll[0] + "," + ll[1]);
  }
  function short(src) { return src.split(" (")[0]; }

  /* ---------- layout: pick the variant and the biggest whole-number scale that fits ---------- */
  function layout() {
    var cs = getComputedStyle(stage);
    var padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var availW = stage.clientWidth - padX;
    var other = panel.offsetHeight - stage.offsetHeight;
    var availH = Math.max(160, window.innerHeight - other - 48);
    var best = null;
    Object.keys(data.maps).forEach(function (k) {
      var m = data.maps[k];
      var s = Math.floor(Math.min(availW / m.w, availH / m.h));
      var area = s * s * m.w * m.h;
      if (!best || area > best.area) best = { k: k, s: s, area: area };
    });
    // phones in portrait: never below 2x on the tall map, the stage scrolls instead
    if (best.s < 2) {
      var tall = data.maps["hoover-map-tall"];
      best = { k: "hoover-map-tall", s: Math.max(1, Math.min(2, Math.floor(availW / tall.w))) };
    }
    if (best.k !== variant || best.s !== scale) {
      variant = best.k; scale = best.s;
      var m = data.maps[variant];
      img.src = m.src;
      img.width = m.w * scale;
      img.height = m.h * scale;
      canvas.style.width = m.w * scale + "px";
      canvas.style.height = m.h * scale + "px";
      canvas.setAttribute("data-variant", variant);
      drawPins();
    }
  }

  /* ---------- pins, merged into one cluster pin where sprites would overlap ---------- */
  function drawPins() {
    var keepFocus = document.activeElement && document.activeElement.classList.contains("map-pin");
    canvas.querySelectorAll(".map-pin").forEach(function (n) { n.remove(); });
    var m = data.maps[variant];
    var W = m.w * scale, H = m.h * scale, size = 11 * scale, groups = [];
    places.forEach(function (p) {
      var pos = p.pos[variant], px = pos.x / 100 * W, py = pos.y / 100 * H, g = null;
      for (var i = 0; i < groups.length; i++) {
        if (Math.abs(groups[i].px - px) < size && Math.abs(groups[i].py - py) < size) { g = groups[i]; break; }
      }
      if (g) g.items.push(p); else groups.push({ px: px, py: py, items: [p] });
    });
    groups.forEach(function (g) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "map-pin";
      b.style.left = (g.px / W * 100).toFixed(3) + "%";
      b.style.top = (g.py / H * 100).toFixed(3) + "%";
      b.setAttribute("aria-expanded", "false");
      b.setAttribute("aria-controls", "map-card");
      var pic = document.createElement("img");
      pic.alt = "";
      pic.src = PIN[g.items[0].type];
      pic.width = 9 * scale;
      pic.height = 11 * scale;
      b.appendChild(pic);
      if (g.items.length > 1) {
        var n = document.createElement("span");
        n.className = "map-pin-count";
        n.textContent = g.items.length;
        n.setAttribute("aria-hidden", "true");
        b.appendChild(n);
        b.setAttribute("aria-label", g.items.length + " places: " + g.items.map(function (p) { return p.name; }).join(" and "));
        b.dataset.ids = g.items.map(function (p) { return p.id; }).join(",");
      } else {
        b.setAttribute("aria-label", g.items[0].name + ", " + TYPE[g.items[0].type].toLowerCase());
        b.dataset.ids = g.items[0].id;
      }
      b.addEventListener("click", function () { select(b); });
      canvas.appendChild(b);
    });
    if (keepFocus) { var first = canvas.querySelector(".map-pin"); if (first) first.focus(); }
  }

  /* ---------- the small place card ---------- */
  function row(dl, label, value) {
    var dt = document.createElement("dt"); dt.textContent = label;
    var dd = document.createElement("dd"); dd.textContent = value;
    dl.appendChild(dt); dl.appendChild(dd);
  }
  function link(cls, href, text, label) {
    var a = document.createElement("a");
    a.className = cls; a.href = href; a.textContent = text;
    if (label) a.setAttribute("aria-label", label);
    if (/^https:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  function cardShell(title, eyebrow) {
    card.textContent = "";
    var top = document.createElement("div"); top.className = "map-card-top";
    var wrap = document.createElement("div");
    if (eyebrow) { var e = document.createElement("p"); e.className = "map-card-type"; e.textContent = eyebrow; wrap.appendChild(e); }
    var h = document.createElement("h3"); h.id = "map-card-title"; h.tabIndex = -1; h.textContent = title; wrap.appendChild(h);
    var x = document.createElement("button");
    x.type = "button"; x.className = "map-card-close"; x.textContent = "Back to map";
    x.addEventListener("click", function () { closeCard(true); });
    top.appendChild(wrap); top.appendChild(x);
    card.appendChild(top);
    card.hidden = false;
    if (foot) foot.hidden = true;
    card.setAttribute("aria-labelledby", "map-card-title");
    return h;
  }
  /* Shared pin: a segmented switch between the places on it (any number, labelled by type) */
  function switcher(current) {
    var wrap = document.createElement("div");
    wrap.className = "map-switch";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Places on this pin");
    var types = group.map(function (id) { return byId[id].type; });
    group.forEach(function (id) {
      var q = byId[id], b = document.createElement("button");
      b.type = "button";
      b.className = "map-switch-btn";
      var dup = types.filter(function (t) { return t === q.type; }).length > 1;
      b.textContent = dup ? q.name : SHORT[q.type];
      b.setAttribute("aria-pressed", id === current.id ? "true" : "false");
      if (!dup) b.setAttribute("aria-label", SHORT[q.type] + ": " + q.name);
      b.addEventListener("click", function () {
        if (id === current.id) return;
        showPlace(q);
        var nb = card.querySelector('.map-switch-btn[aria-pressed="true"]');
        if (nb) nb.focus();
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function showPlace(p) {
    var h = cardShell(p.name, TYPE[p.type]);
    card.setAttribute("data-type", p.type);
    if (group && group.length > 1 && group.indexOf(p.id) >= 0) card.insertBefore(switcher(p), card.firstChild);
    var dl = document.createElement("dl"); dl.className = "map-card-facts";
    if (p.address) row(dl, "Address", p.address);
    if (p.parking) row(dl, "Parking", p.parking);
    if (p.restroom) row(dl, "Restroom", p.restroom);
    if (p.lit) row(dl, "Lit at night", p.lit);
    if (p.hours) row(dl, "Hours", p.hours);
    if (p.phoneText) row(dl, "Phone", p.phoneText);
    if (p.note) row(dl, "Notes", p.note);
    card.appendChild(dl);
    if (p.tip) {
      var tip = document.createElement("p");
      tip.className = "map-card-tip";
      var tl = document.createElement("strong");
      tl.textContent = "Tip";
      tip.appendChild(tl);
      tip.appendChild(document.createTextNode(" " + p.tip));
      card.appendChild(tip);
    }
    var acts = document.createElement("div"); acts.className = "map-card-actions";
    acts.appendChild(link("btn map-btn", mapsUrl(p.directions), "Directions", "Directions to " + p.name + " in Google Maps"));
    if (p.phone) acts.appendChild(link("btn btn-ghost map-btn", "tel:" + p.phone, "Call", "Call " + p.name + ", " + p.phoneText));
    card.appendChild(acts);
    // sources and the park notes fold away so the card stays short on phones
    var det = document.createElement("details"); det.className = "map-notes";
    var sum = document.createElement("summary"); sum.textContent = "Sources and notes";
    var src = document.createElement("p"); src.className = "map-card-src";
    src.textContent = "Sources: " + (p.sourceLabels || p.sources.map(short)).join(", ") + ". Anything not listed wasn't confirmed.";
    var nt = document.createElement("p"); nt.textContent = NOTES;
    det.appendChild(sum); det.appendChild(src); det.appendChild(nt);
    card.appendChild(det);
    h.focus();
  }
  function showCluster(ids) {
    var h = cardShell("Two spots close together", "Pick one");
    card.removeAttribute("data-type");
    var ul = document.createElement("ul"); ul.className = "map-card-pick";
    ids.forEach(function (id) {
      var p = byId[id], li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "map-pick-btn";
      b.textContent = p.name;
      var t = document.createElement("span"); t.textContent = TYPE[p.type]; b.appendChild(t);
      b.addEventListener("click", function () { showPlace(p); });
      li.appendChild(b); ul.appendChild(li);
    });
    if (ids.length > 2) h.textContent = ids.length + " spots close together";
    card.appendChild(ul);
    h.focus();
  }
  function select(pin) {
    if (lastPin && lastPin !== pin) lastPin.setAttribute("aria-expanded", "false");
    lastPin = pin;
    pin.setAttribute("aria-expanded", "true");
    var ids = pin.dataset.ids.split(",");
    group = ids;
    if (ids.length > 1) showCluster(ids); else showPlace(byId[ids[0]]);
    // keep the chosen pin in view when the stage scrolls (small phones)
    var r = pin.getBoundingClientRect(), s = stage.getBoundingClientRect();
    if (r.top < s.top || r.bottom > s.bottom) pin.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }
  function closeCard(refocus) {
    card.hidden = true;
    card.textContent = "";
    if (foot) foot.hidden = false;
    if (lastPin) {
      lastPin.setAttribute("aria-expanded", "false");
      if (refocus && lastPin.isConnected) lastPin.focus();
    }
  }

  /* ---------- open / close ---------- */
  function open() {
    closeCard(false);
    dlg.showModal();
    document.documentElement.classList.add("map-open");
    variant = null;
    layout();
    closeBtn.focus();
  }
  function close() {
    if (!dlg.open) return;
    panel.style.transform = "";
    dlg.close();
  }
  dlg.addEventListener("close", function () {
    document.documentElement.classList.remove("map-open");
    closeCard(false);
    openBtn.focus();
  });
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  dlg.addEventListener("cancel", function (e) {
    if (!card.hidden) { e.preventDefault(); closeCard(true); }
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  // with a card open, a tap on the map (not on a pin) folds the card back down to the map
  stage.addEventListener("click", function (e) {
    if (card.hidden || e.target.closest(".map-pin")) return;
    closeCard(true);
  });
  window.addEventListener("resize", function () { if (dlg.open) layout(); });

  // keep Tab inside the dialog (it already makes the page behind inert)
  dlg.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = Array.prototype.filter.call(dlg.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'), function (n) {
      return !n.hidden && n.offsetParent !== null;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // swipe down on the header (grab bar) to close on phones
  var y0 = null, dy = 0;
  head.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    y0 = e.touches[0].clientY; dy = 0;
    panel.classList.add("is-dragging");
  }, { passive: true });
  head.addEventListener("touchmove", function (e) {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    if (!reduce) panel.style.transform = "translateY(" + dy + "px)";
  }, { passive: true });
  function endDrag() {
    if (y0 === null) return;
    panel.classList.remove("is-dragging");
    y0 = null;
    if (dy > 70) close(); else panel.style.transform = "";
    dy = 0;
  }
  head.addEventListener("touchend", endDrag);
  head.addEventListener("touchcancel", endDrag);
})();
