/**
 * The Night Bite: your trips on the Log page (localStorage nightbite-log-v1, this device only).
 * Example (sample) trips are never stored or shown here. Backup: "Save a backup" downloads
 * night-bite-log-YYYY-MM-DD.json; "Open a backup" reads one with FileReader, checks every entry and adds the new
 * ones to what is saved (never replaces). No network. window.NightBiteLogIO is used by tools/check-log-io.cjs.
 */
(function () {
  var STORAGE_KEY = "nightbite-log-v1";
  var SAMPLES_SEEDED_KEY = "nightbite-samples-seeded-v2";
  // lakes (js/lakes.js): every entry carries a lake; entries saved before lakes existed are Hoover trips
  var LK = window.NightBiteLake, LAKES = window.NightBiteLakes;
  var LAKE = LK ? LK.id : "hoover";
  function lakeShort(id) { return (LAKES && LAKES.all[id] && LAKES.all[id].short) || "Hoover"; }
  // old Hoover ramp spellings show as the official names (the saved text is left as it was)
  function spotName(e) { return (LAKES && LAKES.spotName) ? LAKES.spotName(e.lake || "hoover", e.location) : e.location; }
  function showAll() { return window.NightBiteLogFilter === "all"; }

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // SAMPLE demos are never stored; drop any seeded by older versions
      return parsed.filter(function (e) { return e && !e.sample; }).map(function (e) {
        if (!e.lake) e.lake = "hoover";   // nightbite-log-v1 entries from before lakes: all Hoover
        return e;
      });
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function purgeStoredSamples() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw && raw.indexOf('"sample":true') !== -1) {
        saveEntries(loadEntries());
      }
      localStorage.removeItem(SAMPLES_SEEDED_KEY);
    } catch (e) {
      /* storage unavailable: nothing to purge */
    }
  }

  function entriesToShow() {
    var entries = loadEntries();
    return showAll() ? entries : entries.filter(function (e) { return e.lake === LAKE; });
  }
  // write the lake field into old entries once, so the stored notebook is tagged too
  function migrateLakes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw && /"date"/.test(raw)) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.some(function (e) { return e && !e.sample && !e.lake; })) saveEntries(loadEntries());
      }
    } catch (e) { /* storage unavailable */ }
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


  function renderList() {
    var list = document.getElementById("log-list");
    if (!list) return;
    var entries = entriesToShow();
    // Sort by date descending
    entries.sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });

    var empty = document.getElementById("log-empty"), add = document.getElementById("add-private");
    var total = loadEntries().length;
    if (entries.length === 0) {
      list.innerHTML = "";
      list.hidden = true;
      if (empty) {
        empty.textContent = total && !showAll()
          ? "No " + lakeShort(LAKE) + " trips saved on this phone yet. All lakes shows your other trips."
          : "No trips saved on this phone yet. Add your first one below.";
        empty.hidden = false;
      }
      if (add && !total) add.open = true;
      return;
    }
    list.hidden = false;
    if (empty) empty.hidden = true;

    list.innerHTML = entries.map(function (e) {
      var badge = '<span class="meta">Your trip</span>';
      var delBtn = '<div class="trip-actions"><button type="button" class="btn btn-danger" data-delete="' +
          escapeAttr(e.id) + '" aria-label="Remove ' + escapeAttr((e.species || "trip") + ", " + dateLabel(e.date)) + '">Remove</button></div>';
      return (
        '<article class="paper-card" data-id="' + escapeAttr(e.id) + '">' +
        badge +
        ' <span class="lake-tag">' + escapeHtml(lakeShort(e.lake)) + "</span>" +
        "<h3>" + escapeHtml(e.species || "Unknown") + "</h3>" +
        '<dl class="trip-dl">' +
        "<dt>Date</dt><dd>" + dateTag(e.date) + "</dd>" +
        "<dt>Spot</dt><dd>" + escapeHtml(spotName(e) || "—") + "</dd>" +
        "<dt>Bait</dt><dd>" + escapeHtml(e.bait || "—") + "</dd>" +
        "<dt>Keep?</dt><dd>" + escapeHtml(e.disposition || "—") + "</dd>" +
        "</dl>" +
        (e.notes ? "<p>" + escapeHtml(e.notes) + "</p>" : "") +
        delBtn +
        "</article>"
      );
    }).join("");

    list.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteUserEntry(btn.getAttribute("data-delete"));
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  function deleteUserEntry(id) {
    // Only remove non-sample entries matching id
    var entries = loadEntries().filter(function (e) {
      if (e.id === id && !e.sample) return false;
      return true;
    });
    saveEntries(entries);
    renderList();
  }

  function clearUserEntries() {
    saveEntries([]);
    renderList();
  }

  function addEntry(data) {
    var entries = loadEntries();
    entries.push({
      id: "user-" + Date.now(),
      sample: false,
      lake: LAKE,
      date: data.date,
      location: data.location,
      bait: data.bait,
      species: data.species,
      disposition: data.disposition,
      notes: data.notes
    });
    saveEntries(entries);
    renderList();
  }

  function initForm() {
    var form = document.getElementById("trip-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      addEntry({
        date: fd.get("date") || "",
        location: fd.get("location") || "",
        bait: fd.get("bait") || "",
        species: fd.get("species") || "",
        disposition: fd.get("disposition") || "",
        notes: fd.get("notes") || ""
      });
      form.reset();
      // Set default date to today after reset
      var dateInput = form.querySelector('[name="date"]');
      if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10);
      }
    });

    var clearBtn = document.getElementById("clear-user-entries");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (window.confirm("Remove all the trips saved on this phone?")) {
          clearUserEntries();
        }
      });
    }

    var dateInput = form.querySelector('[name="date"]');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
  }

  /* ---------- backup: export and import (on this device, no network) ---------- */
  var LIMITS = { location: 120, bait: 120, species: 80, disposition: 40, notes: 500 };
  function today() {
    var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }
  function exportData() {
    return { app: "the-night-bite", kind: "trip-log", version: 1, exported: new Date().toISOString(), entries: loadEntries() };
  }
  function exportText() { return JSON.stringify(exportData(), null, 2); }
  function fileName() { return "night-bite-log-" + today() + ".json"; }
  function key(e) {
    var lake = e.lake || "hoover";
    var n = function (v) { return String(v || "").trim().toLowerCase().replace(/\s+/g, " "); };
    return [lake, e.date, n(LAKES && LAKES.spotName ? LAKES.spotName(lake, e.location) : e.location), n(e.species), n(e.bait), n(e.disposition), n(e.notes)].join("|");
  }
  // one entry from a file -> a clean entry, or null when it isn't a trip
  function clean(e, i) {
    if (!e || typeof e !== "object" || Array.isArray(e) || e.sample) return null;
    if (typeof e.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return null;
    var lake = e.lake == null || e.lake === "" ? "hoover" : e.lake;
    if (typeof lake !== "string" || (LAKES && LAKES.all && !LAKES.all[lake])) return null;
    var out = { id: "", sample: false, lake: lake, date: e.date };
    for (var k in LIMITS) {
      var v = e[k] == null ? "" : e[k];
      if (typeof v !== "string") return null;
      out[k] = v.slice(0, LIMITS[k]);
    }
    if (!out.species && !out.location && !out.bait && !out.notes) return null;
    out.id = typeof e.id === "string" && /^[\w-]{1,64}$/.test(e.id) ? e.id : "user-import-" + Date.now() + "-" + i;
    return out;
  }
  // text of a backup file -> { added, dupes, skipped } or { error }; merges, never replaces
  function importText(text) {
    if (typeof text !== "string" || text.length > 2000000) return { error: "That file is too big to be a Night Bite backup." };
    var data;
    try { data = JSON.parse(text); } catch (e) { return { error: "That file isn't a Night Bite backup (it isn't JSON)." }; }
    var list = Array.isArray(data) ? data : (data && typeof data === "object" && Array.isArray(data.entries) ? data.entries : null);
    if (!list || (data && data.app && data.app !== "the-night-bite")) return { error: "That file isn't a Night Bite backup." };
    if (list.length > 5000) return { error: "That backup has more trips than this page can open." };
    var have = loadEntries(), keys = {}, ids = {};
    have.forEach(function (e) { keys[key(e)] = 1; ids[e.id] = 1; });
    var added = 0, dupes = 0, skipped = 0;
    list.forEach(function (raw, i) {
      var e = clean(raw, i);
      if (!e) { if (!(raw && raw.sample)) skipped++; return; }
      var k = key(e);
      if (keys[k]) { dupes++; return; }
      while (ids[e.id]) e.id = "user-import-" + Date.now() + "-" + i + "-" + Math.floor(Math.random() * 1e6);
      keys[k] = 1; ids[e.id] = 1; have.push(e); added++;
    });
    try { saveEntries(have); } catch (e) { return { error: "This browser wouldn't save the trips (storage is full or blocked)." }; }
    renderList();
    return { added: added, dupes: dupes, skipped: skipped };
  }
  function plural(n, one) { return n + " " + one + (n === 1 ? "" : "s"); }
  function summary(r) {
    if (r.error) return r.error;
    var parts = [r.added ? "Added " + plural(r.added, "trip") + "." : "No new trips in that file."];
    if (r.dupes) parts.push(plural(r.dupes, "trip") + " " + (r.dupes === 1 ? "was" : "were") + " already here.");
    if (r.skipped) parts.push("Skipped " + r.skipped + " that didn't look like a trip.");
    return parts.join(" ");
  }
  function initBackup() {
    var out = document.getElementById("log-export"), btn = document.getElementById("log-import-btn"),
      input = document.getElementById("log-import"), status = document.getElementById("log-io-status");
    function say(t) { if (status) { status.textContent = t; status.hidden = false; } }
    if (out) out.addEventListener("click", function () {
      var n = loadEntries().length;
      if (!n) { say("No trips saved on this phone yet, so there's nothing to back up."); return; }
      var url = URL.createObjectURL(new Blob([exportText()], { type: "application/json" }));
      var a = document.createElement("a"); a.href = url; a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      say("Saved " + plural(n, "trip") + " to " + fileName() + ".");
    });
    if (btn && input) {
      btn.addEventListener("click", function () { input.value = ""; input.click(); });
      input.addEventListener("change", function () {
        var f = input.files && input.files[0];
        if (!f) return;
        if (f.size > 2000000) { say("That file is too big to be a Night Bite backup."); return; }
        var r = new FileReader();
        r.onload = function () { say(summary(importText(String(r.result)))); input.value = ""; };
        r.onerror = function () { say("Couldn't read that file."); };
        r.readAsText(f);
      });
    }
  }
  window.NightBiteLogIO = { exportData: exportData, exportText: exportText, importText: importText, fileName: fileName, summary: summary };

  // Boot
  // "This lake" and "All lakes" chips: one filter for the community list and your private trips
  function initLakeFilter() {
    var chips = document.querySelectorAll("[data-log-filter]");
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        window.NightBiteLogFilter = c.getAttribute("data-log-filter");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        renderList();
        try { document.dispatchEvent(new CustomEvent("nightbite:log-filter")); } catch (e) {}
      });
    });
  }
  // the spot list follows the lake (Hoover keeps the list in the page markup)
  function lakeSpots() {
    if (LAKE === "hoover" || !LK) return;
    [["location", "Other / not sure"], ["c-ramp", "Other public / not sure"]].forEach(function (pair) {
      var sel = document.getElementById(pair[0]);
      if (!sel) return;
      sel.textContent = "";
      var o = document.createElement("option"); o.value = ""; o.textContent = "Choose…"; sel.appendChild(o);
      LK.cfg.spots.concat([pair[1]]).forEach(function (name) {
        var op = document.createElement("option"); op.textContent = name; sel.appendChild(op);
      });
    });
    ["species", "c-species"].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel || !LAKES.speciesNames) return;
      sel.textContent = "";
      var o = document.createElement("option"); o.value = ""; o.textContent = "Choose…"; sel.appendChild(o);
      LK.cfg.species.map(function (k) { return LAKES.speciesNames[k]; }).concat(["Other"]).forEach(function (name) {
        var op = document.createElement("option"); op.textContent = name; sel.appendChild(op);
      });
    });
  }

  // the GitHub trip form opens with this lake already picked (its Lake dropdown uses the full lake names)
  function issueLake() {
    var name = LK && LK.cfg && LK.cfg.name;
    if (!name) return;
    document.querySelectorAll('a[href*="template=trip-report.yml"]').forEach(function (a) {
      try { var u = new URL(a.href); u.searchParams.set("lake", name); a.href = u.href; } catch (e) {}
    });
  }

  if (document.getElementById("log-list")) {
    window.NightBiteLogFilter = window.NightBiteLogFilter || "lake";
    migrateLakes();
    lakeSpots();
    issueLake();
    initLakeFilter();
    purgeStoredSamples();
    renderList();
    initForm();
    initBackup();
  }
  document.addEventListener("nb-lang", function () { renderList(); });
})();
