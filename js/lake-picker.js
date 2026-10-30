/**
 * The Night Bite: lake picker and your lakes (favorites).
 * The header pill (button.lake-pill, static markup on every page) opens a <dialog>: a full screen sheet on phones,
 * a panel under the pill on desktop. Top to bottom:
 *   · Search: matches each lake's name and aliases (js/lakes.js), word starts first. "Ind" finds Indian Lake.
 *   · Your lakes: the lakes you starred, in the order you starred them (localStorage "nb-lake-stars", ids only).
 *     Only stars go here, nothing is added for just opening a lake, and the section is left out until you star one.
 *     Tap a lake's star again (here or in its region) to take it back off.
 *   · Near me: asks for location only when tapped, sorts lakes by straight line distance worked out here in the
 *     browser. The location is never sent or saved. Denied or unavailable: one calm line, regions stay.
 *   · Regions (js/lakes.js REGIONS), each a native <details> like the Species "Not recorded at" dropdown. Regions
 *     with no lakes are left out; the region of the lake you're on starts open.
 * Each row: a link to the same page for that lake (NightBiteLakes.hrefFor), up to two tags from the lake's data
 * (Live level, Live temp) and a star toggle.
 * Keys: Tab and Shift Tab stay inside, arrow up and down move between lakes, Esc closes and focus goes back to the pill.
 * Adding a lake needs no edits here: one entry in js/lakes.js.
 */
