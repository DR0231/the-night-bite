/**
 * The Night Bite: lake picker. The header pill (button.lake-pill, static markup on every page) opens a frosted
 * glass sheet with one card per lake in a scroll-snap carousel. Neighbors peek in at the sides; the centered card
 * is full size and opacity.
 *   Move: swipe left or right (native scroll snap), swipe up or down on the cards, arrow keys, Home and End,
 *         the mouse wheel, or tap a side card to bring it to the middle.
 *   Pick: tap or press Enter on the centered card. Picking the lake you're on just closes.
 *   Leave with no change: Esc, the X, a tap outside the cards, or dragging the sheet's handle down.
 *   Desktop (a mouse or trackpad): the same glass cards centered over the blurred page, plus previous and next
 *   buttons beside the row; the wheel, a sideways trackpad swipe or the arrow keys preview, a click picks.
 * Picking another lake saves it (localStorage "nb-lake") and opens the same page for that lake: on Home that is the
 * lake's own address (the root for Hoover, alum/, buckeye/), elsewhere the same page with ?lake=. A short cross-fade
 * (view transition) plays when the browser supports it and reduced motion is off.
 * Card readings: the last reading this browser saved for that lake (js/usgs.js), else the snapshot in js/lakes.js,
 * then a live refresh from each lake's own gauge while the sheet is open. Never invented.
 */
