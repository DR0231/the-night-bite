/**
 * The Night Bite — tournaments from data/tournaments.json + mailto submit
 */
(function () {
  var MAILTO = "nightbite@local";
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
        '<div class="empty-log"><p>None listed — submit one.</p></div>';
      return;
    }
    listEl.innerHTML = events
      .slice()
      .sort(function (a, b) {
        return (a.date || "").localeCompare(b.date || "");
      })
      .map(function (e) {
        var url = e.url
          ? '<p><a href="' +
            escapeHtml(e.url) +
            '" target="_blank" rel="noopener">Event info</a></p>'
          : "";
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
          '<p class="meta">Third-party listing — not hosted by The Night Bite.</p>' +
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
      render((data && data.events) || []);
    })
    .catch(function () {
      if (listEl) {
        listEl.innerHTML =
          '<div class="empty-log"><p>Could not load tournaments.json (use a local server). None listed.</p></div>';
      }
    });

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var lines = [
        "Tournament submission — The Night Bite",
        "",
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
