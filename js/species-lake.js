/**
 * The Night Bite: lake-aware Species. Follows the active lake from js/lakes.js (lake page path, ?lake=, or the saved
 * choice). Uses only data already on the site:
 *   · which species live at each lake: data-lakes on each card (js/lakes.js species lists, sourced in DATA-SOURCES.md)
 *   · what's biting this month: js/biting-data.js (Hoover) and js/biting-data-lakes.js (Alum Creek, Buckeye Lake)
 *   · ramps and access: the lake's map data (js/hoover-map-data.js, js/lake-map-data-*.js), each place with its
 *     public sources
 *
 * Species index (#species-grid): species at the lake stay first, with a "Biting now" tag on this month's picks.
 * Species not at the lake move into a labeled "Not at <lake>" group below, marked with the lakes they are at, instead
 * of disappearing. Runs right after the grid in the HTML, before the page paints, so nothing moves.
 * Species page (#sp-now): a short "at <lake> this month" note under the title, filled before paint.
 */
(function () {
  var LK = window.NightBiteLake, LS = window.NightBiteLakes;
  if (!LK || !LS) return;
  var id = LK.id, cfg = LK.cfg;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var data = id === "alum" ? window.NightBiteBitingAlum : id === "buckeye" ? window.NightBiteBitingBuckeye : window.NightBiteBiting;

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
  var grid = document.getElementById("species-grid");
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".species-card[data-lakes]"));
    var here = 0, away = [];
    cards.forEach(function (c) {
      var lakes = (c.getAttribute("data-lakes") || "").split(/\s+/);
      var sp = (c.getAttribute("href") || "").replace(/\.html$/, "");
      if (lakes.indexOf(id) >= 0) {
        here++;
        if (pickFor(sp)) {
          var h = c.querySelector("h3");
          var tag = el("span", "sp-tag sp-tag-now", "Biting now");
          if (h) h.appendChild(tag);
        }
      } else {
        away.push(c);
        var note = el("p", "meta sp-away-note");
        note.appendChild(el("span", "sp-tag sp-tag-away", "Not at " + lakeName));
        note.appendChild(document.createTextNode(" Found at " + names(lakes) + "."));
        c.appendChild(note);
        c.classList.add("is-away");
      }
    });
    var count = el("p", "meta sp-count");
    count.textContent = here + " of " + cards.length + " species on this site live at " + lakeName +
      (picks.length ? ". " + picks.length + " are this month\u2019s picks, tagged Biting now." : ".");
    grid.parentNode.insertBefore(count, grid);
    if (away.length) {
      var sec = el("section", "sp-away");
      sec.setAttribute("aria-labelledby", "sp-away-title");
      var h2 = el("h2", null, "Not at " + lakeName);
      h2.id = "sp-away-title";
      sec.appendChild(h2);
      sec.appendChild(el("p", "meta", "These species are on the site for the other lakes. They are not on the " + lakeName +
        " list, so their pages read as notes for the lakes where they live."));
      var g2 = el("div", "card-grid cols-2 sp-away-grid");
      away.forEach(function (c) { g2.appendChild(c); });
      sec.appendChild(g2);
      grid.parentNode.insertBefore(sec, grid.nextSibling);
      // the filter chips hide cards; drop the heading when a filter leaves this group empty
      document.addEventListener("click", function (e) {
        if (!e.target.closest || !e.target.closest(".filter-chip")) return;
        setTimeout(function () { sec.hidden = !g2.querySelector(".species-card:not([hidden])"); }, 0);
      });
    }
    // ramps and access at this lake, from the map data (below the grid, so loading it never moves anything above)
    var acc = document.getElementById("sp-access");
    var mapVar = cfg.map && cfg.map.data;
    if (acc && mapVar) {
      var src = { NightBiteMapData: "hoover-map-data.js", NightBiteMapDataAlum: "lake-map-data-alum.js", NightBiteMapDataBuckeye: "lake-map-data-buckeye.js" }[mapVar];
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
    w.href = "../water.html#access";
    links.appendChild(w);
    box.appendChild(links);
    box.hidden = false;
  }
})();