(function () {
  var LS = window.NightBiteLakes, LK = window.NightBiteLake;
  var pill = document.querySelector(".lake-pill");
  if (!LS || !LK || !pill || typeof HTMLDialogElement !== "function") return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var order = LS.order, cur = LK.id, idx = order.indexOf(cur), live = {}, liveAt = 0;
  pill.setAttribute("aria-label", "Choose a lake. Current lake: " + LK.cfg.name);
  pill.setAttribute("aria-haspopup", "dialog");
  pill.setAttribute("aria-expanded", "false");

  /* ---------- markup ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  var dlg = el("dialog", "lake-sheet");
  dlg.id = "lake-sheet";
  dlg.setAttribute("aria-labelledby", "lake-sheet-title");
  dlg.setAttribute("aria-describedby", "lake-sheet-hint");
  pill.setAttribute("aria-controls", "lake-sheet");
  var panel = el("div", "lake-sheet-panel");
  var head = el("div", "lake-sheet-head");
  var grab = el("span", "lake-sheet-grab"); grab.setAttribute("aria-hidden", "true");
  var title = el("h2", "lake-sheet-title", "Choose a lake"); title.id = "lake-sheet-title";
  var x = el("button", "lake-sheet-close"); x.type = "button"; x.setAttribute("aria-label", "Close, keep " + LK.cfg.short);
  x.appendChild(el("span")).setAttribute("aria-hidden", "true");
  head.appendChild(grab); head.appendChild(title); head.appendChild(x);
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)");
  var hint = el("p", "lake-sheet-hint"); hint.id = "lake-sheet-hint";
  function hintText() {
    hint.textContent = fine && fine.matches
      ? "Scroll or use the arrow keys to look, click the middle card to switch."
      : "Swipe to look, tap the middle card to switch.";
  }
  hintText();
  var track = el("ul", "lake-track");
  track.setAttribute("aria-label", "Lakes");
  var cards = order.map(function (id, i) {
    var c = LS.all[id];
    var li = el("li", "lake-slot");
    var b = el("button", "lake-card");
    b.type = "button";
    b.setAttribute("data-lake-card", id);
    b.tabIndex = i === idx ? 0 : -1;
    var art = el("span", "lake-card-map");
    var img = new Image();
    img.alt = ""; img.decoding = "async";
    img.src = LS.base + c.map.chart;
    img.onload = function () { img.width = img.naturalWidth * 2; img.height = img.naturalHeight * 2; };
    art.appendChild(img);
    var name = el("span", "lake-card-name", c.name);
    var area = el("span", "lake-card-area", c.area);
    var read = el("span", "lake-card-read");
    var src = el("span", "lake-card-src");
    var tag = el("span", "lake-card-tag", id === cur ? "Now showing" : "Tap to switch");
    if (id === cur) b.setAttribute("aria-current", "true");
    b.appendChild(tag); b.appendChild(art); b.appendChild(name); b.appendChild(area); b.appendChild(read); b.appendChild(src);
    li.appendChild(b);
    track.appendChild(li);
    return { id: id, cfg: c, btn: b, slot: li, read: read, src: src };
  });
  var dots = el("div", "lake-dots"); dots.setAttribute("aria-hidden", "true");
  order.forEach(function () { dots.appendChild(el("span")); });
  var live1 = el("p", "sr-only"); live1.setAttribute("aria-live", "polite");
  // previous / next: only shown with a mouse or trackpad (CSS), phones keep swiping
  var stage = el("div", "lake-stage");
  function navBtn(dir, label) {
    var b = el("button", "lake-nav lake-nav-" + dir);
    b.type = "button"; b.setAttribute("aria-label", label);
    b.appendChild(el("span")).setAttribute("aria-hidden", "true");
    return b;
  }
  var prev = navBtn("prev", "Previous lake"), next = navBtn("next", "Next lake");
  stage.appendChild(track); stage.appendChild(prev); stage.appendChild(next);
  panel.appendChild(head); panel.appendChild(hint); panel.appendChild(stage); panel.appendChild(dots); panel.appendChild(live1);
  dlg.appendChild(panel);
  document.body.appendChild(dlg);

  /* ---------- readings on the cards ---------- */
  function fmtLine(poolFt, tempF, full) {
    var d = Math.abs(full - poolFt), rel = poolFt > full ? "above" : "below";
    return poolFt.toFixed(2) + " ft · " + (typeof tempF === "number" ? Math.round(tempF) + "°F" : "no temp") +
      " · ~" + d.toFixed(1) + " ft " + rel + " full pool";
  }
  function etTime(iso) {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        .format(new Date(iso)) + " ET";
    } catch (e) { return ""; }
  }
  function saved(id) {
    try {
      var raw = JSON.parse(localStorage.getItem(id === "hoover" ? "nb-usgs-last" : "nb-usgs-last-" + id) || "null");
      if (!raw || !raw.pool || (raw.savedAt && Date.now() - raw.savedAt > 14 * 864e5)) return null;
      return raw;
    } catch (e) { return null; }
  }
  function cToF(c) { return Math.round((c * 9 / 5 + 32) * 10) / 10; }
  function paint(k) {
    var P = k.cfg.pool, r = live[k.id] || null, line = null, when = null, how = "";
    if (r && r.pool) {
      line = fmtLine(r.pool.value, r.temp ? cToF(r.temp.value) : null, P.fullPool);
      when = r.pool.dateTime; how = "Live " + P.srcName;
    } else {
      var s = saved(k.id);
      if (s) {
        line = fmtLine(s.pool.value, s.temp && typeof s.temp.value === "number" ? cToF(s.temp.value) : null, P.fullPool);
        when = s.pool.dateTime; how = P.srcName + ", last seen here";
      } else if (P.snapshot) {
        line = P.snapshot.line; when = P.snapshot.at; how = P.srcName + " snapshot";
      } else if (k.id === cur) {
        var onPage = document.getElementById("correction-line");
        if (onPage && /ft/.test(onPage.textContent)) { line = onPage.textContent.trim(); how = P.srcName + ", this page"; }
      }
    }
    k.read.textContent = line || "Pool: open the lake to load " + P.srcName;
    k.src.textContent = (how ? how : P.srcName + " gauge") + (when ? " · " + etTime(when) : "") +
      (P.temp ? "" : " · no public temp gauge");
    k.btn.setAttribute("aria-label", k.cfg.name + ", " + k.cfg.area + ". " + k.read.textContent + ". " +
      (k.id === cur ? "Now showing." : "Press Enter to switch."));
  }
  function parseIv(json, code) {
    try {
      var ts = json.value.timeSeries;
      for (var i = 0; i < ts.length; i++) {
        if (String(ts[i].variable.variableCode[0].value) !== code) continue;
        var vals = ts[i].values[0].value, last = vals[vals.length - 1], n = parseFloat(last.value);
        if (isFinite(n) && n > -9999) return { value: n, dateTime: last.dateTime };
      }
    } catch (e) {}
    return null;
  }
  function refresh() {
    if (Date.now() - liveAt < 10 * 6e4 || !window.fetch || (navigator.onLine === false)) return;
    liveAt = Date.now();
    cards.forEach(function (k) {
      var P = k.cfg.pool, p;
      if (P.src === "cwms") {
        p = LS.cwmsFor(k.id, 3).then(function (pts) { var l = pts[pts.length - 1]; return l ? { pool: { value: l.v, dateTime: l.iso }, temp: null } : null; });
      } else {
        p = fetch("https://waterservices.usgs.gov/nwis/iv/?format=json&sites=" + P.site + "&parameterCd=" + P.param + (P.temp ? "," + P.temp : ""))
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (j) { return { pool: parseIv(j, P.param), temp: P.temp ? parseIv(j, P.temp) : null }; });
      }
      p.then(function (r) { if (r && r.pool) { live[k.id] = r; paint(k); } }).catch(function () {});
    });
  }

  /* ---------- carousel position ---------- */
  var center = idx, raf = 0;
  function slotLeft(i) { var s = cards[i].slot; return s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2; }
  function go(i, instant) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: slotLeft(i), behavior: instant || reduce ? "auto" : "smooth" });
    setCenter(i);
  }
  function setCenter(i) {
    if (i === center && cards[i].btn.classList.contains("is-center")) return;
    center = i;
    cards.forEach(function (k, j) {
      k.btn.classList.toggle("is-center", j === i);
      k.btn.tabIndex = j === i ? 0 : -1;
    });
    dots.querySelectorAll("span").forEach(function (d, j) { d.classList.toggle("on", j === i); });
    prev.disabled = i === 0; next.disabled = i === cards.length - 1;
    if (dlg.open && dlg.contains(document.activeElement) && document.activeElement.classList.contains("lake-card")) cards[i].btn.focus({ preventScroll: true });
    live1.textContent = cards[i].cfg.name;
  }
  // scale and fade by distance from the middle, every frame while scrolling
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
      cards.forEach(function (k, j) {
        var c = k.slot.offsetLeft + k.slot.offsetWidth / 2, d = Math.min(1, Math.abs(c - mid) / k.slot.offsetWidth);
        k.btn.style.setProperty("--d", d.toFixed(3));
        if (Math.abs(c - mid) < bestD) { bestD = Math.abs(c - mid); best = j; }
      });
      setCenter(best);
    });
  }
  track.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- open, pick, close ---------- */
  var opener = null;
  function open() {
    opener = document.activeElement;
    hintText();
    cards.forEach(paint);
    dlg.showModal();
    document.documentElement.classList.add("lake-sheet-open");
    pill.setAttribute("aria-expanded", "true");
    center = -1;
    go(idx, true);
    onScroll();
    cards[idx].btn.focus({ preventScroll: true });
    refresh();
  }
  function close() {
    if (!dlg.open) return;
    if (reduce || !dlg.animate) { dlg.close(); return; }
    dlg.classList.add("is-closing");
    setTimeout(function () { dlg.classList.remove("is-closing"); dlg.close(); }, 180);
  }
  dlg.addEventListener("close", function () {
    document.documentElement.classList.remove("lake-sheet-open");
    pill.setAttribute("aria-expanded", "false");
    panel.style.transform = "";
    if (opener && opener.focus) opener.focus(); else pill.focus();
  });
  function pick(i) {
    var id = cards[i].id;
    if (id === cur) { close(); return; }
    try { localStorage.setItem(LS.storageKey, id); } catch (e) {}
    try { sessionStorage.setItem("nb-lake-switch", "1"); } catch (e) {}
    cards[i].btn.classList.add("is-picked");
    location.href = LS.hrefFor(id);
  }
  pill.addEventListener("click", open);
  x.addEventListener("click", close);
  prev.addEventListener("click", function () { go(center - 1); });
  next.addEventListener("click", function () { go(center + 1); });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
  cards.forEach(function (k, i) {
    k.btn.addEventListener("click", function () { if (i === center) pick(i); else go(i); });
  });
  // a tap on the frosted backdrop or the empty space around the cards closes with no change
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg || e.target === panel || e.target === stage || e.target === track || e.target.classList.contains("lake-slot")) close();
  });

  /* keys: arrows move, Enter picks (native button), Esc closes (cancel), Tab stays inside the sheet */
  dlg.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); go(center + 1); }
    else if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); go(center - 1); }
    else if (k === "Home") { e.preventDefault(); go(0); }
    else if (k === "End") { e.preventDefault(); go(cards.length - 1); }
    else if (k === "Tab") {
      var f = [x, prev, cards[center].btn, next].filter(function (n) { return !n.disabled && n.offsetParent !== null; }),
        at = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(at + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  });

  /* wheel: vertical wheels and trackpads step one card per gesture */
  var wheelLock = 0;
  track.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // sideways trackpad swipes scroll natively
    e.preventDefault();
    if (Date.now() < wheelLock || Math.abs(e.deltaY) < 4) return;
    wheelLock = Date.now() + 320;
    go(center + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  /* touch: up or down on the cards steps through them (sideways is native scroll snap);
     dragging the handle or the title bar down closes */
  var t0 = null;
  track.addEventListener("touchstart", function (e) { var t = e.touches[0]; t0 = { x: t.clientX, y: t.clientY, at: Date.now() }; }, { passive: true });
  track.addEventListener("touchend", function (e) {
    if (!t0) return;
    var t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y;
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.3) go(center + (dy < 0 ? 1 : -1));
    t0 = null;
  }, { passive: true });
  var drag = null;
  head.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest(".lake-sheet-close")) return;
    drag = { y: e.clientY, id: e.pointerId };
    try { head.setPointerCapture(e.pointerId); } catch (er) {}
  });
  head.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = Math.max(0, e.clientY - drag.y);
    panel.style.transform = dy ? "translateY(" + dy + "px)" : "";
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.clientY - drag.y;
    drag = null;
    if (dy > 70) close(); else panel.style.transform = "";
  }
  head.addEventListener("pointerup", endDrag);
  head.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", function () { if (dlg.open) go(center, true); });
})();

