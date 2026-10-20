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
      var badge = trip.sample
        ? '<span class="sample-badge" title="Demo entry, not a live bite report">Example entry</span>'
        : "";
      var details = [trip.date, trip.ramp, trip.bait]
        .filter(Boolean)
        .map(escapeHtml)
        .join(" · ");
      body.innerHTML =
        badge +
        '<p class="log-value">' +
        escapeHtml(trip.species || "Trip") +
        "</p>" +
        '<p class="meta">' +
        details +
        "</p>";
    })
    .catch(function () {
      body.innerHTML =
        '<span class="sample-badge" title="Demo entry, not a live bite report">Example entry</span>' +
        '<p class="log-value">Channel catfish</p>' +
        '<p class="meta">2026-08-15 · Oxbow · Cut shad</p>';
    });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
