/**
 * The Night Bite: tournaments from data/tournaments.json + mailto submit.
 * Each event carries a "lake" id (hoover, alum, buckeye); events with no lake are Hoover events.
 * Only the selected lake's events are listed, so a Hoover event never shows on the Alum or Buckeye Lake view.
 */
(function () {
  var MAILTO = "contact@nightbiteoh.com";
  var LK = window.NightBiteLake, LAKE = (LK && LK.id) || "hoover", LC = (LK && LK.cfg) || null;
  var listEl = document.getElementById("tournaments-list");
  var emptyEl = document.getElementById("tournaments-empty");
  var form = document.getElementById("tournament-form");
  var out = document.getElementById("tournament-mailto-out");

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(events) {
    if (!listEl) return;
    if (!events || !events.length) {
      listEl.innerHTML =
        '<div class="empty-log"><p>No ' + (LAKE !== "hoover" && LC ? LC.short + " " : "") + 'events listed right now. Know of one? <a href="#submit-tournament">Submit it below</a>.</p></div>';
      return;
    }
    listEl.innerHTML = events
      .slice()
      .sort(function (a, b) {
        return (a.date || "").localeCompare(b.date || "");
      })
      .map(function (e) {
        var rawUrl = typeof e.url === "string" ? e.url.trim() : "";
        var url = "";
        if (rawUrl) {
          // Only https:// links are clickable; anything else shows as plain text.
          url = /^https:\/\//i.test(rawUrl)
            ? '<p><a href="' +
              escapeHtml(rawUrl) +
              '" target="_blank" rel="noopener">Event info</a></p>'
            : "<p>Event info: " + escapeHtml(rawUrl) + "</p>";
        }
        return (
          '<article class="card">' +
          "<h3>" +
          escapeHtml(e.name || "Event") +
          "</h3>" +
          '<dl class="trip-dl" style="color:var(--cream);">' +
          "<dt>Date</dt><dd>" +
          escapeHtml(e.date || "—") +
          "</dd>" +
          "<dt>Ramp</dt><dd>" +
          escapeHtml(e.ramp || "—") +
          "</dd>" +
          "<dt>Club</dt><dd>" +
          escapeHtml(e.club || "—") +
          "</dd>" +
          "</dl>" +
          (e.notes ? "<p>" + escapeHtml(e.notes) + "</p>" : "") +
          url +
          '<p class="meta">Third-party listing, not hosted by The Night Bite.</p>' +
          "</article>"
        );
      })
      .join("");
  }

  fetch("data/tournaments.json")
    .then(function (res) {
      if (!res.ok) throw new Error("http " + res.status);
      return res.json();
    })
    .then(function (data) {
      render(((data && data.events) || []).filter(function (e) { return (e.lake || "hoover") === LAKE; }));
    })
    .catch(function () {
      if (listEl) {
        listEl.innerHTML =
          '<div class="empty-log"><p>The event list couldn’t load right now. Refresh to try again.</p></div>';
      }
    });

  // the ramp example names a Hoover ramp; other lakes get a neutral hint
  var ramp = document.getElementById("t-ramp");
  if (ramp && LAKE !== "hoover") ramp.placeholder = "e.g. a public ramp at " + ((LC && LC.short) || "the lake");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var lines = [
        "Tournament submission: The Night Bite",
        "",
        "Lake: " + ((LC && LC.name) || "Hoover Reservoir"),
        "Name: " + (fd.get("name") || ""),
        "Date: " + (fd.get("date") || ""),
        "Ramp: " + (fd.get("ramp") || ""),
        "Club: " + (fd.get("club") || ""),
        "URL: " + (fd.get("url") || ""),
        "Notes: " + (fd.get("notes") || ""),
        "",
        "Third-party only. Night Bite is not the tournament director."
      ];
      var href =
        "mailto:" +
        MAILTO +
        "?subject=" +
        encodeURIComponent("Night Bite tournament: " + (fd.get("name") || "")) +
        "&body=" +
        encodeURIComponent(lines.join("\n"));
      if (out) {
        out.hidden = false;
        out.innerHTML =
          'Draft ready for <code>' +
          escapeHtml(MAILTO) +
          '</code>. <a href="' +
          href +
          '">Open mail app</a>.';
      }
      window.location.href = href;
    });
  }
})();
