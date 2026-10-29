/**
 * The Night Bite: lake-aware Species. Follows the active lake from js/lakes.js (lake page path, ?lake=, or the saved
 * choice). Uses only data already on the site:
 *   · which species live at each lake: the js/lakes.js species lists (sourced in DATA-SOURCES.md); data-lakes on
 *     each card mirrors them
 *   · what's biting this month: js/biting-data.js (Hoover) and js/biting-data-lakes.js (every other lake)
 *   · ramps and access: the lake's map data (js/hoover-map-data.js, js/lake-map-data-*.js), each place with its
 *     public sources
 *
 * Species index (#species-grid): this month's picks at the lake come first with a "Biting now" tag, then every other
 * species on the lake's list. Species with no official record at the lake go into a closed "Not recorded at <lake>" dropdown
 * (<details>) below, marked with the lakes they are at. Runs right after the grid in the HTML, before the page
 * paints, so nothing moves.
 * Species page (#sp-now): a short "at <lake> this month" note under the title, filled before paint.
 */
(function () {
  var LK = window.NightBiteLake, LS = window.NightBiteLakes;
  if (!LK || !LS) return;
  var id = LK.id, cfg = LK.cfg;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var data = window[LS.bitingVar(id)];

  function monthEt() {
    try { return parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" }).format(new Date()), 10) - 1; }
    catch (e) { return new Date().getMonth(); }
  }
  var m = monthEt();
  var picks = (data && data.months[m] && data.months[m].picks) || [];
  function pickFor(sp) { for (var i = 0; i < picks.length; i++) if (picks[i].id === sp) return picks[i]; return null; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function names(list) {
    var out = list.map(function (k) { return LS.all[k] ? LS.all[k].short === "Buckeye" ? "Buckeye Lake" : LS.all[k].short : k; });
    return out.length < 3 ? out.join(" and ") : out.slice(0, -1).join(", ") + " and " + out[out.length - 1];
  }
  var lakeName = cfg.short === "Buckeye" ? "Buckeye Lake" : cfg.short;

  // ---------- species index ----------
  // Which lakes a species lives at: the lake's species list in js/lakes.js is the one source (data-lakes on the
  // cards mirrors it for the no-JS CSS view).
  function lakesFor(sp) {
    return Object.keys(LS.all).filter(function (k) { return (LS.all[k].species || []).indexOf(sp) >= 0; });
  }
  var grid = document.getElementById("species-grid");
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".species-card[data-lakes]"));
    var here = cfg.species || [];
    var now = [], rest = [], away = [];
    cards.forEach(function (c) {
      var sp = (c.getAttribute("href") || "").replace(/\.html$/, "");
      var lakes = lakesFor(sp);
      c.setAttribute("data-lakes", lakes.join(" "));
      if (here.indexOf(sp) >= 0) {
        if (pickFor(sp)) {
          var h = c.querySelector("h3");
          if (h) h.appendChild(el("span", "sp-tag sp-tag-now", "Biting now"));
          now.push(c);
        } else rest.push(c);
      } else {
        away.push(c);
        var note = el("p", "meta sp-away-note");
        note.appendChild(el("span", "sp-tag sp-tag-away", "Not recorded at " + lakeName));
        note.appendChild(document.createTextNode(lakes.length ? " Found at " + names(lakes) + "." : ""));
        c.appendChild(note);
        c.classList.add("is-away");
      }
    });
    // Biting now first (in this month's pick order), then every other species at the lake
    now.sort(function (a, b) {
      function ix(c) { var sp = c.getAttribute("href").replace(/\.html$/, ""); for (var i = 0; i < picks.length; i++) if (picks[i].id === sp) return i; return 99; }
      return ix(a) - ix(b);
    });
    now.concat(rest).forEach(function (c) { grid.appendChild(c); });
    var count = el("p", "meta sp-count");
    count.textContent = (now.length + rest.length) + " of " + cards.length + " species on this site live at " + lakeName +
      (now.length ? ". " + (now.length === 1 ? "1 is this month\u2019s pick" : now.length + " are this month\u2019s picks") + ", tagged Biting now and listed first." : ".");
    grid.parentNode.insertBefore(count, grid);
    if (away.length) {
      // the rest sit in a closed dropdown: species with no official record at this lake
      var sec = el("details", "sp-away");
      var sum = el("summary", null, "Not recorded at " + lakeName + " (" + away.length + ")");
      sec.appendChild(sum);
      sec.appendChild(el("p", "meta sp-away-intro", "No ODNR survey, stocking record or fishing area page lists these at " + lakeName +
        ". Their pages read as notes for the lakes where they live."));
      var g2 = el("div", "card-grid cols-2 sp-away-grid");
      away.forEach(function (c) { g2.appendChild(c); });
      sec.appendChild(g2);
      grid.parentNode.insertBefore(sec, grid.nextSibling);
      // the filter chips hide cards; drop the dropdown when a filter leaves it empty
      document.addEventListener("click", function (e) {
        if (!e.target.closest || !e.target.closest(".filter-chip")) return;
        setTimeout(function () { sec.hidden = !g2.querySelector(".species-card:not([hidden])"); }, 0);
      });
    }
    // ramps and access at this lake, from the map data (below the grid, so loading it never moves anything above)
    var acc = document.getElementById("sp-access");
    var mapVar = cfg.map && cfg.map.data;
    if (acc && mapVar) {
      var src = LS.mapFile(id);
      var fill = function () {
        var md = window[mapVar];
        if (!md || !md.places) return;
        var list = acc.querySelector(".sp-access-list");
        md.places.filter(function (p) { return p.type === "ramp" || p.type === "access"; }).forEach(function (p) {
          var li = el("li");
          li.appendChild(el("span", "sp-access-name", p.name));
          if (p.note) li.appendChild(el("span", "sp-access-note", p.note));
          if (p.sourceLabels && p.sourceLabels.length) li.appendChild(el("span", "sp-access-src", "Sources: " + p.sourceLabels.join(", ")));
          list.appendChild(li);
        });
        acc.hidden = false;
      };
      if (window[mapVar]) fill();
      else if (src) { var s = document.createElement("script"); s.src = LS.base + "js/" + src; s.onload = fill; document.head.appendChild(s); }
    }
  }

  // ---------- species page ----------
  var box = document.getElementById("sp-now");
  if (box) {
    var sp = box.getAttribute("data-species");
    var lives = (cfg.species || []).indexOf(sp) >= 0;
    if (!lives) return;      // the page's own lake note already says it isn't at this lake
    var p = pickFor(sp);
    var head = el("p", "sp-now-head");
    head.appendChild(el("span", "sp-tag " + (p ? "sp-tag-now" : "sp-tag-quiet"), p ? "Biting now" : "Not a top pick"));
    head.appendChild(document.createTextNode(" " + lakeName + ", " + MONTHS[m]));
    box.appendChild(head);
    if (p) {
      box.appendChild(el("p", "sp-now-where", p.where));
      box.appendChild(el("p", "meta sp-now-when", p.when + ". Typical pattern, not a fishing report."));
    } else {
      var t = el("p", "meta sp-now-when", "At " + lakeName + ", but not one of this month\u2019s picks. ");
      var a = el("a", null, "See what\u2019s biting now");
      a.href = "./#biting";
      t.appendChild(a);
      box.appendChild(t);
    }
    var links = el("p", "meta sp-now-links");
    var w = el("a", null, "Ramps and access at " + lakeName);
    w.href = "../water#access";
    links.appendChild(w);
    box.appendChild(links);
    box.hidden = false;
  }
})();
