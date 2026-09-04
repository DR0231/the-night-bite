/**
 * The Night Bite — community log from data/community-log.json
 * Phase 1: fetch static JSON; submit via mailto or markdown / GitHub issue.
 * No accounts. Photos Phase 2.
 */
(function () {
  var MAILTO = "nightbite@local";
  var listEl = document.getElementById("community-log-list");
  var form = document.getElementById("community-trip-form");
  var preview = document.getElementById("submit-preview");
  var statusEl = document.getElementById("mailto-status");

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var m = parseInt(parts[1], 10) - 1;
    return months[m] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function renderTrips(trips) {
    if (!listEl) return;
    if (!trips || !trips.length) {
      listEl.innerHTML =
        '<div class="empty-log"><p>None yet — submit a trip below (mailto or GitHub issue).</p></div>';
      return;
    }
    listEl.innerHTML = trips
      .slice()
      .sort(function (a, b) {
        return (b.date || "").localeCompare(a.date || "");
      })
      .map(function (e) {
        var badge = e.sample
          ? '<span class="sample-badge" title="Demo sample — not a live bite report">SAMPLE</span>'
          : '<span class="meta">Community</span>';
        return (
          '<article class="paper-card">' +
          badge +
          "<h3>" +
          escapeHtml(e.species || "Unknown") +
          "</h3>" +
          '<dl class="trip-dl">' +
          "<dt>Date</dt><dd>" +
          escapeHtml(formatDate(e.date)) +
          "</dd>" +
          "<dt>Spot</dt><dd>" +
          escapeHtml(e.ramp || "—") +
          "</dd>" +
          "<dt>When</dt><dd>" +
          escapeHtml(e.time_window || "—") +
          "</dd>" +
          "<dt>Bait</dt><dd>" +
          escapeHtml(e.bait || "—") +
          "</dd>" +
          "<dt>Keep?</dt><dd>" +
          escapeHtml(e.keep_release || "—") +
          "</dd>" +
          "</dl>" +
          (e.notes ? "<p>" + escapeHtml(e.notes) + "</p>" : "") +
          "</article>"
        );
      })
      .join("");
  }

  function loadCommunity() {
    if (!listEl) return;
    fetch("data/community-log.json")
      .then(function (res) {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      })
      .then(function (data) {
        renderTrips((data && data.trips) || []);
      })
      .catch(function () {
        listEl.innerHTML =
          '<div class="empty-log"><p>Could not load community log (open via a local server, not file://). None shown.</p></div>';
      });
  }

  function formData() {
    if (!form) return null;
    var fd = new FormData(form);
    return {
      date: fd.get("date") || "",
      species: fd.get("species") || "",
      ramp: fd.get("ramp") || "",
      time_window: fd.get("time_window") || "",
      bait: fd.get("bait") || "",
      keep_release: fd.get("keep_release") || "",
      notes: fd.get("notes") || ""
    };
  }

  function toMarkdown(d) {
    return [
      "## Trip report",
      "",
      "- **Date:** " + d.date,
      "- **Species:** " + d.species,
      "- **Ramp / area (public):** " + d.ramp,
      "- **Time window:** " + d.time_window,
      "- **Bait / lure:** " + d.bait,
      "- **Keep / release:** " + d.keep_release,
      "- **Notes:** " + (d.notes || "(none)"),
      "",
      "_Submitted via The Night Bite Phase 1 form. Public access only._"
    ].join("\n");
  }

  function toMailto(d) {
    var subject = encodeURIComponent("Night Bite trip: " + d.species + " " + d.date);
    var body = encodeURIComponent(toMarkdown(d));
    return "mailto:" + MAILTO + "?subject=" + subject + "&body=" + body;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = formData();
      if (!d) return;
      var href = toMailto(d);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.innerHTML =
          'Email draft ready for <code>' +
          escapeHtml(MAILTO) +
          '</code> (placeholder contact). <a href="' +
          href +
          '">Open mail app</a>. Or use GitHub issue / markdown.';
      }
      window.location.href = href;
    });

    var mdBtn = document.getElementById("show-markdown");
    if (mdBtn) {
      mdBtn.addEventListener("click", function () {
        var d = formData();
        if (!d || !preview) return;
        if (!d.date || !d.species) {
          preview.hidden = false;
          preview.textContent = "Fill required fields first, then show markdown.";
          return;
        }
        preview.hidden = false;
        preview.textContent = toMarkdown(d);
      });
    }

    var dateInput = form.querySelector('[name="date"]');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
  }

  loadCommunity();
})();
