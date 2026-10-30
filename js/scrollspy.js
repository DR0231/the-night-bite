/**
 * The Night Bite: scrollspy wave. A thin column of ticks on the right edge shows how far down the page you are;
 * the ticks near your spot swell into an amber wave. Each section owns a slice of the column (sized by how long
 * the section is), so tapping or clicking a slice jumps to that section.
 *
 * Use: add data-scrollspy to <main>. Sections are main > section[id] that are not hidden. The label is the
 * section's data-spy-label, or its h2 text. Ticks are decorative (aria-hidden); the sections are a real nav of
 * links (aria-label "Page sections"), keyboard reachable after the page content, labels shown on hover and focus.
 */
(function () {
  var main = document.querySelector("main[data-scrollspy]");
  if (!main || !document.querySelector) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var nav = document.createElement("nav");
  nav.className = "spy";
  nav.setAttribute("aria-label", "Page sections");
  var ticksEl = document.createElement("div");
  ticksEl.className = "spy-ticks";
  ticksEl.setAttribute("aria-hidden", "true");
  var list = document.createElement("ol");
  list.className = "spy-list";
  var now = document.createElement("span");
  now.className = "spy-now";
  now.setAttribute("aria-hidden", "true");
  nav.appendChild(ticksEl);
  nav.appendChild(list);
  nav.appendChild(now);
  main.parentNode.insertBefore(nav, main.nextSibling);

  var sections = [], ticks = [], tickSec = [], active = -1, raf = 0, idle = 0, lastY = window.scrollY;
  // placement: never above the bottom of the page's tree line strip (.page-horizon) or under the sticky header.
  // Phones: the column starts just under the water line and slides up to sit under the header as the strip
  // scrolls away. Wider screens: centered, unless that would overlap the trees.
  var horizon = main.querySelector(".page-horizon"), header = document.querySelector(".site-header");
  var place = { floor: 0, center: 0, minTop: 0 };

  function measurePlace() {
    nav.style.transform = "none";
    nav.style.height = "";
    nav.style.top = "0px";
    var vh = window.innerHeight, h0 = nav.offsetHeight || vh * 0.62;
    var gap = 12;
    var floor = horizon ? horizon.getBoundingClientRect().bottom + window.scrollY + gap : 0;
    var minTop = (header ? header.getBoundingClientRect().bottom : 0) + gap;
    var h = h0, phone = window.innerWidth < 720;
    if (phone && floor) {
      // phones: the column hangs from the water line, then rides just under the header
      h = Math.max(160, vh - floor - 24);
      place.center = minTop;
    } else {
      if ((vh - h) / 2 < floor) h = Math.max(160, Math.min(h0, vh - floor - 24));
      place.center = Math.max(minTop, (vh - h) / 2);
    }
    place.floor = floor;
    nav.style.height = Math.round(h) + "px";
    placeTop();
  }

  function placeTop() {
    var t = Math.max(place.center, place.floor - window.scrollY);
    nav.style.top = Math.round(t) + "px";
  }

  function labelFor(s) {
    var l = s.getAttribute("data-spy-label");
    if (l) return l;
    var h = s.querySelector("h2");
    return h ? h.textContent.replace(/^\s*\d+\.\s*/, "").replace(/\s+/g, " ").trim() : s.id;
  }

  function shown(s) { return !s.hidden && s.offsetParent !== null && s.getClientRects().length > 0; }

  function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function layout() {
    var all = Array.prototype.slice.call(main.querySelectorAll(":scope > section[id]")).filter(shown);
    var docH = document.documentElement.scrollHeight, vh = window.innerHeight;
    // short pages, or no sections: no column
    nav.hidden = all.length < 3 || docH < vh * 1.8;
    if (nav.hidden) return;
    measurePlace();
    sections = all.map(function (s) { return { el: s, id: s.id, label: labelFor(s), top: docTop(s) }; });
    var colH = ticksEl.clientHeight || 300;
    var n = Math.max(16, Math.min(64, Math.round(colH / 8)));
    // ticks
    if (ticks.length !== n) {
      ticksEl.textContent = "";
      ticks = [];
      for (var i = 0; i < n; i++) { var t = document.createElement("span"); t.className = "spy-tick"; ticksEl.appendChild(t); ticks.push(t); }
    }
    // slices: section i runs from its top to the next section's top, as a share of the whole page
    var key = sections.map(function (s) { return s.id; }).join(" ");
    var rebuild = key !== list.getAttribute("data-key");
    if (rebuild) { list.textContent = ""; list.setAttribute("data-key", key); }
    var links = list.querySelectorAll(".spy-link");
    sections.forEach(function (s, i) {
      var a = i === 0 ? 0 : s.top / docH;
      var b = i === sections.length - 1 ? 1 : sections[i + 1].top / docH;
      s.a = a; s.b = b;
      var link = links[i];
      if (rebuild) {
        var li = document.createElement("li");
        link = document.createElement("a");
        link.href = "#" + s.id;
        link.className = "spy-link";
        var lab = document.createElement("span");
        lab.className = "spy-label";
        lab.textContent = s.label;
        link.appendChild(lab);
        li.appendChild(link);
        list.appendChild(li);
      }
      s.link = link;
    });
    placeLinks();
    tickSec = ticks.map(function (t, i) {
      var f = (i + 0.5) / n;
      for (var k = sections.length - 1; k >= 0; k--) if (f >= sections[k].a) return k;
      return 0;
    });
    ticks.forEach(function (t, i) { t.classList.toggle("is-start", i > 0 && tickSec[i] !== tickSec[i - 1]); });
    active = -1;
    paint();
  }

  // tap slices: proportional to section length, but never under 24px of rail (a 24px tap target);
  // the extra comes out of the longer slices so the column still fills the rail exactly
  function placeLinks() {
    var railH = list.getBoundingClientRect().height, MIN = 24, n = sections.length;
    if (!n || !railH) return;
    var raw = sections.map(function (s) { return Math.max(0, s.b - s.a) * railH; });
    var extra = raw.map(function (h) { return Math.max(0, h - MIN); });
    var sumX = extra.reduce(function (p, x) { return p + x; }, 0);
    var spare = railH - MIN * n, top = 0;
    sections.forEach(function (s, i) {
      var h = spare <= 0 ? railH / n : MIN + (sumX ? extra[i] * spare / sumX : spare / n);
      s.link.style.top = (top / railH * 100) + "%";
      s.link.style.height = (h / railH * 100) + "%";
      top += h;
    });
  }

  function paint() {
    raf = 0;
    if (nav.hidden || !ticks.length) return;
    placeTop();
    var de = document.documentElement, vh = window.innerHeight;
    var max = Math.max(1, de.scrollHeight - vh), y = Math.min(max, Math.max(0, window.scrollY));
    var p = y / max;
    // reading spot: top of the screen at the start, bottom of the screen at the end
    var f = (y + vh * p) / de.scrollHeight;
    var n = ticks.length, c = f * n - 0.5, sig = Math.max(1.6, n * 0.06);
    for (var i = 0; i < n; i++) {
      var d = i - c, g = Math.exp(-(d * d) / (2 * sig * sig));
      var t = ticks[i];
      t.style.transform = "scaleX(" + (0.28 + 0.72 * g).toFixed(3) + ")";
      t.style.opacity = (0.32 + 0.68 * g).toFixed(3);
      t.classList.toggle("is-hot", g > 0.42);
    }
    var k = 0;
    for (var j = sections.length - 1; j >= 0; j--) if (f >= sections[j].a) { k = j; break; }
    if (k !== active) {
      sections.forEach(function (s) { s.link.removeAttribute("aria-current"); });
      active = k;
      sections[k].link.setAttribute("aria-current", "location");
      now.textContent = sections[k].label;
    }
    now.style.top = (Math.min(0.97, Math.max(0.03, f)) * 100) + "%";
  }

  function onScroll() {
    if (!raf) raf = requestAnimationFrame(paint);
    if (Math.abs(window.scrollY - lastY) > 4) {
      lastY = window.scrollY;
      nav.classList.add("is-scrolling");
      clearTimeout(idle);
      idle = setTimeout(function () { nav.classList.remove("is-scrolling"); }, reduce && reduce.matches ? 1400 : 900);
    }
  }

  var relayT = 0;
  function relayout() { clearTimeout(relayT); relayT = setTimeout(layout, 120); }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", relayout);
  window.addEventListener("load", layout);
  document.addEventListener("toggle", relayout, true);   // details open/close changes section lengths
  if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(main);
  if ("MutationObserver" in window) new MutationObserver(relayout).observe(document.documentElement, { attributes: true, attributeFilter: ["data-lake"] });
  layout();
})();
