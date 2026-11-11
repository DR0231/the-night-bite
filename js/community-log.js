/**
 * The Night Bite: community trips on the Log page, from data/community-log.json.
 * Example (sample) trips are never shown. The Community section stays hidden until a real trip matches the lake
 * filter, and also when the file can't load. Share a trip sends the form to The Night Bite's own review queue (the
 * nb-trip-queue Worker, workers/trip-queue/); nothing is published until D'Angelo approves it. If the queue can't be
 * reached, the email draft and GitHub issue stay as the fallback. No accounts.
 */
(function () {
  var MAILTO = "contact@nightbiteoh.com";
  var QUEUE = "https://nb-trip-queue.nightbiteoh.workers.dev/submit";
  var listEl = document.getElementById("community-log-list");
  var sectionEl = document.getElementById("community");
  var form = document.getElementById("community-trip-form");
  var preview = document.getElementById("submit-preview");
  var statusEl = document.getElementById("mailto-status");
  // lakes (js/lakes.js): a trip with no lake field is a Hoover trip
  var LK = window.NightBiteLake, LAKES = window.NightBiteLakes;
  var LAKE = LK ? LK.id : "hoover";
  function lakeShort(id) { return (LAKES && LAKES.all[id] && LAKES.all[id].short) || "Hoover"; }
  function lakeName(id) { return (LAKES && LAKES.all[id] && LAKES.all[id].name) || "Hoover Reservoir"; }
  var allTrips = null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var m = parseInt(parts[1], 10) - 1;
    return months[m] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }
  // S13: the date as <time datetime>, English text; js/i18n.js rewrites it with Intl in the picked language
  function dateTag(iso) {
    var t = formatDate(iso);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? '<time datetime="' + iso + '">' + escapeHtml(t) + "</time>" : escapeHtml(t);
  }
  // aria-label text is not walked as a date, so it uses Intl directly in the page language
  function dateLabel(iso) {
    var L = document.documentElement.lang || "en", p = (iso || "").split("-");
    if (L === "en" || p.length !== 3) return formatDate(iso);
    try { return new Intl.DateTimeFormat(L, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(Date.UTC(+p[0], +p[1] - 1, +p[2])); } catch (e) { return formatDate(iso); }
  }


  function renderTrips(trips) {
    if (!listEl) return;
    trips = (trips || []).filter(function (t) { return t && !t.sample && (window.NightBiteLogFilter === "all" || (t.lake || "hoover") === LAKE); });
    if (sectionEl) sectionEl.hidden = !trips.length;
    if (!trips.length) { listEl.innerHTML = ""; return; }
    listEl.innerHTML = trips
      .slice()
      .sort(function (a, b) {
        return (b.date || "").localeCompare(a.date || "");
      })
      .map(function (e) {
        var badge = '<span class="meta">Community</span>';
        return (
          '<article class="paper-card">' +
          badge +
          ' <span class="lake-tag">' + escapeHtml(lakeShort(e.lake || "hoover")) + "</span>" +
          "<h3>" +
          escapeHtml(e.species || "Unknown") +
          "</h3>" +
          '<dl class="trip-dl">' +
          "<dt>Date</dt><dd>" +
          dateTag(e.date) +
          "</dd>" +
          "<dt>Spot</dt><dd>" +
          escapeHtml(((window.NightBiteLakes && window.NightBiteLakes.spotName) ? window.NightBiteLakes.spotName(e.lake || "hoover", e.ramp) : e.ramp) || "Not listed") +
          "</dd>" +
          "<dt>When</dt><dd>" +
          escapeHtml(e.time_window || "Not listed") +
          "</dd>" +
          "<dt>Bait</dt><dd>" +
          escapeHtml(e.bait || "Not listed") +
          "</dd>" +
          "<dt>Keep?</dt><dd>" +
          escapeHtml(e.keep_release || "Not listed") +
          "</dd>" +
          "</dl>" +
          (e.notes ? "<p>" + escapeHtml(e.notes) + "</p>" : "") +
          "</article>"
        );
      })
      .join("");
  }

  // Tell js/log.js whether the JSON loaded, so its SAMPLE fallback
  // only shows when this list could not (exactly one SAMPLE card on Log).
  function announce(status) {
    window.__nightbiteCommunityLog = status;
    var ev;
    try {
      ev = new CustomEvent("nightbite:community-log", { detail: { status: status } });
    } catch (e) {
      ev = document.createEvent("CustomEvent");
      ev.initCustomEvent("nightbite:community-log", false, false, { status: status });
    }
    document.dispatchEvent(ev);
  }

  function loadCommunity() {
    if (!listEl) return;
    fetch("data/community-log.json")
      .then(function (res) {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      })
      .then(function (data) {
        allTrips = (data && data.trips) || [];
        renderTrips(allTrips);
        announce("ok");
      })
      .catch(function () {
        listEl.innerHTML = "";
        if (sectionEl) sectionEl.hidden = true;
        announce("failed");
      });
  }

  function formData() {
    if (!form) return null;
    var fd = new FormData(form);
    return {
      lake: lakeName(LAKE),
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
      "- **Lake:** " + d.lake,
      "- **Date:** " + d.date,
      "- **Species:** " + d.species,
      "- **Ramp / area (public):** " + d.ramp,
      "- **Time window:** " + d.time_window,
      "- **Bait / lure:** " + d.bait,
      "- **Keep / release:** " + d.keep_release,
      "- **Notes:** " + (d.notes || "(none)"),
      "",
      "_Submitted via The Night Bite log form. Public access only._"
    ].join("\n");
  }

  function toMailto(d) {
    var subject = encodeURIComponent("Night Bite trip: " + d.species + " " + d.date);
    var body = encodeURIComponent(toMarkdown(d));
    return "mailto:" + MAILTO + "?subject=" + subject + "&body=" + body;
  }

  function sendStatus(kind, html) {
    var el = document.getElementById("trip-send-status");
    if (!el) return;
    el.hidden = false;
    el.setAttribute("data-state", kind);
    el.innerHTML = html;
  }

  function queueBody() {
    var fd = new FormData(form);
    return {
      lake: LAKE,
      date: String(fd.get("date") || ""),
      species: String(fd.get("species") || ""),
      ramp: String(fd.get("ramp") || ""),
      time_window: String(fd.get("time_window") || ""),
      bait: String(fd.get("bait") || ""),
      keep_release: String(fd.get("keep_release") || ""),
      notes: String(fd.get("notes") || ""),
      website: String(fd.get("website") || "")
    };
  }

  function fallback(why) {
    sendStatus("failed", escapeHtml(why) + " Your trip is still in the form, so you can use Build email or GitHub issue below.");
    var fb = document.getElementById("trip-fallback");
    if (fb) { var b = fb.querySelector("button, a"); if (b) b.focus(); }
  }

  if (form) {
    var sendBtn = document.getElementById("send-trip");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.fetch) { fallback("This browser can't send it from here."); return; }
      if (sendBtn) sendBtn.disabled = true;
      sendStatus("sending", "Sending…");
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
      fetch(QUEUE, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queueBody()),
        signal: ctl ? ctl.signal : undefined
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
        .then(function (x) {
          clearTimeout(timer);
          if (sendBtn) sendBtn.disabled = false;
          if (x.r.ok && x.j && x.j.ok) {
            sendStatus("sent", "Sent. Thanks! It waits for review and shows under Community trips once it&rsquo;s approved.");
            form.reset();
            var di = form.querySelector('[name="date"]');
            if (di) di.value = new Date().toISOString().slice(0, 10);
            return;
          }
          if (x.r.status === 429) { fallback("That's a lot of trips from here this hour, so the queue paused."); return; }
          if (x.r.status === 400) { fallback("The queue didn't accept that (check the fields, and leave links out)."); return; }
          fallback("The queue didn't take it just now.");
        })
        .catch(function () {
          clearTimeout(timer);
          if (sendBtn) sendBtn.disabled = false;
          fallback("Couldn't reach the queue (no signal?).");
        });
    });

    var emailBtn = document.getElementById("build-email");
    if (emailBtn) emailBtn.addEventListener("click", function () {
      if (!form.reportValidity()) return;
      var d = formData();
      if (!d) return;
      var href = toMailto(d);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.innerHTML =
          'Email draft ready for <code>' +
          escapeHtml(MAILTO) +
          '</code>. <a href="' +
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

  document.addEventListener("nightbite:log-filter", function () { if (allTrips) renderTrips(allTrips); });
  loadCommunity();
})();
