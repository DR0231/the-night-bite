/**
 * The Night Bite — trip log (localStorage only)
 * Key: nightbite-log-v1
 * Samples are seeded once; user entries can be cleared without wiping samples.
 */
(function () {
  var STORAGE_KEY = "nightbite-log-v1";
  var SAMPLES_SEEDED_KEY = "nightbite-samples-seeded-v1";

  var SAMPLE_TRIPS = [
    {
      id: "sample-1",
      sample: true,
      date: "2025-07-12",
      location: "Oxbow (upper ramp)",
      bait: "Cut shad",
      species: "Channel catfish",
      disposition: "Released",
      notes: "Two keeper-size channels before midnight. Warm humid night, light breeze off the upper end. SAMPLE trip for demo only."
    },
    {
      id: "sample-2",
      sample: true,
      date: "2025-08-03",
      location: "Redbank (middle ramp)",
      bait: "Nightcrawlers",
      species: "Channel catfish",
      disposition: "Kept (1)",
      notes: "Steady taps after 10pm. One channel for the skillet; rest returned. SAMPLE — not a live report."
    },
    {
      id: "sample-3",
      sample: true,
      date: "2025-08-22",
      location: "Bank near Walnut Road",
      bait: "Chicken liver",
      species: "Flathead catfish",
      disposition: "Released",
      notes: "Single flathead on a quieter bank stretch. Storms rolled east — packed up early. SAMPLE entry."
    },
    {
      id: "sample-4",
      sample: true,
      date: "2025-09-05",
      location: "Walnut Road (lower ramp)",
      bait: "Cut bait (bluegill)",
      species: "Blue catfish",
      disposition: "Released",
      notes: "Moon nearly full; bites slower until after midnight. One blue, measured and released. SAMPLE."
    },
    {
      id: "sample-5",
      sample: true,
      date: "2025-06-18",
      location: "Oxbow (upper ramp)",
      bait: "Stink bait",
      species: "Channel catfish",
      disposition: "Released",
      notes: "Early summer night. Mostly channels; a few sunfish thieves. SAMPLE for site demo."
    },
    {
      id: "sample-6",
      sample: true,
      date: "2025-05-30",
      location: "Redbank (middle ramp)",
      bait: "Nightcrawlers + cut bait",
      species: "Channel catfish",
      disposition: "Kept (2)",
      notes: "Memorial weekend trip. Two channels kept within personal limit; rest released. SAMPLE only."
    }
  ];

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function ensureSamples() {
    var entries = loadEntries();
    var seeded = localStorage.getItem(SAMPLES_SEEDED_KEY);
    if (!seeded || entries.length === 0) {
      // Merge samples if missing
      var ids = {};
      entries.forEach(function (e) { ids[e.id] = true; });
      SAMPLE_TRIPS.forEach(function (s) {
        if (!ids[s.id]) entries.push(Object.assign({}, s));
      });
      saveEntries(entries);
      localStorage.setItem(SAMPLES_SEEDED_KEY, "1");
    }
    return loadEntries();
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var m = parseInt(parts[1], 10) - 1;
    return months[m] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function renderList() {
    var list = document.getElementById("log-list");
    if (!list) return;
    var entries = ensureSamples();
    // Sort by date descending
    entries.sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });

    if (entries.length === 0) {
      list.innerHTML = '<div class="empty-log"><p>No trips yet. Add one below — saved only on this device.</p></div>';
      return;
    }

    list.innerHTML = entries.map(function (e) {
      var badge = e.sample
        ? '<span class="sample-badge" title="Demo sample — not a live bite report">SAMPLE</span>'
        : '<span class="meta">Your entry</span>';
      var delBtn = e.sample
        ? ""
        : '<div class="trip-actions"><button type="button" class="btn btn-danger" data-delete="' +
          escapeAttr(e.id) +
          '">Remove</button></div>';
      return (
        '<article class="paper-card" data-id="' + escapeAttr(e.id) + '">' +
        badge +
        "<h3>" + escapeHtml(e.species || "Unknown") + "</h3>" +
        '<dl class="trip-dl">' +
        "<dt>Date</dt><dd>" + escapeHtml(formatDate(e.date)) + "</dd>" +
        "<dt>Spot</dt><dd>" + escapeHtml(e.location || "—") + "</dd>" +
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
    var entries = loadEntries().filter(function (e) { return e.sample; });
    saveEntries(entries);
    renderList();
  }

  function addEntry(data) {
    var entries = ensureSamples();
    entries.push({
      id: "user-" + Date.now(),
      sample: false,
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
        if (window.confirm("Remove all your personal entries? SAMPLE trips stay.")) {
          clearUserEntries();
        }
      });
    }

    var dateInput = form.querySelector('[name="date"]');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
  }

  // Boot
  if (document.getElementById("log-list")) {
    renderList();
    initForm();
  }
})();