(function () {
  var LS = window.NightBiteLakes, LK = window.NightBiteLake;
  var pill = document.querySelector(".lake-pill");
  if (!LS || !LK) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 560px)");
  var order = LS.order, cur = LK.id, ALL = LS.all;
  var STARS = "nb-lake-stars";
  try { localStorage.removeItem("nb-lake-recent"); } catch (e) {}   // the old recent list (v42, v43) is no longer kept

  /* ---------- your lakes (localStorage, ids only) ---------- */
  function readList(k) {
    try {
      var v = JSON.parse(localStorage.getItem(k) || "[]");
      return Array.isArray(v) ? v.filter(function (id, i) { return ALL[id] && v.indexOf(id) === i; }) : [];
    } catch (e) { return []; }
  }
  function writeList(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function stars() { return readList(STARS); }
  function isStar(id) { return stars().indexOf(id) !== -1; }
  function toggleStar(id) {
    var s = stars(), i = s.indexOf(id);
    if (i === -1) s.push(id); else s.splice(i, 1);
    writeList(STARS, s);
    return i === -1;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function tagsFor(c) {
    var t = [];
    if (c.pool && c.pool.src) t.push("Live level");
    if (c.pool && c.pool.temp) t.push("Live temp");
    return t.slice(0, 2);
  }
  function markSwitch() { try { sessionStorage.setItem("nb-lake-switch", "1"); } catch (e) {} }
  function pickLink(a, id) {
    a.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (id === cur) { e.preventDefault(); close(); return; }
      try { localStorage.setItem(LS.storageKey, id); } catch (er) {}
      if (a.parentNode && a.parentNode.classList) a.parentNode.classList.add("is-picked");   // the old picker's amber edge while the next lake loads
      markSwitch();
    });
  }

  if (!pill || typeof HTMLDialogElement !== "function") return;
  pill.setAttribute("aria-label", "Choose a lake. Current lake: " + LK.cfg.name);
  pill.setAttribute("aria-haspopup", "dialog");
  pill.setAttribute("aria-expanded", "false");

  /* ---------- markup ---------- */
  var dlg = el("dialog", "lake-sheet");
  dlg.id = "lake-sheet";
  dlg.setAttribute("aria-labelledby", "lake-sheet-title");
  pill.setAttribute("aria-controls", "lake-sheet");
  var panel = el("div", "lake-sheet-panel");
  var head = el("div", "lake-sheet-head");
  var grab = el("span", "lake-sheet-grab"); grab.setAttribute("aria-hidden", "true");
  var title = el("h2", "lake-sheet-title", "Choose a lake"); title.id = "lake-sheet-title";
  var x = el("button", "lake-sheet-close"); x.type = "button"; x.setAttribute("aria-label", "Close, keep " + LK.cfg.name);
  x.appendChild(el("span")).setAttribute("aria-hidden", "true");
  head.appendChild(grab); head.appendChild(title); head.appendChild(x);

  var tools = el("div", "lp-tools");
  var search = el("input", "lp-search");
  search.type = "search"; search.id = "lp-search";
  search.placeholder = "Search lakes";
  search.setAttribute("aria-label", "Search lakes by name");
  search.setAttribute("autocomplete", "off"); search.setAttribute("autocapitalize", "off"); search.spellcheck = false;
  search.setAttribute("enterkeyhint", "go");
  var near = el("button", "lp-near", "Near me"); near.type = "button";
  near.setAttribute("aria-pressed", "false");
  near.setAttribute("aria-describedby", "lp-status");
  tools.appendChild(search); tools.appendChild(near);
  var status = el("p", "lp-status"); status.id = "lp-status"; status.setAttribute("aria-live", "polite");
  var body = el("div", "lp-body");
  panel.appendChild(head); panel.appendChild(tools); panel.appendChild(status); panel.appendChild(body);
  dlg.appendChild(panel);
  document.body.appendChild(dlg);

  /* one row per lake; built fresh on every paint (a few dozen nodes, even at 100+ lakes) */
  function row(id, extra) {
    var c = ALL[id], li = el("li", "lp-row");
    var a = el("a", "lp-lake");
    a.href = LS.hrefFor(id);
    a.setAttribute("data-lake", id);
    var nm = el("span", "lp-name", c.name);
    a.appendChild(nm);
    var meta = el("span", "lp-meta");
    if (id === cur) { meta.appendChild(el("span", "lp-now", "Now showing")); a.setAttribute("aria-current", "true"); li.classList.add("is-now"); }
    if (extra) meta.appendChild(el("span", "lp-dist", extra));
    tagsFor(c).forEach(function (t) { meta.appendChild(el("span", "lp-tag", t)); });
    if (meta.firstChild) a.appendChild(meta);
    pickLink(a, id);
    var st = el("button", "lp-star"); st.type = "button";
    function paintStar() {
      var on = isStar(id);
      st.setAttribute("aria-pressed", on ? "true" : "false");
      st.setAttribute("aria-label", on ? "Remove " + c.name + " from your lakes" : "Add " + c.name + " to your lakes");
    }
    paintStar();
    st.appendChild(el("span")).setAttribute("aria-hidden", "true");
    st.addEventListener("click", function () {
      var box = st.closest("[data-sec]"), sec = box ? box.getAttribute("data-sec") : "";
      var mineStars = Array.prototype.slice.call(body.querySelectorAll('[data-sec="mine"] .lp-star'));
      var at = mineStars.indexOf(st);
      var added = toggleStar(id);
      paint(true);
      // focus: the same star if it is still in the same list; taken off Your lakes, the next star there (or the one
      // before it); with Your lakes now empty, this lake's star in its region; the search box as a last resort
      var again = body.querySelector('[data-sec="' + sec + '"] .lp-star[data-star="' + id + '"]');
      if (!again && sec === "mine") {
        var left = body.querySelectorAll('[data-sec="mine"] .lp-star');
        again = left[Math.min(at, left.length - 1)] || null;
      }
      if (!again) again = body.querySelector('.lp-star[data-star="' + id + '"]');
      if (again && again.offsetParent !== null) {
        again.focus({ preventScroll: true });
        if (added && !reduce) again.classList.add("lp-pop");   // a small pop as the star fills
      } else search.focus({ preventScroll: true });
      status.textContent = (added ? "Added " + c.name + " to your lakes." : "Removed " + c.name + " from your lakes.");
    });
    st.setAttribute("data-star", id);
    li.appendChild(a); li.appendChild(st);
    return li;
  }
  function list(ids, label, extras) {
    var ul = el("ul", "lp-list");
    if (label) ul.setAttribute("aria-label", label);
    ids.forEach(function (id, i) { ul.appendChild(row(id, extras && extras[i])); });
    return ul;
  }
  function section(heading, ids, extras, key) {
    var s = el("section", "lp-sec");
    s.setAttribute("data-sec", key);
    var h = el("h3", "lp-h", heading);
    s.appendChild(h);
    s.appendChild(list(ids, heading, extras));
    return s;
  }

  /* ---------- search ---------- */
  function norm(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.replace(/[\u2018\u2019'`]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  var index = order.map(function (id) {
    var c = ALL[id], names = [c.name, c.short].concat(c.aliases || []);
    var words = [], whole = [];
    names.forEach(function (n) { var k = norm(n); whole.push(k.replace(/ /g, "")); words = words.concat(k.split(" ")); });
    return { id: id, words: words, whole: whole, first: norm(c.name) };
  });
  function find(q) {
    q = norm(q); var flat = q.replace(/ /g, "");
    if (!flat) return null;
    var hits = [];
    index.forEach(function (e) {
      var score = 0;
      if (e.first.indexOf(q) === 0) score = 3;
      else if (e.words.some(function (w) { return w.indexOf(q) === 0; })) score = 2;
      else if (e.whole.some(function (w) { return w.indexOf(flat) !== -1; })) score = 1;
      if (score) hits.push({ id: e.id, s: score });
    });
    hits.sort(function (a, b) { return b.s - a.s || order.indexOf(a.id) - order.indexOf(b.id); });
    return hits.map(function (h) { return h.id; });
  }

  /* ---------- near me (on this device only) ---------- */
  var here = null;   // { lat, lng } for this open sheet only; never stored
  function miles(a, b) {
    var R = 3958.8, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  near.addEventListener("click", function () {
    if (here) { here = null; near.setAttribute("aria-pressed", "false"); status.textContent = ""; paint(); return; }
    if (!navigator.geolocation) { status.textContent = "This browser can't share a location, so lakes stay grouped by region."; return; }
    status.textContent = "Finding lakes near you\u2026";
    near.disabled = true;
    navigator.geolocation.getCurrentPosition(function (p) {
      near.disabled = false;
      here = { lat: p.coords.latitude, lng: p.coords.longitude };
      near.setAttribute("aria-pressed", "true");
      status.textContent = "Nearest first, straight line miles. Your location stays on this device.";
      paint();
    }, function (err) {
      near.disabled = false;
      status.textContent = err && err.code === 1
        ? "Location is off for this site, so lakes stay grouped by region."
        : "Couldn't get a location right now, so lakes stay grouped by region.";
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });

  /* ---------- paint the body ---------- */
  var openRegions = {};
  function paint(keep) {
    var q = search.value, hits = find(q), top = body.scrollTop;
    body.textContent = "";
    if (keep) requestAnimationFrame(function () { body.scrollTop = top; });   // a star toggle keeps the list where it was
    if (hits) {
      if (hits.length) body.appendChild(section(hits.length === 1 ? "1 lake" : hits.length + " lakes", hits, null, "results"));
      else body.appendChild(el("p", "lp-empty", "No lakes match \u201c" + q.trim() + "\u201d yet."));
      return;
    }
    var mine = stars();
    if (mine.length) body.appendChild(section("Your lakes", mine, null, "mine"));   // every star, no cap
    if (here) {
      var byDist = order.map(function (id) { return { id: id, d: miles(here, ALL[id]) }; })
        .sort(function (a, b) { return a.d - b.d; });
      body.appendChild(section("Near me", byDist.map(function (r) { return r.id; }),
        byDist.map(function (r) { return r.d < 1 ? "Under 1 mi" : Math.round(r.d) + " mi"; }), "near"));
      return;
    }
    (LS.regions || [{ id: "all", name: "Lakes" }]).forEach(function (rg) {
      var ids = order.filter(function (id) { return rg.id === "all" || ALL[id].region === rg.id; });
      if (!ids.length) return;   // empty regions stay hidden
      var d = el("details", "lp-region");
      d.setAttribute("data-sec", "region-" + rg.id);
      d.open = rg.id in openRegions ? openRegions[rg.id] : (ALL[cur].region === rg.id || rg.id === "all");
      d.addEventListener("toggle", function () { openRegions[rg.id] = d.open; });
      var sum = el("summary", null, rg.name + " (" + ids.length + ")");
      d.appendChild(sum);
      d.appendChild(list(ids, rg.name));
      body.appendChild(d);
    });
  }
  search.addEventListener("input", paint);
  search.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {   // Enter opens the top match
      var first = body.querySelector(".lp-lake");
      if (first && search.value.trim()) { e.preventDefault(); first.click(); }
    }
  });

  /* ---------- open and close ---------- */
  var opener = null;
  function place() {   // desktop: line the panel up under the pill, kept inside the window
    if (!(fine && fine.matches)) { panel.style.removeProperty("--lp-left"); panel.style.removeProperty("--lp-top"); return; }
    var r = pill.getBoundingClientRect(), w = Math.min(400, window.innerWidth - 32);
    var left = Math.max(16, Math.min(r.left, window.innerWidth - w - 16));
    panel.style.setProperty("--lp-left", left + "px");
    panel.style.setProperty("--lp-top", Math.max(8, r.bottom + 8) + "px");
  }
  var closing = 0;
  function open() {
    if (dlg.open) return;
    opener = document.activeElement;
    search.value = "";
    status.textContent = "";
    paint();
    place();
    // lock the page behind without it shifting: keep the scrollbar's width as padding while it is hidden
    var gutter = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty("--lp-gutter", Math.max(0, gutter) + "px");
    document.documentElement.classList.add("lake-sheet-open");
    dlg.showModal();
    pill.setAttribute("aria-expanded", "true");
    body.scrollTop = 0;
    if (fine && fine.matches) search.focus();
    else { var c = body.querySelector('.lp-region[open] .lp-lake[aria-current]') || body.querySelector(".lp-lake[aria-current]"); (c || x).focus({ preventScroll: true }); }
  }
  function close() {
    if (!dlg.open || closing) return;
    if (reduce || !dlg.animate) { dlg.close(); return; }
    dlg.classList.add("is-closing");   // CSS plays the fade out (180ms); the dialog closes when it ends
    var done = function () {
      if (!closing) return;
      clearTimeout(closing); closing = 0;
      panel.removeEventListener("animationend", onEnd);
      dlg.classList.remove("is-closing");
      dlg.close();
    };
    var onEnd = function (e) { if (e.target === panel) done(); };
    panel.addEventListener("animationend", onEnd);
    closing = setTimeout(done, 260);   // backstop if the animation never runs
  }
  dlg.addEventListener("close", function () {
    document.documentElement.classList.remove("lake-sheet-open");
    document.documentElement.style.removeProperty("--lp-gutter");
    pill.setAttribute("aria-expanded", "false");
    panel.style.transform = "";
    here = null; near.setAttribute("aria-pressed", "false"); near.disabled = false;
    var back = opener && opener !== document.body && document.contains(opener) ? opener : pill;
    if (back.focus) back.focus({ preventScroll: true });   // the page stays where it was
  });
  pill.addEventListener("click", open);
  x.addEventListener("click", close);
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });   // backdrop
  window.addEventListener("resize", function () { if (dlg.open) place(); });

  /* keys: Tab stays inside the sheet, arrows move between lakes (and from the search box into the list) */
  function focusables() {
    return Array.prototype.filter.call(panel.querySelectorAll("button, input, a[href], summary"), function (n) {
      return !n.disabled && n.offsetParent !== null && !n.closest("details:not([open]) > ul");
    });
  }
  dlg.addEventListener("keydown", function (e) {
    var k = e.key, a = document.activeElement;
    if (k === "Tab") {
      var f = focusables(), at = f.indexOf(a);
      if (!f.length) return;
      if (e.shiftKey && (at <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (at === -1 || at === f.length - 1)) { e.preventDefault(); f[0].focus(); }
      return;
    }
    if (k !== "ArrowDown" && k !== "ArrowUp") return;
    var rows = Array.prototype.filter.call(body.querySelectorAll(".lp-lake, .lp-region > summary"), function (n) { return n.offsetParent !== null; });
    if (!rows.length) return;
    var i = rows.indexOf(a.classList && a.classList.contains("lp-star") ? a.previousSibling : a);
    if (a === search) { if (k === "ArrowDown") { e.preventDefault(); rows[0].focus(); } return; }
    if (i === -1) return;
    e.preventDefault();
    if (k === "ArrowDown") (rows[i + 1] || rows[i]).focus();
    else if (i === 0) search.focus();
    else rows[i - 1].focus();
  });

  /* phones: dragging the handle or the title bar down closes */
  var drag = null;
  head.addEventListener("pointerdown", function (e) {
    if ((fine && fine.matches) || (e.target.closest && e.target.closest(".lake-sheet-close"))) return;
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

  window.NightBitePicker = { open: open, close: close, find: find, stars: stars };
})();
