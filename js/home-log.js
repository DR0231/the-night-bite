/**
 * The Night Bite — home latest-log teaser from community-log.json
 */
(function () {
  var el = document.getElementById("latest-log-card");
  if (!el) return;
  var body = el.querySelector(".latest-log-body");
  if (!body) return;

  fetch("data/community-log.json")
    .then(function (r) {
      if (!r.ok) throw new Error("log http");
      return r.json();
    })
    .then(function (data) {
      var trips = (data && data.trips) || [];
      if (!trips.length) throw new Error("empty");
      var trip = trips.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      })[0];
      var sample = trip.sample
        ? '<span class="sample-badge">SAMPLE</span> '
        : "";
      body.innerHTML =
        sample +
        "<strong>" +
        escapeHtml(trip.species || "Trip") +
        "</strong> · " +
        escapeHtml(trip.date || "") +
        "<br><span class=\"meta\">" +
        escapeHtml(trip.ramp || "") +
        (trip.bait ? " · " + escapeHtml(trip.bait) : "") +
        "</span>";
    })
    .catch(function () {
      body.innerHTML =
        '<span class="sample-badge">SAMPLE</span> <strong>Channel catfish</strong> · 2026-08-15<br><span class="meta">Oxbow · Cut shad — open the log for more.</span>';
    });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
