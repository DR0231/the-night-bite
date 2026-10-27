/**
 * The Night Bite: winter species on ice.html. Lists the December, January and February picks for the active lake
 * from the site's own month by month notes (js/biting-data.js for Hoover, js/biting-data-lakes.js for Alum Creek and
 * Buckeye Lake). Nothing new: same species, same words. Runs right after its container, before paint.
 */
(function () {
  var box = document.getElementById("ice-species-list");
  var LK = window.NightBiteLake, LS = window.NightBiteLakes;
  if (!box || !LK) return;
  var id = LK.id;
  var data = id === "alum" ? window.NightBiteBitingAlum : id === "buckeye" ? window.NightBiteBitingBuckeye : window.NightBiteBiting;
  if (!data) return;
  var MONTHS = [[11, "December"], [0, "January"], [1, "February"]];
  var order = [], by = {};
  MONTHS.forEach(function (mm) {
    var mo = data.months[mm[0]];
    ((mo && mo.picks) || []).forEach(function (p) {
      if (!by[p.id]) { by[p.id] = []; order.push(p.id); }
      by[p.id].push({ month: mm[1], where: p.where, when: p.when });
    });
  });
  var names = (LS && LS.speciesNames) || data.species || {};
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  order.forEach(function (sp) {
    var card = el("article", "card ice-species-card");
    var h = el("h3");
    var a = el("a", null, names[sp] || sp.replace(/-/g, " "));
    a.href = "species/" + sp;
    h.appendChild(a);
    card.appendChild(h);
    var dl = el("dl", "ice-months");
    by[sp].forEach(function (r) {
      dl.appendChild(el("dt", null, r.month));
      dl.appendChild(el("dd", null, r.where + " " + r.when + "."));
    });
    card.appendChild(dl);
    box.appendChild(card);
  });
  var note = data.months[0] && data.months[0].note;
  if (note) box.appendChild(el("p", "meta", "Site note for these months: " + note));
})();
